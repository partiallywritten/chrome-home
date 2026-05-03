"use strict";

// --- DOM Elements ---
const addBtn = document.getElementById("add-btn");
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const closeSettingsBtn = document.getElementById("close-settings");
const settingsSections = settingsPanel.querySelectorAll("details.settings-section");

const bgColorInput = document.getElementById("bg-color");
const bgColorHexInput = document.getElementById("bg-color-hex");
const surfaceColorInput = document.getElementById("surface-color");
const surfaceColorHexInput = document.getElementById("surface-color-hex");
const highlightColorInput = document.getElementById("highlight-color");
const highlightColorHexInput = document.getElementById("highlight-color-hex");
const textColorInput = document.getElementById("text-color");
const textColorHexInput = document.getElementById("text-color-hex");

const bgImageInput = document.getElementById("bg-image");
const bgFileInput = document.getElementById("bg-file");
const bgImageError = document.getElementById("bg-image-error");
const applyBgBtn = document.getElementById("apply-bg");
const clearBgBtn = document.getElementById("clear-bg");
const bgBrightnessInput = document.getElementById("bg-brightness");
const bgImageCapSelect = document.getElementById("bg-image-cap");
const bgFileSizeCapInput = document.getElementById("bg-file-size-cap");
const bgImageToggle = document.getElementById("bg-image-toggle");

const favoritesEnabledToggle = document.getElementById("favorites-enabled-toggle");
const favoritesShowAddToggle = document.getElementById("favorites-show-add-toggle");
const favoritesLayoutSelect = document.getElementById("favorites-layout-select");
const favoritesXInput = document.getElementById("favorites-x");
const favoritesYInput = document.getElementById("favorites-y");

const clockSizeInput = document.getElementById("clock-size");
const clockXInput = document.getElementById("clock-x");
const clockYInput = document.getElementById("clock-y");
const clockHiddenToggle = document.getElementById("clock-hidden-toggle");
const dateHiddenToggle = document.getElementById("date-hidden-toggle");

const searchWidthInput = document.getElementById("search-width");
const searchXInput = document.getElementById("search-x");
const searchYInput = document.getElementById("search-y");

const fontUrlInput = document.getElementById("font-url");
const fontUrlError = document.getElementById("font-url-error");
const fontFamilyInput = document.getElementById("font-family");
const applyFontBtn = document.getElementById("apply-font");

const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const favNameInput = document.getElementById("fav-name");
const favNameError = document.getElementById("fav-name-error");
const favUrlInput = document.getElementById("fav-url");
const favUrlError = document.getElementById("fav-url-error");
const modalCancel = document.getElementById("modal-cancel");
const modalSave = document.getElementById("modal-save");

const tabNameInput = document.getElementById("tab-name");
const applyTabNameBtn = document.getElementById("apply-tab-name");
const faviconUrlInput = document.getElementById("favicon-url");
const faviconUrlError = document.getElementById("favicon-url-error");
const faviconFileInput = document.getElementById("favicon-file");
const applyFaviconBtn = document.getElementById("apply-favicon");
const clearFaviconBtn = document.getElementById("clear-favicon");
const restoreDefaultsBtn = document.getElementById("restore-defaults");
const exportThemeBtn = document.getElementById("export-theme-btn");
const importThemeBtn = document.getElementById("import-theme-btn");
const importThemeFile = document.getElementById("import-theme-file");
const settingsBranding = document.getElementById("settings-branding");
const settingsVersionEl = document.getElementById("settings-version");
const updateNotice = document.getElementById("update-notice");
const updateVersionEl = document.getElementById("update-version");

// --- Branding ---
const version = chrome.runtime.getManifest().version;
settingsBranding.textContent = "Nozy-NT";
settingsVersionEl.textContent = `(v${version})`;

// --- Lazy version check (lowest priority) ---
requestIdleCallback(() => {
  fetch("https://raw.githubusercontent.com/partiallywritten/Nozy-NT/refs/heads/main/manifest.json")
    .then((res) => res.json())
    .then((data) => {
      const latestVersion = data && data.version;
      if (latestVersion && latestVersion !== version) {
        updateVersionEl.textContent = latestVersion;
        updateNotice.classList.remove("hidden");
      }
    })
    .catch(() => { /* silently ignore network errors */ });
}, { timeout: 5000 });

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchUrlInput = document.getElementById("search-url");
const searchUrlError = document.getElementById("search-url-error");
const applySearchUrlBtn = document.getElementById("apply-search-url");
const clearSearchUrlBtn = document.getElementById("clear-search-url");

// --- Settings-only Utilities ---

