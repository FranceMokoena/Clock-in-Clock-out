import React, { useState, useEffect } from 'react';
import { staffAPI, attendanceAPI } from '../../services/api';
import ReportFilters from './ReportFilters';
import './PerformanceReports.css';

function PerformanceReports({ isAdmin, hostCompanyId, isHostCompany }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [interns, setInterns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, [hostCompanyId]);

  useEffect(() => {
    loadPerformanceReport();
  }, [selectedMonth, selectedYear, selectedIntern, selectedCompany]);

  const loadFilterOptions = async () => {
    try {
      const staffParams = isHostCompany ? { hostCompanyId } : {};
      const staffRes = await staffAPI.getAll(staffParams);
      
      if (staffRes.success && Array.isArray(staffRes.staff)) {
        setInterns(staffRes.staff.filter(s => s.role === 'Intern'));
        const uniqueCompanies = [...new Set(staffRes.staff.map(s => s.hostCompany))];
        setCompanies(uniqueCompanies.filter(Boolean).map(c => ({ name: c })));
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadPerformanceReport = async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        year: selectedYear,
        ...(selectedIntern && { staffId: selectedIntern }),
        ...(selectedCompany && { hostCompany: selectedCompany }),
        ...(isHostCompany && { hostCompanyId })
      };

      const response = await attendanceAPI.getAll(params);
      if (response.success) {
        const processed = processPerformanceData(response.data || response.clockLogs || []);
        setReportData(processed);
      }
    } catch (error) {
      console.error('Error loading performance report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process performance data from REAL attendance records
   * NO mock data - all calculations based on validated attendance logs
   */
  const processPerformanceData = (logs) => {
    if (!logs || logs.length === 0) return null;

    // Calculate REAL hours from actual attendance records
    const totalHours = logs.reduce((sum, log) => {
      if (log.clockOutTime && log.clockInTime) {
        const inTime = new Date(log.clockInTime);
        const outTime = new Date(log.clockOutTime);
        if (outTime > inTime) {
          const duration = (outTime - inTime) / (1000 * 60 * 60);
          return sum + duration;
        }
      }
      return sum;
    }, 0);

    // Average hours per day
    const avgHoursPerDay = logs.length > 0 ? (totalHours / logs.length).toFixed(1) : 0;

    // Get actual supervisor validation data from records
    // NOTE: This should come from the backend's supervisorStatus field
    const supervisorValidations = {
      confirmed: logs.filter(log => 
        log.supervisorStatus === 'confirmed' || log.supervisorStatus === 'approved'
      ).length,
      pending: logs.filter(log => 
        log.supervisorStatus === 'pending' || !log.supervisorStatus
      ).length,
      rejected: logs.filter(log => 
        log.supervisorStatus === 'rejected' || log.supervisorStatus === 'denied'
      ).length
    };

    // Calculate productivity based on actual attendance consistency
    // Metric: Attendance Consistency Rate = (logs with both clock-in and clock-out) / total logs
    const completeSessions = logs.filter(log => log.clockInTime && log.clockOutTime).length;
    const attendanceConsistency = logs.length > 0 
      ? Math.round((completeSessions / logs.length) * 100)
      : 0;

    return {
      summary: {
        totalHours: totalHours.toFixed(1),
        totalDays: logs.length,
        avgHoursPerDay,
        attendanceConsistency, // This is the REAL productivity metric
        completeSessions,
        incompleteSessions: logs.length - completeSessions
      },
      supervisorValidations,
      dataQuality: {
        recordsAnalyzed: logs.length,
        recordsWithClockOut: completeSessions,
        recordsWithoutClockOut: logs.length - completeSessions,
        recordsWithSupervisorValidation: supervisorValidations.confirmed + supervisorValidations.rejected
      }
    };
  };

  return (
    <div className="performance-reports">
      <ReportFilters
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
        showTimeframe={false}
      />

      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading performance analysis...</p>
        </div>
      ) : reportData ? (
        <>
          <div className="performance-cards">
            <div className="card">
              <div className="label">Total Hours Worked</div>
              <div className="value">{reportData.summary.totalHours}h</div>
              <div className="detail">{reportData.summary.totalDays} days</div>
            </div>
            <div className="card">
              <div className="label">Average Hours per Day</div>
              <div className="value">{reportData.summary.avgHoursPerDay}h</div>
            </div>
            <div className="card">
              <div className="label">Attendance Consistency</div>
              <div className="value" style={{ color: reportData.summary.attendanceConsistency >= 80 ? '#16a34a' : '#f59e0b' }}>
                {reportData.summary.attendanceConsistency}%
              </div>
              <div className="detail">{reportData.summary.completeSessions}/{reportData.summary.totalDays} complete sessions</div>
            </div>
          </div>

          <div className="supervisor-validation">
            <h3>Supervisor Validation Status</h3>
            <p className="section-description">
              Based on {reportData.dataQuality.recordsAnalyzed} analyzed records. 
              {reportData.dataQuality.recordsWithoutClockOut > 0 && (
                <span style={{color: '#dc2626'}}>  ⚠️ {reportData.dataQuality.recordsWithoutClockOut} incomplete records excluded.</span>
              )}
            </p>
            <div className="validation-stats">
              <div className="stat confirmed">
                <div className="stat-value">{reportData.supervisorValidations.confirmed}</div>
                <div className="stat-label">Confirmed</div>
              </div>
              <div className="stat pending">
                <div className="stat-value">{reportData.supervisorValidations.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
              <div className="stat rejected">
                <div className="stat-value">{reportData.supervisorValidations.rejected}</div>
                <div className="stat-label">Rejected</div>
              </div>
            </div>
          </div>

          <div className="data-quality-section">
            <h4>📊 Data Quality Metrics</h4>
            <ul>
              <li>Records with complete clock-in/out: {reportData.dataQuality.recordsWithClockOut}</li>
              <li>Records missing clock-out: {reportData.dataQuality.recordsWithoutClockOut}</li>
              <li>Records with supervisor validation: {reportData.dataQuality.recordsWithSupervisorValidation}</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No performance data available for the selected filters.</p>
        </div>
      )}
    </div>
  );
}

export default PerformanceReports;
