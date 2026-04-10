/**
 * Chrome Home – new tab page
 * Handles: live clock, favorite sites (CRUD), background customization.
 * All data is persisted via localStorage.
 */

(function () {
  "use strict";

  /* ── Storage keys ──────────────────────────────────────────── */
  const DEFAULTS = {
    BG_COLOR: "#003056",
    HIGHLIGHT_COLOR: "#be9da8",
    TEXT_COLOR: "#eeb8b7",
    CLOCK_SIZE: "8",
    CLOCK_X: "0",
    CLOCK_Y: "0",
    FONT_FAMILY: "\"JetBrains Mono\", \"Fira Code\", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
  };
  const DEFAULT_TEXT_RGB = {
    r: parseInt(DEFAULTS.TEXT_COLOR.slice(1, 3), 16),
    g: parseInt(DEFAULTS.TEXT_COLOR.slice(3, 5), 16),
    b: parseInt(DEFAULTS.TEXT_COLOR.slice(5, 7), 16),
  };

  const STORAGE_KEYS = {
    FAVORITES: "ch_favorites",
    BG_COLOR: "ch_bg_color",
    BG_IMAGE: "ch_bg_image",
    HIGHLIGHT_COLOR: "ch_highlight_color",
    TEXT_COLOR: "ch_text_color",
    CLOCK_SIZE: "ch_clock_size",
    CLOCK_X: "ch_clock_x",
    CLOCK_Y: "ch_clock_y",
    FONT_URL: "ch_font_url",
    FONT_FAMILY: "ch_font_family",
  };

  /* ── DOM references ────────────────────────────────────────── */
  const timeEl = document.getElementById("time");
  const dateEl = document.getElementById("date");
  const favGrid = document.getElementById("favorites-grid");
  const addBtn = document.getElementById("add-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const closeSettings = document.getElementById("close-settings");
  const bgColorInput = document.getElementById("bg-color");
  const highlightColorInput = document.getElementById("highlight-color");
  const textColorInput = document.getElementById("text-color");
  const bgImageInput = document.getElementById("bg-image");
  const bgFileInput = document.getElementById("bg-file");
  const bgImageError = document.getElementById("bg-image-error");
  const applyBgBtn = document.getElementById("apply-bg");
  const clearBgBtn = document.getElementById("clear-bg");
  const clockSizeInput = document.getElementById("clock-size");
  const clockXInput = document.getElementById("clock-x");
  const clockYInput = document.getElementById("clock-y");
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

  /* ── Clock ─────────────────────────────────────────────────── */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    timeEl.textContent = `${h}:${m}:${s}`;
    dateEl.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  }

  updateClock();
  setInterval(updateClock, 1000);

  /* ── Background ────────────────────────────────────────────── */

  /**
   * Validate that a URL has an http/https scheme and return it, or null if invalid.
   * This prevents CSS injection via crafted url() values.
   */
  function sanitizeHttpUrl(raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.href;
    } catch (_) {
      return null;
    }
  }

  /**
   * Apply a validated image URL as the background using JSON.stringify to safely
   * quote the URL inside a CSS url() value, preventing CSS injection.
   */
  function setBodyBgImage(safeUrl) {
    document.body.style.backgroundImage = "";
    if (safeUrl) {
      // JSON.stringify wraps the URL in double-quotes and escapes any embedded
      // double-quotes or backslashes, making it safe for CSS url() values.
      document.body.style.backgroundImage = "url(" + JSON.stringify(safeUrl) + ")";
    }
  }

  function hexToRgba(hex, alpha) {
    function hexToRgb(sourceHex) {
      const cleaned = sourceHex.slice(1);
      return {
        r: parseInt(cleaned.slice(0, 2), 16),
        g: parseInt(cleaned.slice(2, 4), 16),
        b: parseInt(cleaned.slice(4, 6), 16),
      };
    }

    const validHex = /^#([A-Fa-f0-9]{6})$/;
    const rgb = validHex.test(hex) ? hexToRgb(hex) : DEFAULT_TEXT_RGB;
    const { r, g, b } = rgb;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

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
    document.documentElement.style.setProperty("--font-family", family || "inherit");
  }

  function applyThemeSettings() {
    const bgColor = localStorage.getItem(STORAGE_KEYS.BG_COLOR) || DEFAULTS.BG_COLOR;
    const highlightColor = localStorage.getItem(STORAGE_KEYS.HIGHLIGHT_COLOR) || DEFAULTS.HIGHLIGHT_COLOR;
    const textColor = localStorage.getItem(STORAGE_KEYS.TEXT_COLOR) || DEFAULTS.TEXT_COLOR;

    document.documentElement.style.setProperty("--bg-color", bgColor);
    document.documentElement.style.setProperty("--accent", highlightColor);
    document.documentElement.style.setProperty("--accent-hover", hexToRgba(highlightColor, 0.85));
    document.documentElement.style.setProperty("--text", textColor);
    document.documentElement.style.setProperty("--text-muted", hexToRgba(textColor, 0.74));

    bgColorInput.value = bgColor;
    highlightColorInput.value = highlightColor;
    textColorInput.value = textColor;
    document.body.style.backgroundColor = bgColor;
  }

  function applyClockSettings() {
    const clockSize = localStorage.getItem(STORAGE_KEYS.CLOCK_SIZE) || DEFAULTS.CLOCK_SIZE;
    const clockX = localStorage.getItem(STORAGE_KEYS.CLOCK_X) || DEFAULTS.CLOCK_X;
    const clockY = localStorage.getItem(STORAGE_KEYS.CLOCK_Y) || DEFAULTS.CLOCK_Y;

    clockSizeInput.value = clockSize;
    clockXInput.value = clockX;
    clockYInput.value = clockY;

    document.documentElement.style.setProperty("--clock-size", `${clockSize}rem`);
    document.documentElement.style.setProperty("--clock-x", `${clockX}px`);
    document.documentElement.style.setProperty("--clock-y", `${clockY}px`);
  }

  function applyFontSettings() {
    const fontUrl = localStorage.getItem(STORAGE_KEYS.FONT_URL) || "";
    const fontFamily = localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) || DEFAULTS.FONT_FAMILY;
    fontUrlInput.value = fontUrl;
    fontFamilyInput.value = fontFamily;
    applyCustomFont(fontUrl, fontFamily);
  }

  function applyBackground() {
    const image = localStorage.getItem(STORAGE_KEYS.BG_IMAGE) || "";
    if (!image) {
      setBodyBgImage("");
      bgImageInput.value = "";
      return;
    }

    const isLocalDataImage = image.startsWith("data:image/");
    const safeRemoteUrl = isLocalDataImage ? image : sanitizeHttpUrl(image);
    if (!safeRemoteUrl) {
      localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
      setBodyBgImage("");
      bgImageInput.value = "";
      return;
    }

    setBodyBgImage(safeRemoteUrl);
    bgImageInput.value = isLocalDataImage ? "" : safeRemoteUrl;
  }

  bgColorInput.addEventListener("input", function () {
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, this.value);
    document.documentElement.style.setProperty("--bg-color", this.value);
    // If no image is set, update the body background color immediately
    if (!localStorage.getItem(STORAGE_KEYS.BG_IMAGE)) {
      document.body.style.backgroundColor = this.value;
    }
  });

  highlightColorInput.addEventListener("input", function () {
    localStorage.setItem(STORAGE_KEYS.HIGHLIGHT_COLOR, this.value);
    document.documentElement.style.setProperty("--accent", this.value);
    document.documentElement.style.setProperty("--accent-hover", hexToRgba(this.value, 0.85));
  });

  textColorInput.addEventListener("input", function () {
    localStorage.setItem(STORAGE_KEYS.TEXT_COLOR, this.value);
    document.documentElement.style.setProperty("--text", this.value);
    document.documentElement.style.setProperty("--text-muted", hexToRgba(this.value, 0.74));
  });

  applyBgBtn.addEventListener("click", function () {
    const raw = bgImageInput.value.trim();
    if (!raw) return;
    const safeUrl = sanitizeHttpUrl(raw);
    if (!safeUrl) {
      bgImageInput.setAttribute("aria-invalid", "true");
      bgImageError.textContent = "Please enter a valid http or https image URL.";
      bgImageInput.focus();
      return;
    }
    bgImageInput.removeAttribute("aria-invalid");
    bgImageError.textContent = "";
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE, safeUrl);
    setBodyBgImage(safeUrl);
  });

  bgFileInput.addEventListener("change", function () {
    const file = bgFileInput.files && bgFileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      bgImageError.textContent = "Please upload an image file.";
      return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
      const dataUrl = String(event.target.result);
      if (!dataUrl.startsWith("data:image/")) {
        bgImageError.textContent = "Could not read this image.";
        return;
      }
      localStorage.setItem(STORAGE_KEYS.BG_IMAGE, dataUrl);
      bgImageInput.value = "";
      bgImageInput.removeAttribute("aria-invalid");
      bgImageError.textContent = "";
      setBodyBgImage(dataUrl);
    };
    reader.onerror = function () {
      bgImageError.textContent = "Could not read this image.";
    };
    reader.readAsDataURL(file);
  });

  clearBgBtn.addEventListener("click", function () {
    localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    bgImageInput.value = "";
    bgFileInput.value = "";
    bgImageInput.removeAttribute("aria-invalid");
    bgImageError.textContent = "";
    document.body.style.backgroundImage = "";
  });

  bgImageInput.addEventListener("input", function () {
    if (bgImageInput.getAttribute("aria-invalid")) {
      bgImageInput.removeAttribute("aria-invalid");
      bgImageError.textContent = "";
    }
  });

  clockSizeInput.addEventListener("input", function () {
    localStorage.setItem(STORAGE_KEYS.CLOCK_SIZE, this.value);
    document.documentElement.style.setProperty("--clock-size", `${this.value}rem`);
  });

  clockXInput.addEventListener("input", function () {
    localStorage.setItem(STORAGE_KEYS.CLOCK_X, this.value);
    document.documentElement.style.setProperty("--clock-x", `${this.value}px`);
  });

  clockYInput.addEventListener("input", function () {
    localStorage.setItem(STORAGE_KEYS.CLOCK_Y, this.value);
    document.documentElement.style.setProperty("--clock-y", `${this.value}px`);
  });

  applyFontBtn.addEventListener("click", function () {
    const rawUrl = fontUrlInput.value.trim();
    const rawFamily = fontFamilyInput.value.trim();

    const safeFontUrl = rawUrl ? sanitizeHttpUrl(rawUrl) : "";
    if (rawUrl && !safeFontUrl) {
      fontUrlInput.setAttribute("aria-invalid", "true");
      fontUrlError.textContent = "Please enter a valid http or https stylesheet URL.";
      fontUrlInput.focus();
      return;
    }

    if (safeFontUrl) {
      localStorage.setItem(STORAGE_KEYS.FONT_URL, safeFontUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.FONT_URL);
    }

    const fontFamily = rawFamily || DEFAULTS.FONT_FAMILY;
    localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontFamily);

    fontUrlInput.removeAttribute("aria-invalid");
    fontUrlError.textContent = "";
    applyCustomFont(safeFontUrl, fontFamily);
  });

  fontUrlInput.addEventListener("input", function () {
    if (fontUrlInput.getAttribute("aria-invalid")) {
      fontUrlInput.removeAttribute("aria-invalid");
      fontUrlError.textContent = "";
    }
  });

  /* ── Favorites ─────────────────────────────────────────────── */
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
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch (_) {
      return null;
    }
  }

  function createFavElement(fav, index) {
    const a = document.createElement("a");
    a.href = fav.url;
    a.className = "fav-item";
    a.title = fav.name;

    const faviconUrl = getFaviconUrl(fav.url);
    if (faviconUrl) {
      const img = document.createElement("img");
      img.src = faviconUrl;
      img.alt = fav.name;
      img.className = "fav-icon";
      img.onerror = function () {
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
    removeBtn.title = "Remove " + fav.name;
    removeBtn.setAttribute("aria-label", "Remove " + fav.name);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      removeFavorite(index);
    });
    a.appendChild(removeBtn);

    return a;
  }

  function createFallbackIcon(name) {
    const div = document.createElement("div");
    div.className = "fav-icon-fallback";
    div.textContent = name.charAt(0).toUpperCase();
    return div;
  }

  function renderFavorites() {
    const favorites = loadFavorites();
    favGrid.innerHTML = "";
    favorites.forEach(function (fav, index) {
      favGrid.appendChild(createFavElement(fav, index));
    });
  }

  function removeFavorite(index) {
    const favorites = loadFavorites();
    favorites.splice(index, 1);
    saveFavorites(favorites);
    renderFavorites();
  }

  function addFavorite(name, url) {
    const favorites = loadFavorites();
    favorites.push({ name, url });
    saveFavorites(favorites);
    renderFavorites();
  }

  /* ── Settings panel ────────────────────────────────────────── */
  function openSettings() {
    settingsPanel.classList.add("open");
    settingsPanel.setAttribute("aria-hidden", "false");
  }

  function closeSettingsPanel() {
    settingsPanel.classList.remove("open");
    settingsPanel.setAttribute("aria-hidden", "true");
  }

  settingsBtn.addEventListener("click", openSettings);
  closeSettings.addEventListener("click", closeSettingsPanel);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeSettingsPanel();
      closeModal();
    }
  });

  /* ── Add-favorite modal ────────────────────────────────────── */
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

  addBtn.addEventListener("click", openModal);
  modalCancel.addEventListener("click", closeModal);

  modalOverlay.addEventListener("click", function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  modalSave.addEventListener("click", function () {
    const name = favNameInput.value.trim();
    const url = favUrlInput.value.trim();

    // Reset errors
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

    // Auto-prepend https:// if no protocol given
    const normalizedUrl = url && !url.includes("://") ? "https://" + url : url;

    if (!normalizedUrl) {
      favUrlInput.setAttribute("aria-invalid", "true");
      favUrlError.textContent = "Please enter a URL.";
      favUrlInput.focus();
      return;
    }

    try {
      new URL(normalizedUrl); // validate
    } catch (_) {
      favUrlInput.setAttribute("aria-invalid", "true");
      favUrlError.textContent = "Please enter a valid URL (e.g. https://example.com).";
      favUrlInput.focus();
      return;
    }

    addFavorite(name, normalizedUrl);
    closeModal();
  });

  // Clear individual field errors while the user edits
  favNameInput.addEventListener("input", function () {
    favNameInput.removeAttribute("aria-invalid");
    favNameError.textContent = "";
  });
  favUrlInput.addEventListener("input", function () {
    favUrlInput.removeAttribute("aria-invalid");
    favUrlError.textContent = "";
  });

  // Allow Enter to save from the modal inputs
  [favNameInput, favUrlInput].forEach(function (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") modalSave.click();
    });
  });

  /* ── Init ──────────────────────────────────────────────────── */
  applyThemeSettings();
  applyBackground();
  applyClockSettings();
  applyFontSettings();
  renderFavorites();
})();
