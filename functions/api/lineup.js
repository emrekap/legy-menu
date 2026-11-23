// /api/lineup: the DJ lineup on the landing page, edited at /admin.
//
//   GET  /api/lineup   Anyone. Returns the nights from tonight on:
//                      { nights: [{ date, dj, genres, start, end }], hidden, updatedAt }
//                      hidden: the Nights section is turned off on the site.
//                      With the admin password (see below) it also checks it,
//                      so /admin uses it to log in: a wrong password gets 401.
//   PUT  /api/lineup   Admin only. Body { nights: [...], hidden } replaces the lineup.
//
// Stored as described in _lib/lineup.js, in the store from _lib/common.js,
// which also checks the admin password.

import { TIME, checkPassword, checkPasswordIfGiven, json, missingStore, readJson, store } from "../_lib/common.js";
import { LINEUP_KEY, readLineup } from "../_lib/lineup.js";
const MAX_NIGHTS = 100;
const MAX_BODY_BYTES = 50_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function onRequestGet({ request, env }) {
  const auth = await checkPasswordIfGiven(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  const saved = await readLineup(store(env));
  const tonight = istanbulNightDate();
  const nights = (Array.isArray(saved.nights) ? saved.nights : []).filter((n) => n.date >= tonight);
  return json({ nights, hidden: saved.hidden === true, updatedAt: saved.updatedAt || null });
}

export async function onRequestPut({ request, env }) {
  const auth = await checkPassword(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  const { body, error } = await readJson(request, MAX_BODY_BYTES);
  if (error) return error;

  const result = cleanNights(body && body.nights);
  if (result.error) return json({ error: result.error }, 400);

  // Past nights are dropped on every save, so the list never grows old.
  const tonight = istanbulNightDate();
  const saved = {
    nights: result.nights.filter((n) => n.date >= tonight),
    hidden: body.hidden === true,
    updatedAt: new Date().toISOString(),
  };
  await store(env).put(LINEUP_KEY, JSON.stringify(saved));
  return json(saved);
}

// Checks and tidies the nights sent from /admin. Messages are for the manager.
function cleanNights(input) {
  if (!Array.isArray(input)) return { error: "Geçersiz veri." };
  if (input.length > MAX_NIGHTS) return { error: `En fazla ${MAX_NIGHTS} gece eklenebilir.` };
  const nights = [];
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i] || {};
    const where = `${i + 1}. gece`;
    const date = String(raw.date || "");
    const dj = String(raw.dj || "").trim().replace(/\s+/g, " ");
    const start = String(raw.start || "");
    const end = String(raw.end || "");
    const genres = (Array.isArray(raw.genres) ? raw.genres : [])
      .map((g) => String(g).trim().replace(/\s+/g, " "))
      .filter(Boolean);

    if (!isRealDate(date)) return { error: `${where}: tarih geçersiz.` };
    if (!dj) return { error: `${where}: DJ adı boş.` };
    if (dj.length > 80) return { error: `${where}: DJ adı çok uzun.` };
    if (genres.length > 6) return { error: `${where}: en fazla 6 müzik türü.` };
    if (genres.some((g) => g.length > 30)) return { error: `${where}: müzik türü çok uzun.` };
    if (!TIME.test(start)) return { error: `${where}: başlangıç saati geçersiz.` };
    if (end && !TIME.test(end)) return { error: `${where}: bitiş saati geçersiz.` };
    nights.push({ date, dj, genres, start, end });
  }
  // By date, and by start time on the same date (evening before after-midnight).
  const order = (n) => `${n.date} ${n.start < "12:00" ? "1" : "0"}${n.start}`;
  nights.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
  return { nights };
}

function isRealDate(date) {
  if (!DATE.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

// The date of the night that is on in Istanbul, as "YYYY-MM-DD". Until 04:00
// the night before is still going, the same rule as the landing page.
function istanbulNightDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() - 4 * 60 * 60 * 1000));
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
