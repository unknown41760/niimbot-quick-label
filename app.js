(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const PX_PER_MM = 354 / 30; // D11_H measured 300-dpi feed scale from the driver registry.
  const HEAD_PX = 144;
  const STORAGE_KEY = "quick-label-d11h-v1";
  const APP_VERSION = "0.2.0-test";
  const DRIVER_VERSION = "2.6.0";

  const MODEL = {
    name_prefixes: ["D11"],
    task: "v4",
    density: 3,
    label_type: 1,
    speed: 1,
  };

  const PRESETS = {
    "15x30": { name: "15 × 30 mm", widthMm: 15, lengthMm: 30, mode: "single" },
    "15x50": { name: "15 × 50 mm", widthMm: 15, lengthMm: 50, mode: "single" },
    "12.5x109-double": {
      name: "12.5 × 109 mm — two sides",
      widthMm: 12.5,
      lengthMm: 109,
      mode: "double",
      sideMm: 37,
      gapMm: 35,
    },
  };

  const state = loadState();
  applyState();

  let printing = false;
  const progress = [];
  $("appVersion").textContent = APP_VERSION;
  $("footerVersion").textContent = APP_VERSION;
  $("driverVersion").textContent = window.Niimbot?.VERSION || "failed to load";

  function loadState() {
    try {
      return Object.assign({
        profile: "15x30",
        dateMode: "day",
        density: "3",
        flipSecond: true,
        customWidth: "15",
        customLength: "40",
        customMode: "single",
        sideMm: "30",
        gapMm: "20",
        calibration: {},
      }, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch (_) {
      return { profile: "15x30", dateMode: "day", density: "3", flipSecond: true, calibration: {} };
    }
  }

  function applyState() {
    const fields = ["profile", "dateMode", "density", "customWidth", "customLength", "customMode", "sideMm", "gapMm"];
    for (const id of fields) if ($(id) && state[id] != null) $(id).value = state[id];
    $("flipSecond").checked = state.flipSecond !== false;
    toggleCustom();
    loadCalibrationFields();
  }

  function saveState() {
    const fields = ["profile", "dateMode", "density", "customWidth", "customLength", "customMode", "sideMm", "gapMm"];
    for (const id of fields) if ($(id)) state[id] = $(id).value;
    state.flipSecond = $("flipSecond").checked;
    const key = $("profile").value;
    state.calibration ??= {};
    state.calibration[key] = {
      feed: boundedInt($("feedOffset").value, -30, 30),
      horizontal: boundedInt($("horizontalOffset").value, -12, 12),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function toggleCustom() {
    $("custom").classList.toggle("show", $("profile").value === "custom");
    $("customDouble").classList.toggle("show", $("customMode").value === "double");
  }

  function boundedInt(value, min, max) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : 0;
  }

  function calibration() {
    const saved = state.calibration?.[$("profile").value] || {};
    return {
      feed: boundedInt(saved.feed, -30, 30),
      horizontal: boundedInt(saved.horizontal, -12, 12),
    };
  }

  function loadCalibrationFields() {
    const c = calibration();
    $("feedOffset").value = c.feed;
    $("horizontalOffset").value = c.horizontal;
    $("calibrationState").textContent = $("profile").value === "15x30"
      ? "15 × 30 geometry is validated upstream on D11_H; local alignment still needs checking."
      : "This roll needs physical calibration on your D11_H.";
  }

  function currentProfile() {
    if ($("profile").value !== "custom") return Object.assign({}, PRESETS[$("profile").value]);
    const widthMm = Math.max(5, Math.min(15, number($("customWidth").value, 15)));
    const lengthMm = Math.max(10, Math.min(150, number($("customLength").value, 40)));
    const mode = $("customMode").value;
    return {
      name: "Custom",
      widthMm,
      lengthMm,
      mode,
      sideMm: Math.max(10, Math.min(70, number($("sideMm").value, 30))),
      gapMm: Math.max(0, Math.min(80, number($("gapMm").value, 20))),
    };
  }

  function number(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function sizeFor(profile) {
    return {
      w_px: Math.min(HEAD_PX, Math.max(48, Math.round(profile.widthMm * PX_PER_MM))),
      h_px: Math.max(80, Math.round(profile.lengthMm * PX_PER_MM)),
      dpi: 300,
      margin: 6,
    };
  }

  function localDate(mode) {
    if (mode === "none") return "";
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    if (mode === "month") return `${mm}.${yy}`;
    if (mode === "full") return `${dd}.${mm}.${d.getFullYear()}`;
    return `${dd}.${mm}`;
  }

  function font(ctx, size, bold = true) {
    ctx.font = `${bold ? 800 : 600} ${Math.round(size)}px "Noto Sans", Roboto, Arial, sans-serif`;
  }

  function wrapAtSize(ctx, text, width, fontSize, maxLines) {
    font(ctx, fontSize, true);
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines) return null;
      }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) return null;
    if (lines.some((s) => ctx.measureText(s).width > width)) return null;
    return lines;
  }

  function bestTextLayout(ctx, text, width, height, maxLines = 2) {
    const max = Math.min(68, height * 0.72);
    const min = 20;
    for (let fs = max; fs >= min; fs -= 2) {
      const lines = wrapAtSize(ctx, text, width, fs, maxLines);
      if (!lines) continue;
      const lineH = fs * 1.02;
      if (lines.length * lineH <= height) return { fs, lineH, lines };
    }
    const fs = min;
    font(ctx, fs, true);
    let clipped = text.trim();
    while (clipped.length > 1 && ctx.measureText(clipped + "…").width > width) clipped = clipped.slice(0, -1);
    return { fs, lineH: fs, lines: [clipped + (clipped !== text.trim() ? "…" : "")] };
  }

  function drawSide(ctx, x, y, w, h, text, date, rotate180) {
    ctx.save();
    if (rotate180) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(Math.PI);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    const padX = Math.max(8, Math.round(h * 0.07));
    const padY = Math.max(6, Math.round(h * 0.05));
    const dateH = date ? Math.min(32, Math.round(h * 0.23)) : 0;
    const gap = date ? 4 : 0;
    const nameH = h - padY * 2 - dateH - gap;
    const usableW = Math.max(20, w - padX * 2);

    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const layout = bestTextLayout(ctx, text, usableW, nameH, 2);
    font(ctx, layout.fs, true);
    const totalH = layout.lines.length * layout.lineH;
    let ty = y + padY + nameH / 2 - totalH / 2 + layout.lineH / 2;
    for (const line of layout.lines) {
      ctx.fillText(line, x + w / 2, ty);
      ty += layout.lineH;
    }

    if (date) {
      font(ctx, dateH * 0.82, false);
      ctx.fillText(date, x + w / 2, y + h - padY - dateH / 2);
    }
    ctx.restore();
  }

  function buildLogicalCanvas(profile, text, date) {
    const size = sizeFor(profile);
    const logical = document.createElement("canvas");
    logical.width = size.h_px;   // label length becomes screen width
    logical.height = size.w_px;  // printhead becomes screen height
    const ctx = logical.getContext("2d", { alpha: false });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, logical.width, logical.height);
    // Logical vertical is physical head width, with its direction reversed after rotation.
    ctx.translate(0, -calibration().horizontal);

    if (profile.mode === "double") {
      const sidePx = Math.max(40, Math.round(profile.sideMm * PX_PER_MM));
      const gapPx = Math.max(0, Math.round(profile.gapMm * PX_PER_MM));
      const totalWanted = sidePx * 2 + gapPx;
      const scale = totalWanted > logical.width ? logical.width / totalWanted : 1;
      const s = Math.min(Math.round(sidePx * scale), Math.floor(logical.width / 2));
      // Independent rounding of 37 + 35 + 37 mm can exceed 109 mm by one row.
      const g = Math.min(Math.round(gapPx * scale), logical.width - s * 2);
      const used = s * 2 + g;
      const start = Math.max(0, Math.round((logical.width - used) / 2));
      drawSide(ctx, start, 0, s, logical.height, text, date, false);
      drawSide(ctx, start + s + g, 0, s, logical.height, text, date, $("flipSecond").checked);

      // faint preview-only guide is added later; print canvas stays clean.
      logical._doubleMeta = { firstEnd: start + s, secondStart: start + s + g };
    } else {
      drawSide(ctx, 0, 0, logical.width, logical.height, text, date, false);
    }
    return { logical, size };
  }

  function toPhysicalCanvas(logical, size) {
    const physical = document.createElement("canvas");
    physical.width = size.w_px;
    physical.height = size.h_px;
    const ctx = physical.getContext("2d", { alpha: false });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, physical.width, physical.height);
    ctx.save();
    ctx.translate(physical.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(logical, 0, 0);
    ctx.restore();
    return physical;
  }

  function renderPreview() {
    const profile = currentProfile();
    const text = $("text").value.trim() || "Молоко";
    const date = localDate($("dateMode").value);
    const { logical, size } = buildLogicalCanvas(profile, text, date);
    const c = calibration();
    $("pixelSize").textContent = `${size.w_px} × ${size.h_px} px · feed ${c.feed > 0 ? "+" : ""}${c.feed} px · across ${c.horizontal > 0 ? "+" : ""}${c.horizontal} px`;
    const preview = $("preview");
    preview.width = logical.width;
    preview.height = logical.height;
    const ctx = preview.getContext("2d", { alpha: false });
    ctx.drawImage(logical, 0, 0);

    if (logical._doubleMeta) {
      ctx.save();
      ctx.strokeStyle = "#b8c1cc";
      ctx.lineWidth = Math.max(1, Math.round(preview.height * 0.01));
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(logical._doubleMeta.firstEnd, 0);
      ctx.lineTo(logical._doubleMeta.firstEnd, preview.height);
      ctx.moveTo(logical._doubleMeta.secondStart, 0);
      ctx.lineTo(logical._doubleMeta.secondStart, preview.height);
      ctx.stroke();
      ctx.restore();
    }
  }

  function setStatus(message, kind = "") {
    const el = $("status");
    el.textContent = message;
    el.className = kind;
  }

  function reportError(message) {
    $("lastError").textContent = message;
    setStatus(message, "error");
  }

  function addProgress(message) {
    progress.push(`${new Date().toLocaleTimeString()}  ${message}`);
    if (progress.length > 12) progress.shift();
    $("progressLog").textContent = progress.join("\n");
    setStatus(message);
  }

  function testPattern(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size.w_px;
    canvas.height = size.h_px;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    const shift = calibration().horizontal;
    // Short ticks use little heat and leave a known 12 px inset at each feed end.
    for (const y of [12, Math.round(size.h_px / 2), size.h_px - 12]) {
      for (const x of [12, Math.round(size.w_px / 2), size.w_px - 12]) {
        ctx.fillRect(x + shift - 1, y - 5, 3, 11);
      }
    }
    ctx.font = 'bold 12px "Noto Sans", Roboto, Arial, sans-serif';
    ctx.fillText("START", 30 + shift, 31);
    ctx.fillText("END", 39 + shift, size.h_px - 22);
    return canvas;
  }

  async function printNow(pattern = false) {
    if (printing) return;
    const text = $("text").value.trim();
    if (!text && !pattern) {
      reportError("Type something first.");
      $("text").focus();
      return;
    }
    if (!window.isSecureContext) {
      reportError("Web Bluetooth needs HTTPS. Open this page from an HTTPS address in Chrome.");
      return;
    }

    printing = true;
    $("print").disabled = true;
    $("testPattern").disabled = true;
    $("print").textContent = "Preparing…";
    saveState();

    try {
      const Niimbot = window.Niimbot;
      if (!Niimbot) {
        throw new Error("Bundled printer driver failed to load. Reload this page; if it persists, check the uploaded vendor/niimbot.js file.");
      }
      if (Niimbot.VERSION !== DRIVER_VERSION) throw new Error(`Driver mismatch: expected ${DRIVER_VERSION}, loaded ${Niimbot.VERSION || "unknown"}. Reload the page.`);
      if (!Niimbot.isSupported || !Niimbot.isSupported()) {
        throw new Error("Web Bluetooth is not available here. Open the HTTPS page directly in Chrome on Android.");
      }

      $("lastError").textContent = "None";
      progress.length = 0;
      addProgress("Connecting to D11_H…");
      $("printerInfo").textContent = "Connecting / identifying…";
      // identify() calls requestDevice immediately, while this Print tap still has
      // browser user activation. The later printImage() reuses that connection.
      const printer = await Niimbot.identify(MODEL);
      $("printerInfo").textContent = printer
        ? `${printer.label} · id ${printer.modelId ?? "unknown"} · ${printer.task || "?"} · ${printer.dpi || "?"} dpi`
        : "Identification failed";
      if (!printer || printer.modelId !== 528) {
        throw new Error(`Expected D11_H (model id 528); detected ${printer?.label || "unknown printer"} (id ${printer?.modelId ?? "unknown"}). No label was sent.`);
      }
      const profile = currentProfile();
      const date = localDate($("dateMode").value);
      const built = buildLogicalCanvas(profile, text, date);
      const physical = pattern ? testPattern(built.size) : toPhysicalCanvas(built.logical, built.size);
      const png = physical.toDataURL("image/png");
      const density = Number($("density").value) || 3;
      const c = calibration();
      addProgress(`D11_H identified · ${built.size.w_px} × ${built.size.h_px} px${pattern ? " · test pattern" : ""}; sending image…`);

      await Niimbot.printImage(png, {
        model: MODEL,
        size: built.size,
        density,
        offsetY: c.feed,
        onProgress: (s) => {
          $("print").textContent = "Printing…";
          addProgress(String(s || "Printing…"));
        },
      });
      addProgress("Printer confirmed completion.");
      setStatus(pattern ? "Calibration pattern printed." : "Printed. Ready for the next label.", "ok");
      if (!pattern) { $("text").focus(); $("text").select(); }
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      if ($("printerInfo").textContent === "Connecting / identifying…") $("printerInfo").textContent = "Not identified";
      addProgress(`Error: ${msg}`);
      reportError(msg);
    } finally {
      printing = false;
      $("print").disabled = false;
      $("testPattern").disabled = false;
      $("print").textContent = "Print";
    }
  }

  const watched = ["text", "profile", "dateMode", "density", "flipSecond", "customWidth", "customLength", "customMode", "sideMm", "gapMm", "feedOffset", "horizontalOffset"];
  for (const id of watched) {
    const el = $(id);
    const event = (el.type === "text" || el.type === "number") ? "input" : "change";
    el.addEventListener(event, () => {
      if (id === "profile") loadCalibrationFields();
      toggleCustom();
      saveState();
      renderPreview();
    });
  }

  $("print").addEventListener("click", () => printNow(false));
  $("testPattern").addEventListener("click", () => printNow(true));
  $("text").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      printNow(false);
    }
  });

  renderPreview();

  if (!window.Niimbot || window.Niimbot.VERSION !== DRIVER_VERSION) {
    reportError("Bundled printer driver did not load correctly. Reload this page and check the uploaded vendor/niimbot.js file.");
  }

  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      setStatus("App files updated. Reload the page before printing.");
    });
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {}));
  }
})();
