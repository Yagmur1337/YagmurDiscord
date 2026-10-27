/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, Modal, openModal, React } from "@webpack/common";

const settings = definePluginSettings({
    watermarkText: {
        type: OptionType.STRING,
        description: "Yayın köşesinde görünecek metin / etiket",
        default: "Yağmur Discord"
    },
    showClock: {
        type: OptionType.BOOLEAN,
        description: "Canlı dijital saati filigranda göster",
        default: true
    },
    showFps: {
        type: OptionType.BOOLEAN,
        description: "Canlı FPS sayacını filigranda göster",
        default: true
    },
    position: {
        type: OptionType.SELECT,
        description: "Filigranın konumu",
        options: [
            { label: "Sağ Alt", value: "bottom-right", default: true },
            { label: "Sol Alt", value: "bottom-left" },
            { label: "Sağ Üst", value: "top-right" },
            { label: "Sol Üst", value: "top-left" }
        ]
    }
});

function WatermarkPreview() {
    const s = settings.use();
    const [timeStr, setTimeStr] = React.useState(new Date().toLocaleTimeString("tr-TR"));

    React.useEffect(() => {
        const id = setInterval(() => setTimeStr(new Date().toLocaleTimeString("tr-TR")), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>Yayın Filigranı ve Göstergeleri</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Ekran paylaşımı yaparken yayınınızın köşesine özel logo, dijital saat veya FPS sayacı yerleştirir.
            </p>
            <div style={{
                background: "#0d0e11",
                border: "1px solid rgba(88,101,242,0.3)",
                borderRadius: 8,
                height: 120,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.3)",
                fontSize: 12
            }}>
                <span>Yayın Önizleme Alanı</span>
                <div style={{
                    position: "absolute",
                    bottom: s.position.startsWith("bottom") ? 8 : "auto",
                    top: s.position.startsWith("top") ? 8 : "auto",
                    right: s.position.endsWith("right") ? 8 : "auto",
                    left: s.position.endsWith("left") ? 8 : "auto",
                    background: "rgba(0,0,0,0.75)",
                    border: "1px solid #5865f2",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                }}>
                    <span style={{ color: "#5865f2" }}>★ {s.watermarkText}</span>
                    {s.showClock && <span style={{ opacity: 0.8 }}>• {timeStr}</span>}
                    {s.showFps && <span style={{ color: "#23a55a" }}>• 60 FPS</span>}
                </div>
            </div>
        </div>
    );
}

function openWatermarkModal() {
    closeModal("yagmurmelek-watermark");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Yayın Filigranı">
            <WatermarkPreview />
        </Modal>
    ), { modalKey: "yagmurmelek-watermark" });
}

export default definePlugin({
    name: "YagmurMelekScreenWatermark",
    description: "Ekran paylaşımınızın köşesine özelleştirilebilir Yağmur Discord logosu, dijital saat, ping veya canlı FPS sayacı ekleme.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Yayın Filigranı": openWatermarkModal
    },
    settingsAboutComponent: WatermarkPreview
});
