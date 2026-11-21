// Finds how a menu page is laid out, so that on a phone it can be shown as one
// column: the parts of the page (a list, a cocktail, a heading...) are cut out
// and stacked under each other, big enough to read without zooming.
//
// It works on a small drawing of the page. Everything that differs from the
// background color is "ink". The page is cut at empty strips, the way you would
// cut a newspaper page apart with scissors: into bands above each other, and
// where several bands share an empty strip running down through them, into
// columns side by side. Each part is then cut again.
//
// All sizes are in PDF points (1/72 inch), so they don't depend on how big the
// page was drawn.

// How different from the background a pixel must be to count as ink.
const INK_DIFFERENCE = 16;
// Straight lines at least this long are rules (dividers, frames), not text.
const MIN_HORIZONTAL_RULE = 100;
const MIN_VERTICAL_RULE = 200;
// The smallest empty strip between two bands, and between two columns.
const MIN_GAP_BETWEEN_BANDS = 16;
const MIN_GAP_BETWEEN_COLUMNS = 48;
// A column is at least this wide, so a row of prices stays with its names.
const MIN_COLUMN_WIDTH = 150;
const MAX_DEPTH = 40;

// Space left above a part in the phone column, in points.
const GAP_BETWEEN_COLUMNS = 44; // parts that were side by side
const GAP_BETWEEN_PAGES = 72;
const MAX_GAP = 72;
// Kept around each part, so the soft edges of letters are not cut off.
const PADDING = 3;

const TEXT = 1; // any ink that is not a rule: text, pictures, logos
const RULE = 2; // a divider line, shown with the content around it
const FRAME = 3; // a border along the page, left out of the phone column

/**
 * Finds the parts of one page.
 *
 * @param {{data: Uint8ClampedArray, width: number, height: number}} image the
 *   page drawn small; its top left pixel must be background
 * @param {{width: number, height: number}} size the page size in points
 * @returns the page as a tree of boxes, or null if the page is empty. Each box
 *   is `{x, y, w, h, core, split, children}` in points. `split` is "bands"
 *   (children above each other), "columns" (side by side) or null (one part).
 *   `core` is the box around the text and pictures without the rules, or null
 *   if the part is only rules.
 */
