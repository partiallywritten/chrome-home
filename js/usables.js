"use strict";

// --- Configuration & Constants ---
const DEFAULTS = {
    BG_COLOR: "#003056",
    SURFACE_COLOR: "#003056",
    HIGHLIGHT_COLOR: "#be9da8",
    TEXT_COLOR: "#eeb8b7",
    CLOCK_SIZE: "8",
    CLOCK_X: "0",
    CLOCK_Y: "0",
    SEARCH_WIDTH: "560",
    SEARCH_X: "0",
    SEARCH_Y: "0",
    FONT_FAMILY: "\"JetBrains Mono\", \"Fira Code\", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
    TAB_NAME: "",
    FAVICON: "",
    BG_IMAGE_CAP: "1080p",
    BG_FILE_SIZE_CAP: "50",
    SEARCH_URL: "https://www.google.com/search?q={query}",
};

const MAX_FILE_SIZE_MB = 250;

const STORAGE_KEYS = {
    BG_IMAGE_TYPE: "ch_bg_image_type",
    BG_FILE_SIZE_CAP: "ch_bg_file_size_cap",
    FAVORITES: "ch_favorites",
    FAVORITES_ENABLED: "ch_favorites_enabled",
    FAVORITES_SHOW_ADD_BTN: "ch_favorites_show_add_btn",
    FAVORITES_LAYOUT: "ch_favorites_layout",
    FAVORITES_X: "ch_favorites_x",
    FAVORITES_Y: "ch_favorites_y",
    BG_COLOR: "ch_bg_color",
    SURFACE_COLOR: "ch_surface_color",
    BG_IMAGE: "ch_bg_image",
    BG_IMAGE_ENABLED: "ch_bg_image_enabled",
    BG_BRIGHTNESS: "ch_bg_brightness",
    BG_IMAGE_CAP: "ch_bg_image_cap",
    HIGHLIGHT_COLOR: "ch_highlight_color",
    TEXT_COLOR: "ch_text_color",
    CLOCK_SIZE: "ch_clock_size",
    CLOCK_X: "ch_clock_x",
    CLOCK_Y: "ch_clock_y",
    SEARCH_WIDTH: "ch_search_width",
    SEARCH_X: "ch_search_x",
    SEARCH_Y: "ch_search_y",
    FONT_URL: "ch_font_url",
    FONT_FAMILY: "ch_font_family",
    TAB_NAME: "ch_tab_name",
    FAVICON: "ch_favicon",
    THEME: "ch_theme",
    THEMES_ENABLED: "ch_themes_enabled",
    CUSTOM_THEMES_ENABLED: "ch_custom_themes_enabled",
    SEARCH_URL: "ch_search_url",
    CLOCK_HIDDEN: "ch_clock_hidden",
    DATE_HIDDEN: "ch_date_hidden",
};

// --- Cached DOM References ---
const docStyle = document.documentElement.style;
const backgroundLayer = document.getElementById("background-layer");
const backgroundVideo = document.getElementById("background-video");

// --- Core Utilities ---

function hexToRgb(sourceHex) {
    const cleaned = sourceHex.slice(1);
    return {
        r: parseInt(cleaned.slice(0, 2), 16),
        g: parseInt(cleaned.slice(2, 4), 16),
        b: parseInt(cleaned.slice(4, 6), 16),
    };
}

const DEFAULT_TEXT_RGB = hexToRgb(DEFAULTS.TEXT_COLOR);

function hexToRgba(hex, alpha) {
    const validHex = /^#([A-Fa-f0-9]{6})$/;
    const { r, g, b } = validHex.test(hex) ? hexToRgb(hex) : DEFAULT_TEXT_RGB;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sanitizeHttpUrl(raw) {
    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return parsed.href;
    } catch (_) {
        return null;
    }
}

// --- Boolean localStorage helpers ---

function storeBool(key, val) {
    localStorage.setItem(key, val ? "true" : "false");
}

function loadBool(key, defaultVal = false) {
    const stored = localStorage.getItem(key);
    return stored === null ? defaultVal : stored === "true";
}

// --- IndexedDB for Default-cap background ---

let _bgObjectUrl = null;
let _bgDb = null;

const _bgDbPromise = new Promise(resolve => {
    const req = indexedDB.open("nozy-bg", 1);
    req.onupgradeneeded = e => { e.target.result.createObjectStore("bg"); };
    req.onsuccess = e => { _bgDb = e.target.result; resolve(); };
    req.onerror = () => resolve();
});

