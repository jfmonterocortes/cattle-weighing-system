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

  const stats = calculateSheetStats(sheet.rows, sheet.pricePerHead);

  const doc = new PDFDocument({ size: 'A4', margin: 42 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const logoPath = path.join(process.cwd(), 'client', 'public', 'logo-bascula-la-esperanza.png');
  if (fs.existsSync(logoPath)) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const logoWidth = Math.min(220, pageWidth);
    const logoX = doc.page.margins.left + (pageWidth - logoWidth) / 2;
    doc.image(logoPath, logoX, doc.y, { width: logoWidth });
    doc.moveDown(2.7);
  }

  doc.fontSize(11).text('BASCULA LA ESPERANZA', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(16).text('Planilla ' + sheet.visibleNumber, { align: 'center' });
  doc.moveDown(0.7);

  doc.fontSize(10);
  doc.text(`Fecha: ${sheet.date.toLocaleString()}`);
  doc.text(`Vendedor: ${sheet.seller.name}`);
  doc.text(`Comprador: ${sheet.buyer.name}`);
  doc.text(`Liquidador: ${sheet.liquidadorAliasSnapshot}`);
  doc.text(`Estado de pago: ${sheet.isPaid ? 'Pagada' : 'Pendiente'}`);
  doc.moveDown(0.8);

  doc.text('Nº  Especificación             Kilos   Nº Res   Letras', { underline: true });
  sheet.rows.forEach((row) => {
    const spec = `${row.type.toUpperCase()} ${row.sex.toUpperCase()}`;
    doc.text(
      `${String(row.rowOrder).padEnd(3)} ${spec.padEnd(26)} ${String(row.weight).padEnd(7)} ${String(
        row.cattleNumber
      ).padEnd(8)} ${row.letters || ''}`
    );
  });

  doc.moveDown(0.8);
  doc.text(`Cabezas: ${stats.headCount}`);
  doc.text(`Peso total: ${stats.totalWeight}`);
  doc.text(`Promedio general: ${stats.averageWeight}`);
  doc.text(`Total machos: ${stats.totalMaleWeight} / Promedio machos: ${stats.averageMaleWeight}`);
  doc.text(`Total hembras: ${stats.totalFemaleWeight} / Promedio hembras: ${stats.averageFemaleWeight}`);
  doc.text(`Precio por cabeza: ${sheet.pricePerHead}`);
  doc.text(`Valor total: ${stats.totalValue}`);
  doc.moveDown(1.2);
  doc.text(`Firma (iniciales): ${sheet.liquidadorAliasSnapshot}`);

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = {
  exportSheetsExcel,
  exportSheetPdf,
};


