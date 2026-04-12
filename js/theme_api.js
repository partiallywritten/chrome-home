"use strict";

// --- DOM Elements ---
var browseThemesBtn = document.getElementById("browse-themes-btn");
var themesEnabledToggle = document.getElementById("themes-enabled-toggle");
var communityThemesToggle = document.getElementById("community-themes-toggle");
var themesOverlay = document.getElementById("themes-overlay");
var themesGrid = document.getElementById("themes-grid");
var themesStatus = document.getElementById("themes-status");

// --- Themes ---

function getThemeFolder(idStr) {
    return /^nnt-/.test(idStr) ? "themes/community/" + idStr : "themes/included/" + idStr;
}

function getActiveThemeId() {
    var storedId = localStorage.getItem(STORAGE_KEYS.THEME);
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

function applyThemePreset(theme, themeId) {
    // Write theme settings to localStorage.
    // null/undefined = omitted (keep user value); empty string = remove key; any other value = set key.
    var set = function(key, val) {
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

    var bgEnabled = theme.bgImageEnabled !== false;
    if (theme.bgImageEnabled !== null && theme.bgImageEnabled !== undefined) {
        localStorage.setItem(STORAGE_KEYS.BG_IMAGE_ENABLED, bgEnabled ? "true" : "false");
    } else {
        bgEnabled = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_ENABLED) !== "false";
    }

    if (theme.favoritesEnabled !== null && theme.favoritesEnabled !== undefined) {
        localStorage.setItem(STORAGE_KEYS.FAVORITES_ENABLED, theme.favoritesEnabled ? "true" : "false");
    }

    if (theme.clockHidden !== null && theme.clockHidden !== undefined) {
        localStorage.setItem(STORAGE_KEYS.CLOCK_HIDDEN, theme.clockHidden ? "true" : "false");
    }

    if (theme.dateHidden !== null && theme.dateHidden !== undefined) {
        localStorage.setItem(STORAGE_KEYS.DATE_HIDDEN, theme.dateHidden ? "true" : "false");
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
    applyFavoritesEnabled();

    // Fetch the theme background image, process through canvas (respecting cap), save as data URL
    if (!bgEnabled) {
        saveBgImage("", function() { applyBackground(); });
    } else {
        var themeFolder = getThemeFolder(String(themeId));
        fetch(themeFolder + "/background.webp")
            .then(function(r) {
                if (!r.ok) throw new Error("WebP not found");
                return r.blob();
            })
            .catch(function() {
                return fetch(themeFolder + "/background.jpg").then(function(r) {
                    if (!r.ok) throw new Error("JPEG not found");
                    return r.blob();
                });
            })
            .then(function(blob) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var dataUrl = String(e.target.result);
                    var dims = getBgImageCapDimensions();
                    if (!dims) {
                        setBodyBgImage(dataUrl);
                        saveBgImage(dataUrl);
                    } else {
                        compressImage(dataUrl, dims.width, dims.height, 0.8, function(compressed) {
                            setBodyBgImage(compressed);
                            saveBgImage(compressed);
                        });
                    }
                };
                reader.onerror = function() {
                    applyBackground();
                };
                reader.readAsDataURL(blob);
            })
            .catch(function() {
                applyBackground();
            });
    }

    // Update active state in theme grid
    renderThemeActiveState(themeId);
}

function renderThemeActiveState(activeId) {
    var cards = themesGrid.querySelectorAll(".theme-card");
    cards.forEach(function (card) {
        var active = isThemeActive(card.dataset.themeId, activeId);
        card.classList.toggle("theme-card--active", active);
        card.setAttribute("aria-pressed", active ? "true" : "false");
    });
}

function createThemeCard(idStr, name, isActive) {
    var card = document.createElement("button");
    card.className = "theme-card" + (isActive ? " theme-card--active" : "");
    card.dataset.themeId = idStr;
    card.setAttribute("aria-pressed", isActive ? "true" : "false");
    card.title = name;

    var thumb = document.createElement("div");
    thumb.className = "theme-card__thumb";
    var img = document.createElement("img");
    img.src = getThemeFolder(idStr) + "/background.webp";
    img.onerror = function() {
        img.onerror = null;
        img.src = getThemeFolder(idStr) + "/background.jpg";
    };
    img.alt = "";
    img.className = "theme-card__img";
    thumb.appendChild(img);

    var label = document.createElement("span");
    label.className = "theme-card__name";
    label.textContent = name;

    card.appendChild(thumb);
    card.appendChild(label);

    card.addEventListener("click", function () {
        fetch(getThemeFolder(idStr) + "/theme.json")
            .then(function (r) {
                if (!r.ok) throw new Error("Theme not found");
                return r.json();
            })
            .then(function (themeData) {
                var themeIdVal = /^nnt-/.test(idStr) ? idStr : Number(idStr);
                applyThemePreset(themeData, themeIdVal);
            })
            .catch(function () {
                themesStatus.textContent = "Failed to load theme \u201c" + name + "\u201d.";
            });
    });

    return card;
}

