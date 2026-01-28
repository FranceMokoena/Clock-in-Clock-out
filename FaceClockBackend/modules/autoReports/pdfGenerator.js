const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUTPUT_DIR = path.join(__dirname, '../../reports');

const THEME = {
  primary: '#1f2a44',
  accent: '#3166AE',
  muted: '#6b7280',
  text: '#1f2a44',
  border: '#e2e8f0',
  cardBg: '#f8fafc',
  calloutBg: '#eef2f7',
  tableAlt: '#f9fbfd',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
};

const ensureDir = () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
};

const sanitizeFilePart = (value) => String(value || '')
  .replace(/[^a-zA-Z0-9-_]+/g, '_')
  .slice(0, 80);

const safeText = (value, fallback = 'N/A') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const formatDateTime = (value, timezone) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  if (timezone) options.timeZone = timezone;
  try {
    return date.toLocaleString('en-US', options);
  } catch {
    return date.toLocaleString('en-US', options);
  }
};

const formatDate = (value, timezone) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  if (timezone) options.timeZone = timezone;
  try {
    return date.toLocaleDateString('en-US', options);
  } catch {
    return date.toLocaleDateString('en-US', options);
  }
};

const formatNumber = (value, digits = 0) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0';
  return numeric.toFixed(digits);
};

const formatHoursFromMinutes = (minutes) => formatNumber((Number(minutes) || 0) / 60, 2);

const reportTypeLabel = (reportType) => {
  switch (reportType) {
    case 'late':
      return 'Late Clock-In Alert Report';
    case 'missing':
      return 'Missing Clock-In Report';
    default:
      return 'Attendance Summary Report';
  }
};

const reportFocusText = (reportType) => {
  switch (reportType) {
    case 'late':
      return 'Highlights late clock-ins beyond the configured grace period, with staff-level detail and daily log entries.';
    case 'missing':
      return 'Highlights missing clock-ins for the selected period, with staff profile context and attendance logs.';
    default:
      return 'Summarizes attendance activity, totals, and daily logs for the selected period.';
  }
};