function compressImage(dataUrl, maxWidth, maxHeight, quality, callback) {
    const img = new Image();
    img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL("image/jpeg", quality);
        // Release the canvas backing store immediately rather than waiting for GC.
        // A 1080p canvas holds ~8 MB of pixel data that Chrome otherwise retains
        // until the next GC cycle.
        canvas.width = 0;
        callback(result);
    };
    img.onerror = () => {
        callback(dataUrl);
    };
    img.src = dataUrl;
}

function clampFileSizeCap(val) {
    return (Number.isFinite(val) && val > 0 && val <= MAX_FILE_SIZE_MB) ? val : Number(DEFAULTS.BG_FILE_SIZE_CAP);
}

function getBgFileSizeCapBytes() {
    const raw = localStorage.getItem(STORAGE_KEYS.BG_FILE_SIZE_CAP);
    return clampFileSizeCap(Number(raw)) * 1024 * 1024;
}

function readImageFile(file, errorElement, onSuccess) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        if (errorElement) errorElement.textContent = "Please upload an image file.";
        return;
    }
    const maxBytes = getBgFileSizeCapBytes();
    if (file.size > maxBytes) {
        const mb = Math.round(maxBytes / (1024 * 1024));
        if (errorElement) errorElement.textContent = `File must be under ${mb} MB.`;
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUrl = String(event.target.result);
        if (!dataUrl.startsWith("data:image/")) {
            if (errorElement) errorElement.textContent = "Could not read this image.";
            return;
        }
        if (errorElement) errorElement.textContent = "";
        onSuccess(dataUrl);
    };
    reader.onerror = () => {
        if (errorElement) errorElement.textContent = "Could not read this image.";
    };
    reader.readAsDataURL(file);
}

function readVideoFile(file, errorElement, onSuccess) {
    if (!file) return;
    if (file.type !== "video/mp4" && file.type !== "video/webm") {
        if (errorElement) errorElement.textContent = "Please upload an mp4 or webm video file.";
        return;
    }
    const maxBytes = getBgFileSizeCapBytes();
    if (file.size > maxBytes) {
        const mb = Math.round(maxBytes / (1024 * 1024));
        if (errorElement) errorElement.textContent = `Video must be under ${mb} MB.`;
        return;
    }
    if (errorElement) errorElement.textContent = "";
    onSuccess(file);
}

function syncBgCapSelectState() {
    var isVideo = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE) === "video";
    bgImageCapSelect.disabled = isVideo;
    bgImageCapSelect.title = isVideo ? "Quality cap does not apply to video backgrounds." : "";
}

function forceBgCapToDefault() {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_CAP, "default");
    bgImageCapSelect.value = "default";
}

function isAnimatedWebpFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const bytes = new Uint8Array(e.target.result);
        // Verify RIFF....WEBP header
        if (bytes.length < 12 ||
            bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
            bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) {
            callback(false);
            return;
        }
        // Presence of an ANIM chunk indicates animated WebP
        for (let i = 12; i < bytes.length - 3; i++) {
            if (bytes[i] === 0x41 && bytes[i+1] === 0x4E && bytes[i+2] === 0x49 && bytes[i+3] === 0x4D) {
                callback(true);
                return;
            }
        }
        callback(false);
    };
    reader.onerror = () => { callback(false); };
    // ANIM chunk appears within the first few hundred bytes; 1 KB is more than sufficient
    reader.readAsArrayBuffer(file.slice(0, 1024));
}

function processUrlInput(inputEl, errorEl, errorMessage, onSuccess) {
    const raw = inputEl.value.trim();
    if (!raw) return;

    const safeUrl = sanitizeHttpUrl(raw);
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
    inputEl.addEventListener("input", () => {
        if (inputEl.getAttribute("aria-invalid")) {
            inputEl.removeAttribute("aria-invalid");
            if (errorEl) errorEl.textContent = "";
        }
    });
}

// --- Settings-only Helpers ---

function getBgImageCapDimensions() {
    const cap = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_CAP) || DEFAULTS.BG_IMAGE_CAP;
    if (cap === "default") return null;
    if (cap === "4K") return { width: 3840, height: 2160 };
    if (cap === "1440p") return { width: 2560, height: 1440 };
    return { width: 1920, height: 1080 };
}

