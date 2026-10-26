import test from "node:test";
import assert from "node:assert/strict";

test("module 202639 leadingAction regex matches Önizlemeden Çık and leaves modal dialogs untouched", () => {
    // 1. Bottom preview notice bar (has leadingAction m)
    const floatingNoticeCode = 'children:[(0,i.jsx)(d.E,{variant:a??"text-sm/medium",color:"text-strong",className:E.tD,children:n}),null!=m&&(0,i.jsx)("div",{className:E.Zv,children:m}),"string"==typeof A?(0,i.jsx)(c.A,{size:"sm"}):A]';
    
    const regex = /null!=(\i)&&\(0,(\i)\.jsx\)\("div",\{className:(\i\.\i),children:\1\}\)/;
    const canonRegex = new RegExp(regex.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');

    assert.ok(canonRegex.test(floatingNoticeCode), "Must match when leadingAction m is present in floating notice bar");
    
    const replaced = floatingNoticeCode.replace(canonRegex, 'null!=$1&&(0,$2.jsxs)("div",{className:$3,children:[$1,$self.renderContinueFreeButton()]})');
    assert.ok(replaced.includes('null!=m&&(0,i.jsxs)("div",{className:E.Zv,children:[m,$self.renderContinueFreeButton()]})'));

    // 2. Modal dialog upsell (has NO leadingAction m)
    const modalDialogCode = 'children:[(0,i.jsx)(d.E,{variant:a??"text-sm/medium",color:"text-strong",className:E.tD,children:n}),"string"==typeof A?(0,i.jsx)(c.A,{size:"sm"}):A]';
    assert.equal(canonRegex.test(modalDialogCode), false, "Must NOT match in modal dialogs where leadingAction is absent");
});

test("Patch 1 and Patch 2 ensure valid spacing and never produce returnVencord", () => {
    const minifiedMod1 = 'emPremiumPerks:function(e){return(0,p.RM)(p.x,e)},canUsePremiumProfileCustomization:function(e){return(0,p.RM)(p.cS,e)}';
    const r1 = /canUsePremiumProfileCustomization:function\((\i)\)\{return\s*/g;
    const canonR1 = new RegExp(r1.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    const replaced1 = minifiedMod1.replace(canonR1, 'canUsePremiumProfileCustomization:function($1){return $self.isCurrentUser($1?.id)||');
    
    assert.equal(replaced1.includes("return$self"), false, "Must never concatenate return and $self into return$self");
    assert.ok(replaced1.includes("return $self.isCurrentUser"), "Must include return followed by a space and $self");

    const minifiedMod2 = 'get canUsePremiumProfileCustomization(){return d.Ay.isPremiumAtLeast(this.premiumType,u.PremiumTypes.TIER_2)}';
    const r2 = /get canUsePremiumProfileCustomization\(\)\{return\s*/g;
    const canonR2 = new RegExp(r2.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    const replaced2 = minifiedMod2.replace(canonR2, 'get canUsePremiumProfileCustomization(){return $self.isCurrentUser(this?.userId)||');
    
    assert.equal(replaced2.includes("return$self"), false, "Must never concatenate return and $self into return$self");
    assert.ok(replaced2.includes("return $self.isCurrentUser"), "Must include return followed by a space and $self");
});

test("Patch 1 unlocks canUseCollectibles and canUseAnimatedAvatar for current user", () => {
    const minified = 'canUseCustomBackgrounds:function(e){return(0,p.RM)(p.Zc,e)},canUseCollectibles:eQ,canUseMonthlyOrbs:function(e){return(0,m.Nh)(e?.perks,u.bb.MONTHLY_ORBS)},canUseAnimatedAvatar:function(e){return(0,p.RM)(p.OW,e)}';
    
    const rColl = /canUseCollectibles:(\i),/g;
    const canonRColl = new RegExp(rColl.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    const repColl = minified.replace(canonRColl, 'canUseCollectibles:function(u){return $self.isCurrentUser(u?.id)||$1(u)},');
    
    assert.ok(repColl.includes('canUseCollectibles:function(u){return $self.isCurrentUser(u?.id)||eQ(u)},'));

    const rAnim = /canUseAnimatedAvatar:function\((\i)\)\{return\s*/g;
    const canonRAnim = new RegExp(rAnim.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    const repAnim = repColl.replace(canonRAnim, 'canUseAnimatedAvatar:function($1){return $self.isCurrentUser($1?.id)||');
    
    assert.ok(repAnim.includes('canUseAnimatedAvatar:function(e){return $self.isCurrentUser(e?.id)||(0,p.RM)(p.OW,e)}'));
});

test("Patch 6 overrides hasTryItOutChanges to prevent Discord from collapsing 5 cards", () => {
    const storeCode = 'getPendingChanges(e){return h[e??l.ME]??u}getTryItOutChanges(){return f}hasTryItOutChanges(){return Object.values(f).some(e=>void 0!==e)}hasUnsavedChanges(){return Object.values(h).some(e=>Object.values(e).some(e=>void 0!==e))}';
    
    const rStore = /hasTryItOutChanges\(\)\{return\s*Object\.values\(\i\)\.some\(\i=>void 0!==\i\)\}/;
    const canonRStore = new RegExp(rStore.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    const replaced = storeCode.replace(canonRStore, 'hasTryItOutChanges(){return false}');

    assert.ok(replaced.includes('hasTryItOutChanges(){return false}'));
    assert.ok(replaced.includes('getTryItOutChanges(){return f}'), "getTryItOutChanges must remain untouched");
});

test("Patch 7 UserProfileStore hook matches getUserProfile", () => {
    const userProfileStoreCode = 'getUserProfile(e){return v.get(e)}getGuildMemberProfile(e,t){return null==t?null:b.get(e)?.get(t)??null}';
    const rProfile = /(?<=getUserProfile\(\i\){return )(.+?)(?=})/;
    const canonRProfile = new RegExp(rProfile.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'));

    assert.ok(canonRProfile.test(userProfileStoreCode), "Must match getUserProfile implementation");
    const replaced = userProfileStoreCode.replace(canonRProfile, '$self.userProfileHook($1)');
    assert.ok(replaced.includes('getUserProfile(e){return $self.userProfileHook(v.get(e))}'));
});

test("Patch 8 strips restricted fields from Account Save payload in module 631670", () => {
    const mod631670Code = 'void 0!==I&&(R.avatar_decoration_sku_id=I?.skuId??null),void 0!==g&&(R.nameplate_sku_id=g?.skuId??null),void 0!==S&&(R.primary_guild_id=S),null!=N?(R.display_name_font_id=N.fontId,R.display_name_effect_id=N.effectId,R.display_name_colors=N.colors):null===N&&(R.display_name_font_id=null,R.display_name_effect_id=null,R.display_name_colors=null),void 0!==C&&(R.typing_indicator_style=null!=C?(0,o.El)(C):null);';

    const rDeco = new RegExp(/void 0!==(\i)&&\((\i)\.avatar_decoration_sku_id=\1\?\.skuId\?\?null\),/g.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    const rNameplate = new RegExp(/void 0!==(\i)&&\((\i)\.nameplate_sku_id=\1\?\.skuId\?\?null\),/g.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    const rStyles = new RegExp(/null!=(\i)\?\((\i)\.display_name_font_id=\1\.fontId,\2\.display_name_effect_id=\1\.effectId,\2\.display_name_colors=\1\.colors\):null===\1&&\((\i)\.display_name_font_id=null,\3\.display_name_effect_id=null,\3\.display_name_colors=null\),/g.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');

    assert.ok(rDeco.test(mod631670Code));
    assert.ok(rNameplate.test(mod631670Code));
    assert.ok(rStyles.test(mod631670Code));

    let replaced = mod631670Code.replace(rDeco, '$self.handleAccountDecoration($1);$2.avatar_decoration_sku_id=void 0,');
    replaced = replaced.replace(rNameplate, '$self.handleAccountNameplate($1);$2.nameplate_sku_id=void 0,');
    replaced = replaced.replace(rStyles, '$self.handleAccountDisplayNameStyles($1);');

    assert.ok(replaced.includes('$self.handleAccountDecoration(I);R.avatar_decoration_sku_id=void 0,'));
    assert.ok(replaced.includes('$self.handleAccountNameplate(g);R.nameplate_sku_id=void 0,'));
    assert.ok(replaced.includes('$self.handleAccountDisplayNameStyles(N);'));
});


