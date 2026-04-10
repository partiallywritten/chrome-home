# Chrome Home

A minimal, dark-themed Chrome extension that replaces your new tab page with a clean dashboard featuring a live clock, Google search, favourite sites, and a customizable background.

---

## Features

| Feature | Details |
|---|---|
| **Live clock** | Displays the current time (HH:MM:SS) and full date, updated every second |
| **Google search** | Pill-shaped search bar in the centre of the page — press Enter or click the arrow to search |
| **Favourite sites** | Add, display, and remove bookmarked sites with favicons; data is stored locally |
| **Custom background** | Choose a solid colour or paste any `https://` image URL; settings are persisted between sessions |

---

## Installation

Chrome extensions that are not published to the Chrome Web Store must be loaded as **unpacked** extensions. This takes less than a minute.

### 1 — Download the extension

**Option A — Clone with Git**

```bash
git clone https://github.com/partiallywritten/chrome-home.git
```

**Option B — Download ZIP**

1. Click the green **Code** button on this page.
2. Select **Download ZIP**.
3. Extract the archive to a permanent location on your computer (e.g. `~/extensions/chrome-home`). Do not delete or move this folder after loading the extension.

### 2 — Enable Developer Mode in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on (top-right corner of the page).

### 3 — Load the extension

1. Click **Load unpacked**.
2. In the file picker, select the folder that contains `manifest.json` (the root of this repository).
3. Chrome will add the extension and display it in the list.

### 4 — Open a new tab

Press **Ctrl+T** (Windows / Linux) or **⌘T** (macOS). You should see the Chrome Home dashboard instead of the default new tab page.

> **Note:** If another extension is already overriding your new tab page, Chrome will ask which one to use. Select **Chrome Home**.

---

## Usage

### Search
Type your query in the search bar and press **Enter**, or click the **→** button. The search opens in the current tab using Google.

### Favourite Sites
- Click the **+** button below the search bar to add a new favourite.
- Enter a **Name** (e.g. *GitHub*) and a **URL** (e.g. `https://github.com`). The `https://` prefix is added automatically if omitted.
- Hover over a tile and click the red **×** badge to remove it.
- Favicons are fetched automatically; a letter-avatar is used as a fallback.

### Background Customization
1. Click the **⚙ gear icon** (bottom-right corner) to open the Settings panel.
2. **Background Color** — use the colour picker to change the page background instantly.
3. **Background Image** — paste any public `https://` image URL and click **Apply**.  
   Click **Clear Image** to revert to the solid colour.

All settings (colour, image, and favourites) are stored in `localStorage` and persist across browser restarts.

---

## Project Structure

```
chrome-home/
├── manifest.json    # Extension manifest (Manifest V3)
├── newtab.html      # New tab page markup
├── css/
│   └── style.css    # All styles (dark theme, CSS custom properties)
└── js/
    └── main.js      # Clock, search, favourites, and background logic
```

---

## Updating the Extension

After pulling new changes from the repository, reload the extension:

1. Go to `chrome://extensions`.
2. Find **Chrome Home** and click the **↺ reload** icon.

---

## License

MIT
