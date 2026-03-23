const {
  M, CW, ROW_H, HDR_ROW_H, FS,
  BRAND, BRAND_MID, BRAND_RULE,
  SURFACE, BORDER, BORDER_STRONG,
  WARM_WHITE, INK, INK_MUTED, WHITE,
  COLS,
} = require('../theme');
const { fmtWeight }            = require('../formatters');
const { cellText, truncate }   = require('../layout');
const { resolveSpecification } = require('../../../constants/domain');

/**
 * Full-width table header row with a deep-green fill and white column labels.
 * Called on the first page by the orchestrator and repeated automatically
 * by drawRow whenever a page break occurs.
 */
function drawTableHeader(doc) {
  const y = doc.y;

  doc.rect(M, y, CW, HDR_ROW_H).fill(BRAND);

  // Column separators in a slightly lighter green
  for (let i = 1; i < COLS.length; i++) {
    doc.moveTo(COLS[i].x, y).lineTo(COLS[i].x, y + HDR_ROW_H)
       .lineWidth(0.4).stroke(BRAND_RULE);
  }

  // Labels — font/size set before currentLineHeight so centering is correct
  doc.fontSize(FS.sm).font('Helvetica-Bold').fillColor(WHITE);
  const textY = y + (HDR_ROW_H - doc.currentLineHeight(true)) / 2;
  COLS.forEach((col) => cellText(doc, col.label.toUpperCase(), col, textY));

  // Strong bottom rule anchors the header visually above the first data row
  doc.moveTo(M, y + HDR_ROW_H).lineTo(M + CW, y + HDR_ROW_H)
     .lineWidth(1.2).stroke(BRAND_MID);

  doc.y = y + HDR_ROW_H;
  doc.fillColor(INK).font('Helvetica');
}

/**
 * Single table row — either a data row or a blank pre-numbered slot.
 *
 * Pass `row = null` to draw a blank slot: the sequential number appears
 * in the # column in muted ink and all other cells remain empty.
 * Pass a CattleRow record to draw a fully populated data row.
 *
 * Triggers a page break with a repeated table header when fewer than
 * ROW_H + 4 pts remain.
 *
 * @param {object|null} row   CattleRow record, or null for a blank slot
 * @param {number}      index Zero-based index (used for stripe tint and slot number)
 */
function drawRow(doc, row, index) {
  const y = doc.y;

  // Alternating SURFACE / WARM_WHITE — cream rows blend with the page ground
  doc.rect(M, y, CW, ROW_H).fill(index % 2 === 0 ? SURFACE : WARM_WHITE);

  // Bottom row border — stronger rule every 5 rows for visual grouping
  const isGroupEnd   = (index + 1) % 5 === 0;
  const sepColor     = isGroupEnd ? BORDER_STRONG : BORDER;
  const sepLineWidth = isGroupEnd ? 0.5 : 0.3;
  doc.moveTo(M,      y + ROW_H).lineTo(M + CW,  y + ROW_H).lineWidth(sepLineWidth).stroke(sepColor);
  doc.moveTo(M,      y        ).lineTo(M,        y + ROW_H).lineWidth(0.3).stroke(BORDER);
  doc.moveTo(M + CW, y        ).lineTo(M + CW,   y + ROW_H).lineWidth(0.3).stroke(BORDER);

  // Column separators
  for (let i = 1; i < COLS.length; i++) {
    doc.moveTo(COLS[i].x, y).lineTo(COLS[i].x, y + ROW_H)
       .lineWidth(0.3).stroke(BORDER);
  }

  doc.fontSize(FS.sm);
  const textY = y + (ROW_H - doc.currentLineHeight(true)) / 2;

  if (row === null) {
    // Blank slot — muted sequential number only, all other cells empty
    doc.font('Helvetica').fillColor(INK_MUTED);
    cellText(doc, String(index + 1), COLS[0], textY);
  } else {
    const spec = resolveSpecification(row);

    // Row number bold — anchors the eye at the left edge of each row
    doc.font('Helvetica-Bold').fillColor(INK);
    cellText(doc, String(row.rowOrder), COLS[0], textY);

    doc.font('Helvetica');
    cellText(doc, spec, COLS[1], textY);

    // Weight column in bold for scannability
    doc.font('Helvetica-Bold');
    cellText(doc, fmtWeight(row.weight), COLS[2], textY);

    // Cattle number — truncate defensively for long tag strings
    doc.font('Helvetica');
    const tagW   = COLS[3].w - 16; // PAD * 2
    const tagStr = truncate(doc, String(row.cattleNumber), tagW);
    cellText(doc, tagStr, COLS[3], textY);

    if (row.letters) cellText(doc, row.letters, COLS[4], textY);
  }

  doc.y = y + ROW_H;
  doc.fillColor(INK).font('Helvetica');
}

module.exports = { drawTableHeader, drawRow };
