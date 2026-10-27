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
    blurDms: {
        type: OptionType.BOOLEAN,
        description: "DM mesaj listesini ve sohbet pencerelerini sansürle",
        default: true
    },
    blurToasts: {
        type: OptionType.BOOLEAN,
        description: "Gelen Discord bildirim pencerelerini sansürle",
        default: true
    },
    blurAvatars: {
        type: OptionType.BOOLEAN,
        description: "Kullanıcı profil fotoğraflarını ve takma adlarını mozaikle",
        default: false
    },
    blurAmount: {
        type: OptionType.NUMBER,
        description: "Bulanıklık seviyesi (piksel)",
        default: 8
    },
    hoverToReveal: {
        type: OptionType.BOOLEAN,
        description: "Farenin imleci üzerine gelince netleştir",
        default: true
    }
});

const STYLE_ID = "yagmurmelek-privacy-blur-css";
let isPrivacyActive = false;

function updatePrivacyStyles() {
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!isPrivacyActive) {
        if (styleEl) styleEl.remove();
        return;
    }

    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = STYLE_ID;
        document.head.appendChild(styleEl);
    }

    const px = settings.store.blurAmount || 8;
    const hoverRule = settings.store.hoverToReveal ? ":hover { filter: none !important; transition: filter 0.15s ease-out; }" : "";

    const rules: string[] = [];

    if (settings.store.blurDms) {
        rules.push(`
            [class*="privateChannels_"],
            [data-list-id="chat-messages"] [class*="contents_"],
            [class*="channel_"][role="listitem"] {
                filter: blur(${px}px) !important;
                transition: filter 0.2s ease-in-out;
            }
            [class*="privateChannels_"]${hoverRule}
            [data-list-id="chat-messages"] [class*="contents_"]${hoverRule}
            [class*="channel_"][role="listitem"]${hoverRule}
        `);
    }

    if (settings.store.blurToasts) {
        rules.push(`
            [class*="toast_"],
            [class*="container_"][class*="elevationHigh_"] {
                filter: blur(${px}px) !important;
                transition: filter 0.2s ease-in-out;
            }
            [class*="toast_"]${hoverRule}
        `);
    }

    if (settings.store.blurAvatars) {
        rules.push(`
            [class*="avatar_"],
            [class*="username_"] {
                filter: blur(${px}px) !important;
                transition: filter 0.2s ease-in-out;
            }
            [class*="avatar_"]${hoverRule}
            [class*="username_"]${hoverRule}
        `);
    }

    styleEl.textContent = rules.join("\n");
}

function PrivacyModal() {
    const s = settings.use();
    const [active, setActive] = React.useState(isPrivacyActive);

    const toggle = () => {
        isPrivacyActive = !isPrivacyActive;
        setActive(isPrivacyActive);
        updatePrivacyStyles();
        showNotification({
            title: "YagmurMelek PrivacyBlur",
            body: isPrivacyActive ? "Gizlilik sansürü aktif edildi." : "Gizlilik sansürü devre dışı bırakıldı."
        });
    };

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>Yayın ve Bildirim Gizliliği (Privacy Blur)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Ekran yayını yaparken veya arkadaşlarınız yanınızdayken kişisel DM'lerinizi ve hassas bildirimleri otomatik olarak mozaikler.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--background-secondary)", padding: 12, borderRadius: 8 }}>
                <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Gizlilik Kalkanı Durumu:</span>
                    <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                        {active ? "Şu anda hassas içerikler yayında mozaikleniyor." : "Sansür şu anda devre dışı."}
                    </p>
                </div>
                <button
                    style={{
                        padding: "8px 18px",
                        borderRadius: 6,
                        border: "none",
                        background: active ? "#f23f43" : "#23a55a",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 700
                    }}
                    onClick={toggle}
                >
                    {active ? "Kalkanı Kapat" : "Kalkanı Aç"}
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={s.blurDms}
                        onChange={e => {
                            settings.store.blurDms = e.target.checked;
                            updatePrivacyStyles();
                        }}
                    />
                    <span>DM Mesajlarını ve Listesini Sansürle</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={s.blurToasts}
                        onChange={e => {
                            settings.store.blurToasts = e.target.checked;
                            updatePrivacyStyles();
                        }}
                    />
                    <span>Gelen Bildirim Pop-up'larını Sansürle</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={s.hoverToReveal}
                        onChange={e => {
                            settings.store.hoverToReveal = e.target.checked;
                            updatePrivacyStyles();
                        }}
                    />
                    <span>Fareyle Üzerine Gelindiğinde Geçici Olarak Göster</span>
                </label>
            </div>
        </div>
    );
}

function openPrivacyModal() {
    closeModal("yagmurmelek-privacyblur");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Gizlilik Sansürü">
            <PrivacyModal />
        </Modal>
    ), { modalKey: "yagmurmelek-privacyblur" });
}

export default definePlugin({
    name: "YagmurMelekPrivacyBlur",
    description: "Yayın sırasında veya ekran paylaşırken özel mesajları ve Discord bildirimlerini otomatik olarak mozaikler.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Gizlilik Kalkanı (Privacy Blur)": openPrivacyModal
    },
    settingsAboutComponent: PrivacyModal,

    start() {
        isPrivacyActive = true;
        updatePrivacyStyles();
    },

    stop() {
        isPrivacyActive = false;
        updatePrivacyStyles();
    }
});
