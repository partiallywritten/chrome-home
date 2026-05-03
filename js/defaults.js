"use strict";

// --- Clock ---
const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");

// Cached outside updateClock so a new options object (and an Intl.DateTimeFormat
// lookup) is not allocated on every tick — eliminating continuous heap pressure.
const _clockDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");

    timeEl.textContent = `${h}:${m}:${s}`;
    dateEl.textContent = _clockDateFormatter.format(now);

    const delay = 1000 - (Date.now() % 1000);
    setTimeout(updateClock, delay);
}

// --- Initialization ---
updateClock();
applyThemeSettings();
applyBackground();
applyBackgroundBrightness();
applyBgImageCapSetting();
applyBgFileSizeCapSetting();
applyClockSettings();
applyClockVisibility();
applySearchBarSettings();
applyFontSettings();
applyGeneralSettings();
applySearchSettings();
renderFavorites();
applyFavoritesSettings();
