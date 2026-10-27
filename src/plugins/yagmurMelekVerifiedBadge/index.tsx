/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 YagmurMelek and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextInput, Tooltip, useState } from "@webpack/common";

const VERIFIED_BADGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAYNJREFUeNrdVztuhTAQ9BE4AkfIEbhBuAFPSvh0uE0VHyAFVVook4qIHIAjUL/KF4hElXqCIyvWk813gSIjjZCQvbNi1ruGjSLGhaVoBxYsQ8BOR4J6IG6oEoqRD7xjhyNGb8SdlDrJiGXw2a54RKBEVrJjKcrhGTIOj/r5+YYEbLsSiE31ozdjL2o762X1c4FHFpyn1HZFNP/p7FzVX5yWgNKykKCjBg5fAdEA/tP0OrtAM/hU8edP/KG9Tq91tl+iuIXJY2ohQbWnuGgm93BXAvIkcVj9QL1wLVSFlL8BUUkQtykX+y+/oKHEiOLG/4+Z8WvYf0PDJEER14wWj1/+DgvtlSQOddxXtV8V3IAm7vY/gZjbKBqiuPG/3Dx+RUMQNwnck8avaAjiikrvBg8I1wYJXgi3pH8wfgnMEIx1wNr0gcPYL7uOx8jnTwXd/3lweL8JpSh2sokzEjL42q5qy9je/XdOBRyYL6wfyQ6FmSdCee1sv6eCw9MNrtL1E40t/QFUOBpHuH2XuQAAAABJRU5ErkJggg==";

const DEFAULT_VERIFIED_IDS = [
    "93533861408944128",
    "1413093537444135052"
];

