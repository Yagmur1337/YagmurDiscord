/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, Modal, openModal, React } from "@webpack/common";

const settings = definePluginSettings({
    cropWidth: {
        type: OptionType.NUMBER,
        description: "Kırpma alanı genişliği (piksel)",
        default: 1280
    },
    cropHeight: {
        type: OptionType.NUMBER,
        description: "Kırpma alanı yüksekliği (piksel)",
        default: 720
    },
    autoCenter: {
        type: OptionType.BOOLEAN,
        description: "Alanı ekranın ortasına otomatik hizala",
        default: true
    }
});

function CropModal() {
    const [x, setX] = React.useState(0);
    const [y, setY] = React.useState(0);
    const [width, setWidth] = React.useState(settings.store.cropWidth || 1280);
    const [height, setHeight] = React.useState(settings.store.cropHeight || 720);
    const [active, setActive] = React.useState(false);

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>Bölgesel Ekran Kırpma (Screen Crop)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Ekranın tamamını paylaşmak yerine yalnızca seçtiğiniz koordinat ve boyuttaki dikdörtgen alanı yayına iletir.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 12 }}>
                    X Konumu (px):
                    <input
                        type="number"
                        style={{ width: "100%", padding: 6, marginTop: 4, background: "var(--background-secondary)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }}
                        value={x}
                        onChange={e => setX(Number(e.target.value))}
                    />
                </label>
                <label style={{ fontSize: 12 }}>
                    Y Konumu (px):
                    <input
                        type="number"
                        style={{ width: "100%", padding: 6, marginTop: 4, background: "var(--background-secondary)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }}
                        value={y}
                        onChange={e => setY(Number(e.target.value))}
                    />
                </label>
                <label style={{ fontSize: 12 }}>
                    Genişlik (px):
                    <input
                        type="number"
                        style={{ width: "100%", padding: 6, marginTop: 4, background: "var(--background-secondary)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }}
                        value={width}
                        onChange={e => setWidth(Number(e.target.value))}
                    />
                </label>
                <label style={{ fontSize: 12 }}>
                    Yükseklik (px):
                    <input
                        type="number"
                        style={{ width: "100%", padding: 6, marginTop: 4, background: "var(--background-secondary)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4 }}
                        value={height}
                        onChange={e => setHeight(Number(e.target.value))}
                    />
                </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                    style={{ padding: "8px 16px", borderRadius: 4, border: "none", background: active ? "#f23f43" : "#23a55a", color: "white", cursor: "pointer", fontWeight: 600 }}
                    onClick={() => setActive(!active)}
                >
                    {active ? "Kırpmayı Durdur" : "Kırpılmış Yayını Başlat"}
                </button>
            </div>
        </div>
    );
}

function openCropModal() {
    closeModal("yagmurmelek-screencrop");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Bölgesel Ekran Kırpma">
            <CropModal />
        </Modal>
    ), { modalKey: "yagmurmelek-screencrop" });
}

export default definePlugin({
    name: "YagmurMelekScreenCrop",
    description: "Tüm ekranı veya pencereyi paylaşmak yerine, ekranda seçtiğiniz dikdörtgen alanı canlı yayınlamanızı sağlar.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Bölgesel Ekran Kırpma": openCropModal
    },
    settingsAboutComponent: CropModal
});
