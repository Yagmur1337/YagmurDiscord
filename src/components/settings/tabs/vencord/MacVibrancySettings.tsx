/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { IS_MAC } from "@utils/constants";
import { yagmurMelekTranslate } from "@utils/yagmurMelekLanguage";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { Forms, Select } from "@webpack/common";

export function MacOSVibrancySettings() {
    const settings = useSettings(["macosVibrancyStyle"]);

    if (!IS_MAC || IS_WEB) return null;

    return (
        <ErrorBoundary noop>
            <Forms.FormTitle tag="h5">{yagmurMelekTranslate("MacOS Window vibrancy style (requires restart)")}</Forms.FormTitle>
            <Select
                className={Margins.bottom20}
                placeholder={yagmurMelekTranslate("Window vibrancy style")}
                options={[
                    // Sorted from most opaque to most transparent
                    {
                        label: yagmurMelekTranslate("No vibrancy"), value: undefined
                    },
                    {
                        label: yagmurMelekTranslate("Under Page (window tinting)"),
                        value: "under-page"
                    },
                    {
                        label: yagmurMelekTranslate("Content"),
                        value: "content"
                    },
                    {
                        label: yagmurMelekTranslate("Window"),
                        value: "window"
                    },
                    {
                        label: yagmurMelekTranslate("Selection"),
                        value: "selection"
                    },
                    {
                        label: yagmurMelekTranslate("Titlebar"),
                        value: "titlebar"
                    },
                    {
                        label: yagmurMelekTranslate("Header"),
                        value: "header"
                    },
                    {
                        label: yagmurMelekTranslate("Sidebar"),
                        value: "sidebar"
                    },
                    {
                        label: yagmurMelekTranslate("Tooltip"),
                        value: "tooltip"
                    },
                    {
                        label: yagmurMelekTranslate("Menu"),
                        value: "menu"
                    },
                    {
                        label: "Popover",
                        value: "popover"
                    },
                    {
                        label: yagmurMelekTranslate("Fullscreen UI (transparent but slightly muted)"),
                        value: "fullscreen-ui"
                    },
                    {
                        label: yagmurMelekTranslate("HUD (Most transparent)"),
                        value: "hud"
                    },
                ]}
                select={v => settings.macosVibrancyStyle = v}
                isSelected={v => settings.macosVibrancyStyle === v}
                serialize={identity}
            />
        </ErrorBoundary>
    );
}
