/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { closeModal, MediaEngineStore, Modal, openModal, React } from "@webpack/common";

const mediaActions = findByPropsLazy("toggleSelfMute", "toggleSelfDeaf");

const settings = definePluginSettings({
    gamesList: {
        type: OptionType.STRING,
        description: "Otomatik sağırlaşma tetiklenecek oyun adları (virgülle ayırın)",
        default: "Counter-Strike 2, cs2, VALORANT, Valorant, Rainbow Six Siege, Apex Legends, League of Legends, Dota 2"
    },
    action: {
        type: OptionType.SELECT,
        description: "Oyuna girildiğinde uygulanacak ses eylemi",
        options: [
            { label: "Kulaklığı Kapat (Sağırlaş)", value: "deafen", default: true },
            { label: "Yalnızca Mikrofonu Kapat (Sustur)", value: "mute" },
            { label: "Hem Mikrofonu Hem Kulaklığı Kapat", value: "both" }
        ]
    },
    restoreOnExit: {
        type: OptionType.BOOLEAN,
        description: "Oyundan çıkıldığında eski ses durumunu otomatik geri yükle",
        default: true
    },
    notify: {
        type: OptionType.BOOLEAN,
        description: "Oyun algılandığında veya kapanınca bildirim gönder",
        default: true
    }
});

let wasDeafenedBefore = false;
let wasMutedBefore = false;
let triggeredByGame = false;
let currentRunningGame = "";

function checkGames(games: Array<{ name: string }>) {
    const list = (settings.store.gamesList || "")
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

    const match = games.find(g => list.some(target => g.name.toLowerCase().includes(target)));

    if (match) {
        if (!triggeredByGame) {
            triggeredByGame = true;
            currentRunningGame = match.name;
            wasDeafenedBefore = MediaEngineStore.isSelfDeaf();
            wasMutedBefore = MediaEngineStore.isSelfMute();

            const act = settings.store.action;
            if ((act === "deafen" || act === "both") && !wasDeafenedBefore) {
                mediaActions.toggleSelfDeaf?.();
            }
            if ((act === "mute" || act === "both") && !wasMutedBefore) {
                mediaActions.toggleSelfMute?.();
            }

            if (settings.store.notify) {
                showNotification({
                    title: "YagmurMelek AutoDeafen",
                    body: `${match.name} algılandı! Odaklanabilmeniz için Discord sesi otomatik olarak kapatıldı.`
                });
            }
        }
    } else if (triggeredByGame) {
        const exitedGame = currentRunningGame;
        triggeredByGame = false;
        currentRunningGame = "";

        if (settings.store.restoreOnExit) {
            const act = settings.store.action;
            if ((act === "deafen" || act === "both") && !wasDeafenedBefore && MediaEngineStore.isSelfDeaf()) {
                mediaActions.toggleSelfDeaf?.();
            }
            if ((act === "mute" || act === "both") && !wasMutedBefore && MediaEngineStore.isSelfMute()) {
                mediaActions.toggleSelfMute?.();
            }

            if (settings.store.notify) {
                showNotification({
                    title: "YagmurMelek AutoDeafen",
                    body: `${exitedGame || "Oyun"} kapandı. Ses ayarlarınız eski haline geri getirildi.`
                });
            }
        }
    }
}

function AutoDeafenModal() {
    const s = settings.use();

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>Oyuna Girince Otomatik Sağırlaş / Sustur</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Rekabetçi oyunlara (CS2, Valorant vb.) girdiğiniz anda sesli sohbetteki dikkatinizi dağıtan konuşmaları otomatik keser.
            </p>

            <div style={{ background: "var(--background-secondary)", padding: 12, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Şu Anki Durum:</span>
                <span style={{ fontSize: 12, color: triggeredByGame ? "#23a55a" : "var(--text-muted)" }}>
                    {triggeredByGame ? `● Aktif Oyun: ${currentRunningGame} (Ses Kapatıldı)` : "○ Beklemede (Hedef oyun çalışmıyor)"}
                </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Hedef Oyun İsimleri:
                    <textarea
                        style={{
                            width: "100%",
                            height: 60,
                            marginTop: 4,
                            padding: 8,
                            background: "var(--background-secondary)",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            resize: "vertical"
                        }}
                        value={s.gamesList}
                        onChange={e => settings.store.gamesList = e.target.value}
                    />
                </label>
            </div>
        </div>
    );
}

function openAutoDeafenModal() {
    closeModal("yagmurmelek-autodeafen");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Otomatik Sağırlaşma">
            <AutoDeafenModal />
        </Modal>
    ), { modalKey: "yagmurmelek-autodeafen" });
}

export default definePlugin({
    name: "YagmurMelekAutoDeafenWhileGaming",
    description: "Seçtiğiniz rekabetçi oyunlara (CS2, Valorant vb.) girdiğinizde Discord'da otomatik kulaklık kapatma veya ses seviyesini düşürme.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Otomatik Sağırlaşma": openAutoDeafenModal
    },
    settingsAboutComponent: AutoDeafenModal,

    flux: {
        RUNNING_GAMES_CHANGE({ games }: { games: Array<{ name: string }> }) {
            checkGames(games || []);
        }
    },

    stop() {
        triggeredByGame = false;
        currentRunningGame = "";
    }
});
