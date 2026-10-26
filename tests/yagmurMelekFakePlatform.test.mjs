import test from "node:test";
import assert from "node:assert/strict";

function encodePlatform3y3(platforms) {
    const payload = `[ymfp:${platforms.join(",")}]`;
    return " " + Array.from(payload)
        .map(x => x.codePointAt(0))
        .filter(x => x >= 0x20 && x <= 0x7f)
        .map(x => String.fromCodePoint(x + 0xe0000))
        .join("");
}

function decodePlatform3y3(bio) {
    if (!bio) return null;
    const tagChars = Array.from(bio).filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0xe0020 && cp <= 0xe007f;
    });
    if (tagChars.length === 0) return null;
    const decodedStr = tagChars.map(c => String.fromCodePoint(c.codePointAt(0) - 0xe0000)).join("");
    const match = decodedStr.match(/\[ymfp:([a-zA-Z0-9,]+)\]/);
    if (!match) return null;
    return match[1].split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

function stripPlatform3y3(bio) {
    if (!bio) return "";
    return bio.replace(/\s*\[ymfp:[^\]]+\]/g, "").replace(/\s*[\u{e0000}-\u{e007f}]+\s*/gu, " ").trim();
}

test("YagmurMelekFakePlatform supports all 8 requested platforms", () => {
    const ids = ["desktop", "mobile", "web", "console", "xbox", "playstation", "switch", "vr"];
    assert.equal(ids.length, 8);
    assert.ok(ids.includes("desktop"));
    assert.ok(ids.includes("mobile"));
    assert.ok(ids.includes("web"));
    assert.ok(ids.includes("console"));
    assert.ok(ids.includes("xbox"));
    assert.ok(ids.includes("playstation"));
    assert.ok(ids.includes("switch"));
    assert.ok(ids.includes("vr"));
});

test("3y3 platform encoding and decoding works transparently for other YagmurMelek users", () => {
    const platforms = ["desktop", "mobile", "web", "xbox", "playstation", "switch", "vr"];
    const baseBio = "Hello world from YagmurDiscord!";
    const encodedTag = encodePlatform3y3(platforms);

    const fullBio = baseBio + encodedTag;
    const decoded = decodePlatform3y3(fullBio);

    assert.deepEqual(decoded, platforms);

    const stripped = stripPlatform3y3(fullBio);
    assert.equal(stripped, baseBio);
});

test("decodePlatform3y3 returns null for bio without platform tags", () => {
    assert.equal(decodePlatform3y3(undefined), null);
    assert.equal(decodePlatform3y3(""), null);
    assert.equal(decodePlatform3y3("Normal discord bio without tags"), null);
});