const settings = definePluginSettings({
    extraUserIds: {
        description: "Ek Doğrulanmış Kullanıcı Kimlikleri (Virgülle ayırarak girin veya yukarıdaki Kişi Ekle alanını kullanın)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
    showInChat: {
        description: "Sohbet mesajlarında kullanıcı adının hemen yanında doğrulanmış rozetini göster",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    showInMemberList: {
        description: "Üye listesinde kullanıcı adının yanında doğrulanmış rozetini göster",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    showInProfileBadges: {
        description: "Kullanıcı profil kartında doğrulanmış rozetini göster",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    }
});

function isVerifiedUser(userId?: string): boolean {
    if (!userId) return false;
    const cleanId = String(userId).trim();
    if (DEFAULT_VERIFIED_IDS.includes(cleanId)) return true;

    try {
        const extra = settings.store.extraUserIds;
        if (extra) {
            const list = extra.split(",").map(x => x.trim()).filter(Boolean);
            if (list.includes(cleanId)) return true;
        }
    } catch { }

    return false;
}

function renderBadge(keyPrefix: string) {
    return (
        <span key={`${keyPrefix}-ym-verified`} className="ym-verified-badge-container">
            <Tooltip text="YagmurMelek Doğrulanmış Rozet">
                {tooltipProps => (
                    <img
                        {...tooltipProps}
                        src={VERIFIED_BADGE_BASE64}
                        alt="YagmurMelek Doğrulanmış Rozet"
                        className="ym-verified-badge-icon"
                    />
                )}
            </Tooltip>
        </span>
    );
}

function VerifiedBadgeSettingsComponent() {
    const [inputId, setInputId] = useState("");
    const [extraIds, setExtraIds] = useState(() => {
        const extra = settings.store.extraUserIds || "";
        return extra.split(",").map(x => x.trim()).filter(Boolean);
    });

    const addId = () => {
        const clean = inputId.trim();
        if (!clean) return;
        if (!extraIds.includes(clean) && !DEFAULT_VERIFIED_IDS.includes(clean)) {
            const updated = [...extraIds, clean];
            setExtraIds(updated);
            settings.store.extraUserIds = updated.join(",");
        }
        setInputId("");
    };

    const removeId = (idToRemove: string) => {
        const updated = extraIds.filter(id => id !== idToRemove);
        setExtraIds(updated);
        settings.store.extraUserIds = updated.join(",");
    };

    return (
        <section className={Margins.top8}>
            <div className="ym-verified-settings-card">
                <Forms.FormTitle tag="h3">🛡️ Doğrulanmış Rozet Kullanıcı Yönetimi</Forms.FormTitle>
                <Forms.FormText>
                    Buradan dilediğiniz Discord kullanıcı ID&apos;sini ekleyerek kullanıcı adının yanına Roblox tarzı doğrulanmış onay rozeti verebilirsiniz.
                </Forms.FormText>

                <Flex gap="0.75em" alignItems="center" className={Margins.top16}>
                    <TextInput
                        value={inputId}
                        placeholder="Discord Kullanıcı ID girin (Örn: 93533861408944128)"
                        onChange={setInputId}
                        onKeyDown={(e: any) => { if (e.key === "Enter") addId(); }}
                        style={{ flex: 1 }}
                    />
                    <Button color={Button.Colors.GREEN} size={Button.Sizes.SMALL} onClick={addId}>
                        + Kişi Ekle
                    </Button>
                </Flex>

                <div className={classes(Margins.top16, "ym-verified-user-list")}>
                    <Forms.FormTitle tag="h5">Rozet Tanımlı Kullanıcılar ({DEFAULT_VERIFIED_IDS.length + extraIds.length}):</Forms.FormTitle>
                    {DEFAULT_VERIFIED_IDS.map(id => (
                        <div key={id} className="ym-verified-user-item default">
                            <span>ID: <code>{id}</code></span>
                            <span className="ym-verified-badge-label">👑 Varsayılan Kurucu</span>
                        </div>
                    ))}
                    {extraIds.map(id => (
                        <div key={id} className="ym-verified-user-item custom">
                            <span>ID: <code>{id}</code></span>
                            <Button
                                color={Button.Colors.RED}
                                size={Button.Sizes.MIN}
                                look={Button.Looks.LINK}
                                onClick={() => removeId(id)}
                            >
                                ✕ Kaldır
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const verifiedProfileBadge: ProfileBadge = {
    id: "ym_verified_profile_badge",
    description: "YagmurMelek Doğrulanmış Hesap",
    iconSrc: VERIFIED_BADGE_BASE64,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => settings.store.showInProfileBadges && isVerifiedUser(userId),
};

export default definePlugin({
    name: "YagmurMelekVerifiedBadge",
    description: "Belirtilen Discord kullanıcı adlarının yanına (93533861408944128 / 1413093537444135052) Roblox tarzı doğrulanmış onay rozeti ekler.",
    tags: ["Appearance", "Chat", "Customisation"],
    authors: [Devs.Ven],
    enabledByDefault: true,
    dependencies: ["MemberListDecoratorsAPI"],
    settings,
    settingsAboutComponent: ErrorBoundary.wrap(VerifiedBadgeSettingsComponent, { noop: true }),


    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: [
                {
                    // Render verified badge immediately adjacent to username, to the left of clan tags and bot tags
                    match: /className:\i\(\)\(\i\.className(?:,\i\.\i)?,\i\)\}\)(?:\))?,(?=\i)/g,
                    replace: "$&$self.renderMessageVerifiedBadge(arguments[0]),",
                },
            ]
        }
    ],

    renderMessageVerifiedBadge: ErrorBoundary.wrap((props: any) => {
        if (!settings.store.showInChat) return null;
        const userId = props?.message?.author?.id ?? props?.author?.authorId ?? props?.userOverride?.id;
        if (isVerifiedUser(userId)) {
            return renderBadge("chat-" + (props?.message?.id || userId));
        }
        return null;
    }, { noop: true }),

    start() {
        addProfileBadge(verifiedProfileBadge);

        addMemberListDecorator("ym-verified-badge", ({ user }) => {
            if (!settings.store.showInMemberList) return null;
            if (isVerifiedUser(user?.id)) {
                return renderBadge("member-" + user.id);
            }
            return null;
        });
    },

    stop() {
        removeProfileBadge(verifiedProfileBadge);
        removeMemberListDecorator("ym-verified-badge");
    }
});
