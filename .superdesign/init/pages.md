# Pages

## / (Menu viewer)
Entry: `index.html`
Dependencies:
- `app.js` — loads PDF.js, draws `menu-tr.pdf` / `menu-en.pdf` into canvases, language switch logic (no UI markup)
  - `layout.js` — splits PDF pages into parts for the phone column (pure logic)
  - `vendor/pdfjs/pdf.min.mjs`, `vendor/pdfjs/pdf.worker.min.mjs` (third-party)
- `menu-tr.pdf`, `menu-en.pdf` — the visual content (brand reference)

UI-relevant context for design: `index.html` only (all markup and CSS live there).
