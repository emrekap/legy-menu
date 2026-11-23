# Légy İstanbul — Design System

## Product context
Légy İstanbul is a nightclub and cocktail bar in Istanbul: live DJs, signature cocktails. Tagline (from the printed menu): **"The art of a good night."**
The marketing site lives at legyistanbul.com. The existing menu viewer (TR/EN PDF menus) moves to `/menu` and is linked from the site.

Audience: locals 22–40, tourists and expats. Most arrive on a phone from Instagram (@legyistanbul).

Jobs to be done:
1. Feel the vibe in seconds (real photos, red light, the neon smiley).
2. See who is playing this week (DJ nights).
3. Check drinks and prices (link to the menu).
4. Reserve a table on WhatsApp.
5. Find the address, opening hours and door policy.

Primary CTA: **"Reserve on WhatsApp"** (opens a WhatsApp chat). Secondary CTA: **"See the menu"** (links to `/menu`).
Languages: TR / EN pill switch in the nav (designs show English with EN selected).

## Page architecture (one long landing page)
1. **Nav** (sticky): logo image left · links Nights, Cocktails, Gallery, Visit · right: TR/EN pill + "Reserve" pill button. Transparent over the hero, blurred near-black after scroll, gold hairline bottom. Mobile: logo, Reserve, burger.
2. **Hero**: full-height, near-black with a deep red glow. Logo, "The art of a good night" in tracked micro caps, a big serif line, both CTAs, real photos (DJ crowd, neon smiley). "Tonight" status line with a neon-yellow dot.
3. **Marquee strip**: slow scrolling tracked caps — "LIVE DJS · SIGNATURE COCKTAILS · LATE NIGHTS · THE ART OF A GOOD NIGHT ·".
4. **Intro**: two or three short lines about Légy plus a photo.
5. **Nights**: weekly DJ schedule (Thu, Fri, Sat; placeholder DJ names and genres; times "23:00 – 04:00").
6. **Cocktails**: the five real signature cocktails with ingredients and prices (below), CTA "See the full menu".
7. **Gallery**: grid of the real photos + "Follow @legyistanbul" link.
8. **Reserve band**: Legy-red full-bleed band, WhatsApp CTA, short note on tables and bottle service.
9. **Visit**: address (placeholder), opening hours, door policy (21+, smart casual), map placeholder, phone.
10. **Footer**: logo, "LEGY · İSTANBUL" tracked caps, Instagram, menu link, © line.

## Real content
Signature cocktails (all 1.300 ₺):
- **VERDE** — Beefeater · homemade elderflower liqueur · sorrel · green apple · citrus
- **RITMO** — Código · Ojo de Tigre · Aperol · passion fruit · pineapple · lime · chili
- **MORA** — Absolut · blackberry, raspberry & blueberry liqueur · bergamot · lime
- **FAKE PALOMA** — Código · Ojo de Tigre · Campari · grapefruit · soda
- **BITE** — Chivas Extra Smooth & Smokey · Lapsang Souchong · pear & ginger cordial · lemon

Classics: Whiskey Sour, Negroni, Margarita, Long Island, Espresso Martini, Cosmopolitan. Alcohol-free: Green Way, Tropical Breeze (1.000 ₺).
DJ names, address, phone and hours are not known yet: use clearly generic placeholders.
Price format: `1.300 ₺` (dot thousands separator, space, ₺).

## Colour
| Token | Value | Use |
| --- | --- | --- |
| `--night` | `#0e0a0a` | Page background (warm near-black) |
| `--night-2` | `#171010` | Raised sections |
| `--night-3` | `#221616` | Cards, hover surfaces |
| `--legy-red` | `#a51e22` | Brand red: primary buttons, the reserve band, accents |
| `--legy-red-deep` | `#7a1418` | Pressed states, gradient ends |
| `--glow-red` | `#e0242b` | Light only: radial glows, button glow shadows. Never text. |
| `--gold` | `#d5ba8e` | Champagne: section labels, prices, hairlines, focus rings |
| `--cream` | `#f8f4e8` | Primary text |
| `--cream-muted` | `rgba(248,244,232,.64)` | Secondary text |
| `--line` | `rgba(213,186,142,.22)` | Gold hairlines and borders |
| `--neon` | `#ffc928` | Neon-smiley yellow. Very sparing (the "Tonight" live dot, one small highlight). Never large areas. |

