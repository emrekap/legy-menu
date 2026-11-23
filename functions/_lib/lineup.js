// The DJ lineup, edited at /admin ("Program"). One JSON value under the key
// "lineup": { nights: [{ date, dj, genres, start, end }], hidden, updatedAt }.
// hidden: the manager turned the Nights section off; functions/index.js then
// leaves it out of the landing page. The nights stay saved either way.

export const LINEUP_KEY = "lineup";

export async function readLineup(kv) {
  const saved = kv ? await kv.get(LINEUP_KEY, { type: "json" }) : null;
  return saved || {};
}
