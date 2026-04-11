<div align="center">
  <h1>Chrome Home</h1>
  <img src="assets/chrome-home-preview.png" alt="Chrome Home Theme preview">
  <p>A highly customizable new tab extension for chrome that I use.</p>
</div>


## Customizations
- General
    - Tab name
    - Search url (search engine, but using url to support custom engines)
    - Favicon
    - Toggle on/off favorites
- Background
    - Background color / image (can be toggled)
    - Background light
    - Background image quality
- Theme
    - Background color
    - Text color
    - Highlight color
    - Enable themes
    - Export current theme
- Clock
    - Clock size
    - Clock position (using x, y cordinates sliders)
- Font
    - Font change using url and font family fields (same as you'd do in css)


## Theming
This extension supports theming via [theming API](/themes/README.md). It comes with set of themes made by me which will be shown under "Included" section in theme browser panel.

To install community themes:
 - Move the theme folder starting with "chu-" prefix inside the `themes` directory.
 - Add entry to it via `themes/community_themes.json`.
 - Enable custom themes inside the "Browse Themes" panel.

See more info [here](/themes/README.md).


## Install
- Download the [source code](https://github.com/partiallywritten/chrome-home/archive/refs/heads/main.zip) and unzip it.
- Head to `chrome://extensions` and enable developer mode.
- Click load unpacked and select the unzipped folder.


## Warning
This entire extension has been fully vibe-coded using [copilot](https://github.com/apps/copilot-swe-agent) via heavily guided specific prompts.
Use it at your own risk.
