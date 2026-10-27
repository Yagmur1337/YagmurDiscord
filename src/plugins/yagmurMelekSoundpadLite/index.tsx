/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, Modal, openModal, React } from "@webpack/common";

const settings = definePluginSettings({
    volume: {
        type: OptionType.NUMBER,
        description: "Soundpad ses seviyesi (0.1 - 1.0)",
        default: 0.8
    },
    enableHotkeys: {
        type: OptionType.BOOLEAN,
        description: "Alt + 1-6 tuşlarıyla hızlı ses çalmayı etkinleştir",
        default: true
    }
});

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx || audioCtx.state === "closed") {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

// Built-in synthetic audio effects that never fail to play offline
function playAirhorn() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const vol = ctx.createGain();
    vol.gain.setValueAtTime((settings.store.volume || 0.8) * 0.4, now);
    vol.connect(ctx.destination);

    [466.16, 466.16, 466.16, 466.16, 622.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        osc.connect(vol);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.1);
    });
}

function playBuzzer() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    gain.gain.setValueAtTime(settings.store.volume || 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
}

function playCoin() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.08);
    gain.gain.setValueAtTime((settings.store.volume || 0.8) * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
}

function playLevelUp() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime((settings.store.volume || 0.8) * 0.5, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.2);
    });
}

function playLaser() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
    gain.gain.setValueAtTime(settings.store.volume || 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
}

function playBassDrop() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    gain.gain.setValueAtTime(settings.store.volume || 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
}

const SOUNDS = [
    { id: 1, name: "Airhorn (Korna)", fn: playAirhorn, color: "#f23f43" },
    { id: 2, name: "Hata / Buzzer", fn: playBuzzer, color: "#f0b232" },
    { id: 3, name: "Mario / Coin", fn: playCoin, color: "#23a55a" },
    { id: 4, name: "Level Up / Zafer", fn: playLevelUp, color: "#5865f2" },
    { id: 5, name: "Lazer / Pew Pew", fn: playLaser, color: "#eb459e" },
    { id: 6, name: "Bass Drop / Patlama", fn: playBassDrop, color: "#9b59b6" }
];

function SoundpadModal() {
    const s = settings.use();

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, color: "#5865f2" }}>Dahili Soundpad Paneli (Soundpad Lite)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Harici Soundpad programına gerek olmadan, klavye kısayollarıyla (Alt + 1-6) ses efektleri çalın.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {SOUNDS.map(sound => (
                    <button
                        key={sound.id}
                        style={{
                            background: "var(--background-secondary)",
                            border: `2px solid ${sound.color}`,
                            borderRadius: 8,
                            padding: "16px 10px",
                            color: "white",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 6,
                            transition: "transform 0.1s"
                        }}
                        onClick={() => sound.fn()}
                    >
                        <span style={{ fontSize: 16, fontWeight: 700, color: sound.color }}>[Alt + {sound.id}]</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{sound.name}</span>
                    </button>
                ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Ses Seviyesi:</span>
                <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={s.volume}
                    onChange={e => settings.store.volume = Number(e.target.value)}
                    style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{Math.round(s.volume * 100)}%</span>
            </div>
        </div>
    );
}

function openSoundpadModal() {
    closeModal("yagmurmelek-soundpad");
    openModal(props => (
        <Modal {...props} title="YagmurMelekDc · Soundpad Lite">
            <SoundpadModal />
        </Modal>
    ), { modalKey: "yagmurmelek-soundpad" });
}

function handleGlobalKey(e: KeyboardEvent) {
    if (!settings.store.enableHotkeys) return;
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 6) {
            e.preventDefault();
            SOUNDS[num - 1]?.fn();
        }
    }
}

export default definePlugin({
    name: "YagmurMelekSoundpadLite",
    description: "Harici Soundpad programına gerek kalmadan, klavye kısayoluyla ses efektleri veya tonlar çalmanızı sağlar.",
    authors: [{ name: "YagmurMelekDc", id: 0n }],
    enabledByDefault: false,
    settings,
    toolboxActions: {
        "YagmurMelekDc · Dahili Soundpad": openSoundpadModal
    },
    settingsAboutComponent: SoundpadModal,

    start() {
        window.addEventListener("keydown", handleGlobalKey);
    },

    stop() {
        window.removeEventListener("keydown", handleGlobalKey);
        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }
    }
});