export function analyzePage(image, size) {
  const { width: w, height: h } = image;
  const k = w / size.width; // pixels per point
  const px = (points) => Math.max(1, Math.round(points * k));
  const minGapBands = px(MIN_GAP_BETWEEN_BANDS);
  const minGapColumns = px(MIN_GAP_BETWEEN_COLUMNS);
  const minColumn = px(MIN_COLUMN_WIDTH);

  const kind = findInk(image);
  markRules(kind, w, h, px(MIN_HORIZONTAL_RULE), px(MIN_VERTICAL_RULE));
  const isInk = (i) => kind[i] === TEXT || kind[i] === RULE;

  // Which rows of a box have ink in them.
  const rowsWithInk = (x0, x1, y0, y1) => {
    const rows = new Uint8Array(y1 - y0);
    for (let y = y0; y < y1; y++) {
      for (let i = y * w + x0, end = y * w + x1; i < end; i++) {
        if (isInk(i)) {
          rows[y - y0] = 1;
          break;
        }
      }
    }
    return rows;
  };
  // Which columns of a box have ink in them.
  const columnsWithInk = (x0, x1, y0, y1) => {
    const columns = new Uint8Array(x1 - x0);
    for (let y = y0; y < y1; y++) {
      for (let i = y * w + x0, x = 0; x < columns.length; i++, x++) {
        if (isInk(i)) columns[x] = 1;
      }
    }
    return columns;
  };
  // The box around the text and pictures (no rules) inside a box.
  const coreOf = (x0, x1, y0, y1) => {
    let left = x1;
    let right = x0;
    let top = y1;
    let bottom = y0;
    for (let y = y0; y < y1; y++) {
      for (let i = y * w + x0, x = x0; x < x1; i++, x++) {
        if (kind[i] !== TEXT) continue;
        if (x < left) left = x;
        if (x >= right) right = x + 1;
        if (y < top) top = y;
        if (y >= bottom) bottom = y + 1;
      }
    }
    return right > left ? { x0: left, x1: right, y0: top, y1: bottom } : null;
  };

  // Splits a box into its parts. With `asColumns`, the box is known to be
  // made of columns and is cut into them before anything else.
  function cut(x0, x1, y0, y1, depth, asColumns = false) {
    // Shrink the box to the ink inside it.
    const rows = rowsWithInk(x0, x1, y0, y1);
    const top = rows.indexOf(1);
    if (top < 0) return null;
    const bottom = rows.lastIndexOf(1) + 1;
    y1 = y0 + bottom;
    y0 += top;
    const columns = columnsWithInk(x0, x1, y0, y1);
    const left = columns.indexOf(1);
    const right = columns.lastIndexOf(1) + 1;
    x1 = x0 + right;
    x0 += left;

    const node = { x0, x1, y0, y1, split: null, children: [] };
    const bands = asColumns ? [] : partsBetween(rows.subarray(top, bottom), y0, minGapBands);
    if (depth >= MAX_DEPTH) {
      // Deep enough; keep the rest in one piece.
    } else if (bands.length > 1) {
      node.split = "bands";
      const run = findColumns(bands, x0, x1);
      if (run) {
        // The bands before the columns, the columns, the bands after them.
        const { first, last } = run;
        if (first > 0) node.children.push(cut(x0, x1, y0, bands[first - 1][1], depth + 1));
        node.children.push(cut(x0, x1, bands[first][0], bands[last][1], depth + 1, true));
        if (last < bands.length - 1) node.children.push(cut(x0, x1, bands[last + 1][0], y1, depth + 1));
      } else {
        node.children = bands.map(([a, b]) => cut(x0, x1, a, b, depth + 1));
      }
    } else {
      const gap = widestGap(columns.subarray(left, right), x0, minGapColumns, minColumn);
      if (gap) {
        node.split = "columns";
        node.children = [cut(x0, gap.start, y0, y1, depth + 1), cut(gap.end, x1, y0, y1, depth + 1)];
      }
    }

    // Two cuts in the same direction make one list: [[a, b], c] → [a, b, c].
    node.children = node.children
      .filter(Boolean)
      .flatMap((child) => (child.split === node.split ? child.children : [child]));
    // All the bands were one run of columns: the box is those columns.
    if (node.children.length === 1) return node.children[0];
    if (node.children.length < 2) {
      node.split = null;
      node.children = [];
    }
    node.core = coreOf(x0, x1, y0, y1);
    return node;
  }

  // Looks for consecutive bands that an empty strip runs down through, like
  // the rows of a two column list. Returns the run of bands (at least two) that
  // can be cut into columns and whose strip is the biggest (width × height), as
  // `{first, last}` indexes. A real gap between columns is both wide and long;
  // a strip that only lines up by chance is usually narrow.
  function findColumns(bands, x0, x1) {
    const profiles = bands.map(([a, b]) => columnsWithInk(x0, x1, a, b));
    const clearPart = (profile, [a, b]) => {
      // The widest stretch of [a, b) without ink in this band.
      let best = null;
      let start = -1;
      for (let x = a; x <= b; x++) {
        if (x < b && !profile[x]) {
          if (start < 0) start = x;
        } else if (start >= 0) {
          if (x - start >= minGapColumns && (!best || x - start > best[1] - best[0])) {
            best = [start, x];
          }
          start = -1;
        }
      }
      return best;
    };

    let best = null;
    profiles.forEach((profile, i) => {
      const left = profile.indexOf(1);
      const right = profile.lastIndexOf(1) + 1;
      for (const [a, b] of partsBetween(profile.subarray(left, right), left, 1, true)) {
        if (b - a < minGapColumns) continue;
        // Follow this empty strip down, then up, as far as it stays wide enough.
        let strip = [a, b];
        let first = i;
        let last = i;
        for (let j = i + 1, next; j < bands.length && (next = clearPart(profiles[j], strip)); j++) {
          strip = next;
          last = j;
        }
        for (let j = i - 1, next; j >= 0 && (next = clearPart(profiles[j], strip)); j--) {
          strip = next;
          first = j;
        }
        if (last === first) continue;
        const score = (strip[1] - strip[0]) * (bands[last][1] - bands[first][0]);
        if (best && score <= best.score) continue;

        // Only if the columns on both sides are wide enough.
        const merged = new Uint8Array(x1 - x0);
        for (let j = first; j <= last; j++) {
          for (let x = 0; x < merged.length; x++) merged[x] |= profiles[j][x];
        }
        const l = merged.indexOf(1);
        const r = merged.lastIndexOf(1) + 1;
        if (widestGap(merged.subarray(l, r), 0, minGapColumns, minColumn)) {
          best = { first, last, score };
        }
      }
    });
    return best;
  }

  const root = cut(0, w, 0, h, 0);
  return root && toPoints(root, k);
}

