"use strict";

// --- DOM Elements ---
const browseThemesBtn = document.getElementById("browse-themes-btn");
const themesEnabledToggle = document.getElementById("themes-enabled-toggle");
const communityThemesToggle = document.getElementById("community-themes-toggle");
const themesOverlay = document.getElementById("themes-overlay");
const themesGrid = document.getElementById("themes-grid");
const themesStatus = document.getElementById("themes-status");

// --- Themes ---

function getThemeFolder(idStr) {
    return /^nnt-/.test(idStr) ? `themes/community/${idStr}` : `themes/included/${idStr}`;
}

function getActiveThemeId() {
    const storedId = localStorage.getItem(STORAGE_KEYS.THEME);
    if (storedId === null) return 0;
    if (storedId === "user") return null;
    if (/^nnt-/.test(storedId)) return storedId;
    return Number(storedId);
}

function isThemeActive(idStr, activeId) {
    if (activeId === null) return false;
    if (typeof activeId === "number") return Number(idStr) === activeId;
    return idStr === activeId;
}

async function applyThemePreset(theme, themeId) {
    // Write theme settings to localStorage.
    // null/undefined = omitted (keep user value); empty string = remove key; any other value = set key.
    const set = (key, val) => {
        if (val === null || val === undefined) return;
        if (val === "") localStorage.removeItem(key);
        else localStorage.setItem(key, val);
    };

    set(STORAGE_KEYS.BG_COLOR, theme.bgColor);
    set(STORAGE_KEYS.SURFACE_COLOR, theme.surfaceColor);
    set(STORAGE_KEYS.HIGHLIGHT_COLOR, theme.highlightColor);
    set(STORAGE_KEYS.TEXT_COLOR, theme.textColor);
    set(STORAGE_KEYS.CLOCK_SIZE, theme.clockSize);
    set(STORAGE_KEYS.CLOCK_X, theme.clockX);
    set(STORAGE_KEYS.CLOCK_Y, theme.clockY);
    set(STORAGE_KEYS.SEARCH_WIDTH, theme.searchWidth);
    set(STORAGE_KEYS.SEARCH_X, theme.searchX);
    set(STORAGE_KEYS.SEARCH_Y, theme.searchY);
    set(STORAGE_KEYS.FONT_URL, theme.fontUrl);
    set(STORAGE_KEYS.FONT_FAMILY, theme.fontFamily);
    set(STORAGE_KEYS.BG_BRIGHTNESS, theme.bgBrightness);
    set(STORAGE_KEYS.TAB_NAME, theme.tabName);
    set(STORAGE_KEYS.FAVICON, theme.favicon);
    set(STORAGE_KEYS.FAVORITES_X, theme.favoritesX);
    set(STORAGE_KEYS.FAVORITES_Y, theme.favoritesY);
    set(STORAGE_KEYS.FAVORITES_LAYOUT, theme.favoritesLayout);

    let bgEnabled = theme.bgImageEnabled !== false;
    if (theme.bgImageEnabled !== null && theme.bgImageEnabled !== undefined) {
        storeBool(STORAGE_KEYS.BG_IMAGE_ENABLED, bgEnabled);
    } else {
        bgEnabled = loadBool(STORAGE_KEYS.BG_IMAGE_ENABLED, true);
    }

    if (theme.favoritesEnabled !== null && theme.favoritesEnabled !== undefined) {
        storeBool(STORAGE_KEYS.FAVORITES_ENABLED, theme.favoritesEnabled);
    }

    if (theme.favoritesShowAddBtn !== null && theme.favoritesShowAddBtn !== undefined) {
        storeBool(STORAGE_KEYS.FAVORITES_SHOW_ADD_BTN, theme.favoritesShowAddBtn);
    }

    if (theme.clockHidden !== null && theme.clockHidden !== undefined) {
        storeBool(STORAGE_KEYS.CLOCK_HIDDEN, theme.clockHidden);
    }

    if (theme.dateHidden !== null && theme.dateHidden !== undefined) {
        storeBool(STORAGE_KEYS.DATE_HIDDEN, theme.dateHidden);
    }

    // Store active theme ID
    localStorage.setItem(STORAGE_KEYS.THEME, String(themeId));

    // Re-apply all settings (except background — handled below)
    applyThemeSettings();
    applyBackgroundBrightness();
    applyBgImageCapSetting();
    applyClockSettings();
    applyClockVisibility();
    applySearchBarSettings();
    applyFontSettings();
    applyGeneralSettings();
    applyFavoritesSettings();
    // Refresh dynamic position slider limits after theme values are applied
    requestAnimationFrame(updatePositionSliderLimits);

    // Fetch the theme background image, process through canvas (respecting cap), save as data URL
    if (!bgEnabled) {
        await saveBgImage("");
        applyBackground();
    } else if (theme.animated === true) {
        // Animated background: force quality cap to default, fetch webm/mp4, save as video
        forceBgCapToDefault();
        syncBgCapSelectState();
        const themeFolder = getThemeFolder(String(themeId));
        try {
            let bgBlob;
            try {
                const r = await fetch(`${themeFolder}/background.webm`);
                if (!r.ok) throw new Error("WebM not found");
                bgBlob = await r.blob();
            } catch {
                const r = await fetch(`${themeFolder}/background.mp4`);
                if (!r.ok) throw new Error("MP4 not found");
                bgBlob = await r.blob();
            }
            await saveBgVideo(bgBlob);
            const blobUrl = await getBgImage();
            if (blobUrl) setBodyBgVideo(blobUrl);
            else applyBackground();
        } catch {
            applyBackground();
        }
    } else {
        const themeFolder = getThemeFolder(String(themeId));
        try {
            let bgBlob;
            try {
                const r = await fetch(`${themeFolder}/background.webp`);
                if (!r.ok) throw new Error("WebP not found");
                bgBlob = await r.blob();
            } catch {
                const r = await fetch(`${themeFolder}/background.jpg`);
                if (!r.ok) throw new Error("JPEG not found");
                bgBlob = await r.blob();
            }
            const dims = getBgImageCapDimensions();
            if (!dims) {
                await saveBgImageBlob(bgBlob);
                const url = await getBgImage();
                if (url) setBodyBgImage(url);
                else applyBackground();
            } else {
                const objUrl = URL.createObjectURL(bgBlob);
                const compressed = await compressImage(objUrl, dims.width, dims.height, 0.8);
                URL.revokeObjectURL(objUrl);
                setBodyBgImage(compressed);
                await saveBgImage(compressed);
            }
        } catch {
            applyBackground();
        }
    }

    // Update active state in theme grid
    renderThemeActiveState(themeId);
}

