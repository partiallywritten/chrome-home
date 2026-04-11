"use strict";

// --- DOM Elements ---
var addBtn = document.getElementById("add-btn");
var settingsBtn = document.getElementById("settings-btn");
var settingsPanel = document.getElementById("settings-panel");
var closeSettingsBtn = document.getElementById("close-settings");
var settingsSections = settingsPanel.querySelectorAll("details.settings-section");

var bgColorInput = document.getElementById("bg-color");
var highlightColorInput = document.getElementById("highlight-color");
var textColorInput = document.getElementById("text-color");

var bgImageInput = document.getElementById("bg-image");
var bgFileInput = document.getElementById("bg-file");
var bgImageError = document.getElementById("bg-image-error");
var applyBgBtn = document.getElementById("apply-bg");
var clearBgBtn = document.getElementById("clear-bg");
var bgBrightnessInput = document.getElementById("bg-brightness");
var bgImageCapSelect = document.getElementById("bg-image-cap");
var bgImageToggle = document.getElementById("bg-image-toggle");

var clockSizeInput = document.getElementById("clock-size");
var clockXInput = document.getElementById("clock-x");
var clockYInput = document.getElementById("clock-y");

var fontUrlInput = document.getElementById("font-url");
var fontUrlError = document.getElementById("font-url-error");
var fontFamilyInput = document.getElementById("font-family");
var applyFontBtn = document.getElementById("apply-font");

var modalOverlay = document.getElementById("modal-overlay");
var modalTitle = document.getElementById("modal-title");
var favNameInput = document.getElementById("fav-name");
var favNameError = document.getElementById("fav-name-error");
var favUrlInput = document.getElementById("fav-url");
var favUrlError = document.getElementById("fav-url-error");
var modalCancel = document.getElementById("modal-cancel");
var modalSave = document.getElementById("modal-save");

var tabNameInput = document.getElementById("tab-name");
var applyTabNameBtn = document.getElementById("apply-tab-name");
var faviconUrlInput = document.getElementById("favicon-url");
var faviconUrlError = document.getElementById("favicon-url-error");
var faviconFileInput = document.getElementById("favicon-file");
var applyFaviconBtn = document.getElementById("apply-favicon");
var clearFaviconBtn = document.getElementById("clear-favicon");
var restoreDefaultsBtn = document.getElementById("restore-defaults");
var browseThemesBtn = document.getElementById("browse-themes-btn");
var themesEnabledToggle = document.getElementById("themes-enabled-toggle");

var themesOverlay = document.getElementById("themes-overlay");
var themesGrid = document.getElementById("themes-grid");
var themesStatus = document.getElementById("themes-status");

// --- Settings-only Utilities ---

function compressImage(dataUrl, maxWidth, maxHeight, quality, callback) {
    var img = new Image();
    img.onload = function() {
        var width = img.naturalWidth;
        var height = img.naturalHeight;
        if (width > maxWidth || height > maxHeight) {
            var scale = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = function() {
        callback(dataUrl);
    };
    img.src = dataUrl;
}

function readImageFile(file, errorElement, onSuccess) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        if (errorElement) errorElement.textContent = "Please upload an image file.";
        return;
    }
    var reader = new FileReader();
    reader.onload = function(event) {
        var dataUrl = String(event.target.result);
        if (!dataUrl.startsWith("data:image/")) {
            if (errorElement) errorElement.textContent = "Could not read this image.";
            return;
        }
        if (errorElement) errorElement.textContent = "";
        onSuccess(dataUrl);
    };
    reader.onerror = function() {
        if (errorElement) errorElement.textContent = "Could not read this image.";
    };
    reader.readAsDataURL(file);
}

function processUrlInput(inputEl, errorEl, errorMessage, onSuccess) {
    var raw = inputEl.value.trim();
    if (!raw) return;

    var safeUrl = sanitizeHttpUrl(raw);
    if (!safeUrl) {
        inputEl.setAttribute("aria-invalid", "true");
        if (errorEl) errorEl.textContent = errorMessage;
        inputEl.focus();
        return;
    }

    inputEl.removeAttribute("aria-invalid");
    if (errorEl) errorEl.textContent = "";
    onSuccess(safeUrl);
}

