/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";

import { VoiceSettingSection } from "./VoiceSetting";

export const getDefaultVoice = () => window.speechSynthesis?.getVoices().find(v => v.default);

export function getCurrentVoice(voices = window.speechSynthesis?.getVoices()) {
    if (!voices) return undefined;

    if (settings.store.voice) {
        const voice = voices.find(v => v.voiceURI === settings.store.voice);
        if (voice) return voice;

        new Logger("VcNarrator").error(`Voice "${settings.store.voice}" not found. Resetting to default.`);
    }

    const voice = voices.find(v => v.default);
    settings.store.voice = voice?.voiceURI;
    return voice;
}

export const settings = definePluginSettings({
    voice: {
        type: OptionType.COMPONENT,
        component: VoiceSettingSection,
        get default() {
            return getDefaultVoice()?.voiceURI;
        }
    },
    volume: {
        type: OptionType.SLIDER,
        description: yagmurMelekTranslate("Narrator Volume"),
        default: 1,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false
    },
    rate: {
        type: OptionType.SLIDER,
        description: yagmurMelekTranslate("Narrator Speed"),
        default: 1,
        markers: [0.1, 0.5, 1, 2, 5, 10],
        stickToMarkers: false
    },
    sayOwnName: {
        description: yagmurMelekTranslate("Say own name"),
        type: OptionType.BOOLEAN,
        default: false
    },
    latinOnly: {
        description: yagmurMelekTranslate("Strip non latin characters from names before saying them"),
        type: OptionType.BOOLEAN,
        default: false
    },
    joinMessage: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Join Message"),
        default: "{{USER}} joined"
    },
    leaveMessage: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Leave Message"),
        default: "{{USER}} left"
    },
    moveMessage: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Move Message"),
        default: "{{USER}} moved to {{CHANNEL}}"
    },
    muteMessage: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Mute Message (only self for now)"),
        default: "{{USER}} muted"
    },
    unmuteMessage: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Unmute Message (only self for now)"),
        default: "{{USER}} unmuted"
    },
    deafenMessage: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Deafen Message (only self for now)"),
        default: "{{USER}} deafened"
    },
    undeafenMessage: {
        type: OptionType.STRING,
        description: yagmurMelekTranslate("Undeafen Message (only self for now)"),
        default: "{{USER}} undeafened"
    }
});
