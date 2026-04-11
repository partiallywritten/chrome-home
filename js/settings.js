"use strict";

// --- DOM Elements ---
var addBtn = document.getElementById("add-btn");
var settingsBtn = document.getElementById("settings-btn");
var settingsPanel = document.getElementById("settings-panel");
var closeSettingsBtn = document.getElementById("close-settings");
var settingsSections = settingsPanel.querySelectorAll("details.settings-section");

var bgColorInput = document.getElementById("bg-color");
var bgColorHexInput = document.getElementById("bg-color-hex");
var surfaceColorInput = document.getElementById("surface-color");
var surfaceColorHexInput = document.getElementById("surface-color-hex");
var highlightColorInput = document.getElementById("highlight-color");
var highlightColorHexInput = document.getElementById("highlight-color-hex");
var textColorInput = document.getElementById("text-color");
var textColorHexInput = document.getElementById("text-color-hex");

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

var searchWidthInput = document.getElementById("search-width");
var searchXInput = document.getElementById("search-x");
var searchYInput = document.getElementById("search-y");

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
var exportThemeBtn = document.getElementById("export-theme-btn");

var searchForm = document.getElementById("search-form");
var searchInput = document.getElementById("search-input");
var searchUrlInput = document.getElementById("search-url");
var searchUrlError = document.getElementById("search-url-error");
var applySearchUrlBtn = document.getElementById("apply-search-url");
var clearSearchUrlBtn = document.getElementById("clear-search-url");

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
        markUserTheme();
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
        markUserTheme();
        setFavicon(dataUrl);
    });
}

// --- ZIP Builder ---

var _crc32Table = (function () {
    var table = new Int32Array(256);
    for (var i = 0; i < 256; i++) {
        var c = i;
        for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c;
    }
    return table;
}());

function crc32(data) {
    var crc = -1;
    for (var i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ _crc32Table[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
}

function buildZipBytes(files) {
    var encoder = new TextEncoder();
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    files.forEach(function (file) {
        var nameBytes = encoder.encode(file.name);
        var data = file.data;
        var checksum = crc32(data);
        var size = data.length;

        var local = new Uint8Array(30 + nameBytes.length);
        var lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0, true);
        lv.setUint16(8, 0, true);
        lv.setUint16(10, 0, true);
        lv.setUint16(12, 0, true);
        lv.setUint32(14, checksum, true);
        lv.setUint32(18, size, true);
        lv.setUint32(22, size, true);
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);
        local.set(nameBytes, 30);
        localParts.push(local, data);

        var central = new Uint8Array(46 + nameBytes.length);
        var cv = new DataView(central.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0, true);
        cv.setUint32(16, checksum, true);
        cv.setUint32(20, size, true);
        cv.setUint32(24, size, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralParts.push(central);

        offset += 30 + nameBytes.length + size;
    });

    var centralStart = offset;
    var centralSize = centralParts.reduce(function (s, p) { return s + p.length; }, 0);

    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralStart, true);
    ev.setUint16(20, 0, true);

    var allParts = localParts.concat(centralParts).concat([eocd]);
    var totalLen = allParts.reduce(function (s, p) { return s + p.length; }, 0);
    var result = new Uint8Array(totalLen);
    var pos = 0;
    allParts.forEach(function (p) { result.set(p, pos); pos += p.length; });
    return result;
}

