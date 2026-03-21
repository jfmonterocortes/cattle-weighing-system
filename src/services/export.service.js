const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = require('../db/prisma');
const { calculateSheetStats } = require('../utils/sheet-calculations');
const { assertCanViewSheet } = require('./sheet.service');

async function buildExcelReport(sheets) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Planillas');

  ws.columns = [
    { header: 'Planilla', key: 'visibleNumber', width: 14 },
    { header: 'Fecha', key: 'date', width: 22 },
    { header: 'Vendedor', key: 'seller', width: 24 },
    { header: 'Comprador', key: 'buyer', width: 24 },
    { header: 'Liquidador', key: 'liquidadorAlias', width: 14 },
    { header: 'Cabezas', key: 'headCount', width: 10 },
    { header: 'Peso total', key: 'totalWeight', width: 12 },
    { header: 'Promedio', key: 'averageWeight', width: 12 },
    { header: 'Precio/cabeza', key: 'pricePerHead', width: 14 },
    { header: 'Valor total', key: 'totalValue', width: 12 },
    { header: 'Pago', key: 'isPaid', width: 10 },
  ];

  sheets.forEach((sheet) => {
    ws.addRow({
      visibleNumber: sheet.visibleNumber,
      date: sheet.date.toISOString(),
      seller: sheet.seller.name,
      buyer: sheet.buyer.name,
      liquidadorAlias: sheet.liquidadorAliasSnapshot,
      headCount: sheet.headCount,
      totalWeight: sheet.totalWeight,
      averageWeight: sheet.averageWeight,
      pricePerHead: sheet.pricePerHead,
      totalValue: sheet.totalValue,
      isPaid: sheet.isPaid ? 'PAGADA' : 'PENDIENTE',
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
      buyer: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return buildExcelReport(sheets);
}

// ── Formatters ────────────────────────────────────────────────────────────────

const LOCALE = 'es-CO';
const TZ     = 'America/Bogota';

function fmtDate(date) {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

function fmtWeight(kg) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(kg);
}

function fmtMoney(amount) {
  return new Intl.NumberFormat(LOCALE, {
    style:                 'currency',
    currency:              'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Logo asset ────────────────────────────────────────────────────────────────

// Buffer is read once at module load; every PDF export reuses the same object.
const LOGO_PATH = path.join(process.cwd(), 'client', 'public', 'logo-bascula-la-esperanza.png');
const LOGO_BUFFER = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH) : null;

// Gap (pts) between the bottom of the rendered logo and the next text line.
const LOGO_BELOW_GAP = 12;

// ── PDF layout helpers ────────────────────────────────────────────────────────

// Fixed X positions (pts from left margin) for each table column.
const COL = {
  num:    42,   // Nº
  spec:   72,   // Especificación
  weight: 260,  // Kilos
  cattle: 320,  // Nº Res
  letters: 390, // Letras
};

function ensurePageSpace(doc, neededPts) {
  const bottomMargin = doc.page.margins.bottom;
  const remaining = doc.page.height - doc.y - bottomMargin;
  if (remaining < neededPts) {
    doc.addPage();
    drawTableHeader(doc);
  }
}

function drawHeader(doc, sheet) {
  if (LOGO_BUFFER) {
    const img        = doc.openImage(LOGO_BUFFER);
    const pageWidth  = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const logoWidth  = Math.min(220, pageWidth);
    const logoX      = doc.page.margins.left + (pageWidth - logoWidth) / 2;
    const logoY      = doc.y;
    const renderedH  = (img.height / img.width) * logoWidth;
    doc.image(img, logoX, logoY, { width: logoWidth });
    doc.y = logoY + renderedH + LOGO_BELOW_GAP;
  }

  doc.fontSize(11).text('BASCULA LA ESPERANZA', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(16).text('Planilla ' + sheet.visibleNumber, { align: 'center' });
  doc.moveDown(0.7);

  doc.fontSize(10);
  doc.text(`Fecha: ${fmtDate(sheet.date)}`);
  doc.text(`Vendedor: ${sheet.seller.name}`);
  doc.text(`Comprador: ${sheet.buyer.name}`);
  doc.text(`Liquidador: ${sheet.liquidadorAliasSnapshot}`);
  doc.text(`Estado de pago: ${sheet.isPaid ? 'Pagada' : 'Pendiente'}`);
  doc.moveDown(0.8);
}

function drawTableHeader(doc) {
  const y = doc.y;
  doc.fontSize(10);
  doc.text('Nº',              COL.num,     y, { underline: true, continued: false });
  doc.text('Especificación',  COL.spec,    y, { underline: true, continued: false });
  doc.text('Kilos',           COL.weight,  y, { underline: true, continued: false });
  doc.text('Nº Res',          COL.cattle,  y, { underline: true, continued: false });
  doc.text('Letras',          COL.letters, y, { underline: true, continued: false });
  doc.moveDown(0.4);
}

function drawRow(doc, row) {
  ensurePageSpace(doc, 14);
  const y = doc.y;
  const spec = `${row.type.toUpperCase()} ${row.sex.toUpperCase()}`;
  doc.fontSize(10);
  doc.text(String(row.rowOrder),    COL.num,     y, { continued: false });
  doc.text(spec,                    COL.spec,    y, { continued: false });
  doc.text(fmtWeight(row.weight),   COL.weight,  y, { continued: false });
  doc.text(String(row.cattleNumber),COL.cattle,  y, { continued: false });
  if (row.letters) {
    doc.text(row.letters,           COL.letters, y, { continued: false });
  }
  // Restore doc.y to below the row — calling doc.text with an empty string
  // at an explicit y resets the cursor back to y, so we set it explicitly.
  doc.y = y + doc.currentLineHeight();
  doc.moveDown(0.2);
}

function drawSummary(doc, stats, sheet) {
  ensurePageSpace(doc, 120);
  doc.moveDown(0.8);
  doc.fontSize(10);
  doc.text(`Cabezas: ${stats.headCount}`);
  doc.text(`Peso total: ${fmtWeight(stats.totalWeight)}`);
  doc.text(`Promedio general: ${fmtWeight(stats.averageWeight)}`);
  doc.text(`Total machos: ${fmtWeight(stats.totalMaleWeight)} / Promedio machos: ${fmtWeight(stats.averageMaleWeight)}`);
  doc.text(`Total hembras: ${fmtWeight(stats.totalFemaleWeight)} / Promedio hembras: ${fmtWeight(stats.averageFemaleWeight)}`);
  doc.text(`Precio por cabeza: ${fmtMoney(sheet.pricePerHead)}`);
  doc.text(`Valor total: ${fmtMoney(stats.totalValue)}`);
  doc.moveDown(1.2);
  doc.text(`Firma (iniciales): ${sheet.liquidadorAliasSnapshot}`);
}

// ── Export functions ──────────────────────────────────────────────────────────

// Pure PDF builder — accepts a fully-assembled sheet object (with .seller,
// .buyer, .rows already included). Returns a Buffer. No DB access.
function buildSheetPdf(sheet) {
  const stats = calculateSheetStats(sheet.rows, sheet.pricePerHead);

  const doc = new PDFDocument({ size: 'A4', margin: 42 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  drawHeader(doc, sheet);
  drawTableHeader(doc);
  sheet.rows.forEach((row) => drawRow(doc, row));
  drawSummary(doc, stats, sheet);

  const endPromise = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.end();

  return endPromise;
}

async function exportSheetPdf(sheetId, user) {
  const sheet = await prisma.weighingSheet.findUnique({
    where: { id: sheetId },
    include: {
      seller: true,
      buyer: true,
      rows: { orderBy: { rowOrder: 'asc' } },
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
  fmtDate,
  fmtWeight,
  fmtMoney,
};