No other hues: no purple, blue, pink or neon gradients.

## Typography
- **Display**: "Cormorant Garamond" 500/600 (Google Fonts). Section titles UPPERCASE, letter-spacing .04–.08em. Hero line 72–112px desktop, 44–56px mobile. Cormorant italic allowed for one emotive word per heading.
- **Body / UI**: "Lato" 400/700 (matches the menu). Body 17px / 1.6. Ingredients 15px muted, joined with " · ".
- **Micro labels**: Lato 700, 11–12px, UPPERCASE, letter-spacing .32em, gold (like "THE ART OF A GOOD NIGHT").
- **Script**: only the logo image. Never imitate the script with a font.

## Layout
- Container max 1240px; side gutters 20px mobile, 48px desktop. 12-column grid on desktop.
- Section padding 128px desktop / 80px mobile.
- Section headers copy the menu: gold micro label, then a serif uppercase title, then a thin gold hairline. Centered titles can sit between two hairlines ("—— SIGNATURE COCKTAILS ——").
- **Inset frame motif**: a 1px `--line` border inset 16–24px inside key panels and images, echoing the border on the menu pages.
- Radius: 0 on photos and panels (editorial). 999px on buttons, tags and the TR/EN switch.
- Photos: real photos, portrait 4:5 crops, a little warm grain, a soft dark vignette at the edges. They can overlap or stagger in collages.

## Components
- **Primary button**: pill, `--legy-red` background, cream text, Lato 700 13px uppercase .18em, padding 16px 28px, WhatsApp glyph on the left. Hover: `box-shadow: 0 0 36px rgba(224,36,43,.45)`, slight lift.
- **Secondary button**: pill, 1px `--gold` border, gold text, transparent. Hover: gold fill, `--night` text.
- **TR/EN switch**: pill container with a 1px `--line` border; selected option filled `--gold` with `--night` text, the other cream at 75% opacity. Lato 700 12px .06em.
- **Night card**: `--night-2` surface with the inset frame; day in gold micro caps; DJ name in large serif; genre tags as small outlined pills; time "23:00 – 04:00".
- **Cocktail item**: no box. Thin cream line-drawing of the glass (like the menu illustrations) or a photo, serif uppercase name, muted ingredients, gold price.
- **Live indicator**: 8px `--neon` dot with a soft glow + "TONIGHT" micro caps.
- **Hairline list rows** (hours, classics): name left, value right, 1px `--line` divider, like the menu price lists.

## Motion
- Reveal on scroll: fade + 24px rise, 700ms `cubic-bezier(.2,.7,.2,1)`, 80ms stagger.
- Hero: slow red glow "breathing" (radial gradient opacity, 6s loop).
- Marquee: 40s linear loop, pauses on hover.
- Image hover: scale 1.03 over 800ms.
- Nav background fades in on scroll (300ms).
- All motion respects `prefers-reduced-motion`.

## Voice
Confident, warm, a bit playful (the neon smiley). Short lines. Examples: "The art of a good night." · "Doors at nine. Music till late." · "Your table is one message away."

## Assets (public URLs)
- Logo (cream, transparent): https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/8fac95a5-96a7-419a-942a-707bff59d262/brand-assets/brand-legy-logo-cream/legy-logo-cream.png
- Bar/DJ booth with Légy logo, chandelier, neon smiley: …/content-assets/photos-legy0/legy0.jpg
- Three cocktails on tray, rust-red curtain: …/content-assets/photos-legy1/legy1.jpg
- Red berry cocktail close-up with logo: …/content-assets/photos-legy2/legy2.jpg
- Crowd under the neon smiley, red light: …/content-assets/photos-legy3/legy3.jpg
- DJ at the decks, packed crowd: …/content-assets/photos-legy4/legy4.jpg
- Guest with two martinis: …/content-assets/photos-legy5/legy5.jpg

(Prefix for photos: https://vgbujcuwptvheqijyjbe.supabase.co/storage/v1/object/public/hmac-uploads/projects/8fac95a5-96a7-419a-942a-707bff59d262)