function dataUrlToBytes(dataUrl) {
    var comma = dataUrl.indexOf(",");
    var base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// --- Panel & Modal ---

function syncExportBtnVisibility() {
    exportThemeBtn.classList.toggle("hidden", localStorage.getItem(STORAGE_KEYS.THEME) !== "user");
}

function markUserTheme() {
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    syncExportBtnVisibility();
}

function exportUserTheme() {
    var theme = {
        name: "User Theme",
        bgColor: localStorage.getItem(STORAGE_KEYS.BG_COLOR) || DEFAULTS.BG_COLOR,
        surfaceColor: localStorage.getItem(STORAGE_KEYS.SURFACE_COLOR) || DEFAULTS.SURFACE_COLOR,
        highlightColor: localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_COLOR) || DEFAULTS.HIGHLIGHT_COLOR,
        textColor: localStorage.getItem(STORAGE_KEYS.TEXT_COLOR) || DEFAULTS.TEXT_COLOR,
        clockSize: localStorage.getItem(STORAGE_KEYS.CLOCK_SIZE) || DEFAULTS.CLOCK_SIZE,
        clockX: localStorage.getItem(STORAGE_KEYS.CLOCK_X) || DEFAULTS.CLOCK_X,
        clockY: localStorage.getItem(STORAGE_KEYS.CLOCK_Y) || DEFAULTS.CLOCK_Y,
        fontUrl: localStorage.getItem(STORAGE_KEYS.FONT_URL) || "",
        fontFamily: localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) || DEFAULTS.FONT_FAMILY,
        bgBrightness: localStorage.getItem(STORAGE_KEYS.BG_BRIGHTNESS) || "0",
        bgImageEnabled: localStorage.getItem(STORAGE_KEYS.BG_IMAGE_ENABLED) !== "false",
        tabName: localStorage.getItem(STORAGE_KEYS.TAB_NAME) || "",
        favicon: localStorage.getItem(STORAGE_KEYS.FAVICON) || ""
    };
    var jsonBytes = new TextEncoder().encode(JSON.stringify(theme, null, 2));
    var themeId = "chu-" + crc32(jsonBytes).toString(16).padStart(8, "0");
    var fileName = themeId + ".zip";

    getBgImage(function (bgImage) {
        function buildAndDownload(bgBytes) {
            var files = [{ name: themeId + "/theme.json", data: jsonBytes }];
            if (bgBytes) files.push({ name: themeId + "/background.jpg", data: bgBytes });
            var zipBytes = buildZipBytes(files);
            var blob = new Blob([zipBytes], { type: "application/zip" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        if (!bgImage) {
            buildAndDownload(null);
            return;
        }
        if (bgImage.startsWith("data:image/")) {
            buildAndDownload(dataUrlToBytes(bgImage));
            return;
        }
        var safeUrl = sanitizeHttpUrl(bgImage);
        if (!safeUrl) {
            buildAndDownload(null);
            return;
        }
        fetch(safeUrl)
            .then(function (r) {
                if (!r.ok) throw new Error("Fetch failed");
                return r.arrayBuffer();
            })
            .then(function (buf) { buildAndDownload(new Uint8Array(buf)); })
            .catch(function () { buildAndDownload(null); });
    });
}

function openSettings() {
    settingsPanel.classList.add("open");
    settingsPanel.setAttribute("aria-hidden", "false");
    applyThemesEnabledSetting();
    syncExportBtnVisibility();
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
    fetch("themes/0/theme.json")
        .then(function(r) {
            if (!r.ok) throw new Error("Not found");
            return r.json();
        })
        .then(function(themeData) {
            applyThemePreset(themeData, 0);
            closeThemesOverlay();
            syncExportBtnVisibility();
        })
        .catch(function() {
            // theme.json missing — at minimum record the active theme id
            localStorage.setItem(STORAGE_KEYS.THEME, "0");
            closeThemesOverlay();
            syncExportBtnVisibility();
        });
}

// --- Event Listeners ---

// UI Controls
settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettingsPanel);
addBtn.addEventListener("click", openModal);
modalCancel.addEventListener("click", closeModal);
exportThemeBtn.addEventListener("click", exportUserTheme);

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

// --- Color Picker Utilities ---

var HEX_RE = /^#[0-9a-fA-F]{6}$/;

function syncHexFromPicker(pickerEl, hexEl) {
    hexEl.value = pickerEl.value.toUpperCase();
    hexEl.removeAttribute("aria-invalid");
}

function syncPickerFromHex(hexEl, pickerEl, onValid) {
    var raw = hexEl.value.trim();
    if (!raw.startsWith("#")) raw = "#" + raw;
    if (HEX_RE.test(raw)) {
        hexEl.value = raw.toUpperCase();
        hexEl.removeAttribute("aria-invalid");
        pickerEl.value = raw.toLowerCase();
        onValid(raw.toLowerCase());
    } else {
        hexEl.setAttribute("aria-invalid", "true");
    }
}

// Color Inputs
bgColorInput.addEventListener("input", function() {
    syncHexFromPicker(this, bgColorHexInput);
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, this.value);
    markUserTheme();
    docStyle.setProperty("--bg-color", this.value);
    document.body.style.backgroundColor = this.value;
});
bgColorHexInput.addEventListener("input", function() {
    syncPickerFromHex(this, bgColorInput, function(hex) {
        localStorage.setItem(STORAGE_KEYS.BG_COLOR, hex);
        markUserTheme();
        docStyle.setProperty("--bg-color", hex);
        document.body.style.backgroundColor = hex;
    });
});

