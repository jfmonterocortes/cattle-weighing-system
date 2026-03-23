const {
  M, CW, SP, FS,
  BRAND, BRAND_LIGHT,
  GOLD, GOLD_BG,
  SURFACE, BORDER, BORDER_STRONG,
  INK, INK_MID, INK_MUTED, WHITE,
} = require('../theme');
const { fmtWeight, fmtMoney } = require('../formatters');
const { ensureSpace }         = require('../layout');

// ── Layout constants ───────────────────────────────────────────────────────────

const SBAR_H     = 26; // "RESUMEN DE OPERACION" header bar
const SCELL_H    = 28; // data cell row height
const VALOR_H    = 38; // full-width VALOR TOTAL row
const BKDN_HDR_H = 20; // breakdown column-header row
const BKDN_ROW_H = 16; // breakdown data row height

// Breakdown column definitions (absolute x, width in pts)
// Total: 205 + 60 + 125 + 125.28 = 515.28 = CW ✓
const BKDN_COLS = [
  { x: M,          w: 205,    label: 'ESPECIE',    align: 'left'  },
  { x: M + 205,    w: 60,     label: 'CABEZAS',    align: 'right' },
  { x: M + 265,    w: 125,    label: 'PESO TOTAL', align: 'right' },
  { x: M + 390,    w: 125.28, label: 'PROMEDIO',   align: 'right' },
];

const PAD = SP[2]; // 8 pt

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Draw text in a breakdown column cell with symmetric PAD. */
function bkCell(doc, text, col, y) {
  doc.text(String(text), col.x + PAD, y, {
    width: col.w - PAD * 2, align: col.align, lineBreak: false,
  });
}

/**
 * Format a sex-group average weight.
 * Returns an em-dash when count is zero so "0 kg prom." is never shown.
 */
function fmtAvg(count, avg) {
  return count > 0 ? `${fmtWeight(avg)} kg prom.` : '\u2014';
}

// ── Public draw function ───────────────────────────────────────────────────────

/**
 * RESUMEN box: full stats + sex breakdown + type/sex group table.
 *
 * Structure (top → bottom):
 *   ┌──────────────────────────────────────────────┐
 *   │  RESUMEN DE OPERACION  (BRAND header bar)    │ 26
 *   ├─────────────────────┬────────────────────────┤
 *   │  CABEZAS            │  PESO TOTAL            │ 28
 *   ├──────────────────────────────────────────────┤
 *   │  PROMEDIO                                    │ 28  (full-width)
 *   ├─────────────────────┬────────────────────────┤
 *   │  MACHOS  N · avg    │  HEMBRAS  N · avg      │ 28
 *   ├──────────────────────────────────────────────┤
 *   │  VALOR TOTAL  ············  $ X.XXX.XXX      │ 38  (GOLD, full-width)
 *   ├──────────────────────────────────────────────┤  ← if groups exist
 *   │  ESPECIE │ CABEZAS │ PESO TOTAL │ PROMEDIO   │ 20  (column headers)
 *   │  … rows …                                    │ 16 × N
 *   └──────────────────────────────────────────────┘
 *
 * Key print-quality decisions:
 *   – No sub-line in the MACHOS/HEMBRAS row; avg is inlined into the value
 *     string so it always fits within SCELL_H=28.
 *   – ensureSpace reserves BOX_H + SIG_H + SP[4] before drawing so the box
 *     and the signature always land on the same page (orphan prevention).
 *   – doc.y is advanced by a fixed SP[4] gap instead of doc.moveDown so the
 *     gap is consistent regardless of which font was last set.
 */
