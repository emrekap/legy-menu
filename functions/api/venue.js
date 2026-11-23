// /api/venue: the venue details, edited at /admin ("Bilgiler").
//   GET  Anyone. { whatsapp, address, mapsUrl, openDays, opens, closes, door: { tr, en }, updatedAt }
//        Until the first save, the defaults in _lib/venue.js.
//   PUT  Admin only. Body { venue: {...} } replaces the details.
// The landing page shows them through functions/index.js.

import { checkPassword, checkPasswordIfGiven, json, missingStore, readJson, store } from "../_lib/common.js";
import { VENUE_KEY, cleanVenue, readVenue } from "../_lib/venue.js";

export async function onRequestGet({ request, env }) {
  const auth = await checkPasswordIfGiven(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  return json(await readVenue(store(env)));
}

export async function onRequestPut({ request, env }) {
  const auth = await checkPassword(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  const { body, error } = await readJson(request, 10_000);
  if (error) return error;
  const result = cleanVenue(body && body.venue);
  if (result.error) return json({ error: result.error }, 400);
  const saved = { ...result.venue, updatedAt: new Date().toISOString() };
  await store(env).put(VENUE_KEY, JSON.stringify(saved));
  return json(saved);
}
