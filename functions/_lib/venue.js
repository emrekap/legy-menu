// The venue details the manager edits at /admin ("Bilgiler"): WhatsApp
// number, address, map link and embedded map, open nights and hours, and the
// door policy.
// Stored as one JSON value under the key "venue".

import { TIME, tidy } from "./common.js";

export const VENUE_KEY = "venue";

// Shown until the manager saves the first time. Keep in step with the same
// text in index.html and site.js, which the page falls back to if the saved
// details can't be read.
export const DEFAULT_VENUE = {
  whatsapp: "+90 555 000 00 00",
  address: "Placeholder Sokak No: 12\nBeyoğlu, İstanbul",
  mapsUrl: "",
  mapEmbed: "", // the address of a Google Maps embed, see embedSource()
  openDays: [3, 4, 5, 6], // 0 = Sunday, 1 = Monday ... 6 = Saturday
  opens: "21:00",
  closes: "04:00",
  door: {
    tr: "21 yaş üstü · Smart casual giyim.",
    en: "21+ · Smart casual dress.",
  },
};

export async function readVenue(kv) {
  const saved = kv ? await kv.get(VENUE_KEY, { type: "json" }) : null;
  return saved || { ...DEFAULT_VENUE, updatedAt: null };
}

// Checks and tidies the details sent from /admin. Messages are for the manager.
export function cleanVenue(input) {
  const raw = input && typeof input === "object" ? input : {};
  const whatsapp = tidy(raw.whatsapp);
  const digits = whatsappDigits(whatsapp);
  const address = String(raw.address == null ? "" : raw.address)
    .split("\n")
    .map(tidy)
    .filter(Boolean)
    .join("\n");
  const mapsUrl = tidy(raw.mapsUrl);
  const mapEmbed = embedSource(raw.mapEmbed);
  const openDays = [...new Set(Array.isArray(raw.openDays) ? raw.openDays : [])]
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  const opens = String(raw.opens || "");
  const closes = String(raw.closes || "");
  const door = raw.door && typeof raw.door === "object" ? raw.door : {};
  const doorTr = tidy(door.tr);
  const doorEn = tidy(door.en);

  if (!/^[\d\s+()-]+$/.test(whatsapp) || digits.length < 10 || digits.length > 15) {
    return { error: "WhatsApp numarası geçersiz. Ülke koduyla yazın, örneğin +90 532 123 45 67." };
  }
  if (!address) return { error: "Adres boş." };
  if (address.length > 200 || address.split("\n").length > 4) return { error: "Adres çok uzun." };
  if (mapsUrl && !isHttpsUrl(mapsUrl)) return { error: "Harita linki geçersiz. https:// ile başlayan linki yapıştırın." };
  if (mapEmbed === null) {
    return {
      error:
        "Harita kodu tanınmadı. Google Haritalar'da Paylaş → Harita yerleştir → HTML'yi kopyala ile alınan kodu yapıştırın.",
    };
  }
  if (!openDays.length) return { error: "En az bir açık gece seçin." };
  if (!TIME.test(opens)) return { error: "Açılış saati geçersiz." };
  if (!TIME.test(closes)) return { error: "Kapanış saati geçersiz." };
  if (!doorTr) return { error: "Kapı politikası (Türkçe) boş." };
  if (doorTr.length > 200 || doorEn.length > 200) return { error: "Kapı politikası çok uzun." };

  return {
    venue: { whatsapp, address, mapsUrl, mapEmbed, openDays, opens, closes, door: { tr: doorTr, en: doorEn } },
  };
}

function isHttpsUrl(text) {
  if (text.length > 500) return false;
  try {
    return new URL(text).protocol === "https:";
  } catch {
    return false;
  }
}

// The manager pastes Google Maps' embed code (Share → Embed a map → Copy
// HTML): <iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>.
// Only the map's address is kept, and only if it is a Google Maps embed; the
// site builds its own <iframe> around it, so no pasted code ever runs.
// A bare https://www.google.com/maps/embed?... address works too.
// Returns "" for nothing pasted, null for something that isn't a map.
function embedSource(input) {
  const text = String(input == null ? "" : input).trim();
  if (!text) return "";
  const quoted = text.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  const address = (quoted ? quoted[1] : text).replace(/&amp;/g, "&").trim();
  if (address.length > 2000) return null;
  try {
    const url = new URL(address);
    const google = url.hostname === "www.google.com" || url.hostname === "google.com" || url.hostname === "maps.google.com";
    return url.protocol === "https:" && google && url.pathname.startsWith("/maps/embed") ? url.href : null;
  } catch {
    return null;
  }
}

export function whatsappDigits(number) {
  return String(number).replace(/\D/g, "");
}

// The map box links here: the manager's own link, or else a Google Maps
// search for the address.
export function mapsLink(venue) {
  if (venue.mapsUrl) return venue.mapsUrl;
  const query = venue.address.replace(/\n/g, ", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const DAY_NAMES = {
  tr: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};
const EVERY_DAY = { tr: "Her gün", en: "Every day" };
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first

// The open nights in words: [3, 4, 5, 6] is "Çarşamba – Cumartesi",
// [1, 5, 6] is "Pazartesi, Cuma – Cumartesi", and nights that run over the
// weekend stay together: [5, 6, 0, 1] is "Cuma – Pazartesi".
export function dayList(openDays, lang) {
  const names = DAY_NAMES[lang];
  const open = new Set(openDays);
  if (open.size === 7) return EVERY_DAY[lang];
  // Start at the first open night that follows a closed one.
  const startAt = WEEK.findIndex((d) => open.has(d) && !open.has((d + 6) % 7));
  if (startAt < 0) return "";
  const runs = [];
  let run = [];
  for (let i = 0; i < 7; i += 1) {
    const day = WEEK[(startAt + i) % 7];
    if (open.has(day)) {
      run.push(day);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs
    .map((r) => (r.length === 1 ? names[r[0]] : `${names[r[0]]} – ${names[r[r.length - 1]]}`))
    .join(", ");
}
