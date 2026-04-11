"use strict";

// --- DOM Elements ---
var browseThemesBtn = document.getElementById("browse-themes-btn");
var themesEnabledToggle = document.getElementById("themes-enabled-toggle");
var themesOverlay = document.getElementById("themes-overlay");
var themesGrid = document.getElementById("themes-grid");
var themesStatus = document.getElementById("themes-status");

// --- Themes ---

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
        var cardId = card.dataset.themeId;
        var isActive;
        if (activeId === null || activeId === undefined) {
            isActive = false;
        } else if (typeof activeId === "number") {
            isActive = Number(cardId) === activeId;
        } else {
            isActive = cardId === activeId;
        }
        card.classList.toggle("theme-card--active", isActive);
        card.setAttribute("aria-pressed", isActive ? "true" : "false");
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
    var storedId = localStorage.getItem(STORAGE_KEYS.THEME);
    var activeId;
    if (storedId === null) activeId = 0;
    else if (storedId === "user") activeId = null;
    else if (/^chu-/.test(storedId)) activeId = storedId;
    else activeId = Number(storedId);

    var includedItems = [];
    var communityItems = [];

    themes.forEach(function (t) {
        var id = t.id;
        if (typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id))) {
            var safeId = Math.floor(Number(id));
            if (!Number.isFinite(safeId) || safeId < 0) return;
            includedItems.push({ idStr: String(safeId), name: t.name });
        } else if (typeof id === "string" && /^chu-[a-zA-Z0-9_-]+$/.test(id)) {
            communityItems.push({ idStr: id, name: t.name });
        }
    });

    function appendSection(label, items) {
        if (!items.length) return;
        var sectionLabel = document.createElement("p");
        sectionLabel.className = "themes-section-label";
        sectionLabel.textContent = label;
        themesGrid.appendChild(sectionLabel);
        items.forEach(function (item) {
            var isActive = activeId === null ? false :
                           typeof activeId === "number" ? Number(item.idStr) === activeId :
                           item.idStr === activeId;
            themesGrid.appendChild(createThemeCard(item.idStr, item.name, isActive));
        });
    }

    appendSection("Included", includedItems);
    appendSection("Community", communityItems);
}

function loadThemesRegistry() {
    themesStatus.textContent = "";
    fetch("themes/themes.json")
        .then(function(r) {
            if (!r.ok) throw new Error("Registry not found");
            return r.json();
        })
        .then(function(data) {
            if (!Array.isArray(data) || data.length === 0) {
                themesStatus.textContent = "No themes found in registry.";
                return;
            }
            renderThemeGrid(data);
        })
        .catch(function() {
            themesStatus.textContent = "Could not load themes.";
        });
}

function openThemesOverlay() {
    themesOverlay.classList.remove("hidden");
    themesOverlay.setAttribute("aria-hidden", "false");
    loadThemesRegistry();
}

function closeThemesOverlay() {
    themesOverlay.classList.add("hidden");
    themesOverlay.setAttribute("aria-hidden", "true");
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
    if (!this.checked) closeThemesOverlay();
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