function renderThemeActiveState(activeId) {
    const cards = themesGrid.querySelectorAll(".theme-card");
    for (const card of cards) {
        const active = isThemeActive(card.dataset.themeId, activeId);
        card.classList.toggle("theme-card--active", active);
        card.setAttribute("aria-pressed", active ? "true" : "false");
    }
}

function createThemeCard(idStr, name, isActive) {
    const card = document.createElement("button");
    card.className = `theme-card${isActive ? " theme-card--active" : ""}`;
    card.dataset.themeId = idStr;
    card.setAttribute("aria-pressed", isActive ? "true" : "false");
    card.title = name;

    const thumb = document.createElement("div");
    thumb.className = "theme-card__thumb";
    const img = document.createElement("img");
    img.src = `${getThemeFolder(idStr)}/preview.webp`;
    img.onerror = function() {
        img.onerror = null;
        img.onerror = function() {
            img.onerror = null;
            img.src = `${getThemeFolder(idStr)}/background.jpg`;
        };
        img.src = `${getThemeFolder(idStr)}/background.webp`;
    };
    img.alt = "";
    img.className = "theme-card__img";
    thumb.appendChild(img);

    const label = document.createElement("span");
    label.className = "theme-card__name";
    label.textContent = name;

    card.appendChild(thumb);
    card.appendChild(label);

    card.addEventListener("click", async () => {
        try {
            const r = await fetch(`${getThemeFolder(idStr)}/theme.json`);
            if (!r.ok) throw new Error("Theme not found");
            const themeData = await r.json();
            const themeIdVal = /^nnt-/.test(idStr) ? idStr : Number(idStr);
            await applyThemePreset(themeData, themeIdVal);
        } catch {
            themesStatus.textContent = `Failed to load theme \u201c${name}\u201d.`;
        }
    });

    return card;
}

function renderThemeGrid(themes) {
    themesGrid.innerHTML = "";
    const activeId = getActiveThemeId();

    const includedItems = [];

    themes.forEach(t => {
        const id = t.id;
        if (typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id))) {
            const safeId = Math.floor(Number(id));
            if (!Number.isFinite(safeId) || safeId < 0) return;
            includedItems.push({ id: String(safeId), name: t.name });
        }
    });

    function appendSection(label, items) {
        if (!items.length) return;
        const sectionLabel = document.createElement("p");
        sectionLabel.className = "themes-section-label";
        sectionLabel.textContent = label;
        themesGrid.appendChild(sectionLabel);
        items.forEach(item => {
            themesGrid.appendChild(createThemeCard(item.id, item.name, isThemeActive(item.id, activeId)));
        });
    }

    appendSection("Included", includedItems);
}

async function loadThemesRegistry(onComplete) {
    themesStatus.textContent = "";
    try {
        const r = await fetch("themes/included_themes.json");
        if (!r.ok) throw new Error("Registry not found");
        const data = await r.json();
        if (!Array.isArray(data) || data.length === 0) {
            themesStatus.textContent = "No themes found in registry.";
        } else {
            renderThemeGrid(data);
        }
    } catch {
        themesStatus.textContent = "Could not load themes.";
    }
    if (onComplete) onComplete();
}

