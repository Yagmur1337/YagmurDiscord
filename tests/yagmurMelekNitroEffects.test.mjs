import test from "node:test";
import assert from "node:assert/strict";

test("module 202639 leadingAction regex matches Önizlemeden Çık and leaves modal dialogs untouched", () => {
    // 1. Bottom preview notice bar (has leadingAction m)
    const floatingNoticeCode = 'children:[(0,i.jsx)(d.E,{variant:a??"text-sm/medium",color:"text-strong",className:E.tD,children:n}),null!=m&&(0,i.jsx)("div",{className:E.Zv,children:m}),"string"==typeof A?(0,i.jsx)(c.A,{size:"sm"}):A]';
    
    const regex = /null!=(\i)&&\(0,(\i)\.jsx\)\("div",\{className:(\i\.\i),children:\1\}\)/;
    const canonRegex = new RegExp(regex.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');

    assert.ok(canonRegex.test(floatingNoticeCode), "Must match when leadingAction m is present in floating notice bar");
    
    const replaced = floatingNoticeCode.replace(canonRegex, 'null!=$1&&$self.renderContinueFreeLeadingAction($1,$3)');
    assert.ok(replaced.includes('null!=m&&$self.renderContinueFreeLeadingAction(m,E.Zv)'));

    // 2. Modal dialog upsell (has NO leadingAction m)
    const modalDialogCode = 'children:[(0,i.jsx)(d.E,{variant:a??"text-sm/medium",color:"text-strong",className:E.tD,children:n}),"string"==typeof A?(0,i.jsx)(c.A,{size:"sm"}):A]';
    assert.equal(canonRegex.test(modalDialogCode), false, "Must NOT match in modal dialogs where leadingAction is absent");
});
