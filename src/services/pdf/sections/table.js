const {
  M, CW, ROW_H, HDR_ROW_H, FS,
  BRAND, BRAND_RULE,
  SURFACE, BORDER,
  INK, WHITE,
  COLS,
} = require('../theme');
const { fmtWeight }           = require('../formatters');
const { cellText, truncate }  = require('../layout');

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

  doc.y = y + HDR_ROW_H;
  doc.fillColor(INK).font('Helvetica');
}

/**
 * Single animal row.
 *
 * Triggers a page break with a repeated table header when fewer than
 * ROW_H + 4 pts remain — kept inline here rather than delegated to
 * ensureSpace so that the header repeat stays co-located with the
 * page-break logic that requires it.
 *
 * @param {object} row   CattleRow record (type, sex, weight, cattleNumber, letters, rowOrder)
 * @param {number} index Zero-based index used for the alternating stripe tint
 */
function drawRow(doc, row, index) {
  const remaining = doc.page.height - doc.y - doc.page.margins.bottom;
  if (remaining < ROW_H + 4) {
    doc.addPage();
    drawTableHeader(doc);
  }

  const y = doc.y;

  // Alternating SURFACE / WHITE row fill
  doc.rect(M, y, CW, ROW_H).fill(index % 2 === 0 ? SURFACE : WHITE);

  // Bottom row border + left/right outer borders
  doc.moveTo(M,      y + ROW_H).lineTo(M + CW,  y + ROW_H).lineWidth(0.3).stroke(BORDER);
  doc.moveTo(M,      y        ).lineTo(M,        y + ROW_H).lineWidth(0.3).stroke(BORDER);
  doc.moveTo(M + CW, y        ).lineTo(M + CW,   y + ROW_H).lineWidth(0.3).stroke(BORDER);

  // Column separators
  for (let i = 1; i < COLS.length; i++) {
    doc.moveTo(COLS[i].x, y).lineTo(COLS[i].x, y + ROW_H)
       .lineWidth(0.3).stroke(BORDER);
  }

  // Set font + size BEFORE computing textY so currentLineHeight is accurate
  doc.fontSize(FS.sm).font('Helvetica').fillColor(INK);
  const textY = y + (ROW_H - doc.currentLineHeight(true)) / 2;
  const spec  = `${row.type.toUpperCase()} ${row.sex.toUpperCase()}`;

  cellText(doc, String(row.rowOrder), COLS[0], textY);
  cellText(doc, spec,                 COLS[1], textY);

  // Weight column in bold for scannability
  doc.font('Helvetica-Bold');
  cellText(doc, fmtWeight(row.weight), COLS[2], textY);

  // Cattle number — truncate defensively for long tag strings
  doc.font('Helvetica');
  const tagW    = COLS[3].w - 16; // PAD * 2
  const tagStr  = truncate(doc, String(row.cattleNumber), tagW);
  cellText(doc, tagStr, COLS[3], textY);

  if (row.letters) cellText(doc, row.letters, COLS[4], textY);

  doc.y = y + ROW_H;
  doc.fillColor(INK).font('Helvetica');
}

module.exports = { drawTableHeader, drawRow };
