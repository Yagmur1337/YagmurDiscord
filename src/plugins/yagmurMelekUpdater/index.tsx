/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import definePlugin, { PluginNative } from "@utils/types";
import { React } from "@webpack/common";

import { HYPER_VERSION } from "./version";

const native = VencordNative.pluginHelpers.YagmurMelekUpdater as PluginNative<typeof import("./native")>;
let timer: ReturnType<typeof setTimeout> | undefined;
let interval: ReturnType<typeof setInterval> | undefined;
let active = false;
let notified = "";

async function notifyUpdate() {
    if (!active) return;
    try {
        const result = await native.check();
        if (!active) return;
        if (result.rolledBack) showNotification({ title: "YagmurMelekDc", body: "Önceki sürüme geri dönüldü. Güncelleyici ayarlarını kontrol edin." });
        if (result.available && notified !== result.latest) {
            notified = result.latest;
            try {
                await native.installUpdate();
                showNotification({
                    title: "YagmurMelekDc Otomatik Güncellendi 🚀",
                    body: `${result.latest} sürümü başarıyla indirildi. Güncellemeyi uygulamak için Discord'u yeniden başlatın.`
                });
            } catch {
                showNotification({
                    title: "YagmurMelekDc Güncellemesi Hazır",
                    body: `${result.latest} sürümü yayınlandı. Eklentiler → YagmurMelekUpdater bölümünden indirebilirsiniz.`
                });
            }
        }
    } catch { /* A failed background check should not interrupt Discord. */ }
}

function Updater() {
    const [status, setStatus] = React.useState(`Yüklü sürüm: ${HYPER_VERSION}`);
    const [busy, setBusy] = React.useState(false);
    const [available, setAvailable] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    async function check() {
        setBusy(true);
        try {
            const result = await native.check();
            setAvailable(result.available); setPending(result.pending);
            setStatus(result.pending ? "Güncelleme indirildi. Discord’u yeniden başlatın." : result.available ? `${result.latest} sürümü indirilebilir.` : `YagmurMelekDc ${HYPER_VERSION} güncel.`);
        } catch (error) { setStatus(String((error as Error).message ?? error)); }
        finally { setBusy(false); }
    }
    return <div>
        <p>{status}</p>
        <button disabled={busy} onClick={() => void check()}>Güncellemeleri kontrol et</button>
        {available && !pending && <button disabled={busy} onClick={async () => {
            setBusy(true); setStatus("Güncelleme indiriliyor ve doğrulanıyor…");
            try { await native.installUpdate(); setPending(true); setStatus("Güncelleme hazır. Uygulamak için Discord’u yeniden başlatın."); }
            catch (error) { setStatus(String((error as Error).message ?? error)); }
            finally { setBusy(false); }
        }}>Güncellemeyi indir</button>}
        {pending && <button disabled={busy} onClick={() => void native.restart()}>Discord’u yeniden başlat</button>}
        <p>Ayarlar, temalar ve eklenti kayıtları korunur. Güncelleme yüklenemezse bir sonraki açılışta önceki sürüm kullanılır.</p>
    </div>;
}

export default definePlugin({
    name: "YagmurMelekUpdater",
    description: "YagmurMelekDc güncellemelerini GitHub’dan indirir. Ayarları korur ve başarısız açılışta önceki sürüme döner.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    required: true,
    settingsAboutComponent: Updater,
    start() {
        if (!IS_DISCORD_DESKTOP) return;
        active = true;
        timer = setTimeout(async () => {
            if (!active) return;
            try { await native.confirmStartup(); } catch { }
            void notifyUpdate();
        }, 20000);
        interval = setInterval(() => void notifyUpdate(), 6 * 60 * 60 * 1000);
    },
    stop() { active = false; clearTimeout(timer); clearInterval(interval); }
});
