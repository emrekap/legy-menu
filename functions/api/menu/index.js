// /api/menu: for /admin ("Menü"), what each language's menu is now and what
// undo would bring back. See _lib/menu.js.
//   GET  Anyone. { tr: { current, previous }, en: {...} }, each
//        { updatedAt, size, name }, or null for the PDF that came with the site.
// Uploading and undo are /api/menu/tr and /api/menu/en ([lang].js).

import { checkPasswordIfGiven, json, missingStore, store } from "../../_lib/common.js";
import { menuInfo } from "../../_lib/menu.js";

export async function onRequestGet({ request, env }) {
  const auth = await checkPasswordIfGiven(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  return json(await menuInfo(store(env)));
}
