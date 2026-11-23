// /api/cocktails: the signature cocktails on the landing page, edited at
// /admin ("Kokteyller").
//   GET  Anyone. { items: [{ name, ingredients: { tr: [...], en: [...] }, price }], updatedAt }
//        Until the first save, the defaults in _lib/cocktails.js.
//   PUT  Admin only. Body { items: [...] } replaces the list.
// The landing page shows them through functions/index.js.

import { checkPassword, checkPasswordIfGiven, json, missingStore, readJson, store } from "../_lib/common.js";
import { COCKTAILS_KEY, cleanCocktails, readCocktails } from "../_lib/cocktails.js";

export async function onRequestGet({ request, env }) {
  const auth = await checkPasswordIfGiven(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  return json(await readCocktails(store(env)));
}

export async function onRequestPut({ request, env }) {
  const auth = await checkPassword(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  const { body, error } = await readJson(request, 30_000);
  if (error) return error;
  const result = cleanCocktails(body && body.items);
  if (result.error) return json({ error: result.error }, 400);
  const saved = { items: result.items, updatedAt: new Date().toISOString() };
  await store(env).put(COCKTAILS_KEY, JSON.stringify(saved));
  return json(saved);
}