function applyLocalBackgroundFile(file) {
    if (!file) return;
    if (file.type === "video/mp4" || file.type === "video/webm") {
        forceBgCapToDefault();
        readVideoFile(file, bgImageError, (videoFile) => {
            bgImageInput.value = "";
            bgImageInput.removeAttribute("aria-invalid");
            markUserTheme();
            saveBgVideo(videoFile, () => {
                getBgImage((blobUrl) => {
                    setBodyBgVideo(blobUrl);
                    syncBgCapSelectState();
                });
            });
        });
        return;
    }
    readImageFile(file, bgImageError, (dataUrl) => {
        bgImageInput.value = "";
        bgImageInput.removeAttribute("aria-invalid");
        markUserTheme();
        if (file.type === "image/gif") {
            forceBgCapToDefault();
            setBodyBgImage(dataUrl);
            saveBgImage(dataUrl);
            syncBgCapSelectState();
            return;
        }
        if (file.type === "image/webp") {
            isAnimatedWebpFile(file, (animated) => {
                if (animated) forceBgCapToDefault();
                // Read dims after forceBgCapToDefault() so animated WebPs always get null dims
                const dims = getBgImageCapDimensions();
                if (!dims) {
                    setBodyBgImage(dataUrl);
                    saveBgImage(dataUrl);
                    syncBgCapSelectState();
                } else {
                    compressImage(dataUrl, dims.width, dims.height, 0.8, (compressed) => {
                        setBodyBgImage(compressed);
                        saveBgImage(compressed);
                        syncBgCapSelectState();
                    });
                }
            });
            return;
        }
        const dims = getBgImageCapDimensions();
        if (!dims) {
            setBodyBgImage(dataUrl);
            saveBgImage(dataUrl);
            syncBgCapSelectState();
            return;
        }
        compressImage(dataUrl, dims.width, dims.height, 0.8, (compressed) => {
            setBodyBgImage(compressed);
            saveBgImage(compressed);
            syncBgCapSelectState();
        });
    });
}

function migrateBgImageForNewCap() {
    // Video backgrounds are always stored in IDB regardless of cap — nothing to migrate.
    if (localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE) === "video") return;
    getBgImage((current) => {
        if (!current) return;
        const isLocal = current.startsWith("data:image/") || current.startsWith("blob:");
        if (!isLocal) return; // remote URLs are stored in IDB regardless of cap
        const dims = getBgImageCapDimensions();
        if (!dims) {
            // Moving to "default" — only migrate if the image is currently a data URL (not yet a blob in IDB)
            if (current.startsWith("blob:")) return; // already in IDB, nothing to do
            saveBgImage(current); // routes to IDB since cap is now "default"
        } else {
            // Moving to a sized cap — compress and save to IDB
            // GIFs and WebPs must not be re-compressed (canvas strips animation)
            if (current.startsWith("data:image/gif") || current.startsWith("data:image/webp")) {
                saveBgImage(current);
                return;
            }
            compressImage(current, dims.width, dims.height, 0.8, (compressed) => {
                setBodyBgImage(compressed);
                saveBgImage(compressed); // routes to IDB since cap != "default"
            });
        }
    });
}

function applyLocalFaviconFile(file) {
    readImageFile(file, faviconUrlError, (dataUrl) => {
        faviconUrlInput.value = "";
        faviconUrlInput.removeAttribute("aria-invalid");
        localStorage.setItem(STORAGE_KEYS.FAVICON, dataUrl);
        markUserTheme();
        setFavicon(dataUrl);
    });
}

// --- ZIP Builder ---

var _crc32Table = (function () {
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c;
    }
    return table;
}());

