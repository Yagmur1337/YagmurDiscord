/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, Modal, openModal, React } from "@webpack/common";

const settings = definePluginSettings({
    clipDuration: {
        type: OptionType.NUMBER,
        description: "Kaydedilecek klip süresi (saniye cinsinden)",
        default: 30
    },
    format: {
        type: OptionType.SELECT,
        description: "Video kayıt formatı",
        options: [
            { label: "WebM (Yüksek Hız, Düşük CPU)", value: "video/webm", default: true },
            { label: "MP4 (Evrensel Uyumluluk)", value: "video/mp4" }
        ]
    },
    includeAudio: {
        type: OptionType.BOOLEAN,
        description: "Ekran sesi ve mikrofonu klibe dahil et",
        default: true
    },
    notifyOnSave: {
        type: OptionType.BOOLEAN,
        description: "Klip tamamlandığında masaüstü bildirimi gönder",
        default: true
    }
});

interface ClipItem {
    id: string;
    url: string;
    name: string;
    date: string;
    size: string;
}

const recentClips: ClipItem[] = [];
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

function triggerQuickSave() {
    if (recordedChunks.length === 0) {
        showNotification({
            title: "YagmurMelek QuickClip",
            body: "Henüz aktif kayıt tamponunda görüntü bulunmuyor. Lütfen önce ekran kaydını başlatın."
        });
        return;
    }

    const mime = settings.store.format || "video/webm";
    const blob = new Blob(recordedChunks, { type: mime });
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    const filename = `YagmurClip_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    recentClips.unshift({
        id: Math.random().toString(36).slice(2),
        url,
        name: filename,
        date: new Date().toLocaleTimeString(),
        size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`
    });

    if (settings.store.notifyOnSave) {
        showNotification({
            title: "YagmurMelek QuickClip",
            body: `Klip başarıyla kaydedildi: ${filename}`
        });
    }
}

function QuickClipModal() {
    const s = settings.use();
    const [recording, setRecording] = React.useState(mediaRecorder !== null && mediaRecorder.state === "recording");
    const [clips, setClips] = React.useState<ClipItem[]>([...recentClips]);

    const startCapturing = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 60 },
                audio: s.includeAudio
            });

            recordedChunks = [];
            const mime = MediaRecorder.isTypeSupported(s.format) ? s.format : "video/webm";
            const rec = new MediaRecorder(stream, { mimeType: mime });

            rec.ondataavailable = e => {
                if (e.data && e.data.size > 0) {
                    recordedChunks.push(e.data);
                    // Keep roughly the last N seconds (assuming chunk every 1 sec)
                    const maxChunks = Math.max(10, s.clipDuration);
                    if (recordedChunks.length > maxChunks) {
                        recordedChunks = recordedChunks.slice(-maxChunks);
                    }
                }
            };

            rec.start(1000);
            mediaRecorder = rec;
            setRecording(true);

            stream.getVideoTracks()[0].onended = () => {
                stopCapturing();
            };
        } catch {
            showNotification({
                title: "YagmurMelek QuickClip",
                body: "Ekran yakalama izni verilmedi veya iptal edildi."
            });
        }
    };

    const stopCapturing = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
            mediaRecorder = null;
        }
        setRecording(false);
    };

    const handleClip = () => {
        triggerQuickSave();
        setClips([...recentClips]);
    };

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>YagmurMelek QuickClip (Son 30 Saniyeyi KliPle)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Yayın veya oyun esnasında yaşanan komik ya da kritik anları tek bir tuşla anında MP4/WebM olarak bilgisayarınıza kaydedin.
            </p>

            <div style={{ display: "flex", gap: 10, alignItems: "center", background: "var(--background-secondary)", padding: 12, borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tampon Kayıt Durumu:</span>
                <span style={{ color: recording ? "#23a55a" : "#f23f43", fontWeight: 700 }}>
                    {recording ? "● Canlı Yakalama Açık (Tampon Aktif)" : "○ Kapalı"}
                </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
                {!recording ? (
                    <button
                        style={{ flex: 1, padding: "10px 16px", borderRadius: 6, border: "none", background: "#5865f2", color: "white", cursor: "pointer", fontWeight: 600 }}
                        onClick={startCapturing}
                    >
                        Ekran Tamponunu Başlat
                    </button>
                ) : (
                    <>
                        <button
                            style={{ flex: 2, padding: "10px 16px", borderRadius: 6, border: "none", background: "#f23f43", color: "white", cursor: "pointer", fontWeight: 700 }}
                            onClick={handleClip}
                        >
                            ⚡ Son {s.clipDuration} Saniyeyi Hemen KliPle
                        </button>
                        <button
                            style={{ flex: 1, padding: "10px 16px", borderRadius: 6, border: "none", background: "rgba(255,255,255,0.1)", color: "white", cursor: "pointer" }}
                            onClick={stopCapturing}
                        >
                            Durdur
                        </button>
                    </>
                )}
            </div>

            {clips.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Son Kaydedilen Klipler:</span>
                    {clips.slice(0, 4).map(clip => (
                        <div key={clip.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--background-secondary-alt)", padding: "8px 12px", borderRadius: 6 }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{clip.name}</span>
                                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{clip.date} • {clip.size}</span>
                            </div>
                            <a
                                href={clip.url}
                                download={clip.name}
                                style={{ padding: "4px 10px", background: "#23a55a", color: "white", borderRadius: 4, textDecoration: "none", fontSize: 11, fontWeight: 600 }}
                            >
                                İndir
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function openQuickClipModal() {
    closeModal("yagmurmelek-quickclip");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Hızlı Klip">
            <QuickClipModal />
        </Modal>
    ), { modalKey: "yagmurmelek-quickclip" });
}

function handleKeyDown(e: KeyboardEvent) {
    // Alt + C to clip
    if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        triggerQuickSave();
    }
}

export default definePlugin({
    name: "YagmurMelekQuickClip",
    description: "Arkadaşınızla konuşurken veya yayın izlerken tek bir tuşla yayının son 30 saniyesini MP4/WebM olarak kaydetmenizi sağlar.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Hızlı Klip Paneli": openQuickClipModal
    },
    settingsAboutComponent: QuickClipModal,

    start() {
        window.addEventListener("keydown", handleKeyDown);
    },

    stop() {
        window.removeEventListener("keydown", handleKeyDown);
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
            mediaRecorder = null;
        }
        recordedChunks = [];
    }
});
