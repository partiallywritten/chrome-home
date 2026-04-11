# Chrome Home — Theming API

This folder contains pre-made themes for the Chrome Home extension and documents the full theming API.

---

## Script load order

Themes are only loaded when the theme browser toggle is enabled.  
Scripts are loaded in this order:

```
usables.js   → shared utilities, constants, and DOM helpers
defaults.js  → reads stored settings and applies them on page load
settings.js  → settings panel UI and user interactions
theme_api.js → theme browser overlay and theme preset application
```

`theme_api.js` also handles the **default theme** (id `0`) on a fresh install or after "Restore Defaults".

---

## Folder Structure

```
themes/
  README.md          ← This file (theming API reference)
  themes.json        ← Registry of all available themes
  0/
    theme.json       ← Default theme settings (id 0)
    background.jpg   ← Default theme background image
  1/
    theme.json
    background.jpg
  ...
```

Themes are numbered starting from **0**. Theme `0` is the built-in default.

---

## State / `ch_theme` system

The extension tracks the active configuration state via the `ch_theme` key in `localStorage`:

| Value             | Meaning                                                           |
|-------------------|-------------------------------------------------------------------|
| `null` (absent)   | Fresh install — theme `0` is applied and persisted               |
| `"user"`          | User has manually customised one or more settings                 |
| `"0"`, `"1"`, …   | A named theme from the theme browser is active                   |

- Any change made through the settings panel sets `ch_theme` to `"user"`.
- Selecting a theme from the theme browser sets `ch_theme` to the numeric theme ID string.
- Confirming "Restore Defaults" removes `ch_theme` (returns to `null`), which re-applies theme 0 on the next page load.

> **Note:** `ch_theme` is an internal implementation detail and is **not** a field in `theme.json`.

---

## Adding a New Theme

1. Create a new numbered folder (e.g. `themes/2/`).
2. Add a `background.jpg` — the background image for the theme.
3. Add a `theme.json` — see schema below.
4. Register the theme in `themes/themes.json` by appending an entry.

### `themes/themes.json` — Registry

An array of theme descriptor objects:

```json
[
  { "id": 0, "name": "Default" },
  { "id": 1, "name": "My Theme" }
]
```

| Field  | Type   | Required | Description                            |
|--------|--------|----------|----------------------------------------|
| `id`   | number | yes      | Unique theme index (≥ 0, matches folder name) |
| `name` | string | yes      | Display name shown in the theme browser |

---

## `theme.json` Schema

All fields are **optional**. Omitted or `null` fields leave the user's existing value unchanged.  
An empty string (`""`) for a string field clears/resets that setting.

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

| Field            | Type             | Default   | Description                                                                 |
|------------------|------------------|-----------|-----------------------------------------------------------------------------|
| `name`           | string           | —         | Human-readable theme name (informational only, not stored to localStorage)  |
| `bgColor`        | CSS hex color    | `#003056` | Page background color (visible when no image is set, or behind the image)   |
| `highlightColor` | CSS hex color    | `#be9da8` | Accent / highlight color used for interactive elements                      |
| `textColor`      | CSS hex color    | `#eeb8b7` | Primary text color                                                          |
| `clockSize`      | numeric string   | `"8"`     | Clock font size in `rem` units (range: `2`–`14`)                            |
| `clockX`         | numeric string   | `"0"`     | Horizontal offset of the clock in pixels (range: `-300`–`300`)              |
| `clockY`         | numeric string   | `"0"`     | Vertical offset of the clock in pixels (range: `-300`–`300`)                |
| `fontUrl`        | URL string       | `""`      | URL of a CSS font stylesheet (e.g. Google Fonts). `""` = no custom font     |
| `fontFamily`     | CSS font stack   | monospace stack | CSS `font-family` value applied to the whole page                    |
| `bgBrightness`   | numeric string   | `"0"`     | Background brightness adjustment (range: `-100`–`100`)                      |
| `bgImageEnabled` | boolean          | `true`    | Whether the background image is shown (`true`) or hidden (`false`)          |
| `tabName`        | string           | `""`      | Browser tab title. `""` = shows `"New Tab"`                                 |
| `favicon`        | URL string       | `""`      | URL of a custom favicon image. `""` = browser default                       |

> **Not in API:** `bgImageCap` is a user-only preference (set in the Background settings panel). It is intentionally excluded from `theme.json` so themes always respect the user's chosen image quality cap.

### `background.jpg`

The theme's background image must be named `background.jpg` and placed inside the theme folder.  
It is applied as the page background whenever the theme is selected.  
JPEG format is required; recommended size is 1920×1080 or larger.

