/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { reportError } from "@utils/yagmurMelekCrashReporter";
import { closeModal, MediaEngineStore, Modal, openModal, React, SelectedChannelStore } from "@webpack/common";

import {
    getActiveSession,
    getDetectedScreens,
    isStreamingAllScreens,
    startCompositeStream,
    stopCompositeStream,
    subscribeSession
} from "./engine";
import { ScreenLayout, ScreenSource } from "./types";

export const ALL_SCREENS_MODAL_KEY = "yagmurmelek-allscreens";

export function AllScreensModal() {
    const isStreaming = React.useSyncExternalStore(subscribeSession, isStreamingAllScreens);
    const activeSession = getActiveSession();

    const [screens, setScreens] = React.useState<ScreenSource[]>([]);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [errorMsg, setErrorMsg] = React.useState<string>("");

    const [layout, setLayout] = React.useState<ScreenLayout>("horizontal");
    const [fps, setFps] = React.useState<number>(60);
    const [resolution, setResolution] = React.useState<"source" | "720" | "1080" | "1440" | "2160">("source");

    const previewContainerRef = React.useRef<HTMLDivElement>(null);

    const loadScreens = React.useCallback(async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            const detected = await getDetectedScreens();
            setScreens(detected);
        } catch (err: any) {
            setErrorMsg(err?.message || "Ekranlar taranamadı.");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadScreens();
    }, [loadScreens]);

    // Attach active composite canvas to preview container when streaming
    React.useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;

        if (isStreaming && activeSession?.canvas) {
            container.innerHTML = "";
            const canvasClone = activeSession.canvas;
            canvasClone.className = "yagmurmelek-allscreens-preview-canvas";
            container.appendChild(canvasClone);
        } else if (!isStreaming) {
            container.innerHTML = `<div class="yagmurmelek-allscreens-preview-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="margin-bottom: 8px; opacity: 0.6;">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                    <path d="M7 8h10M7 12h5" />
                </svg>
                <div>Yayın başlatıldığında tüm ${screens.length || 2} ekranınız burada yan yana canlı olarak görünecektir.</div>
            </div>`;
        }
    }, [isStreaming, activeSession, screens.length]);

    const handleStart = async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            await startCompositeStream({
                fps,
                layout,
                resolution,
                includeAudio: false
            });
        } catch (err: any) {
            setErrorMsg(err?.message || "Yayın başlatılırken bir hata oluştu.");
            reportError(err, "YagmurMelekAllScreens · Yayın Başlatma", true);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = () => {
        stopCompositeStream();
    };

    const inVoiceChannel = Boolean(SelectedChannelStore.getChannelId());

    return (
        <div className="yagmurmelek-allscreens">
            <div className="yagmurmelek-allscreens-header">
                <div className="yagmurmelek-allscreens-title">
                    <span>Tüm Ekranları Paylaş</span>
                    <span className="yagmurmelek-allscreens-badge">WhatsApp Modu</span>
                </div>
                {isStreaming && (
                    <div className="yagmurmelek-allscreens-live-indicator">
                        <span className="yagmurmelek-allscreens-live-dot" />
                        <span>CANLI ({screens.length} Ekran)</span>
                    </div>
                )}
            </div>

            <div className="yagmurmelek-allscreens-preview-container">
                <div className="yagmurmelek-allscreens-preview-box" ref={previewContainerRef} />
            </div>

            <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #949ba4)", display: "block", marginBottom: 6 }}>
                    Algılanan Ekranlar ({screens.length}):
                </label>
                <div className="yagmurmelek-allscreens-screens-list">
                    {screens.map((screen, idx) => (
                        <div key={screen.id} className={`yagmurmelek-allscreens-screen-chip ${isStreaming ? "active" : ""}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <span>{screen.name || `Ekran ${idx + 1}`}</span>
                        </div>
                    ))}
                    {!screens.length && !loading && (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Ekran tespit edilemedi.</span>
                    )}
                </div>
            </div>

            <div className="yagmurmelek-allscreens-options">
                <div className="yagmurmelek-allscreens-option-group">
                    <label>Görünüm Düzeni</label>
                    <select
                        className="yagmurmelek-allscreens-select"
                        value={layout}
                        disabled={isStreaming}
                        onChange={e => setLayout(e.target.value as ScreenLayout)}
                    >
                        <option value="horizontal">Yanyana Panoramik (WhatsApp Modu - Önerilen)</option>
                        <option value="grid">Izgara (Grid 2x2)</option>
                    </select>
                </div>

                <div className="yagmurmelek-allscreens-option-group">
                    <label>Kare Hızı (FPS)</label>
                    <select
                        className="yagmurmelek-allscreens-select"
                        value={fps}
                        disabled={isStreaming}
                        onChange={e => setFps(Number(e.target.value))}
                    >
                        <option value={60}>60 FPS (Akıcı - Önerilen)</option>
                        <option value={30}>30 FPS (Standart)</option>
                        <option value={120}>120 FPS (Ultra Akıcı)</option>
                    </select>
                </div>

                <div className="yagmurmelek-allscreens-option-group">
                    <label>Çözünürlük</label>
                    <select
                        className="yagmurmelek-allscreens-select"
                        value={resolution}
                        disabled={isStreaming}
                        onChange={e => setResolution(e.target.value as any)}
                    >
                        <option value="source">Kaynak (Orijinal Boyut)</option>
                        <option value="1080">1080p</option>
                        <option value="1440">1440p (2K)</option>
                        <option value="2160">2160p (4K)</option>
                    </select>
                </div>

                <div className="yagmurmelek-allscreens-option-group" style={{ justifyContent: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted, #949ba4)", display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>WhatsApp Panoramik Mod: Tüm monitörleriniz kesintisiz tek yayında birleştirilir.</span>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div style={{ color: "#f23f43", fontSize: 12, padding: "6px 10px", background: "rgba(242, 63, 67, 0.1)", borderRadius: 6 }}>
                    {errorMsg}
                </div>
            )}

            <div className="yagmurmelek-allscreens-actions">
                <button
                    className="yagmurmelek-allscreens-btn secondary"
                    disabled={loading || isStreaming}
                    onClick={loadScreens}
                >
                    Yenile
                </button>

                {!isStreaming ? (
                    <button
                        className="yagmurmelek-allscreens-btn primary"
                        disabled={loading}
                        onClick={handleStart}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                        </svg>
                        <span>Yayını Başlat (Tüm Ekranlar)</span>
                    </button>
                ) : (
                    <button
                        className="yagmurmelek-allscreens-btn danger"
                        onClick={handleStop}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                        </svg>
                        <span>Yayını Durdur</span>
                    </button>
                )}
            </div>
        </div>
    );
}

export function openAllScreensModal() {
    closeModal(ALL_SCREENS_MODAL_KEY);
    openModal(props => (
        <ErrorBoundary>
            <Modal {...props} title="YagmurMelekDc · Tüm Ekranları Paylaş">
                <ErrorBoundary>
                    <AllScreensModal />
                </ErrorBoundary>
            </Modal>
        </ErrorBoundary>
    ), { modalKey: ALL_SCREENS_MODAL_KEY });
}
