/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    defaultLayout: {
        type: OptionType.SELECT,
        options: [
            { label: yagmurMelekTranslate("List"), value: 1, default: true },
            { label: yagmurMelekTranslate("Gallery"), value: 2 }
        ],
        description: yagmurMelekTranslate("Which layout to use as default")
    },
    defaultSortOrder: {
        type: OptionType.SELECT,
        options: [
            { label: yagmurMelekTranslate("Recently Active"), value: 0, default: true },
            { label: yagmurMelekTranslate("Date Posted"), value: 1 }
        ],
        description: yagmurMelekTranslate("Which sort order to use as default")
    }
});

export default definePlugin({
    name: "OverrideForumDefaults",
    description: yagmurMelekTranslate("Allows you to override default forum layout/sort order. you can still change it on a per-channel basis"),
    tags: ["Servers", "Organisation", "Customisation"],
    authors: [Devs.Inbestigator],
    patches: [
        {
            find: "getDefaultLayout(){",
            replacement: [
                {
                    match: /}getDefaultLayout\(\){/,
                    replace: "$&return $self.getLayout();"
                },
                {
                    match: /}getDefaultSortOrder\(\){/,
                    replace: "$&return $self.getSortOrder();"
                }
            ]
        }
    ],

    getLayout: () => settings.store.defaultLayout,
    getSortOrder: () => settings.store.defaultSortOrder,

    settings
});
