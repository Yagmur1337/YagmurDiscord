/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 YagmurMelek and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { copyFileSync, existsSync, readdirSync, renameSync, watch } from "original-fs";
import { basename, dirname, join } from "path";

function isNewer($new: string, old: string) {
    const newParts = $new.slice(4).split(".").map(Number);
    const oldParts = old.slice(4).split(".").map(Number);

    for (let i = 0; i < oldParts.length; i++) {
        if (newParts[i] > oldParts[i]) return true;
        if (newParts[i] < oldParts[i]) return false;
    }
    return false;
}

export function patchLatest(): boolean {
    if (process.env.DISABLE_UPDATER_AUTO_PATCHING) return false;

    try {
        const currentAppPath = dirname(process.execPath);
        const currentVersion = basename(currentAppPath);
        const discordPath = join(currentAppPath, "..");

        if (!existsSync(discordPath)) return false;

        const entries = readdirSync(discordPath);
        const latestVersion = entries.reduce((prev, curr) => {
            return (curr.startsWith("app-") && isNewer(curr, prev))
                ? curr
                : prev;
        }, currentVersion as string);

        if (latestVersion === currentVersion) return false;

        const oldResources = join(discordPath, currentVersion, "resources");
        const oldVencordAsar = join(oldResources, "app.asar");

        const resources = join(discordPath, latestVersion, "resources");
        const newAppAsar = join(resources, "app.asar");
        const newAppAsarBackup = join(resources, "_app.asar");

        if (!existsSync(oldVencordAsar) || !existsSync(newAppAsar) || existsSync(newAppAsarBackup)) return false;

        console.info(`[YagmurMelekDc] Discord güncellemesi tespit edildi (${currentVersion} -> ${latestVersion}). Otomatik kuruluyor...`);

        renameSync(newAppAsar, newAppAsarBackup);
        copyFileSync(oldVencordAsar, newAppAsar);
        console.info(`[YagmurMelekDc] ${latestVersion} sürümüne YagmurMelekDc başarıyla enjekte edildi!`);
        return true;
    } catch (err) {
        console.error("[YagmurMelekDc] Yeni Discord sürümüne otomatik kurulum başarısız oldu:", err);
        return false;
    }
}

// 1. Check immediately upon startup
try {
    patchLatest();
} catch { }

// 2. Repatch on app close / restart
app.on("before-quit", patchLatest);
app.on("will-quit", patchLatest);

// 3. Actively watch discord directory for background updates (Squirrel updater)
try {
    const currentAppPath = dirname(process.execPath);
    const discordPath = join(currentAppPath, "..");
    if (existsSync(discordPath)) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        watch(discordPath, () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    const patched = patchLatest();
                    if (patched || attempts > 15) {
                        clearInterval(interval);
                    }
                }, 2000);
            }, 1000);
        });
    }
} catch { }
