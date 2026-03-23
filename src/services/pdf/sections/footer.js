const { M, CW, SP, FS, BORDER, BORDER_STRONG, INK_MUTED } = require('../theme');
const { ensureSpace } = require('../layout');

const SIG_ZONE_H = 60; // total height consumed by the signature zone (pts)

/**
 * Two-panel signature block drawn after the last table row.
 *
 * Reserves enough space to avoid being orphaned at the top of a new page,
 * then draws a FIRMA Y SELLO box on the left and a SELLO stamp placeholder
 * on the right.
 *
 * Total height consumed = SP[3] (gap) + SIG_ZONE_H = 72 pt.
 */
function drawSignature(doc, sheet) {
  ensureSpace(doc, SP[3] + SIG_ZONE_H);
  doc.y += SP[3]; // fixed 12 pt gap — no doc.moveDown font dependency

  const y = doc.y;

  // Layout: FIRMA Y SELLO box (left ~58 %) + gap + SELLO stamp box (right ~38 %)
  const firmaW = Math.round(CW * 0.58); // ≈ 299 pt
  const selloW = Math.round(CW * 0.36); // ≈ 186 pt
  const gap    = CW - firmaW - selloW;  // remaining space as gutter
  const firmaX = M;
  const selloX = M + firmaW + gap;
  const boxH   = 48; // fits within SIG_ZONE_H = 60 with a 12 pt bottom margin
  const pad    = SP[2]; // 8 pt inner text padding

  // ── FIRMA Y SELLO box ────────────────────────────────────────────────────────
  doc.rect(firmaX, y, firmaW, boxH).lineWidth(0.5).stroke(BORDER);

  // "FIRMA Y SELLO" eyebrow label
  doc.fontSize(FS.xxs).font('Helvetica').fillColor(INK_MUTED)
    .text('FIRMA Y SELLO', firmaX + pad, y + SP[1],
          { width: firmaW - pad * 2, align: 'center', lineBreak: false });

  // Dashed signature line — inset from box edges
  const lineY = y + 30;
  doc.moveTo(firmaX + SP[3], lineY).lineTo(firmaX + firmaW - SP[3], lineY)
     .dash(3, { space: 2 }).lineWidth(0.5).stroke('#aaaaaa').undash();

  // Liquidador alias below the line
  doc.fontSize(FS.xs).font('Helvetica').fillColor(INK_MUTED)
    .text(sheet.liquidadorAliasSnapshot || '', firmaX + pad, lineY + 4,
          { width: firmaW - pad * 2, align: 'center', lineBreak: false });

  // ── SELLO (stamp) placeholder box ────────────────────────────────────────────
  doc.rect(selloX, y, selloW, boxH).lineWidth(0.5).stroke(BORDER);

  doc.fontSize(FS.xxs).font('Helvetica').fillColor(INK_MUTED)
    .text('SELLO', selloX, y + (boxH - doc.currentLineHeight(true)) / 2,
          { width: selloW, align: 'center', lineBreak: false });

  doc.y = y + SIG_ZONE_H;
}

/**
 * Branded footer: hairline rule + company identity (left) + page number (right).
 *
 * Written to every page in the post-content buffered pass inside buildSheetPdf
 * after all content is finalised, so the total page count is known.
 *
 * The footer sits within the bottom margin (below the content area) so it
 * never overlaps table rows or the summary box.
 *
 * @param {string} [visibleNumber]  Planilla number for left identity stamp.
 */
function drawFooter(doc, pageNum, total, visibleNumber) {
  const savedBottom   = doc.page.margins.bottom;          // M = 40
  const contentBottom = doc.page.height - savedBottom;    // 801.89
  const ruleY = contentBottom;
  const textY = ruleY + SP[1]; // 4 pt into the bottom margin = 805.89

  // Hairline rule at the content area bottom edge — path ops are absolute,
  // no page-break check is applied.
  doc.moveTo(M, ruleY).lineTo(M + CW, ruleY)
     .lineWidth(0.5).stroke(BORDER_STRONG);

  // doc.text() triggers PDFKit's auto-page-break check before rendering each
  // line.  textY (805.89) is below the normal content boundary (801.89), so
  // every call would fire addPage() and produce phantom extra pages.
  // Zeroing margins.bottom raises the threshold to PAGE_H (841.89), safely
  // above textY.  The margin is restored immediately after.
  doc.page.margins.bottom = 0;

  // Left: company identity
  if (visibleNumber) {
    doc.fontSize(FS.xxs).font('Helvetica').fillColor(INK_MUTED)
      .text(`BASCULA LA ESPERANZA \u00B7 ${visibleNumber}`, M, textY,
            { width: CW / 2, lineBreak: false });
  }

  // Right: page number
  doc.fontSize(FS.xxs).font('Helvetica').fillColor(INK_MUTED)
    .text(`Pagina ${pageNum} de ${total}`, M, textY,
          { width: CW, align: 'right', lineBreak: false });

  doc.page.margins.bottom = savedBottom;
}

module.exports = { drawSignature, drawFooter };