async function _putInIdb(value) {
    return new Promise((resolve, reject) => {
        const req = _bgDb.transaction("bg", "readwrite").objectStore("bg").put(value, "bg_image");
        req.onsuccess = () => resolve();
        req.onerror = () => reject();
    });
}

async function _clearBgIdb() {
    await _bgDbPromise;
    if (!_bgDb) return;
    await new Promise(resolve => {
        const req = _bgDb.transaction("bg", "readwrite").objectStore("bg").delete("bg_image");
        req.onsuccess = req.onerror = resolve;
    });
}

// --- Background Helpers ---

function _getBgImageFromLocalStorage() {
    const fallback = localStorage.getItem(STORAGE_KEYS.BG_IMAGE) || "";
    return sanitizeHttpUrl(fallback) || "";
}

function _setBgImageFallback(value) {
    const safeUrl = sanitizeHttpUrl(value);
    if (!value || !safeUrl) {
        localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE, safeUrl);
}

async function getBgImage() {
    const fallback = _getBgImageFromLocalStorage();
    await _bgDbPromise;
    if (!_bgDb) return fallback;
    return new Promise(resolve => {
        const req = _bgDb.transaction("bg", "readonly").objectStore("bg").get("bg_image");
        req.onsuccess = () => {
            const stored = req.result;
            if (stored instanceof Blob) {
                if (_bgObjectUrl) URL.revokeObjectURL(_bgObjectUrl);
                _bgObjectUrl = URL.createObjectURL(stored);
                resolve(_bgObjectUrl);
                return;
            }
            resolve(typeof stored === "string" ? stored : fallback);
        };
        req.onerror = () => resolve(fallback);
    });
}

async function saveBgImage(value) {
    if (!value) {
        if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
        localStorage.removeItem(STORAGE_KEYS.BG_IMAGE_TYPE);
        localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
        await _clearBgIdb();
        return;
    }
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_TYPE, "image");
    await _bgDbPromise;
    if (!_bgDb) {
        _setBgImageFallback(value);
        return;
    }
    localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    const cap = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_CAP) || DEFAULTS.BG_IMAGE_CAP;
    if (cap === "default" && value.startsWith("data:image/")) {
        const blob = await (await fetch(value)).blob();
        try {
            await _putInIdb(blob);
        } catch {
            // IDB write failed — fall back to storing the data URL string in IDB
            try {
                await _putInIdb(value);
            } catch {
                _setBgImageFallback(value);
            }
        }
    } else {
        // Revoke any stale ObjectURL and store as a string (URL/data URL) in IDB
        if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
        try {
            await _putInIdb(value);
        } catch {
            _setBgImageFallback(value);
        }
    }
}

// Stores a media blob directly in IndexedDB. BG_IMAGE_TYPE tracks what kind of
// background is active; the actual data lives in IDB (read back via getBgImage → createObjectURL).
async function _saveBlobToIdb(blob, mediaType) {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_TYPE, mediaType);
    localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
    await _bgDbPromise;
    if (!_bgDb) return;
    try {
        await _putInIdb(blob);
    } catch { /* ignore */ }
}

async function saveBgVideo(blob) { return _saveBlobToIdb(blob, "video"); }

async function saveBgImageBlob(blob) { return _saveBlobToIdb(blob, "image"); }

function setBodyBgImage(safeUrl) {
    backgroundLayer.classList.remove("bg-disabled");
    backgroundLayer.style.backgroundImage = safeUrl ? `url(${JSON.stringify(safeUrl)})` : "";
    backgroundVideo.pause();
    backgroundVideo.removeAttribute("src");
    backgroundVideo.classList.add("bg-disabled");
}

function setBodyBgVideo(safeUrl) {
    backgroundLayer.classList.add("bg-disabled");
    backgroundLayer.style.backgroundImage = "";
    backgroundVideo.classList.remove("bg-disabled");
    backgroundVideo.src = safeUrl;
}

// --- DOM Helpers ---

function applyCustomFont(url, family) {
    const existing = document.getElementById("custom-font-stylesheet");
    if (existing) existing.remove();
    if (url) {
        const link = document.createElement("link");
        link.id = "custom-font-stylesheet";
        link.rel = "stylesheet";
        link.href = url;
        document.head.appendChild(link);
    }
    docStyle.setProperty("--font-family", family || "inherit");
}

function setFavicon(href) {
    let link = document.querySelector("link[rel~='icon']");
    if (href) {
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }
        link.href = href;
    } else if (link) {
        link.remove();
    }
}

// --- Apply Settings Functions ---