function crc32(data) {
    let crc = -1;
    for (let i = 0; i < data.length; i++) {
        crc = (crc >>> 8) ^ _crc32Table[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
}

function buildZipBytes(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach((file) => {
        const nameBytes = encoder.encode(file.name);
        const data = file.data;
        const checksum = crc32(data);
        const size = data.length;

        const local = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(local.buffer);
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

        const central = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(central.buffer);
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

    const centralStart = offset;
    const centralSize = centralParts.reduce((s, p) => s + p.length, 0);

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralStart, true);
    ev.setUint16(20, 0, true);

    const allParts = localParts.concat(centralParts).concat([eocd]);
    const totalLen = allParts.reduce((s, p) => s + p.length, 0);
    const result = new Uint8Array(totalLen);
    let pos = 0;
    allParts.forEach((p) => { result.set(p, pos); pos += p.length; });
    return result;
}

function dataUrlToBytes(dataUrl) {
    const comma = dataUrl.indexOf(",");
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// --- Panel & Modal ---

function syncExportBtnVisibility() {
    const isUser = localStorage.getItem(STORAGE_KEYS.THEME) === "user";
    exportThemeBtn.classList.toggle("hidden", !isUser);
}

function markUserTheme() {
    localStorage.setItem(STORAGE_KEYS.THEME, "user");
    syncExportBtnVisibility();
}

function exportUserTheme() {
    const theme = {
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
        animated: localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE) === "video",
        tabName: localStorage.getItem(STORAGE_KEYS.TAB_NAME) || "",
        favicon: localStorage.getItem(STORAGE_KEYS.FAVICON) || ""
    };
    const jsonBytes = new TextEncoder().encode(JSON.stringify(theme, null, 2));
    const themeId = `nnt-${crc32(jsonBytes).toString(16).padStart(8, "0")}`;
    const fileName = `${themeId}.zip`;

    getBgImage((bgImage) => {
        function bgFilenameFromMime(mime) {
            if (mime === "image/webp") return "background.webp";
            if (mime === "video/mp4") return "background.mp4";
            if (mime === "video/webm") return "background.webm";
            return "background.jpg";
        }

        function buildAndDownload(bgBytes, bgFilename) {
            const files = [{ name: `${themeId}/theme.json`, data: jsonBytes }];
            if (bgBytes) files.push({ name: `${themeId}/${bgFilename || "background.jpg"}`, data: bgBytes });
            const zipBytes = buildZipBytes(files);
            const blob = new Blob([zipBytes], { type: "application/zip" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
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
            const mimeMatch = bgImage.match(/^data:(image\/[^;,]+)/);
            const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
            buildAndDownload(dataUrlToBytes(bgImage), bgFilenameFromMime(mime));
            return;
        }
        if (bgImage.startsWith("blob:")) {
            const bgType = localStorage.getItem(STORAGE_KEYS.BG_IMAGE_TYPE);
            const blobFallbackMime = bgType === "video" ? "video/mp4" : "image/webp";
            fetch(bgImage)
                .then((r) => {
                    const fetchedMime = (r.headers.get("content-type") || blobFallbackMime).split(";")[0].trim();
                    return r.arrayBuffer().then((buf) => ({ buf, mime: fetchedMime }));
                })
                .then((res) => { buildAndDownload(new Uint8Array(res.buf), bgFilenameFromMime(res.mime)); })
                .catch(() => { buildAndDownload(null); });
            return;
        }
        const safeUrl = sanitizeHttpUrl(bgImage);
        if (!safeUrl) {
            buildAndDownload(null);
            return;
        }
        fetch(safeUrl)
            .then((r) => {
                if (!r.ok) throw new Error("Fetch failed");
                const contentType = r.headers.get("content-type") || "";
                const fetchedMime = contentType.split(";")[0].trim();
                return r.arrayBuffer().then((buf) => ({ buf, mime: fetchedMime }));
            })
            .then((result) => { buildAndDownload(new Uint8Array(result.buf), bgFilenameFromMime(result.mime)); })
            .catch(() => { buildAndDownload(null); });
    });
}

// --- Import Theme ---

// Parses local-file-header entries from an uncompressed zip (store method only).
// Returns an array of { name, data } objects for each file entry found.
function parseZipEntries(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const entries = [];
    let i = 0;
    while (i <= bytes.length - 30) {
        if (view.getUint32(i, true) !== 0x04034b50) break;
        const nameLen = view.getUint16(i + 26, true);
        const extraLen = view.getUint16(i + 28, true);
        const compSize = view.getUint32(i + 18, true);
        const name = new TextDecoder().decode(bytes.subarray(i + 30, i + 30 + nameLen));
        const dataStart = i + 30 + nameLen + extraLen;
        const data = bytes.subarray(dataStart, dataStart + compSize);
        entries.push({ name, data });
        i = dataStart + compSize;
    }
    return entries;
}

// Imports a theme from a zip file. The zip must contain a theme.json and may
// contain a background image/video. Background files are applied directly from
// the zip rather than fetched from a theme folder.
function importThemeFromZip(file) {
    if (!file) return;
    // Matches background files with or without a leading folder segment
    const bgFileRe = /(^|\/)background\.(webp|jpg|jpeg|webm|mp4)$/;
    const reader = new FileReader();
    reader.onload = (e) => {
        const bytes = new Uint8Array(e.target.result);
        const entries = parseZipEntries(bytes);

        let themeEntry = null;
        let bgEntry = null;
        entries.forEach((entry) => {
            if (/(^|\/)theme\.json$/.test(entry.name)) {
                themeEntry = entry;
            } else if (bgFileRe.test(entry.name)) {
                bgEntry = entry;
            }
        });

        if (!themeEntry) {
            alert("Import failed: theme.json not found in the zip.");
            return;
        }

        let themeJson;
        try {
            themeJson = JSON.parse(new TextDecoder().decode(themeEntry.data));
        } catch (err) {
            alert("Import failed: theme.json is not valid JSON.");
            return;
        }

        // Derive the theme id from the zip filename (nnt-* prefix) or fall back to "user"
        let themeId = "user";
        const zipName = file.name.replace(/\.zip$/i, "");
        if (/^nnt-/.test(zipName)) {
            themeId = zipName;
        }

        // Pass bgImageEnabled:false so applyThemePreset does not attempt to fetch the
        // background from a theme folder; we apply the background from the zip below.
        const themeForApply = Object.assign({}, themeJson, { bgImageEnabled: bgEntry ? false : themeJson.bgImageEnabled });
        applyThemePreset(themeForApply, themeId);

        if (bgEntry) {
            // Re-enable the background now that we are supplying it directly from the zip
            localStorage.setItem(STORAGE_KEYS.BG_IMAGE_ENABLED, "true");
            const bgName = bgEntry.name.split("/").pop();
            const isVideo = /\.(webm|mp4)$/.test(bgName);
            const mimeMap = { "webp": "image/webp", "jpg": "image/jpeg", "jpeg": "image/jpeg", "mp4": "video/mp4", "webm": "video/webm" };
            const ext = bgName.split(".").pop().toLowerCase();
            const mime = mimeMap[ext] || "image/jpeg";
            const blob = new Blob([bgEntry.data], { type: mime });
            if (isVideo) {
                saveBgVideo(blob, () => {
                    getBgImage((blobUrl) => {
                        if (blobUrl) setBodyBgVideo(blobUrl);
                        else applyBackground();
                    });
                });
            } else {
                const dims = getBgImageCapDimensions();
                if (!dims) {
                    saveBgImageBlob(blob, () => {
                        getBgImage((url) => {
                            if (url) setBodyBgImage(url);
                            else applyBackground();
                        });
                    });
                } else {
                    const objUrl = URL.createObjectURL(blob);
                    compressImage(objUrl, dims.width, dims.height, 0.8, (compressed) => {
                        URL.revokeObjectURL(objUrl);
                        setBodyBgImage(compressed);
                        saveBgImage(compressed);
                    });
                }
            }
        }

        syncExportBtnVisibility();
    };
    reader.readAsArrayBuffer(file);
}


function openSettings() {
    settingsPanel.classList.add("open");
    settingsPanel.setAttribute("aria-hidden", "false");
    applyThemesEnabledSetting();
    syncExportBtnVisibility();
    updatePositionSliderLimits();
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

let restoreConfirmPending = false;
let restoreConfirmTimer = null;

function resetConfirmState() {
    restoreConfirmPending = false;
    clearTimeout(restoreConfirmTimer);
    restoreDefaultsBtn.textContent = "Restore Defaults";
    restoreDefaultsBtn.classList.remove("confirm-pending");
}

function restoreAllDefaults() {
    fetch("themes/included/0/theme.json")
        .then((r) => {
            if (!r.ok) throw new Error("Not found");
            return r.json();
        })
        .then((themeData) => {
            applyThemePreset(themeData, 0);
            closeThemesOverlay();
            syncExportBtnVisibility();
        })
        .catch(() => {
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
importThemeBtn.addEventListener("click", () => { importThemeFile.click(); });
importThemeFile.addEventListener("change", () => {
    const file = importThemeFile.files && importThemeFile.files[0];
    if (file) {
        importThemeFromZip(file);
        importThemeFile.value = "";
    }
});

modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", (e) => {
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
settingsSections.forEach((section) => {
    section.addEventListener("toggle", () => {
        if (section.open) {
            settingsSections.forEach((other) => {
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
    let raw = hexEl.value.trim();
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

// --- Dynamic Position Slider Limits ---

/**
 * Recalculates and applies the min/max bounds for the clock and search-bar
 * position sliders based on the current viewport size and the elements'
 * rendered dimensions. A 1 rem invisible border is kept on every side so
 * elements never touch the very edge of the page.
 */
function updatePositionSliderLimits() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const border = rem; // 1 rem padding on each edge

    // Clock position limits
    const clockSection = document.querySelector(".clock-section");
    if (clockSection) {
        const currentClockX = Number(clockXInput.value) || 0;
        const currentClockY = Number(clockYInput.value) || 0;
        const clockRect = clockSection.getBoundingClientRect();
        if (clockRect.width > 0 && clockRect.height > 0) {
            // Subtract current transform offset to get the element's natural position
            const clockNatLeft   = clockRect.left   - currentClockX;
            const clockNatRight  = clockRect.right  - currentClockX;
            const clockNatTop    = clockRect.top    - currentClockY;
            const clockNatBottom = clockRect.bottom - currentClockY;

            let clockMaxX = Math.floor(vw - border - clockNatRight);
            let clockMinX = Math.ceil(border - clockNatLeft);
            let clockMaxY = Math.floor(vh - border - clockNatBottom);
            let clockMinY = Math.ceil(border - clockNatTop);

            // Guard: element wider/taller than usable space — allow centering at 0
            if (clockMinX > clockMaxX) { clockMinX = 0; clockMaxX = 0; }
            if (clockMinY > clockMaxY) { clockMinY = 0; clockMaxY = 0; }

            clockXInput.min = clockMinX;
            clockXInput.max = clockMaxX;
            clockYInput.min = clockMinY;
            clockYInput.max = clockMaxY;

            // Re-derive the displayed position from the stored fraction and clamp it
            // so the element stays on-screen after every resize.
            const clockXIdeal = fracToPx(localStorage.getItem(STORAGE_KEYS.CLOCK_X) || 0, vw);
            const clockYIdeal = fracToPx(localStorage.getItem(STORAGE_KEYS.CLOCK_Y) || 0, vh);
            const clockXClamped = Math.min(clockMaxX, Math.max(clockMinX, clockXIdeal));
            const clockYClamped = Math.min(clockMaxY, Math.max(clockMinY, clockYIdeal));
            clockXInput.value = clockXClamped;
            clockYInput.value = clockYClamped;
            docStyle.setProperty("--clock-x", `${clockXClamped}px`);
            docStyle.setProperty("--clock-y", `${clockYClamped}px`);
        }
    }

    // Search bar position limits
    // Use the search-form element for horizontal bounds (it has the visual width)
    // and the search-section element for vertical bounds.
    const searchSectionEl = document.querySelector(".search-section");
    const searchFormEl = searchSectionEl && searchSectionEl.querySelector(".search-form");
    if (searchSectionEl && searchFormEl) {
        const currentSearchX = Number(searchXInput.value) || 0;
        const currentSearchY = Number(searchYInput.value) || 0;
        const formRect    = searchFormEl.getBoundingClientRect();
        const sectionRect = searchSectionEl.getBoundingClientRect();
        if (formRect.width > 0 && sectionRect.height > 0) {
            const formNatLeft      = formRect.left      - currentSearchX;
            const formNatRight     = formRect.right     - currentSearchX;
            const sectionNatTop    = sectionRect.top    - currentSearchY;
            const sectionNatBottom = sectionRect.bottom - currentSearchY;

            let searchMaxX = Math.floor(vw - border - formNatRight);
            let searchMinX = Math.ceil(border - formNatLeft);
            let searchMaxY = Math.floor(vh - border - sectionNatBottom);
            let searchMinY = Math.ceil(border - sectionNatTop);

            if (searchMinX > searchMaxX) { searchMinX = 0; searchMaxX = 0; }
            if (searchMinY > searchMaxY) { searchMinY = 0; searchMaxY = 0; }

            searchXInput.min = searchMinX;
            searchXInput.max = searchMaxX;
            searchYInput.min = searchMinY;
            searchYInput.max = searchMaxY;

            // Re-derive the displayed position from the stored fraction and clamp it.
            const searchXIdeal = fracToPx(localStorage.getItem(STORAGE_KEYS.SEARCH_X) || 0, vw);
            const searchYIdeal = fracToPx(localStorage.getItem(STORAGE_KEYS.SEARCH_Y) || 0, vh);
            const searchXClamped = Math.min(searchMaxX, Math.max(searchMinX, searchXIdeal));
            const searchYClamped = Math.min(searchMaxY, Math.max(searchMinY, searchYIdeal));
            searchXInput.value = searchXClamped;
            searchYInput.value = searchYClamped;
            docStyle.setProperty("--search-x", `${searchXClamped}px`);
            docStyle.setProperty("--search-y", `${searchYClamped}px`);
        }
    }

    // Favorites position limits
    const favoritesSectionEl = document.getElementById("favorites-section");
    if (favoritesSectionEl) {
        const currentFavX = Number(favoritesXInput.value) || 0;
        const currentFavY = Number(favoritesYInput.value) || 0;
        const favRect = favoritesSectionEl.getBoundingClientRect();
        if (favRect.width > 0 && favRect.height > 0) {
            const favNatLeft   = favRect.left   - currentFavX;
            const favNatRight  = favRect.right  - currentFavX;
            const favNatTop    = favRect.top    - currentFavY;
            const favNatBottom = favRect.bottom - currentFavY;

            let favMaxX = Math.floor(vw - border - favNatRight);
            let favMinX = Math.ceil(border - favNatLeft);
            let favMaxY = Math.floor(vh - border - favNatBottom);
            let favMinY = Math.ceil(border - favNatTop);

            if (favMinX > favMaxX) { favMinX = 0; favMaxX = 0; }
            if (favMinY > favMaxY) { favMinY = 0; favMaxY = 0; }

            favoritesXInput.min = favMinX;
            favoritesXInput.max = favMaxX;
            favoritesYInput.min = favMinY;
            favoritesYInput.max = favMaxY;

            const favXIdeal = fracToPx(localStorage.getItem(STORAGE_KEYS.FAVORITES_X) || 0, vw);
            const favYIdeal = fracToPx(localStorage.getItem(STORAGE_KEYS.FAVORITES_Y) || 0, vh);
            const favXClamped = Math.min(favMaxX, Math.max(favMinX, favXIdeal));
            const favYClamped = Math.min(favMaxY, Math.max(favMinY, favYIdeal));
            favoritesXInput.value = favXClamped;
            favoritesYInput.value = favYClamped;
            docStyle.setProperty("--favorites-x", `${favXClamped}px`);
            docStyle.setProperty("--favorites-y", `${favYClamped}px`);
        }
    }
}

// Debounced resize handler so limits stay accurate when the window changes size
let _posLimitsResizeTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(_posLimitsResizeTimer);
    _posLimitsResizeTimer = setTimeout(updatePositionSliderLimits, 100);
});

// Coalescing guard: at most one rAF for updatePositionSliderLimits queued at a time
let _rafPosLimitsPending = false;
function schedulePositionSliderLimits() {
    if (_rafPosLimitsPending) return;
    _rafPosLimitsPending = true;
    requestAnimationFrame(() => {
        _rafPosLimitsPending = false;
        updatePositionSliderLimits();
    });
}

// Clock Inputs
clockSizeInput.addEventListener("input", function() {
    docStyle.setProperty("--clock-size", `${this.value}rem`);
});
clockSizeInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_SIZE, this.value);
    markUserTheme();
    // Clock element size may have changed — refresh position limits
    schedulePositionSliderLimits();
});
clockXInput.addEventListener("input", function() {
    docStyle.setProperty("--clock-x", `${this.value}px`);
});
clockXInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_X, String(Number(this.value) / window.innerWidth));
    markUserTheme();
});
clockYInput.addEventListener("input", function() {
    docStyle.setProperty("--clock-y", `${this.value}px`);
});
clockYInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_Y, String(Number(this.value) / window.innerHeight));
    markUserTheme();
});
clockHiddenToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.CLOCK_HIDDEN, this.checked ? "true" : "false");
    applyClockVisibility();
});
dateHiddenToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.DATE_HIDDEN, this.checked ? "true" : "false");
    applyClockVisibility();
});

