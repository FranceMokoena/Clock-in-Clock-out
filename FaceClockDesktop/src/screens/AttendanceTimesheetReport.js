import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { MdArrowBack, MdPictureAsPdf, MdPrint } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { clockLogAPI, staffAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AttendanceTimesheetReport.css';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const TIME_FIELD_KEYS = {
  clockIn: ['timeIn', 'clockIn', 'clockInTime'],
  clockOut: ['timeOut', 'clockOut', 'clockOutTime'],
  breakStart: ['breakStart', 'startBreak', 'startLunch', 'break_start'],
  breakEnd: ['breakEnd', 'endBreak', 'endLunch', 'break_end'],
  lunchStart: ['lunchStart', 'startLunch', 'lunch_start'],
  lunchEnd: ['lunchEnd', 'endLunch', 'lunch_end'],
};

const ACTIVITY_CLOCK_TYPES = {
  clockIn: ['in', 'extra_shift_in'],
  clockOut: ['out', 'extra_shift_out'],
  breakStart: ['break_start'],
  breakEnd: ['break_end'],
  lunchStart: ['lunch_start'],
  lunchEnd: ['lunch_end'],
};

const formatPeriodRange = (period, start, end) => {
  const startLabel = start?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endLabel = end?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!start || !end) return '-';

  if (period === 'daily') {
    return startLabel;
  }
  if (period === 'weekly') {
    return `Week of ${startLabel} – ${endLabel}`;
  }
  return start?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const buildRange = (period, selectedDate, selectedMonth) => {
  const sanitizedDate = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  const now = new Date();
  let start = new Date(sanitizedDate);
  let end = new Date(sanitizedDate);

  switch (period) {
    case 'weekly': {
      const day = sanitizedDate.getDay();
      // Treat Monday as start of week
      const offset = day === 0 ? 6 : day - 1;
      start = new Date(sanitizedDate);
      start.setDate(sanitizedDate.getDate() - offset);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'monthly': {
      const [year = now.getFullYear(), month = now.getMonth() + 1] = (selectedMonth || '').split('-').map(Number);
      start = new Date(year || now.getFullYear(), month ? month - 1 : now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'daily':
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
};

const convertTo24Hour = (value) => {
  if (!value) return null;
  const match = value.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const second = match[3];
    const period = match[4].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}:${second}`;
  }
  return value;
};

const parseDateTime = (date, timeString) => {
  if (!date || !timeString) return null;
  const normalizedTime = convertTo24Hour(timeString);
  if (!normalizedTime) return null;
  const iso = `${date}T${normalizedTime}`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getValue = (entry, keys) => keys.reduce((value, key) => value || entry?.[key], null);

const mapPeriodToApi = (selectedPeriod) => {
  if (selectedPeriod === 'daily') return 'today';
  return selectedPeriod;
};

const formatDuration = (hours) => {
  if (!hours || Number.isNaN(hours)) return '0h 0m';
  const totalMinutes = Math.round(hours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins}m`;
};

const formatTimeLabel = (value) => {
  if (!value) return '-';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return '-';
  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const getEmployeeLabel = (staff) => {
  if (!staff) return 'Unknown';
  const first = staff.name || staff.firstName || staff.fullName || '';
  const last = staff.surname || staff.lastName || '';
  return `${first} ${last}`.trim() || 'Unknown';
};

const buildReadableHostCompany = (staff) => {
  if (!staff) return 'N/A';
  return staff.hostCompany?.name || staff.hostCompany || staff.companyName || 'N/A';
};

const parseEntryTime = (entry, keys) => {
  const timeString = getValue(entry, keys);
  return parseDateTime(entry?.date, timeString);
};

const getActivityTimestamp = (entry = {}, activityKey) => {
  const types = ACTIVITY_CLOCK_TYPES[activityKey] || [];
  const activities = Array.isArray(entry?.activities) ? entry.activities : [];
  const matchedActivity = activities.find((activity) => types.includes(activity.clockType));
  if (matchedActivity) {
    const parsed = new Date(matchedActivity.timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return parseEntryTime(entry, TIME_FIELD_KEYS[activityKey] || []);
};

const calculateEntryHours = ({ clockInTime, clockOutTime, breakStartTime, breakEndTime, lunchStartTime, lunchEndTime }) => {
  if (!clockInTime || !clockOutTime) return null;
  let totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
  if (breakStartTime && breakEndTime) {
    totalMinutes -= (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60);
  }
  if (lunchStartTime && lunchEndTime) {
    totalMinutes -= (lunchEndTime.getTime() - lunchStartTime.getTime()) / (1000 * 60);
  }
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;
  return Math.max(0, totalMinutes / 60);
};

const formatEntryDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const REPORT_HEADERS = [
  'Employee Name',
  'Employee ID',
  'Role',
  'Host Company',
  'Date',
  'Period',
  'Clock-In',
  'Break Start',
  'Break End',
  'Lunch Start',
  'Lunch End',
  'Clock-Out',
  'Total Worked Hours',
  'Exceptions',
];

const buildReportCells = (row) => ([
  row.employeeName,
  row.employeeId,
  row.role,
  row.hostCompany,
  row.dateLabel,
  row.period,
  formatTimeLabel(row.clockIn),
  formatTimeLabel(row.breakStart),
  formatTimeLabel(row.breakEnd),
  formatTimeLabel(row.lunchStart),
  formatTimeLabel(row.lunchEnd),
  formatTimeLabel(row.clockOut),
  row.totalHours,
  row.exceptions.join('; ')
]);

const buildReportTableHTML = (rows = [], title, periodLabel) => {
  const headerHtml = `
    <div class="print-header">
      <h1>Attendance Timesheet Report</h1>
      <p>Internship Success</p>
      <p>Clock-in / Clock-out analytics</p>
      <p>Period: ${periodLabel}</p>
    </div>
  `;

  const rowHtml = rows.map((row) => `
    <tr>
      ${buildReportCells(row).map(cell => `<td>${cell || '-'}</td>`).join('')}
    </tr>
  `).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title || 'Attendance Timesheet Report'}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 24px;
            color: #111827;
            background: #ffffff;
          }
          .print-header {
            margin-bottom: 24px;
          }
          .print-header h1 {
            margin: 0;
            font-size: 24px;
            color: #1d4ed8;
          }
          .print-header p {
            margin: 4px 0;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #dbe2f0;
            padding: 6px 8px;
            text-align: left;
          }
          th {
            background: #f8fafc;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.08em;
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        <table>
          <thead>
            <tr>
              ${REPORT_HEADERS.map((header) => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowHtml || '<tr><td colspan="14">No attendance data</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const buildRowFromTimesheetEntry = (staff, entry = {}, periodLabel) => {
  const clockInTime = getActivityTimestamp(entry, 'clockIn');
  const clockOutTime = getActivityTimestamp(entry, 'clockOut');
  const breakStartTime = getActivityTimestamp(entry, 'breakStart');
  const breakEndTime = getActivityTimestamp(entry, 'breakEnd');
  const lunchStartTime = getActivityTimestamp(entry, 'lunchStart');
  const lunchEndTime = getActivityTimestamp(entry, 'lunchEnd');

  const hours = calculateEntryHours({
    clockInTime,
    clockOutTime,
    breakStartTime,
    breakEndTime,
    lunchStartTime,
    lunchEndTime,
  });

  const exceptionSet = new Set();
  if (!clockInTime) exceptionSet.add('Missing clock-in');
  if (!clockOutTime) exceptionSet.add('Missing clock-out');
  if (breakStartTime && !breakEndTime) exceptionSet.add('Break not ended');
  if (lunchStartTime && !lunchEndTime) exceptionSet.add('Lunch not ended');
  if (!clockInTime && !clockOutTime && !entry.startLunch && !entry.endLunch) {
    exceptionSet.add('No logs for period');
  }

  return {
    employeeName: getEmployeeLabel(staff),
    employeeId: staff?.idNumber || staff?.identificationNumber || staff?._id || 'N/A',
    role: staff?.role || 'Staff',
    hostCompany: buildReadableHostCompany(staff),
    period: periodLabel,
    date: entry.date,
    dateLabel: formatEntryDate(entry.date),
    clockIn: clockInTime,
    breakStart: breakStartTime,
    breakEnd: breakEndTime,
    lunchStart: lunchStartTime,
    lunchEnd: lunchEndTime,
    clockOut: clockOutTime,
    totalHours: formatDuration(hours),
    exceptions: Array.from(exceptionSet),
  };
};

const getTableRows = (rows = []) => rows.map(buildReportCells);

const buildReportRows = (reportData = [], periodLabel) => {
  const rows = [];
  reportData.forEach((item) => {
    const staff = item.staff || {};
    const entries = Array.isArray(item.timesheet) ? item.timesheet : [];
    entries.forEach((entry) => {
      rows.push(buildRowFromTimesheetEntry(staff, entry, periodLabel));
    });
  });
  return rows.sort((a, b) => {
    const nameA = a.employeeName.toLowerCase();
    const nameB = b.employeeName.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    if (a.date && b.date) return new Date(a.date) - new Date(b.date);
    return 0;
  });
};

const mapExceptionLabel = (exception) => {
  const map = {
    'Missing clock-in': 'Missing clock-in',
    'Missing clock-out': 'Missing clock-out',
    'Break not ended': 'Break not ended',
    'Lunch not ended': 'Lunch not ended',
    'No logs for period': 'No logs for period',
    'Missing clock-in/out': 'Missing clock-in/out',
    'Out-of-order events': 'Out-of-order events',
  };
  return map[exception] || exception;
};

function AttendanceTimesheetReport() {
  const navigate = useNavigate();
  const { user, isAdmin, isHostCompany } = useAuth();
  const allowed = isAdmin || isHostCompany;
  const hostCompanyId = isHostCompany ? user?.id : null;
  const today = new Date();
  const [period, setPeriod] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [staffMembers, setStaffMembers] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ totalStaff: 0, totalLogs: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const { start, end } = useMemo(
    () => buildRange(period, selectedDate, selectedMonth),
    [period, selectedDate, selectedMonth]
  );
  const periodLabel = formatPeriodRange(period, start, end);

  useEffect(() => {
    if (!allowed) return;
    const loadStaff = async () => {
      try {
        const params = isHostCompany && hostCompanyId ? { hostCompanyId } : {};
        const response = await staffAPI.getAll(params);
        if (response?.success) {
          const members = (response.staff || []).filter((member) => ['Intern', 'Staff'].includes(member.role));
          setStaffMembers(members);
        } else {
          setStaffMembers([]);
        }
      } catch (fetchError) {
        console.error('Failed to load staff for attendance report:', fetchError);
        setStaffMembers([]);
      }
    };
    loadStaff();
  }, [allowed, hostCompanyId, isHostCompany]);

  useEffect(() => {
    if (!allowed || staffMembers.length === 0 || !start || !end) return;
    const periodParam = mapPeriodToApi(period);
    const params = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      period: periodParam,
    };
    if (staffMembers.length > 0) {
      params.staffIds = staffMembers.map((member) => member._id).join(',');
    }

    const controller = new AbortController();
    const fetchAttendance = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await clockLogAPI.getAll(params);
        if (response?.success) {
          setReportData(response.data || []);
          setSummary(response.summary || {
            totalStaff: staffMembers.length,
            totalLogs: Array.isArray(response.data) ? response.data.reduce((sum, item) => sum + (Array.isArray(item?.timesheet) ? item.timesheet.length : 0), 0) : 0,
          });
          setLastUpdated(new Date());
        } else {
          setReportData([]);
          setSummary({
            totalStaff: staffMembers.length,
            totalLogs: 0,
          });
          setError(response?.error || 'Failed to load attendance data.');
        }
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError?.response?.data?.error || fetchError?.message || 'Failed to load attendance data.');
          setReportData([]);
          setSummary({ totalStaff: staffMembers.length, totalLogs: 0 });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchAttendance();
    return () => controller.abort();
  }, [allowed, period, staffMembers, start, end]);

  const aggregatedRows = useMemo(() => {
    return buildReportRows(reportData, periodLabel);
  }, [reportData, periodLabel]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return aggregatedRows;
    const term = searchTerm.toLowerCase();
    return aggregatedRows.filter((row) => (
      row.employeeName.toLowerCase().includes(term)
      || row.employeeId.toLowerCase().includes(term)
      || row.hostCompany.toLowerCase().includes(term)
    ));
  }, [aggregatedRows, searchTerm]);

  const handlePrint = () => {
    if (!filteredRows.length) return;
    const html = buildReportTableHTML(filteredRows, 'Attendance Timesheet Report', periodLabel);
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setTimeout(() => {
      printWindow.close();
    }, 300);
  };

  const handleExportCSV = () => {
    if (!filteredRows.length) return;
    const rows = getTableRows(filteredRows);
    const csvRows = [
      REPORT_HEADERS.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-timesheet-${period}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!filteredRows.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(18);
    doc.text('Attendance Timesheet Report', 40, 40);
    doc.setFontSize(12);
    doc.text('Internship Success', 40, 58);
    doc.text('Clock-in / Clock-out analytics', 40, 74);
    doc.text(`Period: ${periodLabel}`, 40, 92);
    doc.autoTable({
      startY: 110,
      margin: { left: 40, right: 40 },
      head: [REPORT_HEADERS],
      body: getTableRows(filteredRows),
      styles: { fontSize: 9, textColor: '#0f172a' },
      headStyles: { fillColor: '#1d4ed8', textColor: '#ffffff' },
      theme: 'striped',
      tableWidth: 'auto',
    });
    doc.save(`Attendance_Timesheet_${period}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (!allowed) {
    return (
      <div className="attendance-timesheet-page">
        <div className="attendance-timesheet-shell">
          <div className="attendance-timesheet-header">
            <div>
              <h1 className="attendance-timesheet-title">Attendance Timesheet Report</h1>
              <p className="attendance-timesheet-subtitle">Access denied. Only Admin or Host Company users can view this data.</p>
            </div>
            <button className="action-button secondary" onClick={() => navigate('/dashboard')}>
              <MdArrowBack style={{ marginRight: 4 }} />
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-timesheet-page">
      <div className="attendance-timesheet-shell">
        <div className="attendance-timesheet-header">
          <div className="attendance-timesheet-header-left">
            <button className="icon-back-button" onClick={() => navigate('/dashboard')} type="button">
              <MdArrowBack />
            </button>
            <div>
              <p className="attendance-timesheet-title">Attendance Timesheet Report</p>
              <p className="attendance-timesheet-subtitle">Clock-in, breaks, lunch, and clock-out records for all staff and interns.</p>
            </div>
          </div>
          <div className="attendance-timesheet-actions">
            <button className="action-button" onClick={handlePrint}>
              <MdPrint style={{ marginRight: 6 }} />
              Print Report
            </button>
            <button className="action-button" onClick={handleExportPDF}>
              <MdPictureAsPdf style={{ marginRight: 6 }} />
              Export PDF
            </button>
            <button className="back-button" onClick={() => navigate('/dashboard')} type="button">
              <MdArrowBack style={{ marginRight: 6 }} />
              Back to dashboard
            </button>
          </div>
        </div>

        <div className="attendance-timesheet-header attendance-timesheet-filters">
          <div className="filter-group">
            <span className="filter-label">View period</span>
            <div className="period-selector">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`period-button ${period === option.value ? 'active' : ''}`}
                  onClick={() => setPeriod(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Date picker</span>
            {period === 'monthly' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            )}
          </div>
          <div className="filter-group search-control">
            <span className="filter-label">Search</span>
            <input
              type="search"
              placeholder="Name or Employee ID"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        {(summary || lastUpdated) && (
          <div className="filters-summary">
            <div>Period: {periodLabel}</div>
            {summary && (
              <div>
                Staff: {summary.totalStaff || 0} | Logs: {summary.totalLogs || 0}
              </div>
            )}
            {lastUpdated && <div>Last refreshed: {lastUpdated.toLocaleString()}</div>}
          </div>
        )}

        {loading && (
          <div className="filters-summary">
            Loading attendance data...
          </div>
        )}
        {error && (
          <div className="filters-summary" style={{ color: '#b42318' }}>
            {error}
          </div>
        )}

        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                {REPORT_HEADERS.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan="14" className="cell-secondary">
                    No attendance records found for the selected period.
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={`${row.employeeId}-${row.period}-${row.date || row.dateLabel || row.clockIn || row.clockOut || ''}`}>
                  <td>{row.employeeName}</td>
                  <td>{row.employeeId}</td>
                  <td>{row.role}</td>
                  <td>{row.hostCompany}</td>
                  <td>{row.dateLabel}</td>
                  <td>{row.period}</td>
                  <td className="cell-time">
                    {formatTimeLabel(row.clockIn)}
                  </td>
                  <td className="cell-time">
                    {formatTimeLabel(row.breakStart)}
                  </td>
                  <td className="cell-time">{formatTimeLabel(row.breakEnd)}</td>
                  <td className="cell-time">
                    {formatTimeLabel(row.lunchStart)}
                  </td>
                  <td className="cell-time">{formatTimeLabel(row.lunchEnd)}</td>
                  <td className="cell-time">{formatTimeLabel(row.clockOut)}</td>
                  <td className="cell-time">{row.totalHours}</td>
                  <td className="cell-time">
                    {row.exceptions.length ? row.exceptions.map(mapExceptionLabel).join(', ') : '-'}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="print-note">
          Print and export reflect the data presented above. Use the filters to narrow or expand the view.
        </p>
      </div>
    </div>
  );
}

export default AttendanceTimesheetReport;
