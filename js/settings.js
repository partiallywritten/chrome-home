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

// --- Settings-only Utilities ---

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

function applyLocalBackgroundFile(file) {
    readImageFile(file, bgImageError, function(dataUrl) {
        bgImageInput.value = "";
        bgImageInput.removeAttribute("aria-invalid");
        setBodyBgImage(dataUrl);
        saveBgImage(dataUrl);
    });
}

function applyLocalFaviconFile(file) {
    readImageFile(file, faviconUrlError, function(dataUrl) {
        faviconUrlInput.value = "";
        faviconUrlInput.removeAttribute("aria-invalid");
        localStorage.setItem(STORAGE_KEYS.FAVICON, dataUrl);
        setFavicon(dataUrl);
    });
}

// --- Panel & Modal ---

function openSettings() {
    settingsPanel.classList.add("open");
    settingsPanel.setAttribute("aria-hidden", "false");
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
    applyThemeSettings();
    applyBackground();
    applyBackgroundBrightness();
    applyClockSettings();
    applyFontSettings();
    applyGeneralSettings();
}

// --- Event Listeners ---

// UI Controls
settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettingsPanel);
addBtn.addEventListener("click", openModal);
modalCancel.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", function(e) {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        closeSettingsPanel();
        closeModal();
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
    document.documentElement.style.setProperty("--bg-color", this.value);
    if (!localStorage.getItem(STORAGE_KEYS.BG_IMAGE)) {
        document.body.style.backgroundColor = this.value;
    }
});

highlightColorInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_COLOR, this.value);
    document.documentElement.style.setProperty("--accent", this.value);
    document.documentElement.style.setProperty("--accent-hover", hexToRgba(this.value, 0.85));
});

textColorInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.TEXT_COLOR, this.value);
    document.documentElement.style.setProperty("--text", this.value);
    document.documentElement.style.setProperty("--text-muted", hexToRgba(this.value, 0.74));
});

// Clock Inputs
clockSizeInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_SIZE, this.value);
    document.documentElement.style.setProperty("--clock-size", `${this.value}rem`);
});
clockXInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_X, this.value);
    document.documentElement.style.setProperty("--clock-x", `${this.value}px`);
});
clockYInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_Y, this.value);
    document.documentElement.style.setProperty("--clock-y", `${this.value}px`);
});

// Background Controls
bgBrightnessInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.BG_BRIGHTNESS, this.value);
    applyBackgroundBrightness();
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
        saveBgImage(safeUrl);
        setBodyBgImage(safeUrl);
    });
});

clearBgBtn.addEventListener("click", function() {
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
        applyCustomFont("", fontFamily);
        return;
    }

    processUrlInput(fontUrlInput, fontUrlError, "Please enter a valid http or https stylesheet URL.", function(safeUrl) {
        localStorage.setItem(STORAGE_KEYS.FONT_URL, safeUrl);
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);
        applyCustomFont(safeUrl, fontFamily);
    });
});

// Tab Name & Favicon Controls
applyTabNameBtn.addEventListener("click", function() {
    var name = tabNameInput.value.trim();
    if (name) localStorage.setItem(STORAGE_KEYS.TAB_NAME, name);
    else localStorage.removeItem(STORAGE_KEYS.TAB_NAME);
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
        setFavicon(safeUrl);
    });
});

clearFaviconBtn.addEventListener("click", function() {
    localStorage.removeItem(STORAGE_KEYS.FAVICON);
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
