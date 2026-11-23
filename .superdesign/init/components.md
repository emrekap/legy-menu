# Components

Framework: none (static HTML + vanilla ES modules, vanilla CSS, PDF.js for rendering). No component library, no Tailwind.

The project has no shared component directory. The only reusable UI primitive is the language switch.

## LanguageSwitch (`index.html`, `.lang`)
Pill-shaped TR / EN toggle in the top-right corner. Selected button gets `--accent` background and `--bg` text.

```html
<div class="lang" role="group" aria-label="Dil / Language">
  <button type="button" data-lang="tr" lang="tr" title="Türkçe" aria-pressed="true">TR</button>
  <button type="button" data-lang="en" lang="en" title="English" aria-pressed="false">EN</button>
</div>
```

```css
.lang {
  position: absolute; top: 10px; right: 10px; z-index: 1;
  display: flex; gap: 2px; padding: 3px; border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(8px);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 22%, transparent);
}
.lang button {
  position: relative; min-width: 38px; height: 30px; margin: 0; padding: 0 8px;
  border: 0; border-radius: 999px; background: none; color: var(--ink);
  font: 600 12px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
  letter-spacing: 0.06em; opacity: 0.75; cursor: pointer;
  transition: background-color .2s ease, color .2s ease, opacity .2s ease;
}
.lang button:hover { opacity: 1; }
.lang button[aria-pressed="true"] { background: var(--accent); color: var(--bg); opacity: 1; cursor: default; }
.lang button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (min-width: 800px) {
  .lang { position: fixed; top: 16px; right: 16px; }
  .lang button { min-width: 44px; height: 32px; font-size: 13px; }
}
```
