import React, { useState, useEffect } from 'react';
import { MdTrendingUp, MdTrendingDown, MdWarning } from 'react-icons/md';
import { staffAPI, attendanceAPI } from '../../services/api';
import ReportFilters from './ReportFilters';
import './BehavioralReports.css';

function BehavioralReports({ isAdmin, hostCompanyId, isHostCompany }) {
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [interns, setInterns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Configurable grace period - should come from system settings
  // For now, default to 9:00 AM (standard business hours)
  const GRACE_PERIOD_HOUR = 9;
  const GRACE_PERIOD_MINUTE = 0;

  useEffect(() => {
    loadFilterOptions();
  }, [hostCompanyId]);

  useEffect(() => {
    if (selectedIntern || selectedCompany) {
      loadBehavioralReport();
    }
  }, [selectedIntern, selectedCompany]);

  const loadFilterOptions = async () => {
    try {
      const staffParams = isHostCompany ? { hostCompanyId } : {};
      const staffRes = await staffAPI.getAll(staffParams);
      
      if (staffRes.success && Array.isArray(staffRes.staff)) {
        const allInterns = staffRes.staff.filter(s => s.role === 'Intern');
        setInterns(allInterns);
        
        // Auto-select first intern if available
        if (allInterns.length > 0) {
          setSelectedIntern(allInterns[0]._id);
        }

        const uniqueCompanies = [...new Set(staffRes.staff.map(s => s.hostCompany))];
        setCompanies(uniqueCompanies.filter(Boolean).map(c => ({ name: c })));
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadBehavioralReport = async () => {
    setLoading(true);
    try {
      const params = {
        ...(selectedIntern && { staffId: selectedIntern }),
        ...(selectedCompany && { hostCompany: selectedCompany }),
        ...(isHostCompany && { hostCompanyId })
      };

      const response = await attendanceAPI.getAll(params);
      const logs = response.success ? (response.data || response.clockLogs || []) : [];
      
      if (Array.isArray(logs) && logs.length > 0) {
        const processed = processBehavioralData(logs);
        setReportData(processed);
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error('Error loading behavioral report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const processBehavioralData = (logs) => {
    if (logs.length === 0) return null;

    // Helper function to check if clock-in is on time (before grace period)
    const isOnTime = (clockInTime) => {
      const hour = clockInTime.getHours();
      const minute = clockInTime.getMinutes();
      
      if (hour < GRACE_PERIOD_HOUR) return true;
      if (hour === GRACE_PERIOD_HOUR && minute <= GRACE_PERIOD_MINUTE) return true;
      return false;
    };

    const totalDays = logs.length;
    const onTimeDays = logs.filter(log => {
      const clockIn = new Date(log.clockInTime);
      return isOnTime(clockIn);
    }).length;

    const lateDays = totalDays - onTimeDays;
    const consistencyScore = Math.round((onTimeDays / totalDays) * 100);
    const punctualityScore = Math.round((onTimeDays / totalDays) * 100);

    // Calculate trend - compare actual date-based periods
    // Group logs by date
    const logsByDate = {};
    logs.forEach(log => {
      const dateKey = new Date(log.clockInTime).toDateString();
      if (!logsByDate[dateKey]) {
        logsByDate[dateKey] = [];
      }
      logsByDate[dateKey].push(log);
    });

    const sortedDates = Object.keys(logsByDate).sort((a, b) => new Date(a) - new Date(b));
    
    // Compare last 7 calendar days vs previous 7 calendar days
    const last7DatesArray = sortedDates.slice(-7);
    const previousPeriodArray = sortedDates.slice(Math.max(0, sortedDates.length - 14), sortedDates.length - 7);
    
    const last7Days = last7DatesArray.flatMap(date => logsByDate[date]);
    const previousPeriod = previousPeriodArray.flatMap(date => logsByDate[date]);
    
    const last7OnTime = last7Days.filter(log => {
      const clockIn = new Date(log.clockInTime);
      return isOnTime(clockIn);
    }).length;

    const prevOnTime = previousPeriod.filter(log => {
      const clockIn = new Date(log.clockInTime);
      return isOnTime(clockIn);
    }).length;

    const last7Rate = last7Days.length > 0 ? Math.round((last7OnTime / last7Days.length) * 100) : 0;
    const prevRate = previousPeriod.length > 0 ? Math.round((prevOnTime / previousPeriod.length) * 100) : 0;

    const reliabilityTrend = last7Rate > prevRate ? 'improving' : last7Rate < prevRate ? 'declining' : 'stable';

    // Habit detection
    const hourlyDistribution = {};
    logs.forEach(log => {
      const hour = new Date(log.clockInTime).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    const dayOfWeekPatterns = {};
    logs.forEach(log => {
      const day = new Date(log.clockInTime).toLocaleDateString('default', { weekday: 'short' });
      if (!dayOfWeekPatterns[day]) {
        dayOfWeekPatterns[day] = { count: 0, late: 0 };
      }
      dayOfWeekPatterns[day].count++;
      
      const clockIn = new Date(log.clockInTime);
      if (!isOnTime(clockIn)) {
        dayOfWeekPatterns[day].late++;
      }
    });

    // Find the day with most lateness
    let habitDay = null;
    let maxLateCount = 0;
    Object.entries(dayOfWeekPatterns).forEach(([day, data]) => {
      if (data.late > maxLateCount) {
        maxLateCount = data.late;
        habitDay = day;
      }
    });

    // Pattern flags - all based on REAL data
    const patterns = [];
    
    // Check for consistent late arrivals
    const lateClockIns = logs.filter(log => {
      const clockIn = new Date(log.clockInTime);
      return !isOnTime(clockIn);
    });

    if (lateClockIns.length >= 5) {
      patterns.push({
        flag: 'Frequent Lateness',
        description: `Late for ${lateClockIns.length} out of ${totalDays} days (threshold: 5+ occurrences)`,
        severity: 'medium',
        icon: '⏰'
      });
    }

    if (habitDay && maxLateCount >= 3) {
      patterns.push({
        flag: `${habitDay} Pattern`,
        description: `Late ${maxLateCount} times on ${habitDay}s - Historical pattern detected`,
        severity: 'low',
        icon: '📅'
      });
    }

    // Check for just-before-grace-period clock-ins (last minute arrivals)
    const justBeforeCutoff = logs.filter(log => {
      const clockIn = new Date(log.clockInTime);
      const isLastMinute = clockIn.getHours() === GRACE_PERIOD_HOUR && 
                          clockIn.getMinutes() > (GRACE_PERIOD_MINUTE + 55);
      return isLastMinute;
    });

    if (justBeforeCutoff.length >= 3) {
      patterns.push({
        flag: 'Last-Minute Arrivals',
        description: `${justBeforeCutoff.length} arrivals within 5 minutes of grace period cutoff (${GRACE_PERIOD_HOUR}:${String(GRACE_PERIOD_MINUTE).padStart(2, '0')})`,
        severity: 'low',
        icon: '⚠️'
      });
    }

    // Check for suspicious repeated exact times (potential data integrity issue)
    const timeFrequency = {};
    logs.forEach(log => {
      const time = new Date(log.clockInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      timeFrequency[time] = (timeFrequency[time] || 0) + 1;
    });

    const suspiciousDuplicateTimes = Object.entries(timeFrequency).filter(([_, count]) => count >= 3);
    if (suspiciousDuplicateTimes.length > 2) {
      patterns.push({
        flag: 'Repeated Clock-In Times',
        description: `${suspiciousDuplicateTimes.length} time values appear 3+ times - recommend data audit`,
        severity: 'medium',
        icon: '🔄'
      });
    }

    return {
      profile: {
        consistencyScore,
        punctualityScore,
        reliabilityTrend,
        reliabilityPercentage: last7Rate,
        previousPercentage: prevRate
      },
      habits: {
        mostLateDay: habitDay,
        totalLateDays: lateDays,
        patterns
      },
      rawData: {
        totalDays,
        onTimeDays,
        lateDays,
        hourlyDistribution,
        dayOfWeekPatterns
      },
      dataSource: {
        recordsAnalyzed: logs.length,
        gracePeriod: `${GRACE_PERIOD_HOUR}:${String(GRACE_PERIOD_MINUTE).padStart(2, '0')}`,
        dateRange: sortedDates.length > 0 ? `${last7DatesArray[0]} to ${last7DatesArray[last7DatesArray.length - 1]}` : 'N/A'
      }
    };
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#16a34a'; // Green
    if (score >= 75) return '#fbbf24'; // Yellow
    return '#dc2626'; // Red
  };

  return (
    <div className="behavioral-reports">
      <ReportFilters
        interns={interns}
        selectedIntern={selectedIntern}
        onInternChange={setSelectedIntern}
        companies={companies}
        selectedCompany={selectedCompany}
        onCompanyChange={setSelectedCompany}
        showTimeframe={false}
        showMonth={false}
        showYear={false}
      />

      {loading ? (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading behavioral analysis...</p>
        </div>
      ) : reportData ? (
        <>
          {/* Behavior Profile Cards */}
          <div className="behavior-profiles">
            <h2>Behavior Profile</h2>
            
            <div className="profile-cards">
              <div className="profile-card primary">
                <div className="card-title">Consistency Score</div>
                <div className="score-display">
                  <div className="score-number" style={{ color: getScoreColor(reportData.profile.consistencyScore) }}>
                    {reportData.profile.consistencyScore}%
                  </div>
                  <div className="score-description">
                    Out of {reportData.rawData.totalDays} days attended
                  </div>
                </div>
              </div>

              <div className="profile-card primary">
                <div className="card-title">Punctuality Score</div>
                <div className="score-display">
                  <div className="score-number" style={{ color: getScoreColor(reportData.profile.punctualityScore) }}>
                    {reportData.profile.punctualityScore}%
                  </div>
                  <div className="score-description">
                    {reportData.rawData.onTimeDays} on-time arrivals
                  </div>
                </div>
              </div>

              <div className="profile-card trend">
                <div className="card-title">Reliability Trend</div>
                <div className="trend-display">
                  <div className={`trend-indicator ${reportData.profile.reliabilityTrend}`}>
                    {reportData.profile.reliabilityTrend === 'improving' && <MdTrendingUp />}
                    {reportData.profile.reliabilityTrend === 'declining' && <MdTrendingDown />}
                    {reportData.profile.reliabilityTrend === 'stable' && <span>→</span>}
                  </div>
                  <div>
                    <div className="trend-label">
                      {reportData.profile.reliabilityTrend.charAt(0).toUpperCase() + reportData.profile.reliabilityTrend.slice(1)}
                    </div>
                    <div className="trend-details">
                      Last 7 days: {reportData.profile.reliabilityPercentage}% vs Previous: {reportData.profile.previousPercentage}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Transparency */}
          <div className="data-transparency-info">
            <div className="transparency-item">
              <span className="info-label">Records Analyzed:</span>
              <span className="info-value">{reportData.dataSource.recordsAnalyzed}</span>
            </div>
            <div className="transparency-item">
              <span className="info-label">Grace Period (On-Time Cutoff):</span>
              <span className="info-value">{reportData.dataSource.gracePeriod}</span>
            </div>
            <div className="transparency-item">
              <span className="info-label">Date Range:</span>
              <span className="info-value">{reportData.dataSource.dateRange}</span>
            </div>
          </div>

          {/* Habits & Patterns */}
          {reportData.habits.patterns.length > 0 && (
            <div className="habits-section">
              <h2>Detected Patterns & Habits</h2>
              <div className="patterns-list">
                {reportData.habits.patterns.map((pattern, idx) => (
                  <div key={idx} className={`pattern-card severity-${pattern.severity}`}>
                    <div className="pattern-header">
                      <span className="pattern-icon">{pattern.icon}</span>
                      <span className="pattern-name">{pattern.flag}</span>
                      <span className={`severity-badge severity-${pattern.severity}`}>
                        {pattern.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="pattern-description">{pattern.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day of Week Analysis */}
          <div className="analysis-section">
            <h2>Performance by Day of Week</h2>
            <div className="day-analysis-grid">
              {Object.entries(reportData.rawData.dayOfWeekPatterns).map(([day, data]) => (
                <div key={day} className="day-card">
                  <div className="day-name">{day}</div>
                  <div className="day-stats">
                    <div className="stat">
                      <span className="label">Total</span>
                      <span className="value">{data.count}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Late</span>
                      <span className="value" style={{ color: data.late > 0 ? '#dc2626' : '#16a34a' }}>
                        {data.late}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="label">Rate</span>
                      <span className="value">
                        {data.count > 0 ? Math.round(((data.count - data.late) / data.count) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Select an intern or company to view behavioral analysis.</p>
        </div>
      )}
    </div>
  );
}

export default BehavioralReports;
