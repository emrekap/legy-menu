# Légy İstanbul landing page — implementation plan

**Spec (binding):** `.superdesign/design-system.md`
**Visual source:** `.superdesign/drafts/landing-page.html` (Superdesign draft 421c9ce9…, v1). Match its layout, sizes, spacing and look. Where the draft and the design system disagree, the design system wins.
**User instruction:** Remove the Kitchen section entirely. Légy has no kitchen.

## Global Constraints

1. **No build step, no frameworks, no CDN.** Plain HTML, CSS and JS served as-is from this folder (Cloudflare Pages uploads the folder unchanged). Do NOT use Tailwind (CDN or otherwise) or iconify. Icons are inline SVG. Fonts are self-hosted under `vendor/fonts/`. Every asset the landing page loads is local (the README promises the site depends on no other server).
2. **Colour tokens**, exactly as in the design system, defined once as CSS custom properties on `:root` in `site.css`:
   `--night #0e0a0a` · `--night-2 #171010` · `--night-3 #221616` · `--legy-red #a51e22` · `--legy-red-deep #7a1418` · `--glow-red #e0242b` (light/glow only, never text) · `--gold #d5ba8e` · `--cream #f8f4e8` · `--cream-muted rgba(248,244,232,.64)` · `--line rgba(213,186,142,.22)` · `--neon #ffc928` (tiny accents only). No other hues.
3. **Type:** Cormorant Garamond 500, 600, 500 italic (display); Lato 400, 700 (body/UI). Body 17px/1.6. Micro labels: Lato 700, 11px, uppercase, letter-spacing .32em, gold.
4. **No Kitchen anywhere:** no nav link, no section, no marquee item, no food copy, no "served until" line.
5. **Routes:** `/` = landing page (`index.html`). `/menu` = the existing PDF menu viewer, moved unchanged to `menu.html` (Cloudflare Pages and `npx serve` both serve `menu.html` at `/menu`). `/?lang=tr` and `/?lang=en` (legacy QR codes) must immediately redirect to `/menu?lang=…`.
6. **Languages:** Turkish is the default. The landing page and the menu viewer share one saved choice: `localStorage` key `menu-language` (values `tr` / `en`). Switching language updates `<html lang>`. Because CSS uppercases text and `lang="tr"` uppercases `i` to `İ`, every non-Turkish string that is displayed uppercase (English words, cocktail names, genre tags, the tagline) must sit in an element with `lang="en"` or be authored in capitals.
7. **Placeholders must be clearly generic.** No real DJ or artist names. Address, phone, hours, DJ lineup and the WhatsApp number are placeholders. The WhatsApp number exists in exactly one place (a config constant at the top of `site.js`).
8. **Price format:** `1.300 ₺` (dot thousands separator, space, ₺).
9. **Responsive:** works from 360px up with no horizontal scroll. Side gutters 20px mobile / 48px from 1024px. Container max 1240px. Section padding 80px mobile / 128px from 1024px.
10. **Motion:** reveal on scroll (fade + 24px rise, 700ms `cubic-bezier(.2,.7,.2,1)`, 80ms stagger), hero glow breathing (6s), marquee 40s linear loop pausing on hover, image hover scale 1.03 over 800ms, nav background fade 300ms. All motion is disabled under `prefers-reduced-motion: reduce`. All content is visible when JS is off.
11. **Accessibility:** semantic landmarks (`header`, `nav`, `main`, `section` with headings, `footer`), meaningful `alt` text, visible `:focus-visible` rings in `--gold`, language buttons use `aria-pressed`, burger button uses `aria-expanded` + `aria-controls`.
12. **Verification (no test framework exists in this repo):** serve the folder with `npx --yes serve@14 -l <port> .` and check pages with headless Chrome via the helper at `$SCRATCH/verify/shot.mjs` (puppeteer-core is installed there; `import { launch, openPage } from "<that path>"` for scripted checks). Verification scripts live in the scratchpad, never in the repo. Paste the commands and their output into the report. Stop the server afterwards.

