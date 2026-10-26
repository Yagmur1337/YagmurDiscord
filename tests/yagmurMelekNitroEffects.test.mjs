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
