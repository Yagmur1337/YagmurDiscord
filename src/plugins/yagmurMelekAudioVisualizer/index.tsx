/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { React, showToast, Toasts } from "@webpack/common";

import style from "./style.css?managed";

const CORS_PROXY = "https://cors.keiran0.workers.dev?url=";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface PlayerInstance {
    mediaRef: React.RefObject<HTMLAudioElement | null> | { current: HTMLAudioElement | null; };
    props: { type: string; fileName?: string; src?: string; };
    state: { playing: boolean; };
}

interface AudioGraph {
    ctx: AudioContext;
    analyser: AnalyserNode;
    blobUrl: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number; } | null {
    const clean = hex.replace("#", "").trim();
    if (clean.length === 3) {
        return {
            r: parseInt(clean[0] + clean[0], 16),
            g: parseInt(clean[1] + clean[1], 16),
            b: parseInt(clean[2] + clean[2], 16),
        };
    }
    if (clean.length === 6) {
        return {
            r: parseInt(clean.slice(0, 2), 16),
            g: parseInt(clean.slice(2, 4), 16),
            b: parseInt(clean.slice(4, 6), 16),
        };
    }
    return null;
}

function validateColor(value: string, key: string, fallback: string) {
    if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value)) return;

    try {
        const rgb = hexToRgb(value);
        if (rgb) {
            settings.store[key] = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
            return;
        }
    } catch { /* invalid hex */ }

    showToast(yagmurMelekTranslate("Invalid color format. Use R, G, B or #RRGGBB"), Toasts.Type.FAILURE);
    settings.store[key] = fallback;
}

function maxTypedArray(arr: Uint8Array): number {
    let max = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > max) max = arr[i];
    }
    return max;
}

function drawOscilloscope(ctx: CanvasRenderingContext2D, w: number, h: number, dataArray: Uint8Array, bufferLength: number) {
    const sliceWidth = w / bufferLength;
    const [r, g, b] = (settings.store.oscilloscopeColor || "255, 255, 255").split(",").map(Number);
    const amp = 2.5;
    let x = 0;

    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        const y = (h / 2) - (v * amp * h / 2);

        if (settings.store.oscilloscopeSolidColor) {
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
            const absV = Math.abs(v);
            ctx.strokeStyle = `rgb(${Math.min(r + absV * 100 + (i / bufferLength) * 155, 255)}, ${Math.min(g + absV * 50 + (i / bufferLength) * 155, 255)}, ${Math.min(b + absV * 150 + (i / bufferLength) * 155, 255)})`;
        }

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
}

function drawSpectrograph(ctx: CanvasRenderingContext2D, w: number, h: number, frequencyData: Uint8Array, bufferLength: number) {
    const barWidth = Math.max(1, w / bufferLength);
    const maxVal = maxTypedArray(frequencyData);
    if (maxVal === 0) return;

    const [r, g, b] = (settings.store.spectrographColor || "252, 112, 69").split(",").map(Number);
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barH = (frequencyData[i] / maxVal) * (h * 0.9);

        if (settings.store.spectrographSolidColor) {
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
            const red = Math.min(r + (i / bufferLength) * 80, 255);
            const green = Math.min(g + (i / bufferLength) * 60, 255);
            const blue = Math.min(b + (i / bufferLength) * 60, 255);
            const gradient = ctx.createLinearGradient(x, h - barH, x, h);
            gradient.addColorStop(0, `rgb(${red}, ${green}, ${blue})`);
            gradient.addColorStop(1, `rgb(${Math.max(red - 60, 0)}, ${Math.max(green - 60, 0)}, ${Math.max(blue - 60, 0)})`);
            ctx.fillStyle = gradient;
        }

        ctx.fillRect(x, h - barH, barWidth, barH);
        x += barWidth + 0.5;
    }
}

async function fetchAudioBlob(src: string): Promise<string | null> {
    if (!src) return null;
    if (src.startsWith("blob:") || src.startsWith("data:")) return src;

    if (IS_DISCORD_DESKTOP) {
        try {
            const native = VencordNative.pluginHelpers.YagmurMelekAudioVisualizer as PluginNative<typeof import("./native")>;
            if (native?.readAttachment) {
                const bytes = await native.readAttachment(src);
                if (bytes && bytes.length > 0) {
                    const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "audio/mpeg" });
                    return URL.createObjectURL(blob);
                }
            }
        } catch {
            // fallback
        }
    }

    try {
        const url = new URL(src);
        url.searchParams.set("t", Date.now().toString());
        const response = await fetch(url.href, { credentials: "omit" });
        if (response.ok) {
            const contentLength = response.headers.get("content-length");
            if (!contentLength || Number(contentLength) <= MAX_FILE_SIZE) {
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            }
        }
    } catch {
        // fallback to proxy
    }

    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(src));
        if (response.ok) {
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
    } catch {
        // failed
    }

    return null;
}

