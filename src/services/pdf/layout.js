const { SP, M, CW, BORDER_STRONG, ORNAMENT } = require('./theme');

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

/**
 * Ornamental section divider: a hairline rule split at the centre by a small
 * diamond ornament.  Provides a refined typographic section break without
 * consuming additional vertical space — draw at the mid-point of the gap
 * between two sections (does not advance doc.y).
 *
 * @param {PDFDocument} doc
 * @param {number}      y    Absolute Y coordinate of the rule line
 */
function drawOrnamentalRule(doc, y) {
  const midX = M + CW / 2;
  const gap  = 9;   // half-gap cleared on each side of the diamond
  const d    = 2.5; // half-diagonal of the diamond (pts)

  doc.save();

  // Left wing
  doc.moveTo(M, y).lineTo(midX - gap, y)
     .lineWidth(0.4).stroke(BORDER_STRONG);

  // Diamond ornament (rotated square drawn as a path)
  doc.moveTo(midX,     y - d)
     .lineTo(midX + d, y    )
     .lineTo(midX,     y + d)
     .lineTo(midX - d, y    )
     .closePath()
     .fill(ORNAMENT);

  // Right wing
  doc.moveTo(midX + gap, y).lineTo(M + CW, y)
     .lineWidth(0.4).stroke(BORDER_STRONG);

  doc.restore();
}

module.exports = { cellText, ensureSpace, truncate, drawOrnamentalRule };
