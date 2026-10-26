// YagmurMelekDc startup loader. Build directories are immutable; settings stay outside them.
const fs = require("fs");
const path = require("path");
const root = __dirname;
const stateFile = path.join(root, "update-state.json");
function save(state) {
    try {
        const temp = stateFile + ".tmp";
        fs.writeFileSync(temp, JSON.stringify(state));
        fs.renameSync(temp, stateFile);
    } catch { }
}
function entry(name) {
    if (typeof name !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+-[a-f0-9]{12}$/.test(name)) throw Error("Invalid YagmurMelekDc build");
    return path.join(root, "builds", name, "patcher.js");
}
let state = null;
try {
    state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
} catch { }

if (state) {
    if (state.pending && state.attempted && state.previous) {
        state.current = state.previous;
        state.previous = null;
        state.pending = false;
        state.rolledBack = true;
        save(state);
    }
    if (state.pending) { state.attempted = true; save(state); }
}

try {
    if (state && state.current) {
        require(entry(state.current));
    } else {
        throw Error("No active YagmurMelekDc build");
    }
} catch (error) {
    if (state && state.pending && state.previous) {
        state.current = state.previous;
        state.previous = null;
        state.pending = false;
        state.rolledBack = true;
        save(state);
        // A partially loaded patcher may already have changed Electron state.
        // Restart the process instead of loading a second patcher into that process.
        try {
            const { app } = require("electron");
            if (app && app.relaunch) {
                app.relaunch();
                app.exit(0);
            }
        } catch { }
    } else {
        // Fail-safe: instead of crashing Discord, fallback to original Discord _app.asar
        try {
            const asar = path.join(root, "..", "_app.asar");
            if (fs.existsSync(asar)) {
                require(asar);
            }
        } catch { }
    }
}
