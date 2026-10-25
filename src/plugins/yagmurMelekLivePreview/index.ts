/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import definePlugin from "@utils/types";

import { floatingPreviewGetter, previewGetter } from "./patch";

export default definePlugin({
    name: "YagmurMelekLivePreview",
    description: yagmurMelekTranslate("Keeps your own stream preview running when you switch to another window. Uses additional graphics resources. Restart Discord after enabling or disabling."),
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    tags: ["Voice", "Utility"],
    enabledByDefault: true,
    patches: [{
        find: "get pauseSelfStreamPreviewWhenUnfocused(){",
        replacement: {
            match: previewGetter,
            replace: "get pauseSelfStreamPreviewWhenUnfocused(){return false}"
        }
    }, {
        find: "get streamerPaused(){",
        replacement: {
            match: floatingPreviewGetter,
            replace: "get streamerPaused(){return false}"
        }
    }]
});
