/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 YagmurMelek and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ColorPicker, FluxDispatcher, Forms, React, RestAPI, showToast, Text, TextInput, Toasts, UserProfileStore, UserStore, useState } from "@webpack/common";

export interface Decoded3y3 {
    colors?: [number, number];
    banner?: string;
}

export function encode3y3(primary: number, accent: number, bannerUrl?: string): string {
    let message = `[#${primary.toString(16).padStart(6, "0")},#${accent.toString(16).padStart(6, "0")}`;
    if (bannerUrl && (bannerUrl.startsWith("http://") || bannerUrl.startsWith("https://"))) {
        message += `,${bannerUrl.trim()}`;
    }
    message += "]";

    const encoded = Array.from(message)
        .map(x => x.codePointAt(0))
        .filter(x => x! >= 0x20 && x! <= 0x7f)
        .map(x => String.fromCodePoint(x! + 0xe0000))
        .join("");

    return " " + encoded;
}

export function decode3y3(bio?: string): Decoded3y3 | null {
    if (!bio) return null;

    const tagChars = Array.from(bio).filter(c => {
        const cp = c.codePointAt(0)!;
        return cp >= 0xe0020 && cp <= 0xe007f;
    });
    if (tagChars.length === 0) return null;

    const decodedStr = tagChars.map(c => String.fromCodePoint(c.codePointAt(0)! - 0xe0000)).join("");
    const match = decodedStr.match(/\[#([0-9a-fA-F]{1,6}),#([0-9a-fA-F]{1,6})(?:,([^\s\]]+))?\]/);
    if (!match) return null;

    const primary = parseInt(match[1], 16);
    const accent = parseInt(match[2], 16);
    const banner = match[3] && (match[3].startsWith("http://") || match[3].startsWith("https://")) ? match[3] : undefined;

    return {
        colors: [primary, accent],
        banner
    };
}

export function strip3y3(bio?: string): string {
    if (!bio) return "";
    return bio.replace(/\s*[\u{e0000}-\u{e007f}]+\s*/gu, " ").trim();
}

const settings = definePluginSettings({
    auto3y3ProfileColors: {
        description: "Profil ekranından seçilen renkleri ve afişi otomatik 3y3 kodu olarak Bio'ya kaydet (Diğer YagmurMelek kullanıcıları da görür)",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false,
    },
    customBanner: {
        description: "Özel Profil Afişi Bağlantısı (URL veya base64 görsel)",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
    primaryColor: {
        description: "Varsayılan Birincil Profil Rengi",
        type: OptionType.NUMBER,
        default: 0,
        restartNeeded: false,
    },
    accentColor: {
        description: "Varsayılan İkincil Profil Rengi",
        type: OptionType.NUMBER,
        default: 0,
        restartNeeded: false,
    },
    profileEffectId: {
        description: "Özel Profil Efekti Kimliği",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
    avatarDecorationSkuId: {
        description: "Özel Avatar Çerçevesi SKU ID",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
});

function SettingsAboutComponent() {
    const currentUser = UserStore.getCurrentUser();
    const currentBio = UserProfileStore.getUserProfile(currentUser?.id ?? "")?.bio ?? "";
    const detected3y3 = decode3y3(currentBio);
    const detectedColors = detected3y3?.colors ?? [settings.store.primaryColor, settings.store.accentColor];

    const [primary, setPrimary] = useState(detectedColors[0] || 0);
    const [accent, setAccent] = useState(detectedColors[1] || 0);
    const [bannerUrl, setBannerUrl] = useState(detected3y3?.banner || settings.store.customBanner || "");

    return (
        <section className={Margins.top8}>
            <div className="ym-nitro-settings-card">
                <Forms.FormTitle tag="h3">⚡ YagmurMelekNitroEffects Hakkında</Forms.FormTitle>
                <Forms.FormText>
                    Bu eklenti ile <strong>Discord Ayarları &rarr; Profiller</strong> bölümünden
                    renkleri ve afişi doğrudan seçebilirsiniz.
                </Forms.FormText>
                <Forms.FormText className={Margins.top8}>
                    <ul>
                        <li>
                            <strong>Doğrudan Profil Düzenleme:</strong> Profil ekranında renklerinizi ve afişinizi seçip
                            &quot;Değişiklikleri Kaydet&quot; dediğinizde değişiklikler otomatik olarak Bio&apos;nuza 3y3 görünmez
                            koduyla işlenir. Diğer YagmurMelek Discord kullanıcıları da afişinizi ve renklerinizi görür.
                        </li>
                        <li>
                            <strong>Afiş Desteği:</strong> Profil afişinizi doğrudan seçebilir veya aşağıya bir görsel URL&apos;si
                            yapıştırabilirsiniz.
                        </li>
                    </ul>
                </Forms.FormText>

                <Divider className={classes(Margins.top16, Margins.bottom16)} />

                <Forms.FormTitle tag="h3">🎨 Profil Renkleri</Forms.FormTitle>
                <Flex gap="1.5em" alignItems="center" className={Margins.top8}>
                    <ColorPicker
                        color={primary}
                        label={<Text variant="text-xs/normal" style={{ marginTop: "4px" }}>Birincil Renk</Text>}
                        onChange={(c: number) => {
                            setPrimary(c);
                            settings.store.primaryColor = c;
                        }}
                    />
                    <ColorPicker
                        color={accent}
                        label={<Text variant="text-xs/normal" style={{ marginTop: "4px" }}>Vurgu Rengi</Text>}
                        onChange={(c: number) => {
                            setAccent(c);
                            settings.store.accentColor = c;
                        }}
                    />
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.SMALL}
                        onClick={() => {
                            const enc = encode3y3(primary, accent, bannerUrl.startsWith("http") ? bannerUrl : undefined);
                            copyWithToast(enc);
                        }}
                    >
                        3y3 Kodunu Kopyala
                    </Button>
                </Flex>

                <Divider className={classes(Margins.top16, Margins.bottom16)} />

                <Forms.FormTitle tag="h3">🖼️ Özel Profil Afişi (Banner URL)</Forms.FormTitle>
                <TextInput
                    value={bannerUrl}
                    placeholder="https://i.imgur.com/example.png"
                    onChange={(val: string) => {
                        setBannerUrl(val);
                        settings.store.customBanner = val;
                    }}
                    className={Margins.top8}
                />
                <Forms.FormText className={Margins.top8}>
                    Buraya girdiğiniz doğrudan görsel bağlantısı (PNG/GIF/WebP) profilinizde afiş olarak gösterilir ve diğer YagmurMelek kullanıcılarına aktarılır.
                </Forms.FormText>

                {bannerUrl && (
                    <div className={Margins.top8}>
                        <img src={bannerUrl} alt="Afiş Önizleme" className="ym-nitro-banner-preview" />
                    </div>
                )}
            </div>
        </section>
    );
}

export default definePlugin({
    name: "YagmurMelekNitroEffects",
    description: "Profil rengi, afiş ve efektleri Nitro gerekmeden doğrudan Discord Profil Düzenleme ekranından ayarlamanızı sağlar (otomatik 3y3 senkronizasyonu ve afiş desteği).",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Ven],
    enabledByDefault: true,
    settings,
    settingsAboutComponent: ErrorBoundary.wrap(SettingsAboutComponent, { noop: true }),

    patches: [
        // 1. Module 927578: Unlock premium profile customization checks
        {
            find: "canUsePremiumProfileCustomization:function",
            replacement: [
                {
                    match: /canUsePremiumProfileCustomization:function\((\i)\)\{return\s*/g,
                    replace: "$&$self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUsePremiumGuildMemberProfile:function\((\i)\)\{return\s*/g,
                    replace: "$&$self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUseClientThemes:function\((\i)\)\{return\s*/g,
                    replace: "$&$self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUseCustomBackgrounds:function\((\i)\)\{return\s*/g,
                    replace: "$&$self.isCurrentUser($1?.id)||"
                }
            ]
        },
        // 2. DisplayProfile class: Unlock getters, format banner and init
        {
            find: "hasThemeColors(){",
            replacement: [
                {
                    match: /get canUsePremiumProfileCustomization\(\)\{return /g,
                    replace: "$&$self.isCurrentUser(this?.userId)||"
                },
                {
                    match: /get canEditThemes\(\)\{return /g,
                    replace: "$&$self.isCurrentUser(this?.userId)||"
                },
                {
                    match: /getBannerURL\(\i\)\{let\{canAnimate:\i,size:\i\}=\i;return /g,
                    replace: "$&$self.getCustomBanner(this.userId,arguments[0])||"
                },
                {
                    match: /constructor\((\i),(\i)\)\{/g,
                    replace: "$&$self.initDisplayProfile(this,$1,$2);"
                }
            ]
        },
        // 3. Module 207803: Intercept try-it-out changes in Discord profile edit UI
        {
            find: 'type:"USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_THEME_COLORS"',
            replacement: [
                {
                    match: /function (\i)\((\i)\)\{(\i\.h\.dispatch\(\{type:"USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_THEME_COLORS",themeColors:\2\}\))/g,
                    replace: "function $1($2){$self.onSetTryItOutThemeColors($2);$3"
                },
                {
                    match: /function (\i)\((\i)\)\{(\i\.h\.dispatch\(\{type:"USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_BANNER",banner:\2\}\))/g,
                    replace: "function $1($2){$self.onSetTryItOutBanner($2);$3"
                },
                {
                    match: /function (\i)\((\i)\)\{(\i\.h\.dispatch\(\{type:"USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_AVATAR_DECORATION",avatarDecoration:\2\}\))/g,
                    replace: "function $1($2){$self.onSetTryItOutAvatarDecoration($2);$3"
                }
            ]
        },
        // 4. Profile update submit hook: intercept to auto-encode 3y3 and save banner
        {
            find: "USER_PROFILE_UPDATE_START",
            replacement: [
                {
                    match: /async function \i\((\i),(\i),(\i)\)\{let \i=\i\.default\.getCurrentUser\(\)\?\.id;/g,
                    replace: "$&$self.handleProfileSave($1,$2);"
                }
            ]
        },
        // 5. Module 202639: Add "YagmurDiscord İle Ücretsiz Devam Et" button beside Önizlemeden Çık (leadingAction: m)
        {
            find: "translateY(120%)",
            replacement: [
                {
                    match: /null!=(\i)&&\(0,(\i)\.jsx\)\("div",\{className:(\i\.\i),children:\1\}\)/,
                    replace: "null!=$1&&(0,$2.jsx)(\"div\",{className:$3,children:[$1,$self.renderContinueFreeButton()]})"
                }
            ]
        }
    ],

    isCurrentUser(userOrId?: any): boolean {
        if (!userOrId) return true;
        try {
            const current = UserStore.getCurrentUser();
            const id = typeof userOrId === "string" ? userOrId : userOrId?.id;
            return !id || current?.id === id;
        } catch {
            return true;
        }
    },

    onSetTryItOutThemeColors(colors: [number, number] | null) {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            if (Array.isArray(colors) && colors[0] != null && colors[1] != null) {
                settings.store.primaryColor = colors[0];
                settings.store.accentColor = colors[1];
                const bannerUrl = settings.store.customBanner;
                const encoded = encode3y3(colors[0], colors[1], bannerUrl?.startsWith("http") ? bannerUrl : undefined);
                let bio = UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "";
                bio = strip3y3(bio);
                const newBio = (bio.length > 0 ? bio + " " : "") + encoded;

                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingBio: newBio,
                    pendingThemeColors: colors
                });
            } else if (colors === null) {
                settings.store.primaryColor = 0;
                settings.store.accentColor = 0;
                let bio = UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "";
                const newBio = strip3y3(bio);

                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingBio: newBio,
                    pendingThemeColors: null
                });
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] onSetTryItOutThemeColors error:", err);
        }
    },

    onSetTryItOutBanner(banner: any) {
        try {
            if (banner) {
                let bannerUri: string | null = null;
                if (typeof banner === "object") {
                    bannerUri = banner.imageUri || banner.url || banner.asset || banner.id || banner.src || null;
                } else if (typeof banner === "string") {
                    bannerUri = banner;
                }
                if (bannerUri) {
                    settings.store.customBanner = bannerUri;
                }
                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingBanner: banner
                });
            } else if (banner === null) {
                settings.store.customBanner = "";
                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingBanner: null
                });
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] onSetTryItOutBanner error:", err);
        }
    },

    onSetTryItOutAvatarDecoration(decoration: any) {
        try {
            if (decoration) {
                const sku = typeof decoration === "object" ? (decoration.skuId || decoration.id) : decoration;
                if (sku) {
                    settings.store.avatarDecorationSkuId = String(sku);
                }
                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingAvatarDecoration: decoration
                });
            } else if (decoration === null) {
                settings.store.avatarDecorationSkuId = "";
                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingAvatarDecoration: null
                });
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] onSetTryItOutAvatarDecoration error:", err);
        }
    },

    onSetTryItOutProfileEffect(effect: any) {
        try {
            if (effect) {
                const effectId = typeof effect === "object" ? (effect.id || effect.skuId) : effect;
                if (effectId) {
                    settings.store.profileEffectId = String(effectId);
                }
                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingProfileEffect: effect
                });
            } else if (effect === null) {
                settings.store.profileEffectId = "";
                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingProfileEffect: null
                });
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] onSetTryItOutProfileEffect error:", err);
        }
    },

    getCustomBanner(userId?: string, _options?: any): string | null {
        if (!userId || this.isCurrentUser(userId)) {
            const banner = settings.store.customBanner;
            if (banner) {
                if (banner.startsWith("http://") || banner.startsWith("https://") || banner.startsWith("data:")) {
                    return banner;
                }
                return `https://cdn.discordapp.com/banners/${userId || UserStore.getCurrentUser()?.id}/${banner}.png?size=1024`;
            }
            return null;
        }

        try {
            const bio = UserProfileStore.getUserProfile(userId)?.bio;
            const decoded = decode3y3(bio);
            if (decoded?.banner) return decoded.banner;
        } catch { }

        return null;
    },

    initDisplayProfile(dp: any, userProfile?: any, _guildMemberProfile?: any) {
        try {
            const bio = dp?.bio || userProfile?.bio;
            const decoded = decode3y3(bio);
            if (decoded) {
                if (decoded.colors) dp.themeColors = decoded.colors;
                if (decoded.banner) dp.banner = decoded.banner;
            }

            if (this.isCurrentUser(dp?.userId)) {
                if (settings.store.customBanner) {
                    dp.banner = settings.store.customBanner;
                }
                if (settings.store.profileEffectId) {
                    dp.profileEffect = {
                        id: settings.store.profileEffectId,
                        skuId: settings.store.profileEffectId
                    };
                }
                if (settings.store.avatarDecorationSkuId) {
                    dp.avatarDecoration = {
                        skuId: settings.store.avatarDecorationSkuId
                    };
                }
                if (settings.store.primaryColor && settings.store.accentColor) {
                    dp.themeColors = [settings.store.primaryColor, settings.store.accentColor];
                }
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] initDisplayProfile error:", err);
        }
    },

    handleProfileSave(e: any, _guildId?: string) {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            let currentBanner = settings.store.customBanner;

            // Also check tryItOut changes if banner or deco was selected in try-it-out!
            try {
                const store = ((window as any).Vencord?.Webpack?.findStore?.("UserProfileSettingsStore")
                    || ((window as any).Vencord?.Webpack?.wreq?.("836602") as any)?.A);
                const tryItOut = store?.getTryItOutChanges?.() || {};
                if (!e.banner && tryItOut.tryItOutBanner) {
                    e.banner = tryItOut.tryItOutBanner;
                }
                if (!e.avatar_decoration_sku_id && tryItOut.tryItOutAvatarDecoration) {
                    e.avatar_decoration_sku_id = tryItOut.tryItOutAvatarDecoration;
                }
                if (!e.profile_effect_id && tryItOut.tryItOutProfileEffect) {
                    e.profile_effect_id = tryItOut.tryItOutProfileEffect;
                }
                if (!e.theme_colors && tryItOut.tryItOutThemeColors) {
                    e.theme_colors = tryItOut.tryItOutThemeColors;
                }
            } catch { }

            // 1. Process Banner
            if (e.banner !== undefined) {
                if (e.banner) {
                    let bannerUri: string | null = null;
                    if (typeof e.banner === "object") {
                        bannerUri = e.banner.imageUri || e.banner.url || e.banner.asset || e.banner.id || e.banner.src || null;
                    } else if (typeof e.banner === "string") {
                        bannerUri = e.banner;
                    }
                    if (bannerUri) {
                        settings.store.customBanner = bannerUri;
                        currentBanner = bannerUri;
                    }
                } else if (e.banner === null) {
                    settings.store.customBanner = "";
                    currentBanner = "";
                }
                delete e.banner;
            }

            // 2. Theme colors -> Auto 3y3 encoding into bio (with custom banner sync)
            if (e.theme_colors !== undefined) {
                if (Array.isArray(e.theme_colors) && e.theme_colors[0] != null && e.theme_colors[1] != null) {
                    const [primary, accent] = e.theme_colors;
                    if (settings.store.auto3y3ProfileColors) {
                        const encoded = encode3y3(primary, accent, currentBanner?.startsWith("http") ? currentBanner : undefined);
                        let bio = typeof e.bio === "string"
                            ? e.bio
                            : (UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "");
                        bio = strip3y3(bio);
                        e.bio = (bio.length > 0 ? bio + " " : "") + encoded;
                    }
                    settings.store.primaryColor = primary;
                    settings.store.accentColor = accent;
                } else {
                    let bio = typeof e.bio === "string"
                        ? e.bio
                        : (UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "");
                    e.bio = strip3y3(bio);
                    settings.store.primaryColor = 0;
                    settings.store.accentColor = 0;
                }
                delete e.theme_colors;
            } else if (currentBanner && currentBanner.startsWith("http") && settings.store.auto3y3ProfileColors) {
                const primary = settings.store.primaryColor || 0;
                const accent = settings.store.accentColor || 0;
                const encoded = encode3y3(primary, accent, currentBanner);
                let bio = typeof e.bio === "string"
                    ? e.bio
                    : (UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "");
                bio = strip3y3(bio);
                e.bio = (bio.length > 0 ? bio + " " : "") + encoded;
            }

            // 3. Profile effect
            if (e.profile_effect_id !== undefined) {
                if (e.profile_effect_id) {
                    settings.store.profileEffectId = String(e.profile_effect_id);
                } else {
                    settings.store.profileEffectId = "";
                }
                delete e.profile_effect_id;
            }

            // 4. Avatar decoration
            if (e.avatar_decoration_sku_id !== undefined) {
                if (e.avatar_decoration_sku_id) {
                    const sku = typeof e.avatar_decoration_sku_id === "object"
                        ? (e.avatar_decoration_sku_id.skuId || e.avatar_decoration_sku_id.id)
                        : e.avatar_decoration_sku_id;
                    settings.store.avatarDecorationSkuId = String(sku);
                } else {
                    settings.store.avatarDecorationSkuId = "";
                }
                delete e.avatar_decoration_sku_id;
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] handleProfileSave error:", err);
        }
    },

    renderContinueFreeButton() {
        return (
            <button
                key="ym-continue-free"
                type="button"
                className="ym-continue-free-btn"
                onClick={() => {
                    const plugin = (window as any).Vencord?.Plugins?.plugins?.YagmurMelekNitroEffects;
                    plugin?.saveAndApplyTryItOut?.();
                }}
            >
                ✨ YagmurDiscord İle Ücretsiz Devam Et
            </button>
        );
    },

    async saveAndApplyTryItOut() {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            let tryItOut: any = {};
            let pending: any = {};
            try {
                const store = ((window as any).Vencord?.Webpack?.findStore?.("UserProfileSettingsStore")
                    || ((window as any).Vencord?.Webpack?.wreq?.("836602") as any)?.A);
                if (store?.getTryItOutChanges) {
                    tryItOut = store.getTryItOutChanges() || {};
                }
                if (store?.getPendingChanges) {
                    pending = store.getPendingChanges() || {};
                }
            } catch { }

            const primary = tryItOut.tryItOutThemeColors?.[0]
                ?? pending.pendingThemeColors?.[0]
                ?? settings.store.primaryColor
                ?? 0;
            const accent = tryItOut.tryItOutThemeColors?.[1]
                ?? pending.pendingThemeColors?.[1]
                ?? settings.store.accentColor
                ?? 0;

            let bannerUrl = settings.store.customBanner;
            const rawBanner = tryItOut.tryItOutBanner || pending.pendingBanner;
            if (rawBanner) {
                if (typeof rawBanner === "object") {
                    bannerUrl = rawBanner.imageUri || rawBanner.url || rawBanner.asset || rawBanner.id || rawBanner.src || bannerUrl;
                } else if (typeof rawBanner === "string") {
                    bannerUrl = rawBanner;
                }
            }

            const rawDeco = tryItOut.tryItOutAvatarDecoration || pending.pendingAvatarDecoration;
            const avatarDecorationSkuId = rawDeco?.skuId
                ? String(rawDeco.skuId)
                : (rawDeco?.id ? String(rawDeco.id) : (typeof rawDeco === "string" ? rawDeco : settings.store.avatarDecorationSkuId));

            const rawEffect = tryItOut.tryItOutProfileEffect || tryItOut.tryItOutProfileEffectId || pending.pendingProfileEffect;
            const profileEffectId = rawEffect?.id
                ? String(rawEffect.id)
                : (rawEffect?.skuId ? String(rawEffect.skuId) : (typeof rawEffect === "string" ? rawEffect : settings.store.profileEffectId));

            // 1. Save to plugin settings
            if (primary) settings.store.primaryColor = primary;
            if (accent) settings.store.accentColor = accent;
            if (bannerUrl) settings.store.customBanner = bannerUrl;
            if (avatarDecorationSkuId) settings.store.avatarDecorationSkuId = avatarDecorationSkuId;
            if (profileEffectId) settings.store.profileEffectId = profileEffectId;

            // 2. Encode to 3y3 bio tag
            const profile = UserProfileStore.getUserProfile(currentUser.id);
            let bio = profile?.bio ?? "";
            bio = strip3y3(bio);
            const bannerFor3y3 = bannerUrl && (bannerUrl.startsWith("http://") || bannerUrl.startsWith("https://")) ? bannerUrl : undefined;
            const encoded3y3 = encode3y3(primary || 0, accent || 0, bannerFor3y3);
            const newBio = (bio.length > 0 ? bio + " " : "") + encoded3y3;

            // 3. Save bio to Discord servers (non-nitro allowed)
            try {
                const actionMod = ((window as any).Vencord?.Webpack?.wreq?.("207803") as any);
                if (actionMod?.gi) {
                    await actionMod.gi({ bio: newBio });
                } else if (RestAPI?.patch) {
                    await RestAPI.patch({ url: "/users/@me/profile", body: { bio: newBio } });
                }
            } catch (apiErr) {
                console.warn("[YagmurMelekNitroEffects] Profile bio save warning:", apiErr);
            }

            // 4. Update local user profile store
            if (profile) {
                profile.bio = newBio;
                if (primary && accent) {
                    profile.themeColors = [primary, accent];
                    profile.premiumType = 2;
                }
                if (bannerUrl) {
                    profile.banner = bannerUrl;
                }
            }

            // 5. Close try-it-out preview notice & pending changes
            FluxDispatcher.dispatch({ type: "USER_PROFILE_SETTINGS_RESET_TRY_IT_OUT_CHANGES" });
            FluxDispatcher.dispatch({ type: "USER_PROFILE_SETTINGS_RESET_PENDING_CHANGES" });

            showToast("✨ YagmurDiscord: Profiliniz (Afiş, Renkler ve Efektler) ücretsiz olarak başarıyla kaydedildi!", Toasts.Type.SUCCESS);
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] saveAndApplyTryItOut error:", err);
            showToast("Kaydedilirken bir hata oluştu.", Toasts.Type.FAILURE);
        }
    },

    fluxListener: null as ((action: any) => void) | null,

    start() {
        this.fluxListener = (action: any) => {
            switch (action.type) {
                case "USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_BANNER":
                    this.onSetTryItOutBanner(action.banner);
                    break;
                case "USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_THEME_COLORS":
                    this.onSetTryItOutThemeColors(action.themeColors);
                    break;
                case "USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_AVATAR_DECORATION":
                    this.onSetTryItOutAvatarDecoration(action.avatarDecoration);
                    break;
                case "USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_PROFILE_EFFECT":
                    this.onSetTryItOutProfileEffect(action.profileEffect);
                    break;
            }
        };
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_BANNER", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_THEME_COLORS", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_AVATAR_DECORATION", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_PROFILE_EFFECT", this.fluxListener);
    },

    stop() {
        if (this.fluxListener) {
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_BANNER", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_THEME_COLORS", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_AVATAR_DECORATION", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_PROFILE_EFFECT", this.fluxListener);
            this.fluxListener = null;
        }
    }
});