function renderThemeGrid(themes) {
    themesGrid.innerHTML = "";
    var activeId = getActiveThemeId();

    var includedItems = [];

    themes.forEach(function (t) {
        var id = t.id;
        if (typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id))) {
            var safeId = Math.floor(Number(id));
            if (!Number.isFinite(safeId) || safeId < 0) return;
            includedItems.push({ id: String(safeId), name: t.name });
        }
    });

    function appendSection(label, items) {
        if (!items.length) return;
        var sectionLabel = document.createElement("p");
        sectionLabel.className = "themes-section-label";
        sectionLabel.textContent = label;
        themesGrid.appendChild(sectionLabel);
        items.forEach(function (item) {
            themesGrid.appendChild(createThemeCard(item.id, item.name, isThemeActive(item.id, activeId)));
        });
    }

    appendSection("Included", includedItems);
}

function loadThemesRegistry(onComplete) {
    themesStatus.textContent = "";
    fetch("themes/included_themes.json")
        .then(function(r) {
            if (!r.ok) throw new Error("Registry not found");
            return r.json();
        })
        .then(function(data) {
            if (!Array.isArray(data) || data.length === 0) {
                themesStatus.textContent = "No themes found in registry.";
                if (onComplete) onComplete();
                return;
            }
            renderThemeGrid(data);
            if (onComplete) onComplete();
        })
        .catch(function() {
            themesStatus.textContent = "Could not load themes.";
            if (onComplete) onComplete();
        });
}

function openThemesOverlay() {
    themesOverlay.classList.remove("hidden");
    themesOverlay.setAttribute("aria-hidden", "false");
    var communityEnabled = localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES_ENABLED) === "true";
    communityThemesToggle.checked = communityEnabled;
    loadThemesRegistry(communityEnabled ? loadCommunityThemes : null);
}

function closeThemesOverlay() {
    themesOverlay.classList.add("hidden");
    themesOverlay.setAttribute("aria-hidden", "true");
}

function loadCommunityThemes() {
    fetch("themes/community_themes.json")
        .then(function(r) {
            if (!r.ok) throw new Error("Registry not found");
            return r.json();
        })
        .then(function(data) {
            if (!Array.isArray(data)) return;
            var items = [];
            data.forEach(function(t) {
                var id = t.id;
                if (typeof id === "string" && /^nnt-[a-zA-Z0-9_-]+$/.test(id)) {
                    var name = (typeof t.name === "string" && t.name.trim())
                        ? t.name.trim()
                        : id.replace(/^nnt-/, "");
                    items.push({ id: id, name: name });
                }
            });
            appendCommunityThemes(items);
        })
        .catch(function() {
            // community_themes.json missing or invalid — nothing to append
        });
}

function appendCommunityThemes(items) {
    if (!items.length) return;

    var activeId = getActiveThemeId();

    // Find an existing Community section label (added by renderThemeGrid or a prior call)
    var communityLabel = null;
    var labels = themesGrid.querySelectorAll(".themes-section-label");
    labels.forEach(function(label) {
        if (label.textContent === "Community") communityLabel = label;
    });

    // Collect theme IDs already rendered in the Community section to avoid duplicates
    var existingIds = new Set();
    if (communityLabel) {
        var sibling = communityLabel.nextElementSibling;
        while (sibling && !sibling.classList.contains("themes-section-label")) {
            if (sibling.dataset.themeId) existingIds.add(sibling.dataset.themeId);
            sibling = sibling.nextElementSibling;
        }
    }

    var newItems = items.filter(function(item) { return !existingIds.has(item.id); });
    if (!newItems.length) return;

    if (!communityLabel) {
        communityLabel = document.createElement("p");
        communityLabel.className = "themes-section-label";
        communityLabel.textContent = "Community";
        themesGrid.appendChild(communityLabel);
    }

    newItems.forEach(function(item) {
        themesGrid.appendChild(createThemeCard(item.id, item.name, isThemeActive(item.id, activeId)));
    });
}

function removeCommunityThemesFromGrid() {
    var communityLabel = null;
    var labels = themesGrid.querySelectorAll(".themes-section-label");
    labels.forEach(function(label) {
        if (label.textContent === "Community") communityLabel = label;
    });
    if (!communityLabel) return;
    var sibling = communityLabel.nextElementSibling;
    while (sibling && !sibling.classList.contains("themes-section-label")) {
        var next = sibling.nextElementSibling;
        sibling.remove();
        sibling = next;
    }
    communityLabel.remove();
}

function applyThemesEnabledSetting() {
    var enabled = localStorage.getItem(STORAGE_KEYS.THEMES_ENABLED) === "true";
    themesEnabledToggle.checked = enabled;
    browseThemesBtn.classList.toggle("hidden", !enabled);
}

// --- Event Listeners ---

browseThemesBtn.addEventListener("click", openThemesOverlay);
document.getElementById("close-themes-btn").addEventListener("click", closeThemesOverlay);

themesEnabledToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.THEMES_ENABLED, this.checked ? "true" : "false");
    browseThemesBtn.classList.toggle("hidden", !this.checked);
    if (!this.checked) {
        closeThemesOverlay();
    }
});

communityThemesToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES_ENABLED, this.checked ? "true" : "false");
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
    fetch("themes/included/0/theme.json")
        .then(function(r) {
            if (!r.ok) throw new Error("Not found");
            return r.json();
        })
        .then(function(themeData) {
            applyThemePreset(themeData, 0);
        })
        .catch(function() {
            // theme.json missing — at minimum persist the id so null is never repeated
            localStorage.setItem(STORAGE_KEYS.THEME, "0");
        });
}
