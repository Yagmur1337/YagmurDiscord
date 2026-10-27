/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, Menu, Modal, openModal, React } from "@webpack/common";

const settings = definePluginSettings({
    cleanFilename: {
        type: OptionType.BOOLEAN,
        description: "İndirilen dosya adına tarih ve YagmurMelek etiketi ekle",
        default: true
    },
    originalQuality: {
        type: OptionType.BOOLEAN,
        description: "Discord küçültme parametrelerini kaldırıp tam orijinal çözünürlüğü indir",
        default: true
    },
    notify: {
        type: OptionType.BOOLEAN,
        description: "İndirme işlemi başladığında bildirim göster",
        default: true
    }
});

function getOriginalMediaUrl(rawUrl: string): string {
    if (!rawUrl) return rawUrl;
    try {
        const u = new URL(rawUrl);
        if (settings.store.originalQuality) {
            // Remove discord resize/proxy parameters
            u.searchParams.delete("width");
            u.searchParams.delete("height");
            u.searchParams.delete("scale");
            if (u.searchParams.get("format") === "webp" && rawUrl.includes(".png")) {
                u.searchParams.set("format", "png");
            }
        }
        return u.toString();
    } catch {
        return rawUrl;
    }
}

async function downloadMedia(url: string, suggestedName?: string) {
    if (!url) return;
    const finalUrl = getOriginalMediaUrl(url);

    try {
        if (settings.store.notify) {
            showNotification({
                title: "YagmurMelek Medya İndirici",
                body: "Medya orijinal kalitesinde indiriliyor..."
            });
        }

        const res = await fetch(finalUrl);
        const blob = await res.blob();

        let ext = "png";
        if (blob.type.includes("jpeg") || blob.type.includes("jpg")) ext = "jpg";
        else if (blob.type.includes("gif")) ext = "gif";
        else if (blob.type.includes("webp")) ext = "webp";
        else if (blob.type.includes("mp4")) ext = "mp4";
        else if (blob.type.includes("webm")) ext = "webm";
        else if (blob.type.includes("ogg")) ext = "ogg";
        else if (blob.type.includes("mp3")) ext = "mp3";

        let filename = suggestedName;
        if (!filename || settings.store.cleanFilename) {
            const dateStr = new Date().toISOString().slice(0, 10);
            filename = `YagmurMedia_${dateStr}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        }

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
        // Fallback to direct anchor download
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = suggestedName || "media";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

function makeDownloadMenuItem(url: string) {
    return (
        <Menu.MenuItem
            id="yagmurmelek-download-media"
            key="yagmurmelek-download-media"
            label="★ Orijinal Kalitede İndir (YagmurMelek)"
            action={() => downloadMedia(url)}
        />
    );
}

const imageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const src = props?.src || props?.itemSrc || props?.target?.src;
    if (!src) return;

    const group = findGroupChildrenByChildId("copy-native-link", children) ||
        findGroupChildrenByChildId("open-native-link", children) ||
        children;

    group.push(makeDownloadMenuItem(src));
};

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const message = props?.message;
    const attachment = message?.attachments?.[0];
    const src = attachment?.url || props?.itemHref || props?.itemSrc;
    if (!src) return;

    const group = findGroupChildrenByChildId("copy-link", children) || children;
    group.push(makeDownloadMenuItem(src));
};

function DownloaderModal() {
    const s = settings.use();
    const [inputUrl, setInputUrl] = React.useState("");

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>Hızlı Medya İndirici (Media Downloader)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Kanallardaki ve DM'lerdeki video, resim ve GIF'lere sağ tıklayarak Discord sıkıştırması olmadan doğrudan orijinal kalitede indirin.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--background-secondary)", padding: 12, borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Manuel URL İndirme:</span>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        type="text"
                        placeholder="https://cdn.discordapp.com/attachments/..."
                        style={{ flex: 1, padding: "8px 10px", background: "var(--background-secondary-alt)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6 }}
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                    />
                    <button
                        style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#5865f2", color: "white", cursor: "pointer", fontWeight: 600 }}
                        onClick={() => {
                            if (inputUrl) downloadMedia(inputUrl);
                        }}
                    >
                        İndir
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={s.originalQuality}
                        onChange={e => settings.store.originalQuality = e.target.checked}
                    />
                    <span>Orijinal Çözünürlüğü Koru (Discord Sıkıştırma Parametrelerini Kaldır)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={s.cleanFilename}
                        onChange={e => settings.store.cleanFilename = e.target.checked}
                    />
                    <span>Dosya Adını Tarih ve Etiketle Otomatik Düzenle</span>
                </label>
            </div>
        </div>
    );
}

function openDownloaderModal() {
    closeModal("yagmurmelek-mediadownloader");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Medya İndirici">
            <DownloaderModal />
        </Modal>
    ), { modalKey: "yagmurmelek-mediadownloader" });
}

export default definePlugin({
    name: "YagmurMelekMediaDownloader",
    description: "Kanallardaki ve DM'lerdeki video, ses ve resimleri sağ tıklayıp tek tıkla orijinal kalitede indirmenizi sağlar.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Medya İndirici": openDownloaderModal
    },
    settingsAboutComponent: DownloaderModal,
    contextMenus: {
        "image-context": imageContextMenuPatch,
        "message": messageContextMenuPatch
    }
});
