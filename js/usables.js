"use strict";

// --- Configuration & Constants ---
var DEFAULTS = {
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

var MAX_FILE_SIZE_MB = 250;

var STORAGE_KEYS = {
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
    POS_FORMAT: "ch_pos_format",
};

// --- Cached DOM References ---
var docStyle = document.documentElement.style;
var backgroundLayer = document.getElementById("background-layer");
var backgroundVideo = document.getElementById("background-video");

// --- Core Utilities ---

function hexToRgb(sourceHex) {
    var cleaned = sourceHex.slice(1);
    return {
        r: parseInt(cleaned.slice(0, 2), 16),
        g: parseInt(cleaned.slice(2, 4), 16),
        b: parseInt(cleaned.slice(4, 6), 16),
    };
}

var DEFAULT_TEXT_RGB = hexToRgb(DEFAULTS.TEXT_COLOR);

function hexToRgba(hex, alpha) {
    var validHex = /^#([A-Fa-f0-9]{6})$/;
    var rgb = validHex.test(hex) ? hexToRgb(hex) : DEFAULT_TEXT_RGB;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function sanitizeHttpUrl(raw) {
    try {
        var parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return parsed.href;
    } catch (_) {
        return null;
    }
}

// --- IndexedDB for Default-cap background ---

var _bgObjectUrl = null;
var _bgDb = null;
var _bgDbReady = false;
var _bgDbFailed = false;
var _bgDbCallbacks = [];

(function _openBgDb() {
    var req = indexedDB.open("nozy-bg", 1);
    req.onupgradeneeded = function(e) {
        e.target.result.createObjectStore("bg");
    };
    req.onsuccess = function(e) {
        _bgDb = e.target.result;
        _bgDbReady = true;
        var cbs = _bgDbCallbacks.splice(0);
        cbs.forEach(function(fn) { fn(); });
    };
    req.onerror = function() {
        _bgDbFailed = true;
        var cbs = _bgDbCallbacks.splice(0);
        cbs.forEach(function(fn) { fn(); });
    };
}());

function _whenBgDbReady(fn) {
    if (_bgDbReady || _bgDbFailed) { fn(); } else { _bgDbCallbacks.push(fn); }
}

function _dataUrlToBlob(dataUrl) {
    var arr = dataUrl.split(",");
    if (arr.length < 2 || !arr[1]) return new Blob([], { type: "image/jpeg" });
    var mimeMatch = arr[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    var bstr = atob(arr[1]);
    var u8arr = new Uint8Array(bstr.length);
    for (var i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
}

function _clearBgIdb(callback) {
    if (!_bgDb) { if (callback) callback(); return; }
    var tx = _bgDb.transaction("bg", "readwrite");
    var req = tx.objectStore("bg").delete("bg_image");
    req.onsuccess = req.onerror = callback || function() {};
}

// --- Background Helpers ---

function _getBgFromChromeStorage(callback) {
    chrome.storage.local.get([STORAGE_KEYS.BG_IMAGE], function(result) {
        var stored = result[STORAGE_KEYS.BG_IMAGE];
        if (stored) {
            callback(stored);
            return;
        }
        var legacy = localStorage.getItem(STORAGE_KEYS.BG_IMAGE);
        if (legacy) {
            var obj = {};
            obj[STORAGE_KEYS.BG_IMAGE] = legacy;
            chrome.storage.local.set(obj, function() {
                localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
            });
            callback(legacy);
            return;
        }
        callback("");
    });
}

function getBgImage(callback) {
    _whenBgDbReady(function() {
        if (_bgDb) {
            var tx = _bgDb.transaction("bg", "readonly");
            var req = tx.objectStore("bg").get("bg_image");
            req.onsuccess = function() {
                var blob = req.result;
                if (blob instanceof Blob) {
                    if (_bgObjectUrl) URL.revokeObjectURL(_bgObjectUrl);
                    _bgObjectUrl = URL.createObjectURL(blob);
                    callback(_bgObjectUrl);
                    return;
                }
                _getBgFromChromeStorage(callback);
            };
            req.onerror = function() {
                _getBgFromChromeStorage(callback);
            };
        } else {
            _getBgFromChromeStorage(callback);
        }
    });
}

function saveBgImage(value, callback) {
    localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    var cb = callback || function() {};
    if (!value) {
        if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
        localStorage.removeItem(STORAGE_KEYS.BG_IMAGE_TYPE);
        _clearBgIdb();
        chrome.storage.local.remove(STORAGE_KEYS.BG_IMAGE, cb);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_TYPE, "image"); // only reached when value is non-empty
    var cap = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_CAP) || DEFAULTS.BG_IMAGE_CAP;
    if (cap === "default" && value.startsWith("data:image/") && _bgDb) {
        var blob = _dataUrlToBlob(value);
        var tx = _bgDb.transaction("bg", "readwrite");
        var req = tx.objectStore("bg").put(blob, "bg_image");
        req.onsuccess = function() {
            chrome.storage.local.remove(STORAGE_KEYS.BG_IMAGE, cb);
        };
        req.onerror = function() {
            var obj = {};
            obj[STORAGE_KEYS.BG_IMAGE] = value;
            chrome.storage.local.set(obj, cb);
        };
    } else {
        // Switching to chrome.storage.local — revoke any stale ObjectURL and clear IDB
        if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
        _clearBgIdb();
        var obj = {};
        obj[STORAGE_KEYS.BG_IMAGE] = value;
        chrome.storage.local.set(obj, cb);
    }
}

// Stores a media blob directly in IndexedDB and clears any stale data from
// chrome.storage.local. BG_IMAGE_TYPE tracks what kind of background is active;
// the actual data lives in IDB (read back via getBgImage → createObjectURL).
function _saveBlobToIdb(blob, mediaType, callback) {
    localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_TYPE, mediaType);
    var cb = callback || function() {};
    if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
    if (!_bgDb) { cb(); return; }
    var tx = _bgDb.transaction("bg", "readwrite");
    var req = tx.objectStore("bg").put(blob, "bg_image");
    req.onsuccess = function() {
        chrome.storage.local.remove(STORAGE_KEYS.BG_IMAGE, cb);
    };
    req.onerror = function() { cb(); };
}

function saveBgVideo(blob, callback) {
    _saveBlobToIdb(blob, "video", callback);
}

function saveBgImageBlob(blob, callback) {
    _saveBlobToIdb(blob, "image", callback);
}

function setBodyBgImage(safeUrl) {
    backgroundLayer.classList.remove("bg-disabled");
    backgroundLayer.style.backgroundImage = safeUrl ? "url(" + JSON.stringify(safeUrl) + ")" : "";
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
    var existing = document.getElementById("custom-font-stylesheet");
    if (existing) existing.remove();
    if (url) {
        var link = document.createElement("link");
        link.id = "custom-font-stylesheet";
        link.rel = "stylesheet";
        link.href = url;
        document.head.appendChild(link);
    }
    docStyle.setProperty("--font-family", family || "inherit");
}

function setFavicon(href) {
    var link = document.querySelector("link[rel~='icon']");
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
    var bgColor = localStorage.getItem(STORAGE_KEYS.BG_COLOR) || DEFAULTS.BG_COLOR;
    var surfaceColor = localStorage.getItem(STORAGE_KEYS.SURFACE_COLOR) || DEFAULTS.SURFACE_COLOR;
    var highlightColor = localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_COLOR) || DEFAULTS.HIGHLIGHT_COLOR;
    var textColor = localStorage.getItem(STORAGE_KEYS.TEXT_COLOR) || DEFAULTS.TEXT_COLOR;

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

function applyBackground() {
    var bgImageInput = document.getElementById("bg-image");
    var bgImageToggle = document.getElementById("bg-image-toggle");
    var enabled = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_ENABLED) !== "false";
    var isVideo = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE) === "video";

    if (bgImageToggle) bgImageToggle.checked = enabled;

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

    getBgImage(function(image) {
        if (!image) {
            bgImageInput.value = "";
            // No custom image — CSS default already showing, nothing more to do
            return;
        }
        if (isVideo && image.startsWith("blob:")) {
            setBodyBgVideo(image);
            return;
        }
        var isLocalImage = image.startsWith("data:image/") || image.startsWith("blob:");
        var safeRemoteUrl = isLocalImage ? image : sanitizeHttpUrl(image);

        if (!safeRemoteUrl) {
            saveBgImage("");
            bgImageInput.value = "";
            return;
        }
        setBodyBgImage(safeRemoteUrl);
        bgImageInput.value = isLocalImage ? "" : safeRemoteUrl;
    });
}

