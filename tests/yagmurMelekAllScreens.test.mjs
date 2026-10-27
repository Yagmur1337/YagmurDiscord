import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateLayout } from "../src/plugins/yagmurMelekAllScreens/engine.ts";

test("horizontal layout calculates exact panoramic side-by-side dimensions for 3 screens", () => {
    const screens = [
        { width: 1920, height: 1080 },
        { width: 1920, height: 1080 },
        { width: 1680, height: 1050 }
    ];

    const result = calculateLayout(screens, "horizontal");

    assert.equal(result.maxHeight, 1080);
    assert.equal(result.rects.length, 3);

    // Screen 1
    assert.equal(result.rects[0].x, 0);
    assert.equal(result.rects[0].y, 0);
    assert.equal(result.rects[0].width, 1920);
    assert.equal(result.rects[0].height, 1080);

    // Screen 2
    assert.equal(result.rects[1].x, 1920);
    assert.equal(result.rects[1].y, 0);
    assert.equal(result.rects[1].width, 1920);
    assert.equal(result.rects[1].height, 1080);

    // Screen 3 (scaled to matching 1080 height maintaining 1680/1050 aspect ratio: 1.6 * 1080 = 1728)
    assert.equal(result.rects[2].x, 3840);
    assert.equal(result.rects[2].y, 0);
    assert.equal(result.rects[2].width, 1728);
    assert.equal(result.rects[2].height, 1080);

    assert.equal(result.totalWidth, 1920 + 1920 + 1728);
});

test("grid layout arranges screens in a balanced matrix", () => {
    const screens = [
        { width: 1920, height: 1080 },
        { width: 1920, height: 1080 },
        { width: 1920, height: 1080 },
        { width: 1920, height: 1080 }
    ];

    const result = calculateLayout(screens, "grid");

    assert.equal(result.totalWidth, 1920 * 2);
    assert.equal(result.maxHeight, 1080 * 2);
    assert.equal(result.rects.length, 4);

    assert.deepEqual(result.rects[0], { x: 0, y: 0, width: 1920, height: 1080 });
    assert.deepEqual(result.rects[1], { x: 1920, y: 0, width: 1920, height: 1080 });
    assert.deepEqual(result.rects[2], { x: 0, y: 1080, width: 1920, height: 1080 });
    assert.deepEqual(result.rects[3], { x: 1920, y: 1080, width: 1920, height: 1080 });
});

test("calculateLayout handles empty array gracefully", () => {
    const result = calculateLayout([]);
    assert.equal(result.totalWidth, 1920);
    assert.equal(result.maxHeight, 1080);
    assert.equal(result.rects.length, 0);
});
