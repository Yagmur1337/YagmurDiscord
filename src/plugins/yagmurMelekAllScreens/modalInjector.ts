/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    createCompositeThumbnail,
    getActiveSession,
    getDetectedScreens,
    isStreamingAllScreens,
    startCompositeStream,
    stopCompositeStream
} from "./engine";
import type { ScreenLayout, ScreenSource } from "./types";

let observer: MutationObserver | null = null;
let currentCustomPanel: HTMLElement | null = null;
let nativeContentEl: HTMLElement | null = null;
let activeTabEl: HTMLElement | null = null;

const TAB_ID = "yagmurmelek-allscreens-tab";
const PANEL_ID = "yagmurmelek-allscreens-modal-panel";

function findModalTabBar(): HTMLElement | null {
    // Look for container with tabs having "Uygulamalar" / "Applications" and "Tüm Ekran" / "Screens"
    const candidates = document.querySelectorAll<HTMLElement>("[role='tablist'], div[class*='tabBar'], div[class*='segmentedControl']");
    for (const el of Array.from(candidates)) {
        const text = el.textContent || "";
        if ((text.includes("Uygulamalar") || text.includes("Applications")) &&
            (text.includes("Tüm Ekran") || text.includes("Screens") || text.includes("Ekranlar"))) {
            return el;
        }
    }

    // Fallback: search any flex container with buttons containing both text strings
    const allDivs = document.querySelectorAll<HTMLElement>("div[class*='container_'], div[class*='header_']");
    for (const div of Array.from(allDivs)) {
        const text = div.textContent || "";
        if ((text.includes("Uygulamalar") || text.includes("Applications")) &&
            (text.includes("Tüm Ekran") || text.includes("Screens"))) {
            const childWithTabs = Array.from(div.children).find(c => {
                const ct = c.textContent || "";
                return (ct.includes("Uygulamalar") || ct.includes("Applications")) && (ct.includes("Tüm Ekran") || ct.includes("Screens"));
            });
            if (childWithTabs instanceof HTMLElement) return childWithTabs;
            return div;
        }
    }

    return null;
}

function findNativeContentContainer(tabBar: HTMLElement): HTMLElement | null {
    // Usually the sibling or cousin right below the tabBar or inside modal body
    const modal = tabBar.closest<HTMLElement>("[role='dialog'], [class*='modal_'], [class*='root_']");
    if (!modal) return null;

    const contentScroller = modal.querySelector<HTMLElement>("[class*='scroller_'], [class*='content_'], [class*='body_']");
    if (contentScroller && contentScroller !== tabBar && !contentScroller.contains(tabBar)) {
        return contentScroller;
    }

    // Sibling of tabBar parent
    let sibling = tabBar.nextElementSibling as HTMLElement | null;
    while (sibling) {
        if (sibling.id !== PANEL_ID && sibling.offsetHeight > 40) return sibling;
        sibling = sibling.nextElementSibling as HTMLElement | null;
    }

    return null;
}

