const ExcelJS     = require('exceljs');
const PDFDocument = require('pdfkit');
const prisma      = require('../db/prisma');
const { calculateSheetStats } = require('../utils/sheet-calculations');
const { assertCanViewSheet }  = require('./sheet.service');

// ── PDF modules ───────────────────────────────────────────────────────────────

const { M, PAGE_W, PAGE_H, WARM_WHITE, ROW_H, HDR_ROW_H } = require('./pdf/theme');
const { drawHeader }                = require('./pdf/sections/header');
const { drawMetaGrid }              = require('./pdf/sections/meta');
const { drawHighlights }            = require('./pdf/sections/highlights');
const { drawTableHeader, drawRow }  = require('./pdf/sections/table');
const { drawSignature, drawFooter } = require('./pdf/sections/footer');
const { drawOrnamentalRule }        = require('./pdf/layout');

// Re-exported so existing test imports keep working without change.
const { fmtDate, fmtWeight, fmtMoney } = require('./pdf/formatters');

// ── Excel ─────────────────────────────────────────────────────────────────────

async function buildExcelReport(sheets) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Planillas');

  ws.columns = [
    { header: 'Planilla',      key: 'visibleNumber',    width: 14 },
    { header: 'Fecha',         key: 'date',             width: 22 },
    { header: 'Vendedor',      key: 'seller',           width: 24 },
    { header: 'Comprador',     key: 'buyer',            width: 24 },
    { header: 'Liquidador',    key: 'liquidadorAlias',  width: 14 },
    { header: 'Cabezas',       key: 'headCount',        width: 10 },
    { header: 'Peso total',    key: 'totalWeight',      width: 12 },
    { header: 'Promedio',      key: 'averageWeight',    width: 12 },
    { header: 'Precio/cabeza', key: 'pricePerHead',     width: 14 },
    { header: 'Valor total',   key: 'totalValue',       width: 12 },
    { header: 'Pago',          key: 'isPaid',           width: 10 },
  ];

  sheets.forEach((sheet) => {
    ws.addRow({
      visibleNumber:   sheet.visibleNumber,
      date:            sheet.date.toISOString(),
      seller:          sheet.seller.name,
      buyer:           sheet.buyer.name,
      liquidadorAlias: sheet.liquidadorAliasSnapshot,
      headCount:       sheet.headCount,
      totalWeight:     sheet.totalWeight,
      averageWeight:   sheet.averageWeight,
      pricePerHead:    sheet.pricePerHead,
      totalValue:      sheet.totalValue,
      isPaid:          sheet.isPaid ? 'PAGADA' : 'PENDIENTE',
    });
  });

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
}

async function exportSheetsExcel() {
  const sheets = await prisma.weighingSheet.findMany({
    include: {
      seller: { select: { name: true } },
      buyer:  { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return buildExcelReport(sheets);
}

// ── PDF orchestrator ──────────────────────────────────────────────────────────

/**
 * Pure PDF builder — accepts a fully-assembled sheet object (seller, buyer,
 * and rows already included).  Returns a Promise<Buffer>.  No DB access.
 *
 * Draw order:
 *   drawHeader       two-column header: logo left, planilla info right
 *   drawMetaGrid     2×2 bordered metadata grid (vendor, buyer, liquidador, price)
 *   drawHighlights   compact 4-cell stats strip above the table
 *   drawTableHeader  dark-green column header row (repeated on each new page)
 *   drawRow ×N       one row per CattleRow, triggers page breaks internally
 *   drawSummary      RESUMEN box with full stats + male/female breakdown
 *   drawSignature    signature line (kept on same page as summary)
 *   drawFooter ×P    "Página X de Y" stamped on every page in a post-pass
 */
function buildSheetPdf(sheet) {
  return new Promise((resolve, reject) => {
    const stats = calculateSheetStats(sheet.rows, sheet.pricePerHead);

    // bufferPages:true keeps all pages in memory so drawFooter can
    // switchToPage() and stamp the total count after all content is drawn.
    const doc    = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
    const chunks = [];

    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   ()      => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Warm page background — drawn before content on every page so all
    // subsequent fills sit on a refined cream ground rather than raw white.
    const paintPageBg = () => {
      doc.save();
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(WARM_WHITE);
      doc.restore();
    };
    paintPageBg(); // first page (already created by constructor)
    doc.on('pageAdded', paintPageBg);

    drawHeader(doc, sheet);
    drawMetaGrid(doc, sheet);
    drawOrnamentalRule(doc, doc.y - 8); // centred in the gap between meta and highlights
    drawHighlights(doc, stats);
    drawOrnamentalRule(doc, doc.y - 8); // centred in the gap between highlights and table
    // Table uses pre-numbered 30-slot blocks, one block per page.
    // Before each block we check whether HDR_ROW_H + 30×ROW_H fits in the
    // remaining space; if not, a new page is added.  Unused slots within a
    // block are drawn as blank rows so every page shows a complete grid.
    const BLOCK  = 30;
    const blockH = HDR_ROW_H + BLOCK * ROW_H;
    const blockCount = Math.ceil(Math.max(sheet.rows.length, 1) / BLOCK);

    for (let b = 0; b < blockCount; b++) {
      const remaining = doc.page.height - doc.y - doc.page.margins.bottom;
      if (remaining < blockH) doc.addPage();
      drawTableHeader(doc);
      for (let i = 0; i < BLOCK; i++) {
        const slotIndex = b * BLOCK + i;
        drawRow(doc, sheet.rows[slotIndex] ?? null, slotIndex);
      }
    }
    drawSignature(doc, sheet);

    // Post-pass: stamp page numbers now that the total count is known.
    const { start, count } = doc.bufferedPageRange();
    for (let i = 0; i < count; i++) {
      doc.switchToPage(start + i);
      drawFooter(doc, i + 1, count, sheet.visibleNumber);
    }

    doc.flushPages();
    doc.end();
  });
}

async function exportSheetPdf(sheetId, user) {
  const sheet = await prisma.weighingSheet.findUnique({
    where:   { id: sheetId },
    include: {
      seller: true,
      buyer:  true,
      rows:   { orderBy: { rowOrder: 'asc' } },
    },
  });

  if (!sheet) {
    const err = new Error('Sheet not found');
    err.statusCode = 404;
    throw err;
  }

  assertCanViewSheet(user, sheet);

  const buffer = await buildSheetPdf(sheet);
  return { buffer, visibleNumber: sheet.visibleNumber };
}

module.exports = {
  exportSheetsExcel,
  exportSheetPdf,
  buildSheetPdf,
  // Formatters re-exported for backward compatibility with test imports.
  fmtDate,
  fmtWeight,
  fmtMoney,
};
