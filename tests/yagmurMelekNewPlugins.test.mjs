import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginsRoot = path.resolve(__dirname, "../src/plugins");

const NEW_PLUGINS = [
    "yagmurMelekAllScreens",
    "yagmurMelekScreenCrop",
    "yagmurMelekScreenWatermark",
    "yagmurMelekAudioEqualizer",
    "yagmurMelekQuickClip",
    "yagmurMelekPrivacyBlur",
    "yagmurMelekAutoDeafenWhileGaming",
    "yagmurMelekSoundpadLite",
    "yagmurMelekMediaDownloader"
];

test("all new plugins must have enabledByDefault: false (user constraint)", () => {
    for (const pluginDir of NEW_PLUGINS) {
        const indexPath = path.join(pluginsRoot, pluginDir, "index.tsx");
        assert.ok(fs.existsSync(indexPath), `Plugin entry file must exist: ${indexPath}`);
        const content = fs.readFileSync(indexPath, "utf-8");
        assert.match(
            content,
            /enabledByDefault:\s*false/,
            `Plugin ${pluginDir} must have enabledByDefault: false`
        );
    }
});

test("all new plugins export a valid definePlugin configuration", () => {
    for (const pluginDir of NEW_PLUGINS) {
        const indexPath = path.join(pluginsRoot, pluginDir, "index.tsx");
        const content = fs.readFileSync(indexPath, "utf-8");
        assert.match(content, /export default definePlugin\(\{/);
        assert.match(content, /name:\s*["'][A-Za-z0-9_]+["']/);
        assert.match(content, /authors:\s*\[/);
    }
});