`$SCRATCH` = `/private/tmp/claude-501/-Users-emre-Developments-legy-menu/0a6adfa0-a9b4-4f30-9173-685f98dc2e59/scratchpad`

## File structure after this plan

```
index.html            landing page (new)
site.css              landing page styles (new)
site.js               landing page behaviour + English strings (new)
menu.html             PDF menu viewer (was index.html, otherwise unchanged)
app.js, layout.js     menu viewer scripts (comments updated only)
menu-tr.pdf, menu-en.pdf
public/images/        legy0–legy5.jpg (already on disk, untracked) + legy-logo-cream.png (new)
vendor/fonts/         self-hosted woff2 + fonts.css + OFL licences (new)
vendor/pdfjs/         unchanged
qr/                   regenerated to point at /menu
```

## Interface contract between Task 3 (markup + CSS) and Task 4 (JS)

- `<html lang="tr" class="no-js">`. Task 4 adds an inline script at the top of `<head>` that swaps `no-js` → `js`. CSS that hides things for animation only applies under `.js`.
- **Nav:** `<header class="site-nav">`. Solid (blurred `--night` at ~90% + `--line` bottom border) by default. Under `.js`, it is transparent with no border UNLESS it has class `is-scrolled`. Mobile panel opens when the header has class `is-open`. Burger: `<button class="nav-toggle" aria-expanded="false" aria-controls="nav-links">`. Links list: `<ul id="nav-links" class="nav-links">`.
- **Language switch:** any number of `<div class="lang-switch" role="group" aria-label="Dil / Language">` each containing `<button type="button" data-lang="tr" aria-pressed="true">TR</button><button type="button" data-lang="en" aria-pressed="false">EN</button>`. (One in the desktop nav bar, one inside the mobile panel.) Selected = `aria-pressed="true"` → gold fill, night text.
- **Translatable text:** `data-i18n="<key>"` on an element means its `innerHTML` is the Turkish string for `<key>` (copy table below). `data-i18n-attr="alt:<key>"` (or `aria-label:<key>`, `content:<key>`; several separated by `;`) for attributes. Task 4 captures the Turkish values from the DOM at start-up and holds only the English strings.
- **WhatsApp links:** `<a data-whatsapp href="#visit">`. Task 4 replaces `href` with the wa.me link and adds `target="_blank" rel="noopener"`.
- **Failsafe (amended by controller ruling during Task 4 review):** `site.js` runs the reveal set-up first and then adds class `js-ready` to `<html>`; the inline head script swaps `js` back to `no-js` on `DOMContentLoaded` if `js-ready` is missing (site.js failed to load or threw), so content is never left hidden.
- **Reveal:** elements with class `reveal`, optional inline `style="--reveal-delay: 80ms"` for stagger. Under `.js`, `.reveal:not(.is-visible)` is `opacity:0; transform:translateY(24px)`. Task 4 adds `is-visible`.

## Copy table (Turkish = what goes in the HTML; English = what Task 4 puts in `site.js`)

Strings marked *(no key)* are identical in both languages and need no `data-i18n`. `<br>`, `<em>` and `<span lang="en">` inside a string are part of the string.

