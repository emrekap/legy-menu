# Routes

Static site on Cloudflare Pages (project `legy-menu`), live at https://legyistanbul.com. No router.

| Path | File | What it renders |
| --- | --- | --- |
| `/` | `index.html` | The menu PDF drawn as a web page. Turkish by default. |
| `/?lang=en` / `/?lang=tr` | `index.html` | Opens a language directly (used by the English QR code). |
| `/menu-tr.pdf`, `/menu-en.pdf` | PDFs | Raw menus (noscript fallback). |

Printed QR codes (`qr/`) point at `https://legyistanbul.com` and `https://legyistanbul.com/?lang=en`. Any new site at `/` must keep these links opening the menu.
