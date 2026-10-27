/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ActiveSession, ScreenLayout, ScreenSource, StreamOptions } from "./types";

let activeSession: ActiveSession | null = null;
let listeners: Array<() => void> = [];

let origGetDesktopCaptureSources: any = null;
let origGetUserMedia: any = null;

export function subscribeSession(listener: () => void) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

function notifyListeners() {
    for (const listener of listeners) {
        try {
            listener();
        } catch (e) {
            console.error("[YagmurMelekAllScreens] Error in listener:", e);
        }
    }
}

export function getActiveSession(): ActiveSession | null {
    return activeSession;
}

export function isStreamingAllScreens(): boolean {
    return activeSession !== null;
}

/**
 * Fetches all physical/logical screen display sources available on the system.
 */
export async function getDetectedScreens(): Promise<ScreenSource[]> {
    if (typeof window !== "undefined" && window.DiscordNative?.desktopCapture?.getDesktopCaptureSources) {
        try {
            const sources = await window.DiscordNative.desktopCapture.getDesktopCaptureSources({
                types: ["screen"],
                thumbnailSize: { width: 480, height: 270 }
            });
            if (Array.isArray(sources)) {
                return sources
                    .filter((s: any) => s?.id?.startsWith("screen:") && s?.id !== "screen:all-screens")
                    .map((s: any, idx: number) => ({
                        id: s.id,
                        name: s.name || `Ekran ${idx + 1}`,
                        url: s.url,
                        icon: s.icon
                    }));
            }
        } catch (err) {
            console.error("[YagmurMelekAllScreens] Error fetching native desktop sources:", err);
        }
    }

    return [
        { id: "screen:0:0", name: "Ekran 1 (Birincil)" },
        { id: "screen:1:0", name: "Ekran 2" },
        { id: "screen:2:0", name: "Ekran 3" }
    ];
}

/**
 * Stitches multiple thumbnail images horizontally into a single panoramic preview.
 */
export async function createCompositeThumbnail(screens: ScreenSource[]): Promise<string> {
    if (!screens.length) return "";
    if (screens.length === 1 && screens[0].url) return screens[0].url;

    try {
        const images: HTMLImageElement[] = [];
        await Promise.all(screens.map(screen => {
            return new Promise<void>(resolve => {
                if (!screen.url) return resolve();
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    images.push(img);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = screen.url;
            });
        }));

        if (!images.length) return "";

        const singleH = 180;
        const totalW = images.reduce((acc, img) => {
            const aspect = (img.naturalWidth || 16) / (img.naturalHeight || 9);
            return acc + Math.round(singleH * aspect);
        }, 0);

        const canvas = document.createElement("canvas");
        canvas.width = totalW;
        canvas.height = singleH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";

        ctx.fillStyle = "#1e1f22";
        ctx.fillRect(0, 0, totalW, singleH);

        let currentX = 0;
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const aspect = (img.naturalWidth || 16) / (img.naturalHeight || 9);
            const w = Math.round(singleH * aspect);
            ctx.drawImage(img, currentX, 0, w, singleH);

            // subtle divider line between monitors
            if (i < images.length - 1) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                ctx.fillRect(currentX + w - 2, 0, 4, singleH);
                ctx.fillStyle = "#5865f2";
                ctx.fillRect(currentX + w - 1, 0, 2, singleH);
            }
            currentX += w;
        }

        return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
        return "";
    }
}

/**
 * Calculates canvas dimensions and placement for multi-monitor layout.
 */
export function calculateLayout(
    dimensions: Array<{ width: number; height: number; }>,
    layout: ScreenLayout = "horizontal"
) {
    if (!dimensions.length) {
        return { totalWidth: 1920, maxHeight: 1080, rects: [] };
    }

    if (layout === "horizontal") {
        const baseHeight = Math.max(...dimensions.map(d => d.height || 1080));
        let currentX = 0;
        const rects = dimensions.map(d => {
            const aspect = (d.width || 1920) / (d.height || 1080);
            const w = Math.round(baseHeight * aspect);
            const r = { x: currentX, y: 0, width: w, height: baseHeight };
            currentX += w;
            return r;
        });
        return { totalWidth: currentX, maxHeight: baseHeight, rects };
    }

    // Grid layout (e.g. 2x2 for 3 or 4 monitors)
    const cols = Math.ceil(Math.sqrt(dimensions.length));
    const rows = Math.ceil(dimensions.length / cols);
    const cellW = Math.max(...dimensions.map(d => d.width || 1920));
    const cellH = Math.max(...dimensions.map(d => d.height || 1080));

    const rects = dimensions.map((d, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
            x: col * cellW,
            y: row * cellH,
            width: cellW,
            height: cellH
        };
    });

    return { totalWidth: cols * cellW, maxHeight: rows * cellH, rects };
}

/**
 * Starts multi-screen composite streaming.
 * Captures all monitors concurrently, renders side-by-side onto canvas, and captures stream.
 */
