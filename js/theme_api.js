"use strict";

// --- DOM Elements ---
var browseThemesBtn = document.getElementById("browse-themes-btn");
var themesEnabledToggle = document.getElementById("themes-enabled-toggle");
var customThemesEnabledToggle = document.getElementById("custom-themes-toggle");
var customThemesSetting = document.getElementById("custom-themes-setting");
var themesOverlay = document.getElementById("themes-overlay");
var themesGrid = document.getElementById("themes-grid");
var themesStatus = document.getElementById("themes-status");

// --- Themes ---

function getActiveThemeId() {
    var storedId = localStorage.getItem(STORAGE_KEYS.THEME);
    if (storedId === null) return 0;
    if (storedId === "user") return null;
    if (/^chu-/.test(storedId)) return storedId;
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
    set(STORAGE_KEYS.HIGHLIGHT_COLOR, theme.highlightColor);
    set(STORAGE_KEYS.TEXT_COLOR, theme.textColor);
    set(STORAGE_KEYS.CLOCK_SIZE, theme.clockSize);
    set(STORAGE_KEYS.CLOCK_X, theme.clockX);
    set(STORAGE_KEYS.CLOCK_Y, theme.clockY);
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

    // Store active theme ID
    localStorage.setItem(STORAGE_KEYS.THEME, String(themeId));

    // Re-apply all settings (except background — handled below)
    applyThemeSettings();
    applyBackgroundBrightness();
    applyBgImageCapSetting();
    applyClockSettings();
    applyFontSettings();
    applyGeneralSettings();

    // Fetch the theme background image, process through canvas (respecting cap), save as data URL
    if (!bgEnabled) {
        saveBgImage("", function() { applyBackground(); });
    } else {
        var themeBgUrl = "themes/" + themeId + "/background.jpg";
        fetch(themeBgUrl)
            .then(function(r) {
                if (!r.ok) throw new Error("Image not found");
                return r.blob();
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
    img.src = "themes/" + idStr + "/background.jpg";
    img.alt = "";
    img.className = "theme-card__img";
    thumb.appendChild(img);

    var label = document.createElement("span");
    label.className = "theme-card__name";
    label.textContent = name;

    card.appendChild(thumb);
    card.appendChild(label);

    card.addEventListener("click", function () {
        fetch("themes/" + idStr + "/theme.json")
            .then(function (r) {
                if (!r.ok) throw new Error("Theme not found");
                return r.json();
            })
            .then(function (themeData) {
                var themeIdVal = /^chu-/.test(idStr) ? idStr : Number(idStr);
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
    var communityItems = [];

    themes.forEach(function (t) {
        var id = t.id;
        if (typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id))) {
            var safeId = Math.floor(Number(id));
            if (!Number.isFinite(safeId) || safeId < 0) return;
            includedItems.push({ id: String(safeId), name: t.name });
        } else if (typeof id === "string" && /^chu-[a-zA-Z0-9_-]+$/.test(id)) {
            communityItems.push({ id: id, name: t.name });
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
    appendSection("Community", communityItems);
}

function loadThemesRegistry(onComplete) {
    themesStatus.textContent = "";
    fetch("themes/themes.json")
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
    loadThemesRegistry(localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES_ENABLED) === "true" ? loadCommunityThemes : null);
}

function closeThemesOverlay() {
    themesOverlay.classList.add("hidden");
    themesOverlay.setAttribute("aria-hidden", "true");
}

function loadCommunityThemes() {
    var manifest = (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest)
        ? chrome.runtime.getManifest() : {};
    var war = manifest.web_accessible_resources || [];
    var themeIdSet = new Set();
    war.forEach(function(entry) {
        var resources = Array.isArray(entry.resources) ? entry.resources : [];
        resources.forEach(function(r) {
            var m = /^themes\/(chu-[a-zA-Z0-9_-]+)\//.exec(r);
            if (m) themeIdSet.add(m[1]);
        });
    });

    var themeIds = Array.from(themeIdSet);
    if (themeIds.length === 0) return;

    var pending = themeIds.length;
    var communityThemes = [];
    themeIds.forEach(function(id) {
        fetch("themes/" + id + "/theme.json")
            .then(function(r) {
                if (!r.ok) throw new Error("Not found");
                return r.json();
            })
            .then(function(data) {
                var name = (typeof data.name === "string" && data.name.trim())
                    ? data.name.trim()
                    : id.replace(/^chu-/, "");
                communityThemes.push({ id: id, name: name });
            })
            .catch(function() {
                communityThemes.push({ id: id, name: id.replace(/^chu-/, "") });
            })
            .finally(function() {
                pending--;
                if (pending === 0) appendCommunityThemes(communityThemes);
            });
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

function applyThemesEnabledSetting() {
    var enabled = localStorage.getItem(STORAGE_KEYS.THEMES_ENABLED) === "true";
    themesEnabledToggle.checked = enabled;
    browseThemesBtn.classList.toggle("hidden", !enabled);
    customThemesSetting.classList.toggle("hidden", !enabled);
    customThemesEnabledToggle.checked = enabled && localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES_ENABLED) === "true";
}

// --- Event Listeners ---

browseThemesBtn.addEventListener("click", openThemesOverlay);
document.getElementById("close-themes-btn").addEventListener("click", closeThemesOverlay);

themesEnabledToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.THEMES_ENABLED, this.checked ? "true" : "false");
    browseThemesBtn.classList.toggle("hidden", !this.checked);
    customThemesSetting.classList.toggle("hidden", !this.checked);
    if (!this.checked) {
        closeThemesOverlay();
        customThemesEnabledToggle.checked = false;
    }
});

customThemesEnabledToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES_ENABLED, this.checked ? "true" : "false");
});

// --- Initialization ---

// Ensure the Browse Themes button reflects the stored themes-enabled state on every page load,
// not just when the settings panel is opened for the first time.
applyThemesEnabledSetting();

// When ch_theme is null the extension is on its very first launch.
// Apply and fully persist theme 0 so null only ever occurs once.
if (localStorage.getItem(STORAGE_KEYS.THEME) === null) {
    fetch("themes/0/theme.json")
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
