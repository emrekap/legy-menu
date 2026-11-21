// Shows the menu PDF as one continuous web page, with no toolbar and no page
// numbers. On computers and tablets the pages are shown whole, stacked with no
// gaps. On a phone a whole page would be too small to read, so each page is cut
// into its parts (every cocktail, every list...) and the parts are stacked in
// one column, big enough to read without zooming (layout.js finds the parts).
// The TR / EN switch at the top of the screen changes between the Turkish and
// the English menu.

import { analyzePage, planColumn } from "./layout.js";

// One PDF per language. To add a language, add a line here and a button with
// the same data-lang in index.html.
const MENUS = {
  tr: {
    file: "menu-tr.pdf",
    title: "Legy — Menü",
    label: "Menü",
    failed: "Menü burada gösterilemedi.",
    open: "Menüyü aç",
  },
  en: {
    file: "menu-en.pdf",
    title: "Legy — Menu",
    label: "Menu",
    failed: "The menu could not be shown here.",
    open: "Open the menu",
  },
};
const DEFAULT_LANGUAGE = "tr";
const STORAGE_KEY = "menu-language";
const PDFJS_DIR = "vendor/pdfjs/";

// Browsers (iOS Safari especially) refuse to draw canvases larger than this.
const MAX_CANVAS_PIXELS = 16_777_216;

// Whole pages are never shown wider than this (in CSS pixels).
const MAX_PAGE_WIDTH = 960;
// Whole pages are shown only where they get at least this big: 0.6 is 60% of
// the size the PDF was designed at, so 16 pt text shows at about 10 px. On
// narrower screens (phones) the menu is shown as one column instead.
const MIN_PAGE_SCALE = 0.6;
// The phone column: empty space at its left and right (CSS pixels), and how big
// it may get on wider screens (1 = the size the PDF was designed at).
const COLUMN_SIDES = 16;
const MAX_COLUMN_SCALE = 1;

// Whole pages: empty space at the sides of the PDF is trimmed off, so the menu
// itself fills the screen. This much is kept as a border on each side, as a
// share of the menu's own width (0.04 = 4%).
const SIDE_PADDING = 0.04;

// When a guest zooms in, the part on screen is drawn again, sharp. This much
// extra around the screen is drawn too (0.25 = a quarter of a screen on every
// side), so moving a little does not need a new drawing.
const DETAIL_MARGIN = 0.25;

// Each page is drawn this wide (in pixels) once, small, to find its parts.
const ANALYSIS_WIDTH = 600;
const MAX_ANALYSIS_PIXELS = 4_000_000;

const menu = document.getElementById("menu");
const switcher = document.querySelector(".lang");
const absolute = (path) => new URL(path, document.baseURI).href;

const pdfjsReady = import(absolute(`${PDFJS_DIR}pdf.min.mjs`)).then((pdfjs) => {
  pdfjs.GlobalWorkerOptions.workerSrc = absolute(`${PDFJS_DIR}pdf.worker.min.mjs`);
  return pdfjs;
});

const views = {}; // language → its opened menu, kept so switching back is quick
let wanted = null; // the language asked for most recently
let target = null; // the menu that should be on screen
let shown = null; // the menu that is on screen (the old one until a switch is done)
let renderPass = 0;
let currentTask = null;
let sharpenPass = 0;
let sharpenTask = null;
let sharpenTimer;

// Turkish, unless the guest picked another language on an earlier visit or the
// link asks for one (…/?lang=en).
function startLanguage() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode); the default still works.
  }
  const fromLink = new URLSearchParams(location.search).get("lang")?.toLowerCase();
  return [fromLink, saved].find((lang) => Object.hasOwn(MENUS, lang ?? "")) ?? DEFAULT_LANGUAGE;
}

function remember(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // See startLanguage.
  }
  // A ?lang= in the address wins over the saved choice, so keep it in step.
  const url = new URL(location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
  }
}

// Puts the menu for a language on screen. A newer call takes over from an
// older one that is still loading.
async function show(lang) {
  wanted = lang;
  for (const button of switcher.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
  }
  document.body.classList.remove("is-loaded"); // spinner on, current menu dimmed

  try {
    const view = await loadView(lang);
    if (wanted !== lang) return;
    target = view;
    await present(view);

    if (!view.hasExtras) {
      view.hasExtras = true;
      for (const entry of view.pages) {
        addLinks(view, entry).catch(console.error);
        addHiddenText(view, entry).catch(console.error);
      }
    }
  } catch (err) {
    console.error(err);
    if (wanted === lang) showFallback(lang);
  }
}