// Search Bar Controls
searchWidthInput.addEventListener("input", function() {
    docStyle.setProperty("--search-width", `${this.value}px`);
});
searchWidthInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_WIDTH, this.value);
    markUserTheme();
    // Search form width changed — refresh position limits
    schedulePositionSliderLimits();
});
searchXInput.addEventListener("input", function() {
    docStyle.setProperty("--search-x", `${this.value}px`);
});
searchXInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_X, String(Number(this.value) / window.innerWidth));
    markUserTheme();
});
searchYInput.addEventListener("input", function() {
    docStyle.setProperty("--search-y", `${this.value}px`);
});
searchYInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_Y, String(Number(this.value) / window.innerHeight));
    markUserTheme();
});

// Background Controls
bgImageToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_ENABLED, this.checked ? "true" : "false");
    markUserTheme();
    applyBackground();
});

// Favorites Controls
favoritesEnabledToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.FAVORITES_ENABLED, this.checked ? "true" : "false");
    applyFavoritesEnabled();
});

favoritesShowAddToggle.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.FAVORITES_SHOW_ADD_BTN, this.checked ? "true" : "false");
    const btn = document.getElementById("add-btn");
    if (btn) btn.classList.toggle("hidden", !this.checked);
});

favoritesLayoutSelect.addEventListener("change", function() {
    const isColumn = this.value === "column";
    localStorage.setItem(STORAGE_KEYS.FAVORITES_LAYOUT, this.value);
    const section = document.getElementById("favorites-section");
    if (section) section.classList.toggle("favorites-column", isColumn);
    schedulePositionSliderLimits();
});

