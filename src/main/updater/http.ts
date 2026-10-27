/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { newerVersion } from "@plugins/yagmurMelekUpdater/package";
import { HYPER_VERSION } from "@plugins/yagmurMelekUpdater/version";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { ipcMain } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { serializeErrors, VENCORD_FILES } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
let PendingUpdates = [] as [string, string][];

async function githubGet<T = any>(endpoint: string) {
    return fetchJson<T>(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            // "All API requests MUST include a valid User-Agent header.
            // Requests with no User-Agent header will be rejected."
            "User-Agent": VENCORD_USER_AGENT
        }
    });
}

async function calculateGitChanges() {
    const isOutdated = await fetchUpdates();
    if (!isOutdated) return [];

    try {
        const data = await githubGet(`/compare/${gitHash}...HEAD`);

        return data.commits?.map((c: any) => ({
            // github api only sends the long sha
            hash: c.sha.slice(0, 7),
            author: c.author?.login ?? c.commit?.author?.name ?? "Unknown Author",
            message: c.commit.message.split("\n")[0]
        })) ?? [];
    } catch {
        return [{
            hash: "update",
            author: "Yağmur Discord",
            message: "Yeni Yağmur Discord güncellemesi mevcut"
        }];
    }
}

async function fetchUpdates() {
    PendingUpdates = [];
    try {
        const data = await githubGet("/releases/latest");
        if (!data || data.draft || data.prerelease)
            return false;

        const releaseTag = String(data.tag_name ?? "").replace(/^v/i, "");
        if (releaseTag && !newerVersion(releaseTag, HYPER_VERSION)) {
            return false;
        }

        const hash = data.name?.slice(data.name.lastIndexOf(" ") + 1);
        if (hash === gitHash || data.name?.includes(gitHash) || (data.target_commitish && data.target_commitish.slice(0, 7) === gitHash))
            return false;

        data.assets?.forEach(({ name, browser_download_url }: { name: string; browser_download_url: string; }) => {
            if (VENCORD_FILES.some(s => name.startsWith(s))) {
                PendingUpdates.push([name, browser_download_url]);
            }
        });

        return PendingUpdates.length > 0;
    } catch {
        return false;
    }
}

async function applyUpdates() {
    const fileContents = await Promise.all(PendingUpdates.map(async ([name, url]) => {
        const contents = await fetchBuffer(url);
        return [join(__dirname, name), contents] as const;
    }));

    await Promise.all(fileContents.map(async ([filename, contents]) =>
        writeFile(filename, contents))
    );

    PendingUpdates = [];
    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));
