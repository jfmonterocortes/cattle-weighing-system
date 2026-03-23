const { SP } = require('./theme');

const PAD = SP[2]; // 8 pt — standard inner cell padding

/**
 * Truncate `text` so it fits within `maxW` pts at the current doc font/size.
 * Appends '…' (U+2026) when truncation is needed.  Uses binary search so it
 * is O(log n) rather than O(n) character-by-character.
 */
function truncate(doc, text, maxW) {
  const s = String(text);
  if (doc.widthOfString(s) <= maxW) return s;
  const ellipsis = '\u2026';
  let lo = 0, hi = s.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.widthOfString(s.slice(0, mid) + ellipsis) <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return (lo === 0 ? '' : s.slice(0, lo)) + ellipsis;
}

/**
 * Place text inside a fixed-width column cell with symmetric PAD on both sides.
 *
 * Both left- and right-aligned columns receive PAD as an inner inset from each
 * column edge, so text never touches a separator line regardless of alignment.
 * Callers that need explicit overflow prevention should run truncate() first.
 */
function cellText(doc, text, col, y) {
  doc.text(String(text), col.x + PAD, y, {
    width:     col.w - PAD * 2,
    align:     col.align,
    lineBreak: false,
  });
}

/**
 * Advance to a new page when fewer than neededPts remain above the bottom
 * margin.  Callers that need a repeated section header (e.g. the table header)
 * must draw it themselves immediately after calling this function.
 */
function ensureSpace(doc, neededPts) {
  const remaining = doc.page.height - doc.y - doc.page.margins.bottom;
  if (remaining < neededPts) doc.addPage();
}

module.exports = { cellText, ensureSpace, truncate };
