/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "FixYoutubeEmbeds",
    description: yagmurMelekTranslate("Bypasses youtube videos being blocked from display on Discord (for example by UMG)"),
    tags: ["Media", "Utility"],
    authors: [Devs.coolelectronics]
});
