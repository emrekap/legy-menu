// The signature cocktails on the landing page, edited at /admin
// ("Kokteyller"). Stored as one JSON value under the key "cocktails":
// { items: [{ name, ingredients: { tr: [...], en: [...] }, price }], updatedAt }

import { tidy } from "./common.js";

export const COCKTAILS_KEY = "cocktails";
const MAX_COCKTAILS = 12;
const MAX_INGREDIENTS = 12;

// Shown until the manager saves the first time. Keep in step with the
// Cocktails section of index.html and the "ing." lines in site.js, which the
// page falls back to if the saved cocktails can't be read.
export const DEFAULT_COCKTAILS = [
  {
    name: "VERDE",
    ingredients: {
      tr: ["Beefeater", "ev yapımı mürver çiçeği likörü", "kuzukulağı", "yeşil elma", "citrus"],
      en: ["Beefeater", "homemade elderflower liqueur", "sorrel", "green apple", "citrus"],
    },
    price: 1300,
  },
  {
    name: "RITMO",
    ingredients: {
      tr: ["Código", "Ojo de Tigre", "Aperol", "passion fruit", "ananas", "lime", "chili"],
      en: ["Código", "Ojo de Tigre", "Aperol", "passion fruit", "pineapple", "lime", "chili"],
    },
    price: 1300,
  },
  {
    name: "MORA",
    ingredients: {
      tr: ["Absolut", "böğürtlen, frambuaz & yaban mersini likörü", "bergamot", "lime"],
      en: ["Absolut", "blackberry, raspberry & blueberry liqueur", "bergamot", "lime"],
    },
    price: 1300,
  },
  {
    name: "FAKE PALOMA",
    ingredients: {
      tr: ["Código", "Ojo de Tigre", "Campari", "greyfurt", "soda"],
      en: ["Código", "Ojo de Tigre", "Campari", "grapefruit", "soda"],
    },
    price: 1300,
  },
  {
    name: "BITE",
    ingredients: {
      tr: ["Chivas Extra Smooth & Smokey", "Lapsang Souchong", "armut & zencefil cordial", "limon"],
      en: ["Chivas Extra Smooth & Smokey", "Lapsang Souchong", "pear & ginger cordial", "lemon"],
    },
    price: 1300,
  },
];

export async function readCocktails(kv) {
  const saved = kv ? await kv.get(COCKTAILS_KEY, { type: "json" }) : null;
  return saved || { items: DEFAULT_COCKTAILS, updatedAt: null };
}

// Checks and tidies the cocktails sent from /admin. Messages are for the manager.
export function cleanCocktails(input) {
  if (!Array.isArray(input)) return { error: "Geçersiz veri." };
  if (!input.length) return { error: "En az bir kokteyl olmalı." };
  if (input.length > MAX_COCKTAILS) return { error: `En fazla ${MAX_COCKTAILS} kokteyl eklenebilir.` };
  const items = [];
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i] && typeof input[i] === "object" ? input[i] : {};
    const where = `${i + 1}. kokteyl`;
    const name = tidy(raw.name);
    const given = raw.ingredients && typeof raw.ingredients === "object" ? raw.ingredients : {};
    const tr = lines(given.tr);
    const en = lines(given.en);
    const price = raw.price === "" || raw.price == null ? null : Number(raw.price);

    if (!name) return { error: `${where}: isim boş.` };
    if (name.length > 40) return { error: `${where}: isim çok uzun.` };
    if (tr.length > MAX_INGREDIENTS || en.length > MAX_INGREDIENTS) {
      return { error: `${where}: en fazla ${MAX_INGREDIENTS} malzeme.` };
    }
    if ([...tr, ...en].some((line) => line.length > 80)) return { error: `${where}: bir malzeme çok uzun.` };
    if (price !== null && !(Number.isInteger(price) && price >= 0 && price <= 1_000_000)) {
      return { error: `${where}: fiyat geçersiz. Sadece rakam yazın, örneğin 1300.` };
    }
    items.push({ name, ingredients: { tr, en }, price });
  }
  return { items };
}

function lines(value) {
  return (Array.isArray(value) ? value : []).map(tidy).filter(Boolean);
}

// 1300 is "1.300 ₺", the way prices are written on the menu.
export function formatPrice(price) {
  return price == null ? "" : `${new Intl.NumberFormat("tr-TR").format(price)} ₺`;
}
