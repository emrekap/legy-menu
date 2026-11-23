# Theme

## Part 1 — Token summary

CSS variables (`index.html` `:root`):
- `--bg: #a51e22` — Legy red, page background (matches the menu PDF)
- `--accent: #d5ba8e` — champagne gold, selected state / section headings in the menu
- `--ink: #f8f4e8` — cream, text on red

Brand as printed on the menu PDFs (`menu-en.pdf`, `menu-tr.pdf`):
- Logo: hand-lettered script "Légy" with thin sans "ISTANBUL", cream (#e8dcc4-ish) on red
- Display type: classic high-contrast serif, uppercase, wide tracking (e.g. "COCKTAIL MENU", "SIGNATURE COCKTAILS" in gold)
- Body type: humanist sans (Lato-like) for ingredients and prices
- Tagline: "THE ART OF A GOOD NIGHT" (tiny tracked caps)
- Ornament: thin gold hairline rules, a thin inset frame around each page, hand-drawn cream line illustrations of cocktail glasses
- Prices in gold, formatted `1.300 ₺`
- Footer mark: "LEGY · İSTANBUL" small tracked caps
- UI font in the web shell: system-ui, 600 12–13px, letter-spacing .06em
- Radius: pills (999px) for the switch; no cards
- Motion: 0.2–0.4s ease opacity/colour transitions

Breakpoints: 800px (switch becomes fixed), ~720px (menu switches to phone column).

## Part 2 — Raw source (`index.html` `<style>`, tokens and base)

```css
:root { --bg: #a51e22; --accent: #d5ba8e; --ink: #f8f4e8; }
html, body { margin: 0; background: var(--bg); transition: background-color .3s ease; }
body { min-height: 100vh; -webkit-tap-highlight-color: transparent; }
#menu { transition: opacity .25s ease; }
.is-column #menu { padding: 56px 0 48px; }
body:not(.is-loaded) #menu { opacity: .4; }
.piece { position: relative; margin: 0 auto; opacity: 0; transition: opacity .4s ease; }
.piece.is-ready { opacity: 1; }
.loader { position: fixed; top: 50%; left: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px;
  border: 2px solid rgba(255,255,255,.15); border-top-color: rgba(255,255,255,.6); border-radius: 50%;
  animation: spin .8s linear infinite; }
.fallback { padding: 40vh 24px 0; text-align: center; font: 16px/1.5 system-ui, -apple-system, sans-serif; color: var(--ink); }
```
