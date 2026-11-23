# Layouts

There is one page and no shared layout components (no nav, sidebar, or footer).

## `index.html` — page shell
Renders: a fixed TR/EN language switch (top right), a `<main id="menu">` that `app.js` fills with canvases of the menu PDF pages (or, on narrow phones, a single column of cropped page parts), a centered spinner while loading, and a `<noscript>` fallback with links to the PDFs. Page background is the menu's red (`--bg: #a51e22`), auto-matched to the PDF edge colour.

Body structure (styles are in `theme.md` / `components.md`):

```html
<body>
  <div class="lang" role="group" aria-label="Dil / Language">…TR / EN buttons…</div>
  <main id="menu" aria-label="Menü"></main>   <!-- .piece > canvas, filled by app.js -->
  <div class="loader" aria-hidden="true"></div>
  <noscript><p class="fallback"><a href="menu-tr.pdf">Menüyü aç</a> · <a href="menu-en.pdf" lang="en">Open the menu</a></p></noscript>
</body>
```