| key | Turkish | English |
| --- | --- | --- |
| *(no key)* page `<title>` | Légy İstanbul — The art of a good night. | same |
| `meta.description` (attr `content`) | Canlı DJ'ler, imza kokteyller ve sabaha kadar süren geceler. Rezervasyon WhatsApp'tan. | Live DJs, signature cocktails and late nights in Istanbul. Reserve on WhatsApp. |
| *(no key)* logo alt | Légy İstanbul | same |
| `nav.label` (attr `aria-label` on `<nav>` and burger) | Bölümler | Sections |
| `nav.nights` | Geceler | Nights |
| `nav.cocktails` | Kokteyller | Cocktails |
| `nav.gallery` | Galeri | Gallery |
| `nav.visit` | Konum | Visit |
| `nav.reserve` | Rezervasyon | Reserve |
| *(no key)* hero micro label | `<span lang="en">The art of a good night</span>` | same |
| `hero.title` | Canlı DJ'ler.<br>İmza kokteyller.<br><em>Sabaha kadar.</em> | Live DJs.<br>Signature cocktails.<br><em>Late nights.</em> |
| `hero.tonight` | Bu gece · Kapılar 21:00 | Tonight · Doors 21:00 |
| `cta.whatsapp` | WhatsApp'tan rezervasyon | Reserve on WhatsApp |
| `cta.menu` | Menüyü gör | See the menu |
| `marquee.djs` | Canlı DJ'ler | Live DJs |
| `marquee.cocktails` | İmza kokteyller | Signature cocktails |
| `marquee.late` | Sabaha kadar | Late nights |
| *(no key)* marquee tagline | `<span lang="en">The art of a good night</span>` | same |
| `intro.title` | Gecenin sığınağı.<br>Ritmin zarafetle buluştuğu yer. | A sanctuary for the night.<br>Where rhythm meets refinement. |
| `intro.body` | Légy İstanbul; ses, tat ve atmosferin iç içe geçtiği bir gece deneyimi. Kapıdan girin, şehri geride bırakın. | Légy İstanbul is an immersion into sound, taste and atmosphere. Step through the doors and leave the city behind. |
| `alt.martinis` | İki martini tutan bir misafir | A guest holding two martinis |
| `nights.label` | Haftalık program | Weekly lineup |
| `nights.title` | Geceler | Nights |
| `day.thu` / `day.fri` / `day.sat` | Perşembe / Cuma / Cumartesi | Thursday / Friday / Saturday |
| *(no key)* Thursday DJ | `<span lang="en">Resident DJ</span>` | same |
| `dj.guest` (Friday) | Konuk DJ | Guest DJ |
| `dj.special` (Saturday) | Sürpriz konuk | Special guest |
| *(no key)* genre tags | Thu: House, Disco · Fri: Afro House + `genre.electronic` · Sat: Indie Dance (all `lang="en"`) | same |
| `genre.electronic` | Elektronik | Electronic |
| *(no key)* night time | 23:00 – 04:00 | same |
| `cocktails.label` | Bardan | From the bar |
| `cocktails.title` | İmza kokteyller | Signature cocktails |
| *(no key)* cocktail names | VERDE · RITMO · MORA · FAKE PALOMA · BITE (authored in capitals, `lang="en"`) | same |
| `ing.verde` | Beefeater · ev yapımı mürver çiçeği likörü · kuzukulağı · yeşil elma · citrus | Beefeater · homemade elderflower liqueur · sorrel · green apple · citrus |
| `ing.ritmo` | Código · Ojo de Tigre · Aperol · passion fruit · ananas · lime · chili | Código · Ojo de Tigre · Aperol · passion fruit · pineapple · lime · chili |
| `ing.mora` | Absolut · böğürtlen, frambuaz & yaban mersini likörü · bergamot · lime | Absolut · blackberry, raspberry & blueberry liqueur · bergamot · lime |
| `ing.paloma` | Código · Ojo de Tigre · Campari · greyfurt · soda | Código · Ojo de Tigre · Campari · grapefruit · soda |
| `ing.bite` | Chivas Extra Smooth & Smokey · Lapsang Souchong · armut & zencefil cordial · limon | Chivas Extra Smooth & Smokey · Lapsang Souchong · pear & ginger cordial · lemon |
| *(no key)* every cocktail price | 1.300 ₺ | same |
| `cocktails.cta` | Menünün tamamı | See the full menu |
| `alt.berry` | Légy logolu kırmızı meyveli kokteyl | Red berry cocktail with the Légy logo |
| `alt.tray` | Tepside üç kokteyl | Three cocktails on a tray |
| `gallery.title` (visually hidden `h2`) | Galeri | Gallery |
| `alt.booth` | Légy logolu DJ kabini, avize ve neon gülen yüz | The DJ booth with the Légy logo, chandelier and neon smiley |
| `alt.crowd` | Neon gülen yüzün altındaki kalabalık | The crowd under the neon smiley |
| `alt.dj` | Dolu pistte çalan DJ | DJ playing to a packed crowd |
| `gallery.follow` | <span lang="en">@legyistanbul</span>'u takip et | Follow <span lang="en">@legyistanbul</span> |
| `reserve.title` | Masanız bir mesaj<br>uzağınızda. | Your table is one<br>message away. |
| `reserve.body` | Masa rezervasyonu, şişe servisi ve kalabalık gruplar için bize WhatsApp'tan yazın. | Message us on WhatsApp for table reservations, bottle service and large groups. |
| `reserve.cta` | Bize yazın | Message us |
| `visit.label` | Bizi bulun | Location |
| `visit.title` | Konum | Visit |
| `visit.address` | Adres | Address |
| *(no key)* address value | Placeholder Sokak No: 12<br>Beyoğlu, İstanbul | same |
| `visit.hours` | Saatler | Hours |
| `visit.days` | Çarşamba – Cumartesi | Wednesday – Saturday |
| *(no key)* hours value | 21:00 – 04:00 | same |
| `visit.door` | Kapı politikası | Door policy |
| `visit.doorText` | 21 yaş üstü · Smart casual giyim. | 21+ · Smart casual dress. |
| `visit.phone` | Telefon | Phone |
| *(no key)* phone value | +90 5XX XXX XX XX | same |
| `visit.map` | Harita | Map |
| `footer.instagram` (attr `aria-label`) | Instagram'da Légy | Légy on Instagram |
| `footer.menu` | Menü | Menu |
| `footer.rights` | © 2026 Légy İstanbul. Tüm hakları saklıdır. | © 2026 Légy İstanbul. All rights reserved. |
| *(no key)* footer mark | LÉGY · İSTANBUL | same |