function applyThemeSettings() {
    const bgColor = localStorage.getItem(STORAGE_KEYS.BG_COLOR) || DEFAULTS.BG_COLOR;
    const surfaceColor = localStorage.getItem(STORAGE_KEYS.SURFACE_COLOR) || DEFAULTS.SURFACE_COLOR;
    const highlightColor = localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_COLOR) || DEFAULTS.HIGHLIGHT_COLOR;
    const textColor = localStorage.getItem(STORAGE_KEYS.TEXT_COLOR) || DEFAULTS.TEXT_COLOR;

    docStyle.setProperty("--bg-color", bgColor);
    docStyle.setProperty("--surface", hexToRgba(surfaceColor, 0.52));
    docStyle.setProperty("--surface-hover", hexToRgba(highlightColor, 0.16));
    docStyle.setProperty("--panel-bg", hexToRgba(surfaceColor, 0.95));
    docStyle.setProperty("--accent", highlightColor);
    docStyle.setProperty("--accent-hover", hexToRgba(highlightColor, 0.85));
    docStyle.setProperty("--text", textColor);
    docStyle.setProperty("--text-muted", hexToRgba(textColor, 0.74));

    document.getElementById("bg-color").value = bgColor;
    document.getElementById("bg-color-hex").value = bgColor.toUpperCase();
    document.getElementById("surface-color").value = surfaceColor;
    document.getElementById("surface-color-hex").value = surfaceColor.toUpperCase();
    document.getElementById("highlight-color").value = highlightColor;
    document.getElementById("highlight-color-hex").value = highlightColor.toUpperCase();
    document.getElementById("text-color").value = textColor;
    document.getElementById("text-color-hex").value = textColor.toUpperCase();
    document.body.style.backgroundColor = bgColor;
}

async function applyBackground() {
    const bgImageInputEl = document.getElementById("bg-image");
    const bgImageToggleEl = document.getElementById("bg-image-toggle");
    const enabled = loadBool(STORAGE_KEYS.BG_IMAGE_ENABLED, true);
    const isVideo = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE) === "video";

    if (bgImageToggleEl) bgImageToggleEl.checked = enabled;

    if (!enabled) {
        backgroundLayer.classList.add("bg-disabled");
        backgroundLayer.style.backgroundImage = "";
        backgroundVideo.pause();
        backgroundVideo.removeAttribute("src");
        backgroundVideo.classList.add("bg-disabled");
        return;
    }

    // Clear any previous inline style so the CSS default image shows while the async read runs
    backgroundLayer.classList.remove("bg-disabled");
    backgroundLayer.style.backgroundImage = "";

    const image = await getBgImage();
    if (!image) {
        bgImageInputEl.value = "";
        // No custom image — CSS default already showing, nothing more to do
        return;
    }
    if (isVideo && image.startsWith("blob:")) {
        setBodyBgVideo(image);
        return;
    }
    const isLocalImage = image.startsWith("data:image/") || image.startsWith("blob:");
    const safeRemoteUrl = isLocalImage ? image : sanitizeHttpUrl(image);

    if (!safeRemoteUrl) {
        await saveBgImage("");
        bgImageInputEl.value = "";
        return;
    }
    setBodyBgImage(safeRemoteUrl);
    bgImageInputEl.value = isLocalImage ? "" : safeRemoteUrl;
}

function brightnessScale(value) {
    return Math.max(0.05, 1 + Number(value) / 100);
}

function applyBackgroundBrightness() {
    const raw = localStorage.getItem(STORAGE_KEYS.BG_BRIGHTNESS);
    const parsed = Number(raw);
    const brightnessValue = Number.isFinite(parsed) ? Math.max(-100, Math.min(100, parsed)) : 0;
    document.getElementById("bg-brightness").value = String(brightnessValue);
    docStyle.setProperty("--bg-image-brightness", String(brightnessScale(brightnessValue)));
}

function applyBgImageCapSetting() {
    const cap = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_CAP) || DEFAULTS.BG_IMAGE_CAP;
    const isVideo = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE) === "video";
    const capEl = document.getElementById("bg-image-cap");
    capEl.value = cap;
    capEl.disabled = isVideo;
    capEl.title = isVideo ? "Quality cap does not apply to video backgrounds." : "";
}

function applyBgFileSizeCapSetting() {
    const raw = localStorage.getItem(STORAGE_KEYS.BG_FILE_SIZE_CAP);
    const val = Number(raw);
    const capped = (Number.isFinite(val) && val > 0 && val <= MAX_FILE_SIZE_MB) ? val : Number(DEFAULTS.BG_FILE_SIZE_CAP);
    document.getElementById("bg-file-size-cap").value = String(capped);
}

