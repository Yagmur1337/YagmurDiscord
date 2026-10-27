/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, closeModal, Modal, openModal, React, showToast, Text, Toasts } from "@webpack/common";

export interface ErrorLogItem {
    id: string;
    timestamp: string;
    type: "CRASH" | "ERROR" | "REJECTION" | "NATIVE";
    context: string;
    message: string;
    stack?: string;
    details?: string;
}

const STORAGE_KEY = "yagmurmelek_error_logs";
const LAST_SESSION_KEY = "yagmurmelek_session_marker";
const MAX_LOGS = 50;

export const ERROR_MODAL_KEY = "yagmurmelek-error-report-modal";

export function getErrorLogs(): ErrorLogItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveErrorLog(item: ErrorLogItem) {
    try {
        const logs = getErrorLogs();
        logs.unshift(item);
        if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch { }
}

export function clearErrorLogs() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch { }
}

export function reportError(error: any, context = "Genel Hata", forcePopup = true) {
    const message = error?.message || (typeof error === "string" ? error : "Bilinmeyen bir hata oluştu.");
    const stack = error?.stack || (error?.cause ? String(error.cause) : "");
    const now = new Date();
    const timestamp = now.toLocaleDateString("tr-TR") + " " + now.toLocaleTimeString("tr-TR");

    const item: ErrorLogItem = {
        id: "err_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        timestamp,
        type: "ERROR",
        context,
        message,
        stack,
        details: JSON.stringify({
            userAgent: navigator.userAgent,
            url: location.href,
            time: timestamp
        }, null, 2)
    };

    saveErrorLog(item);

    if (forcePopup) {
        openErrorReportModal(item);
    }
}