function clearErrorOnInput(inputEl, errorEl) {
    inputEl.addEventListener("input", function() {
        if (inputEl.getAttribute("aria-invalid")) {
            inputEl.removeAttribute("aria-invalid");
            if (errorEl) errorEl.textContent = "";
        }
    });
}

// --- Settings-only Helpers ---

function getBgImageCapDimensions() {
    var cap = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_CAP) || DEFAULTS.BG_IMAGE_CAP;
    if (cap === "default") return null;
    if (cap === "4K") return { width: 3840, height: 2160 };
    if (cap === "1440p") return { width: 2560, height: 1440 };
    return { width: 1920, height: 1080 };
}

function applyLocalBackgroundFile(file) {
    readImageFile(file, bgImageError, function(dataUrl) {
        bgImageInput.value = "";
        bgImageInput.removeAttribute("aria-invalid");
        localStorage.setItem(STORAGE_KEYS.THEME, "user");
        var dims = getBgImageCapDimensions();
        if (!dims) {
            setBodyBgImage(dataUrl);
            saveBgImage(dataUrl);
            return;
        }
        compressImage(dataUrl, dims.width, dims.height, 0.8, function(compressed) {
            setBodyBgImage(compressed);
            saveBgImage(compressed);
        });
    });
}

function applyLocalFaviconFile(file) {
    readImageFile(file, faviconUrlError, function(dataUrl) {
        faviconUrlInput.value = "";
        faviconUrlInput.removeAttribute("aria-invalid");
        localStorage.setItem(STORAGE_KEYS.FAVICON, dataUrl);
        localStorage.setItem(STORAGE_KEYS.THEME, "user");
        setFavicon(dataUrl);
    });
}

// --- Panel & Modal ---

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
    cards.forEach(function(card) {
        var id = Number(card.dataset.themeId);
        card.classList.toggle("theme-card--active", id === activeId);
        card.setAttribute("aria-pressed", id === activeId ? "true" : "false");
    });
}

function renderThemeGrid(themes) {
    themesGrid.innerHTML = "";
    var activeId = Number(localStorage.getItem(STORAGE_KEYS.THEME)) || 0;
    themes.forEach(function(t) {
        // Validate that each entry has a safe positive-integer id
        var safeId = Math.floor(Number(t.id));
        if (!Number.isFinite(safeId) || safeId < 1) return;

        var card = document.createElement("button");
        card.className = "theme-card" + (safeId === activeId ? " theme-card--active" : "");
        card.dataset.themeId = String(safeId);
        card.setAttribute("aria-pressed", safeId === activeId ? "true" : "false");
        card.title = t.name;

        var thumb = document.createElement("div");
        thumb.className = "theme-card__thumb";
        var img = document.createElement("img");
        img.src = "themes/" + safeId + "/background.jpg";
        img.alt = "";
        img.className = "theme-card__img";
        thumb.appendChild(img);

        var label = document.createElement("span");
        label.className = "theme-card__name";
        label.textContent = t.name;

        card.appendChild(thumb);
        card.appendChild(label);

        card.addEventListener("click", function() {
            fetch("themes/" + safeId + "/theme.json")
                .then(function(r) {
                    if (!r.ok) throw new Error("Theme not found");
                    return r.json();
                })
                .then(function(themeData) {
                    applyThemePreset(themeData, safeId);
                })
                .catch(function() {
                    themesStatus.textContent = "Failed to load theme \u201c" + t.name + "\u201d.";
                });
        });

        themesGrid.appendChild(card);
    });
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

function openSettings() {
    settingsPanel.classList.add("open");
    settingsPanel.setAttribute("aria-hidden", "false");
    applyThemesEnabledSetting();
}

function closeSettingsPanel() {
    settingsPanel.classList.remove("open");
    settingsPanel.setAttribute("aria-hidden", "true");
}

function openModal() {
    modalTitle.textContent = "Add Favorite";
    favNameInput.value = "";
    favUrlInput.value = "";
    favNameInput.removeAttribute("aria-invalid");
    favUrlInput.removeAttribute("aria-invalid");
    favNameError.textContent = "";
    favUrlError.textContent = "";
    modalOverlay.classList.remove("hidden");
    favNameInput.focus();
}

function closeModal() {
    modalOverlay.classList.add("hidden");
}

// --- Restore Defaults ---

var restoreConfirmPending = false;
var restoreConfirmTimer = null;

function resetConfirmState() {
    restoreConfirmPending = false;
    clearTimeout(restoreConfirmTimer);
    restoreDefaultsBtn.textContent = "Restore Defaults";
    restoreDefaultsBtn.classList.remove("confirm-pending");
}

function restoreAllDefaults() {
    Object.values(STORAGE_KEYS).forEach(function(key) {
        if (key !== STORAGE_KEYS.FAVORITES) {
            localStorage.removeItem(key);
        }
    });
    saveBgImage("");
    closeThemesOverlay();
    applyThemeSettings();
    applyBackground();
    applyBackgroundBrightness();
    applyBgImageCapSetting();
    applyClockSettings();
    applyFontSettings();
    applyGeneralSettings();
    applyThemesEnabledSetting();
    renderThemeActiveState(0);
}

// --- Event Listeners ---

// UI Controls
settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettingsPanel);
addBtn.addEventListener("click", openModal);
modalCancel.addEventListener("click", closeModal);

