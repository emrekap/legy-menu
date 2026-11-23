// Shared by the functions: where the manager's edits are kept, JSON replies,
// and the admin password check. Files in _lib export no onRequest handlers,
// so Cloudflare makes no web address for them.

// Everything the manager edits at /admin lives in one KV namespace: the
// lineup, the venue details, the cocktails and the uploaded menus. Its binding
// is called LINEUP because the lineup came first (README: "What the venue
// manager edits").
export function store(env) {
  return env.LINEUP || null;
}

export function missingStore() {
  return json({ error: "LINEUP KV binding is missing" }, 503);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// The admin password is sent as "Authorization: Bearer <password>", with the
// password URL-encoded so Turkish letters survive the header.
// Returns a Response to send back if the password is missing or wrong, or
// null if it is right. While ADMIN_PASSWORD is not set, nobody can save.
export async function checkPassword(request, env) {
  if (!env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD is not set" }, 503);
  const header = request.headers.get("Authorization") || "";
  let given = "";
  try {
    given = header.startsWith("Bearer ") ? decodeURIComponent(header.slice(7)) : "";
  } catch {
    // Malformed encoding: treat as a wrong password.
  }
  // Compare hashes, byte by byte to the end, so the time taken says nothing
  // about how much of the password was right.
  const [a, b] = await Promise.all([sha256(given), sha256(env.ADMIN_PASSWORD)]);
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0 && given !== "" ? null : json({ error: "Şifre yanlış." }, 401);
}

// For GET: anyone may read, but a request that brings a password has it
// checked, so /admin can log in with any of them (a wrong one gets 401).
export async function checkPasswordIfGiven(request, env) {
  return request.headers.has("Authorization") ? checkPassword(request, env) : null;
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// Reads a JSON body of at most maxBytes. Returns { body } or { error: Response }.
export async function readJson(request, maxBytes) {
  const text = await request.text();
  if (text.length > maxBytes) return { error: json({ error: "Çok uzun." }, 413) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: json({ error: "Geçersiz veri." }, 400) };
  }
}

// Trims and collapses spaces, so "  Smart   casual " is stored as "Smart casual".
export function tidy(value) {
  return String(value == null ? "" : value)
    .trim()
    .replace(/\s+/g, " ");
}

export function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// _headers keeps the preview address out of search results, but Cloudflare
// doesn't apply _headers to what functions send, so they add it themselves.
export function noindexOnPreview(request, headers) {
  if (new URL(request.url).hostname.startsWith("preview.")) headers.set("X-Robots-Tag", "noindex");
}