favoritesXInput.addEventListener("input", function() {
    docStyle.setProperty("--favorites-x", `${this.value}px`);
});
favoritesXInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.FAVORITES_X, String(Number(this.value) / window.innerWidth));
    markUserTheme();
});
favoritesYInput.addEventListener("input", function() {
    docStyle.setProperty("--favorites-y", `${this.value}px`);
});
favoritesYInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.FAVORITES_Y, String(Number(this.value) / window.innerHeight));
    markUserTheme();
});

bgBrightnessInput.addEventListener("input", function() {
    docStyle.setProperty("--bg-image-brightness", String(brightnessScale(this.value)));
});
bgBrightnessInput.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.BG_BRIGHTNESS, this.value);
    markUserTheme();
});

bgImageCapSelect.addEventListener("change", function() {
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE_CAP, this.value);
    markUserTheme();
    migrateBgImageForNewCap();
    syncBgCapSelectState();
});

bgFileSizeCapInput.addEventListener("change", function() {
    var val = clampFileSizeCap(Number(this.value));
    this.value = String(val);
    localStorage.setItem(STORAGE_KEYS.BG_FILE_SIZE_CAP, String(val));
    markUserTheme();
});

bgFileInput.addEventListener("change", () => {
    applyLocalBackgroundFile(bgFileInput.files && bgFileInput.files[0]);
});

