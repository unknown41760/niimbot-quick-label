# Quick Label — NIIMBOT D11_H

A small, static Android Chrome app for **type → Print**. Text and the phone's local date are drawn to a bitmap, including Cyrillic, before being sent over Web Bluetooth. The full local date is the default on a fresh visit; a previously selected date mode remains saved. The empty field and preview use “Название / Name” and “Название” as examples; nothing is entered for printing until the user types. There is no server, account, build step, or analytics.

## Label presets

| Roll | Sent bitmap | Status |
| --- | --- | --- |
| 15 × 30 mm | **144 × 354 px** | Geometry validated upstream on D11_H; check local alignment. |
| 15 × 50 mm | 144 × 590 px | Arithmetic estimate; **needs physical calibration on this D11_H**. |
| 12.5 × 109 mm cable/fold-over | 144 × 1286 px | Same content on two adjacent 37 mm sections, followed by a 35 mm blank wrap tail. This order is visible in the supplied roll listing and print photo; exact feed registration **still needs physical calibration**. |
| Custom | From entered dimensions, capped at 144 px across the head | Experimental. |

The 144 px width is the measured printhead width, even when the roll is 15 mm wide. Feed offset and across-head shift are saved separately for each preset in Settings. Offset changes placement; it does not change the bitmap size or prove a roll's geometry.

## Installed roll recognition

If the installed roll has a readable RFID tag, the printer can return a roll barcode. **The tag does not contain label dimensions.** The app includes an exact mapping from the observed barcode `083024188` to the **12.5 × 109 mm — two sides** preset. After connecting this tagged roll on another phone that opens the same app version, Print selects that preset before rendering. No local setup is needed on the other phone.

To teach a phone another barcode, choose the correct named preset and tap **Settings → Remember this roll as the selected label**. This reads the roll without printing and stores the barcode-to-preset association in this browser's local storage. On later Print taps, the app reads the installed roll, selects a locally saved preset first or a built-in match second, and reports the selection in Settings. Choose a different preset and use the same button to override a built-in mapping on that phone.

The RFID response has separate `barCode` and `serialNumber` fields. Upstream observed 13-digit product barcodes, but `083024188` is nine digits, and only one roll has been reported with it. A second roll of the same product must be scanned before assuming all such rolls share this barcode. If no tag is readable, the read fails, or the barcode is unknown, Print continues with the visible selector and says so. The user successfully saved this roll's barcode using the D11_H, but automatic selection and the new built-in match still need a physical print check. No cloud lookup or unknown protocol probe is used. Chrome still requires a tap to initiate the Bluetooth connection.

## Install, use offline, and update

On Android, open **https://unknown41760.github.io/niimbot-quick-label/** directly in Chrome while online. In **Settings → Install and updates**, tap **Install Quick Label** if offered; otherwise use Chrome's **⋮ → Install app** (or **Add to Home screen**) menu. Open the installed app from its launcher icon. Wait until Settings says **Available offline** before relying on it without Internet. To test, turn on airplane mode, turn Bluetooth back on, open the installed app, and print. Web Bluetooth still requires a user tap and may show Chrome's printer chooser.

When you open the installed app online, it checks for updates. You can also tap **Check for updates** in Settings. When a complete update is downloaded, tap **Update ready — Reload** after printing finishes. The existing launcher icon remains; no reinstall is needed. Offline, the last complete cached version continues to run. If an update download fails, the previous version stays available. App releases must change the version in `app.js`, `index.html`, and `sw.js`, plus the `app.js` URL in `index.html` and `sw.js`, so the browser downloads one consistent set of files.

The selected label, date mode, density, custom dimensions, calibration, and manually remembered roll mappings use the phone's Chrome site storage and survive ordinary app closure and phone restarts. Updates do not clear those storage keys. They are not synchronized to another phone; the built-in `083024188` mapping is included in app files and reaches other phones through updates. Clearing the site's data can erase saved settings and the offline cache. The typed label text is not saved between sessions.

## Deploy on GitHub Pages

This directory contains `.nojekyll`, `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, three PNG install icons, and `vendor/niimbot.js` plus `vendor/label-memory.js` with `vendor/LICENSE`. Commit these files to the root of a GitHub repository. In **Settings → Pages**, select **Deploy from a branch**, the published branch (usually `main`), and **/(root)**. Open the resulting HTTPS URL directly in Android Chrome.

The package archive and unpacked source used for verification are excluded by `.gitignore`.

This test build shows its app and driver versions in Settings. The service worker caches only the app's own shell files; it does not cache unknown requests. On a new release, it downloads every shell file before offering the update. A failed download leaves the previous complete cache in place.

## Phone test sequence

1. Turn on the D11_H and Bluetooth, load a **15 × 30 mm** roll, and open the Pages URL directly in Android Chrome. Type `Название`, leave the default **Full** date, and tap **Print**. Select the D11_H in Chrome's chooser on the first print. The app should identify model **528**, then print and report confirmation. Enter/Done should also print. Confirm the date uses the phone's local date and the Cyrillic letters are readable.
2. Photograph the **whole printed 15 × 30 label beside a millimetre ruler**, straight overhead, with the feed/start edge marked. Include a Settings screenshot showing version, detected printer, bitmap size, offsets, progress, and any error. If a failure appears, keep the label: a driver error can occur after some paper has already printed.
3. In Settings, use **Print one calibration pattern** on the 15 × 30 roll. It uses one label and places short ticks 12 px from each feed end and at left/centre/right across the head. Photograph it as above. Measure from the physical start/end edges to the first/last row of ticks and from the physical left/right edges to the outer tick centres. Record the current feed and across-head offsets from Settings.
4. Load the **15 × 50** roll, select its preset, and print one calibration pattern. Provide the same overhead photo and four edge measurements. Then print one normal Cyrillic label if the pattern is correctly registered. The 590 px length is only an estimate until measured on this printer.
5. Load the **12.5 × 109 cable** roll, select its preset, and print one normal label with short text. Photograph the full label flat beside a ruler, with the feed/start edge marked. The two printed sections should sit next to each other in the first ~74 mm, followed by a blank ~35 mm tail. Measure the physical start edge to the first text, the seam between printed sections, the second section's end, and the blank tail. Confirm that both text/date pairs are present and that the second section reads the desired way when folded. The exact millimetre boundaries are still listing-based estimates.

If the chooser does not appear, check that the page is HTTPS, opened directly in Chrome, and Bluetooth is enabled. The Print button starts connection itself. For failures, copy the visible Settings diagnostics and describe whether any paper moved or printed.

## Driver and maintenance

`vendor/niimbot.js` is an **unmodified copy** of `src/niimbot.js` from [`iscarelli/niimbot-web-bluetooth` 2.6.0](https://github.com/iscarelli/niimbot-web-bluetooth/tree/v2.6.0), licensed under MIT; see `vendor/LICENSE`. Its SHA-256 is `5ed9ead4797d575374bef078573eb2196da839f04a5f7bd30886990e865ea6aa`. The app verifies the loaded driver's reported version. Do not upgrade it while comparing physical prints without recording that change.

`vendor/label-memory.js` is the unmodified optional helper from the same 2.6.0 package. It stores only a roll barcode and chosen preset locally, and failures to read or write that memory do not block manual printing.

The app uses the driver's documented `identify(model)` and `printImage(url, { model, size, density, offsetY, onProgress })` APIs. It refuses to send a label unless identification reports D11_H model id 528. It does not use `Niimbot.probe`.
