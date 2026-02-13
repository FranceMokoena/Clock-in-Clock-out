import React, { useEffect, useMemo, useState } from 'react';
import { MdFileDownload } from 'react-icons/md';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { staffAPI, departmentAPI } from '../services/api';
import { generatePayslipHTML } from '../utils/payslipGenerator';
import '../components/StaffList.css';
import './StaffDetails.css';

const createEmptyWorkingHoursInput = () => ({
  workingDaysPerWeek: '',
  workingDaysPerMonth: '',
  hoursPerDay: '',
  weeklyHours: '',
  monthlyHours: '',
});

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'Not set';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(numeric);
};

const formatWorkingNumber = (value) => {
  if (value === null || value === undefined || value === '') return 'Not set';
  return String(value);
};

const parseOptionalNumber = (value, label) => {
  if (value === null || value === undefined || value === '') return null;
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return parsedValue;
};

const parseSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const parseTimeToMinutes = (timeString) => {
  if (!timeString) return null;
  const match = timeString.match(/(\\d{1,2}):(\\d{2}):(\\d{2})\\s?(AM|PM)$/i);
  if (!match) return null;
  let [, hourStr, minuteStr, secondStr, period] = match;
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) return null;
  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
  return (hour * 60) + minute + (second / 60);
};

const getEntryMinutes = (entry) => {
  const start = parseTimeToMinutes(entry?.timeIn);
  const end = parseTimeToMinutes(entry?.timeOut);
  if (start === null || end === null) return 0;
  let minutes = end - start;
  const subtractRange = (from, to) => {
    const begin = parseTimeToMinutes(from);
    const finish = parseTimeToMinutes(to);
    if (begin === null || finish === null) return 0;
    return Math.max(0, finish - begin);
  };
  minutes -= subtractRange(entry?.startLunch, entry?.endLunch);
  minutes -= subtractRange(entry?.breakStart, entry?.breakEnd);
  minutes = Math.max(0, minutes);
  return minutes;
};

const resolveProfilePicture = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(data:|https?:|file:|blob:)/i.test(trimmed)) return trimmed;
  const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100;
  if (looksBase64) return `data:image/jpeg;base64,${trimmed}`;
  return trimmed;
};