WhatsApp pre-filled message (in `site.js` config, not in HTML): TR `Merhaba, masa rezervasyonu yapmak istiyorum.` · EN `Hi, I'd like to reserve a table.`

---

### Task 1: Move the menu viewer to `/menu`

**Files:** `index.html` → `menu.html` (rename), `app.js` (comments only).

1. `git mv index.html menu.html`. Do not change its markup, styles or behaviour.
2. In `app.js`, update every comment that says `index.html` to say `menu.html` (e.g. "add a button with the same data-lang in index.html"). Change no code.
3. Check that nothing else in `menu.html`/`app.js`/`layout.js` assumes it is served at `/` (relative paths like `app.js`, `vendor/pdfjs/…`, `menu-tr.pdf` keep working because `/menu` is still at the site root). Fix only if something actually breaks.
4. Verify with `npx --yes serve@14 -l <port> .` and headless Chrome (`$SCRATCH/verify/shot.mjs`, use `--wait=3000` because PDFs take a moment):
   - `/menu` at 390px and 1280px: the Turkish menu renders, no console errors, no failed requests.
   - `/menu?lang=en` renders the English menu (check `document.documentElement.lang === "en"` with a short scripted check).
   - Clicking EN on `/menu` stores `menu-language=en` in localStorage.
5. Commit: `Move the PDF menu viewer to /menu`.

### Task 2: Self-host brand assets (logo, fonts, photos)

**Files:** `public/images/legy-logo-cream.png` (new), `public/images/legy0–5.jpg` (already on disk, untracked — add to git), `vendor/fonts/` (new).