// --- Viewport-fraction position helpers ---

/**
 * Converts a stored viewport fraction to a pixel offset for the current window.
 * Returns 0 for any non-finite input.
 */
function fracToPx(fracStr, dim) {
    const frac = Number(fracStr);
    return Number.isFinite(frac) ? Math.round(frac * dim) : 0;
}

function applyClockSettings() {
    const clockSize = localStorage.getItem(STORAGE_KEYS.CLOCK_SIZE) || DEFAULTS.CLOCK_SIZE;
    const clockXFrac = localStorage.getItem(STORAGE_KEYS.CLOCK_X) || DEFAULTS.CLOCK_X;
    const clockYFrac = localStorage.getItem(STORAGE_KEYS.CLOCK_Y) || DEFAULTS.CLOCK_Y;
    const clockXPx = fracToPx(clockXFrac, window.innerWidth);
    const clockYPx = fracToPx(clockYFrac, window.innerHeight);

    document.getElementById("clock-size").value = clockSize;
    document.getElementById("clock-x").value = clockXPx;
    document.getElementById("clock-y").value = clockYPx;
    docStyle.setProperty("--clock-size", `${clockSize}rem`);
    docStyle.setProperty("--clock-x", `${clockXPx}px`);
    docStyle.setProperty("--clock-y", `${clockYPx}px`);
}

function applyClockVisibility() {
    const clockHidden = loadBool(STORAGE_KEYS.CLOCK_HIDDEN);
    const dateHidden = loadBool(STORAGE_KEYS.DATE_HIDDEN);
    const clockToggle = document.getElementById("clock-hidden-toggle");
    const dateToggle = document.getElementById("date-hidden-toggle");

    if (clockToggle) clockToggle.checked = clockHidden;
    if (dateToggle) dateToggle.checked = dateHidden;

    const timeEl = document.getElementById("time");
    const dateEl = document.getElementById("date");
    if (timeEl) timeEl.classList.toggle("hidden", clockHidden);
    if (dateEl) dateEl.classList.toggle("hidden", dateHidden);
}

function applySearchBarSettings() {
    const searchWidth = localStorage.getItem(STORAGE_KEYS.SEARCH_WIDTH) || DEFAULTS.SEARCH_WIDTH;
    const searchXFrac = localStorage.getItem(STORAGE_KEYS.SEARCH_X) || DEFAULTS.SEARCH_X;
    const searchYFrac = localStorage.getItem(STORAGE_KEYS.SEARCH_Y) || DEFAULTS.SEARCH_Y;
    const searchXPx = fracToPx(searchXFrac, window.innerWidth);
    const searchYPx = fracToPx(searchYFrac, window.innerHeight);

    document.getElementById("search-width").value = searchWidth;
    document.getElementById("search-x").value = searchXPx;
    document.getElementById("search-y").value = searchYPx;
    docStyle.setProperty("--search-width", `${searchWidth}px`);
    docStyle.setProperty("--search-x", `${searchXPx}px`);
    docStyle.setProperty("--search-y", `${searchYPx}px`);
}

function applyFontSettings() {
    const fontUrl = localStorage.getItem(STORAGE_KEYS.FONT_URL) || "";
    const fontFamily = localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) || DEFAULTS.FONT_FAMILY;
    document.getElementById("font-url").value = fontUrl;
    document.getElementById("font-family").value = fontFamily;
    applyCustomFont(fontUrl, fontFamily);
}

function applyGeneralSettings() {
    const tabName = localStorage.getItem(STORAGE_KEYS.TAB_NAME) || DEFAULTS.TAB_NAME;
    const favicon = localStorage.getItem(STORAGE_KEYS.FAVICON) || DEFAULTS.FAVICON;
    const faviconUrlEl = document.getElementById("favicon-url");

    document.getElementById("tab-name").value = tabName;
    document.title = tabName || "New Tab";

    if (favicon) {
        const isDataImage = favicon.startsWith("data:image/");
        const safeUrl = isDataImage ? favicon : sanitizeHttpUrl(favicon);
        if (safeUrl) {
            setFavicon(safeUrl);
            faviconUrlEl.value = isDataImage ? "" : safeUrl;
        } else {
            localStorage.removeItem(STORAGE_KEYS.FAVICON);
            setFavicon("");
            faviconUrlEl.value = "";
        }
    } else {
        setFavicon("");
        faviconUrlEl.value = "";
    }
}

function applySearchSettings() {
    const searchUrlInputEl = document.getElementById("search-url");
    if (searchUrlInputEl) {
        searchUrlInputEl.value = localStorage.getItem(STORAGE_KEYS.SEARCH_URL) || "";
    }
}

