import React, { useState, useEffect } from 'react';
import { MdFilterList, MdFileDownload, MdCalendarToday } from 'react-icons/md';
import { attendanceAPI, staffAPI } from '../../services/api';
import AttendanceHeatmap from './AttendanceHeatmap';
import ReportFilters from './ReportFilters';
import './AttendanceReports.css';

function AttendanceReports({ isAdmin, hostCompanyId, isHostCompany }) {
  const [timeframe, setTimeframe] = useState('monthly'); // 'daily', 'weekly', 'monthly'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [interns, setInterns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, [hostCompanyId]);

  useEffect(() => {
    loadAttendanceReport();
  }, [timeframe, selectedMonth, selectedYear, selectedIntern, selectedCompany]);

  const loadFilterOptions = async () => {
    try {
      const staffParams = isHostCompany ? { hostCompanyId } : {};
      const staffRes = await staffAPI.getAll(staffParams);
      
      if (staffRes.success && Array.isArray(staffRes.staff)) {
        setInterns(staffRes.staff.filter(s => s.role === 'Intern'));
        
        // Get unique companies
        const uniqueCompanies = [...new Set(staffRes.staff.map(s => s.hostCompany))];
        setCompanies(uniqueCompanies.filter(Boolean).map(c => ({ name: c })));
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadAttendanceReport = async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        year: selectedYear,
        timeframe,
        ...(selectedIntern && { staffId: selectedIntern }),
        ...(selectedCompany && { hostCompany: selectedCompany }),
        ...(isHostCompany && { hostCompanyId })
      };

      const response = await attendanceAPI.getAll(params);
      const logs = response.success ? (response.data || response.clockLogs || []) : [];
      
      if (Array.isArray(logs) && logs.length > 0) {
        // Process attendance data
        const processed = processAttendanceData(logs);
        setReportData(processed);
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error('Error loading attendance report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceData = (logs) => {
    const summary = {
      totalDays: 0,
      presentDays: 0,
      lateDays: 0,
      earlyDepartures: 0,
      missedClockOuts: 0,
      totalHours: 0,
      averageHours: 0,
      consistencyRate: 0,
      punctualityRate: 0
    };

    const dailyBreakdown = {};
    const daysWithMissedClockOut = [];

    logs.forEach(log => {
      const date = new Date(log.clockInTime).toDateString();
      const clockInTime = new Date(log.clockInTime);
      
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = {
          date,
          clockIn: log.clockInTime,
          clockOut: log.clockOutTime,
          duration: 0,
          isLate: false,
          earlyDeparture: false,
          missedClockOut: !log.clockOutTime
        };
        summary.totalDays++;
      }

      // Check if late (after 9:00 AM)
      if (clockInTime.getHours() > 9 || (clockInTime.getHours() === 9 && clockInTime.getMinutes() > 0)) {
        dailyBreakdown[date].isLate = true;
      }

      // Check if early departure (before 5:00 PM)
      if (log.clockOutTime) {
        const clockOutTime = new Date(log.clockOutTime);
        if (clockOutTime.getHours() < 17) {
          dailyBreakdown[date].earlyDeparture = true;
        }

        // Calculate hours worked
        const duration = (clockOutTime - clockInTime) / (1000 * 60 * 60);
        dailyBreakdown[date].duration = duration.toFixed(2);
        summary.totalHours += duration;
      } else {
        daysWithMissedClockOut.push(date);
      }

      summary.presentDays++;
    });

    // Calculate percentages
    summary.averageHours = summary.totalDays > 0 ? (summary.totalHours / summary.totalDays).toFixed(2) : 0;
    summary.consistencyRate = summary.totalDays > 0 ? Math.round((summary.presentDays / summary.totalDays) * 100) : 0;
    summary.punctualityRate = summary.totalDays > 0 ? Math.round(((summary.totalDays - Object.values(dailyBreakdown).filter(d => d.isLate).length) / summary.totalDays) * 100) : 0;
    summary.lateDays = Object.values(dailyBreakdown).filter(d => d.isLate).length;
    summary.earlyDepartures = Object.values(dailyBreakdown).filter(d => d.earlyDeparture).length;
    summary.missedClockOuts = daysWithMissedClockOut.length;

    return {
      summary,
      dailyBreakdown: Object.values(dailyBreakdown),
      heatmapData: dailyBreakdown
    };
  };

  const exportReport = (format) => {
    if (format === 'csv') {
      // Minimal CSV export
      const rows = [['Date','Clock In','Clock Out','Duration','Status']];
      reportData.dailyBreakdown.forEach(d => {
        rows.push([
          new Date(d.date).toLocaleDateString(),
          new Date(d.clockIn).toLocaleTimeString(),
          d.clockOut ? new Date(d.clockOut).toLocaleTimeString() : 'MISSING',
          d.duration,
          d.missedClockOut ? 'No Clock-Out' : d.isLate ? 'Late' : 'On-Time'
        ]);
      });
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'pdf') {
      const timestamp = new Date().toISOString();
      const reportId = `FCR-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      const signature = `SYS-${Math.random().toString(36).substr(2,10).toUpperCase()}`;
      const header = `<div style="font-family: Inter, Segoe UI, Roboto, Arial, sans-serif; color:#1F2933;"><h2 style="margin:0;">ATTENDANCE & COMPLIANCE REPORT</h2><div style="margin-top:6px;font-size:13px;color:#6B7280;">Generated: ${timestamp} • Report ID: ${reportId}</div><hr style="margin:12px 0;border:none;border-top:1px solid #D1D5DB;"/></div>`;
      let rowsHtml = '';
      reportData.dailyBreakdown.forEach(d => {
        rowsHtml += `<tr><td>${new Date(d.date).toLocaleDateString()}</td><td>${new Date(d.clockIn).toLocaleTimeString()}</td><td>${d.clockOut?new Date(d.clockOut).toLocaleTimeString():'MISSING'}</td><td>${d.duration}</td><td>${d.missedClockOut?'No Clock-Out':d.isLate?'Late':'On-Time'}</td></tr>`;
      });
      const body = `<div style="font-family: Inter, Segoe UI, Roboto, Arial, sans-serif; color:#1F2933; font-size:13px;"><h3 style="margin:0 0 8px 0;">Daily Breakdown</h3><table style="width:100%;border-collapse:collapse;margin-top:8px;"><thead><tr style="background:#E5EDF5;"><th style="padding:8px;border:1px solid #D1D5DB;text-align:left;">Date</th><th style="padding:8px;border:1px solid #D1D5DB;text-align:left;">Clock In</th><th style="padding:8px;border:1px solid #D1D5DB;text-align:left;">Clock Out</th><th style="padding:8px;border:1px solid #D1D5DB;text-align:left;">Duration</th><th style="padding:8px;border:1px solid #D1D5DB;text-align:left;">Status</th></tr></thead><tbody>${rowsHtml}</tbody></table><p style="margin-top:12px;font-size:12px;color:#6B7280;">System Signature: ${signature}</p></div>`;
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>Report ${reportId}</title></head><body style="margin:24px;">${header}${body}</body></html>`);
      win.document.close();
      setTimeout(()=>{ win.print(); win.close(); }, 500);
    }
  };

  return (
    <div className="attendance-reports">
      <ReportFilters
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        interns={interns}
        selectedIntern={selectedIntern}
        onInternChange={setSelectedIntern}
        companies={companies}
        selectedCompany={selectedCompany}
        onCompanyChange={setSelectedCompany}
      />

      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading attendance report...</p>
        </div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="card">
              <div className="card-label">Consistency Rate</div>
              <div className="card-value" style={{ color: reportData.summary.consistencyRate >= 80 ? '#16a34a' : '#f59e0b' }}>
                {reportData.summary.consistencyRate}%
              </div>
            </div>
            <div className="card">
              <div className="card-label">Punctuality Rate</div>
              <div className="card-value" style={{ color: reportData.summary.punctualityRate >= 80 ? '#16a34a' : '#f59e0b' }}>
                {reportData.summary.punctualityRate}%
              </div>
            </div>
            <div className="card">
              <div className="card-label">Total Hours</div>
              <div className="card-value">{reportData.summary.totalHours.toFixed(1)}</div>
            </div>
            <div className="card">
              <div className="card-label">Avg Hours/Day</div>
              <div className="card-value">{reportData.summary.averageHours}</div>
            </div>
            <div className="card alert">
              <div className="card-label">Late Arrivals</div>
              <div className="card-value" style={{ color: '#dc2626' }}>{reportData.summary.lateDays}</div>
            </div>
            <div className="card alert">
              <div className="card-label">Missed Clock-Outs</div>
              <div className="card-value" style={{ color: '#dc2626' }}>{reportData.summary.missedClockOuts}</div>
            </div>
          </div>

          {/* Heatmap Toggle */}
          <div className="heatmap-section">
            <div className="heatmap-header">
              <h3>Attendance Heatmap</h3>
              <button className="toggle-btn" onClick={() => setShowHeatmap(!showHeatmap)}>
                {showHeatmap ? 'Hide' : 'Show'} Heatmap
              </button>
            </div>
            {showHeatmap && (
              <AttendanceHeatmap data={reportData.heatmapData} />
            )}
          </div>

          {/* Detailed Table */}
          <div className="detailed-table-section">
            <div className="section-header">
              <h3>Daily Breakdown</h3>
              <button className="export-btn" onClick={() => exportReport('csv')}>
                <MdFileDownload /> Export CSV
              </button>
            </div>
            <table className="detailed-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Duration (hrs)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.dailyBreakdown.map((day, idx) => (
                  <tr key={idx}>
                    <td>{new Date(day.date).toLocaleDateString()}</td>
                    <td>{new Date(day.clockIn).toLocaleTimeString()}</td>
                    <td>{day.clockOut ? new Date(day.clockOut).toLocaleTimeString() : 'MISSING'}</td>
                    <td>{day.duration}</td>
                    <td>
                      <span className={`status-badge ${day.isLate ? 'late' : ''} ${day.missedClockOut ? 'missed' : 'present'}`}>
                        {day.missedClockOut ? 'No Clock-Out' : day.isLate ? 'Late' : 'On-Time'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No attendance data available for the selected period and filters.</p>
        </div>
      )}
    </div>
  );
}

export default AttendanceReports;
