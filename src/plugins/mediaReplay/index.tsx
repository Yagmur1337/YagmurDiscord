/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip } from "@webpack/common";

const settings = definePluginSettings({
    autoReplay: {
        description: "Medyalar (video/mp4, ses/mp3) bitince otomatik en baştan başlat (Replay / Döngü)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    showButton: {
        description: "Medya kontrollerine Replay (döngü) aç/kapa düğmesi ekle",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
});

function RepeatIcon({ active }: { active: boolean; }) {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={active ? "2.5" : "2"}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
    );
}

function findMediaElement(target: HTMLElement | null): HTMLMediaElement | null {
    if (!target) return null;
    const parentContainer = target.closest("[class*='mediaBar']")?.parentElement
        || target.closest("[class*='mediaPlayer']")
        || target.closest("[class*='wrapper-']")
        || target.parentElement?.parentElement;
    return (parentContainer?.querySelector("video, audio") as HTMLMediaElement) || null;
}

function ReplayButtonComponent() {
    const { autoReplay, showButton } = settings.use(["autoReplay", "showButton"]);
    const ref = React.useRef<HTMLDivElement>(null);
    const [isLooping, setIsLooping] = React.useState<boolean>(autoReplay);

    React.useEffect(() => {
        const el = ref.current;
        const media = findMediaElement(el);
        if (!media) return;

        // Apply default setting if not explicitly changed by user
        if ((media as any).__vc_loop_set === undefined) {
            media.loop = autoReplay;
            (media as any).__vc_loop_set = true;
        }

        setIsLooping(media.loop);

        const onPlay = () => setIsLooping(media.loop);
        const onEnded = () => {
            if (media.loop) {
                media.currentTime = 0;
                media.play().catch(() => {});
            }
        };

        media.addEventListener("play", onPlay);
        media.addEventListener("ended", onEnded);

        return () => {
            media.removeEventListener("play", onPlay);
            media.removeEventListener("ended", onEnded);
        };
    }, [autoReplay]);

    if (!showButton) return null;

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const media = findMediaElement(ref.current);
        if (!media) return;

        const next = !media.loop;
        media.loop = next;
        (media as any).__vc_loop_set = true;
        setIsLooping(next);

        // If currently stopped at the end and toggled on, immediately restart and play
        if (next && (media.ended || media.currentTime >= (media.duration - 0.2))) {
            media.currentTime = 0;
            media.play().catch(() => {});
        }
    };

    return (
        <Tooltip text={isLooping ? "Replay: Açık (Otomatik Döngü)" : "Replay: Kapalı"}>
            {tooltipProps => (
                <div
                    {...tooltipProps}
                    ref={ref}
                    role="button"
                    tabIndex={0}
                    className={`vc-replay-button ${isLooping ? "active" : ""}`}
                    onClick={toggle}
                >
                    <RepeatIcon active={isLooping} />
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "MediaReplay",
    description: "Videolar (mp4) ve ses dosyaları (mp3) bitince otomatik en baştan başlatır. Medya çubuğuna Replay aç/kapa düğmesi ekler.",
    authors: [{ name: "YagmurMelek DC", id: 0n }],
    tags: ["Media", "Utility"],
    enabledByDefault: true,
    settings,
    patches: [
        {
            find: '["VIDEO","CLIP","AUDIO"]',
            replacement: {
                match: /(\[\i>0&&\i\.length>0.{0,150}?children:)(\i.slice\(\i\))(?<=showDownload:(\i).+?isVisualMediaType:(\i).+?)/,
                replace: (_, rest, origChildren, showDownload) => `${rest}[${showDownload}&&$self.ReplayButton(),...${origChildren}]`,
            },
        },
        {
            find: "}renderPlayIcon(){",
            replacement: [
                {
                    match: /this\.renderAudio\(\):this\.renderVideo\(\)/,
                    replace: "$&,$self.handleMediaPlayer(this)",
                },
            ],
        },
    ],

    ReplayButton: ErrorBoundary.wrap(ReplayButtonComponent, { noop: true }),

    handleMediaPlayer(player: any) {
        if (!settings.store.autoReplay || !player?.mediaRef?.current) return null;
        const media = player.mediaRef.current as HTMLMediaElement;
        if ((media as any).__vc_loop_set === undefined) {
            media.loop = true;
            (media as any).__vc_loop_set = true;
            media.addEventListener("ended", () => {
                if (media.loop) {
                    media.currentTime = 0;
                    media.play().catch(() => {});
                }
            }, { once: false });
        }
        return null;
    },
});