surfaceColorInput.addEventListener("input", function() {
    syncHexFromPicker(this, surfaceColorHexInput);
    localStorage.setItem(STORAGE_KEYS.SURFACE_COLOR, this.value);
    markUserTheme();
    docStyle.setProperty("--surface", hexToRgba(this.value, 0.52));
    docStyle.setProperty("--panel-bg", hexToRgba(this.value, 0.95));
});
surfaceColorHexInput.addEventListener("input", function() {
    syncPickerFromHex(this, surfaceColorInput, function(hex) {
        localStorage.setItem(STORAGE_KEYS.SURFACE_COLOR, hex);
        markUserTheme();
        docStyle.setProperty("--surface", hexToRgba(hex, 0.52));
        docStyle.setProperty("--panel-bg", hexToRgba(hex, 0.95));
    });
});

highlightColorInput.addEventListener("input", function() {
    syncHexFromPicker(this, highlightColorHexInput);
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_COLOR, this.value);
    markUserTheme();
    docStyle.setProperty("--accent", this.value);
    docStyle.setProperty("--accent-hover", hexToRgba(this.value, 0.85));
    docStyle.setProperty("--surface-hover", hexToRgba(this.value, 0.16));
});
highlightColorHexInput.addEventListener("input", function() {
    syncPickerFromHex(this, highlightColorInput, function(hex) {
        localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_COLOR, hex);
        markUserTheme();
        docStyle.setProperty("--accent", hex);
        docStyle.setProperty("--accent-hover", hexToRgba(hex, 0.85));
        docStyle.setProperty("--surface-hover", hexToRgba(hex, 0.16));
    });
});

textColorInput.addEventListener("input", function() {
    syncHexFromPicker(this, textColorHexInput);
    localStorage.setItem(STORAGE_KEYS.TEXT_COLOR, this.value);
    markUserTheme();
    docStyle.setProperty("--text", this.value);
    docStyle.setProperty("--text-muted", hexToRgba(this.value, 0.74));
});
textColorHexInput.addEventListener("input", function() {
    syncPickerFromHex(this, textColorInput, function(hex) {
        localStorage.setItem(STORAGE_KEYS.TEXT_COLOR, hex);
        markUserTheme();
        docStyle.setProperty("--text", hex);
        docStyle.setProperty("--text-muted", hexToRgba(hex, 0.74));
    });
});

// Clock Inputs
clockSizeInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_SIZE, this.value);
    markUserTheme();
    docStyle.setProperty("--clock-size", `${this.value}rem`);
});
clockXInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_X, this.value);
    markUserTheme();
    docStyle.setProperty("--clock-x", `${this.value}dvw`);
});
clockYInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_Y, this.value);
    markUserTheme();
    docStyle.setProperty("--clock-y", `${this.value}dvh`);
});

