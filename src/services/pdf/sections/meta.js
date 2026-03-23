const {
  M, CW, SP, FS,
  BRAND_MID, BRAND_LIGHT,
  BORDER, INK, INK_MID, INK_MUTED,
} = require('../theme');
const { truncate } = require('../layout');

// ── Layout constants ───────────────────────────────────────────────────────────

const DETAIL_H = 54;  // tall row: VENDEDOR | COMPRADOR (name + phone + cédula)
const BAR_W    = 3;   // left accent bar width (pts)
const PAD_L    = BAR_W + SP[2]; // text left offset: bar(3) + gap(8) = 11 pts
const PAD_R    = SP[1];         // text right breathing gap = 4 pts

// Vertical offsets within DETAIL cell — all derived so arithmetic stays clear
const LABEL_DY = SP[1];                    //  4 — eyebrow label
const NAME_DY  = LABEL_DY + FS.xxs * 1.2 + 2; // 14 — name line (2 pt gap after label)
const PHONE_DY = NAME_DY  + FS.md  * 1.2 + 2; // 29 — phone sub-line
const CED_DY   = PHONE_DY + FS.xs  * 1.2 + 2; // 40 — cédula sub-line

/**
 * Metadata block drawn immediately below the masthead rule.
 *
 *   Row 1 (DETAIL_H = 54 pt) — left half / right half
 *     VENDEDOR / COMPRADOR: name (bold, truncated) · phone · cédula
 *     Missing phone or cédula shows an em-dash (—) so row height is constant.
 *
 * doc.y is advanced past the row + SP[4] breathing gap.
 */
function drawMetaGrid(doc, sheet) {
  const y    = doc.y;
  const HALF = CW / 2;
  const textW = HALF - PAD_L - PAD_R;

  // ── Row 1: VENDEDOR | COMPRADOR ─────────────────────────────────────────────

  const parties = [
    {
      label:  'VENDEDOR',
      name:   sheet.seller.name,
      phone:  sheet.seller.phone  ?? null,
      cedula: sheet.seller.cedula ?? null,
    },
    {
      label:  'COMPRADOR',
      name:   sheet.buyer.name,
      phone:  sheet.buyer.phone  ?? null,
      cedula: sheet.buyer.cedula ?? null,
    },
  ];

  parties.forEach((party, ci) => {
    const cellX = M + ci * HALF;

    // Background + accent bar
    doc.rect(cellX, y, HALF, DETAIL_H).fill(BRAND_LIGHT);
    doc.rect(cellX, y, BAR_W, DETAIL_H).fill(BRAND_MID);

    // Eyebrow label
    doc.fontSize(FS.xxs).font('Helvetica').fillColor(INK_MUTED)
      .text(party.label, cellX + PAD_L, y + LABEL_DY,
            { width: textW, lineBreak: false });

    // Name — truncated with ellipsis if too wide for the cell
    doc.fontSize(FS.md).font('Helvetica-Bold');
    const nameStr = truncate(doc, party.name, textW);
    doc.fillColor(INK)
      .text(nameStr, cellX + PAD_L, y + NAME_DY,
            { width: textW, lineBreak: false });

    // Phone sub-line
    const phoneStr = party.phone ? `Tel. ${party.phone}` : 'Tel. \u2014';
    doc.fontSize(FS.xs).font('Helvetica')
      .fillColor(party.phone ? INK_MID : INK_MUTED)
      .text(phoneStr, cellX + PAD_L, y + PHONE_DY,
            { width: textW, lineBreak: false });

    // Cédula sub-line
    const cedStr = party.cedula ? `C.C. ${party.cedula}` : 'C.C. \u2014';
    doc.fillColor(party.cedula ? INK_MID : INK_MUTED)
      .text(cedStr, cellX + PAD_L, y + CED_DY,
            { width: textW, lineBreak: false });
  });

  // Center separator + outer border
  doc.moveTo(M + HALF, y).lineTo(M + HALF, y + DETAIL_H)
     .lineWidth(0.5).stroke(BORDER);
  doc.rect(M, y, CW, DETAIL_H).lineWidth(0.5).stroke(BORDER);

  doc.y = y + DETAIL_H + SP[4]; // SP[4] = 16 pt — consistent section gap
  doc.fillColor(INK).font('Helvetica');
}

module.exports = { drawMetaGrid };
