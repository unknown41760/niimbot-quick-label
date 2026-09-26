# Quick Label — NIIMBOT D11_H

A small, static Android Chrome app for **type → Print**. Text and the phone's local date are drawn to a bitmap, including Cyrillic, before being sent over Web Bluetooth. The full local date is the default on a fresh visit; a previously selected date mode remains saved. There is no server, account, build step, or analytics.

## Label presets

| Roll | Sent bitmap | Status |
| --- | --- | --- |
| 15 × 30 mm | **144 × 354 px** | Geometry validated upstream on D11_H; check local alignment. |
| 15 × 50 mm | 144 × 590 px | Arithmetic estimate; **needs physical calibration on this D11_H**. |
| 12.5 × 109 mm cable/fold-over | 144 × 1286 px | Same content on two adjacent 37 mm sections, followed by a 35 mm blank wrap tail. This order is visible in the supplied roll listing and print photo; exact feed registration **still needs physical calibration**. |
| Custom | From entered dimensions, capped at 144 px across the head | Experimental. |

The 144 px width is the measured printhead width, even when the roll is 15 mm wide. Feed offset and across-head shift are saved separately for each preset in Settings. Offset changes placement; it does not change the bitmap size or prove a roll's geometry.

## Installed roll recognition

If the installed roll has a readable RFID tag, the printer can return a roll barcode. **The tag does not contain label dimensions.** To teach this phone a barcode once, choose the correct named preset and tap **Settings → Remember this roll as the selected label**. This reads the roll without printing and stores the barcode-to-preset association in this browser's local storage. On later Print taps, the app reads the installed roll, selects the saved preset before rendering, and reports the selection in Settings. Choose a different preset and use the same button to correct an association.

If no tag is readable, the read fails, or the barcode has not been taught, Print continues with the visible selector and says so. This feature has not yet been tested on the user's D11_H/rolls; upstream's RFID decoding is only partly validated on other models. No cloud lookup or unknown protocol probe is used. Chrome still requires a tap to initiate the Bluetooth connection.

## Deploy on GitHub Pages

This directory contains `.nojekyll`, `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, and `vendor/niimbot.js` plus `vendor/label-memory.js` with `vendor/LICENSE`. Commit these files to the root of a GitHub repository. In **Settings → Pages**, select **Deploy from a branch**, the published branch (usually `main`), and **/(root)**. Open the resulting HTTPS URL directly in Android Chrome.

The package archive and unpacked source used for verification are excluded by `.gitignore`.

This test build shows its app and driver versions in Settings. Its service worker removes the prototype's cache-first cache and does not intercept later requests. After deploying an update, reload once or twice until Settings shows the new version. If a previously installed copy remains stale, close its tab and reopen the Pages URL in Chrome.

## Phone test sequence

1. Turn on the D11_H and Bluetooth, load a **15 × 30 mm** roll, and open the Pages URL directly in Android Chrome. Type `Молоко`, choose **Day**, and tap **Print**. Select the D11_H in Chrome's chooser on the first print. The app should identify model **528**, then print and report confirmation. Enter/Done should also print. Confirm the date uses the phone's local day and the Cyrillic letters are readable.
2. Photograph the **whole printed 15 × 30 label beside a millimetre ruler**, straight overhead, with the feed/start edge marked. Include a Settings screenshot showing version, detected printer, bitmap size, offsets, progress, and any error. If a failure appears, keep the label: a driver error can occur after some paper has already printed.
3. In Settings, use **Print one calibration pattern** on the 15 × 30 roll. It uses one label and places short ticks 12 px from each feed end and at left/centre/right across the head. Photograph it as above. Measure from the physical start/end edges to the first/last row of ticks and from the physical left/right edges to the outer tick centres. Record the current feed and across-head offsets from Settings.
4. Load the **15 × 50** roll, select its preset, and print one calibration pattern. Provide the same overhead photo and four edge measurements. Then print one normal Cyrillic label if the pattern is correctly registered. The 590 px length is only an estimate until measured on this printer.
5. Load the **12.5 × 109 cable** roll, select its preset, and print one normal label with short text. Photograph the full label flat beside a ruler, with the feed/start edge marked. The two printed sections should sit next to each other in the first ~74 mm, followed by a blank ~35 mm tail. Measure the physical start edge to the first text, the seam between printed sections, the second section's end, and the blank tail. Confirm that both text/date pairs are present and that the second section reads the desired way when folded. The exact millimetre boundaries are still listing-based estimates.

If the chooser does not appear, check that the page is HTTPS, opened directly in Chrome, and Bluetooth is enabled. The Print button starts connection itself. For failures, copy the visible Settings diagnostics and describe whether any paper moved or printed.

## Driver and maintenance

`vendor/niimbot.js` is an **unmodified copy** of `src/niimbot.js` from [`iscarelli/niimbot-web-bluetooth` 2.6.0](https://github.com/iscarelli/niimbot-web-bluetooth/tree/v2.6.0), licensed under MIT; see `vendor/LICENSE`. Its SHA-256 is `5ed9ead4797d575374bef078573eb2196da839f04a5f7bd30886990e865ea6aa`. The app verifies the loaded driver's reported version. Do not upgrade it while comparing physical prints without recording that change.

`vendor/label-memory.js` is the unmodified optional helper from the same 2.6.0 package. It stores only a roll barcode and chosen preset locally, and failures to read or write that memory do not block manual printing.

The app uses the driver's documented `identify(model)` and `printImage(url, { model, size, density, offsetY, onProgress })` APIs. It refuses to send a label unless identification reports D11_H model id 528. It does not use `Niimbot.probe`.
