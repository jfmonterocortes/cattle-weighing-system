const {
  M, CW, SP, FS,
  BRAND_MID, BRAND_LIGHT,
  GOLD, GOLD_BG,
  BORDER, INK, INK_MUTED,
} = require('../theme');
const { fmtWeight, fmtMoney } = require('../formatters');

const BAND_H   = 42; // hero band height (pts)
const ACCENT_H = 3;  // top accent bar height (pts)
const CELL_W   = CW / 4;

// Eyebrow text metrics (fixed — FS.xxs Helvetica)
const EYEBROW_LINE_H = FS.xxs * 1.2; // ≈ 7.8 pt

/**
 * Hero metric band with four stat cells.
 *
 *   | CABEZAS | PESO TOTAL | PROMEDIO | VALOR TOTAL |
 *
 * Each cell:
 *   – 3 pt top accent bar (BRAND_MID for first three, GOLD for VALOR TOTAL)
 *   – BRAND_LIGHT or GOLD_BG fill
 *   – FS.xxs eyebrow label
 *   – Hero metric value: starts at FS.lg (14 pt) and scales down to FS.sm if
 *     the formatted string is too wide for the cell — prevents overflow into
 *     adjacent cells for large monetary values.
 *   – Eyebrow + value block is vertically centred in the usable band area.
 *
 * doc.y is advanced past the band + SP[3] breathing gap.
 */
function drawHighlights(doc, stats) {
  const cells = [
    { label: 'CABEZAS',     value: String(stats.headCount),                accentColor: BRAND_MID, bg: BRAND_LIGHT, fg: INK,  labelFg: INK_MUTED },
    { label: 'PESO TOTAL',  value: `${fmtWeight(stats.totalWeight)} kg`,   accentColor: BRAND_MID, bg: BRAND_LIGHT, fg: INK,  labelFg: INK_MUTED },
    { label: 'PROMEDIO',    value: `${fmtWeight(stats.averageWeight)} kg`, accentColor: BRAND_MID, bg: BRAND_LIGHT, fg: INK,  labelFg: INK_MUTED },
    { label: 'VALOR TOTAL', value: fmtMoney(stats.totalValue),             accentColor: GOLD,      bg: GOLD_BG,     fg: GOLD, labelFg: GOLD       },
  ];

  const y       = doc.y;
  const textW   = CELL_W - SP[2] * 2;
  const usableH = BAND_H - ACCENT_H; // vertical space below accent bar

  cells.forEach((cell, ci) => {
    const cellX = M + ci * CELL_W;

    // Background fill + top accent bar
    doc.rect(cellX, y, CELL_W, BAND_H).fill(cell.bg);
    doc.rect(cellX, y, CELL_W, ACCENT_H).fill(cell.accentColor);

    // Determine hero font size: start at FS.lg, scale down until value fits
    doc.font('Helvetica-Bold');
    let heroSize = FS.lg;
    doc.fontSize(heroSize);
    while (heroSize > FS.sm && doc.widthOfString(cell.value) > textW) {
      heroSize--;
      doc.fontSize(heroSize);
    }

    // Vertically centre the [eyebrow + gap + value] block in the usable area
    const valueLineH  = heroSize * 1.2;
    const contentH    = EYEBROW_LINE_H + SP[1] + valueLineH;
    const topPad      = Math.max(SP[1], (usableH - contentH) / 2);
    const eyebrowY    = y + ACCENT_H + topPad;
    const valueY      = eyebrowY + EYEBROW_LINE_H + SP[1];

    doc.fontSize(FS.xxs).font('Helvetica').fillColor(cell.labelFg)
      .text(cell.label, cellX + SP[2], eyebrowY,
            { width: textW, align: 'center', lineBreak: false });

    doc.fontSize(heroSize).font('Helvetica-Bold').fillColor(cell.fg)
      .text(cell.value, cellX + SP[2], valueY,
            { width: textW, align: 'center', lineBreak: false });
  });

  // Inner column separators
  for (let i = 1; i < cells.length; i++) {
    const sepX = M + i * CELL_W;
    doc.moveTo(sepX, y).lineTo(sepX, y + BAND_H)
       .lineWidth(0.5).stroke(BORDER);
  }

  // Outer border
  doc.rect(M, y, CW, BAND_H).lineWidth(0.5).stroke(BORDER);

  doc.y = y + BAND_H + SP[4]; // SP[4] = 16 pt — consistent section gap
  doc.fontSize(FS.sm).fillColor(INK).font('Helvetica');
}

module.exports = { drawHighlights, BAND_H };
