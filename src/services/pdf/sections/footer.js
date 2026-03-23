const { M, CW, SP, FS, BORDER_STRONG, INK_MUTED } = require('../theme');

// Height of the signature zone — must match the SIG_H constant in summary.js
// so ensureSpace reserves exactly the right amount of space.
const SIG_ZONE_H = 60;

/**
 * Dashed signature line drawn immediately below the summary box.
 *
 * Uses a fixed SP[3] gap (not doc.moveDown) so the spacing between the
 * summary and the signature is always 12 pt regardless of which font the
 * summary left active.
 *
 * Total height consumed = SP[3] (gap) + SIG_ZONE_H = 72 pt.
 * This must stay ≥ the SIG_H reserved in summary.js (currently 72 pt).
 */
function drawSignature(doc, sheet) {
  doc.y += SP[3]; // fixed 12 pt gap — no doc.moveDown font dependency

  const y         = doc.y;
  const lineStart = M + 6;
  const lineEnd   = M + CW / 2 - SP[5]; // half-width signature box

  // Dashed underline
  doc.moveTo(lineStart, y + 22).lineTo(lineEnd, y + 22)
     .dash(3, { space: 2 }).lineWidth(0.5).stroke('#aaaaaa').undash();

  doc.fontSize(FS.xs).font('Helvetica').fillColor(INK_MUTED)
    .text(`Firma  (${sheet.liquidadorAliasSnapshot})`, lineStart, y + 26,
          { width: lineEnd - lineStart, lineBreak: false });

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
