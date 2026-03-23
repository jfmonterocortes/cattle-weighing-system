const fs   = require('fs');
const path = require('path');

const {
  M, PAGE_W, CW, SP, FS,
  BRAND, BORDER_STRONG,
  GOLD, GOLD_BG, GOLD_STROKE,
  RED, RED_BG, RED_STROKE,
  INK, INK_MID, INK_MUTED,
} = require('../theme');
const { fmtDate } = require('../formatters');

// ── Logo asset ────────────────────────────────────────────────────────────────
// Buffer is read once at module load.  PDFKit deduplicates image streams so the
// same buffer is embedded only once per document regardless of how many times
// doc.openImage() is called with it.
//
// File-size note: PDFKit embeds the raw PNG bytes regardless of the rendered
// width.  To reduce output size, replace the source with a pre-compressed copy
// (≈200×200 px at 72 dpi); the visual result at the rendered size is identical.
const LOGO_PATH   = path.join(process.cwd(), 'client', 'public', 'logo-bascula-la-esperanza.png');
const LOGO_BUFFER = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : null;

// ── Masthead geometry ─────────────────────────────────────────────────────────

const STRIP_H    = 3;                   // brand colour top strip (pts)
const HEADER_H   = 72;                  // white masthead area (pts)
const MASTHEAD_H = STRIP_H + HEADER_H; // = 75 pts total
const LOGO_MAX_W = 64;                  // maximum rendered logo width (pts)
const LOGO_INSET = SP[1];               // vertical padding within the header area

// ── Right-column vertical layout ──────────────────────────────────────────────
// Items stack: eyebrow → planilla number → date → status pill.
// All gaps are ITEM_GAP so the entire block fits comfortably within MASTHEAD_H.
//
// Verification (absolute page coords):
//   eyebrowY                                        =  9.0
//   numberY  = 9.0  + FS.xxs×1.2(7.8) + 2         = 18.8
//   dateY    = 18.8 + FS.xl×1.2(21.6) + 2          = 42.4
//   pillY    = 42.4 + FS.xs×1.2(9.0)  + 2          = 53.4
//   pill bottom = 53.4 + PILL_H(14)                 = 67.4  < MASTHEAD_H(75) ✓

const ITEM_GAP  = 2;  // gap between stacked header items (pts)
const PILL_H    = 14; // pill height: FS.xxs line (≈7.8) + 3 pt inset each side

const eyebrowY = STRIP_H + 6;
const numberY  = eyebrowY + FS.xxs * 1.2 + ITEM_GAP;
const dateY    = numberY  + FS.xl  * 1.2 + ITEM_GAP;
const pillY    = dateY    + FS.xs  * 1.2 + ITEM_GAP;

/**
 * Premium masthead header.
 *
 * Structure (top → bottom):
 *   y=0   – 3 pt BRAND colour strip, full page width
 *   y=3   – 72 pt white header area
 *     left  — logo (up to 64 pt wide, height-capped, centred)
 *     right — eyebrow label · planilla number (FS.xl bold) · date · status pill
 *   y=75  – BORDER_STRONG hairline rule
 *
 * doc.y is set to MASTHEAD_H + SP[3] = 87 after drawing.
 *
 * Logo sizing: both dimensions are capped so the logo always fits inside the
 * 72 pt header regardless of the source asset's aspect ratio.
 *
 * Pill overflow prevention: Y positions above are computed so pill bottom
 * (≈67 pt) stays well clear of the hairline rule at MASTHEAD_H (75 pt).
 */
function drawHeader(doc, sheet) {
  // 1. Brand strip (full-width bleed at absolute y = 0, before the margin)
  doc.rect(0, 0, PAGE_W, STRIP_H).fill(BRAND);

  // 2. Logo — capped to LOGO_MAX_W wide and (HEADER_H − 2×INSET) tall
  let logoW = 0;
  if (LOGO_BUFFER) {
    const img      = doc.openImage(LOGO_BUFFER);
    const maxLogoH = HEADER_H - LOGO_INSET * 2;      // 64 pt
    let   dispW    = LOGO_MAX_W;
    let   dispH    = (img.height / img.width) * dispW;
    if (dispH > maxLogoH) {
      dispH = maxLogoH;
      dispW = (img.width / img.height) * maxLogoH;
    }
    const logoY = STRIP_H + (HEADER_H - dispH) / 2;
    doc.image(img, M, logoY, { width: dispW });
    logoW = dispW;
  }

  // 3. Right information column — spans all space after the logo so long
  //    planilla numbers ("Planilla 2026-001" at FS.xl bold) never clip.
  const TX = M + logoW + (logoW > 0 ? SP[3] : 0);
  const TW = M + CW - TX;

  // Eyebrow
  doc.fontSize(FS.xxs).font('Helvetica').fillColor(INK_MUTED)
    .text('BASCULA LA ESPERANZA', TX, eyebrowY,
          { width: TW, align: 'right', lineBreak: false });

  // Planilla number
  doc.fontSize(FS.xl).font('Helvetica-Bold').fillColor(INK)
    .text(`Planilla ${sheet.visibleNumber}`, TX, numberY,
          { width: TW, align: 'right', lineBreak: false });

  // Date
  doc.fontSize(FS.xs).font('Helvetica').fillColor(INK_MID)
    .text(fmtDate(sheet.date), TX, dateY,
          { width: TW, align: 'right', lineBreak: false });

  // Status pill — measured then right-aligned at the content edge
  const pillLabel  = sheet.isPaid ? 'PAGADA' : 'PENDIENTE';
  const pillFg     = sheet.isPaid ? GOLD       : RED;
  const pillBg     = sheet.isPaid ? GOLD_BG    : RED_BG;
  const pillStroke = sheet.isPaid ? GOLD_STROKE : RED_STROKE;

  doc.fontSize(FS.xxs).font('Helvetica-Bold');
  const pillW = doc.widthOfString(pillLabel) + SP[2] * 2; // SP[2] = 8 pt each side
  const pillX = M + CW - pillW;

  // Single fillAndStroke keeps the path consistent (no double-draw artifacts)
  doc.lineWidth(0.5)
     .roundedRect(pillX, pillY, pillW, PILL_H, 3)
     .fillAndStroke(pillBg, pillStroke);

  doc.fillColor(pillFg)
    .text(pillLabel, pillX, pillY + (PILL_H - doc.currentLineHeight(true)) / 2,
          { width: pillW, align: 'center', lineBreak: false });

  // 4. Bottom hairline rule at MASTHEAD_H
  doc.moveTo(M, MASTHEAD_H).lineTo(M + CW, MASTHEAD_H)
     .lineWidth(0.5).stroke(BORDER_STRONG);

  doc.y = MASTHEAD_H + SP[3]; // = 87
  doc.fontSize(FS.sm).fillColor(INK).font('Helvetica');
}

module.exports = { drawHeader };
