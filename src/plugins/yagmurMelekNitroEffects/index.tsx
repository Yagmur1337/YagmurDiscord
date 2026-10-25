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
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ColorPicker, FluxDispatcher, Forms, React, Text, TextInput, UserProfileStore, UserStore, useState } from "@webpack/common";

export function encode3y3(primary: number, accent: number): string {
    const message = `[#${primary.toString(16).padStart(6, "0")},#${accent.toString(16).padStart(6, "0")}]`;
    const encoded = Array.from(message)
        .map(x => x.codePointAt(0))
        .filter(x => x! >= 0x20 && x! <= 0x7f)
        .map(x => String.fromCodePoint(x! + 0xe0000))
        .join("");

    return " " + encoded;
}

export function decode3y3(bio?: string): [number, number] | null {
    if (!bio) return null;

    const colorString = bio.match(
        /\u{e005b}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e002c}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e005d}/u,
    );
    if (colorString != null) {
        const parsed = [...colorString[0]]
            .map(x => String.fromCodePoint(x.codePointAt(0)! - 0xe0000))
            .join("");
        const colors = parsed
            .substring(1, parsed.length - 1)
            .split(",")
            .map(x => parseInt(x.replace("#", "0x"), 16));

        return [colors[0], colors[1]];
    }
    return null;
}

export function strip3y3(bio?: string): string {
    if (!bio) return "";
    return bio.replace(/\s*[\u{e0000}-\u{e007f}]+\s*/gu, " ").trim();
}

const settings = definePluginSettings({
    auto3y3ProfileColors: {
        description: "Profil ekranından seçilen renkleri otomatik 3y3 kodu olarak Bio'ya kaydet (Diğer mod kullanıcıları da görür)",
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
    const detectedColors = decode3y3(currentBio) ?? [settings.store.primaryColor, settings.store.accentColor];

    const [primary, setPrimary] = useState(detectedColors[0] || 0);
    const [accent, setAccent] = useState(detectedColors[1] || 0);
    const [bannerUrl, setBannerUrl] = useState(settings.store.customBanner || "");

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
                            <strong>Doğrudan Profil Düzenleme:</strong> Profil ekranında renklerinizi seçip
                            &quot;Değişiklikleri Kaydet&quot; dediğinizde renkler otomatik olarak Bio&apos;nuza 3y3 görünmez
                            koduyla işlenir. Manuel kod kopyala-yapıştır yapmanıza gerek kalmaz.
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
                        size={Button.Sizes.MEDIUM}
                        style={{ marginTop: "auto" }}
                        onClick={() => {
                            const enc = encode3y3(primary, accent);
                            copyWithToast(enc);
                        }}
                    >
                        3y3 Kodunu Kopyala
                    </Button>
                </Flex>

                <Divider className={classes(Margins.top16, Margins.bottom16)} />

                <Forms.FormTitle tag="h3">🖼️ Özel Profil Afişi</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom8}>
                    Doğrudan bir görsel bağlantısı (örn. Discord CDN veya Imgur linki) girebilirsiniz:
                </Forms.FormText>
                <Flex gap="1em" alignItems="center">
                    <div style={{ flex: 1 }}>
                        <TextInput
                            value={bannerUrl}
                            placeholder="https://i.imgur.com/example.png"
                            onChange={(val: string) => {
                                setBannerUrl(val);
                                settings.store.customBanner = val;
                            }}
                        />
                    </div>
                    {bannerUrl && (
                        <Button
                            color={Button.Colors.RED}
                            size={Button.Sizes.MEDIUM}
                            onClick={() => {
                                setBannerUrl("");
                                settings.store.customBanner = "";
                            }}
                        >
                            Afişi Kaldır
                        </Button>
                    )}
                </Flex>

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
    description: "Profil rengi, afiş ve efektleri Nitro gerekmeden doğrudan Discord Profil Düzenleme ekranından ayarlamanızı sağlar (otomatik 3y3 entegrasyonu ve afiş desteği).",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Ven],
    settings,
    settingsAboutComponent: ErrorBoundary.wrap(SettingsAboutComponent, { noop: true }),

    patches: [
        // 1. Module 927578: Unlock premium profile customization checks
        {
            find: "canUsePremiumProfileCustomization:function",
            replacement: [
                {
                    match: /canUsePremiumProfileCustomization:function\((\i)\)\{return /g,
                    replace: "$&$self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUsePremiumGuildMemberProfile:function\((\i)\)\{return /g,
                    replace: "$&$self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUseClientThemes:function\((\i)\)\{return /g,
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
        // 3. Module 207803: Intercept try-it-out changes in Discord profile edit UI (Screenshot 3)
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
                const encoded = encode3y3(colors[0], colors[1]);
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
                const bannerUri = typeof banner === "object" && banner.imageUri
                    ? banner.imageUri
                    : (typeof banner === "string" ? banner : null);
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
            if (decoration?.skuId) {
                settings.store.avatarDecorationSkuId = String(decoration.skuId);
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

    getCustomBanner(userId?: string, _options?: any): string | null {
        if (!this.isCurrentUser(userId)) return null;
        const banner = settings.store.customBanner;
        if (banner && (banner.startsWith("http") || banner.startsWith("data:"))) {
            return banner;
        }
        return null;
    },

    initDisplayProfile(dp: any, _userProfile?: any, _guildMemberProfile?: any) {
        try {
            if (!this.isCurrentUser(dp?.userId)) return;

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

            const decoded = decode3y3(dp?.bio);
            if (decoded) {
                dp.themeColors = decoded;
            } else if (settings.store.primaryColor && settings.store.accentColor && !dp.themeColors) {
                dp.themeColors = [settings.store.primaryColor, settings.store.accentColor];
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] initDisplayProfile error:", err);
        }
    },

    handleProfileSave(e: any, _guildId?: string) {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            // 1. Theme colors -> Auto 3y3 encoding into bio
            if (e.theme_colors !== undefined) {
                if (Array.isArray(e.theme_colors) && e.theme_colors[0] != null && e.theme_colors[1] != null) {
                    const [primary, accent] = e.theme_colors;
                    if (settings.store.auto3y3ProfileColors) {
                        const encoded = encode3y3(primary, accent);
                        let bio = typeof e.bio === "string"
                            ? e.bio
                            : (UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "");
                        bio = strip3y3(bio);
                        e.bio = (bio.length > 0 ? bio + " " : "") + encoded;
                    }
                    settings.store.primaryColor = primary;
                    settings.store.accentColor = accent;
                } else {
                    // Reset colors
                    let bio = typeof e.bio === "string"
                        ? e.bio
                        : (UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "");
                    e.bio = strip3y3(bio);
                    settings.store.primaryColor = 0;
                    settings.store.accentColor = 0;
                }
                // Strip theme_colors from payload so Discord server accepts the save without Nitro
                delete e.theme_colors;
            }

            // 2. Banner
            if (e.banner !== undefined) {
                if (e.banner) {
                    const bannerUri = typeof e.banner === "object" && e.banner.imageUri
                        ? e.banner.imageUri
                        : (typeof e.banner === "string" ? e.banner : null);
                    if (bannerUri) {
                        settings.store.customBanner = bannerUri;
                    }
                } else if (e.banner === null) {
                    settings.store.customBanner = "";
                }
                // Strip banner from network request
                delete e.banner;
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
                    settings.store.avatarDecorationSkuId = String(e.avatar_decoration_sku_id);
                } else {
                    settings.store.avatarDecorationSkuId = "";
                }
                delete e.avatar_decoration_sku_id;
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] handleProfileSave error:", err);
        }
    }
});