function brightnessScale(value) {
    return Math.max(0.05, 1 + Number(value) / 100);
}

function applyBackgroundBrightness() {
    var raw = localStorage.getItem(STORAGE_KEYS.BG_BRIGHTNESS);
    var parsed = Number(raw);
    var brightnessValue = Number.isFinite(parsed) ? Math.max(-100, Math.min(100, parsed)) : 0;
    document.getElementById("bg-brightness").value = String(brightnessValue);
    docStyle.setProperty("--bg-image-brightness", String(brightnessScale(brightnessValue)));
}

function applyBgImageCapSetting() {
    var cap = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_CAP) || DEFAULTS.BG_IMAGE_CAP;
    var isVideo = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE) === "video";
    var capEl = document.getElementById("bg-image-cap");
    capEl.value = cap;
    capEl.disabled = isVideo;
    capEl.title = isVideo ? "Quality cap does not apply to video backgrounds." : "";
}

function applyBgFileSizeCapSetting() {
    var raw = localStorage.getItem(STORAGE_KEYS.BG_FILE_SIZE_CAP);
    var val = Number(raw);
    var capped = (Number.isFinite(val) && val > 0 && val <= MAX_FILE_SIZE_MB) ? val : Number(DEFAULTS.BG_FILE_SIZE_CAP);
    document.getElementById("bg-file-size-cap").value = String(capped);
}