browseThemesBtn.addEventListener("click", openThemesOverlay);
document.getElementById("close-themes-btn").addEventListener("click", closeThemesOverlay);

themesEnabledToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.THEMES_ENABLED, this.checked ? "true" : "false");
    browseThemesBtn.classList.toggle("hidden", !this.checked);
    if (!this.checked) closeThemesOverlay();
});

modalOverlay.addEventListener("click", function(e) {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        if (!themesOverlay.classList.contains("hidden")) {
            closeThemesOverlay();
        } else {
            closeSettingsPanel();
            closeModal();
        }
    }
});

// Accordion exclusivity
settingsSections.forEach(function(section) {
    section.addEventListener("toggle", function() {
        if (section.open) {
            settingsSections.forEach(function(other) {
                if (other !== section && other.open) {
                    other.removeAttribute("open");
                }
            });
        }
    });
});

// Color Inputs
bgColorInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    docStyle.setProperty("--bg-color", this.value);
    document.body.style.backgroundColor = this.value;
});

highlightColorInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_COLOR, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    docStyle.setProperty("--accent", this.value);
    docStyle.setProperty("--accent-hover", hexToRgba(this.value, 0.85));
});

textColorInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.TEXT_COLOR, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    docStyle.setProperty("--text", this.value);
    docStyle.setProperty("--text-muted", hexToRgba(this.value, 0.74));
});

// Clock Inputs
clockSizeInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_SIZE, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    docStyle.setProperty("--clock-size", `${this.value}rem`);
});
clockXInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_X, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    docStyle.setProperty("--clock-x", `${this.value}px`);
});
clockYInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_Y, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    docStyle.setProperty("--clock-y", `${this.value}px`);
});

// Background Controls
bgImageToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_ENABLED, this.checked ? "true" : "false");
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    applyBackground();
});

bgBrightnessInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.BG_BRIGHTNESS, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    docStyle.setProperty("--bg-image-brightness", String(brightnessScale(this.value)));
});

bgImageCapSelect.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_CAP, this.value);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
});

bgFileInput.addEventListener("change", function() {
    applyLocalBackgroundFile(bgFileInput.files && bgFileInput.files[0]);
});

applyBgBtn.addEventListener("click", function() {
    var file = bgFileInput.files && bgFileInput.files[0];
    if (file) {
        applyLocalBackgroundFile(file);
        return;
    }
    processUrlInput(bgImageInput, bgImageError, "Please enter a valid http or https image URL.", function(safeUrl) {
        localStorage.setItem(STORAGE_KEYS.THEME, "user");
        saveBgImage(safeUrl);
        setBodyBgImage(safeUrl);
    });
});

clearBgBtn.addEventListener("click", function() {
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    saveBgImage("");
    bgImageInput.value = "";
    bgFileInput.value = "";
    bgImageInput.removeAttribute("aria-invalid");
    bgImageError.textContent = "";
    setBodyBgImage("");
});

