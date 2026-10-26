import test from "node:test";
import assert from "node:assert/strict";

test("fakeNitro markdown patch matches modern Discord embed check and keeps emoji links", () => {
    // Discord bundle code for hiding embed content
    const discordMarkdownCode = 'm&&(t=N,n=(p??I).embeds,N=(0,a.k5)(n)&&(0,a.iz)((0,a.dn)(t,_))?[]:t),g||I.type===s.lAJ.MEDIA_MENTION_MESSAGE';

    const patchMatch = /(\i)=\(0,(\i)\.k5\)\((\i)\)&&\(0,\2\.iz\)\(\(0,\2\.dn\)\((\i),(\i)\)\)\?\[\]:\4/;
    const canonRegex = new RegExp(patchMatch.source.replaceAll('\\i', '(?:[A-Za-z_$][\\w$]*)'), 'g');

    assert.ok(canonRegex.test(discordMarkdownCode), "Patch regex must match modern Discord embed check");

    const replaced = discordMarkdownCode.replace(canonRegex, '$1=(0,$2.k5)($3)&&(0,$2.iz)((0,$2.dn)($4,$5))&&!$self.shouldKeepEmojiLink($4)?[]:$4');
    assert.ok(replaced.includes('N=(0,a.k5)(n)&&(0,a.iz)((0,a.dn)(t,_))&&!$self.shouldKeepEmojiLink(t)?[]:t'));
});

test("fakeNitro shouldKeepEmojiLink correctly identifies custom emoji links in various AST structures", () => {
    const fakeNitroEmojiRegex = /\/emojis\/(\d+?)\.(png|webp|gif)/;

    function shouldKeepEmojiLink(node) {
        if (!node) return false;
        if (Array.isArray(node)) {
            return node.some(n => shouldKeepEmojiLink(n));
        }
        if (node.type === "paragraph" && Array.isArray(node.content)) {
            return node.content.some(n => shouldKeepEmojiLink(n));
        }
        const target = node.target || node.props?.href || node.content;
        if (typeof target === "string" && fakeNitroEmojiRegex.test(target)) return true;
        return false;
    }

    // 1. Direct link node
    const directLink = { type: "link", target: "https://cdn.discordapp.com/emojis/123456789.webp?size=48&name=pepe" };
    assert.equal(shouldKeepEmojiLink(directLink), true);

    // 2. Paragraph containing link node
    const paragraphNode = {
        type: "paragraph",
        content: [
            { type: "link", target: "https://cdn.discordapp.com/emojis/987654321.gif?size=48&name=dance" }
        ]
    };
    assert.equal(shouldKeepEmojiLink(paragraphNode), true);

    // 3. Array of nodes
    const nodeArray = [paragraphNode];
    assert.equal(shouldKeepEmojiLink(nodeArray), true);

    // 4. Non-emoji regular link
    const regularLink = { type: "link", target: "https://google.com" };
    assert.equal(shouldKeepEmojiLink(regularLink), false);

    // 5. Normal text
    const textNode = { type: "text", content: "hello world" };
    assert.equal(shouldKeepEmojiLink(textNode), false);
});
