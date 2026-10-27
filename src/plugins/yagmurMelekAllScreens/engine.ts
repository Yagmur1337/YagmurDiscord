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
 * Fetches all physical screen display sources currently connected to the system.
 * Only returns real, verified sources from DiscordNative.desktopCapture.
 */
export async function getDetectedScreens(): Promise<ScreenSource[]> {
    if (typeof window !== "undefined" && window.DiscordNative?.desktopCapture?.getDesktopCaptureSources) {
        try {
            const rawSources = await (origGetDesktopCaptureSources || window.DiscordNative.desktopCapture.getDesktopCaptureSources)({
                types: ["screen"],
                thumbnailSize: { width: 480, height: 270 }
            });
            if (Array.isArray(rawSources)) {
                return rawSources
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

    return [];
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

            if (i < images.length - 1) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
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
 * Starts multi-screen composite streaming safely without Chromium IOThread crashes.
 * Captures all physical monitors, draws them side-by-side onto canvas, and captures composite stream.
 */
export async function startCompositeStream(options: StreamOptions = {}): Promise<MediaStream> {
    if (activeSession) {
        return activeSession.compositeStream;
    }

    const fps = Math.min(Math.max(options.fps || 60, 15), 60);
    const layout = options.layout || "horizontal";
    const screens = await getDetectedScreens();

    if (!screens.length) {
        throw new Error("Sistemde paylaşılacak fiziksel ekran bulunamadı. Lütfen monitör bağlantılarınızı kontrol edin.");
    }

    const streams: MediaStream[] = [];
    const videoElements: HTMLVideoElement[] = [];

    const getUserMediaFn = origGetUserMedia || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices));
    if (!getUserMediaFn) {
        throw new Error("Tarayıcı medya yakalama API'sine erişilemedi.");
    }

    try {
        for (const screen of screens) {
            try {
                const constraints: any = {
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: screen.id,
                            maxWidth: 1920,
                            maxHeight: 1080,
                            maxFrameRate: fps
                        }
                    }
                };

                const stream = await getUserMediaFn(constraints);
                streams.push(stream);

                const video = document.createElement("video");
                video.autoplay = true;
                video.muted = true;
                (video as any).playsInline = true;
                video.srcObject = stream;
                // Keep video detached from DOM tree to avoid React reconciler conflicts
                videoElements.push(video);

                await new Promise<void>(resolve => {
                    if (video.readyState >= 2) return resolve();
                    video.onloadedmetadata = () => resolve();
                    setTimeout(resolve, 800);
                });
                await video.play().catch(() => {});
            } catch (screenErr) {
                console.warn(`[YagmurMelekAllScreens] Monitör yakalama uyarısı (${screen.id}):`, screenErr);
            }
        }

        if (videoElements.length === 0) {
            throw new Error("Hiçbir ekran görüntüsü yakalanamadı. Lütfen ekran paylaşımı izinlerinizi kontrol edin.");
        }

        const dims = videoElements.map(v => ({
            width: v.videoWidth || 1920,
            height: v.videoHeight || 1080
        }));

        const { totalWidth, maxHeight, rects } = calculateLayout(dims, layout);

        // Safe bounds for canvas to prevent GPU texture exhaustion
        let targetWidth = totalWidth;
        let targetHeight = maxHeight;
        if (targetWidth > 3840) {
            const scale = 3840 / targetWidth;
            targetWidth = 3840;
            targetHeight = Math.round(targetHeight * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
            throw new Error("Görüntü birleştirme motoru (Canvas 2D) oluşturulamadı.");
        }

        const renderCtx = ctx;
        let isRunning = true;
        let lastFrameTime = 0;
        const frameInterval = 1000 / fps;
        const scaleX = targetWidth / totalWidth;
        const scaleY = targetHeight / maxHeight;

        function renderFrame(time: number) {
            if (!isRunning) return;

            if (time - lastFrameTime >= frameInterval - 2) {
                lastFrameTime = time;
                renderCtx.fillStyle = "#000000";
                renderCtx.fillRect(0, 0, targetWidth, targetHeight);

                for (let i = 0; i < videoElements.length; i++) {
                    const v = videoElements[i];
                    const r = rects[i];
                    if (v.readyState >= 2 && r) {
                        const rx = Math.round(r.x * scaleX);
                        const ry = Math.round(r.y * scaleY);
                        const rw = Math.round(r.width * scaleX);
                        const rh = Math.round(r.height * scaleY);

                        renderCtx.drawImage(v, rx, ry, rw, rh);

                        // Subtle boundary line between adjacent screens
                        if (layout === "horizontal" && i < videoElements.length - 1) {
                            renderCtx.fillStyle = "rgba(0, 0, 0, 0.75)";
                            renderCtx.fillRect(rx + rw - 2, 0, 4, targetHeight);
                            renderCtx.fillStyle = "rgba(88, 101, 242, 0.9)";
                            renderCtx.fillRect(rx + rw - 1, 0, 2, targetHeight);
                        }
                    }
                }
            }

            session.animFrameId = requestAnimationFrame(renderFrame);
        }

        const compositeStream: MediaStream = (canvas as any).captureStream
            ? (canvas as any).captureStream(fps)
            : (canvas as any).mozCaptureStream(fps);

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
                if (session.animFrameId) {
                    cancelAnimationFrame(session.animFrameId);
                    session.animFrameId = undefined;
                }
                for (const stream of streams) {
                    try {
                        stream.getTracks().forEach(t => t.stop());
                    } catch {}
                }
                for (const video of videoElements) {
                    try {
                        video.pause();
                        video.srcObject = null;
                        video.remove();
                    } catch {}
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
        for (const s of streams) {
            try { s.getTracks().forEach(t => t.stop()); } catch {}
        }
        for (const v of videoElements) {
            try { v.srcObject = null; v.remove(); } catch {}
        }
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
 * Registers hooks into getUserMedia and desktopCapture for composite streaming.
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

    if (typeof window !== "undefined" && window.DiscordNative?.desktopCapture?.getDesktopCaptureSources) {
        if (!origGetDesktopCaptureSources) {
            origGetDesktopCaptureSources = window.DiscordNative.desktopCapture.getDesktopCaptureSources.bind(window.DiscordNative.desktopCapture);
            window.DiscordNative.desktopCapture.getDesktopCaptureSources = async function (opts: any) {
                const sources = await origGetDesktopCaptureSources(opts);
                if (Array.isArray(sources) && opts?.types?.includes("screen")) {
                    const realScreens = sources.filter((s: any) => s?.id?.startsWith("screen:") && s?.id !== "screen:all-screens");
                    if (realScreens.length > 1) {
                        try {
                            const compositeThumb = await createCompositeThumbnail(realScreens);
                            const allScreensSource = {
                                id: "screen:all-screens",
                                name: `Tüm Ekranlar (${realScreens.length} Ekran - WhatsApp Modu)`,
                                url: compositeThumb || realScreens[0]?.url || "",
                                icon: null
                            };
                            return [allScreensSource, ...sources];
                        } catch {
                            return sources;
                        }
                    }
                }
                return sources;
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
    if (origGetDesktopCaptureSources && window.DiscordNative?.desktopCapture) {
        window.DiscordNative.desktopCapture.getDesktopCaptureSources = origGetDesktopCaptureSources;
        origGetDesktopCaptureSources = null;
    }
    stopCompositeStream();
}
