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
import { Button, closeModal, ColorPicker, FluxDispatcher, Forms, React, RestAPI, showToast, Text, TextInput, Toasts, UserProfileStore, UserStore, useState } from "@webpack/common";
import virtualMerge from "virtual-merge";

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
    displayNameStyles: {
        description: "Özel Görünen Ad Stili (Yazı Tipi, Efekt, Renkler)",
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

    let parsedStyle: any = null;
    try {
        if (settings.store.displayNameStyles) {
            parsedStyle = JSON.parse(settings.store.displayNameStyles);
        }
    } catch { }

    const [fontId, setFontId] = useState(parsedStyle?.fontId ?? 1);
    const [effectId, setEffectId] = useState(parsedStyle?.effectId ?? 3);
    const [styleColor, setStyleColor] = useState(parsedStyle?.colors?.[0] ?? 0xd042f5);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setBannerUrl(dataUrl);
            settings.store.customBanner = dataUrl;
            const plugin = (window as any).Vencord?.Plugins?.plugins?.YagmurMelekNitroEffects;
            plugin?.updateDynamicStyles?.();
            const current = UserStore.getCurrentUser();
            if (current) {
                const profile = UserProfileStore.getUserProfile(current.id);
                if (profile) profile.banner = dataUrl;
            }
            UserProfileStore.emitChange?.();
            showToast("✨ Profil afişiniz başarıyla yüklendi ve sabitlendi!", Toasts.Type.SUCCESS);
        };
        reader.readAsDataURL(file);
    };

    const applyHardcodedStyles = () => {
        const plugin = (window as any).Vencord?.Plugins?.plugins?.YagmurMelekNitroEffects;
        const newStyle = {
            fontId,
            effectId,
            colors: [styleColor]
        };
        settings.store.displayNameStyles = JSON.stringify(newStyle);
        settings.store.primaryColor = primary;
        settings.store.accentColor = accent;
        settings.store.customBanner = bannerUrl;

        plugin?.applyDisplayNameStylesGlobally?.(newStyle);
        plugin?.updateDynamicStyles?.();
        plugin?.saveAndApplyTryItOut?.();
        showToast("🚀 Tüm profil ayarları (Afiş, Renkler ve Ad Stili) Discord'a sabitlendi!", Toasts.Type.SUCCESS);
    };

    const clearBanner = () => {
        setBannerUrl("");
        settings.store.customBanner = "";
        const plugin = (window as any).Vencord?.Plugins?.plugins?.YagmurMelekNitroEffects;
        plugin?.updateDynamicStyles?.();
        const current = UserStore.getCurrentUser();
        if (current) {
            const profile = UserProfileStore.getUserProfile(current.id);
            if (profile) profile.banner = null;
        }
        UserProfileStore.emitChange?.();
        showToast("Afiş kaldırıldı.", Toasts.Type.SUCCESS);
    };

    const clearStyle = () => {
        settings.store.displayNameStyles = "";
        const plugin = (window as any).Vencord?.Plugins?.plugins?.YagmurMelekNitroEffects;
        const current = UserStore.getCurrentUser();
        if (current) current.displayNameStyles = null;
        plugin?.updateDynamicStyles?.();
        UserProfileStore.emitChange?.();
        UserStore.emitChange?.();
        showToast("Görünen ad stili temizlendi.", Toasts.Type.SUCCESS);
    };

    const effectOptions = [
        { id: 1, name: "Sabit (Static)" },
        { id: 2, name: "Gradyan (Gradient)" },
        { id: 3, name: "Neon (Parlayan Neon)" },
        { id: 4, name: "Çizgi Film (Comic)" },
        { id: 5, name: "Pop (Pop Art)" },
        { id: 6, name: "Şekercik (Candy)" },
        { id: 7, name: "Prizma (Prism / Rainbow)" },
    ];

    return (
        <section className={Margins.top8}>
            <div className="ym-nitro-settings-card">
                <Forms.FormTitle tag="h2">⚡ YagmurDiscord Profil ve Nitro Özelleştirme</Forms.FormTitle>
                <Forms.FormText>
                    Bu panelden profil afişinizi (GIF veya resim), görünen ad stilinizi (neon, gradyan, yazı tipi ve renk),
                    ve profil tema renklerinizi doğrudan ayarlayabilir ve <strong>hardcoded (kesin kalıcı)</strong> olarak sabitleyebilirsiniz.
                </Forms.FormText>

                <Divider className={classes(Margins.top16, Margins.bottom16)} />

                {/* 1. AFİŞ (BANNER) */}
                <Forms.FormTitle tag="h3">🖼️ Profil Afişi (GIF / Resim)</Forms.FormTitle>
                <Forms.FormText>
                    Aşağıya bir doğrudan görsel/GIF URL&apos;si girebilir veya doğrudan bilgisayarınızdan bir GIF/Resim seçebilirsiniz.
                </Forms.FormText>
                <Flex gap="1em" alignItems="center" className={Margins.top8}>
                    <TextInput
                        value={bannerUrl}
                        placeholder="https://media.tenor.com/... veya dosya yükleyin"
                        onChange={(val: string) => {
                            setBannerUrl(val);
                            settings.store.customBanner = val;
                            const plugin = (window as any).Vencord?.Plugins?.plugins?.YagmurMelekNitroEffects;
                            plugin?.updateDynamicStyles?.();
                        }}
                        style={{ flex: 1 }}
                    />
                    <input
                        type="file"
                        accept="image/*,.gif,.png,.jpg,.jpeg,.webp"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                    />
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.SMALL}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        📁 Bilgisayardan GIF / Resim Yükle
                    </Button>
                    {bannerUrl && (
                        <Button
                            color={Button.Colors.RED}
                            size={Button.Sizes.SMALL}
                            onClick={clearBanner}
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

                <Divider className={classes(Margins.top16, Margins.bottom16)} />

                {/* 2. GÖRÜNEN AD STİLİ */}
                <Forms.FormTitle tag="h3">✨ Görünen Ad Stili (Neon / Gradyan / Yazı Tipi)</Forms.FormTitle>
                <Forms.FormText>
                    Discord Nitro gerektirmeden istediğiniz fontu, efekti ve rengi seçip profilinize sabitleyin.
                </Forms.FormText>

                {/* CANLI ÖNİZLEME */}
                <div className="ym-style-preview-box">
                    <span
                        className="ym-styled-name-preview"
                        style={{
                            color: effectId === 3 ? "#ffffff" : `#${styleColor.toString(16).padStart(6, "0")}`,
                            textShadow: effectId === 3 ? `0 0 6px #${styleColor.toString(16).padStart(6, "0")}, 0 0 14px #${styleColor.toString(16).padStart(6, "0")}, 0 0 22px #${styleColor.toString(16).padStart(6, "0")}` : "none",
                            background: effectId === 2 ? `linear-gradient(90deg, #${styleColor.toString(16).padStart(6, "0")}, #ffffff)` : effectId === 7 ? "linear-gradient(90deg, #ff0055, #ffaa00, #33cc33, #0099ff, #cc00ff)" : "none",
                            WebkitBackgroundClip: (effectId === 2 || effectId === 7) ? "text" : "unset",
                            WebkitTextFillColor: (effectId === 2 || effectId === 7) ? "transparent" : "unset",
                            fontWeight: 700,
                            fontSize: "18px"
                        }}
                    >
                        {currentUser?.username || "Kullanıcı Adı"}
                    </span>
                </div>

                <Flex gap="1.5em" alignItems="center" flexWrap="wrap" className={Margins.top8}>
                    <div>
                        <Text variant="text-xs/normal" style={{ marginBottom: "4px" }}>Efekt Seçimi:</Text>
                        <select
                            value={effectId}
                            onChange={e => setEffectId(parseInt(e.target.value, 10))}
                            className="ym-select-input"
                        >
                            {effectOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Text variant="text-xs/normal" style={{ marginBottom: "4px" }}>Yazı Tipi (1-12):</Text>
                        <select
                            value={fontId}
                            onChange={e => setFontId(parseInt(e.target.value, 10))}
                            className="ym-select-input"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Font {i + 1}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Text variant="text-xs/normal" style={{ marginBottom: "4px" }}>Stil Rengi:</Text>
                        <ColorPicker
                            color={styleColor}
                            label={<span />}
                            onChange={(c: number) => setStyleColor(c)}
                        />
                    </div>

                    <Button
                        color={Button.Colors.GREEN}
                        size={Button.Sizes.SMALL}
                        onClick={applyHardcodedStyles}
                        style={{ marginTop: "16px" }}
                    >
                        ✨ Stili Sabitle ve Uygula
                    </Button>

                    <Button
                        color={Button.Colors.RED}
                        size={Button.Sizes.SMALL}
                        onClick={clearStyle}
                        style={{ marginTop: "16px" }}
                    >
                        Stili Temizle
                    </Button>
                </Flex>

                <Divider className={classes(Margins.top16, Margins.bottom16)} />

                {/* 3. PROFİL RENKLERİ */}
                <Forms.FormTitle tag="h3">🎨 Profil Tema Renkleri</Forms.FormTitle>
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

                {/* 4. TÜMÜNÜ SABİTLE BUTONU */}
                <Button
                    color={Button.Colors.GREEN}
                    size={Button.Sizes.LARGE}
                    onClick={applyHardcodedStyles}
                    style={{ width: "100%", fontWeight: "bold" }}
                >
                    🚀 Tüm Ayarları Discord Profiline Kesin Sabitle (Hardcode Uygula)
                </Button>
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
                    replace: "canUsePremiumProfileCustomization:function($1){return $self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUsePremiumGuildMemberProfile:function\((\i)\)\{return\s*/g,
                    replace: "canUsePremiumGuildMemberProfile:function($1){return $self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUseClientThemes:function\((\i)\)\{return\s*/g,
                    replace: "canUseClientThemes:function($1){return $self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUseCustomBackgrounds:function\((\i)\)\{return\s*/g,
                    replace: "canUseCustomBackgrounds:function($1){return $self.isCurrentUser($1?.id)||"
                },
                {
                    match: /canUseCollectibles:(\i),/g,
                    replace: "canUseCollectibles:function(u){return $self.isCurrentUser(u?.id)||$1(u)},"
                },
                {
                    match: /canUseAnimatedAvatar:function\((\i)\)\{return\s*/g,
                    replace: "canUseAnimatedAvatar:function($1){return $self.isCurrentUser($1?.id)||"
                }
            ]
        },
        // 2. DisplayProfile class: Unlock getters, format banner and init
        {
            find: "hasThemeColors(){",
            replacement: [
                {
                    match: /get canUsePremiumProfileCustomization\(\)\{return\s*/g,
                    replace: "get canUsePremiumProfileCustomization(){return $self.isCurrentUser(this?.userId)||"
                },
                {
                    match: /get canEditThemes\(\)\{return\s*/g,
                    replace: "get canEditThemes(){return $self.isCurrentUser(this?.userId)||"
                },
                {
                    match: /getBannerURL\(\i\)\{let\{canAnimate:\i,size:\i\}=\i;return\s*/g,
                    replace: "$& $self.getCustomBanner(this.userId,arguments[0])||"
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
                },
                {
                    match: /function (\i)\((\i)\)\{(\i\.h\.dispatch\(\{type:"USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_DISPLAY_NAME_STYLES",displayNameStyles:\2\}\))/g,
                    replace: "function $1($2){$self.onSetTryItOutDisplayNameStyles($2);$3"
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
                    replace: "null!=$1&&(0,$2.jsxs)(\"div\",{className:$3,children:[$1,$self.renderContinueFreeButton()]})"
                }
            ]
        },
        // 6. Module 836602: Keep full 5-card layout active and prevent collapsing into restricted preview
        {
            find: "hasTryItOutChanges(){",
            replacement: [
                {
                    match: /hasTryItOutChanges\(\)\{return\s*Object\.values\(\i\)\.some\(\i=>void 0!==\i\)\}/,
                    replace: "hasTryItOutChanges(){return false}"
                }
            ]
        },
        // 7. UserProfileStore: Hook getUserProfile to persist and return custom colors, banner, effect, deco, display name styles
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                replace: "$self.userProfileHook($1)"
            }
        },
        // 8. Module 631670: Strip restricted fields from Account Save payload to prevent 400 Bad Request
        {
            find: "display_name_font_id=null",
            replacement: [
                {
                    match: /void 0!==(\i)&&\((\i)\.avatar_decoration_sku_id=\1\?\.skuId\?\?null\),/g,
                    replace: "$self.handleAccountDecoration($1);$2.avatar_decoration_sku_id=void 0,"
                },
                {
                    match: /void 0!==(\i)&&\((\i)\.nameplate_sku_id=\1\?\.skuId\?\?null\),/g,
                    replace: "$self.handleAccountNameplate($1);$2.nameplate_sku_id=void 0,"
                },
                {
                    match: /null!=(\i)\?\((\i)\.display_name_font_id=\1\.fontId,\2\.display_name_effect_id=\1\.effectId,\2\.display_name_colors=\1\.colors\):null===\1&&\((\i)\.display_name_font_id=null,\3\.display_name_effect_id=null,\3\.display_name_colors=null\),/g,
                    replace: "$self.handleAccountDisplayNameStyles($1);"
                }
            ]
        },
        // 9. Banner Image loader hook: directly inject custom banner URL
        {
            find: ':"SHOULD_LOAD");',
            replacement: {
                match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
                replace: "$self.patchBannerUrl(arguments[0])||$&"
            }
        }
    ],

    patchBannerUrl({ displayProfile }: any) {
        if (!displayProfile) return null;
        if (displayProfile.userId && this.isCurrentUser(displayProfile.userId)) {
            return settings.store.customBanner || null;
        }
        return this.getCustomBanner(displayProfile.userId);
    },

    isCurrentUser(userOrId?: any): boolean {
        if (!userOrId) return false;
        try {
            const current = UserStore.getCurrentUser();
            const id = typeof userOrId === "string" ? userOrId : userOrId?.id;
            return Boolean(id && current?.id && current.id === id);
        } catch {
            return false;
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

    async onSetTryItOutBanner(banner: any) {
        try {
            if (banner) {
                let bannerUri: string | null = null;
                if (typeof banner === "object") {
                    bannerUri = banner.imageUri || banner.url || banner.asset || banner.id || banner.src || null;
                } else if (typeof banner === "string") {
                    bannerUri = banner;
                }

                // If blob URL, convert to Base64 Data URL so it doesn't expire
                if (bannerUri && bannerUri.startsWith("blob:")) {
                    try {
                        const blobRes = await fetch(bannerUri);
                        const blob = await blobRes.blob();
                        const reader = new FileReader();
                        bannerUri = await new Promise<string>((resolve) => {
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.error("[YagmurMelekNitroEffects] blob conversion error:", e);
                    }
                }

                if (bannerUri) {
                    settings.store.customBanner = bannerUri;
                    const currentUser = UserStore.getCurrentUser();
                    if (currentUser) {
                        const profile = UserProfileStore.getUserProfile(currentUser.id);
                        if (profile) profile.banner = bannerUri;
                    }
                    this.updateDynamicStyles();
                    UserProfileStore.emitChange?.();
                }

                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingBanner: banner
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

    onSetTryItOutDisplayNameStyles(styles: any) {
        try {
            if (styles) {
                settings.store.displayNameStyles = JSON.stringify(styles);
                this.applyDisplayNameStylesGlobally(styles);
                FluxDispatcher.dispatch({
                    type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                    pendingDisplayNameStyles: styles
                });
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] onSetTryItOutDisplayNameStyles error:", err);
        }
    },

    getCustomBanner(userId?: string, _options?: any): string | null {
        if (!userId || this.isCurrentUser(userId)) {
            const banner = settings.store.customBanner;
            if (banner) {
                return banner;
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
                if (decoded.banner) {
                    dp.banner = decoded.banner;
                    dp.hasBanner = true;
                }
            }

            if (this.isCurrentUser(dp?.userId)) {
                if (settings.store.customBanner) {
                    dp.banner = settings.store.customBanner;
                    dp.hasBanner = true;
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
                if (settings.store.displayNameStyles) {
                    try {
                        dp.displayNameStyles = JSON.parse(settings.store.displayNameStyles);
                    } catch { }
                }
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] initDisplayProfile error:", err);
        }
    },

    userProfileHook(profile: any) {
        if (!profile) return profile;
        try {
            const currentUser = UserStore.getCurrentUser();
            const isMe = Boolean(currentUser?.id && profile.userId && profile.userId === currentUser.id);

            if (isMe) {
                const primary = settings.store.primaryColor;
                const accent = settings.store.accentColor;
                const banner = settings.store.customBanner;
                const effect = settings.store.profileEffectId;
                const deco = settings.store.avatarDecorationSkuId;
                let styles: any = null;
                if (settings.store.displayNameStyles) {
                    try { styles = JSON.parse(settings.store.displayNameStyles); } catch { }
                }

                const overrides: any = {
                    premiumType: 2
                };
                if (primary && accent) {
                    overrides.themeColors = [primary, accent];
                }
                if (banner) {
                    overrides.banner = banner;
                    overrides.hasBanner = true;
                }
                if (effect) {
                    overrides.profileEffect = { id: effect, skuId: effect };
                }
                if (deco) {
                    overrides.avatarDecoration = { skuId: deco };
                }
                if (styles) {
                    overrides.displayNameStyles = styles;
                }
                if (profile.user) {
                    overrides.user = virtualMerge(profile.user, {
                        premiumType: 2,
                        displayNameStyles: styles,
                        avatarDecoration: deco ? { skuId: deco } : profile.user.avatarDecoration,
                        banner: banner || profile.user.banner
                    });
                }

                return virtualMerge(profile, overrides);
            }

            if (profile.bio) {
                const decoded = decode3y3(profile.bio);
                if (decoded) {
                    const overrides: any = {};
                    if (decoded.colors && (!profile.themeColors || !settings.store.auto3y3ProfileColors)) {
                        overrides.themeColors = decoded.colors;
                        overrides.premiumType = 2;
                    }
                    if (decoded.banner && !profile.banner) {
                        overrides.banner = decoded.banner;
                        overrides.hasBanner = true;
                    }
                    return virtualMerge(profile, overrides);
                }
            }
        } catch { }

        return profile;
    },

    applyToCurrentUser() {
        try {
            const current = UserStore.getCurrentUser();
            if (current) {
                current.premiumType = 2;
                if (settings.store.displayNameStyles) {
                    try { current.displayNameStyles = JSON.parse(settings.store.displayNameStyles); } catch { }
                }
                const deco = settings.store.avatarDecorationSkuId;
                const banner = settings.store.customBanner;
                if (deco) (current as any).avatarDecoration = { skuId: deco };
                if (banner) {
                    current.banner = banner;
                    (current as any).hasBanner = true;
                }
            }
        } catch { }
    },

    userHook(user: any) {
        if (!user) return user;
        try {
            if (this.isCurrentUser(user.id)) {
                this.applyToCurrentUser();
            }
        } catch { }
        return user;
    },

    handleAccountDecoration(deco: any) {
        try {
            if (deco) {
                const sku = typeof deco === "object" ? (deco.skuId || deco.id) : deco;
                if (sku) settings.store.avatarDecorationSkuId = String(sku);
            }
        } catch { }
    },

    handleAccountNameplate(_nameplate: any) { },

    handleAccountDisplayNameStyles(styles: any) {
        try {
            if (styles) {
                settings.store.displayNameStyles = JSON.stringify(styles);
                this.applyDisplayNameStylesGlobally(styles);
            }
        } catch { }
    },

    onSetPendingChanges(action: any) {
        try {
            if (action?.guildId) return;

            if (action.pendingThemeColors !== undefined && action.pendingThemeColors !== null) {
                if (Array.isArray(action.pendingThemeColors) && action.pendingThemeColors[0] != null && action.pendingThemeColors[1] != null) {
                    settings.store.primaryColor = action.pendingThemeColors[0];
                    settings.store.accentColor = action.pendingThemeColors[1];
                }
            }

            if (action.pendingBanner !== undefined && action.pendingBanner !== null) {
                let bannerUri: string | null = null;
                if (typeof action.pendingBanner === "object") {
                    bannerUri = action.pendingBanner.imageUri || action.pendingBanner.url || action.pendingBanner.asset || action.pendingBanner.id || action.pendingBanner.src || null;
                } else if (typeof action.pendingBanner === "string") {
                    bannerUri = action.pendingBanner;
                }
                if (bannerUri) {
                    settings.store.customBanner = bannerUri;
                    this.updateDynamicStyles();
                }
            }

            if (action.pendingProfileEffect !== undefined && action.pendingProfileEffect !== null) {
                const id = typeof action.pendingProfileEffect === "object"
                    ? (action.pendingProfileEffect.id || action.pendingProfileEffect.skuId)
                    : action.pendingProfileEffect;
                if (id) settings.store.profileEffectId = String(id);
            }

            if (action.pendingAvatarDecoration !== undefined && action.pendingAvatarDecoration !== null) {
                const sku = typeof action.pendingAvatarDecoration === "object"
                    ? (action.pendingAvatarDecoration.skuId || action.pendingAvatarDecoration.id)
                    : action.pendingAvatarDecoration;
                if (sku) settings.store.avatarDecorationSkuId = String(sku);
            }

            if (action.pendingDisplayNameStyles !== undefined && action.pendingDisplayNameStyles !== null) {
                settings.store.displayNameStyles = JSON.stringify(action.pendingDisplayNameStyles);
                this.applyDisplayNameStylesGlobally(action.pendingDisplayNameStyles);
            }
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] onSetPendingChanges error:", err);
        }
    },

    async onSubmitOrSuccess() {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            const primary = settings.store.primaryColor;
            const accent = settings.store.accentColor;
            const banner = settings.store.customBanner;

            if (settings.store.auto3y3ProfileColors && primary && accent) {
                const currentProfile = UserProfileStore.getUserProfile(currentUser.id);
                const currentBio = currentProfile?.bio ?? "";
                const decoded = decode3y3(currentBio);

                const bannerFor3y3 = banner?.startsWith("http") ? banner : undefined;
                if (!decoded || decoded.colors?.[0] !== primary || decoded.colors?.[1] !== accent || (bannerFor3y3 && decoded.banner !== bannerFor3y3)) {
                    const cleanBio = strip3y3(currentBio);
                    const encoded = encode3y3(primary, accent, bannerFor3y3);
                    const newBio = (cleanBio.length > 0 ? cleanBio + " " : "") + encoded;

                    try {
                        const actionMod = ((window as any).Vencord?.Webpack?.wreq?.("207803") as any);
                        if (actionMod?.gi) {
                            await actionMod.gi({ bio: newBio });
                        } else if (RestAPI?.patch) {
                            await RestAPI.patch({ url: "/users/@me/profile", body: { bio: newBio } });
                        }
                    } catch (err) {
                        console.warn("[YagmurMelekNitroEffects] auto 3y3 bio save warning:", err);
                    }
                }
            }

            this.updateDynamicStyles();
            UserProfileStore.emitChange?.();
            UserStore.emitChange?.();
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] onSubmitOrSuccess error:", err);
        }
    },

    handleProfileSave(e: any, _guildId?: string) {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            let currentBanner = settings.store.customBanner;

            // Also check pending and tryItOut changes if banner or deco was selected!
            try {
                const store = ((window as any).Vencord?.Webpack?.findStore?.("UserProfileSettingsStore")
                    || ((window as any).Vencord?.Webpack?.wreq?.("836602") as any)?.A);
                const pending = store?.getPendingChanges?.() || {};
                const tryItOut = store?.getTryItOutChanges?.() || {};
                if (e.banner === undefined && (pending.pendingBanner !== undefined || tryItOut.tryItOutBanner !== undefined)) {
                    e.banner = pending.pendingBanner !== undefined ? pending.pendingBanner : tryItOut.tryItOutBanner;
                }
                if (e.avatar_decoration_sku_id === undefined && (pending.pendingAvatarDecoration !== undefined || tryItOut.tryItOutAvatarDecoration !== undefined)) {
                    e.avatar_decoration_sku_id = pending.pendingAvatarDecoration !== undefined ? pending.pendingAvatarDecoration : tryItOut.tryItOutAvatarDecoration;
                }
                if (e.profile_effect_id === undefined && (pending.pendingProfileEffect !== undefined || tryItOut.tryItOutProfileEffect !== undefined)) {
                    e.profile_effect_id = pending.pendingProfileEffect !== undefined ? pending.pendingProfileEffect : tryItOut.tryItOutProfileEffect;
                }
                if (e.theme_colors === undefined && (pending.pendingThemeColors !== undefined || tryItOut.tryItOutThemeColors !== undefined)) {
                    e.theme_colors = pending.pendingThemeColors !== undefined ? pending.pendingThemeColors : tryItOut.tryItOutThemeColors;
                }
            } catch { }

            // 1. Process Banner
            if (e.banner !== undefined && e.banner !== null) {
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
            }
            // Strip from Discord save request to prevent Discord rejection
            delete e.banner;

            // 2. Theme colors -> Auto 3y3 encoding into bio (with custom banner sync)
            if (e.theme_colors !== undefined) {
                if (Array.isArray(e.theme_colors) && e.theme_colors[0] != null && e.theme_colors[1] != null) {
                    const [primary, accent] = e.theme_colors;
                    settings.store.primaryColor = primary;
                    settings.store.accentColor = accent;
                } else if (e.theme_colors === null) {
                    settings.store.primaryColor = 0;
                    settings.store.accentColor = 0;
                }
                delete e.theme_colors;
            }

            // Always auto encode 3y3 into bio if colors or banner are present
            const primary = settings.store.primaryColor || 0;
            const accent = settings.store.accentColor || 0;
            if (settings.store.auto3y3ProfileColors && (primary || accent || (currentBanner && currentBanner.startsWith("http")))) {
                const encoded = encode3y3(primary, accent, currentBanner?.startsWith("http") ? currentBanner : undefined);
                let bio = typeof e.bio === "string"
                    ? e.bio
                    : (UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "");
                bio = strip3y3(bio);
                e.bio = (bio.length > 0 ? bio + " " : "") + encoded;
            } else if (e.theme_colors === null) {
                let bio = typeof e.bio === "string"
                    ? e.bio
                    : (UserProfileStore.getUserProfile(currentUser.id)?.bio ?? "");
                e.bio = strip3y3(bio);
            }

            // 3. Profile effect
            if (e.profile_effect_id !== undefined && e.profile_effect_id !== null) {
                settings.store.profileEffectId = String(e.profile_effect_id);
            }
            delete e.profile_effect_id;

            // 4. Avatar decoration
            if (e.avatar_decoration_sku_id !== undefined && e.avatar_decoration_sku_id !== null) {
                const sku = typeof e.avatar_decoration_sku_id === "object"
                    ? (e.avatar_decoration_sku_id.skuId || e.avatar_decoration_sku_id.id)
                    : e.avatar_decoration_sku_id;
                if (sku) settings.store.avatarDecorationSkuId = String(sku);
            }
            delete e.avatar_decoration_sku_id;

            // 5. Display name styles (prevent Discord 400 Bad Request on saving)
            if (e.display_name_styles !== undefined && e.display_name_styles !== null) {
                settings.store.displayNameStyles = JSON.stringify(e.display_name_styles);
                this.applyDisplayNameStylesGlobally(e.display_name_styles);
                delete e.display_name_styles;
            }
            if (e.displayNameStyles !== undefined && e.displayNameStyles !== null) {
                settings.store.displayNameStyles = JSON.stringify(e.displayNameStyles);
                this.applyDisplayNameStylesGlobally(e.displayNameStyles);
                delete e.displayNameStyles;
            }
            delete e.display_name_font_id;
            delete e.display_name_effect_id;
            delete e.display_name_colors;

            this.updateDynamicStyles();
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
                onClick={e => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
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

            const rawStyles = tryItOut.tryItOutDisplayNameStyles || pending.pendingDisplayNameStyles;
            if (rawStyles) {
                settings.store.displayNameStyles = JSON.stringify(rawStyles);
                this.applyDisplayNameStylesGlobally(rawStyles);
            }

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
                    (profile as any).hasBanner = true;
                }
            }

            // 5. Update dynamic styles
            this.updateDynamicStyles();

            // 6. Close try-it-out preview notice & pending changes
            FluxDispatcher.dispatch({ type: "USER_PROFILE_SETTINGS_RESET_TRY_IT_OUT_CHANGES" });
            FluxDispatcher.dispatch({ type: "USER_PROFILE_SETTINGS_RESET_PENDING_CHANGES" });

            showToast("✨ YagmurDiscord: Profiliniz (Afiş, Renkler ve Efektler) ücretsiz olarak başarıyla kaydedildi!", Toasts.Type.SUCCESS);
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] saveAndApplyTryItOut error:", err);
            showToast("Kaydedilirken bir hata oluştu.", Toasts.Type.FAILURE);
        }
    },

    modalObserver: null as MutationObserver | null,

    extractStyleFromModal(dialog: HTMLElement): any {
        try {
            // A. Inspect React Fiber on dialog and elements
            const elementsToInspect = [
                dialog,
                dialog.querySelector('[class*="preview"]'),
                dialog.querySelector('[class*="card_"]'),
                dialog.querySelector('[class*="footer_"]'),
                ...Array.from(dialog.querySelectorAll("button"))
            ].filter(Boolean) as HTMLElement[];

            for (const el of elementsToInspect) {
                const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
                if (!fiberKey) continue;
                let fiber = (el as any)[fiberKey];
                let depth = 0;
                while (fiber && depth < 25) {
                    depth++;
                    const props = fiber.memoizedProps;
                    if (props) {
                        if (props.displayNameStyles && props.displayNameStyles.fontId !== undefined) {
                            return props.displayNameStyles;
                        }
                        if (props.fontId !== undefined && props.effectId !== undefined) {
                            return {
                                fontId: props.fontId,
                                effectId: props.effectId,
                                colors: Array.isArray(props.colors) ? props.colors : [0xd042f5]
                            };
                        }
                    }
                    let hook = fiber.memoizedState;
                    while (hook) {
                        const s = hook.memoizedState;
                        if (s && typeof s === "object") {
                            if (s.fontId !== undefined && s.effectId !== undefined) {
                                return s;
                            }
                        }
                        hook = hook.next;
                    }
                    fiber = fiber.return;
                }
            }

            // B. Fallback: Parse directly from DOM visual selections!
            // 1. Font index
            const fontButtons = Array.from(dialog.querySelectorAll<HTMLElement>("button, [role=\"button\"]")).filter(b => {
                const text = b.innerText?.trim();
                return text === "Gg" || text === "G" || text === "qg";
            });
            let chosenFontId = 1;
            fontButtons.forEach((btn, idx) => {
                const html = btn.outerHTML;
                const style = window.getComputedStyle(btn);
                if (html.includes("selected") || html.includes("active") || btn.getAttribute("aria-checked") === "true" || style.borderColor.includes("rgb(88, 101, 242)") || style.borderColor.includes("rgb(255,") || btn.querySelector('[class*="indicator"], [class*="selected"], [class*="dot"]')) {
                    chosenFontId = idx + 1;
                }
            });

            // 2. Effect index
            const effectNames = ["Sabit", "Gradyan", "Neon", "Çizgi Film", "Pop", "Şekercik", "Prizma"];
            const effectNamesEn = ["Static", "Gradient", "Neon", "Comic", "Pop", "Candy", "Prism"];
            let chosenEffectId = 3; // Default to Neon
            for (let i = 0; i < effectNames.length; i++) {
                const trName = effectNames[i];
                const enName = effectNamesEn[i];
                const btn = Array.from(dialog.querySelectorAll<HTMLElement>("button, [role=\"button\"]")).find(b => {
                    const t = b.innerText?.trim();
                    return t === trName || t === enName;
                });
                if (btn) {
                    const html = btn.outerHTML;
                    const style = window.getComputedStyle(btn);
                    if (html.includes("selected") || html.includes("active") || btn.getAttribute("aria-checked") === "true" || (style.borderColor !== "transparent" && !style.borderColor.includes("rgba(0, 0, 0, 0)"))) {
                        chosenEffectId = i + 1;
                    }
                }
            }

            // 3. Color: Look for color circle with checkmark SVG
            let chosenColors = [0xd042f5]; // default purple
            const colorButtons = Array.from(dialog.querySelectorAll<HTMLElement>('[role="button"], button')).filter(b => {
                return b.querySelector("svg") && (b.style.backgroundColor || b.getAttribute("style")?.includes("background"));
            });
            for (const btn of colorButtons) {
                if (btn.querySelector('svg path[d*="M"], svg [d*="m"], [class*="check"]')) {
                    const bg = btn.style.backgroundColor;
                    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    if (match) {
                        const r = parseInt(match[1], 10);
                        const g = parseInt(match[2], 10);
                        const b = parseInt(match[3], 10);
                        const intCol = (r << 16) | (g << 8) | b;
                        chosenColors = [intCol];
                    }
                }
            }

            return {
                fontId: chosenFontId,
                effectId: chosenEffectId,
                colors: chosenColors
            };
        } catch (e) {
            console.error("[YagmurMelekNitroEffects] extractStyleFromModal error:", e);
            return {
                fontId: 1,
                effectId: 3,
                colors: [0xd042f5]
            };
        }
    },

    applyDisplayNameStylesGlobally(style: any) {
        if (!style) return;
        try {
            const current = UserStore.getCurrentUser();
            if (current) {
                current.displayNameStyles = style;
                current.premiumType = 2;
            }

            if (current) {
                const profile = UserProfileStore.getUserProfile(current.id);
                if (profile) {
                    (profile as any).displayNameStyles = style;
                    profile.premiumType = 2;
                    if ((profile as any).user) {
                        (profile as any).user.displayNameStyles = style;
                        (profile as any).user.premiumType = 2;
                    }
                }
            }

            this.updateDynamicStyles();

            FluxDispatcher.dispatch({
                type: "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES",
                pendingDisplayNameStyles: style
            });
            FluxDispatcher.dispatch({
                type: "CURRENT_USER_UPDATE",
                user: current
            });
            UserProfileStore.emitChange?.();
            UserStore.emitChange?.();
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] applyDisplayNameStylesGlobally error:", err);
        }
    },

    saveAndApplyDisplayNameStyle(picked?: any) {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            let style = picked;

            // 1. Try to extract style directly from the open modal
            if (!style) {
                const dialog = document.querySelector<HTMLElement>('[role="dialog"], [class*="modal_"]');
                if (dialog) {
                    style = this.extractStyleFromModal(dialog);
                }
            }

            // 2. Try UserProfileSettingsStore
            if (!style) {
                try {
                    const store = ((window as any).Vencord?.Webpack?.findStore?.("UserProfileSettingsStore")
                        || ((window as any).Vencord?.Webpack?.wreq?.("836602") as any)?.A);
                    const tryItOut = store?.getTryItOutChanges?.() || {};
                    const pending = store?.getPendingChanges?.() || {};
                    style = tryItOut.tryItOutDisplayNameStyles || pending.pendingDisplayNameStyles;
                } catch { }
            }

            // 3. Fallback to settings.store or default Neon Purple
            if (!style && settings.store.displayNameStyles) {
                try {
                    style = JSON.parse(settings.store.displayNameStyles);
                } catch { }
            }

            if (!style) {
                style = {
                    fontId: 1,
                    effectId: 3, // Neon
                    colors: [0xd042f5] // Purple
                };
            }

            settings.store.displayNameStyles = JSON.stringify(style);
            this.applyDisplayNameStylesGlobally(style);

            try {
                closeModal("display-name-styles-modal");
            } catch { }

            setTimeout(() => {
                const closeBtn = document.querySelector<HTMLElement>('[role="dialog"] [aria-label*="Kapat" i], [role="dialog"] [aria-label*="Close" i]');
                if (closeBtn) {
                    closeBtn.click();
                }
            }, 60);

            showToast("✨ YagmurDiscord: Görünen ad stiliniz nitrosuz olarak başarıyla uygulandı ve sabitlendi!", Toasts.Type.SUCCESS);
        } catch (err) {
            console.error("[YagmurMelekNitroEffects] saveAndApplyDisplayNameStyle error:", err);
            showToast("Görünen ad stili kaydedilirken bir hata oluştu.", Toasts.Type.FAILURE);
        }
    },

    updateDynamicStyles() {
        try {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;
            const currentId = currentUser.id;

            let styleEl = document.getElementById("ym-nitro-dynamic-styles") as HTMLStyleElement;
            if (!styleEl) {
                styleEl = document.createElement("style");
                styleEl.id = "ym-nitro-dynamic-styles";
                document.head.appendChild(styleEl);
            }

            let css = "";

            // 1. Banner style
            const banner = settings.store.customBanner;
            if (banner) {
                css += `
[data-user-id="${currentId}"] [class*="banner_"]:not([class*="settings_"]),
[class*="userProfile_"] [data-user-id="${currentId}"] [class*="banner_"],
[class*="userPopout_"] [class*="banner_"]:not([class*="settings_"]) {
    background-image: url("${banner}") !important;
    background-size: cover !important;
    background-position: center !important;
    min-height: 120px !important;
}
`;
            }

            // 2. Display Name Styles
            let styles: any = null;
            if (settings.store.displayNameStyles) {
                try { styles = JSON.parse(settings.store.displayNameStyles); } catch { }
            }
            if (styles) {
                const colorHex = styles.colors?.[0] ? "#" + styles.colors[0].toString(16).padStart(6, "0") : "#d042f5";
                const effectId = styles.effectId ?? 3;

                if (effectId === 3) { // Neon
                    css += `
[data-user-id="${currentId}"] [class*="username_"],
[data-user-id="${currentId}"] [class*="userTag"] [class*="name_"],
[class*="userPopout_"] [class*="nickname_"],
[class*="userProfile_"] [class*="nickname_"] {
    color: #ffffff !important;
    text-shadow: 0 0 4px ${colorHex}, 0 0 10px ${colorHex}, 0 0 18px ${colorHex}, 0 0 30px ${colorHex} !important;
    font-weight: 700 !important;
    letter-spacing: 0.5px !important;
}
`;
                } else if (effectId === 2) { // Gradyan
                    const color2 = styles.colors?.[1] ? "#" + styles.colors[1].toString(16).padStart(6, "0") : "#ffffff";
                    css += `
[data-user-id="${currentId}"] [class*="username_"],
[data-user-id="${currentId}"] [class*="userTag"] [class*="name_"],
[class*="userPopout_"] [class*="nickname_"],
[class*="userProfile_"] [class*="nickname_"] {
    background: linear-gradient(90deg, ${colorHex}, ${color2}) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    font-weight: 700 !important;
}
`;
                } else if (effectId === 7) { // Prizma
                    css += `
[data-user-id="${currentId}"] [class*="username_"],
[data-user-id="${currentId}"] [class*="userTag"] [class*="name_"],
[class*="userPopout_"] [class*="nickname_"],
[class*="userProfile_"] [class*="nickname_"] {
    background: linear-gradient(90deg, #ff0055, #ffaa00, #33cc33, #0099ff, #cc00ff) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    font-weight: 700 !important;
}
`;
                } else { // Static
                    css += `
[data-user-id="${currentId}"] [class*="username_"],
[data-user-id="${currentId}"] [class*="userTag"] [class*="name_"],
[class*="userPopout_"] [class*="nickname_"],
[class*="userProfile_"] [class*="nickname_"] {
    color: ${colorHex} !important;
    font-weight: 700 !important;
}
`;
                }
            }

            styleEl.textContent = css;
        } catch (e) {
            console.error("[YagmurMelekNitroEffects] updateDynamicStyles error:", e);
        }
    },

    setupModalButtonInjector() {
        if (this.modalObserver) return;
        const checkAndInject = () => {
            const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"], [class*="modal_"], [class*="root_"]');
            for (const dialog of dialogs) {
                const text = dialog.textContent || "";
                const isDisplayNameModal = text.includes("Görünen Ad Stili") ||
                    text.includes("Display Name Style") ||
                    text.includes("Beni Şaşırt") ||
                    text.includes("Surprise Me");

                if (isDisplayNameModal) {
                    const footer = dialog.querySelector<HTMLElement>('[class*="footer_"], footer');
                    if (footer && !footer.querySelector("#ym-nitrosuz-kullan-btn")) {
                        const btn = document.createElement("button");
                        btn.id = "ym-nitrosuz-kullan-btn";
                        btn.type = "button";
                        btn.className = "ym-nitro-style-apply-btn";
                        btn.innerHTML = "✨ Nitrosuz Kullan";
                        btn.title = "Seçilen yazı tipi, efekt ve renkleri Nitrosuz olarak uygula ve sabitle";
                        btn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.saveAndApplyDisplayNameStyle();
                        };

                        const actionButtons = footer.querySelectorAll<HTMLElement>("button");
                        if (actionButtons.length > 0) {
                            const lastBtn = actionButtons[actionButtons.length - 1];
                            lastBtn.parentNode?.insertBefore(btn, lastBtn);
                        } else {
                            footer.appendChild(btn);
                        }
                    }
                }
            }
        };

        let scheduled = false;
        const debouncedCheck = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                checkAndInject();
            });
        };

        this.modalObserver = new MutationObserver(debouncedCheck);
        this.modalObserver.observe(document.body, { childList: true, subtree: true });
        debouncedCheck();
    },

    fluxListener: null as ((action: any) => void) | null,

    start() {
        this.applyToCurrentUser();
        this.updateDynamicStyles();
        this.setupModalButtonInjector();

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
                case "USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_DISPLAY_NAME_STYLES":
                    this.onSetTryItOutDisplayNameStyles(action.displayNameStyles);
                    break;
                case "USER_PROFILE_SETTINGS_SET_PENDING_CHANGES":
                    this.onSetPendingChanges(action);
                    break;
                case "USER_PROFILE_SETTINGS_SUBMIT":
                case "USER_PROFILE_SETTINGS_SUBMIT_SUCCESS":
                case "USER_PROFILE_UPDATE_SUCCESS":
                    this.onSubmitOrSuccess();
                    break;
                case "CONNECTION_OPEN":
                case "CURRENT_USER_UPDATE":
                    this.applyToCurrentUser();
                    this.updateDynamicStyles();
                    break;
            }
        };

        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_BANNER", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_THEME_COLORS", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_AVATAR_DECORATION", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_PROFILE_EFFECT", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_DISPLAY_NAME_STYLES", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SUBMIT", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_SETTINGS_SUBMIT_SUCCESS", this.fluxListener);
        FluxDispatcher.subscribe("USER_PROFILE_UPDATE_SUCCESS", this.fluxListener);
        FluxDispatcher.subscribe("CURRENT_USER_UPDATE", this.fluxListener);
        FluxDispatcher.subscribe("CONNECTION_OPEN", this.fluxListener);
    },

    stop() {
        if (this.modalObserver) {
            this.modalObserver.disconnect();
            this.modalObserver = null;
        }
        document.querySelector("#ym-nitrosuz-kullan-btn")?.remove();
        document.getElementById("ym-nitro-dynamic-styles")?.remove();

        if (this.fluxListener) {
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_BANNER", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_THEME_COLORS", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_AVATAR_DECORATION", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_PROFILE_EFFECT", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_TRY_IT_OUT_DISPLAY_NAME_STYLES", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SET_PENDING_CHANGES", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SUBMIT", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_SETTINGS_SUBMIT_SUCCESS", this.fluxListener);
            FluxDispatcher.unsubscribe("USER_PROFILE_UPDATE_SUCCESS", this.fluxListener);
            FluxDispatcher.unsubscribe("CURRENT_USER_UPDATE", this.fluxListener);
            FluxDispatcher.unsubscribe("CONNECTION_OPEN", this.fluxListener);
            this.fluxListener = null;
        }
    }
});