function openThemesOverlay() {
    themesOverlay.classList.remove("hidden");
    themesOverlay.setAttribute("aria-hidden", "false");
    const communityEnabled = loadBool(STORAGE_KEYS.CUSTOM_THEMES_ENABLED);
    communityThemesToggle.checked = communityEnabled;
    loadThemesRegistry(communityEnabled ? loadCommunityThemes : null);
}

function closeThemesOverlay() {
    themesOverlay.classList.add("hidden");
    themesOverlay.setAttribute("aria-hidden", "true");
}

async function loadCommunityThemes() {
    try {
        const r = await fetch("themes/community_themes.json");
        if (!r.ok) throw new Error("Registry not found");
        const data = await r.json();
        if (!Array.isArray(data)) return;
        const items = [];
        for (const t of data) {
            const id = t.id;
            if (typeof id === "string" && /^nnt-[a-zA-Z0-9_-]+$/.test(id)) {
                const name = (typeof t.name === "string" && t.name.trim())
                    ? t.name.trim()
                    : id.replace(/^nnt-/, "");
                items.push({ id, name });
            }
        }
        appendCommunityThemes(items);
    } catch {
        // community_themes.json missing or invalid — nothing to append
    }
}

function appendCommunityThemes(items) {
    if (!items.length) return;

    const activeId = getActiveThemeId();

    // Find an existing Community section label (added by renderThemeGrid or a prior call)
    let communityLabel = null;
    for (const label of themesGrid.querySelectorAll(".themes-section-label")) {
        if (label.textContent === "Community") { communityLabel = label; break; }
    }

    // Collect theme IDs already rendered in the Community section to avoid duplicates
    const existingIds = new Set();
    if (communityLabel) {
        let sibling = communityLabel.nextElementSibling;
        while (sibling && !sibling.classList.contains("themes-section-label")) {
            if (sibling.dataset.themeId) existingIds.add(sibling.dataset.themeId);
            sibling = sibling.nextElementSibling;
        }
    }

    const newItems = items.filter(item => !existingIds.has(item.id));
    if (!newItems.length) return;

    if (!communityLabel) {
        communityLabel = document.createElement("p");
        communityLabel.className = "themes-section-label";
        communityLabel.textContent = "Community";
        themesGrid.appendChild(communityLabel);
    }

    newItems.forEach(item => {
        themesGrid.appendChild(createThemeCard(item.id, item.name, isThemeActive(item.id, activeId)));
    });
}

function removeCommunityThemesFromGrid() {
    let communityLabel = null;
    for (const label of themesGrid.querySelectorAll(".themes-section-label")) {
        if (label.textContent === "Community") { communityLabel = label; break; }
    }
    if (!communityLabel) return;
    let sibling = communityLabel.nextElementSibling;
    while (sibling && !sibling.classList.contains("themes-section-label")) {
        const next = sibling.nextElementSibling;
        sibling.remove();
        sibling = next;
    }
    communityLabel.remove();
}

function applyThemesEnabledSetting() {
    const enabled = loadBool(STORAGE_KEYS.THEMES_ENABLED, true);
    themesEnabledToggle.checked = enabled;
    browseThemesBtn.classList.toggle("hidden", !enabled);
}

// --- Event Listeners ---

browseThemesBtn.addEventListener("click", openThemesOverlay);
document.getElementById("close-themes-btn").addEventListener("click", closeThemesOverlay);

themesEnabledToggle.addEventListener("change", function() {
    storeBool(STORAGE_KEYS.THEMES_ENABLED, this.checked);
    browseThemesBtn.classList.toggle("hidden", !this.checked);
    if (!this.checked) {
        closeThemesOverlay();
    }
});

communityThemesToggle.addEventListener("change", function() {
    storeBool(STORAGE_KEYS.CUSTOM_THEMES_ENABLED, this.checked);
    if (this.checked) {
        loadCommunityThemes();
    } else {
        removeCommunityThemesFromGrid();
    }
});

// --- Initialization ---

// Ensure the Browse Themes button reflects the stored themes-enabled state on every page load,
// not just when the settings panel is opened for the first time.
applyThemesEnabledSetting();

// When ch_theme is null the extension is on its very first launch.
// Apply and fully persist theme 0 so null only ever occurs once.
if (localStorage.getItem(STORAGE_KEYS.THEME) === null) {
    (async () => {
        try {
            const r = await fetch("themes/included/0/theme.json");
            if (!r.ok) throw new Error("Not found");
            const themeData = await r.json();
            await applyThemePreset(themeData, 0);
        } catch {
            // theme.json missing — at minimum persist the id so null is never repeated
            localStorage.setItem(STORAGE_KEYS.THEME, "0");
        }
    })();
}
