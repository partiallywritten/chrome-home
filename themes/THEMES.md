# Chrome Home — Themes

This folder contains pre-made themes for the Chrome Home extension.

---

## Script load order

Themes are only loaded when the theme browser toggle is enabled.  
Scripts are loaded in this hierarchy:

```
usables.js   → reusable functions and constants
defaults.js  → pulls stored data and applies settings on page load
settings.js  → settings panel UI and user interactions
theme_api.js → theme browser modal and theme preset application
```

`theme_api.js` also handles the **default theme** (id `0`) on fresh/reset loads.

---

## Folder Structure

```
themes/
  themes.json        ← Registry of all available themes
  0/
    theme.json       ← Default theme settings (id 0)
    background.jpg   ← Default theme background image
  1/
    theme.json
    background.jpg
  ...
```

Themes are numbered starting from **0**. Theme `0` is the built-in default theme.

---

## State / `id` system

The extension tracks the current configuration state via the `ch_theme` key in `localStorage`:

| Value  | Meaning                                                              |
|--------|----------------------------------------------------------------------|
| `null` (absent) | Default state — theme `0` is loaded and applied ephemerally  |
| `"user"` | User has manually customised settings in the settings panel      |
| `"0"`, `"1"`, … | A named theme from the themes browser is active              |

- When the user changes **any** setting in the settings panel, `ch_theme` is automatically set to `"user"`.
- When the user selects a theme from the theme browser, `ch_theme` is set to the numeric theme ID.
- When "Restore Defaults" is confirmed, `ch_theme` is removed (returns to `null`).
- On `null` state, `theme_api.js` fetches and displays **theme 0**'s background without writing to `localStorage` — the null state is re-applied on every page load.

> **Note:** The `ch_theme` value is an internal implementation detail and is **not** exposed in the `theme.json` API.

---

## Adding a New Theme

1. Create a new numbered folder (e.g. `themes/2/`).
2. Add a `background.jpg` (the background image for the theme).
3. Add a `theme.json` (see schema below).
4. Register the theme in `themes/themes.json` by appending an entry.

### `themes/themes.json` — Registry

An array of theme descriptor objects:

```json
[
  { "id": 0, "name": "Default" },
  { "id": 1, "name": "My Theme" }
]
```

| Field | Type   | Description                          |
|-------|--------|--------------------------------------|
| `id`  | number | Unique theme number (folder name, ≥ 0) |
| `name`| string | Display name shown in the UI         |

---

## `theme.json` Schema

All fields are optional. Omitted fields keep the user's existing value.

```json
{
  "name": "My Theme",

  "bgColor": "#003056",
  "highlightColor": "#be9da8",
  "textColor": "#eeb8b7",

  "clockSize": "8",
  "clockX": "0",
  "clockY": "0",

  "fontUrl": "https://fonts.googleapis.com/css2?family=Inter&display=swap",
  "fontFamily": "'Inter', sans-serif",

  "bgBrightness": "0",
  "bgImageEnabled": true,

  "tabName": "",
  "favicon": ""
}
```

### Field Reference

| Field            | Type             | Description                                                                |
|------------------|------------------|----------------------------------------------------------------------------|
| `name`           | string           | Human-readable theme name                                                  |
| `bgColor`        | CSS hex color    | Page background color (shown when no image, or behind the image)           |
| `highlightColor` | CSS hex color    | Accent / highlight color used for interactive elements                     |
| `textColor`      | CSS hex color    | Primary text color                                                         |
| `clockSize`      | numeric string   | Clock font size in `rem` units (range: `2`–`14`, default `"8"`)            |
| `clockX`         | numeric string   | Horizontal offset of the clock in pixels (range: `-300`–`300`)             |
| `clockY`         | numeric string   | Vertical offset of the clock in pixels (range: `-300`–`300`)               |
| `fontUrl`        | URL string       | URL of a CSS font stylesheet (e.g. Google Fonts). Empty string = no custom font |
| `fontFamily`     | CSS font stack   | CSS `font-family` value applied to the whole page                          |
| `bgBrightness`   | numeric string   | Background image brightness adjustment (range: `-100`–`100`, default `"0"`) |
| `bgImageEnabled` | boolean          | Whether the background image is shown (`true`) or hidden (`false`)         |
| `tabName`        | string           | Browser tab title. Empty string = `"New Tab"`                             |
| `favicon`        | URL string       | URL of a custom favicon image. Empty string = browser default              |

> **Not in API:** `bgImageCap` is a user-only preference controlled via the Background settings panel. It is intentionally excluded from `theme.json` so that themes always respect the user's chosen image quality cap.

### `background.jpg`

Place the theme's background image as `background.jpg` inside the theme folder.
It is used as the page background whenever the theme is applied.
JPEG format is required; recommended size is 1920×1080 or larger.
