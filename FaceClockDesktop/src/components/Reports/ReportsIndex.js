import React, { useState, useEffect } from 'react';
import {
  MdTrendingUp,
  MdTrendingDown,
  MdWarning,
  MdCheckCircle,
  MdArrowBack,
  MdFileDownload,
  MdHelpOutline,
  MdClose,
  MdAdd,
} from 'react-icons/md';
import { staffAPI, attendanceAPI, internReportsAPI } from '../../services/api';
import AttendanceReports from './AttendanceReports';
import BehavioralReports from './BehavioralReports';
import ComplianceReports from './ComplianceReports';
import PerformanceReports from './PerformanceReports';
import RiskAlertReports from './RiskAlertReports';
import InstitutionalReports from './InstitutionalReports';
import InternReportModal from './InternReportModal';
import InternReportsAdmin from './InternReportsAdmin';
import '../Reports.css';

function ReportsIndex({ isAdmin, hostCompanyId, isHostCompany }) {
  const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'attendance', 'behavioral', 'compliance', 'performance', 'risk', 'institutional'
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [interns, setInterns] = useState([]);
  const [selectedIntern, setSelectedIntern] = useState('');
  const [selectedInternData, setSelectedInternData] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [previousReports, setPreviousReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const reportSections = [
    {
      id: 'attendance',
      title: 'Attendance Reports',
      description: 'Daily, weekly, monthly attendance summaries',
      icon: '📅',
      color: 'var(--gov-secondary)'
    },
    {
      id: 'behavioral',
      title: 'Behavioral Reports',
      description: 'Consistency scores and punctuality analysis',
      icon: '📊',
      color: 'var(--gov-secondary)'
    },
    {
      id: 'compliance',
      title: 'Compliance, Ethics & Audit Findings',
      description: 'Violations tracking, manipulation detection and immutable audit trails',
      icon: '⚖️',
      color: 'var(--gov-danger)'
    },
    {
      id: 'performance',
      title: 'Performance & Productivity',
      description: 'Supervisor-validated productivity and task correlation',
      icon: '⚡',
      color: 'var(--gov-success)'
    },
    {
      id: 'risk',
      title: 'Risk Monitoring & Early Warning Indicators',
      description: 'Early-warning indicators and recommended interventions',
      icon: '⚠️',
      color: 'var(--gov-warning)'
    },
    {
      id: 'institutional',
      title: 'Institutional & Audit Reports',
      description: 'Company rankings, institutional compliance scorecards and exports',
      icon: '📋',
      color: 'var(--gov-primary)'
    },
    {
      id: 'intern-reports',
      title: 'Intern CaseLogs Management',
      description: 'Review and acknowledge CaseLogs submitted by Host Companies about interns',
      icon: '📝',
      color: '#d32f2f'
    }
  ];

  useEffect(() => {
    if (activeSection === 'overview') {
      loadOverviewStats();
    }
  }, [activeSection, hostCompanyId, isHostCompany]);

  useEffect(() => {
    // If host company user, load interns list scoped to their company
    const loadInterns = async () => {
      if (!isHostCompany) return;
      try {
        const res = await staffAPI.getList({ hostCompanyId });
        if (res && res.success && Array.isArray(res.staff)) {
          const internsList = res.staff.filter(s => s.role === 'Intern');
          setInterns(internsList);
        }
      } catch (err) {
        console.warn('Failed to load interns for host company:', err);
      }
    };
    loadInterns();
  }, [isHostCompany, hostCompanyId]);

  // Load reports when an intern is selected
  useEffect(() => {
    if (!selectedIntern || !isHostCompany) return;

    const loadReports = async () => {
      setLoadingReports(true);
      try {
        const result = await internReportsAPI.getReports(
          selectedIntern,
          hostCompanyId,
          'HOST_COMPANY'
        );
        if (result.success) {
          setPreviousReports(result.reports || []);
        } else {
          setPreviousReports([]);
        }
      } catch (err) {
        console.warn('Failed to load reports for intern:', err);
        setPreviousReports([]);
      } finally {
        setLoadingReports(false);
      }
    };

    loadReports();
  }, [selectedIntern, isHostCompany, hostCompanyId]);

  // Handle intern selection
  const handleInternSelect = (internId) => {
    setSelectedIntern(internId);
    const internData = interns.find(i => i._id === internId);
    setSelectedInternData(internData || null);
  };

  // Handle report submission completion
  const handleReportSubmitted = async () => {
    // Reload the reports list
    if (selectedIntern) {
      setLoadingReports(true);
      try {
        const result = await internReportsAPI.getReports(
          selectedIntern,
          hostCompanyId,
          'HOST_COMPANY'
        );
        if (result.success) {
          setPreviousReports(result.reports || []);
        }
      } catch (err) {
        console.warn('Failed to reload reports:', err);
      } finally {
        setLoadingReports(false);
      }
    }
  };

  // Get unique departments from interns list
  const departments = [...new Set(interns.map(i => i.department).filter(Boolean))];

  // Filter interns based on selected filters
  const filteredInterns = interns.filter(intern => {
    if (departmentFilter && intern.department !== departmentFilter) return false;
    return true;
  });

  const loadOverviewStats = async () => {
    setLoading(true);
    try {
      // Enforce company scoping at API level for Host Company users.
      // Use `hostCompanyId` as the query key to match backend routes.
      const params = isHostCompany ? { hostCompanyId: hostCompanyId } : {};
      const staffRes = await staffAPI.getAll(params);
      const attendanceRes = await attendanceAPI.getAll(params);

      if (staffRes.success && attendanceRes.success) {
        const staff = Array.isArray(staffRes.staff) ? staffRes.staff : [];
        const attendance = Array.isArray(attendanceRes.clockLogs) ? attendanceRes.clockLogs : [];

        // Calculate overview stats
        const totalInterns = staff.filter(s => s.role === 'Intern').length;
        const totalDepartments = [...new Set(staff.map(s => s.department))].length;

        // Calculate attendance rate
        const presentToday = attendance.filter(a => {
          const logDate = new Date(a.clockInTime).toDateString();
          return logDate === new Date().toDateString();
        }).length;

        setStats({
          totalInterns,
          totalDepartments,
          presentToday,
          totalAttendanceRecords: attendance.length
        });
      }
    } catch (error) {
      console.error('Error loading overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (activeSection !== 'overview') {
    const SectionComponent = {
      attendance: AttendanceReports,
      behavioral: BehavioralReports,
      compliance: ComplianceReports,
      performance: PerformanceReports,
      risk: RiskAlertReports,
      institutional: InstitutionalReports,
      'intern-reports': InternReportsAdmin
    }[activeSection];

    return (
      <div className="reports-wrapper">
        <div className="reports-section-header">
          <button className="back-button" onClick={() => setActiveSection('overview')}>
            <MdArrowBack /> Back to Overview
          </button>


        </div>
        {SectionComponent && (
          <SectionComponent isAdmin={isAdmin} hostCompanyId={hostCompanyId} isHostCompany={isHostCompany} />
        )}
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Host Company: Purpose-driven reporting view */}
      {isHostCompany ? (
        <>
          {/* Header */}
          <div className="reports-header">
            <div>
              <h1>Intern CaseLogs & Complaints</h1>
              <p className="reports-subtitle">
                Submit and review formal caselog reports related to interns assigned to your company
              </p>
            </div>
          </div>

          {/* Intern Selection Section */}
          <div
            style={{
              backgroundColor: '#f9f9f9',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 20,
              marginBottom: 24
            }}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#222' }}>
              Step 1: Select an Intern
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Intern Dropdown */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#555' }}>
                  Intern <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={selectedIntern}
                  onChange={(e) => handleInternSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: '#222',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select an intern --</option>
                  {filteredInterns.map((intern) => (
                    <option key={intern._id} value={intern._id}>
                      {`${intern.name} ${intern.surname || ''} (${intern.idNumber || intern._id})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              {departments.length > 0 && (
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#555' }}>
                    Department <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>(Filter)</span>
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => {
                      setDepartmentFilter(e.target.value);
                      setSelectedIntern('');
                      setSelectedInternData(null);
                      setPreviousReports([]);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      color: '#222',
                      backgroundColor: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- All departments --</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Intern Context Panel (shown only when intern is selected) */}
          {selectedIntern && selectedInternData && (
            <div
              style={{
                backgroundColor: '#f0f4ff',
                border: '2px solid #1976d2',
                borderRadius: 8,
                padding: 20,
                marginBottom: 24
              }}
            >
              <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#222' }}>
                Step 2: Intern Context
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Intern Name</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>
                    {`${selectedInternData.name} ${selectedInternData.surname || ''}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Intern ID</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>
                    {selectedInternData.idNumber || selectedInternData._id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Department</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#222' }}>
                    {selectedInternData.department || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Actions (shown only when intern is selected) */}
          {selectedIntern && (
            <>
              <div style={{ marginBottom: 24 }}>
                <button
                  className="primary"
                  onClick={() => setShowReportModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <MdAdd size={20} />
                  Submit New CaseLog Report
                </button>
              </div>

              {/* Previous Reports Section */}
              <div
                style={{
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  padding: 20
                }}
              >
                <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#222' }}>
                  Step 3: Submitted Caselogs for this Intern
                </h2>

                {loadingReports ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                    Loading reports...
                  </div>
                ) : previousReports.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#999',
                      backgroundColor: '#fff',
                      borderRadius: 4,
                      border: '1px dashed #ddd'
                    }}
                  >
                    No reports submitted yet for this intern.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        backgroundColor: '#fff'
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Date
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Type
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Severity
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Title
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#555' }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {previousReports.map((report) => (
                          <tr
                            key={report._id}
                            style={{
                              borderBottom: '1px solid #e0e0e0',
                              backgroundColor: '#fff',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <td style={{ padding: '12px', fontSize: 13, color: '#222' }}>
                              {new Date(report.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px', fontSize: 13, color: '#222' }}>
                              {report.reportType}
                            </td>
                            <td style={{ padding: '12px', fontSize: 13, color: '#222' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: 3,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  backgroundColor:
                                    report.severity === 'High'
                                      ? '#ffebee'
                                      : report.severity === 'Medium'
                                        ? '#fff3e0'
                                        : '#e8f5e9',
                                  color:
                                    report.severity === 'High'
                                      ? '#c62828'
                                      : report.severity === 'Medium'
                                        ? '#f57c00'
                                        : '#2e7d32'
                                }}
                              >
                                {report.severity}
                              </span>
                            </td>
                            <td style={{ padding: '12px', fontSize: 13, color: '#222' }}>
                              {report.title}
                            </td>
                            <td style={{ padding: '12px', fontSize: 13, color: '#222' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: 3,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  backgroundColor:
                                    report.status === 'Submitted'
                                      ? '#e3f2fd'
                                      : report.status === 'Reviewed'
                                        ? '#f3e5f5'
                                        : '#e8f5e9',
                                  color:
                                    report.status === 'Submitted'
                                      ? '#1565c0'
                                      : report.status === 'Reviewed'
                                        ? '#6a1b9a'
                                        : '#2e7d32'
                                }}
                              >
                                {report.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Report Modal */}
          <InternReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            internId={selectedIntern}
            hostCompanyId={hostCompanyId}
            onReportSubmitted={handleReportSubmitted}
          />
        </>
      ) : (
        <>
          <div className="reports-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <h1>CaseLogs Management</h1>
                <p className="reports-subtitle">Track every host-company incident with severity, status, and admin accountability.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    CaseLog scope: System-wide (Admin)
                  </div>
                </div>
                <div>
                  <button
                    aria-label="Open CaseLog help"
                    className="help-button"
                    onClick={() => setShowHelp(true)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <MdHelpOutline size={22} />
                    <span style={{ fontSize: 14 }}>Need guidance?</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="caselog-callout" style={{ marginBottom: 24 }}>
            <p>
              CaseLogs highlight behavior flags, attendance gaps, and compliance incidents filed by host companies. Refresh, export, or click a CaseLog to review the full details with admin notes.
            </p>
          </div>


          {showHelp && (
            <div
              role="dialog"
              aria-modal="true"
              className="help-modal-overlay"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100
              }}
              onClick={() => setShowHelp(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#fff',
                  padding: 20,
                  borderRadius: 8,
                  width: '92%',
                  maxWidth: 640,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  color: '#222'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>What CaseLogs deliver</h2>
                  <button
                    aria-label="Close help"
                    onClick={() => setShowHelp(false)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <MdClose size={20} />
                  </button>
                </div>
                <div style={{ lineHeight: 1.5 }}>
                  <p style={{ marginTop: 8 }}>
                    Maintain oversight over every CaseLog by watching severity badges, refreshing the list, and opening each entry to add status updates or admin commentary.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Report Sections Grid */}
          <div className="reports-sections-grid">
            <h2 className="sections-title">Official Modules</h2>
            <div className="sections-container">
              {reportSections
                .filter(section => {
                  // Only show 'intern-reports' card for admins
                  if (isAdmin && !isHostCompany && section.id === 'intern-reports') {
                    console.log(`🔍 InternReports section visibility: isAdmin=${isAdmin}, isHostCompany=${isHostCompany}, shouldShow=true`);
                    return true;
                  }
                  return false;
                })
                .map((section) => (
                  <div
                    key={section.id}
                    className="section-card"
                    style={{ borderLeftColor: section.color }}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <div className="section-icon">{section.icon}</div>
                    <div className="section-content">
                      <h3>{section.title}</h3>
                      <p className="section-desc">{section.description}</p>
                    </div>
                    <div className="section-arrow" aria-hidden>→</div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default ReportsIndex;