applyBgBtn.addEventListener("click", () => {
    const file = bgFileInput.files && bgFileInput.files[0];
    if (file) {
        applyLocalBackgroundFile(file);
        return;
    }
    processUrlInput(bgImageInput, bgImageError, "Please enter a valid http or https image URL.", (safeUrl) => {
        markUserTheme();
        saveBgImage(safeUrl);
        setBodyBgImage(safeUrl);
        syncBgCapSelectState();
    });
});

clearBgBtn.addEventListener("click", () => {
    markUserTheme();
    saveBgImage("");
    bgImageInput.value = "";
    bgFileInput.value = "";
    bgImageInput.removeAttribute("aria-invalid");
    bgImageError.textContent = "";
    setBodyBgImage("");
    syncBgCapSelectState();
});

// Font Controls
applyFontBtn.addEventListener("click", () => {
    const rawFamily = fontFamilyInput.value.trim();
    const fontFamily = rawFamily || DEFAULTS.FONT_FAMILY;

    const rawUrl = fontUrlInput.value.trim();
    if (!rawUrl) {
        localStorage.removeItem(STORAGE_KEYS.FONT_URL);
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);
        markUserTheme();
        applyCustomFont("", fontFamily);
        return;
    }

    processUrlInput(fontUrlInput, fontUrlError, "Please enter a valid http or https stylesheet URL.", (safeUrl) => {
        localStorage.setItem(STORAGE_KEYS.FONT_URL, safeUrl);
        localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);
        markUserTheme();
        applyCustomFont(safeUrl, fontFamily);
    });
});

