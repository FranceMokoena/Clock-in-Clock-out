const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUTPUT_DIR = path.join(__dirname, '../../reports');

const ensureDir = () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
};

const sanitizeFilePart = (value) => String(value || '')
  .replace(/[^a-zA-Z0-9-_]+/g, '_')
  .slice(0, 80);

const generateReportPdf = (report) => {
  ensureDir();
  const reportType = sanitizeFilePart(report.reportType || 'report');
  const periodKey = sanitizeFilePart(report.periodKey || 'period');
  const ownerType = sanitizeFilePart(report.ownerType || 'owner');
  const ownerId = sanitizeFilePart(report.ownerId || 'unknown');
  const fileName = `${reportType}_${periodKey}_${ownerType}_${ownerId}.pdf`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text('Auto Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Report Type: ${report.reportType}`);
  doc.text(`Owner: ${report.ownerType}`);
  if (report.periodStart && report.periodEnd) {
    doc.text(`Period: ${new Date(report.periodStart).toLocaleString()} - ${new Date(report.periodEnd).toLocaleString()}`);
  }
  doc.text(`Generated: ${new Date(report.generatedAt || Date.now()).toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(13).text('Summary', { underline: true });
  doc.fontSize(11);
  doc.text(`Total staff: ${report.summary?.totalStaff ?? 0}`);
  doc.text(`Total days: ${report.summary?.totalDays ?? 0}`);
  doc.text(`Late clock-ins: ${report.summary?.totalLate ?? 0}`);
  doc.text(`Total hours: ${report.summary?.totalHours ?? 0}`);
  doc.moveDown();

  report.staff?.forEach((staff, index) => {
    doc.fontSize(12).text(`${index + 1}. ${staff.name} ${staff.surname} (${staff.role || 'Staff'})`, { continued: false });
    doc.fontSize(10).text(`Department: ${staff.department || 'N/A'} | Host Company: ${staff.hostCompanyName || 'N/A'}`);
    if (staff.expectedClockIn) {
      doc.text(`Expected Clock-In: ${staff.expectedClockIn}`);
    }
    doc.moveDown(0.3);

    (staff.days || []).forEach((day) => {
      doc.text(`- ${day.date}: In ${day.clockIn || '--'} | Break ${day.breakStart || '--'} - ${day.breakEnd || '--'} | Out ${day.clockOut || '--'} | Late ${day.lateMinutes != null ? day.lateMinutes + ' min' : '--'}`);
    });

    doc.moveDown();
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve({ filePath, fileName }));
    stream.on('error', reject);
  });
};

module.exports = {
  generateReportPdf,
};