function drawSummary(doc, stats, sheet) {
  const groups      = [...stats.totalsByTypeSex]
    .sort((a, b) => a.specification.localeCompare(b.specification));
  const hasBreakdown = groups.length > 0;
  const BKDN_H      = hasBreakdown ? BKDN_HDR_H + groups.length * BKDN_ROW_H : 0;
  const BOX_H       = SBAR_H + 3 * SCELL_H + VALOR_H + BKDN_H;

  const SIG_H = 72; // SP[3](12) gap + SIG_ZONE_H(60) consumed by drawSignature
  ensureSpace(doc, BOX_H + SIG_H + SP[4]);

  // Fixed gap between last table row and the summary box
  doc.y += SP[4];

  const maleCount   = sheet.rows.filter((r) => r.sex === 'MACHO').length;
  const femaleCount = sheet.rows.filter((r) => r.sex === 'HEMBRA').length;

  // Inline the avg into the value string — no sub-line, so SCELL_H=28 is safe.
  // A single-element row renders full-width (no center divider).
  const mainRows = [
    [
      { label: 'CABEZAS',    value: String(stats.headCount) },
      { label: 'PESO TOTAL', value: `${fmtWeight(stats.totalWeight)} kg` },
    ],
    [
      { label: 'PROMEDIO', value: `${fmtWeight(stats.averageWeight)} kg` },
    ],
    [
      { label: 'MACHOS',  value: `${maleCount} cab. \u00B7 ${fmtAvg(maleCount,   stats.averageMaleWeight)}`   },
      { label: 'HEMBRAS', value: `${femaleCount} cab. \u00B7 ${fmtAvg(femaleCount, stats.averageFemaleWeight)}` },
    ],
  ];

  const y    = doc.y;
  const HALF = CW / 2;

  // ── RESUMEN header bar ───────────────────────────────────────────────────────
  doc.rect(M, y, CW, SBAR_H).fill(BRAND);
  doc.fontSize(FS.xs).font('Helvetica-Bold').fillColor(WHITE);
  doc.text('RESUMEN DE OPERACION',
           M + SP[3], y + (SBAR_H - doc.currentLineHeight(true)) / 2,
           { width: CW - SP[3] * 2, lineBreak: false });

  // ── 3 main data rows ─────────────────────────────────────────────────────────
  // A single-element row spans the full content width; a two-element row splits
  // into two equal halves.
  mainRows.forEach((row, ri) => {
    const rowY    = y + SBAR_H + ri * SCELL_H;
    const bgColor = ri % 2 === 0 ? BRAND_LIGHT : WHITE;
    const isFullW = row.length === 1;

    row.forEach((cell, ci) => {
      const cellX = isFullW ? M       : M + ci * HALF;
      const cellW = isFullW ? CW      : HALF;

      doc.rect(cellX, rowY, cellW, SCELL_H).fill(bgColor);
      doc.rect(cellX, rowY, cellW, SCELL_H).lineWidth(0.3).stroke(BORDER);

      // Label
      doc.fontSize(FS.xxs).font('Helvetica').fillColor(INK_MUTED)
        .text(cell.label, cellX + PAD, rowY + SP[1],
              { width: cellW - PAD * 2, lineBreak: false });

      // Value — set font before computing vertical position
      doc.fontSize(FS.sm).font('Helvetica-Bold').fillColor(INK)
        .text(cell.value,
              cellX + PAD,
              rowY + SP[1] + FS.xxs * 1.2 + 2,
              { width: cellW - PAD * 2, lineBreak: false });
    });
  });

  // ── Full-width VALOR TOTAL row (GOLD) ────────────────────────────────────────
  const valorY = y + SBAR_H + 3 * SCELL_H;

  doc.rect(M, valorY, CW, VALOR_H).fill(GOLD_BG);
  doc.rect(M, valorY, CW, VALOR_H).lineWidth(0.3).stroke(BORDER);

  doc.fontSize(FS.xxs).font('Helvetica').fillColor(GOLD)
    .text('VALOR TOTAL', M + PAD, valorY + SP[1],
          { width: CW - PAD * 2, lineBreak: false });

  doc.fontSize(FS.lg).font('Helvetica-Bold').fillColor(GOLD)
    .text(fmtMoney(stats.totalValue),
          M + PAD, valorY + SP[1] + FS.xxs * 1.2 + 2,
          { width: CW - PAD * 2, align: 'right', lineBreak: false });

  // ── Type / sex breakdown table ────────────────────────────────────────────────
  if (hasBreakdown) {
    const bkBaseY = valorY + VALOR_H;

    // Column header row fill first, then separator rule on top
    doc.rect(M, bkBaseY, CW, BKDN_HDR_H).fill(SURFACE);

    // Section separator (stronger rule) — drawn after fill so it's not covered
    doc.moveTo(M, bkBaseY).lineTo(M + CW, bkBaseY)
       .lineWidth(0.5).stroke(BORDER_STRONG);

    doc.fontSize(FS.xxs).font('Helvetica-Bold').fillColor(INK_MID);
    const colHdrY = bkBaseY + (BKDN_HDR_H - doc.currentLineHeight(true)) / 2;
    BKDN_COLS.forEach((col) => bkCell(doc, col.label, col, colHdrY));

    for (let i = 1; i < BKDN_COLS.length; i++) {
      const cx = BKDN_COLS[i].x;
      doc.moveTo(cx, bkBaseY).lineTo(cx, bkBaseY + BKDN_HDR_H)
         .lineWidth(0.3).stroke(BORDER);
    }
    doc.rect(M, bkBaseY, CW, BKDN_HDR_H).lineWidth(0.3).stroke(BORDER);

    // Data rows
    groups.forEach((group, ri) => {
      const rowY = bkBaseY + BKDN_HDR_H + ri * BKDN_ROW_H;
      const bg   = ri % 2 === 0 ? WHITE : BRAND_LIGHT;

      doc.rect(M, rowY, CW, BKDN_ROW_H).fill(bg);

      // Set font before computing textY
      doc.fontSize(FS.xs).font('Helvetica').fillColor(INK);
      const textY = rowY + (BKDN_ROW_H - doc.currentLineHeight(true)) / 2;

      bkCell(doc, group.specification,                   BKDN_COLS[0], textY);
      bkCell(doc, String(group.count),                   BKDN_COLS[1], textY);
      bkCell(doc, `${fmtWeight(group.totalWeight)} kg`,  BKDN_COLS[2], textY);
      bkCell(doc, `${fmtWeight(group.averageWeight)} kg`, BKDN_COLS[3], textY);

      for (let i = 1; i < BKDN_COLS.length; i++) {
        const cx = BKDN_COLS[i].x;
        doc.moveTo(cx, rowY).lineTo(cx, rowY + BKDN_ROW_H)
           .lineWidth(0.3).stroke(BORDER);
      }
      doc.rect(M, rowY, CW, BKDN_ROW_H).lineWidth(0.3).stroke(BORDER);
    });
  }

  // ── Outer box outline — drawn last so it sits on top of all fills ────────────
  // If drawn first, the 0.5 pt stroke is overwritten by inner fills along the
  // top and left edges, making the border invisible there.
  doc.rect(M, y, CW, BOX_H).lineWidth(0.5).stroke(BORDER);

  doc.y = y + BOX_H;
  doc.fillColor(INK).font('Helvetica');
}

module.exports = { drawSummary };
