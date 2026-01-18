import React, { useState, useEffect } from 'react';
import { MdFileDownload } from 'react-icons/md';
import { staffAPI, departmentAPI, hostCompanyAPI } from '../services/api';
import { generatePayslipHTML } from '../utils/payslipGenerator';
import './StaffList.css';

const createEmptyWorkingHoursInput = () => ({
  workingDaysPerWeek: '',
  workingDaysPerMonth: '',
  hoursPerDay: '',
  weeklyHours: '',
  monthlyHours: '',
});

const getInitials = (member) => {
  const name = `${member?.name || ''} ${member?.surname || ''}`.trim();
  if (!name) return 'NA';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0] || 'N';
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};

function StaffList({ hostCompanyId, isHostCompany, onSelectStaff }) {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [staffDetails, setStaffDetails] = useState(null);
  const [staffTimesheet, setStaffTimesheet] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [stipendData, setStipendData] = useState(null);
  const [workingHoursData, setWorkingHoursData] = useState(null);
  const [stipendInput, setStipendInput] = useState('');
  const [workingHoursInput, setWorkingHoursInput] = useState(createEmptyWorkingHoursInput());
  const [savingStipend, setSavingStipend] = useState(false);
  const [savingWorkingHours, setSavingWorkingHours] = useState(false);
  const [showStipendSection, setShowStipendSection] = useState(true);
  const [showWorkingHoursSection, setShowWorkingHoursSection] = useState(true);
  const [exportingPayslip, setExportingPayslip] = useState(false);
  const [payslipError, setPayslipError] = useState('');
  const [detailedAttendanceStats, setDetailedAttendanceStats] = useState(null);
  const [rotationPlan, setRotationPlan] = useState(null);
  const [rotationTargetDepartment, setRotationTargetDepartment] = useState('');
  const [rotationNotes, setRotationNotes] = useState('');
  const [rotationStatus, setRotationStatus] = useState('active');
  const [showRotationForm, setShowRotationForm] = useState(true);
  const [savingRotation, setSavingRotation] = useState(false);
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [hostCompanies, setHostCompanies] = useState([]);

  useEffect(() => {
    loadStaff();
    loadDepartments();
    if (!isHostCompany) {
      loadHostCompanies();
    }
  }, [selectedMonth, selectedYear, hostCompanyId, isHostCompany]);

  useEffect(() => {
    applyFilters();
  }, [staff, searchTerm, roleFilter, departmentFilter]);

  const loadDepartments = async () => {
    try {
      const params = isHostCompany && hostCompanyId ? { hostCompanyId } : {};
      const response = await departmentAPI.getAll(params);
      if (response.success) {
        setDepartments(response.departments || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadHostCompanies = async () => {
    try {
      const response = await hostCompanyAPI.getAll();
      if (response.success) {
        setHostCompanies(response.companies || []);
      }
    } catch (error) {
      console.error('Error loading host companies:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...staff];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        (member.name && member.name.toLowerCase().includes(term)) ||
        (member.surname && member.surname.toLowerCase().includes(term)) ||
        (member.idNumber && member.idNumber.includes(term)) ||
        (member.phoneNumber && member.phoneNumber.includes(term))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(member => 
        member.department === departmentFilter || 
        (typeof member.department === 'object' && member.department?.name === departmentFilter)
      );
    }

    setFilteredStaff(filtered);
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        year: selectedYear,
        fullData: 'true',
        ...(isHostCompany && hostCompanyId && { hostCompanyId })
      };
      const response = await staffAPI.getAll(params);
      if (response.success) {
        setStaff(response.staff || []);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollData = async (staffId) => {
    try {
      const [stipendRes, hoursRes] = await Promise.all([
        staffAPI.getStipend(staffId),
        staffAPI.getWorkingHours(staffId, { month: selectedMonth, year: selectedYear }),
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
        const hours = normalized || {};
        setWorkingHoursInput({
          workingDaysPerWeek: hours.expectedWorkingDaysPerWeek !== undefined && hours.expectedWorkingDaysPerWeek !== null ? String(hours.expectedWorkingDaysPerWeek) : '',
          workingDaysPerMonth: hours.expectedWorkingDaysPerMonth !== undefined && hours.expectedWorkingDaysPerMonth !== null ? String(hours.expectedWorkingDaysPerMonth) : '',
          hoursPerDay: hours.expectedHoursPerDay !== undefined && hours.expectedHoursPerDay !== null ? String(hours.expectedHoursPerDay) : '',
          weeklyHours: hours.expectedWeeklyHours !== undefined && hours.expectedWeeklyHours !== null ? String(hours.expectedWeeklyHours) : '',
          monthlyHours: hours.expectedMonthlyHours !== undefined && hours.expectedMonthlyHours !== null ? String(hours.expectedMonthlyHours) : '',
        });
      } else {
        setWorkingHoursData(null);
        setWorkingHoursInput({
          workingDaysPerWeek: '',
          workingDaysPerMonth: '',
          hoursPerDay: '',
          weeklyHours: '',
          monthlyHours: '',
        });
      }
      try {
        const attendanceRange = getAttendanceRangeParams();
        const attendanceRes = await staffAPI.getDetailedAttendance(staffId, attendanceRange);
        if (attendanceRes?.success) {
          setDetailedAttendanceStats(attendanceRes.stats || null);
        } else {
          setDetailedAttendanceStats(null);
        }
      } catch (error) {
        console.error('Error fetching detailed attendance:', error?.response?.data || error);
        setDetailedAttendanceStats(null);
      }
      await loadRotationPlan(staffId);
    } catch (error) {
      console.error('Error loading payroll data:', error?.response?.data || error);
    }
  };

  const loadRotationPlan = async (staffId) => {
    try {
      const response = await staffAPI.getRotationPlan(staffId);
      if (response?.success) {
        const plan = response.rotationPlan || {};
        setRotationPlan(plan);
        setRotationTargetDepartment(plan.currentDepartment?.departmentId || '');
        setRotationStatus(plan.status || 'active');
        setRotationNotes(plan.notes || '');
      } else {
        setRotationPlan(null);
      }
    } catch (error) {
      console.error('Error loading rotation plan:', error);
      setRotationPlan(null);
    }
  };

  const loadStaffDetails = async (staffId) => {
    setDetailsLoading(true);
    setDetailedAttendanceStats(null);
    try {
      // Find the staff member from the list (already has fullData)
      const member = staff.find(s => s._id === staffId);
      if (!member) {
        console.error('Staff member not found in list');
        return;
      }
      if (onSelectStaff) {
        onSelectStaff(member._id, `${member.name} ${member.surname}`.trim());
      }

      // Start with the basic staff record we already have (matches mobile app approach)
      const fullDetails = { ...member };

      try {
        const [dashboardRes, timesheetRes] = await Promise.all([
          staffAPI.getInternDashboard(member._id, 'monthly'),
          staffAPI.getTimesheet(member._id, selectedMonth, selectedYear),
        ]);

        if (dashboardRes?.success) {
          fullDetails.attendanceSummary = dashboardRes.stats || null;
          fullDetails.recentAttendance = Array.isArray(dashboardRes.attendance) ? dashboardRes.attendance : [];
        }

        if (timesheetRes?.success) {
          setStaffTimesheet(timesheetRes.timesheet || []);
        }
      } catch (detailErr) {
        console.error('Error loading dashboard/timesheet data:', detailErr);
      }

      if (member.role === 'Intern') {
        try {
          const [leaveRes, correctionsRes] = await Promise.all([
            staffAPI.getInternLeaveApplications(member._id),
            staffAPI.getInternAttendanceCorrections(member._id),
          ]);

          if (leaveRes?.success) {
            fullDetails.leaveApplications = Array.isArray(leaveRes.applications) ? leaveRes.applications : [];
          }

          if (correctionsRes?.success) {
            fullDetails.attendanceCorrections = Array.isArray(correctionsRes.corrections) ? correctionsRes.corrections : [];
          }
        } catch (detailErr) {
          console.error('Error loading intern leave/corrections:', detailErr);
        }
      }

    setStaffDetails(fullDetails);
    setSelectedStaff(staffId);
    setStipendData(null);
    setStipendInput('');
    setWorkingHoursData(null);
    setWorkingHoursInput(createEmptyWorkingHoursInput());
    setDetailedAttendanceStats(null);
    setRotationPlan(null);
    setRotationTargetDepartment('');
    setRotationStatus('active');
    setRotationNotes('');
    setShowRotationForm(true);
    await fetchPayrollData(staffId);
    setShowDetails(true);
    } catch (error) {
      console.error('Error loading staff details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const parseOptionalNumber = (value, label) => {
    if (value === null || value === undefined || value === '') return null;
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      throw new Error(`${label} must be a non-negative number.`);
    }
    return parsedValue;
  };

  const resolveTargetHostCompanyId = () => {
    if (hostCompanyId) return hostCompanyId;
    const target = staffDetails?.hostCompanyId;
    if (!target) return null;
    if (typeof target === 'object') {
      return target._id || target.id || target.hostCompanyId || null;
    }
    return target;
  };

  const getPayrollScopeParams = () => {
    const resolvedHostCompanyId = resolveTargetHostCompanyId();
    return resolvedHostCompanyId ? { hostCompanyId: resolvedHostCompanyId } : {};
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

  const handleSaveStipend = async () => {
    if (!selectedStaff) {
      alert('Please select a staff member first.');
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
      const response = await staffAPI.updateStipend(selectedStaff, { stipendAmount }, getPayrollScopeParams());
      if (response?.success) {
        setStipendData(response);
        setStaffDetails(prev => (prev ? { ...prev, stipendAmount: response.stipendAmount ?? null } : prev));
        setStaff(prev => prev.map(member =>
          member._id === selectedStaff ? { ...member, stipendAmount: response.stipendAmount ?? null } : member
        ));
        setStipendInput(response.stipendAmount === null ? '' : String(response.stipendAmount));
        alert(response.stipendAmount === null ? 'Stipend cleared.' : 'Stipend saved successfully.');
      } else {
        alert(response?.error || 'Failed to update stipend.');
      }
    } catch (error) {
      console.error('Error saving stipend:', error);
      alert('Failed to save stipend.');
    } finally {
      setSavingStipend(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    if (!selectedStaff) {
      alert('Please select a staff member first.');
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
    } catch (error) {
      alert(error.message || 'Enter valid working hours.');
      return;
    }
    try {
      setSavingWorkingHours(true);
      const response = await staffAPI.updateWorkingHours(selectedStaff, payload, getPayrollScopeParams());
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
        setStaffDetails(prev => (prev ? { ...prev, ...updated } : prev));
        setStaff(prev => prev.map(member =>
          member._id === selectedStaff ? { ...member, ...updated } : member
        ));
        alert('Working hours saved successfully.');
      } else {
        alert(response?.error || 'Failed to update working hours.');
      }
    } catch (error) {
      console.error('Error saving working hours:', error);
      alert('Failed to save working hours.');
    } finally {
      setSavingWorkingHours(false);
    }
  };

  const handleSaveRotationPlan = async () => {
    if (!selectedStaff) {
      alert('Please select a staff member first.');
      return;
    }
    const department = departments.find(d => d._id === rotationTargetDepartment);
    try {
      setSavingRotation(true);
      const payload = {
        departmentId: rotationTargetDepartment || null,
        departmentName: department?.name || rotationPlan?.currentDepartment?.departmentName || 'Unassigned',
        notes: rotationNotes,
        status: rotationStatus,
        startDate: new Date().toISOString()
      };
      const response = await staffAPI.updateRotationPlan(selectedStaff, payload, getPayrollScopeParams());
      if (response?.success) {
        setRotationPlan(response.rotationPlan);
        setRotationTargetDepartment(response.rotationPlan.currentDepartment?.departmentId || '');
        setRotationStatus(response.rotationPlan.status || 'active');
        alert('Rotation plan updated.');
      } else {
        alert(response?.error || 'Failed to update rotation plan.');
      }
    } catch (error) {
      console.error('Error saving rotation plan:', error);
      alert('Failed to update rotation plan.');
    } finally {
      setSavingRotation(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'Not set';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return `R ${numeric.toFixed(2)}`;
  };

  const formatHourValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Not set';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    return numeric.toFixed(2);
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

  const formatWorkingNumber = (value) => {
    if (value === null || value === undefined || value === '') return 'Not set';
    return String(value);
  };

  const parseSafeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const parseTimeToMinutes = (timeString) => {
    if (!timeString) return null;
    const match = timeString.match(/(\d{1,2}):(\d{2}):(\d{2})\s?(AM|PM)$/i);
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

  const timesheetMinutesTotal = staffTimesheet.reduce((sum, entry) => {
    return sum + getEntryMinutes(entry);
  }, 0);
  const timesheetHoursTotal = timesheetMinutesTotal / 60;
  const attendanceSummaryHours = parseSafeNumber(staffDetails?.attendanceSummary?.totalHours);
  const detailedMinutes = Number(detailedAttendanceStats?.totalMinutes);
  const detailedActualHours = Number.isFinite(detailedMinutes) ? (detailedMinutes / 60) : null;
  const fallbackHours = timesheetHoursTotal > 0 ? timesheetHoursTotal : attendanceSummaryHours;
  const actualHoursWorked = detailedActualHours !== null ? detailedActualHours : fallbackHours;
  const expectedMonthly = workingHoursData?.expectedMonthlyHours !== undefined && workingHoursData?.expectedMonthlyHours !== null
    ? parseSafeNumber(workingHoursData.expectedMonthlyHours)
    : parseSafeNumber(workingHoursInput.monthlyHours);
  const hourlyRate = expectedMonthly > 0 && stipendData?.stipendAmount
    ? stipendData.stipendAmount / expectedMonthly
    : null;
  const earnings = hourlyRate !== null ? (actualHoursWorked * hourlyRate) : null;

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
        expectedMonthlyHours: expectedMonthly,
        hourlyRate,
        earnings,
      });
      const win = window.open('', '_blank');
      if (!win) throw new Error('Popup blocked');
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    } catch (error) {
      console.error('Error exporting payslip:', error);
      setPayslipError('Unable to export payslip.');
    } finally {
      setExportingPayslip(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading staff data...</p>
      </div>
    );
  }

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Staff & Interns</h2>
        <div className="filters-row">
          <div className="month-year-selector">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="staff-filters">
        <input
          type="text"
          placeholder="Search by name, ID, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Roles</option>
          <option value="Intern">Intern</option>
          <option value="Staff">Staff</option>
          <option value="Other">Other</option>
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {filteredStaff.length > 0 ? (
        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
                <tr>
                  <th>Profile</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Payroll</th>
                  <th>Actions</th>
                </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr key={member._id}>
                  <td>
                    <div className="profile-avatar-cell">
                      {member.profilePicture ? (
                        <img
                          src={member.profilePicture}
                          alt={`${member.name || 'User'} avatar`}
                        />
                      ) : (
                        <span>{getInitials(member)}</span>
                      )}
                    </div>
                  </td>
                  <td>{member.name} {member.surname}</td>
                  <td>
                    <span className={`role-badge role-${member.role?.toLowerCase()}`}>
                      {member.role}
                    </span>
                  </td>
                  <td>{member.department || 'N/A'}</td>
                  <td>{member.hostCompanyName || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`payroll-link payroll-amount ${member.stipendAmount ? 'blurred' : ''}`}
                      onClick={() => loadStaffDetails(member._id)}
                    >
                      <span className="payroll-amount-text">
                        {member.stipendAmount ? formatCurrency(member.stipendAmount) : 'Assign Stipend'}
                      </span>
                    </button>
                  </td>
                  <td>
                    <button
                      className="view-details-btn"
                      onClick={() => loadStaffDetails(member._id)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {staff.length === 0 
              ? 'No staff members found for the selected period.' 
              : 'No staff members match the current filters.'}
          </p>
        </div>
      )}

      {showDetails && staffDetails && (
        <div className="staff-details-modal">
              <div className="modal-content large-modal">
                                <div className="modal-header">
              <div className="modal-avatar-group">
                <div className="modal-avatar">
                  {staffDetails.profilePicture ? (
                    <img
                      src={staffDetails.profilePicture}
                      alt={`${staffDetails.name || 'Profile'} avatar`}
                    />
                  ) : (
                    <span>{getInitials(staffDetails)}</span>
                  )}
                </div>
                <div>
                  <h3>{staffDetails.role === 'Intern' ? 'Intern' : 'Staff'} Details</h3>
                  <p className="modal-avatar-subtitle">
                    {staffDetails.name} {staffDetails.surname || ''}
                  </p>
                </div>
              </div>
              <button onClick={() => {
                setShowDetails(false);
                setStaffDetails(null);
                setSelectedStaff(null);
                setDetailedAttendanceStats(null);
              }}>?
              </button>
            </div>
            <div className="modal-body">
              <div className="official-ribbon">
                <div>
                  <strong>{staffDetails.role === 'Intern' ? 'Intern' : 'Staff'} Profile</strong>
                  <div className="ribbon-subtitle">Complete Information</div>
                </div>
                <span className={`status-badge ${staffDetails.isActive !== false ? 'active' : 'inactive'}`}>
                  {staffDetails.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="details-section">
                <h4>Personal Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">{staffDetails.name} {staffDetails.surname}</span>
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
                    <span className={`role-badge role-${staffDetails.role?.toLowerCase()}`}>
                      {staffDetails.role || 'N/A'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">
                    {typeof staffDetails.department === 'object' 
                      ? staffDetails.department?.name || 'N/A'
                      : staffDetails.department || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Host Company:</span>
                  <span className="detail-value">
                    {staffDetails.hostCompanyName || 
                     (typeof staffDetails.hostCompanyId === 'object' && staffDetails.hostCompanyId?.companyName) ||
                     'N/A'}
                  </span>
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
                {staffDetails.createdAt && (
                  <div className="detail-row">
                    <span className="detail-label">Registered:</span>
                    <span className="detail-value">
                      {new Date(staffDetails.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {(staffDetails.clockInTime || staffDetails.clockOutTime || staffDetails.breakStartTime || staffDetails.breakEndTime) && (
                <div className="details-section">
                  <h4>Working Hours</h4>
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
                </div>
              )}

              {staffDetails.role === 'Intern' && staffDetails.attendanceSummary && (
                <div className="details-section">
                  <h4>Attendance Summary (Monthly)</h4>
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
                </div>
              )}

              {staffDetails.role === 'Intern' && staffDetails.recentAttendance && staffDetails.recentAttendance.length > 0 && (
                <div className="details-section">
                  <h4>Recent Attendance</h4>
                  <div className="attendance-list">
                    {staffDetails.recentAttendance.slice(0, 10).map((att, idx) => (
                      <div key={idx} className="attendance-item">
                        <div className="attendance-date">
                          {new Date(att.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
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
                </div>
              )}

              {staffDetails.role === 'Intern' && staffDetails.leaveApplications && staffDetails.leaveApplications.length > 0 && (
                <div className="details-section">
                  <h4>Leave Applications ({staffDetails.leaveApplications.length})</h4>
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
                          {new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()}
                          ({app.numberOfDays} days)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {staffDetails.role === 'Intern' && staffDetails.attendanceCorrections && staffDetails.attendanceCorrections.length > 0 && (
                <div className="details-section">
                  <h4>Attendance Corrections ({staffDetails.attendanceCorrections.length})</h4>
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
                </div>
              )}

              {staffTimesheet.length > 0 && (
                <div className="details-section">
                  <h4>Timesheet ({selectedMonth}/{selectedYear})</h4>
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
                            <td>{new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}</td>
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
              </div>
              )}

              {rotationPlan && (
                <div className="details-section rotation-section">
                  <div className="section-header-row">
                    <h4>Rotation Plan</h4>
                    <button className="collapse-toggle" onClick={() => setShowRotationForm(prev => !prev)}>
                      {showRotationForm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="rotation-current">
                    <div className="detail-row">
                      <span className="detail-label">Current Department</span>
                      <span className="detail-value">
                        {rotationPlan.currentDepartment?.departmentName || 'Unassigned'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status</span>
                      <span className="detail-value">{rotationPlan.status || 'active'}</span>
                    </div>
                    {rotationPlan.startDate && (
                      <div className="detail-row">
                        <span className="detail-label">Assigned</span>
                        <span className="detail-value">
                          {new Date(rotationPlan.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {showRotationForm && (
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
                            {dept.name} {dept.departmentCode ? `(${dept.departmentCode})` : ''}
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
                      <button
                        className="modal-save-button"
                        onClick={handleSaveRotationPlan}
                        disabled={savingRotation}
                      >
                        {savingRotation ? 'Saving...' : 'Save Rotation'}
                      </button>
                    </div>
                  )}
                  {rotationPlan.history?.length > 0 && (
                    <div className="rotation-history">
                      <h5>Rotation History</h5>
                      {rotationPlan.history.map((entry, idx) => (
                        <div key={`${entry.recordedAt || idx}-${idx}`} className="rotation-history-item">
                          <span className="history-dept">{entry.departmentName || '—'}</span>
                          <span className="history-dates">
                            {entry.startDate ? new Date(entry.startDate).toLocaleDateString() : 'N/A'}
                            {' – '}
                            {entry.endDate ? new Date(entry.endDate).toLocaleDateString() : 'Present'}
                          </span>
                          <span className="history-status">{entry.status || 'completed'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="details-section payroll-section">
                <div className="section-header-row">
                  <h4>Stipend & Salary</h4>
                  <button className="collapse-toggle" onClick={() => setShowStipendSection(prev => !prev)}>
                    {showStipendSection ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showStipendSection && (
                  <div className="payroll-block">
                    <div className="detail-row">
                      <span className="detail-label">Current Stipend:</span>
                      <span className="detail-value">
                        {formatCurrency(stipendData?.stipendAmount ?? staffDetails.stipendAmount)}
                      </span>
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
                    <button
                      className="modal-save-button"
                      onClick={handleSaveStipend}
                      disabled={savingStipend}
                    >
                      {savingStipend ? 'Saving...' : 'Save Stipend'}
                    </button>
                    <div className="help-text">Leave blank to clear the stipend.</div>
                  </div>
                )}
              </div>

              <div className="details-section payroll-section">
                <div className="section-header-row">
                  <h4>Assigned Working Hours</h4>
                  <button className="collapse-toggle" onClick={() => setShowWorkingHoursSection(prev => !prev)}>
                    {showWorkingHoursSection ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showWorkingHoursSection && (
                  <div className="payroll-block">
                    <div className="detail-row">
                      <div className="detail-label-block">
                        <span className="detail-label">Working Days / Week</span>
                        <span className="current-value-note">
                          Current: {formatWorkingNumber(workingHoursData?.expectedWorkingDaysPerWeek)}
                        </span>
                      </div>
                      <div className="detail-input-block">
                        <input
                          type="number"
                          min="0"
                          value={workingHoursInput.workingDaysPerWeek}
                          onChange={(e) => setWorkingHoursInput(prev => ({ ...prev, workingDaysPerWeek: e.target.value }))}
                          className="payroll-input"
                          placeholder="Days per week"
                        />
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label-block">
                        <span className="detail-label">Working Days / Month</span>
                        <span className="current-value-note">
                          Current: {formatWorkingNumber(workingHoursData?.expectedWorkingDaysPerMonth)}
                        </span>
                      </div>
                      <div className="detail-input-block">
                        <input
                          type="number"
                          min="0"
                          value={workingHoursInput.workingDaysPerMonth}
                          onChange={(e) => setWorkingHoursInput(prev => ({ ...prev, workingDaysPerMonth: e.target.value }))}
                          className="payroll-input"
                          placeholder="Days per month"
                        />
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label-block">
                        <span className="detail-label">Hours / Day</span>
                        <span className="current-value-note">
                          Current: {formatHourValue(workingHoursData?.expectedHoursPerDay)}
                        </span>
                      </div>
                      <div className="detail-input-block">
                        <input
                          type="number"
                          min="0"
                          value={workingHoursInput.hoursPerDay}
                          onChange={(e) => setWorkingHoursInput(prev => ({ ...prev, hoursPerDay: e.target.value }))}
                          className="payroll-input"
                          placeholder="Hours per day"
                        />
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label-block">
                        <span className="detail-label">Weekly Hours</span>
                        <span className="current-value-note">
                          Current: {formatHourValue(workingHoursData?.expectedWeeklyHours)}
                        </span>
                      </div>
                      <div className="detail-input-block">
                        <input
                          type="number"
                          min="0"
                          value={workingHoursInput.weeklyHours}
                          onChange={(e) => setWorkingHoursInput(prev => ({ ...prev, weeklyHours: e.target.value }))}
                          className="payroll-input"
                          placeholder="Weekly hours"
                        />
                      </div>
                    </div>
                    <div className="detail-row">
                      <div className="detail-label-block">
                        <span className="detail-label">Expected Monthly Hours</span>
                        <span className="current-value-note">
                          Current: {formatHourValue(workingHoursData?.expectedMonthlyHours)}
                        </span>
                      </div>
                      <div className="detail-input-block">
                        <input
                          type="number"
                          min="0"
                          value={workingHoursInput.monthlyHours}
                          onChange={(e) => setWorkingHoursInput(prev => ({ ...prev, monthlyHours: e.target.value }))}
                          className="payroll-input"
                          placeholder="Monthly hours"
                        />
                      </div>
                    </div>
                    <button
                      className="modal-save-button"
                      onClick={handleSaveWorkingHours}
                      disabled={savingWorkingHours}
                    >
                      {savingWorkingHours ? 'Saving...' : 'Save Working Hours'}
                    </button>
                  </div>
                )}
              </div>

              <div className="details-section payroll-section">
                <div className="section-header-row">
                  <h4>Payroll Preview</h4>
                  <button className="export-btn" onClick={handleExportPayslip} disabled={exportingPayslip}>
                    {exportingPayslip ? 'Exporting...' : <><MdFileDownload /> Export Payslip</>}
                  </button>
                </div>
                <div className="payroll-block payroll-preview">
                  <div className="detail-row">
                    <span className="detail-label">Actual Hours Worked</span>
                    <span className="detail-value">{actualHoursWorked.toFixed(2)} hrs</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Expected Monthly Hours</span>
                    <span className="detail-value">{expectedMonthly.toFixed(2)} hrs</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Hourly Rate</span>
                    <span className="detail-value">{hourlyRate ? formatCurrency(hourlyRate) : 'Not available'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Estimated Earnings</span>
                    <span className="detail-value">{earnings ? formatCurrency(earnings) : 'Not available'}</span>
                  </div>
                  {payslipError && <div className="help-text error-text">{payslipError}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffList;