export function openErrorReportModal(item: ErrorLogItem) {
    closeModal(ERROR_MODAL_KEY);
    openModal(props => (
        <Modal {...props} title="⚠️ Yağmur Discord · Hata & Çökme Raporu">
            <div style={{ padding: "16px", color: "var(--header-primary, #ffffff)", fontFamily: "var(--font-primary, sans-serif)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px", fontWeight: "700", color: "#f23f43" }}>Hata Tespit Edildi</span>
                        <span style={{ background: "rgba(242, 63, 67, 0.2)", color: "#f23f43", fontSize: "11px", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                            {item.type}
                        </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted, #949ba4)" }}>{item.timestamp}</span>
                </div>

                <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted, #949ba4)", display: "block", marginBottom: "4px" }}>
                        Hatanın Kaynağı:
                    </label>
                    <div style={{ background: "var(--background-secondary, #2b2d31)", padding: "8px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", color: "#5865f2" }}>
                        {item.context}
                    </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted, #949ba4)", display: "block", marginBottom: "4px" }}>
                        Hata Açıklaması:
                    </label>
                    <div style={{ background: "rgba(242, 63, 67, 0.1)", border: "1px solid rgba(242, 63, 67, 0.3)", padding: "10px 12px", borderRadius: "6px", fontSize: "13px", color: "#f23f43", wordBreak: "break-word" }}>
                        {item.message}
                    </div>
                </div>

                {item.stack && (
                    <div style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted, #949ba4)", display: "block", marginBottom: "4px" }}>
                            Teknik Detay & Stack Trace:
                        </label>
                        <pre style={{
                            background: "#090a0d",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            padding: "10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "#dbdee1",
                            maxHeight: "160px",
                            overflowY: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all"
                        }}>
                            {item.stack}
                        </pre>
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
                    <button
                        type="button"
                        style={{
                            background: "var(--background-secondary-alt, #1e1f22)",
                            color: "var(--text-normal, #dbdee1)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600"
                        }}
                        onClick={() => {
                            const fullReport = `=== Yağmur Discord Hata Raporu ===\nZaman: ${item.timestamp}\nTür: ${item.type}\nKaynak: ${item.context}\nHata: ${item.message}\n\nStack:\n${item.stack || "N/A"}`;
                            if (window.DiscordNative?.clipboard?.copy) {
                                window.DiscordNative.clipboard.copy(fullReport);
                            } else {
                                navigator.clipboard.writeText(fullReport);
                            }
                            showToast("Hata raporu panoya kopyalandı!", Toasts.Type.SUCCESS);
                        }}
                    >
                        📋 Raporu Kopyala
                    </button>

                    <button
                        type="button"
                        style={{
                            background: "#5865f2",
                            color: "#ffffff",
                            border: "none",
                            padding: "8px 20px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600"
                        }}
                        onClick={() => closeModal(ERROR_MODAL_KEY)}
                    >
                        Tamam
                    </button>
                </div>
            </div>
        </Modal>
    ), { modalKey: ERROR_MODAL_KEY });
}

export function openErrorLogsModal() {
    try {
        openModal(props => (
            <Modal
                {...props}
                size="lg"
                title="Yağmur Discord · Hata & Çökme Günlükleri"
            >
                <ErrorLogsViewer />
            </Modal>
        ));
    } catch (e) {
        console.error("Failed to open error logs modal:", e);
    }
}

export function ErrorLogsViewer() {
    const [logs, setLogs] = React.useState<ErrorLogItem[]>([]);

    const refresh = React.useCallback(() => {
        setLogs(getErrorLogs());
    }, []);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    const handleClear = () => {
        clearErrorLogs();
        setLogs([]);
        showToast("Hata günlükleri temizlendi.", Toasts.Type.MESSAGE);
    };

    const handleCopyAll = () => {
        const text = logs.map(l => `[${l.timestamp}] [${l.type}] [${l.context}] ${l.message}\n${l.stack || ""}`).join("\n---\n");
        if (window.DiscordNative?.clipboard?.copy) {
            window.DiscordNative.clipboard.copy(text || "Günlük boş.");
        } else {
            navigator.clipboard.writeText(text || "Günlük boş.");
        }
        showToast("Tüm hata günlükleri kopyalandı!", Toasts.Type.SUCCESS);
    };

    const handleTestError = () => {
        try {
            throw new Error("Bu bir test hata penceresidir. Sistem hata yakalama mekanizmasını doğrulamak için üretilmiştir.");
        } catch (e: any) {
            reportError(e, "Test Hata Raporlayıcı", true);
            refresh();
        }
    };

    return (
        <section className="vc-settings-tab" style={{ padding: "16px", color: "var(--header-primary, #ffffff)", fontFamily: "var(--font-primary, sans-serif)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                    <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#5865f2" }}>Hata Günlükleri (Error Logs)</h2>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted, #949ba4)" }}>
                        Discord ve eklentilerde oluşan tüm hatalar ve çökme kayıtları burada listelenir.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        type="button"
                        style={{
                            background: "rgba(88, 101, 242, 0.15)",
                            color: "#5865f2",
                            border: "1px solid rgba(88, 101, 242, 0.3)",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600"
                        }}
                        onClick={handleTestError}
                    >
                        🧪 Test Hatası Oluştur
                    </button>
                    <button
                        type="button"
                        style={{
                            background: "var(--background-secondary-alt, #1e1f22)",
                            color: "var(--text-normal, #dbdee1)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600"
                        }}
                        onClick={handleCopyAll}
                    >
                        📋 Hepsini Kopyala
                    </button>
                    <button
                        type="button"
                        style={{
                            background: "rgba(242, 63, 67, 0.15)",
                            color: "#f23f43",
                            border: "1px solid rgba(242, 63, 67, 0.3)",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600"
                        }}
                        onClick={handleClear}
                    >
                        🗑️ Temizle
                    </button>
                </div>
            </div>

            {logs.length === 0 ? (
                <div style={{
                    background: "var(--background-secondary, #2b2d31)",
                    borderRadius: "8px",
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--text-muted, #949ba4)"
                }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>Kayıtlı herhangi bir hata bulunmuyor.</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Sistem sorunsuz ve kararlı çalışıyor.</div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {logs.map(log => (
                        <div
                            key={log.id}
                            style={{
                                background: "var(--background-secondary, #2b2d31)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderRadius: "8px",
                                padding: "12px 16px",
                                cursor: "pointer",
                                transition: "border-color 0.15s ease"
                            }}
                            onClick={() => openErrorReportModal(log)}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{
                                        background: log.type === "CRASH" ? "#f23f43" : "rgba(242, 63, 67, 0.2)",
                                        color: log.type === "CRASH" ? "#ffffff" : "#f23f43",
                                        padding: "1px 6px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: "700"
                                    }}>
                                        {log.type}
                                    </span>
                                    <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-normal, #dbdee1)" }}>
                                        {log.context}
                                    </span>
                                </div>
                                <span style={{ fontSize: "11px", color: "var(--text-muted, #949ba4)" }}>
                                    {log.timestamp}
                                </span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#f23f43", wordBreak: "break-word" }}>
                                {log.message}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/**
 * Initializes global error listeners and checks if previous session crashed.
 */
export function initCrashReporter() {
    if (typeof window === "undefined") return;

    // Check if previous session ended unexpectedly
    try {
        const lastMarker = localStorage.getItem(LAST_SESSION_KEY);
        if (lastMarker === "active") {
            // Previous session crashed or restarted abruptly
            const crashLog: ErrorLogItem = {
                id: "crash_" + Date.now(),
                timestamp: new Date().toLocaleDateString("tr-TR") + " " + new Date().toLocaleTimeString("tr-TR"),
                type: "CRASH",
                context: "Discord Çökme / Yeniden Başlatma",
                message: "Discord önceki oturumda beklenmeyen bir şekilde sonlandı ve yeniden başladı.",
                stack: "Chromium IOThread veya yerel işlem hatası tespit edildi. İlgili modül parametreleri sıfırlandı.",
                details: "Session marker was not cleanly unmounted."
            };
            saveErrorLog(crashLog);
            setTimeout(() => {
                openErrorReportModal(crashLog);
            }, 1800);
        }
        localStorage.setItem(LAST_SESSION_KEY, "active");
        window.addEventListener("beforeunload", () => {
            localStorage.setItem(LAST_SESSION_KEY, "clean_exit");
        });
    } catch { }

    // Catch global unhandled promise rejections
    window.addEventListener("unhandledrejection", event => {
        const err = event.reason;
        reportError(err, "İşlenmeyen Promise Hatası (UnhandledRejection)", true);
    });

    // Catch global window errors
    window.addEventListener("error", event => {
        if (event.error) {
            reportError(event.error, "Genel Pencere Hatası (Window Error)", true);
        }
    });
}
