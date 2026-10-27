/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, Menu, React } from "@webpack/common";

import { hookDesktopCapture, isStreamingAllScreens, subscribeSession, unhookDesktopCapture } from "./engine";
import { ALL_SCREENS_MODAL_KEY, AllScreensModal, openAllScreensModal } from "./modal";

const settings = definePluginSettings({
    autoHook: {
        type: OptionType.BOOLEAN,
        description: "Ekran yakalama köprüsünü otomatik bağla",
        default: true
    },
    defaultFps: {
        type: OptionType.SELECT,
        description: "Varsayılan yayın kare hızı (FPS)",
        options: [
            { label: "30 FPS", value: 30 },
            { label: "60 FPS (Önerilen)", value: 60, default: true },
            { label: "120 FPS", value: 120 }
        ]
    },
    defaultLayout: {
        type: OptionType.SELECT,
        description: "Varsayılan ekran yerleşimi",
        options: [
            { label: "Yanyana Panoramik (WhatsApp Modu)", value: "horizontal", default: true },
            { label: "Izgara (Grid)", value: "grid" }
        ]
    },
    includeAudio: {
        type: OptionType.BOOLEAN,
        description: "Varsayılan olarak sistem sesini yayına dahil et",
        default: true
    }
});

function AllScreensIcon() {
    const isStreaming = React.useSyncExternalStore(subscribeSession, isStreamingAllScreens);
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isStreaming ? "#23a55a" : "currentColor"}
            strokeWidth="2"
        >
            <rect x="2" y="5" width="5.5" height="11" rx="1" />
            <rect x="9.25" y="5" width="5.5" height="11" rx="1" />
            <rect x="16.5" y="5" width="5.5" height="11" rx="1" />
            <line x1="4" y1="19" x2="20" y2="19" />
            <line x1="12" y1="16" x2="12" y2="19" />
        </svg>
    );
}

export default definePlugin({
    name: "YagmurMelekAllScreens",
    description: "Çoklu monitörlerde (3 ekran vb.) tüm ekranları WhatsApp tarzında aynı anda yan yana tek yayında paylaşmanızı sağlar.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,

    chatBarButton: {
        icon: AllScreensIcon,
        render: ({ isAnyChat }) => isAnyChat ? (
            <ChatBarButton
                tooltip="YagmurMelekDc · Tüm Ekranları Paylaş"
                onClick={() => openAllScreensModal()}
            >
                <AllScreensIcon />
            </ChatBarButton>
        ) : null
    },

    contextMenus: {
        "channel-context": (children, props) => {
            const { channel } = props;
            if (!channel) return;
            if (channel.isGuildVocal()) {
                children.push(
                    <Menu.MenuItem
                        id="yagmurmelek-allscreens-channel"
                        label="YagmurMelekDc · Tüm Ekranları Paylaş"
                        action={() => openAllScreensModal()}
                    />
                );
            }
        }
    },

    settingsAboutComponent: () => (
        <div style={{ padding: "8px 0" }}>
            <p style={{ marginBottom: 12, color: "var(--text-muted)" }}>
                3 veya daha fazla ekranınız varsa, WhatsApp'ta olduğu gibi tüm ekranlarınızı yan yana tek bir panoramik yayında Discord'da paylaşabilirsiniz.
            </p>
            <AllScreensModal />
        </div>
    ),

    toolboxActions: {
        "YagmurMelekDc · Tüm Ekranları Paylaş": () => openAllScreensModal()
    },

    start() {
        if (settings.store.autoHook) {
            hookDesktopCapture();
        }
    },

    stop() {
        unhookDesktopCapture();
        closeModal(ALL_SCREENS_MODAL_KEY);
    }
});