// --- Viewport-fraction position helpers ---

/**
 * Converts a stored viewport fraction to a pixel offset for the current window.
 * Returns 0 for any non-finite input.
 */
function fracToPx(fracStr, dim) {
    var frac = Number(fracStr);
    return Number.isFinite(frac) ? Math.round(frac * dim) : 0;
}

/**
 * One-time migration: converts legacy absolute-pixel position values to viewport
 * fractions so they stay proportional across window resizes.
 * A value is treated as a legacy pixel offset if it is an integer with abs >= 2.
 * Runs once and marks ch_pos_format = "frac" so it is never repeated.
 */
function migratePositionsToFrac() {
    if (localStorage.getItem(STORAGE_KEYS.POS_FORMAT) === "frac") return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var pairs = [
        { key: STORAGE_KEYS.CLOCK_X,  dim: vw },
        { key: STORAGE_KEYS.CLOCK_Y,  dim: vh },
        { key: STORAGE_KEYS.SEARCH_X, dim: vw },
        { key: STORAGE_KEYS.SEARCH_Y, dim: vh },
    ];
    pairs.forEach(function(item) {
        var raw = localStorage.getItem(item.key);
        if (raw === null) return;
        var val = Number(raw);
        if (!Number.isFinite(val)) return;
        // Legacy pixel values are integers with abs >= 2; convert them to fractions.
        if (Number.isInteger(val) && Math.abs(val) >= 2) {
            localStorage.setItem(item.key, String(val / item.dim));
        }
    });
    localStorage.setItem(STORAGE_KEYS.POS_FORMAT, "frac");
}

