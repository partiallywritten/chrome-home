# Nozy-NT — Theming API
This folder contains pre-made themes for the Nozy-NT extension and documents the full theming API.

## Word before diving in
For most (if not all) people, this spec is pretty useless except [folder structure](#folder-structure) & [installing theme](#adding-a-new-theme) sections. If you want to make a theme, just go to the settings panel → customize it to your liking → export it (click the little download icon next to the extension name). The UI is pretty explanatory.

## Table of contents
1. [Folder structure](#folder-structure)
2. [Installing theme](#adding-a-new-theme)
3. [Id syntax](#id-syntax)
4. [Script load order](#script-load-order)
5. [State / `ch_theme` system](#state--ch_theme-system)
6. [`theme.json` Schema](#themejson-schema)

---

## Folder Structure

```
themes/
  README.md              ← This file (theming API reference)
  included_themes.json   ← Registry of bundled (numeric-id) themes
  community_themes.json  ← Registry of community (nnt- prefix) themes
  included/
    0/
      theme.json         ← Default theme settings (id 0)
      background.jpg     ← Default theme background image (or background.webp)
    1/
      theme.json
      background.jpg
    ...
  community/
    nnt-forest/
      theme.json         ← Community theme (id "nnt-forest")
      background.webp    ← Preferred format; background.jpg is also accepted
    ...
```

Themes are identified by their `id`. The id determines both the folder name and which section of the theme browser the theme appears in. See **Id Syntax** below.


---

## Adding a New Theme

### Adding an Included theme (numeric id)
1. Create a new numbered folder (e.g. `themes/included/6/`).
2. Add a `background.webp` (or `background.jpg`) — the background image for the theme.
3. Add a `theme.json` — see schema below.
4. Register the theme in `themes/included_themes.json` by appending `{ "id": 6, "name": "My Theme" }`.

### Adding a Community theme (nnt- id)
1. Choose a unique slug, e.g. `dark-ocean`. The full id will be `"nnt-dark-ocean"`.
2. Create the folder `themes/community/nnt-dark-ocean/`.
3. Add a `background.webp` (or `background.jpg`) and a `theme.json`.
4. Register the theme in `themes/community_themes.json` by appending `{ "id": "nnt-dark-ocean", "name": "Dark Ocean" }`.
5. Enable the **Enable Community Themes** toggle inside the theme browser. The theme will appear in the **Community** section.

### `themes/included_themes.json` — Included Registry
An array of included theme descriptor objects (numeric ids only):

```json
[
  { "id": 0, "name": "Default" },
  { "id": 1, "name": "My Theme" }
]
```

### `themes/community_themes.json` — Community Registry
An array of community theme descriptor objects (`nnt-` ids only):

```json
[
  { "id": "nnt-forest", "name": "Forest" },
  { "id": "nnt-dark-ocean", "name": "Dark Ocean" }
]
```

### Registry field reference (both files)
| Field  | Type             | Required | Description                                                                 |
|--------|------------------|----------|-----------------------------------------------------------------------------|
| `id`   | number or string | yes      | Unique theme id. A non-negative integer for `included_themes.json`; a string starting with `"nnt-"` (followed by `[a-zA-Z0-9_-]+`) for `community_themes.json`. Must match the folder name exactly. |
| `name` | string           | yes      | Display name shown in the theme browser |


---

## Id Syntax
The `id` field determines both the folder name and which section the theme appears in within the theme browser.

| Id type | Example | Registry file | Section | Folder |
|---------|---------|---------------|---------|--------|
| Non-negative integer | `0`, `1`, `2` | `included_themes.json` | **Included** | `themes/included/0/`, `themes/included/1/`, … |
| String prefixed `nnt-` | `"nnt-forest"` | `community_themes.json` | **Community** | `themes/community/nnt-forest/` |

- **Included** themes (numeric ids) are reserved for themes bundled with the extension.  
  Theme `0` is always the built-in default applied on first launch.
- **Community** themes (ids starting with `"nnt-"`) are user-contributed or externally added themes. The `nnt-` prefix is followed by a slug containing only letters, digits, hyphens, and underscores (e.g. `"nnt-dark-ocean"`).
- Any entry with an id that does not match either rule is silently ignored by the theme browser.


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

## `theme.json` Schema
All fields are **optional**. Omitted or `null` fields leave the user's existing value unchanged.  
An empty string (`""`) for a string field clears/resets that setting.

```json
{
  "name": "My Theme",

  "bgColor": "#003056",
  "surfaceColor": "#003056",
  "highlightColor": "#be9da8",
  "textColor": "#eeb8b7",

  "clockSize": "8",
  "clockX": "0",
  "clockY": "0",

  "searchWidth": "560",
  "searchX": "0",
  "searchY": "0",

  "fontUrl": "https://fonts.googleapis.com/css2?family=Inter&display=swap",
  "fontFamily": "'Inter', sans-serif",

  "bgBrightness": "0",
  "bgImageEnabled": true,

  "favoritesEnabled": true,
  "clockHidden": false,
  "dateHidden": false,

  "tabName": "",
  "favicon": ""
}
```

### Field Reference
| Field            | Type             | Default   | Description                                                                 |
|------------------|------------------|-----------|-----------------------------------------------------------------------------|
| `name`           | string           | —         | Human-readable theme name (informational only, not stored to localStorage)  |
| `bgColor`        | CSS hex color    | `#003056` | Page background color (visible when no image is set, or behind the image)   |
| `surfaceColor`   | CSS hex color    | `#003056` | Element background color used for panels, search bar, and favorites         |
| `highlightColor` | CSS hex color    | `#be9da8` | Accent / highlight color used for interactive elements                      |
| `textColor`      | CSS hex color    | `#eeb8b7` | Primary text color                                                          |
| `clockSize`      | numeric string   | `"8"`     | Clock font size in `rem` units (range: `2`–`14`)                            |
| `clockX`         | numeric string   | `"0"`     | Horizontal offset of the clock in pixels (range: `-300`–`300`)              |
| `clockY`         | numeric string   | `"0"`     | Vertical offset of the clock in pixels (range: `-300`–`300`)                |
| `searchWidth`    | numeric string   | `"560"`   | Width of the search bar in pixels (range: `100`–`900`)                      |
| `searchX`        | numeric string   | `"0"`     | Horizontal offset of the search bar in pixels (range: `-150`–`150`)         |
| `searchY`        | numeric string   | `"0"`     | Vertical offset of the search bar in pixels (range: `-150`–`150`)           |
| `fontUrl`        | URL string       | `""`      | URL of a CSS font stylesheet (e.g. Google Fonts). `""` = no custom font     |
| `fontFamily`     | CSS font stack   | monospace stack | CSS `font-family` value applied to the whole page                    |
| `bgBrightness`   | numeric string   | `"0"`     | Background brightness adjustment (range: `-100`–`100`)                      |
| `bgImageEnabled` | boolean          | `true`    | Whether the background image is shown (`true`) or hidden (`false`)          |
| `favoritesEnabled` | boolean        | `true`    | Whether the favorites section is shown (`true`) or hidden (`false`)         |
| `clockHidden`    | boolean          | `false`   | Whether the clock is hidden (`true`) or visible (`false`)                   |
| `dateHidden`     | boolean          | `false`   | Whether the date is hidden (`true`) or visible (`false`)                    |
| `tabName`        | string           | `""`      | Browser tab title. `""` = shows `"New Tab"`                                 |
| `favicon`        | URL string       | `""`      | URL of a custom favicon image. `""` = browser default                       |

> **Not in API:** `bgImageCap` is a user-only preference (set in the Background settings panel). It is intentionally excluded from `theme.json` so themes always respect the user's chosen image quality cap.

### Background image (`background.webp` / `background.jpg`)
The theme's background image must be placed inside the theme folder.  
It is applied as the page background whenever the theme is selected.

**WebP is the preferred format** — name the file `background.webp`.  
JPEG is supported as a fallback for older themes — name the file `background.jpg`.  
When both files exist in the same theme folder, `background.webp` takes precedence.

Recommended size is 1920×1080 or larger.