function renderPanelContent(panel: HTMLElement) {
    const isStreaming = isStreamingAllScreens();
    const session = getActiveSession();

    panel.innerHTML = `
        <div class="yagmurmelek-allscreens" style="padding: 12px 16px;">
            <div class="yagmurmelek-allscreens-header" style="margin-bottom: 12px;">
                <div class="yagmurmelek-allscreens-title" style="font-size: 16px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="5" width="5.5" height="11" rx="1" />
                        <rect x="9.25" y="5" width="5.5" height="11" rx="1" />
                        <rect x="16.5" y="5" width="5.5" height="11" rx="1" />
                        <line x1="4" y1="19" x2="20" y2="19" />
                        <line x1="12" y1="16" x2="12" y2="19" />
                    </svg>
                    <span>Tüm Ekranları Paylaş</span>
                    <span class="yagmurmelek-allscreens-badge">WhatsApp Modu</span>
                </div>
                ${isStreaming ? `
                    <div class="yagmurmelek-allscreens-live-indicator">
                        <span class="yagmurmelek-allscreens-live-dot"></span>
                        <span>CANLI YAYINDA</span>
                    </div>
                ` : ""}
            </div>

            <div class="yagmurmelek-allscreens-preview-container" style="min-height: 180px; margin-bottom: 12px;">
                <div id="yagmurmelek-modal-preview-box" class="yagmurmelek-allscreens-preview-box" style="height: 170px;">
                    <div class="yagmurmelek-allscreens-preview-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="margin-bottom: 6px; opacity: 0.6;">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <div id="yagmurmelek-preview-status">Tüm monitörleriniz yan yana panoramik tek yayında toplanıyor...</div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-muted, #949ba4); display: block; margin-bottom: 6px;">
                    Algılanan Monitörler:
                </label>
                <div id="yagmurmelek-modal-screens-chips" class="yagmurmelek-allscreens-screens-list">
                    <span style="font-size: 12px; color: var(--text-muted);">Taranıyor...</span>
                </div>
            </div>

            <div class="yagmurmelek-allscreens-options" style="margin-bottom: 12px;">
                <div class="yagmurmelek-allscreens-option-group">
                    <label>Görünüm Düzeni</label>
                    <select id="yagmurmelek-modal-layout" class="yagmurmelek-allscreens-select" ${isStreaming ? "disabled" : ""}>
                        <option value="horizontal" selected>Yanyana Panoramik (WhatsApp Modu - Önerilen)</option>
                        <option value="grid">Izgara (Grid 2x2)</option>
                    </select>
                </div>

                <div class="yagmurmelek-allscreens-option-group">
                    <label>Yayın Kare Hızı (FPS)</label>
                    <select id="yagmurmelek-modal-fps" class="yagmurmelek-allscreens-select" ${isStreaming ? "disabled" : ""}>
                        <option value="60" selected>60 FPS (Akıcı - Önerilen)</option>
                        <option value="30">30 FPS (Standart)</option>
                    </select>
                </div>
            </div>

            <div id="yagmurmelek-modal-msg" style="display: none; font-size: 12px; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px;"></div>

            <div class="yagmurmelek-allscreens-actions" style="margin-top: 4px;">
                ${!isStreaming ? `
                    <button id="yagmurmelek-btn-start-stream" class="yagmurmelek-allscreens-btn primary" style="width: 100%; justify-content: center; padding: 10px 16px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                        </svg>
                        <span>Yayını Başlat (Tüm Ekranlar)</span>
                    </button>
                ` : `
                    <button id="yagmurmelek-btn-stop-stream" class="yagmurmelek-allscreens-btn danger" style="width: 100%; justify-content: center; padding: 10px 16px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="6" y="6" width="12" height="12" fill="currentColor" />
                        </svg>
                        <span>Yayını Durdur</span>
                    </button>
                `}
            </div>
        </div>
    `;

    // Populate screens and composite preview
    getDetectedScreens().then(async (screens: ScreenSource[]) => {
        const chipsContainer = panel.querySelector<HTMLElement>("#yagmurmelek-modal-screens-chips");
        const previewBox = panel.querySelector<HTMLElement>("#yagmurmelek-modal-preview-box");

        if (chipsContainer) {
            if (screens.length > 0) {
                chipsContainer.innerHTML = screens.map((s, idx) => `
                    <div class="yagmurmelek-allscreens-screen-chip ${isStreaming ? "active" : ""}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <span>${s.name || `Ekran ${idx + 1}`}</span>
                    </div>
                `).join("");
            } else {
                chipsContainer.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">Sistemde bağlı ekran bulunamadı.</span>`;
            }
        }

        if (previewBox) {
            if (isStreaming && session?.canvas) {
                previewBox.innerHTML = "";
                const canvasClone = session.canvas;
                canvasClone.className = "yagmurmelek-allscreens-preview-canvas";
                previewBox.appendChild(canvasClone);
            } else if (screens.length > 0) {
                const compositeUrl = await createCompositeThumbnail(screens);
                if (compositeUrl) {
                    previewBox.innerHTML = `<img src="${compositeUrl}" style="max-width: 100%; max-height: 160px; object-fit: contain; border-radius: 4px;" alt="Panoramik Önizleme" />`;
                }
            }
        }
    });

    // Wire Start button
    const startBtn = panel.querySelector<HTMLButtonElement>("#yagmurmelek-btn-start-stream");
    if (startBtn) {
        startBtn.onclick = async () => {
            const layoutSelect = panel.querySelector<HTMLSelectElement>("#yagmurmelek-modal-layout");
            const fpsSelect = panel.querySelector<HTMLSelectElement>("#yagmurmelek-modal-fps");
            const msgEl = panel.querySelector<HTMLElement>("#yagmurmelek-modal-msg");

            const layout = (layoutSelect?.value || "horizontal") as ScreenLayout;
            const fps = Number(fpsSelect?.value || 60);

            try {
                startBtn.disabled = true;
                startBtn.innerText = "Yayın Başlatılıyor...";
                if (msgEl) {
                    msgEl.style.display = "none";
                }

                await startCompositeStream({
                    layout,
                    fps,
                    resolution: "source",
                    includeAudio: false
                });

                renderPanelContent(panel);
            } catch (err: any) {
                startBtn.disabled = false;
                startBtn.innerHTML = `<span>Yayını Başlat (Tüm Ekranlar)</span>`;
                if (msgEl) {
                    msgEl.style.display = "block";
                    msgEl.style.background = "rgba(242, 63, 67, 0.15)";
                    msgEl.style.color = "#f23f43";
                    msgEl.innerText = err?.message || "Yayın başlatılırken bir sorun oluştu.";
                }
            }
        };
    }

    // Wire Stop button
    const stopBtn = panel.querySelector<HTMLButtonElement>("#yagmurmelek-btn-stop-stream");
    if (stopBtn) {
        stopBtn.onclick = () => {
            stopCompositeStream();
            renderPanelContent(panel);
        };
    }
}

