import React, { useState, useEffect } from 'react';
import { MdFileDownload, MdWarning } from 'react-icons/md';
import { staffAPI, hostCompanyAPI, attendanceAPI } from '../../services/api';
import './InstitutionalReports.css';

function InstitutionalReports({ isAdmin, hostCompanyId, isHostCompany }) {
  const [companies, setCompanies] = useState([]);
  const [complianceRankings, setComplianceRankings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataValidationErrors, setDataValidationErrors] = useState([]);
  const [dataAudit, setDataAudit] = useState(null);

  useEffect(() => {
    loadInstitutionalData();
  }, [hostCompanyId]);

  /**
   * Validate required fields in records
   * Ensures data integrity before analysis
   */
  const validateRecord = (record, type = 'company') => {
    const errors = [];
    const requiredFields = {
      company: ['_id', 'companyName'],
      attendance: ['_id', 'staffId', 'clockInTime', 'hostCompany']
    };
    
    const fields = requiredFields[type] || [];
    fields.forEach(field => {
      if (record[field] === undefined || record[field] === null || record[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    return errors;
  };

  /**
   * Calculate compliance rankings from REAL attendance data
   * NO hardcoded values - all metrics derived from actual records
   */
  const calculateComplianceRankings = async (companies) => {
    try {
      // Fetch ALL attendance data
      const attendanceRes = await attendanceAPI.getAll({ limit: 10000 });
      const allLogs = attendanceRes.success ? (attendanceRes.data || attendanceRes.clockLogs || []) : [];
      
      const staffRes = await staffAPI.getAll({ limit: 10000 });
      const allStaff = staffRes.success ? (staffRes.staff || []) : [];

      // Track data quality for audit trail
      const auditData = {
        timestamp: new Date().toISOString(),
        totalAttendanceRecords: allLogs.length,
        totalStaffRecords: allStaff.length,
        companiesAnalyzed: companies.length,
        excludedRecords: {
          invalidAttendance: 0,
          missingClockOut: 0,
        },
        rankingsCalculated: 0,
      };

      const rankings = companies.map(company => {
        // Validate company record
        const companyErrors = validateRecord(company, 'company');
        if (companyErrors.length > 0) {
          console.warn(`Validation errors for company ${company._id}:`, companyErrors);
        }

        // REAL DATA: Filter logs by company
        const companyLogs = allLogs.filter(log => {
          // Validate attendance record before including
          const logErrors = validateRecord(log, 'attendance');
          if (logErrors.length > 0) {
            auditData.excludedRecords.invalidAttendance++;
            return false;
          }
          return log.hostCompany === company.companyName;
        });

        const companyStaff = allStaff.filter(staff => 
          staff.hostCompany === company.companyName && staff.isActive !== false
        );

        // METRIC 1: Staff Count = actual active staff in company
        const staffCount = companyStaff.length;

        // METRIC 2: Attendance Integrity = % of staff with at least 1 complete session
        const staffWithCompleteSessions = new Set();
        companyLogs.forEach(log => {
          // Only count if both clock-in AND clock-out exist
          if (log.staffId && log.clockInTime && log.clockOutTime) {
            staffWithCompleteSessions.add(String(log.staffId));
          }
        });
        const attendanceIntegrity = staffCount > 0 
          ? Math.round((staffWithCompleteSessions.size / staffCount) * 100)
          : 0;

        // METRIC 3: Violation Count = actual missed clock-outs
        const missedClockOuts = companyLogs.filter(log => log.clockInTime && !log.clockOutTime).length;
        auditData.excludedRecords.missingClockOut += missedClockOuts;
        const violationCount = missedClockOuts;

        // METRIC 4: Supervisor Participation = % of records with supervisor confirmation
        const recordsWithSupervisor = companyLogs.filter(log => 
          log.supervisorStatus && log.supervisorStatus !== 'pending'
        ).length;
        const supervisorParticipation = companyLogs.length > 0
          ? Math.round((recordsWithSupervisor / companyLogs.length) * 100)
          : 0;

        // METRIC 5: Compliance Score = weighted calculation from REAL metrics only
        // Weighting: Attendance Integrity (40%) + Supervisor Participation (40%) - Violation Penalty (20%)
        // Violation Penalty: Each violation costs points, capped at 50 points max
        const violationPenalty = Math.min(50, violationCount * 2); // Each missed clock-out = 2 points
        const complianceScore = Math.max(0, Math.min(100,
          Math.round((attendanceIntegrity * 0.4 + supervisorParticipation * 0.4) - (violationPenalty * 0.2))
        ));

        auditData.rankingsCalculated++;

        return {
          id: company._id,
          name: company.companyName,
          attendanceIntegrity,
          supervisorParticipation,
          violationCount,
          staffCount,
          complianceScore,
          // Data transparency: how this metric was calculated
          dataSource: {
            attendanceRecordsAnalyzed: companyLogs.length,
            staffInCompany: staffCount,
            staffWithCompleteSessions: staffWithCompleteSessions.size,
            dataRange: 'All validated records',
            excludedInvalidRecords: allLogs.filter(log => validateRecord(log, 'attendance').length > 0).length,
            calculationMethod: 'Weighted formula: (AttendanceIntegrity×0.4 + SupervisorParticipation×0.4) - (ViolationPenalty×0.2)'
          }
        };
      });

      setDataAudit(auditData);
      return rankings.sort((a, b) => b.complianceScore - a.complianceScore);
    } catch (error) {
      console.error('Error calculating compliance rankings:', error);
      setDataValidationErrors([`Error during calculation: ${error.message}`]);
      return [];
    }
  };

  const loadInstitutionalData = async () => {
    setLoading(true);
    setDataValidationErrors([]);
    try {
      const companiesRes = await hostCompanyAPI.getAll();
      if (companiesRes.success && Array.isArray(companiesRes.companies)) {
        if (companiesRes.companies.length === 0) {
          setDataValidationErrors(['No companies available for analysis']);
          setCompanies([]);
          setComplianceRankings([]);
        } else {
          setCompanies(companiesRes.companies);
          
          // Calculate rankings from REAL data only
          const rankings = await calculateComplianceRankings(companiesRes.companies);
          setComplianceRankings(rankings);
        }
      } else {
        setDataValidationErrors(['Unable to fetch companies data from API']);
        setCompanies([]);
        setComplianceRankings([]);
      }
    } catch (error) {
      console.error('Error loading institutional data:', error);
      setDataValidationErrors([`Error loading data: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReport = (company) => {
    const timestamp = new Date().toISOString();
    // Generate unique report ID for audit trail
    const reportId = `INST-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now()}`;

    const headerHtml = `
      <div style="font-family: Inter, Segoe UI, Roboto, Arial, sans-serif; color: #1F2933;">
        <h2 style="margin:0;">INSTITUTIONAL COMPLIANCE REPORT</h2>
        <div style="margin-top:6px;font-size:13px;color:#6B7280;">Generated by FaceClock System • Timestamp: ${timestamp}</div>
        <div style="margin-top:6px;font-size:13px;color:#6B7280;">Report ID: ${reportId}</div>
        <hr style="margin:12px 0;border:none;border-top:1px solid #D1D5DB;" />
      </div>
    `;

    const dataSourceHtml = `
      <div style="margin-top:12px;padding:8px;background:#F3F4F6;border-left:4px solid #3B82F6;">
        <h4 style="margin:0 0 6px 0;font-size:12px;color:#374151;">Data Source & Methodology</h4>
        <p style="margin:4px 0;font-size:11px;color:#6B7280;">
          <strong>Records Analyzed:</strong> ${company.dataSource.attendanceRecordsAnalyzed} attendance records
        </p>
        <p style="margin:4px 0;font-size:11px;color:#6B7280;">
          <strong>Staff in Company:</strong> ${company.dataSource.staffInCompany}
        </p>
        <p style="margin:4px 0;font-size:11px;color:#6B7280;">
          <strong>Calculation Method:</strong> ${company.dataSource.calculationMethod}
        </p>
        <p style="margin:4px 0;font-size:11px;color:#6B7280;">
          <strong>Data Scope:</strong> ${company.dataSource.dataRange}
        </p>
      </div>
    `;

    const bodyHtml = `
      <div style="font-family: Inter, Segoe UI, Roboto, Arial, sans-serif; color:#1F2933; font-size:13px;">
        <h3 style="margin:0 0 8px 0;">${company.name} — Compliance Summary</h3>
        
        <div style="margin:12px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px;border:1px solid #D1D5DB;">Compliance Score</td>
              <td style="padding:6px;border:1px solid #D1D5DB;font-weight:bold;">${company.complianceScore}/100</td>
            </tr>
            <tr>
              <td style="padding:6px;border:1px solid #D1D5DB;">Attendance Integrity</td>
              <td style="padding:6px;border:1px solid #D1D5DB;">${company.attendanceIntegrity}%</td>
            </tr>
            <tr>
              <td style="padding:6px;border:1px solid #D1D5DB;">Supervisor Participation</td>
              <td style="padding:6px;border:1px solid #D1D5DB;">${company.supervisorParticipation}%</td>
            </tr>
            <tr>
              <td style="padding:6px;border:1px solid #D1D5DB;">Staff Count</td>
              <td style="padding:6px;border:1px solid #D1D5DB;">${company.staffCount}</td>
            </tr>
            <tr>
              <td style="padding:6px;border:1px solid #D1D5DB;">Violations (Missed Clock-Outs)</td>
              <td style="padding:6px;border:1px solid #D1D5DB;color:#dc2626;font-weight:bold;">${company.violationCount}</td>
            </tr>
          </table>
        </div>

        ${dataSourceHtml}

        <hr style="margin:12px 0;border:none;border-top:1px solid #D1D5DB;" />
        <p style="margin-top:12px;font-size:11px;color:#6B7280;font-style:italic;">
          This report is data-driven and derived from validated attendance records. All metrics are calculated from actual system data.
        </p>
      </div>
    `;

    const win = window.open('', '_blank');
    if (!win) {
      console.error('Unable to open print window');
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Report ${reportId}</title>
          <style>
            body { margin:24px; font-family: Inter, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.4; }
            h2,h3,h4 { margin:0; }
            table { background: white; }
          </style>
        </head>
        <body>
          ${headerHtml}
          ${bodyHtml}
        </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const getRankingColor = (score) => {
    if (score >= 85) return '#16a34a'; // Green
    if (score >= 70) return '#f59e0b'; // Yellow
    return '#dc2626'; // Red
  };

  const getRankingBadge = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="institutional-reports">
      <div className="intro-section">
        <h2>Institutional & Audit Reports</h2>
        <p className="intro-text">
          Enterprise-grade compliance reports derived entirely from real attendance data.
          All metrics are calculated from validated records and include transparent data source information for audit compliance.
        </p>
      </div>

      {dataValidationErrors.length > 0 && (
        <div className="error-banner">
          <MdWarning /> Data Integrity Warning:
          <ul>
            {dataValidationErrors.map((error, idx) => <li key={idx}>{error}</li>)}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading compliance data...</p>
        </div>
      ) : complianceRankings.length > 0 ? (
        <>
          {/* Data Audit Trail */}
        

          {/* Host Company Compliance Ranking */}
          <div className="rankings-section">
            <h3>Host Company Compliance Rankings</h3>
            <p className="section-description">
              Companies ranked by attendance integrity, supervisor participation, and ethical compliance.
              All scores derived from real attendance data.
            </p>

            <div className="rankings-table-wrapper">
              <table className="rankings-table">
                <thead>
                  <tr>
                    <th className="rank-col">Rank</th>
                    <th className="name-col">Company Name</th>
                    <th className="metric-col">Attendance Integrity</th>
                    <th className="metric-col">Supervisor Participation</th>
                    <th className="metric-col">Violations</th>
                    <th className="metric-col">Staff Count</th>
                    <th className="score-col">Compliance Score</th>
                    <th className="badge-col">Rating</th>
                    <th className="action-col">Export</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceRankings.map((company, idx) => (
                    <tr key={company.id} className={`rank-${idx + 1}`}>
                      <td className="rank-cell">
                        <span className="rank-badge">
                          #{idx + 1}
                          {idx === 0 && <span className="top-badge">🏆</span>}
                        </span>
                      </td>
                      <td className="name-cell">{company.name}</td>
                      <td className="metric-cell">{company.attendanceIntegrity}%</td>
                      <td className="metric-cell">{company.supervisorParticipation}%</td>
                      <td className="metric-cell alert">{company.violationCount}</td>
                      <td className="metric-cell">{company.staffCount}</td>
                      <td className="score-cell" style={{ color: getRankingColor(company.complianceScore) }}>
                        <strong>{company.complianceScore}/100</strong>
                      </td>
                      <td className="badge-cell">
                        <span 
                          className="rating-badge"
                          style={{ backgroundColor: getRankingColor(company.complianceScore) }}
                        >
                          {getRankingBadge(company.complianceScore)}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button 
                          className="export-btn"
                          onClick={() => generatePDFReport(company)}
                          title="Export compliance summary as PDF"
                        >
                          <MdFileDownload />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Recommendations */}
          <div className="recommendations-section">
            <h3>Institutional Recommendations</h3>
            <div className="recommendations-list">
              <div className="recommendation-card">
                <div className="recommendation-icon">📊</div>
                <div className="recommendation-content">
                  <h5>Monitor High-Risk Companies</h5>
                  <p>Companies with compliance scores below 70 require additional oversight and intervention strategies.</p>
                </div>
              </div>
              <div className="recommendation-card">
                <div className="recommendation-icon">👥</div>
                <div className="recommendation-content">
                  <h5>Improve Supervisor Training</h5>
                  <p>Increase supervisor participation rates through training programs and regular feedback sessions.</p>
                </div>
              </div>
              <div className="recommendation-card">
                <div className="recommendation-icon">⚠️</div>
                <div className="recommendation-content">
                  <h5>Early Intervention</h5>
                  <p>Use risk scoring to identify at-risk interns early and provide targeted support.</p>
                </div>
              </div>
              <div className="recommendation-card">
                <div className="recommendation-icon">🔍</div>
                <div className="recommendation-content">
                  <h5>Regular Audits</h5>
                  <p>Conduct quarterly audits on companies with declining compliance trends.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No companies available for analysis.</p>
        </div>
      )}
    </div>
  );
}

export default InstitutionalReports;
