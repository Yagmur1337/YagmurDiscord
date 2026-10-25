/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import definePlugin from "@utils/types";

import theme from "./theme.css?managed";

export default definePlugin({
    name: "YagmurMelekTheme",
    description: yagmurMelekTranslate("YagmurMelekDc: charcoal surfaces, orange accents and rounded corners. Designed for dark mode."),
    authors: [{ name: "YagmurMelek DC", id: 0n }],
    enabledByDefault: true,
    managedStyle: theme
});
