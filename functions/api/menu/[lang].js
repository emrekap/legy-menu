// /api/menu/tr and /api/menu/en: change one language's menu. Admin only.
//   PUT   Body: the PDF file itself (at most 25 MB). It becomes the menu
//         guests see; the one before it is kept for undo. The original file
//         name may come URL-encoded in an "X-File-Name" header.
//   POST  Undo: the current and the previous menu swap places.
// Both reply { current, previous } like GET /api/menu. See _lib/menu.js.

import { checkPassword, json, missingStore, store, tidy } from "../../_lib/common.js";
import { MAX_MENU_BYTES, MENU_LANGS, isPdf, restoreMenu, uploadMenu } from "../../_lib/menu.js";

const TOO_BIG = "PDF çok büyük. En fazla 25 MB olabilir.";

export async function onRequestPut({ request, env, params }) {
  const auth = await checkPassword(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  if (!MENU_LANGS.includes(params.lang)) return json({ error: "Bilinmeyen dil." }, 404);

  if (Number(request.headers.get("Content-Length") || 0) > MAX_MENU_BYTES) return json({ error: TOO_BIG }, 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_MENU_BYTES) return json({ error: TOO_BIG }, 413);
  if (!isPdf(bytes)) return json({ error: "Bu dosya PDF değil." }, 400);

  let name = "";
  try {
    name = tidy(decodeURIComponent(request.headers.get("X-File-Name") || "")).slice(0, 100);
  } catch {
    // A garbled name is only cosmetic.
  }
  return json(await uploadMenu(store(env), params.lang, bytes, name));
}

export async function onRequestPost({ request, env, params }) {
  const auth = await checkPassword(request, env);
  if (auth) return auth;
  if (!store(env)) return missingStore();
  if (!MENU_LANGS.includes(params.lang)) return json({ error: "Bilinmeyen dil." }, 404);
  const result = await restoreMenu(store(env), params.lang);
  if (!result) return json({ error: "Geri dönülecek menü yok." }, 409);
  return json(result);
}