1. **Logo:** download `https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/8fac95a5-96a7-419a-942a-707bff59d262/brand-assets/brand-legy-logo-cream/legy-logo-cream.png` to `public/images/legy-logo-cream.png`. It is ~218 KB. If it is wider than 800px, resize it to 800px wide with `sips --resampleWidth 800` (keeps transparency). Report its final dimensions and size. Keep it a PNG with transparency.
2. **Fonts:** self-host Cormorant Garamond (500 normal, 600 normal, 500 italic) and Lato (400, 700) as woff2, subsets `latin` and `latin-ext` (Turkish needs latin-ext for ğ ş İ ı). Get them from the Google Fonts CSS2 API (`https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Lato:wght@400;700&display=swap`, requested with a current desktop Chrome User-Agent so it returns woff2), download only the `latin` and `latin-ext` faces, and save them in `vendor/fonts/` with readable names (e.g. `cormorant-garamond-500-latin.woff2`, `lato-700-latin-ext.woff2`).
3. Write `vendor/fonts/fonts.css` with one `@font-face` per file: `font-family` "Cormorant Garamond" / "Lato", correct `font-style`/`font-weight`, `font-display: swap`, the `unicode-range` exactly as Google's CSS gives it for that subset, and `src: url("<file>.woff2") format("woff2")` (relative to `fonts.css`).
4. Add both fonts' licences: `vendor/fonts/OFL-CormorantGaramond.txt` and `vendor/fonts/OFL-Lato.txt` (SIL Open Font License 1.1 text, with each font's copyright line; Cormorant: "Copyright 2015 The Cormorant Project Authors (github.com/CatharsisFonts/Cormorant)"; Lato: "Copyright (c) 2010-2014 by tyPoland Lukasz Dziedzic (team@latofonts.com) with Reserved Font Name "Lato""). 
5. Verify (no test page in the repo): serve the repo, and in a scripted headless Chrome check (script in `$SCRATCH`) navigate to `http://localhost:<port>/vendor/fonts/fonts.css`, then `page.setContent` a snippet with `<link rel="stylesheet" href="http://localhost:<port>/vendor/fonts/fonts.css">` and text in all five styles ("Légy İstanbul ğşı"), then check that `document.fonts.check('500 20px "Cormorant Garamond"')`, `document.fonts.check('italic 500 20px "Cormorant Garamond"')`, `document.fonts.check('700 20px Lato')` all return true after `document.fonts.ready`, with no failed requests. Report the total size of `vendor/fonts/`.
6. Commit: `Add self-hosted fonts, logo and photos`.

### Task 3: Landing page markup and styles

**Files:** `index.html` (new), `site.css` (new).

Build the full landing page from the draft as static HTML + CSS. Turkish copy from the copy table, with the `data-i18n` / `data-i18n-attr` / `data-whatsapp` / `reveal` / nav / language-switch hooks from the Interface contract. Write no JavaScript in this task (Task 4 adds `site.js` and the inline head script); include `<script src="site.js" defer></script>` before `</body>` so Task 4 only creates the file.

`<head>`: charset, viewport, the title, `meta name="description"` (with `data-i18n-attr="content:meta.description"`), `og:title`, `og:description`, `og:type=website`, `og:image=https://legyistanbul.com/public/images/legy3.jpg`, `theme-color #0e0a0a`, `<link rel="icon" href="data:,">`, `<link rel="stylesheet" href="vendor/fonts/fonts.css">`, `<link rel="stylesheet" href="site.css">`, preload the hero logo.

Sections, in this order (ids for anchors in brackets). Use the draft for layout and sizes; the notes below are where the plan differs from or adds to the draft:

