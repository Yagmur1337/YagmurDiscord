/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 YagmurMelek and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip } from "@webpack/common";

const VERIFIED_BADGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAYNJREFUeNrdVztuhTAQ9BE4AkfIEbhBuAFPSvh0uE0VHyAFVVook4qIHIAjUL/KF4hElXqCIyvWk813gSIjjZCQvbNi1ruGjSLGhaVoBxYsQ8BOR4J6IG6oEoqRD7xjhyNGb8SdlDrJiGXw2a54RKBEVrJjKcrhGTIOj/r5+YYEbLsSiE31ozdjL2o762X1c4FHFpyn1HZFNP/p7FzVX5yWgNKykKCjBg5fAdEA/tP0OrtAM/hU8edP/KG9Tq91tl+iuIXJY2ohQbWnuGgm93BXAvIkcVj9QL1wLVSFlL8BUUkQtykX+y+/oKHEiOLG/4+Z8WvYf0PDJEER14wWj1/+DgvtlSQOddxXtV8V3IAm7vY/gZjbKBqiuPG/3Dx+RUMQNwnck8avaAjiikrvBg8I1wYJXgi3pH8wfgnMEIx1wNr0gcPYL7uOx8jnTwXd/3lweL8JpSh2sokzEjL42q5qy9je/XdOBRyYL6wfyQ6FmSdCee1sv6eCw9MNrtL1E40t/QFUOBpHuH2XuQAAAABJRU5ErkJggg==";

const DEFAULT_VERIFIED_IDS = [
    "93533861408944128",
    "1413093537444135052"
];

const settings = definePluginSettings({
    extraUserIds: {
        description: "Ek Doğrulanmış Kullanıcı Kimlikleri (Virgülle ayırarak girin)",
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
    dependencies: ["MessageDecorationsAPI", "MemberListDecoratorsAPI"],
    settings,

    start() {
        addProfileBadge(verifiedProfileBadge);

        addMessageDecoration("ym-verified-badge", props => {
            if (!settings.store.showInChat) return null;
            const authorId = props.message?.author?.id;
            if (isVerifiedUser(authorId)) {
                return renderBadge("chat-" + (props.message?.id || authorId));
            }
            return null;
        });

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
        removeMessageDecoration("ym-verified-badge");
        removeMemberListDecorator("ym-verified-badge");
    }
});
