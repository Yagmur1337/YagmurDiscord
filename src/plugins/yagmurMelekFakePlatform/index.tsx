/*
 * YagmurMelek Discord - YagmurMelekFakePlatform Eklentisi
 * Tum platform simgelerini ayni anda aktif gosterir ve YagmurMelek kullanicilarinda gorunmesi icin 3y3 steganografi ile senkronize eder.
 * (c) 2026 Yagmur1337 & Yagmures Holding
 */

import "./styles.css";

import { addProfileBadge, BadgePosition, BadgeUserArgs, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { AuthenticationStore, Button, Forms, React, showToast, TextInput, Toasts, Tooltip, UserProfileStore, UserStore, useState } from "@webpack/common";

export interface PlatformDef {
    id: string;
    label: string;
    viewBox: string;
    path: string;
    defaultColor: string;
    width?: number;
    height?: number;
}

export const PLATFORMS: PlatformDef[] = [
    {
        id: "desktop",
        label: "Masaüstü (Bilgisayar / PC)",
        viewBox: "0 0 24 24",
        path: "M4 2.5c-1.103 0-2 .897-2 2v11c0 1.104.897 2 2 2h7v2H7v2h10v-2h-4v-2h7c1.103 0 2-.896 2-2v-11c0-1.103-.897-2-2-2H4Zm16 2v9H4v-9h16Z",
        defaultColor: "#23a55a"
    },
    {
        id: "mobile",
        label: "Mobil (Telefon / iOS / Android)",
        viewBox: "0 0 1000 1500",
        path: "M 187 0 L 813 0 C 916.277 0 1000 83.723 1000 187 L 1000 1313 C 1000 1416.277 916.277 1500 813 1500 L 187 1500 C 83.723 1500 0 1416.277 0 1313 L 0 187 C 0 83.723 83.723 0 187 0 Z M 125 1000 L 875 1000 L 875 250 L 125 250 Z M 500 1125 C 430.964 1125 375 1180.964 375 1250 C 375 1319.036 430.964 1375 500 1375 C 569.036 1375 625 1319.036 625 1250 C 625 1180.964 569.036 1125 500 1125 Z",
        defaultColor: "#23a55a",
        width: 15,
        height: 15
    },
    {
        id: "web",
        label: "Web Tarayıcısı (Chrome / Edge / Firefox)",
        viewBox: "0 0 24 24",
        path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93Zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39Z",
        defaultColor: "#23a55a"
    },
    {
        id: "console",
        label: "Konsol / Oyun Cihazı (Embedded)",
        viewBox: "0 0 24 24",
        path: "M3.06 20.4q-1.53 0-2.37-1.065T.06 16.74l1.26-9q.27-1.8 1.605-2.97T6.06 3.6h11.88q1.8 0 3.135 1.17t1.605 2.97l1.26 9q.21 1.53-.63 2.595T20.94 20.4q-.63 0-1.17-.225T18.78 19.5l-2.7-2.7H7.92l-2.7 2.7q-.45.45-.99.675t-1.17.225Zm14.94-7.2q.51 0 .855-.345T19.2 12q0-.51-.345-.855T18 10.8q-.51 0-.855.345T16.8 12q0 .51.345 .855T18 13.2Zm-2.4-3.6q.51 0 .855-.345T16.8 8.4q0-.51-.345-.855T15.6 7.2q-.51 0-.855.345T14.4 8.4q0 .51.345 .855T15.6 9.6ZM6.9 13.2h1.8v-2.1h2.1v-1.8h-2.1v-2.1h-1.8v2.1h-2.1v1.8h2.1v2.1Z",
        defaultColor: "#23a55a"
    },
    {
        id: "xbox",
        label: "Xbox Konsolu",
        viewBox: "0 0 24 24",
        path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.3 15.8c-1 .6-2.1.9-3.3.9s-2.3-.3-3.3-.9c-.2-.1-.3-.4-.2-.6 1.4-2.8 3.5-5 3.5-5s2.1 2.2 3.5 5c.1.2 0 .5-.2.6zm-6.6-1.5c-1.8-1.2-3.1-3-3.6-5.1.8 1.4 2.2 3.4 4.3 4.8-.3.2-.5.3-.7.3zm9.9-5.1c-.5 2.1-1.8 3.9-3.6 5.1-.2 0-.4-.1-.7-.3 2.1-1.4 3.5-3.4 4.3-4.8zm-1.8-3.4c-1.3 1.8-3.2 4-4.8 5.7-1.6-1.7-3.5-3.9-4.8-5.7.9-.7 2-1.3 3.2-1.6 1.1-.3 2.1-.3 3.2 0 1.2.3 2.3.9 3.2 1.6z",
        defaultColor: "#107c10"
    },
    {
        id: "playstation",
        label: "PlayStation Konsolu",
        viewBox: "0 0 24 24",
        path: "M23.15 15.64c-.38-.98-1.53-1.68-3.32-2.02l-3.37-.62v-2.1c0-.98-.32-1.44-1.26-1.68-.42-.11-.84-.13-1.2-.06v3.29l2.76.51c1.39.26 1.76.77 1.89 1.12.18.49.03 1.05-.72 1.34-.7.27-1.75.24-2.93-.07v1.81c1.3.36 2.5.47 3.44.33 1.48-.22 2.76-.87 3.24-1.72.33-.58.33-1.29-.02-1.92l.09.07zM.85 15.64c.38-.98 1.53-1.68 3.32-2.02l3.37-.62v-2.1c0-.98.32-1.44 1.26-1.68.42-.11.84-.13 1.2-.06v3.29l-2.76.51c-1.39.26-1.76.77-1.89 1.12-.18.49-.03 1.05.72 1.34.7.27 1.75.24 2.93-.07v1.81c-1.3.36-2.5.47-3.44.33-1.48-.22-2.76-.87-3.24-1.72-.33-.58-.33-1.29.02-1.92l-.09.07zM10.8 2.1v9.84l2.4.44V6.21c1.23.41 1.95 1.22 1.95 2.51 0 1.48-.96 2.56-2.4 2.94v2.01c2.61-.43 4.41-2.2 4.41-4.75 0-2.24-1.38-3.95-3.56-4.64l-2.8-.98z",
        defaultColor: "#0070d1"
    },
    {
        id: "switch",
        label: "Nintendo Switch Konsolu",
        viewBox: "0 0 24 24",
        path: "M7.5 4C4.46 4 2 6.46 2 9.5v5C2 17.54 4.46 20 7.5 20h2V4h-2zm-1 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm1 6.5h-2v-2h2v2zm7-12v16h2c3.04 0 5.5-2.46 5.5-5.5v-5c0-3.04-2.46-5.5-5.5-5.5h-2zm4.5 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-2.5-4.5h-2v-2h2v2z",
        defaultColor: "#e60012"
    },
    {
        id: "vr",
        label: "VR Sanal Gerçeklik Başlığı (Quest / SteamVR)",
        viewBox: "0 4 24 16",
        path: "M8.46 8.64a1 1 0 0 1 1 1c0 .44-.3.8-.72.92l-.11.07c-.08.06-.2.19-.2.41a.99.99 0 0 1-.98.86h-.06a1 1 0 0 1-.94-1.05l.02-.32c.05-1.06.92-1.9 1.99-1.9ZM15.55 5a5.5 5.5 0 0 1 5.15 3.67h.3a2 2 0 0 1 2 2v3.18a2 2 0 0 1-2 1.99h-.2A4.54 4.54 0 0 1 16.55 19a4.45 4.45 0 0 1-3.6-1.83 1.2 1.2 0 0 0-1.9 0 4.44 4.44 0 0 1-3.9 1.82 4.54 4.54 0 0 1-3.94-3.15H3a2 2 0 0 1-2-2v-3.18c0-1.1.9-1.99 2-1.99h.3A5.5 5.5 0 0 1 8.46 5h7.09Zm-7.1 2C6.6 7 5.06 8.5 4.97 10.41l-.02.66v3.18c0 1.43 1.05 2.66 2.34 2.74.85.06 1.63-.32 2.14-1.01a3.2 3.2 0 0 1 2.57-1.3c1 0 1.97.48 2.57 1.3.5.69 1.3 1.08 2.14 1.01 1.3-.08 2.34-1.31 2.34-2.74l-.02-3.84a3.54 3.54 0 0 0-3.49-3.43H8.45Z",
        defaultColor: "#9333ea"
    }
];

export function encodePlatform3y3(platforms: string[]): string {
    const payload = `[ymfp:${platforms.join(",")}]`;
    return " " + Array.from(payload)
        .map(x => x.codePointAt(0))
        .filter(x => x! >= 0x20 && x! <= 0x7f)
        .map(x => String.fromCodePoint(x! + 0xe0000))
        .join("");
}

export function decodePlatform3y3(bio?: string): string[] | null {
    if (!bio) return null;
    const tagChars = Array.from(bio).filter(c => {
        const cp = c.codePointAt(0)!;
        return cp >= 0xe0020 && cp <= 0xe007f;
    });
    if (tagChars.length === 0) return null;
    const decodedStr = tagChars.map(c => String.fromCodePoint(c.codePointAt(0)! - 0xe0000)).join("");
    const match = decodedStr.match(/\[ymfp:([a-zA-Z0-9,]+)\]/);
    if (!match) return null;
    return match[1].split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function stripPlatform3y3(bio?: string): string {
    if (!bio) return "";
    return bio.replace(/\s*\[ymfp:[^\]]+\]/g, "").replace(/\s*[\u{e0000}-\u{e007f}]+\s*/gu, " ").trim();
}

const settings = definePluginSettings({
    showInMemberList: {
        type: OptionType.BOOLEAN,
        description: "Üye listesinde göster",
        default: true,
        restartNeeded: true
    },
    showInMessages: {
        type: OptionType.BOOLEAN,
        description: "Mesaj kutusunda (sohbet içi) göster",
        default: true,
        restartNeeded: true
    },
    showInProfileBadges: {
        type: OptionType.BOOLEAN,
        description: "Kullanıcı profil rozetlerinde göster",
        default: true,
        restartNeeded: true
    },
    activePlatforms: {
        type: OptionType.STRING,
        description: "Aktif Fake Platformlar (desktop,mobile,web,console,xbox,playstation,switch,vr)",
        default: "desktop,mobile,web,console,xbox,playstation,switch,vr",
        restartNeeded: false
    },
    extraUserIds: {
        type: OptionType.STRING,
        description: "Fake platform atanacak ek kullanıcı ID'leri (Virgülle ayırarak girin)",
        default: "",
        restartNeeded: false
    }
});

function getActivePlatformsForUser(userId?: string): string[] {
    if (!userId) return [];
    const currentUserId = AuthenticationStore.getId();

    // 1. Check if user is self
    if (userId === currentUserId) {
        const configured = (settings.store.activePlatforms || "")
            .split(",")
            .map(x => x.trim().toLowerCase())
            .filter(Boolean);
        return configured.length ? configured : PLATFORMS.map(p => p.id);
    }

    // 2. Check if user is in extraUserIds
    const extraIds = (settings.store.extraUserIds || "")
        .split(/[,\s]+/)
        .map(id => id.trim())
        .filter(Boolean);
    if (extraIds.includes(userId)) {
        return (settings.store.activePlatforms || "")
            .split(",")
            .map(x => x.trim().toLowerCase())
            .filter(Boolean);
    }

    // 3. Check 3y3 steganography from user profile bio (everyone using YagmurMelek DC will see this!)
    try {
        const profile = UserProfileStore.getUserProfile(userId);
        if (profile?.bio) {
            const decoded = decodePlatform3y3(profile.bio);
            if (decoded && decoded.length) return decoded;
        }
    } catch { }

    return [];
}

function RenderPlatformIcons({ platforms, small }: { platforms: string[]; small: boolean; }) {
    if (!platforms.length) return null;

    const iconSize = small ? 14 : 18;

    return (
        <span className="ym-fake-platform-container">
            {platforms.map(pId => {
                const def = PLATFORMS.find(p => p.id === pId);
                if (!def) return null;
                return (
                    <Tooltip key={pId} text={def.label}>
                        {tooltipProps => (
                            <span {...tooltipProps} className="ym-fake-platform-icon">
                                <svg
                                    width={def.width ?? iconSize}
                                    height={def.height ?? iconSize}
                                    viewBox={def.viewBox}
                                    fill={def.defaultColor}
                                >
                                    <path d={def.path} />
                                </svg>
                            </span>
                        )}
                    </Tooltip>
                );
            })}
        </span>
    );
}

function renderPlatformsForUser(user: User, small: boolean) {
    if (!user || user.bot) return null;
    const platforms = getActivePlatformsForUser(user.id);
    if (!platforms.length) return null;
    return <RenderPlatformIcons platforms={platforms} small={small} />;
}

function getBadges({ userId }: BadgeUserArgs): ProfileBadge[] {
    const user = UserStore.getUser(userId);
    if (!user || user.bot) return [];

    const platforms = getActivePlatformsForUser(user.id);
    if (!platforms.length) return [];

    return platforms.map(pId => {
        const def = PLATFORMS.find(p => p.id === pId);
        if (!def) return null as any;
        return {
            key: `ym-fake-platform-badge-${pId}`,
            id: `ym-fake-platform-badge-${pId}`,
            component: () => (
                <span className="vc-platform-indicator" style={{ display: "inline-flex", verticalAlign: "middle" }}>
                    <Tooltip text={def.label}>
                        {tooltipProps => (
                            <svg
                                {...tooltipProps}
                                width={18}
                                height={18}
                                viewBox={def.viewBox}
                                fill={def.defaultColor}
                            >
                                <path d={def.path} />
                            </svg>
                        )}
                    </Tooltip>
                </span>
            )
        };
    }).filter(Boolean);
}

const fakePlatformBadge: ProfileBadge = {
    id: "ym_fake_platform_badge_wrapper",
    getBadges,
    position: BadgePosition.START
};

function FakePlatformSettingsComponent() {
    const [activeStr, setActiveStr] = useState(() => settings.store.activePlatforms || "desktop,mobile,web,console,xbox,playstation,switch,vr");
    const [extraIds, setExtraIds] = useState(() => settings.store.extraUserIds || "");
    const [syncing, setSyncing] = useState(false);

    const activeList = activeStr.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);

    const togglePlatform = (id: string) => {
        let updated: string[];
        if (activeList.includes(id)) {
            updated = activeList.filter(x => x !== id);
        } else {
            updated = [...activeList, id];
        }
        const str = updated.join(",");
        setActiveStr(str);
        settings.store.activePlatforms = str;
    };

    const toggleAll = () => {
        if (activeList.length === PLATFORMS.length) {
            setActiveStr("");
            settings.store.activePlatforms = "";
        } else {
            const all = PLATFORMS.map(p => p.id).join(",");
            setActiveStr(all);
            settings.store.activePlatforms = all;
        }
    };

    const syncToDiscordBio = async () => {
        setSyncing(true);
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) throw Error("Kullanıcı bulunamadı.");

            const profile = UserProfileStore.getUserProfile(currentUser.id);
            let currentBio = profile?.bio || "";

            // Strip existing 3y3 platform tag
            currentBio = stripPlatform3y3(currentBio);

            // Append new 3y3 platform tag
            const tag = encodePlatform3y3(activeList);
            const newBio = (currentBio + tag).trim();

            const actionMod = ((window as any).Vencord?.Webpack?.wreq?.("207803") as any);
            if (actionMod?.gi) {
                await actionMod.gi({ bio: newBio });
                showToast("✨ Fake platformlar başarıyla Discord profilinize senkronize edildi! Diğer tüm YagmurMelek kullanıcıları profilinizde bu simgeleri görecek.", Toasts.Type.SUCCESS);
            } else {
                showToast("Discord profil API'sine erişilemedi. Lütfen ayarları kontrol edin.", Toasts.Type.FAILURE);
            }
        } catch (err: any) {
            console.error("[YagmurMelekFakePlatform] Sync error:", err);
            showToast("Senkronizasyon hatası: " + (err?.message || "Bilinmeyen hata"), Toasts.Type.FAILURE);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <section className={Margins.top8}>
            <div className="ym-fake-platform-card">
                <Forms.FormTitle tag="h3">🎮 YagmurMelek Fake Platform Yönetimi</Forms.FormTitle>
                <Forms.FormText>
                    Bu eklenti ile hesabınızı aynı anda Masaüstü, Mobil, Web, Konsol, Xbox, PlayStation, Switch ve VR platformlarında aktif gösterebilirsiniz.
                </Forms.FormText>

                <Flex gap="0.75em" alignItems="center" className={Margins.top12}>
                    <Button
                        color={activeList.length === PLATFORMS.length ? Button.Colors.RED : Button.Colors.GREEN}
                        size={Button.Sizes.SMALL}
                        onClick={toggleAll}
                    >
                        {activeList.length === PLATFORMS.length ? "Tümünü Kapat" : "Tüm Platformları Aktif Et"}
                    </Button>

                    <Button
                        className="ym-fake-sync-btn"
                        size={Button.Sizes.SMALL}
                        disabled={syncing}
                        onClick={syncToDiscordBio}
                    >
                        {syncing ? "Senkronize Ediliyor..." : "🚀 Profilime Senkronize Et (Diğer Kullanıcılarda Görünsün)"}
                    </Button>
                </Flex>

                <Forms.FormTitle tag="h5" className={Margins.top16}>Platform Seçimi ({activeList.length}/{PLATFORMS.length}):</Forms.FormTitle>
                <div className="ym-fake-platform-grid">
                    {PLATFORMS.map(p => {
                        const isChecked = activeList.includes(p.id);
                        return (
                            <div
                                key={p.id}
                                className={classes("ym-fake-platform-item", isChecked ? "active" : "")}
                                style={{
                                    cursor: "pointer",
                                    borderLeft: `4px solid ${isChecked ? p.defaultColor : "var(--background-modifier-accent)"}`,
                                    opacity: isChecked ? 1 : 0.6
                                }}
                                onClick={() => togglePlatform(p.id)}
                            >
                                <svg width={20} height={20} viewBox={p.viewBox} fill={p.defaultColor}>
                                    <path d={p.path} />
                                </svg>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{p.label}</div>
                                    <div style={{ fontSize: "11px", color: isChecked ? "#10b981" : "var(--text-muted)" }}>
                                        {isChecked ? "● Aktif" : "○ Kapalı"}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={Margins.top16}>
                    <Forms.FormTitle tag="h5">Ek Kullanıcı ID&apos;leri (Arkadaşlarınızın da çoklu görünmesi için):</Forms.FormTitle>
                    <TextInput
                        value={extraIds}
                        placeholder="Örn: 93533861408944128, 1413093537444135052"
                        onChange={val => {
                            setExtraIds(val);
                            settings.store.extraUserIds = val;
                        }}
                    />
                </div>
            </div>
        </section>
    );
}

export default definePlugin({
    name: "YagmurMelekFakePlatform",
    description: "Tüm platform simgelerini (Masaüstü, Mobil, Web, Konsol, Xbox, PlayStation, Switch, VR) aynı anda online gösterir ve YagmurMelek kullanıcılarında görünmesi için profille senkronize eder.",
    tags: ["Appearance"],
    authors: [Devs.kemo, Devs.Ven, { name: "Yagmur1337", id: 93533861408944128n }],
    dependencies: ["MessageDecorationsAPI", "MemberListDecoratorsAPI"],
    settings,
    enabledByDefault: false, // Kullanıcı isteği: varsayılan olarak kapalı gelsin!
    settingsAboutComponent: ErrorBoundary.wrap(FakePlatformSettingsComponent, { noop: true }),

    start() {
        if (settings.store.showInMemberList) {
            addMemberListDecorator("ym-fake-platform", ({ user }) => renderPlatformsForUser(user, true));
        }
        if (settings.store.showInProfileBadges) {
            addProfileBadge(fakePlatformBadge);
        }
        if (settings.store.showInMessages) {
            addMessageDecoration("ym-fake-platform", props => renderPlatformsForUser(props.message?.author, false));
        }
    },

    stop() {
        removeMemberListDecorator("ym-fake-platform");
        removeProfileBadge(fakePlatformBadge);
        removeMessageDecoration("ym-fake-platform");
    }
});