const graphs = new WeakMap<HTMLAudioElement, Promise<AudioGraph | null>>();

async function createAudioGraph(audio: HTMLAudioElement): Promise<AudioGraph | null> {
    const src = audio.currentSrc || audio.src;
    if (!src) return null;

    let blobUrl = src;
    if (!src.startsWith("blob:")) {
        const fetched = await fetchAudioBlob(src).catch(() => null);
        if (!fetched) return null;
        blobUrl = fetched;
        const wasPlaying = !audio.paused;
        const { currentTime } = audio;
        audio.src = blobUrl;
        audio.currentTime = currentTime;
        if (wasPlaying) audio.play().catch(() => {});
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;

    try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
    } catch {
        // Already connected or cannot connect
    }

    return { ctx, analyser, blobUrl };
}

function Visualizer({ mediaRef, playing }: { mediaRef: PlayerInstance["mediaRef"]; playing: boolean; }) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const audio = mediaRef.current;
        if (!playing || !audio) return;

        let frame = 0;
        let stopped = false;
        let graphCtx: AudioContext | null = null;

        let promise = graphs.get(audio);
        if (!promise) {
            promise = createAudioGraph(audio);
            graphs.set(audio, promise);
        }

        promise.then(graph => {
            if (stopped || !graph) return;

            const { ctx, analyser } = graph;
            graphCtx = ctx;
            if (ctx.state === "suspended") ctx.resume();

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);

            const draw = () => {
                if (stopped) return;
                frame = requestAnimationFrame(draw);

                const canvas = canvasRef.current;
                const canvasCtx = canvas?.getContext("2d");
                if (!canvas || !canvasCtx) return;

                analyser.getByteTimeDomainData(dataArray);
                analyser.getByteFrequencyData(frequencyData);

                const width = canvas.clientWidth || 300;
                const height = canvas.clientHeight || 50;
                const dpr = window.devicePixelRatio || 1;
                const pixelWidth = Math.round(width * dpr);
                const pixelHeight = Math.round(height * dpr);
                if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
                    canvas.width = pixelWidth;
                    canvas.height = pixelHeight;
                    canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }

                canvasCtx.clearRect(0, 0, width, height);
                if (settings.store.spectrograph) drawSpectrograph(canvasCtx, width, height, frequencyData, 96);
                if (settings.store.oscilloscope) drawOscilloscope(canvasCtx, width, height, dataArray, dataArray.length);
            };
            draw();
        });

        return () => {
            stopped = true;
            cancelAnimationFrame(frame);
            graphCtx?.suspend();
        };
    }, [playing]);

    return (
        <canvas
            className="yagmurmelek-attachment-viz-canvas"
            ref={canvasRef}
        />
    );
}

const SafeVisualizer = ErrorBoundary.wrap(Visualizer, { noop: true });

const settings = definePluginSettings({
    spectrograph: {
        type: OptionType.BOOLEAN,
        description: yagmurMelekTranslate("Enable spectrograph visualizer (frequency bars)."),
        default: true,
    },
    oscilloscope: {
        type: OptionType.BOOLEAN,
        description: yagmurMelekTranslate("Enable oscilloscope visualizer (waveform line)."),
        default: true,
    },
    spectrographSolidColor: {
        type: OptionType.BOOLEAN,
        description: yagmurMelekTranslate("Use a solid color for the spectrograph."),
        default: false,
    },
    spectrographColor: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Color for the spectrograph (R, G, B or #hex)."),
        default: "252, 112, 69",
        onChange: value => validateColor(value, "spectrographColor", "252, 112, 69"),
    },
    oscilloscopeSolidColor: {
        type: OptionType.BOOLEAN,
        description: yagmurMelekTranslate("Use a solid color for the oscilloscope."),
        default: false,
    },
    oscilloscopeColor: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Color for the oscilloscope (R, G, B or #hex)."),
        default: "255, 255, 255",
        onChange: value => validateColor(value, "oscilloscopeColor", "255, 255, 255"),
    },
});

export default definePlugin({
    name: "YagmurMelekAudioVisualizer",
    description: yagmurMelekTranslate("Live audio spectrograph and oscilloscope visualizer over chat audio attachments."),
    authors: [{ name: "YagmurMelek DC", id: 0n }],
    enabledByDefault: true,
    managedStyle: style,
    settings,
    patches: [
        {
            find: "}renderPlayIcon(){",
            replacement: [
                {
                    match: /this\.renderAudio\(\):this\.renderVideo\(\)/,
                    replace: "$&,$self.renderVisualizer(this)",
                },
            ],
        },
    ],
    renderVisualizer(player: PlayerInstance) {
        if (player.props.type !== "AUDIO") return null;
        return <SafeVisualizer key="yagmurmelek-audio-visualizer" mediaRef={player.mediaRef} playing={!!player.state?.playing} />;
    },
});
