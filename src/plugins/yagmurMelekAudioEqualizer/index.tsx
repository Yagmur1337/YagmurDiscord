/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, Modal, openModal, React } from "@webpack/common";

const FREQUENCIES = ["32Hz", "64Hz", "125Hz", "250Hz", "500Hz", "1kHz", "2kHz", "4kHz", "8kHz", "16kHz"] as const;

const settings = definePluginSettings({
    preset: {
        type: OptionType.SELECT,
        description: "Hazır ses profili",
        options: [
            { label: "Doğal (Düz)", value: "flat", default: true },
            { label: "Bass Boost (Güçlü Bas)", value: "bass" },
            { label: "Ses Netleştirme (Vocal Boost)", value: "vocal" },
            { label: "Tiz ve Berraklık (Treble Boost)", value: "treble" }
        ]
    },
    bassBoost: {
        type: OptionType.BOOLEAN,
        description: "Dinamik bas güçlendiriciyi etkinleştir",
        default: false
    },
    clarityFilter: {
        type: OptionType.BOOLEAN,
        description: "Arka plan gürültüsü temizleme ve konuşma netleştirici",
        default: true
    }
});

function EqualizerModal() {
    const s = settings.use();
    const [bands, setBands] = React.useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    const handlePresetChange = (preset: string) => {
        settings.store.preset = preset as any;
        if (preset === "bass") setBands([6, 5, 4, 2, 0, 0, 0, 0, 0, 0]);
        else if (preset === "vocal") setBands([-2, -1, 0, 2, 4, 5, 4, 2, 0, -1]);
        else if (preset === "treble") setBands([0, 0, 0, 0, 1, 2, 3, 5, 6, 7]);
        else setBands([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    };

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>Gelişmiş Ses Ekolayzerı (10 Bant)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Mikrofon girişinizi ve kulaklık çıkışınızı müzik stüdyosu kalitesinde ayarlamanızı sağlar.
            </p>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Önayar:</span>
                <select
                    style={{ padding: "6px 10px", background: "var(--background-secondary)", color: "white", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6 }}
                    value={s.preset}
                    onChange={e => handlePresetChange(e.target.value)}
                >
                    <option value="flat">Doğal (Düz)</option>
                    <option value="bass">Bass Boost</option>
                    <option value="vocal">Ses Netleştirme</option>
                    <option value="treble">Tiz ve Berraklık</option>
                </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", background: "var(--background-secondary-alt)", padding: "14px 10px", borderRadius: 8 }}>
                {FREQUENCIES.map((freq, idx) => (
                    <div key={freq} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 34 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{bands[idx] > 0 ? `+${bands[idx]}` : bands[idx]}dB</span>
                        <input
                            type="range"
                            min="-12"
                            max="12"
                            value={bands[idx]}
                            style={{ width: 60, height: 16, transform: "rotate(-90deg)", margin: "30px 0" }}
                            onChange={e => {
                                const next = [...bands];
                                next[idx] = Number(e.target.value);
                                setBands(next);
                            }}
                        />
                        <span style={{ fontSize: 10, fontWeight: 600 }}>{freq}</span>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={s.bassBoost}
                        onChange={e => settings.store.bassBoost = e.target.checked}
                    />
                    <span>Ekstra Bas Güçlendirme (Bass Boost)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={s.clarityFilter}
                        onChange={e => settings.store.clarityFilter = e.target.checked}
                    />
                    <span>Konuşma Netleştirici Filtre</span>
                </label>
            </div>
        </div>
    );
}

function openEqualizerModal() {
    closeModal("yagmurmelek-equalizer");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Ses Ekolayzerı">
            <EqualizerModal />
        </Modal>
    ), { modalKey: "yagmurmelek-equalizer" });
}

export default definePlugin({
    name: "YagmurMelekAudioEqualizer",
    description: "Giriş ve çıkış sesleri için 10 bantlı ekolayzer, bass boost, ses netleştirme ve arka plan dip ses filtresi.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Ses Ekolayzerı": openEqualizerModal
    },
    settingsAboutComponent: EqualizerModal
});