// Downloads and opens the PDF for a language, once.
function loadView(lang) {
  views[lang] ??= openMenu(lang).catch((err) => {
    delete views[lang]; // so the next try starts over
    throw err;
  });
  return views[lang];
}

async function openMenu(lang) {
  const { file } = MENUS[lang];

  // Download the PDF and the PDF renderer at the same time.
  const [pdfjs, data] = await Promise.all([
    pdfjsReady,
    fetch(file).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${file} (HTTP ${res.status})`);
      return res.arrayBuffer();
    }),
  ]);

  const pdf = await pdfjs.getDocument({
    data,
    wasmUrl: absolute(`${PDFJS_DIR}wasm/`),
    iccUrl: absolute(`${PDFJS_DIR}iccs/`),
    standardFontDataUrl: absolute(`${PDFJS_DIR}standard_fonts/`),
  }).promise;

  const pages = [];
  const layouts = [];
  let emptySide = 0.5;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const size = page.getViewport({ scale: 1 });
    const look = await examine(page, size);
    pages.push({ page, size });
    layouts.push(look.layout);
    emptySide = Math.min(emptySide, look.emptySide);
  }

  // Whole pages. The empty sides are trimmed by the same amount left and right
  // and on every page, so the menu stays centered and the pages line up.
  const menuWidth = 1 - 2 * emptySide;
  const trim = menuWidth > 0 ? Math.max(0, emptySide - menuWidth * SIDE_PADDING) : 0;
  const whole = pages.map(({ page, size }) =>
    makePiece(page, size, { left: trim, top: 0, width: 1 - 2 * trim, height: 1 }),
  );

  // The phone column, if the pages have parts that can be stacked.
  let column = null;
  const plan = planColumn(layouts);
  if (plan) {
    column = {
      width: plan.width,
      pieces: plan.tiles.map((tile) => {
        const { page, size } = pages[tile.page];
        const left = Math.max(0, tile.x / size.width);
        const top = Math.max(0, tile.y / size.height);
        const crop = {
          left,
          top,
          width: Math.min(1 - left, tile.w / size.width),
          height: Math.min(1 - top, tile.h / size.height),
        };
        return { ...makePiece(page, size, crop), gap: tile.gap };
      }),
    };
  }
  return { lang, pages, whole, column, pieces: null, hasExtras: false };
}

// A box on screen that shows one piece of a page: a whole page, or one part of
// a page in the phone column. `crop` is the piece's place on its page, as
// shares of the page's width and height.
function makePiece(page, size, crop) {
  const el = document.createElement("div");
  el.className = "piece";
  // A box with the right shape, so nothing jumps while the piece is drawn.
  el.style.aspectRatio = `${size.width * crop.width} / ${size.height * crop.height}`;
  return {
    page,
    size,
    crop,
    width: size.width * crop.width, // in points
    gap: 0, // space above it in the phone column, in points
    cssWidth: 0,
    el,
    canvas: null,
    renderedFor: "",
    detail: null,
  };
}

// Draws a page small once, to find how much of its sides is empty and what
// its parts are.
async function examine(page, size) {
  const scale = Math.min(
    ANALYSIS_WIDTH / size.width,
    Math.sqrt(MAX_ANALYSIS_PIXELS / (size.width * size.height)),
  );
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, viewport }).promise;
  const image = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.height = 0; // free memory on iOS

  let layout = null;
  try {
    layout = analyzePage(image, size);
  } catch (err) {
    console.error(err); // the page is then shown whole on phones too
  }
  return { emptySide: measureEmptySide(image), layout };
}

// How much of a page's sides is empty: the share of its width, counted in from
// both edges, where nothing is drawn.
function measureEmptySide({ data, width, height }) {
  // Empty = about the same color as the top left corner.
  const isEmpty = (x, y) => {
    const i = (y * width + x) * 4;
    return (
      Math.abs(data[i] - data[0]) +
        Math.abs(data[i + 1] - data[1]) +
        Math.abs(data[i + 2] - data[2]) <
      30
    );
  };
  let empty = Math.floor(width / 2);
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < empty && isEmpty(x, y) && isEmpty(width - 1 - x, y)) x++;
    empty = x;
  }
  return empty / width;
}

// Picks how a menu is shown on this screen (whole pages, or the phone column)
// and sizes its pieces. Returns the pieces to show.
function arrange(view) {
  const screen = document.documentElement.clientWidth;
  const pageWidth = Math.max(...view.whole.map((piece) => piece.width));
  const pageScale = Math.min(screen, MAX_PAGE_WIDTH) / pageWidth;

  if (view.column && pageScale < MIN_PAGE_SCALE) {
    const room = screen - 2 * COLUMN_SIDES;
    const scale = Math.min(MAX_COLUMN_SCALE, room / view.column.width); // CSS px per point
    for (const piece of view.column.pieces) {
      // A few pieces (big titles) are wider than the column and are shown smaller.
      piece.cssWidth = Math.floor(Math.min(piece.width * scale, room));
      piece.el.style.width = `${piece.cssWidth}px`;
      piece.el.style.marginTop = `${(piece.gap * scale).toFixed(1)}px`;
    }
    return view.column.pieces;
  }

  const width = Math.floor(Math.min(screen, MAX_PAGE_WIDTH));
  for (const piece of view.whole) {
    piece.cssWidth = width;
    piece.el.style.width = `${width}px`;
  }
  return view.whole;
}

// Draws a menu for the current screen and puts it on screen. Calling it again
// (resize, language switch) cancels the previous run.
async function present(view) {
  const pass = ++renderPass;
  currentTask?.cancel();
  const pieces = arrange(view);

  // First visit: reserve the space right away and let the pieces fade in as
  // they are drawn. Language switch, or the phone turned so the menu is shown
  // the other way: the old menu stays up until the new one is drawn.
  if (!shown) mount(view, pieces);

  for (const piece of pieces) {
    try {
      await renderPiece(piece);
    } catch (err) {
      if (err?.name === "RenderingCancelledException") return;
      throw err;
    }
    if (pass !== renderPass) return;
    if (shown === view && view.pieces === pieces && piece === pieces[0]) reveal(view);
  }

  if (shown !== view || view.pieces !== pieces) {
    mount(view, pieces);
    reveal(view);
  }
  scheduleSharpen(); // in case the guest is zoomed in
}

async function renderPiece(piece) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const key = `${piece.cssWidth}@${pixelRatio}`;
  if (piece.renderedFor === key) return;

  // Only the piece's part of the page is drawn.
  const { size, crop } = piece;
  const keptWidth = size.width * crop.width;
  const keptHeight = size.height * crop.height;
  let scale = (piece.cssWidth / keptWidth) * pixelRatio;
  const pixels = keptWidth * keptHeight * scale * scale;
  if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);

  const viewport = piece.page.getViewport({
    scale,
    offsetX: -size.width * crop.left * scale,
    offsetY: -size.height * crop.top * scale,
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(keptWidth * scale));
  canvas.height = Math.max(1, Math.floor(keptHeight * scale));
  canvas.setAttribute("aria-hidden", "true");

  // Draw off-screen first, then swap, so resizing never flashes blank.
  const task = piece.page.render({ canvas, viewport });
  currentTask = task;
  await task.promise;
  if (currentTask === task) currentTask = null;

  if (piece.canvas) {
    piece.canvas.replaceWith(canvas);
    piece.canvas.width = piece.canvas.height = 0; // free memory on iOS
  } else {
    piece.el.prepend(canvas);
  }
  piece.canvas = canvas;
  piece.renderedFor = key;
  piece.el.classList.add("is-ready");
}

// Swaps a menu (or the other layout of the same menu) into the page.
function mount(view, pieces) {
  const scroller = document.scrollingElement;
  const progress = scroller.scrollTop / scroller.scrollHeight;
  const leaving = shown?.pieces;

  menu.replaceChildren(...pieces.map((piece) => piece.el));
  document.body.classList.toggle("is-column", pieces !== view.whole);
  if (shown && shown !== view) shown.pieces = null;
  shown = view;
  view.pieces = pieces;
  setPageLanguage(view.lang);

  if (leaving && leaving !== pieces) {
    // Stay at the same place in the menu.
    scroller.scrollTop = progress * scroller.scrollHeight;
    release(leaving);
  }
}

// Called once the first piece of a menu is on screen and drawn.
function reveal(view) {
  if (document.body.classList.contains("is-loaded")) return;
  matchBackground(view.pieces[0].canvas);
  document.body.classList.add("is-loaded");
}

// Drops the drawings of pieces that left the screen. The opened PDF is kept,
// so they can be drawn again quickly.
function release(pieces) {
  for (const piece of pieces) {
    dropDetail(piece);
    if (!piece.canvas) continue;
    piece.canvas.remove();
    piece.canvas.width = piece.canvas.height = 0; // free memory on iOS
    piece.canvas = null;
    piece.renderedFor = "";
    piece.el.classList.remove("is-ready");
  }
}

// Zoomed in, the picture of a piece is only stretched, which makes the text
// blurry. So shortly after the guest stops zooming or moving, the part that is
// on screen is drawn again at the zoomed size and laid on top of the piece.
function scheduleSharpen() {
  clearTimeout(sharpenTimer);
  sharpenTimer = setTimeout(() => sharpen().catch(console.error), 150);
}

async function sharpen() {
  const pass = ++sharpenPass;
  sharpenTask?.cancel();
  const view = shown;
  const pieces = view?.pieces;
  const screen = window.visualViewport;
  if (!pieces || !screen) return;

  if (screen.scale < 1.05) {
    pieces.forEach(dropDetail); // not zoomed in: the pieces themselves are sharp
    return;
  }

  for (const piece of pieces) {
    if (!piece.canvas) continue; // the piece itself is not drawn yet
    const box = piece.el.getBoundingClientRect();
    const seen = visiblePart(box, screen, 0);
    if (seen.right <= seen.left || seen.bottom <= seen.top) {
      dropDetail(piece); // piece is off screen
      continue;
    }
    const part = visiblePart(box, screen, DETAIL_MARGIN);

    // Canvas pixels per CSS pixel at this zoom.
    let ratio = Math.min(window.devicePixelRatio || 1, 3) * screen.scale;
    const pixels = (part.right - part.left) * (part.bottom - part.top) * ratio * ratio;
    if (pixels > MAX_CANVAS_PIXELS) ratio *= Math.sqrt(MAX_CANVAS_PIXELS / pixels);

    // Size the whole piece would have at this zoom. Only `part` of it is drawn.
    const fullWidth = box.width * ratio;
    const fullHeight = box.height * ratio;
    const scale = fullWidth / piece.width;
    // Cut off at the left and top of the page, outside the piece.
    const cutLeft = piece.size.width * piece.crop.left * scale;
    const cutTop = piece.size.height * piece.crop.top * scale;

    // Nothing to do if the last sharp drawing still covers the screen.
    const old = piece.detail;
    if (
      old &&
      Math.abs(old.scale / scale - 1) < 0.05 &&
      old.left <= seen.left / box.width + 0.0005 &&
      old.top <= seen.top / box.height + 0.0005 &&
      old.right >= seen.right / box.width - 0.0005 &&
      old.bottom >= seen.bottom / box.height - 0.0005
    ) {
      continue;
    }

    // Whole canvas pixels, so the sharp drawing lines up exactly with the piece.
    const x = Math.floor(part.left * ratio);
    const y = Math.floor(part.top * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(part.right * ratio) - x;
    canvas.height = Math.ceil(part.bottom * ratio) - y;
    canvas.className = "detail";
    canvas.setAttribute("aria-hidden", "true");
    // Percentages keep it in place if the piece changes size.
    Object.assign(canvas.style, {
      left: `${(x / fullWidth) * 100}%`,
      top: `${(y / fullHeight) * 100}%`,
      width: `${(canvas.width / fullWidth) * 100}%`,
      height: `${(canvas.height / fullHeight) * 100}%`,
    });

    const task = piece.page.render({
      canvas,
      viewport: piece.page.getViewport({ scale, offsetX: -x - cutLeft, offsetY: -y - cutTop }),
    });
    sharpenTask = task;
    try {
      await task.promise;
    } catch (err) {
      canvas.width = canvas.height = 0; // free memory on iOS
      if (err?.name === "RenderingCancelledException") return;
      throw err;
    }
    if (sharpenTask === task) sharpenTask = null;
    if (pass !== sharpenPass || shown !== view || view.pieces !== pieces) {
      canvas.width = canvas.height = 0;
      return;
    }

    dropDetail(piece);
    piece.el.append(canvas);
    piece.detail = {
      canvas,
      scale,
      left: x / fullWidth,
      top: y / fullHeight,
      right: (x + canvas.width) / fullWidth,
      bottom: (y + canvas.height) / fullHeight,
    };
  }
}

// The part of a piece that is on screen (plus `margin` screens around it), in
// CSS pixels measured from the piece's top left corner.
function visiblePart(box, screen, margin) {
  const marginX = screen.width * margin;
  const marginY = screen.height * margin;
  return {
    left: Math.max(0, screen.offsetLeft - box.left - marginX),
    top: Math.max(0, screen.offsetTop - box.top - marginY),
    right: Math.min(box.width, screen.offsetLeft + screen.width - box.left + marginX),
    bottom: Math.min(box.height, screen.offsetTop + screen.height - box.top + marginY),
  };
}

function dropDetail(piece) {
  if (!piece.detail) return;
  piece.detail.canvas.remove();
  piece.detail.canvas.width = piece.detail.canvas.height = 0; // free memory on iOS
  piece.detail = null;
}

function setPageLanguage(lang) {
  document.documentElement.lang = lang;
  document.title = MENUS[lang].title;
  menu.setAttribute("aria-label", MENUS[lang].label);
}

function showFallback(lang) {
  const { file, failed, open } = MENUS[lang];
  renderPass++;
  currentTask?.cancel();
  if (shown?.pieces) release(shown.pieces);
  if (shown) shown.pieces = null;
  shown = target = wanted = null; // tapping the language again retries

  const link = document.createElement("a");
  link.href = file;
  link.textContent = open;
  const note = document.createElement("p");
  note.className = "fallback";
  note.append(`${failed} `, link);
  menu.replaceChildren(note);
  document.body.classList.remove("is-column");
  setPageLanguage(lang);
  document.body.classList.add("is-loaded");
}

// Uses the color at the top corners of the first piece as the site background,
// so the space around the menu (and the phone's browser bar) matches it.
function matchBackground(canvas) {
  const ctx = canvas.getContext("2d");
  const left = ctx.getImageData(2, 2, 1, 1).data;
  const right = ctx.getImageData(canvas.width - 3, 2, 1, 1).data;
  const diff =
    Math.abs(left[0] - right[0]) + Math.abs(left[1] - right[1]) + Math.abs(left[2] - right[2]);
  if (diff > 30) return; // corners differ, keep the default from index.html

  const color = `rgb(${left[0]}, ${left[1]}, ${left[2]})`;
  const root = document.documentElement.style;
  root.setProperty("--bg", color);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);

  // Keep the language switch readable if the menu is ever light.
  const isDark = left[0] * 0.299 + left[1] * 0.587 + left[2] * 0.114 < 128;
  if (isDark) root.removeProperty("--ink");
  else root.setProperty("--ink", "#1f1f1f");
}

// The pieces of both layouts that show part of a page.
function piecesOf(view, page) {
  return [...view.whole, ...(view.column?.pieces ?? [])].filter((piece) => piece.page === page);
}

// Keeps links from the PDF (website, Instagram, phone number...) clickable.
async function addLinks(view, { page, size }) {
  const annotations = await page.getAnnotations();
  for (const a of annotations) {
    if (a.subtype !== "Link" || !a.url) continue;

    // The link's box, as shares of the page's width and height.
    const [x1, y1] = size.convertToViewportPoint(a.rect[0], a.rect[1]);
    const [x2, y2] = size.convertToViewportPoint(a.rect[2], a.rect[3]);
    const left = Math.min(x1, x2) / size.width;
    const top = Math.min(y1, y2) / size.height;
    const width = Math.abs(x2 - x1) / size.width;
    const height = Math.abs(y2 - y1) / size.height;

    for (const { crop, el } of piecesOf(view, page)) {
      const inside =
        left < crop.left + crop.width &&
        left + width > crop.left &&
        top < crop.top + crop.height &&
        top + height > crop.top;
      if (!inside) continue;
      const link = document.createElement("a");
      link.href = a.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", a.url);
      // Percentages of the piece keep the link in place at any screen size.
      Object.assign(link.style, {
        left: `${((left - crop.left) / crop.width) * 100}%`,
        top: `${((top - crop.top) / crop.height) * 100}%`,
        width: `${(width / crop.width) * 100}%`,
        height: `${(height / crop.height) * 100}%`,
      });
      el.append(link);
    }
  }
}

// Invisible copy of the menu text for screen readers and search engines, in
// the first piece of each page.
async function addHiddenText(view, { page }) {
  const content = await page.getTextContent();
  const text = content.items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join("");
  if (!text.trim()) return;

  for (const pieces of [view.whole, view.column?.pieces ?? []]) {
    const first = pieces.find((piece) => piece.page === page);
    if (!first) continue;
    const hidden = document.createElement("div");
    hidden.className = "sr-only";
    hidden.textContent = text;
    first.el.append(hidden);
  }
}

switcher.addEventListener("click", (event) => {
  const lang = event.target.closest("button")?.dataset.lang;
  if (!lang || lang === wanted) return;
  remember(lang);
  show(lang);
});

// Redraw when the width changes (phone turned, window resized).
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (target) present(target).catch(console.error);
  }, 150);
});

// Zooming, or moving around while zoomed in: sharpen what is on screen.
window.visualViewport?.addEventListener("resize", scheduleSharpen);
window.visualViewport?.addEventListener("scroll", scheduleSharpen);
window.addEventListener("scroll", scheduleSharpen, { passive: true });

show(startLanguage());