1. **Nav** (`header.site-nav`, fixed, height 80px): logo image (`public/images/legy-logo-cream.png`, 32px tall) linking to `#top`; links Geceler `#nights`, Kokteyller `#cocktails`, Galeri `#gallery`, Konum `#visit` (NO Kitchen); right side: language switch (hidden below 640px), Reserve pill (`data-whatsapp`, WhatsApp glyph + `nav.reserve`), burger (shown below 768px). Desktop links show from 768px. States per the Interface contract: transparent over the hero under `.js` until `is-scrolled`; solid otherwise; 300ms transition. Mobile panel (`.is-open`): full-width panel under the bar on `--night` with the four links stacked (large, tappable, ≥44px rows separated by `--line`) and the second language switch. At 360px the bar must fit logo + Reserve + burger without overflow; below 400px the Reserve pill may collapse to the glyph only, keeping `nav.reserve` as a visually hidden label.
2. **Hero** (`main` starts here; hero section `id="top"`): full viewport height, red glow (800px circle, `--glow-red` ~30%, blur ~120px, breathing opacity .4→.8 over 6s), big logo, micro label tagline, `h1` (44px → 72px at 768px → 96px at 1024px, Cormorant 500, uppercase, letter-spacing .04em, line-height 1, the `<em>` line in italic), "Tonight" line with an 8px `--neon` dot with soft glow, both CTAs (primary red pill with WhatsApp glyph = `data-whatsapp`; secondary gold-outline pill → `/menu`). From 1024px: the three-photo collage on the right exactly as the draft (legy4 top-right 60%×70%, legy3 bottom-left 55%×60%, legy0 middle-left 35%×40%, vignette). Below 1024px (the draft shows no photos there, but the design system requires real photos in the hero): show legy4 and legy3 as a two-photo staggered pair (4:5, second one offset down) under the CTAs.
3. **Marquee**: `--night-2` strip with `--line` top/bottom borders, tracked cream micro caps separated by gold `·`: `marquee.djs` · `marquee.cocktails` · `marquee.late` · tagline. Two identical copies side by side for a seamless 40s loop (second copy `aria-hidden="true"`), pauses on hover.
4. **Intro**: two columns from 768px (serif uppercase `h2` + muted paragraph | 4:5 photo legy5 with the inset frame and vignette).
5. **Nights** (`#nights`): centered header (micro label, `h2` between two short hairlines), three `--night-2` cards with the inset frame, hover `--night-3`: day micro label, DJ name in large serif, outlined genre pills, time `23:00 – 04:00` above a hairline. Placeholder names per the copy table.
6. **Cocktails** (`#cocktails`): `--night-2` background with `--line` borders. 12-column layout from 1024px: list (7 cols) with header (micro label, `h2` + hairline filling the rest of the row), five items (serif uppercase name, muted 15px ingredients, gold bold price), secondary CTA → `/menu`; image stack (5 cols): legy2 tall with inset frame, legy1 smaller overlapping it lower right with a 6px `--night-2` border, as the draft.
7. **Gallery** (`#gallery`): visually hidden `h2` (`gallery.title`), grid of 4:5 photos, 2 columns on mobile (legy0, legy3) and 4 from 768px (legy0, legy3, legy4, legy5), hover scale + dim; "Follow @legyistanbul" link with Instagram glyph → `https://www.instagram.com/legyistanbul` (`target="_blank" rel="noopener"`).
8. **Reserve band** (`#reserve`): full-bleed `--legy-red` → `--legy-red-deep` gradient, centered serif uppercase `h2`, short note, cream pill button (`data-whatsapp`, WhatsApp glyph, `reserve.cta`) as the draft.
9. **Visit** (`#visit`): two columns from 768px: label + `h2`, then Address, Hours (hairline row: days left, time right), Door policy, Phone — each with a cream micro label; right column: `--night-2` panel with the inset frame containing a muted "Harita" placeholder box (`visit.map`), min-height 400px.
10. **Footer**: logo (128px wide), `LÉGY · İSTANBUL` tracked micro caps, Instagram icon link (`aria-label` via `footer.instagram`) and a "Menü" link → `/menu`, © line.

Icons: inline SVG, `fill="currentColor"`, `aria-hidden="true"`, from Simple Icons (CC0; e.g. `https://unpkg.com/simple-icons@13.21.0/icons/whatsapp.svg` and `instagram.svg`) — monochrome, not the green WhatsApp logo. Images: local `public/images/…` paths, `width`/`height` attributes set to the real pixel sizes (legy0–3: 480×640, legy4–5: 512×640, logo: whatever Task 2 produced), `loading="lazy"` + `decoding="async"` below the fold, `object-fit: cover`.

