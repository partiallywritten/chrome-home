"use strict";

// --- Clock ---
var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

var timeEl = document.getElementById("time");
var dateEl = document.getElementById("date");

function updateClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, "0");
    var m = String(now.getMinutes()).padStart(2, "0");
    var s = String(now.getSeconds()).padStart(2, "0");

    timeEl.textContent = `${h}:${m}:${s}`;
    dateEl.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

    var delay = 1000 - (Date.now() % 1000);
    setTimeout(updateClock, delay);
}

// --- Initialization ---
updateClock();
applyThemeSettings();
applyBackground();
applyBackgroundBrightness();
applyBgImageCapSetting();
applyClockSettings();
applySearchBarSettings();
applyFontSettings();
applyGeneralSettings();
applySearchSettings();
renderFavorites();
applyFavoritesEnabled();
