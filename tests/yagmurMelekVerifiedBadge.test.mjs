import assert from 'node:assert/strict';
import { test } from 'node:test';

test('isVerifiedUser recognizes default and custom user IDs', () => {
    const DEFAULT_VERIFIED_IDS = ["93533861408944128", "1413093537444135052"];
    function isVerified(userId, extra = "") {
        if (!userId) return false;
        const clean = String(userId).trim();
        if (DEFAULT_VERIFIED_IDS.includes(clean)) return true;
        if (extra) {
            const list = extra.split(",").map(x => x.trim()).filter(Boolean);
            if (list.includes(clean)) return true;
        }
        return false;
    }

    assert.equal(isVerified("93533861408944128"), true);
    assert.equal(isVerified("1413093537444135052"), true);
    assert.equal(isVerified("1234567890"), false);
    assert.equal(isVerified(""), false);
    assert.equal(isVerified(null), false);
    assert.equal(isVerified("99999", "111, 99999, 222"), true);
    assert.equal(isVerified("88888", "111, 99999, 222"), false);
});

test('SYSTEM_TAG patch injects verified badge directly after username span', () => {
    const sampleDiscordCode = 'return(0,n.jsxs)("h3",{children:[(0,n.jsx)("span",{children:u,className:c()(props.className,d)}),clanTag,botTag]})';
    const regex = /className:\i\(\)\(\i\.className(?:,\i\.\i)?,\i\)\}\)(?:\))?,(?=\i)/;
    
    // Convert \i to identifier pattern like canonicalizeMatch does
    const canonRegex = new RegExp(regex.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');
    
    assert.ok(canonRegex.test(sampleDiscordCode), 'Patch regex must match Discord username span');
    
    const replaced = sampleDiscordCode.replace(canonRegex, '$&Vencord.Plugins.plugins.YagmurMelekVerifiedBadge.renderMessageVerifiedBadge(arguments[0]),');
    assert.ok(replaced.includes('children:[(0,n.jsx)("span",{children:u,className:c()(props.className,d)}),Vencord.Plugins.plugins.YagmurMelekVerifiedBadge.renderMessageVerifiedBadge(arguments[0]),clanTag,botTag]'));

    const sampleDiscordCodeWithThree = 'return(0,n.jsxs)("h3",{children:[(0,n.jsx)("span",{children:u,className:c()(props.className,a.b,d)}),clanTag,botTag]})';
    const replacedThree = sampleDiscordCodeWithThree.replace(canonRegex, '$&Vencord.Plugins.plugins.YagmurMelekVerifiedBadge.renderMessageVerifiedBadge(arguments[0]),');
    assert.ok(replacedThree.includes('children:[(0,n.jsx)("span",{children:u,className:c()(props.className,a.b,d)}),Vencord.Plugins.plugins.YagmurMelekVerifiedBadge.renderMessageVerifiedBadge(arguments[0]),clanTag,botTag]'));
});
