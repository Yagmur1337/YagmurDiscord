/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const owners = new Set<object>();
export function claimYagmurMelekMicrophone(owner: object) {
    if (owners.size && !owners.has(owner)) throw Error("Mikrofon başka bir YagmurMelekDc ses aracında açık. Önce YagmurMelekDeck mikrofon karışımını veya YagmurMelekVoice efektini kapat.");
    owners.add(owner);
}
export function releaseYagmurMelekMicrophone(owner: object) { owners.delete(owner); }
