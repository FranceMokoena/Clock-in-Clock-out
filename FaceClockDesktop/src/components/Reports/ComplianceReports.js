import React, { useState, useEffect } from 'react';
import { MdWarning, MdError, MdCheckCircle } from 'react-icons/md';
import { staffAPI, attendanceAPI } from '../../services/api';
import ReportFilters from './ReportFilters';
import './ComplianceReports.css';

function ComplianceReports({ isAdmin, hostCompanyId, isHostCompany }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [interns, setInterns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [violationFilter, setViolationFilter] = useState('all'); // 'all', 'high', 'medium', 'low'

  useEffect(() => {
    loadFilterOptions();
  }, [hostCompanyId]);

  useEffect(() => {
    loadComplianceReport();
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

  const loadComplianceReport = async () => {
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
      if (response.success && Array.isArray(response.clockLogs)) {
        const processed = processComplianceData(response.clockLogs);
        setReportData(processed);
      }
    } catch (error) {
      console.error('Error loading compliance report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const processComplianceData = (logs) => {
    if (!logs || logs.length === 0) {
      return null;
    }

    const violations = [];
    const manipulationRisks = [];
    const immutableRecords = [];
    const excludedRecords = [];

    const staffMap = {}; // Map staffId to staff info
    const deviceMap = {}; // Track devices per staff
    const timeSessionMap = {}; // Track time sessions

    // Process logs with data validation
    logs.forEach((log) => {
      // VALIDATION: Check required fields
      if (!log.staffId || !log.clockInTime) {
        excludedRecords.push({
          reason: 'Missing required fields (staffId or clockInTime)',
          recordId: log._id
        });
        return; // Skip this record
      }

      const date = new Date(log.clockInTime).toDateString();
      const clockInTime = new Date(log.clockInTime);
      
      // Track device usage
      if (log.deviceId) {
        if (!deviceMap[log.deviceId]) {
          deviceMap[log.deviceId] = [];
        }
        deviceMap[log.deviceId].push(log.staffId);
      }

      // VIOLATION 1: Missed Clock-Out (REAL DATA)
      if (!log.clockOutTime) {
        violations.push({
          intern: log.staffName || 'Unknown',
          staffId: log.staffId,
          hostCompany: log.hostCompany || 'Unknown',
          date,
          type: 'Missed Clock-Out',
          severity: 'high',
          description: `No clock-out recorded. Clock-in at ${clockInTime.toLocaleTimeString()} on ${date}`,
          timestamp: log.clockInTime,
          immutable: true,
          triggerRule: 'Missing clockOutTime field in attendance record'
        });
      }

      // VIOLATION 2: Repeated Lateness (REAL DATA - configurable grace period)
      const GRACE_PERIOD_HOUR = 9;
      const GRACE_PERIOD_MINUTE = 0;
      const isLate = clockInTime.getHours() > GRACE_PERIOD_HOUR || 
                     (clockInTime.getHours() === GRACE_PERIOD_HOUR && clockInTime.getMinutes() > GRACE_PERIOD_MINUTE);

      if (isLate) {
        const existingLate = violations.filter(v => 
          v.staffId === log.staffId && 
          v.type === 'Repeated Lateness' &&
          new Date(v.timestamp).getMonth() === clockInTime.getMonth()
        );

        if (existingLate.length >= 2) {
          const hasRecord = violations.some(v => 
            v.staffId === log.staffId && 
            v.type === 'Repeated Lateness' &&
            v.date === date
          );

          if (!hasRecord) {
            violations.push({
              intern: log.staffName || 'Unknown',
              staffId: log.staffId,
              hostCompany: log.hostCompany || 'Unknown',
              date,
              type: 'Repeated Lateness',
              severity: 'medium',
              description: `${existingLate.length + 1}+ late arrivals detected in ${clockInTime.toLocaleDateString('default', { month: 'long', year: 'numeric' })}. Clock-in at ${clockInTime.toLocaleTimeString()}`,
              timestamp: log.clockInTime,
              immutable: true,
              triggerRule: '3+ late arrivals (after 9:00 AM) in single month'
            });
          }
        }
      }

      // VIOLATION 3: Unusual Clock-In Time (outside business hours - REAL DATA)
      const hour = clockInTime.getHours();
      if (hour < 6 || hour > 22) {
        violations.push({
          intern: log.staffName || 'Unknown',
          staffId: log.staffId,
          hostCompany: log.hostCompany || 'Unknown',
          date,
          type: 'Unusual Clock-In Time',
          severity: 'low',
          description: `Clock-in recorded at ${clockInTime.toLocaleTimeString()} - outside normal business hours (6 AM to 10 PM)`,
          timestamp: log.clockInTime,
          immutable: true,
          triggerRule: 'Clock-in before 6 AM or after 10 PM'
        });
      }

      // Create immutable record for audit trail
      immutableRecords.push({
        id: log._id,
        intern: log.staffName || 'Unknown',
        staffId: log.staffId,
        date,
        clockIn: clockInTime.toLocaleTimeString(),
        clockOut: log.clockOutTime ? new Date(log.clockOutTime).toLocaleTimeString() : 'MISSING',
        status: log.clockOutTime ? 'Complete' : 'INCOMPLETE',
        recordedAt: new Date(log.createdAt || new Date()).toLocaleString(),
        deviceId: log.deviceId || 'Unknown',
        locked: true // Immutable
      });
    });

    // MANIPULATION DETECTION (REAL DATA)
    // Check for same device used by multiple interns
    Object.entries(deviceMap).forEach(([deviceId, staffIds]) => {
      const uniqueStaffIds = [...new Set(staffIds)];
      if (uniqueStaffIds.length > 1) {
        manipulationRisks.push({
          type: 'Multi-Staff Device Usage',
          severity: 'high',
          description: `Device ${deviceId} used by ${uniqueStaffIds.length} different interns - potential fraud or device sharing. Requires investigation.`,
          staffCount: uniqueStaffIds.length,
          flag: '🚨',
          triggerRule: 'Single device used by 2+ staff members'
        });
      }
    });

    // Check for overlapping attendance sessions
    const sessionsByDate = {};
    logs.forEach(log => {
      if (!log.staffId || !log.clockInTime) return; // Skip invalid records
      
      const date = new Date(log.clockInTime).toDateString();
      if (!sessionsByDate[date]) sessionsByDate[date] = [];
      sessionsByDate[date].push({
        staffId: log.staffId,
        staffName: log.staffName,
        start: new Date(log.clockInTime),
        end: log.clockOutTime ? new Date(log.clockOutTime) : null
      });
    });

    Object.entries(sessionsByDate).forEach(([date, sessions]) => {
      for (let i = 0; i < sessions.length; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
          const s1 = sessions[i];
          const s2 = sessions[j];
          
          // Check for same person with multiple concurrent sessions
          if (s1.staffId === s2.staffId && s1.end && s2.end) {
            if ((s1.start <= s2.start && s2.start <= s1.end) ||
                (s2.start <= s1.start && s1.start <= s2.end)) {
              manipulationRisks.push({
                type: 'Overlapping Sessions',
                severity: 'high',
                description: `${s1.staffName} has overlapping attendance sessions on ${date} (${s1.start.toLocaleTimeString()} - ${s1.end.toLocaleTimeString()} AND ${s2.start.toLocaleTimeString()} - ${s2.end.toLocaleTimeString()}). Data integrity issue.`,
                staffName: s1.staffName,
                date,
                flag: '⚡',
                triggerRule: 'Single intern clocked in twice simultaneously'
              });
            }
          }
        }
      }
    });

    // Check for rapid clock-in/clock-out cycles (< 1 minute) - SUSPICIOUS
    logs.forEach(log => {
      if (!log.staffId || !log.clockInTime || !log.clockOutTime) return;
      
      const duration = (new Date(log.clockOutTime) - new Date(log.clockInTime)) / (1000 * 60);
      if (duration < 1) {
        manipulationRisks.push({
          type: 'Rapid Clock-In/Out',
          severity: 'medium',
          description: `${log.staffName || 'Unknown'} clocked out after ${duration.toFixed(2)} minutes on ${new Date(log.clockInTime).toDateString()}. Potential data entry error or fraud.`,
          staffName: log.staffName,
          duration,
          flag: '⏱️',
          triggerRule: 'Session duration less than 1 minute'
        });
      }
    });

    return {
      violations: violations.filter(v => {
        if (violationFilter === 'all') return true;
        return v.severity === violationFilter;
      }),
      manipulationRisks,
      immutableRecords,
      excludedRecords,
      summary: {
        totalViolations: violations.length,
        highSeverity: violations.filter(v => v.severity === 'high').length,
        mediumSeverity: violations.filter(v => v.severity === 'medium').length,
        lowSeverity: violations.filter(v => v.severity === 'low').length,
        manipulationFlags: manipulationRisks.length,
        recordsAnalyzed: logs.length,
        recordsExcluded: excludedRecords.length
      }
    };
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'high': '#dc2626',
      'medium': '#f59e0b',
      'low': '#3b82f6'
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <MdError />;
      case 'medium':
        return <MdWarning />;
      default:
        return <MdCheckCircle />;
    }
  };

  return (
    <div className="compliance-reports">
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
          <p>Analyzing compliance data...</p>
        </div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="compliance-summary">
            <div className="summary-card high">
              <div className="card-icon">🔴</div>
              <div className="card-content">
                <div className="card-label">High Severity</div>
                <div className="card-value">{reportData.summary.highSeverity}</div>
              </div>
            </div>
            <div className="summary-card medium">
              <div className="card-icon">🟡</div>
              <div className="card-content">
                <div className="card-label">Medium Severity</div>
                <div className="card-value">{reportData.summary.mediumSeverity}</div>
              </div>
            </div>
            <div className="summary-card low">
              <div className="card-icon">🔵</div>
              <div className="card-content">
                <div className="card-label">Low Severity</div>
                <div className="card-value">{reportData.summary.lowSeverity}</div>
              </div>
            </div>
            <div className="summary-card alert">
              <div className="card-icon">⚠️</div>
              <div className="card-content">
                <div className="card-label">Manipulation Flags</div>
                <div className="card-value">{reportData.summary.manipulationFlags}</div>
              </div>
            </div>
          </div>

          {/* Data Transparency */}
          <div className="data-transparency-info">
            <div className="transparency-item">
              <span className="info-label">Records Analyzed:</span>
              <span className="info-value">{reportData.summary.recordsAnalyzed}</span>
            </div>
            <div className="transparency-item">
              <span className="info-label">Records Excluded (Invalid):</span>
              <span className="info-value">{reportData.summary.recordsExcluded}</span>
            </div>
            {reportData.excludedRecords.length > 0 && (
              <div className="transparency-item">
                <span className="info-label">Excluded Reasons:</span>
                <span className="info-value">
                  {reportData.excludedRecords.map((ex, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#6B7280' }}>
                      • {ex.reason}
                    </div>
                  ))}
                </span>
              </div>
            )}
          </div>

          {/* Violations List */}
          {reportData.violations.length > 0 && (
            <div className="violations-section">
              <div className="section-header">
                <h2>Ethical Violations ({reportData.violations.length})</h2>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${violationFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setViolationFilter('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`filter-btn ${violationFilter === 'high' ? 'active' : ''}`}
                    onClick={() => setViolationFilter('high')}
                  >
                    High
                  </button>
                  <button 
                    className={`filter-btn ${violationFilter === 'medium' ? 'active' : ''}`}
                    onClick={() => setViolationFilter('medium')}
                  >
                    Medium
                  </button>
                  <button 
                    className={`filter-btn ${violationFilter === 'low' ? 'active' : ''}`}
                    onClick={() => setViolationFilter('low')}
                  >
                    Low
                  </button>
                </div>
              </div>
              
              <div className="violations-list">
                {reportData.violations.map((violation, idx) => (
                  <div key={idx} className={`violation-card severity-${violation.severity}`}>
                    <div className="violation-header">
                      <span className="severity-icon" style={{ color: getSeverityColor(violation.severity) }}>
                        {getSeverityIcon(violation.severity)}
                      </span>
                      <div className="violation-title">
                        <h4>{violation.type}</h4>
                        <span className="severity-label" style={{ backgroundColor: getSeverityColor(violation.severity) }}>
                          {violation.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="violation-details">
                      <div className="detail-row">
                        <span className="label">Intern:</span>
                        <span className="value">{violation.intern}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Host Company:</span>
                        <span className="value">{violation.hostCompany}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Date:</span>
                        <span className="value">{violation.date}</span>
                      </div>
                      <p className="violation-description">{violation.description}</p>
                      <div className="trigger-rule" style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', fontStyle: 'italic' }}>
                        <strong>Trigger Rule:</strong> {violation.triggerRule}
                      </div>
                    </div>
                    <div className="violation-footer">
                      <span className="immutable-badge">System Classification: Automatic | Record Status: Locked | Modification: Not Permitted</span>
                      <span className="timestamp">{new Date(violation.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manipulation Risks */}
          {reportData.manipulationRisks.length > 0 && (
            <div className="manipulation-section">
              <h2>Attendance Manipulation Risks (Admin Only)</h2>
              <p className="section-description">These flagged items indicate potential fraudulent activity and require investigation.</p>
              
              <div className="risks-list">
                {reportData.manipulationRisks.map((risk, idx) => (
                  <div key={idx} className={`risk-card severity-${risk.severity}`}>
                    <div className="risk-icon">{risk.flag}</div>
                    <div className="risk-content">
                      <h4>{risk.type}</h4>
                      <p>{risk.description}</p>
                      <div className="trigger-rule" style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', fontStyle: 'italic' }}>
                        <strong>Trigger Rule:</strong> {risk.triggerRule}
                      </div>
                    </div>
                    <span className="risk-severity" style={{ backgroundColor: getSeverityColor(risk.severity) }}>
                      {risk.severity.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail - Immutable Records */}
          <div className="audit-trail-section">
            <h2>Audit Trail - Immutable Records</h2>
            <p className="section-description">These records are locked and cannot be modified - certified for compliance audits.</p>
            
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Status</th>
                  <th>Device ID</th>
                  <th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {reportData.immutableRecords.slice(0, 50).map((record, idx) => (
                  <tr key={idx} className={`status-${record.status.toLowerCase()}`}>
                    <td>{record.intern}</td>
                    <td>{record.date}</td>
                    <td>{record.clockIn}</td>
                    <td>{record.clockOut}</td>
                    <td>
                      <span className={`status-badge ${record.status.toLowerCase()}`}>
                        🔒 {record.status}
                      </span>
                    </td>
                    <td className="mono">{record.deviceId}</td>
                    <td className="timestamp">{record.recordedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.immutableRecords.length > 50 && (
              <p className="records-note">Showing 50 of {reportData.immutableRecords.length} records</p>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No compliance data available for the selected period and filters.</p>
        </div>
      )}
    </div>
  );
}

export default ComplianceReports;