function applyFavoritesEnabled() {
    const favoritesSection = document.getElementById("favorites-section");
    const favoritesToggle = document.getElementById("favorites-enabled-toggle");
    const enabled = loadBool(STORAGE_KEYS.FAVORITES_ENABLED, true);

    if (favoritesToggle) favoritesToggle.checked = enabled;
    if (favoritesSection) favoritesSection.classList.toggle("hidden", !enabled);
}

function applyFavoritesSettings() {
    applyFavoritesEnabled();

    const addBtnEl = document.getElementById("add-btn");
    const favoritesSectionEl = document.getElementById("favorites-section");
    const showAddToggle = document.getElementById("favorites-show-add-toggle");
    const layoutSelect = document.getElementById("favorites-layout-select");

    const showAdd = loadBool(STORAGE_KEYS.FAVORITES_SHOW_ADD_BTN, true);
    const layout = localStorage.getItem(STORAGE_KEYS.FAVORITES_LAYOUT) || "row";
    const isColumn = layout === "column";

    const favXFrac = localStorage.getItem(STORAGE_KEYS.FAVORITES_X) || "0";
    const favYFrac = localStorage.getItem(STORAGE_KEYS.FAVORITES_Y) || "0";
    const favXPx = fracToPx(favXFrac, window.innerWidth);
    const favYPx = fracToPx(favYFrac, window.innerHeight);

    if (showAddToggle) showAddToggle.checked = showAdd;
    if (layoutSelect) layoutSelect.value = layout;

    if (addBtnEl) addBtnEl.classList.toggle("hidden", !showAdd);
    if (favoritesSectionEl) favoritesSectionEl.classList.toggle("favorites-column", isColumn);

    const favXInput = document.getElementById("favorites-x");
    const favYInput = document.getElementById("favorites-y");
    if (favXInput) favXInput.value = favXPx;
    if (favYInput) favYInput.value = favYPx;

    docStyle.setProperty("--favorites-x", `${favXPx}px`);
    docStyle.setProperty("--favorites-y", `${favYPx}px`);
}

// --- Favorites ---

function loadFavorites() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES)) || [];
    } catch (_) {
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

function getFaviconUrl(url) {
    try {
        const { hostname } = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch (_) {
        return null;
    }
}

function createFallbackIcon(name) {
    const div = document.createElement("div");
    div.className = "fav-icon-fallback";
    div.textContent = name.charAt(0).toUpperCase();
    return div;
}

function createFavElement(fav, index) {
    const a = document.createElement("a");
    a.href = fav.url;
    a.className = "fav-item";

    const faviconUrl = getFaviconUrl(fav.url);
    if (faviconUrl) {
        const img = document.createElement("img");
        img.src = faviconUrl;
        img.alt = fav.name;
        img.className = "fav-icon";
        img.onerror = function() {
            this.replaceWith(createFallbackIcon(fav.name));
        };
        a.appendChild(img);
    } else {
        a.appendChild(createFallbackIcon(fav.name));
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "fav-name";
    nameSpan.textContent = fav.name;
    a.appendChild(nameSpan);

    const removeBtn = document.createElement("button");
    removeBtn.className = "fav-remove";
    removeBtn.title = `Remove ${fav.name}`;
    removeBtn.setAttribute("aria-label", `Remove ${fav.name}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        removeFavorite(index);
    });
    a.appendChild(removeBtn);
    return a;
}

function renderFavorites(favorites) {
    const favGrid = document.getElementById("favorites-grid");
    if (!favorites) favorites = loadFavorites();
    const fragment = document.createDocumentFragment();
    favorites.forEach((fav, index) => {
        fragment.appendChild(createFavElement(fav, index));
    });
    favGrid.innerHTML = "";
    favGrid.appendChild(fragment);
}

function removeFavorite(index) {
    const favorites = loadFavorites();
    favorites.splice(index, 1);
    saveFavorites(favorites);
    renderFavorites(favorites);
}

function addFavorite(name, url) {
    const favorites = loadFavorites();
    favorites.push({ name, url });
    saveFavorites(favorites);
    renderFavorites(favorites);
}

// --- Video background lifecycle ---

document.addEventListener("visibilitychange", () => {
    if (!backgroundVideo.classList.contains("bg-disabled")) {
        if (document.hidden) {
            backgroundVideo.pause();
        } else {
            backgroundVideo.play().catch(() => {});
        }
    }
});

window.addEventListener("pagehide", () => {
    if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
});