function applyClockSettings() {
    var clockSize = localStorage.getItem(STORAGE_KEYS.CLOCK_SIZE) || DEFAULTS.CLOCK_SIZE;
    var clockXFrac = localStorage.getItem(STORAGE_KEYS.CLOCK_X) || DEFAULTS.CLOCK_X;
    var clockYFrac = localStorage.getItem(STORAGE_KEYS.CLOCK_Y) || DEFAULTS.CLOCK_Y;
    var clockXPx = fracToPx(clockXFrac, window.innerWidth);
    var clockYPx = fracToPx(clockYFrac, window.innerHeight);

    document.getElementById("clock-size").value = clockSize;
    document.getElementById("clock-x").value = clockXPx;
    document.getElementById("clock-y").value = clockYPx;
    docStyle.setProperty("--clock-size", `${clockSize}rem`);
    docStyle.setProperty("--clock-x", `${clockXPx}px`);
    docStyle.setProperty("--clock-y", `${clockYPx}px`);
}

function applyClockVisibility() {
    var clockHidden = localStorage.getItem(STORAGE_KEYS.CLOCK_HIDDEN) === "true";
    var dateHidden = localStorage.getItem(STORAGE_KEYS.DATE_HIDDEN) === "true";
    var clockToggle = document.getElementById("clock-hidden-toggle");
    var dateToggle = document.getElementById("date-hidden-toggle");

    if (clockToggle) clockToggle.checked = clockHidden;
    if (dateToggle) dateToggle.checked = dateHidden;

    var timeEl = document.getElementById("time");
    var dateEl = document.getElementById("date");
    if (timeEl) timeEl.classList.toggle("hidden", clockHidden);
    if (dateEl) dateEl.classList.toggle("hidden", dateHidden);
}

function applySearchBarSettings() {
    var searchWidth = localStorage.getItem(STORAGE_KEYS.SEARCH_WIDTH) || DEFAULTS.SEARCH_WIDTH;
    var searchXFrac = localStorage.getItem(STORAGE_KEYS.SEARCH_X) || DEFAULTS.SEARCH_X;
    var searchYFrac = localStorage.getItem(STORAGE_KEYS.SEARCH_Y) || DEFAULTS.SEARCH_Y;
    var searchXPx = fracToPx(searchXFrac, window.innerWidth);
    var searchYPx = fracToPx(searchYFrac, window.innerHeight);

    document.getElementById("search-width").value = searchWidth;
    document.getElementById("search-x").value = searchXPx;
    document.getElementById("search-y").value = searchYPx;
    docStyle.setProperty("--search-width", `${searchWidth}px`);
    docStyle.setProperty("--search-x", `${searchXPx}px`);
    docStyle.setProperty("--search-y", `${searchYPx}px`);
}

function applyFontSettings() {
    var fontUrl = localStorage.getItem(STORAGE_KEYS.FONT_URL) || "";
    var fontFamily = localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) || DEFAULTS.FONT_FAMILY;
    document.getElementById("font-url").value = fontUrl;
    document.getElementById("font-family").value = fontFamily;
    applyCustomFont(fontUrl, fontFamily);
}