const sumLateMinutes = (days = []) => days.reduce((sum, day) => sum + (day.lateMinutes || 0), 0);

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

  const { left, right, top, bottom } = doc.page.margins;
  const contentWidth = doc.page.width - left - right;
  let pageNumber = 1;

  const drawFooter = () => {
    const footerY = doc.page.height - bottom - 12;
    const currentX = doc.x;
    const currentY = doc.y;
    doc.save();
    doc.fontSize(8).fillColor(THEME.muted).font('Helvetica');
    doc.text('Confidential - Official Use Only', left, footerY, { width: contentWidth, align: 'left' });
    doc.text(`Page ${pageNumber}`, left, footerY, { width: contentWidth, align: 'right' });
    doc.restore();
    doc.x = currentX;
    doc.y = currentY;
  };

  const drawMiniHeader = (title, periodLabel) => {
    doc.save();
    doc.fontSize(9).fillColor(THEME.muted).font('Helvetica-Bold');
    doc.text(`${title} | ${periodLabel}`, left, 16, { width: contentWidth, align: 'left' });
    doc.strokeColor(THEME.border).lineWidth(1);
    doc.moveTo(left, 30).lineTo(left + contentWidth, 30).stroke();
    doc.restore();
    doc.y = top;
  };

  doc.on('pageAdded', () => {
    pageNumber += 1;
    drawMiniHeader(reportTypeLabel(report.reportType), formatDate(report.periodStart, report.timezone) + ' - ' + formatDate(report.periodEnd, report.timezone));
    drawFooter();
  });

  const ensureSpace = (height, onNewPage) => {
    const limit = doc.page.height - bottom - 20;
    if (doc.y + height > limit) {
      doc.addPage();
      if (typeof onNewPage === 'function') onNewPage();
    }
  };

  const drawSectionHeader = (title) => {
    ensureSpace(32);
    doc.save();
    doc.font('Helvetica-Bold').fontSize(11).fillColor(THEME.primary).text(title.toUpperCase(), left, doc.y);
    const lineY = doc.y + 4;
    doc.strokeColor(THEME.border).lineWidth(1);
    doc.moveTo(left, lineY).lineTo(left + contentWidth, lineY).stroke();
    doc.restore();
    doc.y = lineY + 8;
  };

  const drawStatCards = (items) => {
    const gap = 12;
    const cardHeight = 48;
    const cardWidth = (contentWidth - gap * (items.length - 1)) / items.length;
    const startY = doc.y;

    items.forEach((item, index) => {
      const x = left + index * (cardWidth + gap);
      doc.save();
      doc.fillColor(THEME.cardBg);
      doc.strokeColor(THEME.border);
      doc.roundedRect(x, startY, cardWidth, cardHeight, 6).fillAndStroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(THEME.muted)
        .text(item.label.toUpperCase(), x + 10, startY + 8, { width: cardWidth - 20 });
      doc.font('Helvetica-Bold').fontSize(14).fillColor(THEME.primary)
        .text(item.value, x + 10, startY + 22, { width: cardWidth - 20 });
      doc.restore();
    });

    doc.y = startY + cardHeight + 14;
  };

  const writeLabelValueAt = (label, value, x, y, width) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(THEME.muted)
      .text(`${label}: `, x, y, { continued: true, width });
    doc.font('Helvetica').fontSize(9).fillColor(THEME.text)
      .text(safeText(value), { width });
    return doc.y + 2;
  };

  const drawCallout = (text) => {
    const startY = doc.y;
    const textHeight = doc.heightOfString(text, { width: contentWidth - 20 });
    const boxHeight = textHeight + 26;
    doc.save();
    doc.fillColor(THEME.calloutBg);
    doc.roundedRect(left, startY, contentWidth, boxHeight, 6).fill();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(THEME.primary)
      .text('REPORT FOCUS', left + 10, startY + 6);
    doc.font('Helvetica').fontSize(10).fillColor(THEME.text)
      .text(text, left + 10, startY + 18, { width: contentWidth - 20 });
    doc.restore();
    doc.y = startY + boxHeight + 10;
  };

  const drawTableHeader = (columns, rowHeight) => {
    ensureSpace(rowHeight + 10);
    const y = doc.y;
    doc.save();
    doc.fillColor(THEME.accent);
    doc.rect(left, y, contentWidth, rowHeight).fill();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    let x = left + 6;
    columns.forEach((col) => {
      const width = col.width * contentWidth;
      doc.text(col.label, x, y + 5, { width: width - 10, align: col.align || 'left' });
      x += width;
    });
    doc.restore();
    doc.y = y + rowHeight;
  };

  const drawTableRow = (columns, values, y, rowHeight, isAlt) => {
    if (isAlt) {
      doc.save();
      doc.fillColor(THEME.tableAlt);
      doc.rect(left, y, contentWidth, rowHeight).fill();
      doc.restore();
    }
    let x = left + 6;
    values.forEach((value, index) => {
      const col = columns[index];
      const width = col.width * contentWidth;
      const color = value.color || THEME.text;
      doc.font('Helvetica').fontSize(9).fillColor(color)
        .text(value.text, x, y + 5, { width: width - 10, align: col.align || 'left' });
      x += width;
    });
  };

  const reportTitle = reportTypeLabel(report.reportType);
  const periodLabel = report.periodStart && report.periodEnd
    ? `${formatDateTime(report.periodStart, report.timezone)} - ${formatDateTime(report.periodEnd, report.timezone)}`
    : 'N/A';
  const timezoneLabel = report.timezone || 'Local time';
  const totalStaff = report.summary?.totalStaff ?? (report.staff ? report.staff.length : 0);
  const totalDays = report.summary?.totalDays ?? 0;
  const totalLate = report.summary?.totalLate ?? 0;
  const totalHours = report.summary?.totalHours ?? formatNumber((report.summary?.totalMinutes || 0) / 60, 2);
  const departmentScope = report.filters?.includeAllDepartments === false
    ? report.filters?.departmentName || 'Selected department'
    : 'All departments';

  const bannerHeight = 70;
  doc.save();
  doc.fillColor(THEME.primary);
  doc.rect(0, 0, doc.page.width, bannerHeight).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
    .text('Internship Success Clock-in System', left, 22, { width: contentWidth });
  doc.font('Helvetica').fontSize(10)
    .text('Official Auto Attendance Report', left, 45, { width: contentWidth });
  doc.restore();
  doc.fillColor(THEME.accent);
  doc.rect(left, bannerHeight + 8, contentWidth, 2).fill();
  doc.y = bannerHeight + 16;

  drawFooter();

  doc.font('Helvetica-Bold').fontSize(13).fillColor(THEME.primary)
    .text(reportTitle, left, doc.y, { width: contentWidth });
  doc.font('Helvetica').fontSize(10).fillColor(THEME.muted)
    .text(`Report Type: ${safeText(report.reportType, 'N/A')}`, { width: contentWidth });
  doc.text(`Period: ${periodLabel}`, { width: contentWidth });
  doc.text(`Generated: ${formatDateTime(report.generatedAt || Date.now(), report.timezone)} | Timezone: ${timezoneLabel}`, { width: contentWidth });
  doc.text(`Owner: ${safeText(report.ownerType, 'N/A')}${report.ownerId ? ` (${report.ownerId})` : ''}`, { width: contentWidth });
  doc.text(`Department Scope: ${departmentScope}`, { width: contentWidth });
  if (report.metadata?.graceMinutes != null) {
    doc.text(`Grace Period: ${report.metadata.graceMinutes} minutes`, { width: contentWidth });
  }
  doc.moveDown(0.6);

  drawCallout(reportFocusText(report.reportType));

  drawSectionHeader('Summary');
  drawStatCards([
    { label: 'Total Staff', value: formatNumber(totalStaff) },
    { label: 'Total Days', value: formatNumber(totalDays) },
    { label: 'Late Clock-Ins', value: formatNumber(totalLate) },
    { label: 'Total Hours', value: formatNumber(totalHours, 2) },
  ]);

  drawSectionHeader(`Staff Details (${formatNumber(totalStaff)})`);

  if (!report.staff || report.staff.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(THEME.muted)
      .text('No staff records were found for the selected period.', left, doc.y);
  } else {
    report.staff.forEach((staff, index) => {
      const fullName = `${staff.name || ''} ${staff.surname || ''}`.trim() || 'Unknown Staff';
      const roleLabel = staff.role || 'Staff';

      ensureSpace(140);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(THEME.primary)
        .text(`${index + 1}. ${fullName}`, left, doc.y, { width: contentWidth });
      doc.font('Helvetica').fontSize(10).fillColor(THEME.muted)
        .text(`${roleLabel} | Staff ID: ${safeText(staff.staffId)}`, { width: contentWidth });
      doc.moveDown(0.4);

      const columnGap = 18;
      const columnWidth = (contentWidth - columnGap) / 2;
      const leftX = left;
      const rightX = left + columnWidth + columnGap;
      const startY = doc.y;

      const leftItems = [
        { label: 'ID Number', value: staff.idNumber },
        { label: 'Email', value: staff.email },
        { label: 'Phone', value: staff.phoneNumber },
        { label: 'Department', value: staff.department },
        { label: 'Host Company', value: staff.hostCompanyName },
        { label: 'Mentor', value: staff.mentorName },
        { label: 'Location', value: staff.location },
        { label: 'Address', value: staff.locationAddress },
        { label: 'Coordinates', value: staff.locationLatitude != null && staff.locationLongitude != null ? `${staff.locationLatitude}, ${staff.locationLongitude}` : 'N/A' },
        { label: 'Status', value: staff.isActive === false ? 'Inactive' : 'Active' },
        { label: 'Joined', value: staff.createdAt ? formatDateTime(staff.createdAt, report.timezone) : 'N/A' },
        { label: 'Rotation', value: staff.rotationDepartment ? `${staff.rotationDepartment} (${staff.rotationStatus || 'active'})` : 'N/A' },
      ];

      const rightItems = [
        { label: 'Expected Clock-In', value: staff.expectedClockIn },
        { label: 'Expected Clock-Out', value: staff.expectedClockOut },
        { label: 'Break Window', value: staff.breakStartTime || staff.breakEndTime ? `${staff.breakStartTime || '--'} - ${staff.breakEndTime || '--'}` : 'N/A' },
        { label: 'Extra Hours', value: staff.extraHoursStartTime || staff.extraHoursEndTime ? `${staff.extraHoursStartTime || '--'} - ${staff.extraHoursEndTime || '--'}` : 'N/A' },
        { label: 'Expected Hours/Day', value: staff.expectedHoursPerDay },
        { label: 'Expected Hours/Week', value: staff.expectedWeeklyHours },
        { label: 'Expected Hours/Month', value: staff.expectedMonthlyHours },
        { label: 'Expected Days/Week', value: staff.expectedWorkingDaysPerWeek },
        { label: 'Expected Days/Month', value: staff.expectedWorkingDaysPerMonth },
        { label: 'Stipend Amount', value: staff.stipendAmount != null ? formatNumber(staff.stipendAmount, 2) : 'N/A' },
      ];

      let leftY = startY;
      leftItems.forEach((item) => {
        leftY = writeLabelValueAt(item.label, item.value, leftX, leftY, columnWidth);
      });

      let rightY = startY;
      rightItems.forEach((item) => {
        rightY = writeLabelValueAt(item.label, item.value, rightX, rightY, columnWidth);
      });

      doc.y = Math.max(leftY, rightY) + 6;

      doc.font('Helvetica-Bold').fontSize(10).fillColor(THEME.primary)
        .text('Attendance Summary', left, doc.y, { width: contentWidth });
      doc.y += 4;

      const daysPresent = staff.totals?.daysPresent ?? 0;
      const totalMinutes = staff.totals?.totalMinutes ?? 0;
      const totalHoursStaff = formatHoursFromMinutes(totalMinutes);
      const avgHours = daysPresent ? formatNumber((totalMinutes / 60) / daysPresent, 2) : '0.00';
      const lateDays = staff.totals?.lateCount ?? 0;
      const lateMinutes = sumLateMinutes(staff.days || []);

      const summaryItems = [
        { label: 'Days with Logs', value: formatNumber(daysPresent) },
        { label: 'Total Hours Logged', value: totalHoursStaff },
        { label: 'Average Hours/Day', value: avgHours },
        { label: 'Late Days', value: formatNumber(lateDays) },
        { label: 'Total Late Minutes', value: formatNumber(lateMinutes) },
      ];

      let summaryY = doc.y;
      summaryItems.forEach((item) => {
        summaryY = writeLabelValueAt(item.label, item.value, left, summaryY, contentWidth);
      });
      doc.y = summaryY + 6;

      doc.font('Helvetica-Bold').fontSize(10).fillColor(THEME.primary)
        .text('Daily Attendance Log', left, doc.y, { width: contentWidth });
      doc.y += 6;

      if (!staff.days || staff.days.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(THEME.muted)
          .text('No attendance logs recorded for this staff member in the selected period.', left, doc.y, { width: contentWidth });
        doc.moveDown(0.8);
        return;
      }

      const columns = [
        { label: 'Date', width: 0.22 },
        { label: 'In', width: 0.1 },
        { label: 'Out', width: 0.1 },
        { label: 'Break', width: 0.22 },
        { label: 'Hours', width: 0.12, align: 'right' },
        { label: 'Status', width: 0.24 },
      ];
      const rowHeight = 18;

      drawTableHeader(columns, rowHeight);
      let rowY = doc.y;

      staff.days.forEach((day, rowIndex) => {
        ensureSpace(rowHeight + 8, () => {
          drawTableHeader(columns, rowHeight);
          rowY = doc.y;
        });

        const breakWindow = day.breakStart || day.breakEnd
          ? `${day.breakStart || '--'} - ${day.breakEnd || '--'}`
          : '--';
        const hours = formatNumber((day.totalMinutes || 0) / 60, 2);

        let statusText = 'On time';
        let statusColor = THEME.success;
        if (day.lateMinutes != null) {
          statusText = `Late ${day.lateMinutes} min`;
          statusColor = THEME.warning;
        } else if (report.reportType === 'missing' && !day.clockIn && !day.clockOut) {
          statusText = 'Missing Clock-In';
          statusColor = THEME.danger;
        }

        const rowValues = [
          { text: safeText(day.date), color: THEME.text },
          { text: safeText(day.clockIn, '--'), color: THEME.text },
          { text: safeText(day.clockOut, '--'), color: THEME.text },
          { text: breakWindow, color: THEME.text },
          { text: hours, color: THEME.text },
          { text: statusText, color: statusColor },
        ];

        drawTableRow(columns, rowValues, rowY, rowHeight, rowIndex % 2 === 1);
        rowY += rowHeight;
        doc.y = rowY;
      });

      doc.moveDown(0.8);
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve({ filePath, fileName }));
    stream.on('error', reject);
  });
};

module.exports = {
  generateReportPdf,
};
