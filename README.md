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

The venue details, the signature cocktails, the DJ lineup and the menus are
not in the code: they are filled in at `/admin`, see
[What the venue manager edits](#what-the-venue-manager-edits). Until someone
saves there, the site shows made-up details: a fake WhatsApp number
(`+90 555 000 00 00`), "Placeholder Sokak No: 12" as the address, Wednesday to
Saturday from 21:00. So before launch, open <https://legyistanbul.com/admin>
(after the one-time setup in that section) and fill in:

- **Bilgiler**: the WhatsApp number, the address, the map link, the open nights
  and hours, and the door policy in Turkish and English.
- **Kokteyller**: the five cocktails are already there; check their
  ingredients and prices against the menu.
- **Program**: the first week's DJs.

### Turkish and English texts

The Turkish texts are in `index.html`. Their English versions are in the `EN`
list near the top of `site.js`. One rule tells you which texts have one:

- If the tag around the text has `data-i18n="some.name"`, the English version
  is the line `"some.name": …` in the `EN` list in `site.js`. Change both, or
  English guests keep seeing the old text.
- Text without `data-i18n` shows the same in both languages. Change it once.

For example, the text above the WhatsApp button near the bottom is
`<p class="reserve-body" data-i18n="reserve.body">Masa rezervasyonu, …</p>`,
and its English is the line `"reserve.body": "Message us on WhatsApp …",` in
`site.js`. Change both.

What the manager edits at `/admin` is the exception: the door policy and the
cocktail ingredients have a Turkish and an English box there, the open nights
and the lineup dates are translated automatically, and names (DJs, cocktails)
and music styles show as typed in both languages.

### Replace the table QR codes

QR codes printed before the landing page open `legyistanbul.com`, which now
shows the landing page, not the menu. Guests reach the menu with one tap on
"Menü" at the top, but please replace those codes with the new ones in `qr/`
(`menu-qr` opens the menu), ideally before the first deploy or right after it.
The old English code (`?lang=en`) still opens the English menu directly; the
new `menu-qr-en` does the same.

## What the venue manager edits

Everything guests rely on is edited at <https://legyistanbul.com/admin>, from a
phone, with no code changes and no deploy. The site shows each change within
about a minute. The page has four tabs:

- **Program**: the DJ lineup in the Nights section, and whether the section
  shows at all.
- **Bilgiler**: the WhatsApp number, address, map link and map, opening nights
  and hours, and door policy.
- **Kokteyller**: the signature cocktails with their ingredients and prices.
- **Menü**: the Turkish and English menu PDFs.

### For the venue manager

1. Open <https://legyistanbul.com/admin> on your phone and enter the password.
   The phone remembers it. Tip: add the page to your home screen (Safari: Share
   → Add to Home Screen).
2. Pick a tab, change what you need, then press **Kaydet** at the bottom.
   Nothing changes on the site until you do. "Kaydedildi" means it is saved. A
   gold dot on a tab means it has changes that aren't saved yet.
3. On **Menü** there is no Kaydet: a new PDF goes up as soon as you pick it.

**Program.** Each night has a **date**, the **DJ** name, the **music styles**
(separated by commas, for example `House, Disco`) and the **start** and **end**
time. The end time can be left empty. **+ Gece ekle** adds a night: it starts
as the day after the last one, with the same times. **Bu geceyi sil** removes
one.

- **Programı sitede göster** turns the whole Nights section on or off, together
  with the "Geceler" link in the top menu (press Kaydet after). The nights
  stay saved while it is off.
- You can add nights weeks ahead. The site only shows the next 7 days, and the
  page tells you which nights guests can't see yet.
- Past nights disappear by themselves. A night lasts until 04:00, so at 01:30
  Saturday night's card is still up.
- Write DJ names and music styles the way they should look. They are shown the
  same in Turkish and English (the dates are translated automatically). For
  English guests, `Electronic` reads better than `Elektronik`.
- With no nights in the next 7 days, the site says "Program yakında
  açıklanacak." ("The lineup is coming soon.").

**Bilgiler.**

- **WhatsApp numarası**: every reservation button and the phone number in the
  Konum (Location) section use it. Write it with the country code, for example
  `+90 532 123 45 67`.
- **Adres**: shown in the Konum section as typed, line breaks included.
- **Harita linki**: what the "Yol tarifi al" (directions) button opens. In
  Google Maps, open the venue, tap Share and copy the link. Left empty, the
  button searches Google Maps for the address.
- **Harita yerleştirme kodu**: shows a live Google map in the box next to the
  address, with the "Yol tarifi al" button on it. On a computer, open the venue
  in Google Maps → Share → Embed a map → Copy HTML, and paste it here. Only the
  map's address is kept (the box then shows that address, not the code), and
  only a Google Maps embed is accepted. Left empty, the box is just the
  directions button. The map loads from Google only when a guest scrolls near
  it.
- **Açık geceler**, **Kapılar açılır**, **Kapanış**: the hours in the Konum
  section ("Çarşamba – Cumartesi", "21:00 – 04:00", translated automatically),
  and the line under the big headline on the first screen. On an open night
  that line says "Bu gece · Kapılar 21:00" ("Tonight · Doors 21:00") with a
  small yellow light; on a closed night it names the next open night, for
  example "Çarşamba · Kapılar 21:00". It goes by Istanbul time, and a night
  lasts until 04:00.
- **Kapı politikası**: in Turkish and English. If the English box is empty,
  English guests see the Turkish text.

**Kokteyller.** The "İmza kokteyller" section of the landing page. Each
cocktail has a name, its ingredients in Turkish and in English (one per line;
the site puts "·" between them) and a price (digits only: `1300` shows as
"1.300 ₺"; empty shows no price). **Yukarı taşı** moves a cocktail up. These
are not read from the menu PDF, so when the menu's prices change, change them
here too, or guests see two prices for the same drink.

**Menü.** **Yeni PDF yükle** replaces the Turkish or the English menu. Guests
see the new one within a minute, and the QR codes keep working. **Menüyü aç**
shows it the way guests see it. The menu it replaced is kept: **Önceki menüye
dön** brings it back (pressing it again swaps back). A PDF can be at most 25 MB,
and it should be designed like the current menus (see
[Add the menus](#add-the-menus)), or phones show its pages small.

### How it works

- `admin.html` and `admin.js` are the editing page. It isn't linked from the
  site, and search engines are told not to list it.
- The `functions` folder runs on Cloudflare (Pages Functions):
  - `api/lineup.js`, `api/venue.js`, `api/cocktails.js` and `api/menu/` give
    the saved data to `/admin` and save the manager's changes after checking
    the password.
  - `index.js` sends the landing page with the saved venue details and
    cocktails already filled in (and without the Nights section when it is
    turned off), so guests never see old text first and the page works
    without JavaScript. It fills in the tags marked
    `data-venue="…"` and `data-cocktails` in `index.html`, and gives `site.js`
    the rest (the WhatsApp number, the open nights and the English texts) in a
    `<script id="site-data">` tag.
  - `menu-tr.pdf.js` and `menu-en.pdf.js` send the uploaded menu, or the PDF in
    this folder if none was uploaded.
  - `_lib/` is code the others share. It gets no web address of its own.
- Everything is stored in one Cloudflare **KV** store (a small key-value
  store), connected as `LINEUP` (it was named when it held only the lineup):
  the entries `lineup`, `venue`, `cocktails`, and `menu:tr` and `menu:en`, each
  with a `:previous` for undo.
- Until the manager first saves a tab, the site uses the starting values in
  `functions/_lib/venue.js` and `functions/_lib/cocktails.js`. The same text is
  also typed into `index.html` (and its English into `site.js`). Guests see
  that copy only if Cloudflare can't read the store.
- `site.js` loads the lineup when the page opens and draws the cards. If it
  can't load, the "coming soon" line shows and the rest of the page works as
  usual. How many days ahead it shows is `LINEUP_DAYS` at the top of `site.js`
  (keep `SITE_DAYS` in `admin.js` the same).
- Cloudflare's free plan allows 100,000 function requests a day. Each landing
  page visit uses two (the page and the lineup), each menu visit one (the PDF).

### One-time setup in Cloudflare

Do this once, before the first deploy that includes `/admin`. After it, the
site still deploys with the same commands as before.

1. **Create two KV stores**, one for the live site and one for the preview, so
   trying things on the preview never changes the live site:

   ```bash
   npx wrangler kv namespace create legy-lineup
   npx wrangler kv namespace create legy-lineup-preview
   ```

2. **Connect them to the site.** In the
   [Cloudflare dashboard](https://dash.cloudflare.com/), go to
   **Workers & Pages → legy-menu → Settings → Bindings → Add → KV namespace**.
   Variable name `LINEUP`, namespace `legy-lineup`, for **Production**. Do the
   same for **Preview** with `legy-lineup-preview`.

3. **Set the manager's password.** Pick a long one that's easy to type on a
   phone, for example four random words. For the live site:

   ```bash
   npx wrangler pages secret put ADMIN_PASSWORD --project-name=legy-menu
   ```

   It asks for the password and stores it encrypted. For the preview, add it in
   the dashboard: **Settings → Variables and Secrets → Add**, type **Secret**,
   name `ADMIN_PASSWORD`, environment **Preview**.

4. **Deploy** (preview first, then production). Bindings and passwords only
   take effect from the next deploy.

To **change the password**, run step 3 again and deploy. The manager then logs
in again with the new one. Until a password is set, nobody can save.

## Add the menus

The two PDFs in this folder are the menus the site starts with:

- **`menu-tr.pdf`**: the Turkish menu
- **`menu-en.pdf`**: the English menu

After that, the venue manager uploads new ones at `/admin` (see
[What the venue manager edits](#what-the-venue-manager-edits)).

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

These simple servers don't run the functions, so the Nights section says
"coming soon" and the venue details and cocktails are the ones typed into
`index.html`. To try everything, `/admin` included, use Cloudflare's own local
server. It keeps its own data on your computer (in `.wrangler/`), separate from
the live site:

```bash
npx wrangler pages dev . --kv LINEUP --binding ADMIN_PASSWORD=local-test
```

Open the address it prints (usually <http://localhost:8788>), and
<http://localhost:8788/admin> with the password `local-test`.

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

Once, in the [Cloudflare dashboard](https://dash.cloudflare.com/): open the
`legyistanbul.com` domain, go to **Caching → Configuration → Browser Cache TTL**
and choose **Respect Existing Headers**. Cloudflare's default (4 hours) lets
browsers keep the scripts and styles for 4 hours after a deploy, so for a while
they run the old ones with the new pages; once it caused `/admin` to save
without the map code. It can't be fixed from `_headers`: this setting overrides
it.

### Deploy a new version to production

First read [What gets uploaded](#what-gets-uploaded). Then, from this folder,
run:

```bash
rm -rf /tmp/legy-site && rsync -a --exclude='.*' --exclude=functions ./ /tmp/legy-site/ &&
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
rm -rf /tmp/legy-site && rsync -a --exclude='.*' --exclude=functions ./ /tmp/legy-site/ &&
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

The `functions` folder is left out of the copy too. Wrangler still finds it,
because the command runs from this folder, and turns it into the functions
(see [How it works](#how-it-works)). Leaving it out only stops their code from
also being uploaded as files anyone could open.

**Don't deploy with `npx wrangler pages deploy .`** (with a dot, the older
command). It uploads the hidden folders too, including the design drafts and
notes in `.superdesign/`: an early draft with a Kitchen section and the names of
real DJs. Folders whose names start with a dot are hidden in Finder: press
**Cmd + Shift + .** to show them.

## Update the menu

The venue manager uploads new menus at `/admin`, in the **Menü** tab (see
[What the venue manager edits](#what-the-venue-manager-edits)). No deploy is
needed. Remind them to update the prices in the **Kokteyller** tab too.

Replacing `menu-tr.pdf` or `menu-en.pdf` in this folder and deploying changes
the menu only for a language with no upload: an uploaded menu always wins. To
show the folder's PDF again after uploads, delete the `menu:tr` (or `menu:en`)
entry in the Cloudflare dashboard: **Storage & Databases → KV → legy-lineup**.

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

- `index.html`: the landing page (shown at `/`). The venue details and the
  cocktails in it are filled in by `functions/index.js`
- `site.css`: the look of the landing page
- `site.js`: the landing page's behavior, its English texts, and drawing the
  DJ lineup
- `admin.html`, `admin.js`: the page where the venue manager edits the lineup,
  the venue details, the cocktails and the menus (shown at `/admin`)
- `functions/`: runs on Cloudflare; fills in the landing page, sends the
  menus, and saves what the manager edits (see [How it works](#how-it-works))
- `menu.html`: the menu viewer page (shown at `/menu`)
- `app.js`: draws the PDF and switches language on the menu
- `layout.js`: finds the parts of each page for the phone column
- `menu-tr.pdf`, `menu-en.pdf`: the menus the site starts with (until the
  manager uploads new ones)
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
