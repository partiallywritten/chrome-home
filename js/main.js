/**
 * Chrome Home – new tab page
 * Handles: live clock, favorite sites (CRUD), background customization.
 * All data is persisted via localStorage.
 */

(function () {
  "use strict";

  /* ── Storage keys ──────────────────────────────────────────── */
  const STORAGE_KEYS = {
    FAVORITES: "ch_favorites",
    BG_COLOR: "ch_bg_color",
    BG_IMAGE: "ch_bg_image",
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
  const bgImageInput = document.getElementById("bg-image");
  const applyBgBtn = document.getElementById("apply-bg");
  const clearBgBtn = document.getElementById("clear-bg");
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const favNameInput = document.getElementById("fav-name");
  const favUrlInput = document.getElementById("fav-url");
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
  function sanitizeImageUrl(raw) {
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

  function applyBackground() {
    const color = localStorage.getItem(STORAGE_KEYS.BG_COLOR) || "#0f172a";
    const image = localStorage.getItem(STORAGE_KEYS.BG_IMAGE) || "";

    document.documentElement.style.setProperty("--bg-color", color);
    bgColorInput.value = color;

    if (image) {
      setBodyBgImage(image);
      bgImageInput.value = image;
    } else {
      document.body.style.backgroundImage = "none";
      bgImageInput.value = "";
    }
  }

  bgColorInput.addEventListener("input", function () {
    localStorage.setItem(STORAGE_KEYS.BG_COLOR, this.value);
    document.documentElement.style.setProperty("--bg-color", this.value);
    // If no image is set, update the body background color immediately
    if (!localStorage.getItem(STORAGE_KEYS.BG_IMAGE)) {
      document.body.style.backgroundColor = this.value;
    }
  });

  applyBgBtn.addEventListener("click", function () {
    const raw = bgImageInput.value.trim();
    if (!raw) return;
    const safeUrl = sanitizeImageUrl(raw);
    if (!safeUrl) {
      bgImageInput.focus();
      return;
    }
    localStorage.setItem(STORAGE_KEYS.BG_IMAGE, safeUrl);
    setBodyBgImage(safeUrl);
  });

  clearBgBtn.addEventListener("click", function () {
    localStorage.removeItem(STORAGE_KEYS.BG_IMAGE);
    bgImageInput.value = "";
    document.body.style.backgroundImage = "none";
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
    removeBtn.title = "Remove";
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

    if (!name) {
      favNameInput.focus();
      return;
    }

    // Auto-prepend https:// if no protocol given
    const normalizedUrl = url && !url.includes("://") ? "https://" + url : url;

    if (!normalizedUrl) {
      favUrlInput.focus();
      return;
    }

    try {
      new URL(normalizedUrl); // validate
    } catch (_) {
      favUrlInput.focus();
      return;
    }

    addFavorite(name, normalizedUrl);
    closeModal();
  });

  // Allow Enter to save from the modal inputs
  [favNameInput, favUrlInput].forEach(function (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") modalSave.click();
    });
  });

  /* ── Init ──────────────────────────────────────────────────── */
  applyBackground();
  renderFavorites();
})();