function handleTabClick(customTab: HTMLElement, tabBar: HTMLElement) {
    nativeContentEl = findNativeContentContainer(tabBar);

    // Unselect all other tabs
    for (const child of Array.from(tabBar.children)) {
        if (child instanceof HTMLElement && child !== customTab) {
            child.setAttribute("aria-selected", "false");
            child.classList.remove("selected_b95c02", "active", "yagmurmelek-tab-active");
            child.style.backgroundColor = "";
            child.style.color = "";
        }
    }

    // Select custom tab
    customTab.setAttribute("aria-selected", "true");
    customTab.classList.add("yagmurmelek-tab-active");
    customTab.style.backgroundColor = "var(--background-modifier-selected, rgba(255, 255, 255, 0.15))";
    customTab.style.color = "var(--interactive-active, #ffffff)";

    // Hide native content
    if (nativeContentEl) {
        nativeContentEl.style.display = "none";
    }

    // Ensure custom panel exists
    const modal = tabBar.closest<HTMLElement>("[role='dialog'], [class*='modal_'], [class*='root_']");
    if (!modal) return;

    let panel = modal.querySelector<HTMLElement>(`#${PANEL_ID}`);
    if (!panel) {
        panel = document.createElement("div");
        panel.id = PANEL_ID;
        panel.className = "yagmurmelek-allscreens-modal-panel";
        if (nativeContentEl && nativeContentEl.parentNode) {
            nativeContentEl.parentNode.insertBefore(panel, nativeContentEl.nextSibling);
        } else {
            modal.appendChild(panel);
        }
    }

    panel.style.display = "block";
    currentCustomPanel = panel;
    renderPanelContent(panel);
}

function handleNativeTabClick(customTab: HTMLElement) {
    // Restore state when user clicks native tabs (Uygulamalar, Tüm Ekran, Cihazlar)
    customTab.setAttribute("aria-selected", "false");
    customTab.classList.remove("yagmurmelek-tab-active");
    customTab.style.backgroundColor = "";
    customTab.style.color = "";

    if (currentCustomPanel) {
        currentCustomPanel.style.display = "none";
    }

    if (nativeContentEl) {
        nativeContentEl.style.display = "";
    }
}

function processTabBar(tabBar: HTMLElement) {
    if (tabBar.querySelector(`#${TAB_ID}`)) {
        return;
    }

    const tabs = Array.from(tabBar.children).filter(c => c instanceof HTMLElement) as HTMLElement[];
    if (tabs.length < 2) return;

    // Second tab is usually "Tüm Ekran" (Screens)
    const screensTab = tabs.find(t => {
        const text = t.textContent || "";
        return text.includes("Tüm Ekran") || text.includes("Screens") || text.includes("Ekranlar");
    }) || tabs[1];

    const customTab = document.createElement("button");
    customTab.id = TAB_ID;
    customTab.type = "button";
    customTab.setAttribute("role", "tab");
    customTab.setAttribute("aria-selected", "false");

    // Copy class list from existing tab button for 100% native Discord look
    if (screensTab) {
        customTab.className = screensTab.className;
    }
    customTab.classList.add("yagmurmelek-allscreens-tab-btn");

    customTab.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle;">
            <rect x="2" y="5" width="5.5" height="11" rx="1" />
            <rect x="9.25" y="5" width="5.5" height="11" rx="1" />
            <rect x="16.5" y="5" width="5.5" height="11" rx="1" />
            <line x1="4" y1="19" x2="20" y2="19" />
            <line x1="12" y1="16" x2="12" y2="19" />
        </svg>
        <span style="font-weight: 600;">Tüm Ekranları Paylaş</span>
        <span style="font-size: 10px; background: rgba(88, 101, 242, 0.25); color: #5865f2; padding: 1px 6px; border-radius: 8px; margin-left: 6px; font-weight: 700;">WhatsApp</span>
    `;

    // Insert custom tab right after Screens tab (or as third tab)
    if (screensTab.nextSibling) {
        tabBar.insertBefore(customTab, screensTab.nextSibling);
    } else {
        tabBar.appendChild(customTab);
    }

    customTab.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        handleTabClick(customTab, tabBar);
    });

    // Listen to clicks on native tabs to restore view
    for (const tab of tabs) {
        tab.addEventListener("click", () => {
            handleNativeTabClick(customTab);
        });
    }
}

export function initScreenShareModalInjector() {
    if (observer) return;

    function check() {
        const tabBar = findModalTabBar();
        if (tabBar) {
            processTabBar(tabBar);
        }
    }

    observer = new MutationObserver(() => {
        check();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    check();
}

export function cleanupScreenShareModalInjector() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }

    const tab = document.getElementById(TAB_ID);
    if (tab) tab.remove();

    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();

    if (nativeContentEl) {
        nativeContentEl.style.display = "";
        nativeContentEl = null;
    }
}