// Search Bar Controls
searchWidthInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_WIDTH, this.value);
    docStyle.setProperty("--search-width", `${this.value}px`);
});
searchXInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_X, this.value);
    docStyle.setProperty("--search-x", `${this.value}dvw`);
});
searchYInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_Y, this.value);
    docStyle.setProperty("--search-y", `${this.value}dvh`);
});

// Background Controls
bgImageToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_ENABLED, this.checked ? "true" : "false");
    markUserTheme();
    applyBackground();
});

bgBrightnessInput.addEventListener("input", function() {
    localStorage.setItem(STORAGE_KEYS.BG_BRIGHTNESS, this.value);
    markUserTheme();
    docStyle.setProperty("--bg-image-brightness", String(brightnessScale(this.value)));
});

bgImageCapSelect.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_CAP, this.value);
    markUserTheme();
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
        markUserTheme();
        saveBgImage(safeUrl);
        setBodyBgImage(safeUrl);
    });
});

clearBgBtn.addEventListener("click", function() {
    markUserTheme();
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
        markUserTheme();
        applyCustomFont("", fontFamily);
        return;
    }

    processUrlInput(fontUrlInput, fontUrlError, "Please enter a valid http or https stylesheet URL.", function(safeUrl) {
        localStorage.setItem(STORAGE_KEYS.FONT_URL, safeUrl);
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);
        markUserTheme();
        applyCustomFont(safeUrl, fontFamily);
    });
});

// Tab Name & Favicon Controls
applyTabNameBtn.addEventListener("click", function() {
    var name = tabNameInput.value.trim();
    if (name) localStorage.setItem(STORAGE_KEYS.TAB_NAME, name);
    else localStorage.removeItem(STORAGE_KEYS.TAB_NAME);
    markUserTheme();
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
        markUserTheme();
        setFavicon(safeUrl);
    });
});

clearFaviconBtn.addEventListener("click", function() {
    localStorage.removeItem(STORAGE_KEYS.FAVICON);
    markUserTheme();
    faviconUrlInput.value = "";
    faviconFileInput.value = "";
    faviconUrlInput.removeAttribute("aria-invalid");
    faviconUrlError.textContent = "";
    setFavicon("");
});

// Search Form Submission
searchForm.addEventListener("submit", function(e) {
    e.preventDefault();
    var query = searchInput.value.trim();
    if (!query) return;
    var template = localStorage.getItem(STORAGE_KEYS.SEARCH_URL) || DEFAULTS.SEARCH_URL;
    window.location.href = template.replace("{query}", encodeURIComponent(query));
});

// Search URL Controls
applySearchUrlBtn.addEventListener("click", function() {
    var raw = searchUrlInput.value.trim();
    if (!raw) {
        localStorage.removeItem(STORAGE_KEYS.SEARCH_URL);
        searchUrlInput.removeAttribute("aria-invalid");
        searchUrlError.textContent = "";
        return;
    }
    if (!raw.includes("{query}")) {
        searchUrlInput.setAttribute("aria-invalid", "true");
        searchUrlError.textContent = "URL must contain {query}.";
        searchUrlInput.focus();
        return;
    }
    var testUrl = sanitizeHttpUrl(raw.replace("{query}", "test"));
    if (!testUrl) {
        searchUrlInput.setAttribute("aria-invalid", "true");
        searchUrlError.textContent = "Please enter a valid http or https URL containing {query}.";
        searchUrlInput.focus();
        return;
    }
    searchUrlInput.removeAttribute("aria-invalid");
    searchUrlError.textContent = "";
    localStorage.setItem(STORAGE_KEYS.SEARCH_URL, raw);
});

clearSearchUrlBtn.addEventListener("click", function() {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_URL);
    searchUrlInput.value = "";
    searchUrlInput.removeAttribute("aria-invalid");
    searchUrlError.textContent = "";
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
clearErrorOnInput(searchUrlInput, searchUrlError);

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