function StaffDetailsScreen() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialStaff = location.state?.staff || null;
  const initialMonth = location.state?.month || new Date().getMonth() + 1;
  const initialYear = location.state?.year || new Date().getFullYear();

  const [staffDetails, setStaffDetails] = useState(initialStaff);
  const [staffTimesheet, setStaffTimesheet] = useState([]);
  const [stipendData, setStipendData] = useState(null);
  const [workingHoursData, setWorkingHoursData] = useState(null);
  const [workingHoursInput, setWorkingHoursInput] = useState(createEmptyWorkingHoursInput());
  const [stipendInput, setStipendInput] = useState('');
  const [savingStipend, setSavingStipend] = useState(false);
  const [savingWorkingHours, setSavingWorkingHours] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [rotationPlan, setRotationPlan] = useState(null);
  const [rotationTargetDepartment, setRotationTargetDepartment] = useState('');
  const [rotationNotes, setRotationNotes] = useState('');
  const [rotationStatus, setRotationStatus] = useState('active');
  const [savingRotation, setSavingRotation] = useState(false);
  const [detailedAttendanceStats, setDetailedAttendanceStats] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [exportingPayslip, setExportingPayslip] = useState(false);
  const [payslipError, setPayslipError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    personal: true,
    scheduled: true,
    attendanceSummary: true,
    recentAttendance: true,
    leave: true,
    corrections: true,
    timesheet: true,
    rotation: true,
    stipend: true,
    assignedHours: true,
    payroll: true,
  });

  const toggleSection = (key) => {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };


  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    let active = true;
    const loadStaffData = async () => {
      setLoading(true);
      setError('');
      try {
        const resolved = await resolveStaff(initialStaff);
        if (!resolved) {
          setError('Staff details not found. Please return to the list.');
          return;
        }
        if (!active) return;
        setStaffDetails(resolved);
        await Promise.all([
          fetchDashboardAndTimesheet(resolved),
          fetchPayrollData(resolved._id),
        ]);
      } catch (err) {
        console.error('Error loading staff details:', err);
        if (active) setError('Unable to load staff details.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadStaffData();
    return () => {
      active = false;
    };
  }, [staffId, initialStaff]);

  useEffect(() => {
    if (!staffDetails) return;
    fetchDashboardAndTimesheet(staffDetails).catch((err) => {
      console.error('Error refreshing dashboard data:', err);
    });
    fetchPayrollData(staffDetails._id).catch((err) => {
      console.error('Error refreshing payroll data:', err);
    });
  }, [selectedMonth, selectedYear]);

  const resolveStaff = async (fallback) => {
    if (fallback && fallback._id === staffId) {
      return fallback;
    }
    try {
      const response = await staffAPI.getAll({ fullData: 'true' });
      if (response.success && Array.isArray(response.staff)) {
        return response.staff.find((member) => member._id === staffId || member.id === staffId) || null;
      }
    } catch (err) {
      console.error('Failed to resolve staff for details view:', err);
    }
    return null;
  };

  const fetchDashboardAndTimesheet = async (member) => {
    if (!member) return;
    try {
      const [dashboardRes, timesheetRes] = await Promise.all([
        staffAPI.getInternDashboard(member._id, 'monthly'),
        staffAPI.getTimesheet(member._id, selectedMonth, selectedYear),
      ]);
      setStaffDetails((prev) => {
        const updated = { ...prev };
        if (dashboardRes?.success) {
          updated.attendanceSummary = dashboardRes.stats || null;
          updated.recentAttendance = Array.isArray(dashboardRes.attendance)
            ? dashboardRes.attendance
            : [];
        }
        return updated;
      });
      if (timesheetRes?.success) {
        setStaffTimesheet(timesheetRes.timesheet || []);
      }
      if (member.role === 'Intern') {
        const [leaveRes, correctionsRes] = await Promise.all([
          staffAPI.getInternLeaveApplications(member._id),
          staffAPI.getInternAttendanceCorrections(member._id),
        ]);
        setStaffDetails((prev) => {
          const updated = { ...prev };
          if (leaveRes?.success) {
            updated.leaveApplications = Array.isArray(leaveRes.applications)
              ? leaveRes.applications
              : [];
          }
          if (correctionsRes?.success) {
            updated.attendanceCorrections = Array.isArray(correctionsRes.corrections)
              ? correctionsRes.corrections
              : [];
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard/timesheet data:', err);
    }
  };

  const fetchPayrollData = async (memberId) => {
    if (!memberId) return;
    try {
      const [stipendRes, hoursRes] = await Promise.all([
        staffAPI.getStipend(memberId),
        staffAPI.getWorkingHours(memberId, { month: selectedMonth, year: selectedYear }),
      ]);
      if (stipendRes?.success) {
        setStipendData(stipendRes);
        setStipendInput(
          stipendRes.stipendAmount !== null && stipendRes.stipendAmount !== undefined
            ? String(stipendRes.stipendAmount)
            : ''
        );
      } else {
        setStipendData(null);
        setStipendInput('');
      }
      if (hoursRes?.success) {
        const normalized = normalizeWorkingHours(hoursRes.workingHours || null);
        setWorkingHoursData(normalized);
        setWorkingHoursInput({
          workingDaysPerWeek: normalized?.expectedWorkingDaysPerWeek ?? '',
          workingDaysPerMonth: normalized?.expectedWorkingDaysPerMonth ?? '',
          hoursPerDay: normalized?.expectedHoursPerDay ?? '',
          weeklyHours: normalized?.expectedWeeklyHours ?? '',
          monthlyHours: normalized?.expectedMonthlyHours ?? '',
        });
      } else {
        setWorkingHoursData(null);
        setWorkingHoursInput(createEmptyWorkingHoursInput());
      }
      const attendanceRange = getAttendanceRangeParams();
      const attendanceRes = await staffAPI.getDetailedAttendance(memberId, attendanceRange);
      if (attendanceRes?.success) {
        setDetailedAttendanceStats(attendanceRes.stats || null);
      } else {
        setDetailedAttendanceStats(null);
      }
      await loadRotationPlan(memberId);
    } catch (err) {
      console.error('Failed to fetch payroll data:', err);
    }
  };

  const loadRotationPlan = async (memberId) => {
    try {
      const response = await staffAPI.getRotationPlan(memberId);
      if (response?.success) {
        const plan = response.rotationPlan || {};
        setRotationPlan(plan);
        setRotationTargetDepartment(plan.currentDepartment?.departmentId || '');
        setRotationStatus(plan.status || 'active');
        setRotationNotes(plan.notes || '');
      } else {
        setRotationPlan(null);
      }
    } catch (err) {
      console.error('Failed to load rotation plan:', err);
      setRotationPlan(null);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getAll();
      if (response.success) {
        setDepartments(response.departments || []);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const getAttendanceRangeParams = () => {
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 0);
    endDate.setHours(23, 59, 59, 999);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const resolveHostCompanyId = () => {
    const target = staffDetails?.hostCompanyId;
    if (!target) return null;
    if (typeof target === 'object') {
      return target._id || target.id || target.hostCompanyId || null;
    }
    return target;
  };

  const getPayrollScopeParams = () => {
    const hostCompany = resolveHostCompanyId();
    return hostCompany ? { hostCompanyId: hostCompany } : {};
  };


  const handleSaveStipend = async () => {
    if (!staffDetails?._id) {
      alert('Staff record not loaded.');
      return;
    }
    const trimmed = stipendInput.trim();
    let stipendAmount = null;
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed) || parsed < 0) {
        alert('Enter a valid non-negative stipend amount.');
        return;
      }
      stipendAmount = parsed;
    }
    try {
      setSavingStipend(true);
      const response = await staffAPI.updateStipend(staffDetails._id, { stipendAmount }, getPayrollScopeParams());
      if (response?.success) {
        setStipendData(response);
        setStaffDetails((prev) => prev ? { ...prev, stipendAmount: response.stipendAmount ?? null } : prev);
        setStipendInput(response.stipendAmount === null ? '' : String(response.stipendAmount));
        alert(response.stipendAmount === null ? 'Stipend cleared.' : 'Stipend saved successfully.');
      } else {
        alert(response?.error || 'Failed to update stipend.');
      }
    } catch (err) {
      console.error('Error saving stipend:', err);
      alert('Failed to save stipend.');
    } finally {
      setSavingStipend(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    if (!staffDetails?._id) {
      alert('Staff record not loaded.');
      return;
    }
    let payload;
    try {
      payload = {
        expectedWorkingDaysPerWeek: parseOptionalNumber(workingHoursInput.workingDaysPerWeek, 'Working days per week'),
        expectedWorkingDaysPerMonth: parseOptionalNumber(workingHoursInput.workingDaysPerMonth, 'Working days per month'),
        expectedHoursPerDay: parseOptionalNumber(workingHoursInput.hoursPerDay, 'Hours per day'),
        expectedWeeklyHours: parseOptionalNumber(workingHoursInput.weeklyHours, 'Weekly hours'),
        expectedMonthlyHours: parseOptionalNumber(workingHoursInput.monthlyHours, 'Monthly hours'),
      };
    } catch (err) {
      alert(err.message || 'Enter valid working hours.');
      return;
    }
    try {
      setSavingWorkingHours(true);
      const response = await staffAPI.updateWorkingHours(staffDetails._id, payload, getPayrollScopeParams());
      if (response?.success) {
        const updated = normalizeWorkingHours(response.workingHours || null) || {};
        setWorkingHoursData(updated);
        setWorkingHoursInput({
          workingDaysPerWeek: updated.expectedWorkingDaysPerWeek ?? '',
          workingDaysPerMonth: updated.expectedWorkingDaysPerMonth ?? '',
          hoursPerDay: updated.expectedHoursPerDay ?? '',
          weeklyHours: updated.expectedWeeklyHours ?? '',
          monthlyHours: updated.expectedMonthlyHours ?? '',
        });
        setStaffDetails((prev) => prev ? { ...prev, ...updated } : prev);
        alert('Working hours saved successfully.');
      } else {
        alert(response?.error || 'Failed to update working hours.');
      }
    } catch (err) {
      console.error('Error saving working hours:', err);
      alert('Failed to save working hours.');
    } finally {
      setSavingWorkingHours(false);
    }
  };

  const handleSaveRotationPlan = async () => {
    if (!staffDetails?._id) {
      alert('Staff record not loaded.');
      return;
    }
    const department = departments.find((dept) => dept._id === rotationTargetDepartment);
    try {
      setSavingRotation(true);
      const payload = {
        departmentId: rotationTargetDepartment || null,
        departmentName: department?.name || rotationPlan?.currentDepartment?.departmentName || 'Unassigned',
        notes: rotationNotes,
        status: rotationStatus,
        startDate: new Date().toISOString(),
      };
      const response = await staffAPI.updateRotationPlan(staffDetails._id, payload, getPayrollScopeParams());
      if (response?.success) {
        setRotationPlan(response.rotationPlan);
        setRotationTargetDepartment(response.rotationPlan.currentDepartment?.departmentId || '');
        setRotationStatus(response.rotationPlan.status || 'active');
        alert('Rotation plan updated.');
      } else {
        alert(response?.error || 'Failed to update rotation plan.');
      }
    } catch (err) {
      console.error('Error saving rotation plan:', err);
      alert('Failed to update rotation plan.');
    } finally {
      setSavingRotation(false);
    }
  };

  const normalizeWorkingHours = (raw) => {
    if (!raw) return null;
    return {
      expectedWorkingDaysPerWeek: raw.expectedWorkingDaysPerWeek ?? raw.workingDaysPerWeek ?? null,
      expectedWorkingDaysPerMonth: raw.expectedWorkingDaysPerMonth ?? raw.workingDaysPerMonth ?? null,
      expectedHoursPerDay: raw.expectedHoursPerDay ?? raw.hoursPerDay ?? null,
      expectedWeeklyHours: raw.expectedWeeklyHours ?? raw.weeklyHours ?? null,
      expectedMonthlyHours: raw.expectedMonthlyHours ?? raw.monthlyHours ?? null,
      source: raw.source ?? null,
    };
  };

  const computeAttendanceMetrics = useMemo(() => {
    const timesheetMinutesTotal = staffTimesheet.reduce((sum, entry) => sum + getEntryMinutes(entry), 0);
    const timesheetHoursTotal = timesheetMinutesTotal / 60;
    const attendanceSummaryHours = parseSafeNumber(staffDetails?.attendanceSummary?.totalHours);
    const detailedMinutes = Number(detailedAttendanceStats?.totalMinutes);
    const detailedActualHours = Number.isFinite(detailedMinutes) ? (detailedMinutes / 60) : null;
    const fallbackHours = timesheetHoursTotal > 0 ? timesheetHoursTotal : attendanceSummaryHours;
    const actualHoursWorked = detailedActualHours !== null ? detailedActualHours : fallbackHours;
    const formattedBackendHours = detailedAttendanceStats?.totalHoursFormatted
      ? String(detailedAttendanceStats.totalHoursFormatted)
      : null;
    const expectedMonthlyHours = workingHoursData?.expectedMonthlyHours !== undefined && workingHoursData?.expectedMonthlyHours !== null
      ? parseSafeNumber(workingHoursData.expectedMonthlyHours)
      : parseSafeNumber(workingHoursInput.monthlyHours);
    const hourlyRate = expectedMonthlyHours > 0 && stipendData?.stipendAmount
      ? stipendData.stipendAmount / expectedMonthlyHours
      : null;
    const earnings = hourlyRate !== null ? (actualHoursWorked * hourlyRate) : null;
    return {
      actualHoursWorked,
      actualHoursWorkedFormatted: formattedBackendHours || `${actualHoursWorked.toFixed(2)} hrs`,
      expectedMonthlyHours,
      hourlyRate,
      earnings
    };
  }, [staffTimesheet, detailedAttendanceStats, workingHoursData, workingHoursInput, stipendData]);

  const sectionButton = (key) => (
    <button className="section-toggle" onClick={() => toggleSection(key)}>
      {sectionOpen[key] ? 'Hide details' : 'Show details'}
    </button>
  );

  const { actualHoursWorked, actualHoursWorkedFormatted, expectedMonthlyHours, hourlyRate, earnings } = computeAttendanceMetrics;

  const handleExportPayslip = () => {
    if (!staffDetails) return;
    setPayslipError('');
    try {
      setExportingPayslip(true);
      const html = generatePayslipHTML({
        issuedTo: `${staffDetails.name} ${staffDetails.surname || ''}`.trim(),
        role: staffDetails.role || 'Staff',
        department: staffDetails.department?.name || staffDetails.department || 'Not specified',
        company: staffDetails.hostCompanyName || 'Not specified',
        stipend: stipendData?.stipendAmount ?? null,
        workingHours: workingHoursData || null,
        attendanceSummary: staffDetails.attendanceSummary || null,
        actualHours: actualHoursWorked,
        expectedMonthlyHours,
        hourlyRate,
        earnings,
      });
      const win = window.open('', '_blank');
      if (!win) throw new Error('Popup blocked');
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    } catch (err) {
      console.error('Error exporting payslip:', err);
      setPayslipError('Unable to export payslip.');
    } finally {
      setExportingPayslip(false);
    }
  };

  const handleBackToList = () => {
    navigate('/dashboard', { state: { view: 'staff' } });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading staff details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-details-page">
        <div className="details-header">
          <button className="view-details-btn" onClick={handleBackToList}>Back to list</button>
        </div>
        <div className="empty-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!staffDetails) {
    return (
      <div className="staff-details-page">
        <div className="details-header">
          <button className="view-details-btn" onClick={handleBackToList}>Back to list</button>
        </div>
        <div className="empty-state">
          <p>Staff details are unavailable.</p>
        </div>
      </div>
    );
  }

  const fullName = `${staffDetails.name || ''} ${staffDetails.surname || ''}`.trim();
  const departmentLabel = typeof staffDetails.department === 'object'
    ? staffDetails.department?.name || ''
    : staffDetails.department || '';
  const hostCompanyLabel = staffDetails.hostCompanyName
    || (staffDetails.hostCompany && (staffDetails.hostCompany.companyName || staffDetails.hostCompany.name))
    || 'Not assigned'
  ;
  const statusLabel = staffDetails.isActive !== false ? 'Active' : 'Inactive';
  const locationLabel = staffDetails.location || 'Location not set';
  const registeredDate = staffDetails.createdAt
    ? new Date(staffDetails.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : 'Not recorded';
  const initials = (
    `${staffDetails.name?.charAt(0) || ''}${staffDetails.surname?.charAt(0) || ''}`.trim() || 'FC'
  ).toUpperCase();
  const profileSrc = resolveProfilePicture(staffDetails.profilePicture);
  const openProfilePreview = () => {
    if (profileSrc) {
      setShowProfilePreview(true);
    }
  };

  const closeProfilePreview = () => {
    setShowProfilePreview(false);
  };
  return (
    <div className="staff-details-page">
      <header className="staff-details-header staff-card">
        <div className="header-top">
          <div className="header-left">
              <button className="view-details-btn" onClick={handleBackToList}>Back to list</button>
            <div className="modal-avatar-group header-avatar">
              <div
                className={`modal-avatar ${profileSrc ? 'clickable-avatar' : ''}`}
                onClick={openProfilePreview}
                onKeyDown={(event) => {
                  if (!profileSrc) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openProfilePreview();
                  }
                }}
                role={profileSrc ? 'button' : undefined}
                tabIndex={profileSrc ? 0 : undefined}
              >
                {profileSrc ? (
                  <img src={profileSrc} alt={`${fullName || 'Staff member'} avatar`} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </div>
            <div className="header-title">
              <p className="title-label">Staff/Intern Details</p>
              <h1>{fullName || 'Staff Member'}</h1>
              <p className="header-role">
                {(staffDetails.role || 'Staff').toUpperCase()} · {departmentLabel || 'Department TBD'}
              </p>
              <span className={`status-badge ${staffDetails.isActive !== false ? 'status-active' : 'status-inactive'}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="header-right">
            <div className="meta-chip">
              <span className="meta-label">Host company</span>
              <strong>{hostCompanyLabel}</strong>
            </div>
            <div className="meta-chip">
              <span className="meta-label">Location</span>
              <strong>{locationLabel}</strong>
            </div>
          </div>
        </div>
        <div className="header-ribbon">
          <div className="ribbon-text">
            <strong>{staffDetails.role === 'Intern' ? 'Intern Profile' : 'Staff Profile'}</strong>
            <span>Full rotational and payroll record</span>
          </div>
          <div className="ribbon-meta">
            <span>ID: {staffDetails.idNumber || 'Not set'}</span>
            <span>Registered: {registeredDate}</span>
          </div>
        </div>
      </header>

      {showProfilePreview && profileSrc && (
        <div className="profile-lightbox" onClick={closeProfilePreview}>
          <div className="profile-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img src={profileSrc} alt={`${fullName || 'Staff member'} full profile`} />
            <button className="profile-lightbox-close" onClick={closeProfilePreview}>Close</button>
          </div>
        </div>
      )}

      <div className="staff-details-columns">
        <div className="staff-details-column primary">
          <section className="details-card details-section timesheet-card wide">
            <div className="section-header-row">
              <h4>Personal Information</h4>
              {sectionButton('personal')}
            </div>
            {sectionOpen.personal && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">{fullName || 'Not specified'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">ID Number:</span>
                  <span className="detail-value">{staffDetails.idNumber || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Phone Number:</span>
                  <span className="detail-value">{staffDetails.phoneNumber || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <span className="detail-value">
                    <span className={`role-badge role-${(staffDetails.role || 'staff').toLowerCase()}`}>
                      {staffDetails.role || 'N/A'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">{departmentLabel || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Host Company:</span>
                  <span className="detail-value">{hostCompanyLabel}</span>
                </div>
                {staffDetails.location && (
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{staffDetails.location}</span>
                  </div>
                )}
                {staffDetails.locationAddress && (
                  <div className="detail-row">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{staffDetails.locationAddress}</span>
                  </div>
                )}
              </>
            )}
          </section>

          {(staffDetails.clockInTime || staffDetails.clockOutTime || staffDetails.breakStartTime || staffDetails.breakEndTime) && (
            <section className="details-card details-section">
              <div className="section-header-row">
                <h4>Assigned Working Hours</h4>
                {sectionButton('scheduled')}
              </div>
              {sectionOpen.scheduled && (
                <>
                  {staffDetails.clockInTime && (
                    <div className="detail-row">
                      <span className="detail-label">Clock-In Time:</span>
                      <span className="detail-value">{staffDetails.clockInTime}</span>
                    </div>
                  )}
                  {staffDetails.clockOutTime && (
                    <div className="detail-row">
                      <span className="detail-label">Clock-Out Time:</span>
                      <span className="detail-value">{staffDetails.clockOutTime}</span>
                    </div>
                  )}
                  {staffDetails.breakStartTime && (
                    <div className="detail-row">
                      <span className="detail-label">Break Start:</span>
                      <span className="detail-value">{staffDetails.breakStartTime}</span>
                    </div>
                  )}
                  {staffDetails.breakEndTime && (
                    <div className="detail-row">
                      <span className="detail-label">Break End:</span>
                      <span className="detail-value">{staffDetails.breakEndTime}</span>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {staffDetails.role === 'Intern' && staffDetails.attendanceSummary && (
            <section className="details-card details-section">
              <div className="section-header-row">
                <h4>Attendance Summary (Monthly)</h4>
                {sectionButton('attendanceSummary')}
              </div>
              {sectionOpen.attendanceSummary && (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Total Hours:</span>
                    <span className="detail-value">{staffDetails.attendanceSummary.totalHours || '0.0'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Days Present:</span>
                    <span className="detail-value">{staffDetails.attendanceSummary.daysPresent || '0'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Attendance Rate:</span>
                    <span className="detail-value">{staffDetails.attendanceSummary.attendanceRate || '0'}%</span>
                  </div>
                </>
              )}
            </section>
          )}

          {staffDetails.role === 'Intern' && staffDetails.recentAttendance && staffDetails.recentAttendance.length > 0 && (
            <section className="details-card details-section">
              <div className="section-header-row">
                <h4>Recent Attendance</h4>
                {sectionButton('recentAttendance')}
              </div>
              {sectionOpen.recentAttendance && (
                <div className="attendance-list">
                  {staffDetails.recentAttendance.slice(0, 10).map((att, idx) => (
                    <div key={idx} className="attendance-item">
                      <div className="attendance-date">
                        {new Date(att.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="attendance-times">
                        <span>In: {att.clockIn || 'N/A'}</span>
                        <span>Out: {att.clockOut || 'N/A'}</span>
                        {att.hours && <span className="hours">Hours: {att.hours}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {staffDetails.role === 'Intern' && staffDetails.leaveApplications && staffDetails.leaveApplications.length > 0 && (
            <section className="details-card details-section">
              <div className="section-header-row">
                <h4>Leave Applications ({staffDetails.leaveApplications.length})</h4>
                {sectionButton('leave')}
              </div>
              {sectionOpen.leave && (
                <div className="applications-list">
                  {staffDetails.leaveApplications.slice(0, 5).map((app, idx) => (
                    <div key={idx} className="application-item">
                      <div className="application-header">
                        <span className="leave-type">{app.leaveType}</span>
                        <span className={`status-badge ${app.status === 'approved' ? 'status-approved' : app.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="application-dates">
                        {new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()} ({app.numberOfDays} days)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {staffDetails.role === 'Intern' && staffDetails.attendanceCorrections && staffDetails.attendanceCorrections.length > 0 && (
            <section className="details-card details-section">
              <div className="section-header-row">
                <h4>Attendance Corrections ({staffDetails.attendanceCorrections.length})</h4>
                {sectionButton('corrections')}
              </div>
              {sectionOpen.corrections && (
                <div className="corrections-list">
                  {staffDetails.attendanceCorrections.slice(0, 5).map((corr, idx) => (
                    <div key={idx} className="correction-item">
                      <div className="correction-header">
                        <span className="correction-type">
                          {corr.type === 'missing_clock_in' ? 'Missing Clock-In' :
                            corr.type === 'missing_clock_out' ? 'Missing Clock-Out' :
                            corr.type === 'wrong_time' ? 'Wrong Time' :
                            corr.type === 'missing_break' ? 'Missing Break' :
                            corr.type || 'Other'}
                        </span>
                        <span className={`status-badge ${corr.status === 'approved' ? 'status-approved' : corr.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                          {corr.status}
                        </span>
                      </div>
                      <div className="correction-date">
                        {new Date(corr.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        <div className="staff-details-column secondary">
          <section className="details-card details-section">
            <div className="section-header-row">
              <h4>Timesheet ({selectedMonth}/{selectedYear})</h4>
              {sectionButton('timesheet')}
            </div>
            {sectionOpen.timesheet && (
              <>
                <div className="month-year-selector">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                {staffTimesheet.length > 0 ? (
                  <div className="table-container">
                    <table className="timesheet-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Clock In</th>
                          <th>Break Start</th>
                          <th>Break End</th>
                          <th>Clock Out</th>
                          <th>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffTimesheet.map((entry, idx) => (
                          <tr key={idx}>
                            <td>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td>{entry.timeIn || entry.clockIn || 'N/A'}</td>
                            <td>{entry.startLunch || entry.breakStart || 'N/A'}</td>
                            <td>{entry.endLunch || entry.breakEnd || 'N/A'}</td>
                            <td>{entry.timeOut || entry.clockOut || 'N/A'}</td>
                            <td>{entry.hours || '0.0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No timesheet entries have been recorded for this period.</p>
                  </div>
                )}
              </>
            )}
          </section>

          {rotationPlan && (
            <section className="details-card details-section rotation-section wide">
              <div className="section-header-row">
                <h4>Rotation Plan</h4>
                {sectionButton('rotation')}
              </div>
              {sectionOpen.rotation && (
                <>
                  <div className="rotation-current">
                    <div className="detail-row">
                      <span className="detail-label">Current Department</span>
                      <span className="detail-value">{rotationPlan.currentDepartment?.departmentName || 'Unassigned'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">{rotationPlan.status || 'active'}</span>
                    </div>
                    {rotationPlan.startDate && (
                      <div className="detail-row">
                        <span className="detail-label">Assigned</span>
                        <span className="detail-value">{new Date(rotationPlan.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="rotation-form">
                    <label className="detail-label">Assign Department</label>
                    <select
                      value={rotationTargetDepartment}
                      onChange={(e) => setRotationTargetDepartment(e.target.value)}
                      className="rotation-select"
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} {dept.departmentCode ? `({dept.departmentCode})` : ''}
                        </option>
                      ))}
                    </select>
                    <label className="detail-label">Status</label>
                    <select
                      value={rotationStatus}
                      onChange={(e) => setRotationStatus(e.target.value)}
                      className="rotation-select"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                    <label className="detail-label">Notes</label>
                    <textarea
                      value={rotationNotes}
                      onChange={(e) => setRotationNotes(e.target.value)}
                      className="rotation-textarea"
                      placeholder="Optional notes for this rotation"
                    />
                    <button className="modal-save-button" onClick={handleSaveRotationPlan} disabled={savingRotation}>
                      {savingRotation ? 'Saving...' : 'Save Rotation'}
                    </button>
                  </div>
                  {rotationPlan.history?.length > 0 && (
                    <div className="rotation-history">
                      <h5>Rotation History</h5>
                      {rotationPlan.history.map((entry, idx) => (
                        <div key={`${entry.recordedAt || idx}-${idx}`} className="rotation-history-item">
                          <span className="history-dept">{entry.departmentName || '-'}</span>
                          <span className="history-dates">
                            {entry.startDate ? new Date(entry.startDate).toLocaleDateString() : 'N/A'} - {entry.endDate ? new Date(entry.endDate).toLocaleDateString() : 'Present'}
                          </span>
                          <span className="history-status">{entry.status || 'completed'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          <section className="details-card payroll-section wide">
            <div className="section-header-row">
              <h4>Stipend & Salary</h4>
              {sectionButton('stipend')}
            </div>
            {sectionOpen.stipend && (
              <div className="payroll-block">
                <div className="detail-row">
                  <span className="detail-label">Current Stipend:</span>
                  <span className="detail-value">{formatCurrency(stipendData?.stipendAmount ?? staffDetails.stipendAmount)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Monthly Stipend</span>
                  <input
                    type="number"
                    min="0"
                    value={stipendInput}
                    onChange={(e) => setStipendInput(e.target.value)}
                    className="payroll-input"
                    placeholder="Enter stipend amount"
                  />
                </div>
                <button className="modal-save-button" onClick={handleSaveStipend} disabled={savingStipend}>
                  {savingStipend ? 'Saving...' : 'Save Stipend'}
                </button>
                <div className="help-text">Leave blank to clear the stipend.</div>
              </div>
            )}
          </section>

          <section className="details-card payroll-section wide">
            <div className="section-header-row">
              <h4>Assigned Working Hours</h4>
              {sectionButton('assignedHours')}
            </div>
            {sectionOpen.assignedHours && (
              <div className="payroll-block">
                <div className="detail-row">
                  <div className="detail-label-block">
                    <span className="detail-label">Working Days / Week</span>
                    <span className="current-value-note">Current: {formatWorkingNumber(workingHoursData?.expectedWorkingDaysPerWeek)}</span>
                  </div>
                  <div className="detail-input-block">
                    <input
                      type="number"
                      min="0"
                      value={workingHoursInput.workingDaysPerWeek}
                      onChange={(e) => setWorkingHoursInput((prev) => ({ ...prev, workingDaysPerWeek: e.target.value }))}
                      className="payroll-input"
                      placeholder="Days per week"
                    />
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label-block">
                    <span className="detail-label">Working Days / Month</span>
                    <span className="current-value-note">Current: {formatWorkingNumber(workingHoursData?.expectedWorkingDaysPerMonth)}</span>
                  </div>
                  <div className="detail-input-block">
                    <input
                      type="number"
                      min="0"
                      value={workingHoursInput.workingDaysPerMonth}
                      onChange={(e) => setWorkingHoursInput((prev) => ({ ...prev, workingDaysPerMonth: e.target.value }))}
                      className="payroll-input"
                      placeholder="Days per month"
                    />
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label-block">
                    <span className="detail-label">Hours / Day</span>
                    <span className="current-value-note">Current: {formatWorkingNumber(workingHoursData?.expectedHoursPerDay)}</span>
                  </div>
                  <div className="detail-input-block">
                    <input
                      type="number"
                      min="0"
                      value={workingHoursInput.hoursPerDay}
                      onChange={(e) => setWorkingHoursInput((prev) => ({ ...prev, hoursPerDay: e.target.value }))}
                      className="payroll-input"
                      placeholder="Hours per day"
                    />
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label-block">
                    <span className="detail-label">Weekly Hours</span>
                    <span className="current-value-note">Current: {formatWorkingNumber(workingHoursData?.expectedWeeklyHours)}</span>
                  </div>
                  <div className="detail-input-block">
                    <input
                      type="number"
                      min="0"
                      value={workingHoursInput.weeklyHours}
                      onChange={(e) => setWorkingHoursInput((prev) => ({ ...prev, weeklyHours: e.target.value }))}
                      className="payroll-input"
                      placeholder="Weekly hours"
                    />
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label-block">
                    <span className="detail-label">Expected Monthly Hours</span>
                    <span className="current-value-note">Current: {formatWorkingNumber(workingHoursData?.expectedMonthlyHours)}</span>
                  </div>
                  <div className="detail-input-block">
                    <input
                      type="number"
                      min="0"
                      value={workingHoursInput.monthlyHours}
                      onChange={(e) => setWorkingHoursInput((prev) => ({ ...prev, monthlyHours: e.target.value }))}
                      className="payroll-input"
                      placeholder="Monthly hours"
                    />
                  </div>
                </div>
                <button className="modal-save-button" onClick={handleSaveWorkingHours} disabled={savingWorkingHours}>
                  {savingWorkingHours ? 'Saving...' : 'Save Working Hours'}
                </button>
              </div>
            )}
          </section>

          <section className="details-card payroll-section">
            <div className="section-header-row">
              <h4>Payroll Preview</h4>
              {sectionButton('payroll')}
            </div>
            {sectionOpen.payroll && (
              <div className="payroll-block payroll-preview">
                <div className="detail-row">
                  <span className="detail-label">Actual Hours Worked</span>
                  <span className="detail-value">{actualHoursWorkedFormatted}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Expected Monthly Hours</span>
                  <span className="detail-value">{expectedMonthlyHours.toFixed(2)} hrs</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Hourly Rate</span>
                  <span className="detail-value">{hourlyRate ? formatCurrency(hourlyRate) : 'Not available'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Estimated Earnings</span>
                  <span className="detail-value">{earnings ? formatCurrency(earnings) : 'Not available'}</span>
                </div>
                <button className="export-btn" onClick={handleExportPayslip} disabled={exportingPayslip}>
                  {exportingPayslip ? 'Exporting...' : (
                    <>
                      <MdFileDownload /> Export Payslip
                    </>
                  )}
                </button>
                {payslipError && <div className="help-text error-text">{payslipError}</div>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default StaffDetailsScreen;
