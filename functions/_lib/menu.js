// The menu PDFs the manager uploads at /admin ("Menü"). Each language has the
// current upload ("menu:tr") and the one before it ("menu:tr:previous"), so a
// wrong upload can be undone. The details of each file are kept as KV metadata:
// { etag, updatedAt, size, name }.
//
// A language with no upload shows the PDF that came with the site
// (menu-tr.pdf, menu-en.pdf in the project folder). In the swap below, a
// missing current or previous stands for that file.

import { noindexOnPreview, store } from "./common.js";

export const MENU_LANGS = ["tr", "en"];
// KV's limit for one value.
export const MAX_MENU_BYTES = 25 * 1024 * 1024;

const currentKey = (lang) => `menu:${lang}`;
const previousKey = (lang) => `menu:${lang}:previous`;

// For guests: /menu-tr.pdf and /menu-en.pdf, which /menu and the QR codes use.
export async function serveMenu({ request, env }, lang) {
  const kv = store(env);
  if (kv) {
    try {
      const found = await kv.getWithMetadata(currentKey(lang), { type: "stream" });
      if (found.value) {
        const etag = `"${(found.metadata && found.metadata.etag) || "menu"}"`;
        const headers = new Headers({
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="menu-${lang}.pdf"`,
          // Browsers ask every time whether the menu changed; if not, they
          // get a short "not modified" and use the copy they have.
          "Cache-Control": "no-cache",
          ETag: etag,
          "X-Content-Type-Options": "nosniff",
        });
        noindexOnPreview(request, headers);
        if ((request.headers.get("If-None-Match") || "").includes(etag)) {
          await found.value.cancel();
          return new Response(null, { status: 304, headers });
        }
        return new Response(found.value, { headers });
      }
    } catch (error) {
      // Fall back to the PDF that came with the site.
      console.error(`menu-${lang}.pdf: could not read the uploaded menu`, error);
    }
  }
  return env.ASSETS.fetch(request);
}

// For /admin: what each language shows now and what "undo" would bring back.
// { tr: { current, previous }, en: {...} }, each { updatedAt, size, name } or
// null for the PDF that came with the site.
export async function menuInfo(kv) {
  const { keys } = await kv.list({ prefix: "menu:" });
  const meta = new Map(keys.map((key) => [key.name, key.metadata]));
  return Object.fromEntries(
    MENU_LANGS.map((lang) => [
      lang,
      { current: describe(meta.get(currentKey(lang))), previous: describe(meta.get(previousKey(lang))) },
    ]),
  );
}

export function isPdf(bytes) {
  // PDFs start with "%PDF-", allowed anywhere in the first 1024 bytes.
  const head = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 1024));
  const mark = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  for (let i = 0; i + mark.length <= head.length; i += 1) {
    if (mark.every((byte, j) => head[i + j] === byte)) return true;
  }
  return false;
}

// The new file becomes the menu; the one guests saw until now is kept for undo.
export async function uploadMenu(kv, lang, bytes, name) {
  const old = await kv.getWithMetadata(currentKey(lang), { type: "arrayBuffer" });
  if (old.value) await kv.put(previousKey(lang), old.value, { metadata: old.metadata });
  else await kv.delete(previousKey(lang));
  const metadata = { etag: crypto.randomUUID(), updatedAt: new Date().toISOString(), size: bytes.byteLength, name };
  await kv.put(currentKey(lang), bytes, { metadata });
  return { current: describe(metadata), previous: describe(old.value ? old.metadata : null) };
}

// Undo: the current and previous menus swap places. Returns null when there
// is nothing to go back to.
export async function restoreMenu(kv, lang) {
  const [cur, prev] = await Promise.all([
    kv.getWithMetadata(currentKey(lang), { type: "arrayBuffer" }),
    kv.getWithMetadata(previousKey(lang), { type: "arrayBuffer" }),
  ]);
  if (!cur.value && !prev.value) return null;
  if (prev.value) await kv.put(currentKey(lang), prev.value, { metadata: prev.metadata });
  else await kv.delete(currentKey(lang));
  if (cur.value) await kv.put(previousKey(lang), cur.value, { metadata: cur.metadata });
  else await kv.delete(previousKey(lang));
  return {
    current: describe(prev.value ? prev.metadata : null),
    previous: describe(cur.value ? cur.metadata : null),
  };
}

function describe(metadata) {
  if (!metadata) return null;
  const { updatedAt = null, size = null, name = "" } = metadata;
  return { updatedAt, size, name };
}
