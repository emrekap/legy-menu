# Legy — menu

A small static site for Légy İstanbul with two pages:

- **`/`** is the landing page: the nights, the signature cocktails, a photo
  gallery, table reservations on WhatsApp, and the address and opening hours.
  It has a "Menü" link at the top and a "See the menu" button.
- **`/menu`** shows the menu PDF as a normal web page, with no PDF toolbar and
  no page numbers. A **TR / EN** switch at the top right changes between the
  Turkish and the English menu. It has one addition for phones (see below).
  When a guest zooms in, the part on screen is redrawn so the text stays sharp.

## On phones and on bigger screens

The Legy PDFs are designed like printed pages: two or three columns side by side
on a 1200 pt wide page. On a phone a whole page would be too small to read
(the ingredient lines would be about 5 px high). So:

- **On computers, tablets and most phones held sideways** the pages are shown
  whole, exactly as designed, stacked with no gaps.
- **On phones held upright** (and small phones held sideways) each page is cut into its parts (the logo, the
  title, every cocktail, every list...) and the parts are stacked in one column,
  big enough to read without zooming. Columns are read one after the other: the
  whole left column, then the right one.

The parts are found automatically from the PDF each time it is opened
(`layout.js`), so there is nothing to set up when the menu changes. The PDF
itself is not changed.

## Before launch

### Fill in the placeholders

The landing page has made-up details that must be replaced with the real ones.
Search for the old text to find each one.

In `site.js` (at the top):

- **WhatsApp number**: `WHATSAPP_NUMBER`. Write it with the country code, for
  example `+90 532 123 45 67` (spaces, `+`, brackets and dashes are fine). Every
  "Reserve on WhatsApp" button uses it. Right now it is a fake number.
- **Open nights**: `OPEN_DAYS`, the nights the venue is open, as numbers:
  0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday,
  6 = Saturday. Right now it is `[3, 4, 5, 6]`, Wednesday to Saturday.
- **Door time**: `DOORS`, right now `"21:00"`.