// Font Controls
applyFontBtn.addEventListener("click", function() {
    var rawFamily = fontFamilyInput.value.trim();
    var fontFamily = rawFamily || DEFAULTS.FONT_FAMILY;

    var rawUrl = fontUrlInput.value.trim();
    if (!rawUrl) {
        localStorage.removeItem(STORAGE_KEYS.FONT_URL);
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);
        localStorage.setItem(STORAGE_KEYS.THEME, "user");
        applyCustomFont("", fontFamily);
        return;
    }

    processUrlInput(fontUrlInput, fontUrlError, "Please enter a valid http or https stylesheet URL.", function(safeUrl) {
        localStorage.setItem(STORAGE_KEYS.FONT_URL, safeUrl);
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);
        localStorage.setItem(STORAGE_KEYS.THEME, "user");
        applyCustomFont(safeUrl, fontFamily);
    });
});

// Tab Name & Favicon Controls
applyTabNameBtn.addEventListener("click", function() {
    var name = tabNameInput.value.trim();
    if (name) localStorage.setItem(STORAGE_KEYS.TAB_NAME, name);
    else localStorage.removeItem(STORAGE_KEYS.TAB_NAME);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    document.title = name || "New Tab";
});

faviconFileInput.addEventListener("change", function() {
    applyLocalFaviconFile(faviconFileInput.files && faviconFileInput.files[0]);
});

applyFaviconBtn.addEventListener("click", function() {
    var file = faviconFileInput.files && faviconFileInput.files[0];
    if (file) {
        applyLocalFaviconFile(file);
        return;
    }
    processUrlInput(faviconUrlInput, faviconUrlError, "Please enter a valid http or https image URL.", function(safeUrl) {
        localStorage.setItem(STORAGE_KEYS.FAVICON, safeUrl);
        localStorage.setItem(STORAGE_KEYS.THEME, "user");
        setFavicon(safeUrl);
    });
});

clearFaviconBtn.addEventListener("click", function() {
    localStorage.removeItem(STORAGE_KEYS.FAVICON);
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    faviconUrlInput.value = "";
    faviconFileInput.value = "";
    faviconUrlInput.removeAttribute("aria-invalid");
    faviconUrlError.textContent = "";
    setFavicon("");
});

// Favorites Save
modalSave.addEventListener("click", function() {
    var name = favNameInput.value.trim();
    var url = favUrlInput.value.trim();

    favNameInput.removeAttribute("aria-invalid");
    favUrlInput.removeAttribute("aria-invalid");
    favNameError.textContent = "";
    favUrlError.textContent = "";

    if (!name) {
        favNameInput.setAttribute("aria-invalid", "true");
        favNameError.textContent = "Please enter a name.";
        favNameInput.focus();
        return;
    }

    url = url && !url.includes("://") ? "https://" + url : url;
    if (!url) {
        favUrlInput.setAttribute("aria-invalid", "true");
        favUrlError.textContent = "Please enter a URL.";
        favUrlInput.focus();
        return;
    }
    try {
        new URL(url);
    } catch (_) {
        favUrlInput.setAttribute("aria-invalid", "true");
        favUrlError.textContent = "Please enter a valid URL (e.g. https://example.com).";
        favUrlInput.focus();
        return;
    }

    addFavorite(name, url);
    closeModal();
});

[favNameInput, favUrlInput].forEach(function(input) {
    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") modalSave.click();
    });
});

// Clear UI Errors on Input
clearErrorOnInput(favNameInput, favNameError);
clearErrorOnInput(favUrlInput, favUrlError);
clearErrorOnInput(bgImageInput, bgImageError);
clearErrorOnInput(fontUrlInput, fontUrlError);
clearErrorOnInput(faviconUrlInput, faviconUrlError);

// Restore Defaults
restoreDefaultsBtn.addEventListener("click", function() {
    if (restoreConfirmPending) {
        resetConfirmState();
        restoreAllDefaults();
    } else {
        restoreConfirmPending = true;
        restoreDefaultsBtn.textContent = "Click again to confirm";
        restoreDefaultsBtn.classList.add("confirm-pending");
        restoreConfirmTimer = setTimeout(resetConfirmState, 3000);
    }
});