// Tab Name & Favicon Controls
applyTabNameBtn.addEventListener("click", () => {
    const name = tabNameInput.value.trim();
    if (name) localStorage.setItem(STORAGE_KEYS.TAB_NAME, name);
    else localStorage.removeItem(STORAGE_KEYS.TAB_NAME);
    markUserTheme();
    document.title = name || "New Tab";
});

faviconFileInput.addEventListener("change", () => {
    applyLocalFaviconFile(faviconFileInput.files && faviconFileInput.files[0]);
});

applyFaviconBtn.addEventListener("click", () => {
    const file = faviconFileInput.files && faviconFileInput.files[0];
    if (file) {
        applyLocalFaviconFile(file);
        return;
    }
    processUrlInput(faviconUrlInput, faviconUrlError, "Please enter a valid http or https image URL.", (safeUrl) => {
        localStorage.setItem(STORAGE_KEYS.FAVICON, safeUrl);
        markUserTheme();
        setFavicon(safeUrl);
    });
});

clearFaviconBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.FAVICON);
    markUserTheme();
    faviconUrlInput.value = "";
    faviconFileInput.value = "";
    faviconUrlInput.removeAttribute("aria-invalid");
    faviconUrlError.textContent = "";
    setFavicon("");
});

// Search Form Submission
searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    const template = localStorage.getItem(STORAGE_KEYS.SEARCH_URL) || DEFAULTS.SEARCH_URL;
    window.location.href = template.replace("{query}", encodeURIComponent(query));
});

// Search URL Controls
applySearchUrlBtn.addEventListener("click", () => {
    const raw = searchUrlInput.value.trim();
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
    const testUrl = sanitizeHttpUrl(raw.replace("{query}", "test"));
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

clearSearchUrlBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_URL);
    searchUrlInput.value = "";
    searchUrlInput.removeAttribute("aria-invalid");
    searchUrlError.textContent = "";
});

// Favorites Save
modalSave.addEventListener("click", () => {
    const name = favNameInput.value.trim();
    let url = favUrlInput.value.trim();

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

[favNameInput, favUrlInput].forEach((input) => {
    input.addEventListener("keydown", (e) => {
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
restoreDefaultsBtn.addEventListener("click", () => {
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

// Sync cap select disabled state on load (settings.js runs after defaults.js)
syncBgCapSelectState();

// Set dynamic position slider limits after the initial layout is painted
requestAnimationFrame(updatePositionSliderLimits);
