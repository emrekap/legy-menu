# Legy — menu

A tiny static site that shows the menu PDF as a normal web page, with no PDF
toolbar and no page numbers. A **TR / EN** switch at the top right changes
between the Turkish and the English menu. It is the same site as the With menu,
with one addition for phones (see below). When a guest zooms in, the part on
screen is redrawn so the text stays sharp.

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

- Guests see the Turkish menu first.
- If a guest switches language, their phone remembers it for the next visit.
- A link can open a language directly: add `?lang=en` (or `?lang=tr`) to the
  address, for example for a separate English QR code.
- To change the default or add a language, edit `MENUS` and `DEFAULT_LANGUAGE`
  at the top of `app.js`, and add a button with the same `data-lang` in `index.html`.

## Preview locally

```bash
npx serve .
# or: python3 -m http.server 8000
```

Then open the address it prints. (Opening `index.html` by double-clicking won't
work, because browsers block PDF loading from `file://`.) To see the phone
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
as it is, from your computer.

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

From this folder, run:

```bash
npx wrangler pages deploy . --project-name=legy-menu --branch=main
```

`--branch=main` is what makes it the live version. When the command finishes,
the new version is live at <https://legyistanbul.com>. Open it on a phone and
check both languages.

Use exactly this command (`wrangler pages deploy`). Newer versions of wrangler
suggest moving the site to Cloudflare Workers with `wrangler deploy`; that would
make a separate site that the domain doesn't point to.

### Try a version before it goes live

```bash
npx wrangler pages deploy . --project-name=legy-menu --branch=preview
```

This uploads to <https://preview.legy-menu.pages.dev> and leaves the live site
alone. When it looks right, run the production command above.

### Go back to an older version

In the [Cloudflare dashboard](https://dash.cloudflare.com/), go to
**Workers & Pages → legy-menu → Deployments**, open the **⋯** menu next to an
older production deployment and choose **Rollback to this deployment**.

### What gets uploaded

Everything in this folder is uploaded, and anyone can open it by its address,
this README included. Don't keep drafts or private files here.

## Update the menu

Replace `menu-tr.pdf` and/or `menu-en.pdf` (keep the exact names), then
[deploy to production](#deploy-a-new-version-to-production). Guests get the new
version right away. Each PDF must be smaller than 25 MB, Cloudflare's limit for
one file.

If the new PDF only changes names or prices, the phone column looks the same as
before. If the designer changed the layout, open the menu on a phone (or the
preview deploy) and scroll through it once: check that every cocktail has its
own price under it and that no list is cut in half.

## Optional tweaks

At the top of `index.html`:

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

- `index.html`: the page
- `app.js`: draws the PDF and switches language
- `layout.js`: finds the parts of each page for the phone column
- `menu-tr.pdf`, `menu-en.pdf`: the menus
- `qr/`: print-ready QR codes (SVG for print shops, 2000 px PNG). `menu-qr` opens
  <https://legyistanbul.com>, `menu-qr-en` opens the English menu directly.
- `vendor/pdfjs/`: [PDF.js](https://mozilla.github.io/pdf.js/) 6.5.438 (Mozilla's PDF renderer), stored locally so the site doesn't depend on any other server
- `.wrangler/`: created by the deploy command to remember the Cloudflare project. It is not uploaded and is safe to delete.