CSS (`site.css`): tokens on `:root` (Global Constraint 2); reusable classes for `.micro-label`, `.btn-primary`, `.btn-secondary`, `.inset-frame` (1px `--line` border inset 16px, 24px from 1024px), `.vignette`, section header patterns, `.visually-hidden`; breakpoints at 640px, 768px, 1024px (same as the draft's sm/md/lg); all motion from Global Constraint 10 including the `.reveal` rules and a `prefers-reduced-motion` block; `:focus-visible` gold outline; `scroll-behavior: smooth` (off under reduced motion) and `scroll-margin-top: 80px` on anchored sections. Keep the CSS organised by section with short comments.

Verify (serve + `$SCRATCH/verify/shot.mjs`): full-page screenshots at 360, 390, 768 and 1440 px; zero horizontal overflow at each; no console errors or failed requests (a 404 for `site.js` is expected until Task 4 — say so); open the draft (`.superdesign/drafts/landing-page.html` — it needs network for Tailwind) at 1440px for a side-by-side comparison and describe any deliberate differences. Confirm `grep -ri kitchen index.html site.css` finds nothing. Commit: `Add landing page markup and styles`.

### Task 4: Landing page behaviour and English strings

**Files:** `site.js` (new), `index.html` (inline head script only).

1. **Inline script at the very top of `<head>` in `index.html`** (before stylesheets), tiny and dependency-free:
   - If `location.search` has a `lang` parameter: `location.replace("/menu" + location.search + location.hash)` and stop (legacy QR codes `/?lang=en`).
   - Otherwise swap the `no-js` class on `<html>` for `js`.
2. **`site.js`** (classic script loaded with `defer`, wrapped so nothing leaks to globals). At the top, a clearly commented config block:
   - `WHATSAPP_NUMBER = "905550000000"` with a comment that it is a placeholder to replace before launch (international format, digits only).
   - `WHATSAPP_MESSAGE = { tr: "Merhaba, masa rezervasyonu yapmak istiyorum.", en: "Hi, I'd like to reserve a table." }`
   - `STORAGE_KEY = "menu-language"` (comment: shared with `app.js`), `DEFAULT_LANGUAGE = "tr"`.
   - `EN` — the English strings from the copy table, keyed exactly as the `data-i18n` keys used in `index.html`.
3. **Language:** at start-up capture the Turkish strings from the DOM (`innerHTML` of every `[data-i18n]`, and the attribute values named in every `[data-i18n-attr]`). Initial language = saved value (if `tr` or `en`) else `DEFAULT_LANGUAGE`. `applyLanguage(lang)` sets `<html lang>`, every `[data-i18n]` / `[data-i18n-attr]` (Turkish from the captured values, English from `EN`), `aria-pressed` on every `.lang-switch button`, and every `[data-whatsapp]` `href` to `https://wa.me/<number>?text=<encoded message for lang>` with `target="_blank"` and `rel="noopener"`. Clicking a language button applies and saves it (`localStorage` reads/writes wrapped in try/catch, as in `app.js`). If a key is missing from `EN`, keep the Turkish text and `console.warn` once per key (there should be none — verify).
4. **Nav state:** toggle `is-scrolled` on `.site-nav` when the page is scrolled more than ~40px (passive scroll listener with `requestAnimationFrame`, or an IntersectionObserver on a sentinel). Also set the correct state on load (page may load scrolled).
5. **Burger:** `.nav-toggle` toggles `is-open` on `.site-nav` and `aria-expanded`. Close it when a nav link is clicked, on Escape (return focus to the toggle), and when the viewport grows to ≥768px. While open the nav counts as scrolled (solid).
6. **Reveal:** IntersectionObserver (threshold 0.1) adds `is-visible` to each `.reveal` once, then unobserves. If `IntersectionObserver` is missing or `prefers-reduced-motion: reduce` matches, add `is-visible` to all immediately.
7. Verify with scripted headless Chrome checks (scripts in `$SCRATCH`, output in the report):
   - `/?lang=en` ends on `/menu?lang=en`; `/?lang=tr` ends on `/menu?lang=tr`; `/` stays on `/`.
   - Default load: `html.lang === "tr"`, Turkish hero title; click EN → `html.lang === "en"`, English hero title, `aria-pressed` correct on both switches, localStorage `menu-language === "en"`, WhatsApp hrefs contain the English message; reload → still English; then open `/menu` → menu shows English (`html.lang === "en"` after load).
   - Every `[data-i18n]` key exists in `EN` (no warnings in the console).
   - Nav: no `is-scrolled` at top; `is-scrolled` after scrolling 600px.
   - At 390px: burger opens the panel (`aria-expanded="true"`), clicking a link closes it, Escape closes it.
   - All `.reveal` elements end up `is-visible` after scrolling through; with `page.emulateMediaFeatures([{name: "prefers-reduced-motion", value: "reduce"}])` they are visible immediately.
   - With JS disabled (`page.setJavaScriptEnabled(false)`): all text visible (no element left at opacity 0).
   - Full-page screenshots at 390 and 1440 px in EN and TR; no console errors.
   Commit: `Add landing page behaviour and English strings`.

### Task 5: QR codes and documentation

**Files:** `qr/menu-qr.svg`, `qr/menu-qr.png`, `qr/menu-qr-en.svg`, `qr/menu-qr-en.png`, `README.md`, `.superdesign/design-system.md` (untracked file — edit in place, it is not committed).

1. Regenerate the QR codes so they open the menu directly: `menu-qr` → `https://legyistanbul.com/menu`, `menu-qr-en` → `https://legyistanbul.com/menu?lang=en`. Match the existing files' style: black on white, quiet zone of 4 modules, error correction level H, SVG with `shape-rendering="crispEdges"`, PNG 2000×2000 px. Use `npx --yes qrcode@1.5.4` (CLI or a small script in `$SCRATCH`). Verify each PNG by decoding it with `jsqr` + `pngjs` (installed in `$SCRATCH/verify/node_modules`) and print the decoded text.
2. Update `README.md` (keep its plain, non-technical voice):
   - Intro: the site is now a landing page at `/` (nights, cocktails, gallery, reservations on WhatsApp, address) and the menu at `/menu`.
   - Languages: the landing page and the menu share the guest's TR/EN choice; `?lang=en` now belongs on `/menu`; old `/?lang=…` links still forward to the menu. To change the default language, edit `DEFAULT_LANGUAGE` in both `app.js` and `site.js`.
   - QR codes: point at `/menu`. Note that QR codes printed before this change open `legyistanbul.com`, which now shows the landing page with a "See the menu" button (the English one still forwards to the menu).
   - Preview locally: `npx serve .` serves `/menu` from `menu.html`; with `python3 -m http.server` open `/menu.html` instead.
   - A new "Before launch: fill in the placeholders" section listing exactly where each placeholder lives: WhatsApp number (`WHATSAPP_NUMBER` in `site.js`), address, phone, opening hours, the "Tonight · Doors 21:00" line, DJ lineup (Nights section) and the map box (all in `index.html`).
   - Files list: add `index.html` (landing page), `site.css`, `site.js`, `menu.html` (the menu viewer), `public/images/`, `vendor/fonts/`; update the `qr/` line.
   - Update "Optional tweaks" so it refers to `menu.html` where it used to say `index.html`.
3. Update `.superdesign/design-system.md` so future design iterations don't bring the kitchen back: product context becomes "nightclub and cocktail bar", remove the food job-to-be-done wording ("Check drinks and prices"), remove Kitchen from the nav links and the marquee text (use "LIVE DJS · SIGNATURE COCKTAILS · LATE NIGHTS · THE ART OF A GOOD NIGHT ·"), delete page-architecture item 7 (Kitchen) and renumber, and remove "Food" from the placeholder note.
4. Verify: decoded QR texts; `grep -ri kitchen README.md index.html site.css site.js` finds nothing; `grep -i kitchen .superdesign/design-system.md` finds nothing.
5. Commit (QR + README only): `Point QR codes at /menu and document the landing page`.