function applyGeneralSettings() {
    var tabName = localStorage.getItem(STORAGE_KEYS.TAB_NAME) || DEFAULTS.TAB_NAME;
    var favicon = localStorage.getItem(STORAGE_KEYS.FAVICON) || DEFAULTS.FAVICON;
    var faviconUrlEl = document.getElementById("favicon-url");

    document.getElementById("tab-name").value = tabName;
    document.title = tabName || "New Tab";

    if (favicon) {
        var isDataImage = favicon.startsWith("data:image/");
        var safeUrl = isDataImage ? favicon : sanitizeHttpUrl(favicon);
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
    var searchUrlInput = document.getElementById("search-url");
    if (searchUrlInput) {
        searchUrlInput.value = localStorage.getItem(STORAGE_KEYS.SEARCH_URL) || "";
    }
}

function applyFavoritesEnabled() {
    var favoritesSection = document.getElementById("favorites-section");
    var favoritesToggle = document.getElementById("favorites-enabled-toggle");
    var enabled = localStorage.getItem(STORAGE_KEYS.FAVORITES_ENABLED) !== "false";

    if (favoritesToggle) favoritesToggle.checked = enabled;
    if (favoritesSection) favoritesSection.classList.toggle("hidden", !enabled);
}

function applyFavoritesSettings() {
    applyFavoritesEnabled();

    var addBtn = document.getElementById("add-btn");
    var favoritesSection = document.getElementById("favorites-section");
    var showAddToggle = document.getElementById("favorites-show-add-toggle");
    var columnToggle = document.getElementById("favorites-column-toggle");

    var showAdd = localStorage.getItem(STORAGE_KEYS.FAVORITES_SHOW_ADD_BTN) !== "false";
    var isColumn = localStorage.getItem(STORAGE_KEYS.FAVORITES_LAYOUT) === "column";

    var favXFrac = localStorage.getItem(STORAGE_KEYS.FAVORITES_X) || "0";
    var favYFrac = localStorage.getItem(STORAGE_KEYS.FAVORITES_Y) || "0";
    var favXPx = fracToPx(favXFrac, window.innerWidth);
    var favYPx = fracToPx(favYFrac, window.innerHeight);

    if (showAddToggle) showAddToggle.checked = showAdd;
    if (columnToggle) columnToggle.checked = isColumn;

    if (addBtn) addBtn.classList.toggle("hidden", !showAdd);
    if (favoritesSection) favoritesSection.classList.toggle("favorites-column", isColumn);

    var favXInput = document.getElementById("favorites-x");
    var favYInput = document.getElementById("favorites-y");
    if (favXInput) favXInput.value = favXPx;
    if (favYInput) favYInput.value = favYPx;

    docStyle.setProperty("--favorites-x", favXPx + "px");
    docStyle.setProperty("--favorites-y", favYPx + "px");
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
        var hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch (_) {
        return null;
    }
}

function createFallbackIcon(name) {
    var div = document.createElement("div");
    div.className = "fav-icon-fallback";
    div.textContent = name.charAt(0).toUpperCase();
    return div;
}

function createFavElement(fav, index) {
    var a = document.createElement("a");
    a.href = fav.url;
    a.className = "fav-item";

    var faviconUrl = getFaviconUrl(fav.url);
    if (faviconUrl) {
        var img = document.createElement("img");
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

    var nameSpan = document.createElement("span");
    nameSpan.className = "fav-name";
    nameSpan.textContent = fav.name;
    a.appendChild(nameSpan);

    var removeBtn = document.createElement("button");
    removeBtn.className = "fav-remove";
    removeBtn.title = "Remove " + fav.name;
    removeBtn.setAttribute("aria-label", "Remove " + fav.name);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        removeFavorite(index);
    });
    a.appendChild(removeBtn);
    return a;
}

function renderFavorites(favorites) {
    var favGrid = document.getElementById("favorites-grid");
    if (!favorites) favorites = loadFavorites();
    var fragment = document.createDocumentFragment();
    favorites.forEach(function(fav, index) {
        fragment.appendChild(createFavElement(fav, index));
    });
    favGrid.innerHTML = "";
    favGrid.appendChild(fragment);
}

function removeFavorite(index) {
    var favorites = loadFavorites();
    favorites.splice(index, 1);
    saveFavorites(favorites);
    renderFavorites(favorites);
}

function addFavorite(name, url) {
    var favorites = loadFavorites();
    favorites.push({ name: name, url: url });
    saveFavorites(favorites);
    renderFavorites(favorites);
}

// --- Video background lifecycle ---

document.addEventListener("visibilitychange", function() {
    if (!backgroundVideo.classList.contains("bg-disabled")) {
        if (document.hidden) {
            backgroundVideo.pause();
        } else {
            backgroundVideo.play().catch(function() {});
        }
    }
});

window.addEventListener("pagehide", function() {
    if (_bgObjectUrl) { URL.revokeObjectURL(_bgObjectUrl); _bgObjectUrl = null; }
});

// Migrate any legacy absolute-pixel position values to viewport fractions.
// Must run after STORAGE_KEYS is defined and before apply functions consume stored positions.
migratePositionsToFrac();