`OPEN_DAYS` and `DOORS` make the line under the big headline on the first
screen. On an open night it says "Bu gece · Kapılar 21:00" (English: "Tonight ·
Doors 21:00") with a small yellow light. On a closed night it names the next
open night instead, for example "Çarşamba · Kapılar 21:00". It goes by Istanbul
time, and a night lasts until 04:00, so at 01:30 on Sunday it is still Saturday
night. Keep both in step with the opening hours below.

In `index.html`:

- **DJ lineup**: the Nights section, three cards: "Perşembe" with
  "Resident DJ", "Cuma" with "Konuk DJ", "Cumartesi" with "Sürpriz konuk". Each
  card has its music styles (for example "House", "Elektronik") and times
  ("23:00 – 04:00").
- **Address**: "Placeholder Sokak No: 12" and "Beyoğlu, İstanbul" in the Visit
  section.
- **Phone**: "+90 5XX XXX XX XX" in the Visit section.
- **Opening hours**: "Çarşamba – Cumartesi" and "21:00 – 04:00" in the Visit
  section. Also "Çarşamba – Cumartesi · Kapılar 21:00" near the top of
  `index.html`: it shows instead of the open-night line on the rare phones
  where the page's script doesn't run.
- **Map box**: the box labelled "Harita" in the Visit section is only a
  placeholder. Replace it with a real map or a link to one.

### Turkish and English texts

The Turkish texts are in `index.html`. Their English versions are in the `EN`
list near the top of `site.js`. One rule tells you which texts have one:

- If the tag around the text has `data-i18n="some.name"`, the English version
  is the line `"some.name": …` in the `EN` list in `site.js`. Change both, or
  English guests keep seeing the old text.
- Text without `data-i18n` shows the same in both languages. Change it once.

For example, the first DJ card's day is
`<p class="micro-label" data-i18n="day.thu">Perşembe</p>`, and its English is
the line `"day.thu": "Thursday",` in `site.js`. If that night moves to
Wednesday, change "Perşembe" to "Çarşamba" and "Thursday" to "Wednesday".
"Cuma", "Cumartesi", "Konuk DJ", "Sürpriz konuk", "Elektronik", "Harita" and
"Çarşamba – Cumartesi" work the same way. The address, the phone, the times and
the music styles already in English ("House", "Disco", "Afro House",
"Indie Dance") have no `data-i18n`.

**Real DJ names** are the same in both languages. Replace the text (for example
"Konuk DJ") with the name, then remove the `data-i18n="…"` part from the tag
and delete its line from `site.js`. If the name is not Turkish, put it inside
`<span lang="en">…</span>`, as the first card does with "Resident DJ", so that
an "i" in it doesn't turn into "İ" in capitals.

### Replace the table QR codes

QR codes printed before the landing page open `legyistanbul.com`, which now
shows the landing page, not the menu. Guests reach the menu with one tap on
"Menü" at the top, but please replace those codes with the new ones in `qr/`
(`menu-qr` opens the menu), ideally before the first deploy or right after it.
The old English code (`?lang=en`) still opens the English menu directly; the
new `menu-qr-en` does the same.

## Add the menus

Put the two PDFs in this folder and name them exactly:

- **`menu-tr.pdf`**: the Turkish menu
- **`menu-en.pdf`**: the English menu

For the phone column to work, the PDF needs what the current menus already
have: a plain background color, and some empty space between the parts of the
page (between columns, between cocktails, above and below headings). If a page
can't be cut into parts, phones show it whole instead, which still works but
is small.

## Languages

- Guests see Turkish first, on the landing page and on the menu.
- The landing page and the menu share the guest's choice. If a guest switches
  language on one, the other follows, and their phone remembers it for the next
  visit.
- A link to the menu can open a language directly: add `?lang=en` (or
  `?lang=tr`) to `/menu`, for example `https://legyistanbul.com/menu?lang=en`
  for a separate English QR code. Old links like `legyistanbul.com/?lang=en`
  still work: they forward to the menu in that language.
- To change the default language, edit `DEFAULT_LANGUAGE` at the top of both
  `app.js` and `site.js`. Keep the two the same.
- To add a language to the menu, edit `MENUS` at the top of `app.js` and add a
  button with the same `data-lang` in `menu.html`. (The landing page only has
  Turkish and English.)

## Preview locally

```bash
npx serve .
# or: python3 -m http.server 8000
```

Then open the address it prints. With `npx serve .` the menu is at `/menu`.
With `python3 -m http.server` the menu is at `/menu.html` instead, because that
server doesn't know the short address. (Opening `menu.html` by double-clicking
won't work, because browsers block PDF loading from `file://`.) To see the phone
column on a computer, make the browser window narrow (under about 700 px), or
use the phone view of the browser's developer tools.

## Deploy to Cloudflare Pages

The site is hosted on [Cloudflare Pages](https://pages.cloudflare.com/) as the
project **`legy-menu`**, the same way as the With menu. The live address is
<https://legyistanbul.com> (`www.legyistanbul.com` works too).

**Always use `legyistanbul.com` in QR codes and links, never
`legy-menu.pages.dev`.** Türkiye blocks the whole `pages.dev` domain (since
November 2025), so guests on Turkish networks can't open a `pages.dev` address.
The site still answers at <https://legy-menu.pages.dev>, but only outside
Türkiye.

The domain's DNS must stay on Cloudflare, with both records **proxied** (orange
cloud). A DNS-only record, or DNS at another provider, would show
`legy-menu.pages.dev` to the guest's internet provider and the block would hit
again.

There is no build step and no GitHub connection: a deploy uploads this folder
as it is, from your computer, minus its hidden files (see
[What gets uploaded](#what-gets-uploaded)).

### One-time setup

Install [Node.js](https://nodejs.org/), then log in to Cloudflare once per
computer:

```bash
npx wrangler login
```

The first time, it asks to install `wrangler`: answer `y`. A browser window then
opens. Log in with the Cloudflare account that owns the `legy-menu` project and
allow access.

### Deploy a new version to production

First read [What gets uploaded](#what-gets-uploaded). Then, from this folder,
run:

```bash
rm -rf /tmp/legy-site && rsync -a --exclude='.*' ./ /tmp/legy-site/ &&
  npx wrangler pages deploy /tmp/legy-site --project-name=legy-menu --branch=main
```

`--branch=main` is what makes it the live version. When the command finishes,
the new version is live at <https://legyistanbul.com>. Open it on a phone and
check both languages.

Use exactly this command (`wrangler pages deploy`). Newer versions of wrangler
suggest moving the site to Cloudflare Workers with `wrangler deploy`; that would
make a separate site that the domain doesn't point to.

### Try a version before it goes live

```bash
rm -rf /tmp/legy-site && rsync -a --exclude='.*' ./ /tmp/legy-site/ &&
  npx wrangler pages deploy /tmp/legy-site --project-name=legy-menu --branch=preview
```

This uploads to <https://preview.legyistanbul.com> and leaves the live site
alone. The preview address works in Türkiye, and anyone with the address can
open it. Search engines are told not to list it (the `_headers` file does that).
When it looks right, run the production command above.

The preview address is set up in Cloudflare in two places: the custom domain
`preview.legyistanbul.com` on the `legy-menu` project, and a DNS record named
`preview` (CNAME to `preview.legy-menu.pages.dev`). Keep that record **proxied**
(orange cloud): otherwise it shows the live site instead of the preview.

### Go back to an older version

In the [Cloudflare dashboard](https://dash.cloudflare.com/), go to
**Workers & Pages → legy-menu → Deployments**, open the **⋯** menu next to an
older production deployment and choose **Rollback to this deployment**.

### What gets uploaded

The deploy commands above first copy this folder to `/tmp/legy-site`, leaving
out hidden files and folders (names that start with a dot, such as `.git`,
`.superdesign` and `.superpowers`), and then upload that copy. Everything else
in this folder is uploaded, and anyone can open it by its address, this README
included. So don't leave drafts, old menus or private files here, unless they
are inside a hidden folder.

**Don't deploy with `npx wrangler pages deploy .`** (with a dot, the older
command). It uploads the hidden folders too, including the design drafts and
notes in `.superdesign/`: an early draft with a Kitchen section and the names of
real DJs. Folders whose names start with a dot are hidden in Finder: press
**Cmd + Shift + .** to show them.

## Update the menu

Replace `menu-tr.pdf` and/or `menu-en.pdf` (keep the exact names), then
[deploy to production](#deploy-a-new-version-to-production). Guests get the new
version right away. Each PDF must be smaller than 25 MB, Cloudflare's limit for
one file.

The landing page also shows the five signature cocktails (VERDE, RITMO, MORA,
FAKE PALOMA, BITE) with their ingredients and prices. They are typed into the
page, not taken from the PDF, so when one of them changes on the PDF, change it
there too: the names, Turkish ingredients and prices are in `index.html` (the
Cocktails section), and the English ingredients are the `ing.` lines in
`site.js` (for example `"ing.verde": …`). Otherwise guests see two prices for
the same drink.

If the new PDF only changes names or prices, the phone column looks the same as
before. If the designer changed the layout, open the menu on a phone (or the
preview deploy) and scroll through it once: check that every cocktail has its
own price under it and that no list is cut in half.

## Optional tweaks

At the top of `menu.html`:

- `--bg`: the background color. It is picked automatically from the edge of
  your PDF, so you usually don't need to change it.
- `--accent`: the color of the selected language in the TR / EN switch.
- `--ink`: the text color of the switch.

At the top of `app.js`:

- `MAX_PAGE_WIDTH`: how wide whole pages get on computers (default `960` px).
- `MIN_PAGE_SCALE`: when to switch to the phone column. Whole pages are shown
  only if they get at least this big compared to the PDF's own size (default
  `0.6`, which is below about 720 px of screen width for these menus).
- `COLUMN_SIDES`: the empty space at the left and right of the phone column
  (default `16` px).
- `MAX_COLUMN_SCALE`: how big the phone column may get on wider screens
  (default `1`, the PDF's own size).
- `SIDE_PADDING`: on whole pages, how much border is kept at each side after the
  empty sides of the PDF are trimmed off (default `0.04`, which is 4% of the
  menu's width).

At the top of `layout.js` are the settings for finding the parts of a page
(how big an empty gap must be to separate two parts, and so on). You shouldn't
need to change them.

## Files

- `index.html`: the landing page (shown at `/`), including the five signature
  cocktails with their prices
- `site.css`: the look of the landing page
- `site.js`: the landing page's behavior, its English texts, the WhatsApp number,
  and the open nights and door time
- `menu.html`: the menu viewer page (shown at `/menu`)
- `app.js`: draws the PDF and switches language on the menu
- `layout.js`: finds the parts of each page for the phone column
- `menu-tr.pdf`, `menu-en.pdf`: the menus
- `public/images/`: the photos and logo used on the landing page
- `vendor/fonts/`: the fonts (Cormorant Garamond and Lato), stored locally, with their licences
- `qr/`: print-ready QR codes (SVG for print shops, 2000 px PNG). `menu-qr` opens
  the menu (<https://legyistanbul.com/menu>), `menu-qr-en` opens the English menu
  directly (<https://legyistanbul.com/menu?lang=en>). Older printed codes open the
  landing page instead: see [Replace the table QR codes](#replace-the-table-qr-codes).
- `_headers`: tells search engines not to list the preview address
  (<https://preview.legyistanbul.com>). It doesn't change the live site.
- `vendor/pdfjs/`: [PDF.js](https://mozilla.github.io/pdf.js/) 6.5.438 (Mozilla's PDF renderer), stored locally so the site doesn't depend on any other server
- `.wrangler/`: created by the deploy command to remember the Cloudflare project. It is not uploaded and is safe to delete.
