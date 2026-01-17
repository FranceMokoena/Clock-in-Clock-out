import React, { useState, useEffect } from 'react';
import { MdTrendingDown, MdAlertCircle, MdCheckCircle } from 'react-icons/md';
import { staffAPI, attendanceAPI } from '../../services/api';
import ReportFilters from './ReportFilters';
import './RiskAlertReports.css';

function RiskAlertReports({ isAdmin, hostCompanyId, isHostCompany }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [interns, setInterns] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'high', 'medium', 'low'

  useEffect(() => {
    loadFilterOptions();
  }, [hostCompanyId]);

  useEffect(() => {
    loadRiskReport();
  }, [selectedMonth, selectedYear]);

  const loadFilterOptions = async () => {
    try {
      const staffParams = isHostCompany ? { hostCompanyId } : {};
      const staffRes = await staffAPI.getAll(staffParams);
      
      if (staffRes.success && Array.isArray(staffRes.staff)) {
        setInterns(staffRes.staff.filter(s => s.role === 'Intern'));
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadRiskReport = async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        year: selectedYear,
        ...(isHostCompany && { hostCompanyId })
      };

      const staffRes = await staffAPI.getAll(params);
      const attendanceRes = await attendanceAPI.getAll(params);

      if (staffRes.success && attendanceRes.success) {
        const processed = processRiskData(
          staffRes.staff || [], 
          attendanceRes.data || attendanceRes.clockLogs || []
        );
        setReportData(processed);
      }
    } catch (error) {
      console.error('Error loading risk report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process risk data from REAL attendance records
   * ALL risk calculations based on actual data, NO hardcoded values
   */
  const processRiskData = (staff, logs) => {
    const riskProfiles = [];

    staff.forEach(intern => {
      const internLogs = logs.filter(l => l.staffId === intern._id || l.staffId === String(intern._id));
      
      if (internLogs.length === 0) {
        // No attendance data for this intern - mark as unknown risk
        riskProfiles.push({
          intern: intern.name || 'Unknown',
          internId: intern._id,
          hostCompany: intern.hostCompany || 'Unknown',
          riskScore: 0,
          riskLevel: 'unknown',
          riskColor: '#9CA3AF',
          riskIcon: '❓',
          metrics: {
            absenteeismRate: 0,
            latenessRate: 0,
            violations: 0,
            daysPresent: 0,
            completeSessions: 0,
            incompleteSessions: 0
          },
          flags: ['No attendance records found'],
          dropoutLikelihood: 0,
          trend: 'unknown',
          dataAvailable: false
        });
        return;
      }

      // REAL METRIC 1: Calculate actual absenteeism
      // Get working days in the period (Monday-Friday)
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      let workingDays = 0;
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) workingDays++; // Exclude Sunday (0) and Saturday (6)
      }
      
      const daysPresent = new Set(internLogs.map(l => new Date(l.clockInTime).toDateString())).size;
      const absenteeismRate = workingDays > 0 
        ? Math.round(((workingDays - daysPresent) / workingDays) * 100)
        : 0;

      // REAL METRIC 2: Calculate actual lateness rate
      // Count late arrivals (after 9:00 AM standard time)
      const lateDays = internLogs.filter(log => {
        const clockIn = new Date(log.clockInTime);
        return clockIn.getHours() > 9 || 
               (clockIn.getHours() === 9 && clockIn.getMinutes() > 0);
      }).length;
      const latenessRate = internLogs.length > 0
        ? Math.round((lateDays / internLogs.length) * 100)
        : 0;

      // REAL METRIC 3: Count actual violations (missed clock-outs)
      const violations = internLogs.filter(log => !log.clockOutTime).length;

      // REAL METRIC 4: Session completeness
      const completeSessions = internLogs.filter(log => log.clockInTime && log.clockOutTime).length;
      const incompleteSessions = internLogs.filter(log => log.clockInTime && !log.clockOutTime).length;

      // REAL RISK SCORE: Weighted calculation from actual metrics
      // Formula: (absenteeismRate * 0.4 + latenessRate * 0.3 + violationPenalty * 0.3)
      const violationPenalty = Math.min(100, violations * 10); // Each violation adds 10 points
      const riskScore = Math.round(
        (absenteeismRate * 0.4 + latenessRate * 0.3 + violationPenalty * 0.3)
      );

      // Determine risk level based on score
      let riskLevel = 'low';
      let riskColor = '#16a34a';
      let riskIcon = '✅';
      
      if (riskScore >= 75) {
        riskLevel = 'high';
        riskColor = '#dc2626';
        riskIcon = '🔴';
      } else if (riskScore >= 50) {
        riskLevel = 'medium';
        riskColor = '#f59e0b';
        riskIcon = '🟡';
      }

      // Dropout likelihood: weighted calculation from actual behavior
      const dropoutLikelihood = Math.min(
        100,
        Math.round((absenteeismRate * 0.5 + riskScore * 0.5))
      );

      // Generate flags based on REAL data only
      const flags = [];
      if (absenteeismRate > 30) flags.push(`High absenteeism: ${absenteeismRate}% absent`);
      if (latenessRate > 50) flags.push(`Frequent lateness: ${latenessRate}% late arrivals`);
      if (violations > 2) flags.push(`Multiple violations: ${violations} missed clock-outs`);
      if (incompleteSessions > Math.ceil(internLogs.length * 0.2)) {
        flags.push(`Data quality issue: ${incompleteSessions} incomplete records`);
      }
      if (dropoutLikelihood > 70) flags.push('⚠️ High dropout risk indicator');

      riskProfiles.push({
        intern: intern.name || 'Unknown',
        internId: intern._id,
        hostCompany: intern.hostCompany || 'Unknown',
        riskScore,
        riskLevel,
        riskColor,
        riskIcon,
        metrics: {
          absenteeismRate,
          latenessRate,
          violations,
          daysPresent,
          completeSessions,
          incompleteSessions,
          workingDaysInPeriod: workingDays
        },
        flags,
        dropoutLikelihood,
        trend: 'calculated', // Trend would require historical comparison
        dataAvailable: true
      });
    });

    // Sort by risk score
    riskProfiles.sort((a, b) => b.riskScore - a.riskScore);

    return {
      profiles: riskProfiles,
      summary: {
        highRisk: riskProfiles.filter(p => p.riskLevel === 'high').length,
        mediumRisk: riskProfiles.filter(p => p.riskLevel === 'medium').length,
        lowRisk: riskProfiles.filter(p => p.riskLevel === 'low').length,
        unknown: riskProfiles.filter(p => p.riskLevel === 'unknown').length,
        dropoutRisk: riskProfiles.filter(p => p.dropoutLikelihood > 70).length,
        totalAnalyzed: riskProfiles.length
      }
    };
  };

  const getFilteredProfiles = () => {
    if (!reportData) return [];
    if (riskFilter === 'all') return reportData.profiles;
    return reportData.profiles.filter(p => p.riskLevel === riskFilter);
  };

  return (
    <div className="risk-alert-reports">
      <ReportFilters
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        showTimeframe={false}
        showIntern={false}
        showCompany={false}
      />

      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Calculating risk scores from attendance data...</p>
        </div>
      ) : reportData ? (
        <>
          {/* Risk Summary */}
          <div className="risk-summary">
            <div className="summary-card high-risk">
              <div className="card-icon">🔴</div>
              <div className="card-content">
                <div className="card-label">High Risk</div>
                <div className="card-value">{reportData.summary.highRisk}</div>
              </div>
            </div>
            <div className="summary-card medium-risk">
              <div className="card-icon">🟡</div>
              <div className="card-content">
                <div className="card-label">Medium Risk</div>
                <div className="card-value">{reportData.summary.mediumRisk}</div>
              </div>
            </div>
            <div className="summary-card low-risk">
              <div className="card-icon">🟢</div>
              <div className="card-content">
                <div className="card-label">Low Risk</div>
                <div className="card-value">{reportData.summary.lowRisk}</div>
              </div>
            </div>
            <div className="summary-card dropout-risk">
              <div className="card-icon">⚠️</div>
              <div className="card-content">
                <div className="card-label">Dropout Risk</div>
                <div className="card-value">{reportData.summary.dropoutRisk}</div>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="filter-buttons-row">
            <button 
              className={`filter-btn ${riskFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRiskFilter('all')}
            >
              All ({reportData.summary.totalAnalyzed})
            </button>
            <button 
              className={`filter-btn high ${riskFilter === 'high' ? 'active' : ''}`}
              onClick={() => setRiskFilter('high')}
            >
              High Risk ({reportData.summary.highRisk})
            </button>
            <button 
              className={`filter-btn medium ${riskFilter === 'medium' ? 'active' : ''}`}
              onClick={() => setRiskFilter('medium')}
            >
              Medium Risk ({reportData.summary.mediumRisk})
            </button>
            <button 
              className={`filter-btn low ${riskFilter === 'low' ? 'active' : ''}`}
              onClick={() => setRiskFilter('low')}
            >
              Low Risk ({reportData.summary.lowRisk})
            </button>
          </div>

          {/* Risk Profiles Table */}
          <div className="risk-profiles-section">
            <h3>Risk Assessment Details</h3>
            <p className="section-description">
              Risk scores calculated from actual attendance patterns. 
              Absenteeism (40%) + Lateness (30%) + Violations (30%).
            </p>

            <table className="risk-table">
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Company</th>
                  <th>Risk Score</th>
                  <th>Absenteeism</th>
                  <th>Lateness</th>
                  <th>Violations</th>
                  <th>Status</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredProfiles().map((profile) => (
                  <tr key={profile.internId} className={`risk-${profile.riskLevel}`}>
                    <td className="name-cell">{profile.intern}</td>
                    <td className="company-cell">{profile.hostCompany}</td>
                    <td className="score-cell">
                      <span 
                        className="score-badge"
                        style={{ backgroundColor: profile.riskColor }}
                      >
                        {profile.riskIcon} {profile.riskScore}
                      </span>
                    </td>
                    <td className="metric-cell">{profile.metrics.absenteeismRate}%</td>
                    <td className="metric-cell">{profile.metrics.latenessRate}%</td>
                    <td className="metric-cell">{profile.metrics.violations}</td>
                    <td className="status-cell">
                      <span className="status-badge" style={{ backgroundColor: profile.riskColor }}>
                        {profile.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="flags-cell">
                      {profile.flags.length > 0 ? (
                        <ul className="flags-list">
                          {profile.flags.slice(0, 2).map((flag, idx) => (
                            <li key={idx}>{flag}</li>
                          ))}
                          {profile.flags.length > 2 && <li>+{profile.flags.length - 2} more</li>}
                        </ul>
                      ) : (
                        <span>No flags</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {getFilteredProfiles().length === 0 && (
              <div className="empty-state">
                <p>No profiles match the selected filter.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>No risk data available for the selected period.</p>
        </div>
      )}
    </div>
  );
}

export default RiskAlertReports;