/**
 * Plans the phone column for a whole menu: the parts of every page in reading
 * order, each with the box to cut out of its page and the space above it.
 *
 * @param {Array<object|null>} trees what analyzePage returned for each page
 * @returns {{width: number, tiles: Array<{page, x, y, w, h, gap}>}|null} all
 *   in points. `width` is the width of the column; a few parts (big titles) can
 *   be wider and are shown smaller. Null if the pages have no columns, so they
 *   are better shown whole.
 */
export function planColumn(trees) {
  // The column is as wide as the widest column on any page.
  let width = 0;
  const measure = (node) => {
    if (node.split === "columns") {
      for (const child of node.children) width = Math.max(width, child.w);
    }
    node.children.forEach(measure);
  };
  trees.forEach((tree) => tree && measure(tree));
  if (!width) return null;

  const tiles = [];
  trees.forEach((tree, page) => {
    if (!tree) return;
    const parts = partsOf(tree, width, page);
    parts[0].gap = tiles.length ? GAP_BETWEEN_PAGES : 0;
    tiles.push(...parts);
  });
  for (const tile of tiles) {
    tile.x -= PADDING;
    tile.y -= PADDING;
    tile.w += 2 * PADDING;
    tile.h += 2 * PADDING;
    tile.gap = Math.max(0, tile.gap - 2 * PADDING);
  }
  return { width: width + 2 * PADDING, tiles };
}

// The parts of a box in reading order: top to bottom, and columns one after
// the other. A box that fits in the column stays in one piece.
function partsOf(node, width, page) {
  if (node.w <= width * 1.02) return [{ page, x: node.x, y: node.y, w: node.w, h: node.h, gap: 0 }];
  if (!node.split) return [widePart(node, width, page)];

  const parts = [];
  node.children.forEach((child, i) => {
    const childParts = partsOf(child, width, page);
    if (i > 0) {
      const previous = node.children[i - 1];
      childParts[0].gap =
        node.split === "bands"
          ? Math.min(MAX_GAP, child.y - (previous.y + previous.h))
          : GAP_BETWEEN_COLUMNS;
    }
    parts.push(...childParts);
  });
  return parts;
}

// A single part wider than the column. If its text is narrow and only rules
// make it wide (a heading between two lines), the rules are cut to the width
// of the column. Otherwise (a big title) it is kept whole.
function widePart(node, width, page) {
  const tile = { page, x: node.x, y: node.y, w: node.w, h: node.h, gap: 0 };
  const core = node.core ?? { x: node.x + node.w / 2, w: 0 };
  if (core.w >= width) return { ...tile, x: core.x, w: core.w };
  const center = core.x + core.w / 2;
  const half = Math.min(width / 2, center - node.x, node.x + node.w - center);
  return { ...tile, x: center - half, w: 2 * half };
}

// Ink map of the page: TEXT where a pixel differs from the top left one.
function findInk({ data, width, height }) {
  const kind = new Uint8Array(width * height);
  const [r, g, b] = data;
  for (let i = 0, j = 0; i < kind.length; i++, j += 4) {
    const difference =
      Math.abs(data[j] - r) + Math.abs(data[j + 1] - g) + Math.abs(data[j + 2] - b);
    if (difference >= INK_DIFFERENCE) kind[i] = TEXT;
  }
  return kind;
}

