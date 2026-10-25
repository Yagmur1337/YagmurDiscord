/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import turkish from "./tr.json";

export type YagmurMelekLanguage = "tr" | "en";

function readLanguage(): YagmurMelekLanguage {
    try {
        return VencordNative.settings.get().plugins?.YagmurMelekDCLanguage?.language === "en" ? "en" : "tr";
    } catch {
        return "tr";
    }
}

// Plugin metadata is created during startup, so language changes require a reload.
export const yagmurMelekLanguage = readLanguage();

export function yagmurMelekTranslate(text: string): string {
    return yagmurMelekLanguage === "tr" ? (turkish as Record<string, string>)[text] ?? text : text;
}
