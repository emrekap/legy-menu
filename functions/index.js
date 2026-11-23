// The landing page (/) with what the manager saved at /admin filled in: the
// venue details and the signature cocktails, and the Nights section left out
// when the manager turned it off. This happens before the page leaves
// Cloudflare, so guests never see old text first, and the page works without
// JavaScript too.
//
// The elements filled in are marked in index.html with data-venue="..." and
// data-cocktails. site.js gets the rest (the WhatsApp number, the open nights
// and the English texts) from a <script id="site-data"> added before it.
//
// If the saved details can't be read, the page goes out exactly as it is in
// index.html.
//
// The lineup's nights are not filled in here; site.js loads them from
// /api/lineup.

import { escapeHtml, noindexOnPreview, store } from "./_lib/common.js";
import { readCocktails, formatPrice } from "./_lib/cocktails.js";
import { readLineup } from "./_lib/lineup.js";
import { dayList, mapsLink, readVenue, whatsappDigits } from "./_lib/venue.js";

export async function onRequestGet({ request, env }) {
  // Ask for the whole page, never "not modified", so there is always a page
  // to fill in.
  const headers = new Headers(request.headers);
  headers.delete("If-None-Match");
  headers.delete("If-Modified-Since");
  const page = await env.ASSETS.fetch(new Request(request.url, { headers }));
  if (!page.ok || !(page.headers.get("Content-Type") || "").startsWith("text/html")) return page;

  let venue;
  let cocktails;
  let lineup;
  try {
    [venue, cocktails, lineup] = await Promise.all([
      readVenue(store(env)),
      readCocktails(store(env)),
      readLineup(store(env)),
    ]);
  } catch (error) {
    console.error("index: could not read the saved details; sending the page as it is", error);
    return page;
  }

  const out = new Headers(page.headers);
  // The page now changes without a deploy, so its old version tag is wrong.
  out.delete("ETag");
  out.delete("Last-Modified");
  out.set("Cache-Control", "no-cache");
  noindexOnPreview(request, out);

  return fill(venue, cocktails.items, lineup.hidden === true).transform(
    new Response(page.body, { status: page.status, statusText: page.statusText, headers: out }),
  );
}

const text = (content) => ({ element: (el) => el.setInnerContent(content) });
const html = (content) => ({ element: (el) => el.setInnerContent(content, { html: true }) });
const remove = { element: (el) => el.remove() };

function fill(venue, cocktails, hideNights) {
  const days = { tr: dayList(venue.openDays, "tr"), en: dayList(venue.openDays, "en") };
  const digits = whatsappDigits(venue.whatsapp);

  // site.js puts these in when a guest switches to English. They are written
  // into the page as HTML, so they are escaped here.
  const english = {
    "hero.tonight": escapeHtml(`${days.en} · Doors ${venue.opens}`),
    "visit.days": escapeHtml(days.en),
    "visit.doorText": escapeHtml(venue.door.en || venue.door.tr),
  };
  cocktails.forEach((cocktail, i) => {
    const { tr, en } = cocktail.ingredients;
    english[`cocktail.${i + 1}`] = escapeHtml((en.length ? en : tr).join(" · "));
  });
  const siteData = { whatsapp: digits, openDays: venue.openDays, doors: venue.opens, en: english };
  // "<" is escaped so no text can close the script tag early.
  const json = JSON.stringify(siteData).replace(/</g, "\\u003c");

  const rewriter = new HTMLRewriter();
  // The Nights section and its link in the top menu.
  if (hideNights) rewriter.on("#nights", remove).on("[data-nights-link]", remove);
  return rewriter
    .on('[data-venue="tonight"]', text(`${days.tr} · Kapılar ${venue.opens}`))
    .on('[data-venue="address"]', html(escapeHtml(venue.address).replace(/\n/g, "<br>")))
    .on('[data-venue="days"]', text(days.tr))
    .on('[data-venue="hours"]', text(`${venue.opens} – ${venue.closes}`))
    .on('[data-venue="door"]', text(venue.door.tr))
    .on('[data-venue="phone"]', html(`<a href="tel:+${digits}">${escapeHtml(venue.whatsapp)}</a>`))
    .on('[data-venue="map"]', html(mapBox(venue)))
    .on("a[data-whatsapp]", {
      // site.js adds the reservation message; this keeps the button working without it.
      element: (el) => el.setAttribute("href", `https://wa.me/${digits}`),
    })
    .on("[data-cocktails]", html(`${cocktails.map(cocktailItem).join("")}\n            `))
    .on('script[src="site.js"]', {
      element: (el) => el.before(`<script type="application/json" id="site-data">${json}</script>\n    `, { html: true }),
    });
}

// The map box: the embedded Google map if the manager pasted one, with a
// directions button on it; otherwise the whole box is the directions link.
// The map loads from Google only when a guest scrolls near it.
function mapBox(venue) {
  const link = escapeHtml(mapsLink(venue));
  const pin = `<svg class="icon" fill="none" stroke="currentColor" aria-hidden="true" focusable="false"><use href="#icon-pin"></use></svg>`;
  if (venue.mapEmbed) {
    return `<iframe class="map-embed" src="${escapeHtml(venue.mapEmbed)}" title="Légy İstanbul haritası" data-i18n-attr="title:visit.mapTitle" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
            <a class="btn btn-primary btn-sm map-directions" href="${link}" target="_blank" rel="noopener">
              ${pin}
              <span data-i18n="visit.directions">Yol tarifi al</span>
            </a>`;
  }
  return `<a class="map-placeholder map-link" href="${link}" target="_blank" rel="noopener">
              ${pin.replace('class="icon"', 'class="icon icon-xl"')}
              <span data-i18n="visit.directions">Yol tarifi al</span>
            </a>`;
}

// The same markup as the cocktails typed into index.html.
function cocktailItem(cocktail, i) {
  const delay = i ? ` style="--reveal-delay: ${Math.min(i, 4) * 80}ms"` : "";
  const { tr, en } = cocktail.ingredients;
  const ingredients = (tr.length ? tr : en).join(" · ");
  const price = formatPrice(cocktail.price);
  return `
              <li class="cocktail reveal"${delay}>
                <div class="cocktail-text">
                  <h3 class="cocktail-name" lang="${langOf(cocktail.name)}">${escapeHtml(cocktail.name)}</h3>${
                    ingredients
                      ? `
                  <p class="cocktail-ingredients" data-i18n="cocktail.${i + 1}">${escapeHtml(ingredients)}</p>`
                      : ""
                  }
                </div>${price ? `\n                <span class="cocktail-price">${price}</span>` : ""}
              </li>`;
}

// Names are shown in capitals, and in Turkish a capital "i" is "İ". Most
// cocktail names are not Turkish (VERDE, FAKE PALOMA), so they count as
// English unless they use letters only Turkish has. Same rule as the lineup.
function langOf(name) {
  return /[çğıöşüÇĞİÖŞÜ]/.test(name) ? "tr" : "en";
}