// Long straight lines become RULE. Long vertical lines (the sides of a border)
// and every line joined to them become FRAME.
function markRules(kind, w, h, minHorizontal, minVertical) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; ) {
      const start = x;
      while (x < w && kind[y * w + x]) x++;
      if (x - start >= minHorizontal) kind.fill(RULE, y * w + start, y * w + x);
      x = Math.max(x, start + 1);
    }
  }
  const frame = [];
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; ) {
      const start = y;
      while (y < h && kind[y * w + x]) y++;
      if (y - start >= minVertical) {
        for (let i = start * w + x; i < y * w; i += w) {
          kind[i] = FRAME;
          frame.push(i);
        }
      }
      y = Math.max(y, start + 1);
    }
  }

  // The soft edge along a rule is part of the rule, unless it is a letter
  // touching the rule.
  const edges = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (kind[i] !== TEXT) continue;
      const nextTo = [kind[i - w], kind[i + w], kind[i - 1], kind[i + 1]];
      const touches = nextTo.find((other) => other === RULE || other === FRAME);
      if (touches && countText(kind, w, h, x, y) <= 6) edges.push([i, touches]);
    }
  }
  for (const [i, value] of edges) {
    kind[i] = value;
    if (value === FRAME) frame.push(i);
  }

  // Lines joined to a frame are part of the frame (its top and bottom).
  while (frame.length) {
    const i = frame.pop();
    const x = i % w;
    for (const j of [i - w - 1, i - w, i - w + 1, i - 1, i + 1, i + w - 1, i + w, i + w + 1]) {
      if (j < 0 || j >= kind.length || Math.abs((j % w) - x) > 1) continue;
      if (kind[j] === RULE) {
        kind[j] = FRAME;
        frame.push(j);
      }
    }
  }
}

// How many TEXT pixels there are in the 5×5 square around a pixel.
function countText(kind, w, h, x, y) {
  let count = 0;
  for (let ny = Math.max(0, y - 2); ny <= Math.min(h - 1, y + 2); ny++) {
    for (let nx = Math.max(0, x - 2); nx <= Math.min(w - 1, x + 2); nx++) {
      if (kind[ny * w + nx] === TEXT) count++;
    }
  }
  return count;
}

// The stretches of ink in a row of flags, split where at least `minGap` flags
// in a row are empty: [start, end) pairs with `offset` added. With `gaps`, the
// empty stretches between them are returned instead.
function partsBetween(occupied, offset, minGap, gaps = false) {
  const parts = [];
  const between = [];
  let start = -1;
  let empty = 0;
  for (let i = 0; i < occupied.length; i++) {
    if (!occupied[i]) {
      empty++;
      continue;
    }
    if (start < 0) {
      start = i;
    } else if (empty >= minGap) {
      parts.push([offset + start, offset + i - empty]);
      between.push([offset + i - empty, offset + i]);
      start = i;
    }
    empty = 0;
  }
  if (start >= 0) parts.push([offset + start, offset + occupied.length - empty]);
  return gaps ? between : parts;
}

// The widest empty stretch in a row of flags that is at least `minGap` long
// and has at least `minPart` from the ends on both sides. Returns its `start`,
// `end` (with `offset` added) and `size`, or null.
function widestGap(occupied, offset, minGap, minPart) {
  let best = null;
  for (const [start, end] of partsBetween(occupied, 0, minGap, true)) {
    const size = end - start;
    if (best && size <= best.size) continue;
    if (start >= minPart && occupied.length - end >= minPart) {
      best = { start: offset + start, end: offset + end, size };
    }
  }
  return best;
}

function toPoints(node, k) {
  const box = ({ x0, x1, y0, y1 }) => ({ x: x0 / k, y: y0 / k, w: (x1 - x0) / k, h: (y1 - y0) / k });
  return {
    ...box(node),
    core: node.core && box(node.core),
    split: node.split,
    children: node.children.map((child) => toPoints(child, k)),
  };
}