export async function startCompositeStream(options: StreamOptions = {}): Promise<MediaStream> {
    if (activeSession) {
        return activeSession.compositeStream;
    }

    const fps = options.fps || 60;
    const layout = options.layout || "horizontal";
    const screens = await getDetectedScreens();

    if (!screens.length) {
        throw new Error("Sistemde paylaşılacak ekran bulunamadı.");
    }

    const streams: MediaStream[] = [];
    const videoElements: HTMLVideoElement[] = [];

    try {
        for (const screen of screens) {
            const constraints: any = {
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: "desktop",
                        chromeMediaSourceId: screen.id,
                        maxWidth: 3840,
                        maxHeight: 2160,
                        maxFrameRate: fps
                    }
                }
            };

            const stream = await (origGetUserMedia || navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices))(constraints);
            streams.push(stream);

            const video = document.createElement("video");
            video.autoplay = true;
            video.muted = true;
            (video as any).playsInline = true;
            video.srcObject = stream;
            video.style.display = "none";
            document.body.appendChild(video);
            videoElements.push(video);

            await new Promise<void>(resolve => {
                if (video.readyState >= 2) return resolve();
                video.onloadedmetadata = () => resolve();
                setTimeout(resolve, 1000);
            });
            await video.play().catch(() => {});
        }

        const dims = videoElements.map(v => ({
            width: v.videoWidth || 1920,
            height: v.videoHeight || 1080
        }));

        const { totalWidth, maxHeight, rects } = calculateLayout(dims, layout);

        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
            throw new Error("Canvas 2D context oluşturulamadı.");
        }

        const renderCtx = ctx;
        let isRunning = true;
        let lastFrameTime = 0;
        const frameInterval = 1000 / fps;

        function renderFrame(time: number) {
            if (!isRunning) return;

            if (time - lastFrameTime >= frameInterval - 1) {
                lastFrameTime = time;
                renderCtx.fillStyle = "#000000";
                renderCtx.fillRect(0, 0, totalWidth, maxHeight);

                for (let i = 0; i < videoElements.length; i++) {
                    const v = videoElements[i];
                    const r = rects[i];
                    if (v.readyState >= 2 && r) {
                        renderCtx.drawImage(v, r.x, r.y, r.width, r.height);

                        // Draw subtle separation bar between screens
                        if (layout === "horizontal" && i < videoElements.length - 1) {
                            renderCtx.fillStyle = "rgba(0, 0, 0, 0.8)";
                            renderCtx.fillRect(r.x + r.width - 2, 0, 4, maxHeight);
                            renderCtx.fillStyle = "rgba(88, 101, 242, 0.9)";
                            renderCtx.fillRect(r.x + r.width - 1, 0, 2, maxHeight);
                        }
                    }
                }
            }

            session.animFrameId = requestAnimationFrame(renderFrame);
        }

        const compositeStream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) : (canvas as any).mozCaptureStream(fps);

        // Optional system audio
        if (options.includeAudio) {
            try {
                const audioConstraints: any = {
                    audio: {
                        mandatory: {
                            chromeMediaSource: "desktop"
                        }
                    },
                    video: false
                };
                const audioStream = await (origGetUserMedia || navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices))(audioConstraints);
                const audioTrack = audioStream.getAudioTracks()[0];
                if (audioTrack) {
                    compositeStream.addTrack(audioTrack);
                }
            } catch (err) {
                console.warn("[YagmurMelekAllScreens] Ses yakalama başlatılamadı:", err);
            }
        }

        const session: ActiveSession = {
            screens,
            streams,
            videoElements,
            canvas,
            ctx,
            compositeStream,
            layout,
            fps,
            stop: () => {
                isRunning = false;
                if (session.animFrameId) cancelAnimationFrame(session.animFrameId);
                for (const stream of streams) {
                    stream.getTracks().forEach(t => t.stop());
                }
                for (const video of videoElements) {
                    video.pause();
                    video.srcObject = null;
                    video.remove();
                }
                if (activeSession === session) {
                    activeSession = null;
                    notifyListeners();
                }
            }
        };

        activeSession = session;
        session.animFrameId = requestAnimationFrame(renderFrame);
        notifyListeners();
        return compositeStream;
    } catch (error) {
        for (const s of streams) s.getTracks().forEach(t => t.stop());
        for (const v of videoElements) v.remove();
        throw error;
    }
}

export function stopCompositeStream() {
    if (activeSession) {
        activeSession.stop();
        activeSession = null;
        notifyListeners();
    }
}

/**
 * Registers hooks into getUserMedia for composite streaming.
 */
export function hookDesktopCapture() {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        if (!origGetUserMedia) {
            origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            navigator.mediaDevices.getUserMedia = async function (constraints: any) {
                const screenId = constraints?.video?.mandatory?.chromeMediaSourceId;
                if (screenId === "screen:all-screens") {
                    return await startCompositeStream();
                }
                return await origGetUserMedia(constraints);
            };
        }
    }
}

/**
 * Restores original hooks.
 */
export function unhookDesktopCapture() {
    if (origGetUserMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = origGetUserMedia;
        origGetUserMedia = null;
    }
    stopCompositeStream();
}
