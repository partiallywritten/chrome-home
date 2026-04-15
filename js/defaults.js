"use strict";

// --- Clock ---
var timeEl = document.getElementById("time");
var dateEl = document.getElementById("date");

// Cached outside updateClock so a new options object (and an Intl.DateTimeFormat
// lookup) is not allocated on every tick — eliminating continuous heap pressure.
var _clockDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

function updateClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, "0");
    var m = String(now.getMinutes()).padStart(2, "0");
    var s = String(now.getSeconds()).padStart(2, "0");

    timeEl.textContent = `${h}:${m}:${s}`;
    dateEl.textContent = _clockDateFormatter.format(now);

    var delay = 1000 - (Date.now() % 1000);
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
