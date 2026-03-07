const { exportSheetsExcel, exportSheetPdf } = require('../services/export.service');

async function exportExcelController(req, res, next) {
  try {
    const buffer = await exportSheetsExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="planillas.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return next(error);
  }
}

async function exportSheetPdfController(req, res, next) {
  try {
    const buffer = await exportSheetPdf(Number(req.params.sheetId), req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="planilla-${req.params.sheetId}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  exportExcelController,
  exportSheetPdfController,
};
