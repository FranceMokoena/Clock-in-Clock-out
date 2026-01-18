import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MdSchool } from 'react-icons/md';
import './RotationPlan.css';
import { rotationAPI, departmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  ACTIVE: 'Active',
  PENDING_REVIEW: 'Pending Review',
  UPCOMING: 'Upcoming',
  COMPLETED: 'Completed',
  REGRESS: 'Regress',
  DECLINED: 'Declined'
};

const ACTION_REASON_LABELS = {
  DUE_SOON: 'Due soon',
  APPROVAL_PENDING: 'Approval pending',
  BELOW_ATTENDANCE: 'Below attendance target',
  UNRESOLVED_CORRECTIONS: 'Unresolved corrections',
  ROTATION_PLAN_MISSING: 'Rotation plan not configured'
};

const ATTENDANCE_THRESHOLD = 75;

const toStatusClass = (status) => String(status || '').toLowerCase().replace(/[\s_]+/g, '-');

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const computeEndDate = (startDate, durationType, durationValue) => {
  if (!startDate) return '';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  const value = Number(durationValue) || 1;
  const end = new Date(start);

  switch (durationType) {
    case 'week':
    case 'weeks':
      end.setDate(end.getDate() + (value * 7) - 1);
      break;
    case 'month':
    case 'months':
      end.setMonth(end.getMonth() + value);
      end.setDate(end.getDate() - 1);
      break;
    case 'days':
    case 'custom':
    default:
      end.setDate(end.getDate() + Math.max(value, 1) - 1);
      break;
  }

  return formatDateInput(end);
};

const createPlanRow = () => ({
  id: `row-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  departmentId: '',
  startDate: '',
  durationType: 'weeks',
  durationValue: 1,
  supervisorId: ''
});

const isValidObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''));

function RotationPlan({ isAdmin, hostCompanyId, isHostCompany }) {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  const resolvedHostCompanyId = hostCompanyId || (isHostCompany ? userId : null);

  const userRole = isAdmin
    ? 'ADMIN'
    : isHostCompany
      ? 'HOST_COMPANY'
      : (user?.role === 'Intern' ? 'INTERN' : 'STAFF');

  const baseParams = useMemo(() => {
    const params = { userRole };
    if (resolvedHostCompanyId) params.hostCompanyId = resolvedHostCompanyId;
    if (userId && (userRole === 'INTERN' || userRole === 'STAFF')) {
      params.requesterId = userId;
    }
    return params;
  }, [resolvedHostCompanyId, userId, userRole]);

  const [roster, setRoster] = useState([]);
  const [filteredRoster, setFilteredRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');

  const [dossier, setDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [departments, setDepartments] = useState([]);

  const [viewMode, setViewMode] = useState('OVERVIEW');
  const [planRows, setPlanRows] = useState([createPlanRow()]);
  const [savingPlan, setSavingPlan] = useState(false);

  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionOverride, setDecisionOverride] = useState(false);
  const [decisionReviewDate, setDecisionReviewDate] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  const loadRoster = useCallback(async (shouldSelectFirst = true) => {
    if (userRole === 'INTERN' || userRole === 'STAFF') {
      setRoster([]);
      setFilteredRoster([]);
      setSelectedUserId(userId);
      setSelectedUserName(user?.name || '');
      return;
    }

    setRosterLoading(true);
    setRosterError('');
    try {
      const response = await rotationAPI.getRoster(baseParams);
      if (response?.success) {
        const rosterData = Array.isArray(response.roster) ? response.roster : [];
        setRoster(rosterData);
        setFilteredRoster(rosterData);
        if (shouldSelectFirst && rosterData.length > 0 && !selectedUserId) {
          setSelectedUserId(rosterData[0].userId);
          setSelectedUserName(rosterData[0].name || '');
        }
      } else {
        setRosterError(response?.error || 'Failed to load rotation roster.');
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load rotation roster.';
      setRosterError(message);
    } finally {
      setRosterLoading(false);
    }
  }, [baseParams, selectedUserId, userRole, userId, user]);

  const loadDepartments = useCallback(async () => {
    try {
      const params = isHostCompany && resolvedHostCompanyId ? { hostCompanyId: resolvedHostCompanyId } : {};
      const response = await departmentAPI.getAll(params);
      if (response?.success) {
        setDepartments(response.departments || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }, [isHostCompany, resolvedHostCompanyId]);

  const loadDossier = useCallback(async (targetUserId) => {
    if (!targetUserId) return;
    setDossierLoading(true);
    setDossierError('');
    try {
      const response = await rotationAPI.getDossier(targetUserId, baseParams);
      if (response?.success) {
        setDossier(response);
      } else {
        setDossier(null);
        setDossierError(response?.error || 'Failed to load rotation dossier.');
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load rotation dossier.';
      setDossier(null);
      setDossierError(message);
    } finally {
      setDossierLoading(false);
    }
  }, [baseParams]);

  useEffect(() => {
    loadRoster(true);
    loadDepartments();
  }, [loadRoster, loadDepartments]);

  useEffect(() => {
    if (selectedUserId) {
      loadDossier(selectedUserId);
      setViewMode('OVERVIEW');
      setDecisionNotes('');
      setDecisionOverride(false);
      setDecisionReviewDate('');
    }
  }, [selectedUserId, loadDossier]);

  useEffect(() => {
    if (!searchTerm && statusFilter === 'ALL') {
      setFilteredRoster(roster);
      return;
    }

    const filtered = roster.filter((item) => {
      const matchesSearch = !searchTerm
        || item.name.toLowerCase().includes(searchTerm.toLowerCase())
        || (item.departmentName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setFilteredRoster(filtered);
  }, [roster, searchTerm, statusFilter]);

  useEffect(() => {
    if (!dossier || !Array.isArray(dossier.assignments)) {
      setPlanRows([createPlanRow()]);
      return;
    }

    const sortedAssignments = dossier.assignments
      .slice()
      .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

    const rows = sortedAssignments.map((assignment) => {
      const startDate = formatDateInput(assignment.startDate);
      const endDate = assignment.endDate ? new Date(assignment.endDate) : null;
      const startDateObj = assignment.startDate ? new Date(assignment.startDate) : null;
      let durationValue = assignment.durationValue;
      let durationType = assignment.durationType;

      if (!durationValue && startDateObj && endDate) {
        const diffDays = Math.max(Math.round((endDate - startDateObj) / 86400000) + 1, 1);
        durationValue = diffDays;
        durationType = 'days';
      }

      return {
        id: assignment.id,
        departmentId: assignment.departmentId || '',
        startDate,
        durationType: durationType || 'weeks',
        durationValue: durationValue || 1,
        supervisorId: assignment.supervisorId || ''
      };
    });

    setPlanRows(rows.length > 0 ? rows : [createPlanRow()]);
  }, [dossier]);

  const handleRosterSelect = (item) => {
    setSelectedUserId(item.userId);
    setSelectedUserName(item.name || '');
  };

  const handlePlanRowChange = (index, field, value) => {
    setPlanRows((prev) => prev.map((row, idx) => (
      idx === index ? { ...row, [field]: value } : row
    )));
  };

  const handleAddPlanRow = () => {
    setPlanRows((prev) => [...prev, createPlanRow()]);
  };

  const handleRemovePlanRow = (index) => {
    setPlanRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMovePlanRow = (index, direction) => {
    setPlanRows((prev) => {
      const newRows = [...prev];
      const target = index + direction;
      if (target < 0 || target >= newRows.length) return newRows;
      const temp = newRows[index];
      newRows[index] = newRows[target];
      newRows[target] = temp;
      return newRows;
    });
  };

  const handleSavePlan = async () => {
    if (!selectedUserId) return;
    const cleanedRows = planRows
      .map((row) => ({
        departmentId: row.departmentId,
        startDate: row.startDate ? new Date(row.startDate).toISOString() : null,
        durationType: row.durationType,
        durationValue: row.durationValue,
        supervisorId: row.supervisorId || null
      }))
      .filter((row) => row.departmentId);

    if (cleanedRows.length === 0) {
      setDecisionError('Please add at least one department to the rotation path.');
      return;
    }

    setSavingPlan(true);
    setDecisionError('');
    try {
      const rotationPath = cleanedRows.map((row) => row.departmentId);
      const payload = {
        rotationPath,
        scheduleRows: cleanedRows,
        userRole,
        hostCompanyId: resolvedHostCompanyId,
        actorId: userId
      };
      const response = await rotationAPI.createPlan(selectedUserId, payload, baseParams);
      if (response?.success) {
        setDossier(response.dossier || null);
        loadRoster(false);
      } else {
        setDecisionError(response?.error || 'Failed to save rotation plan.');
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to save rotation plan.';
      setDecisionError(message);
    } finally {
      setSavingPlan(false);
    }
  };

  const currentAssignment = dossier?.currentAssignment || null;
  const evidence = dossier?.evidence || {};
  const canDecide = currentAssignment?.id && isValidObjectId(currentAssignment.id);

  const evidenceMeetsRequirement = (Number(evidence.attendanceRate || 0) >= ATTENDANCE_THRESHOLD)
    && Number(evidence.unresolvedCorrectionsCount || 0) === 0;

  const handleDecision = async (decision) => {
    if (!currentAssignment?.id) return;
    setDecisionLoading(true);
    setDecisionError('');

    const payload = {
      decision,
      notes: decisionNotes,
      overrideFlag: decisionOverride,
      reviewDate: decisionReviewDate ? new Date(decisionReviewDate).toISOString() : null,
      userRole,
      hostCompanyId: resolvedHostCompanyId,
      actorId: userId
    };

    try {
      const response = await rotationAPI.updateStatus(currentAssignment.id, payload, baseParams);
      if (response?.success) {
        setDossier(response.dossier || null);
        loadRoster(false);
        setDecisionNotes('');
        setDecisionOverride(false);
        setDecisionReviewDate('');
      } else {
        setDecisionError(response?.error || 'Failed to update rotation status.');
      }
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to update rotation status.';
      setDecisionError(message);
    } finally {
      setDecisionLoading(false);
    }
  };

  const timelineEntries = useMemo(() => dossier?.assignments || [], [dossier]);
  const { timelineStart, totalDays, axisMonths } = useMemo(() => {
    const msPerDay = 86400000;
    const validEntries = timelineEntries.filter((entry) => entry.startDate && entry.endDate);
    if (validEntries.length === 0) {
      return { timelineStart: null, totalDays: 1, axisMonths: [] };
    }

    const dates = validEntries.flatMap((entry) => [
      new Date(entry.startDate).getTime(),
      new Date(entry.endDate).getTime()
    ]);

    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));
    const days = Math.max(Math.round((end - start) / msPerDay), 1);

    const months = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      months.push(cursor.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { timelineStart: start, totalDays: days, axisMonths: months };
  }, [timelineEntries]);

  const selectedRosterEntry = useMemo(
    () => roster.find((item) => String(item.userId) === String(selectedUserId)),
    [roster, selectedUserId]
  );
  const hasSelection = Boolean(selectedUserId);
  const summaryDepartment = selectedRosterEntry?.departmentName
    || currentAssignment?.departmentName
    || 'Unassigned';
  const summaryStatus = selectedRosterEntry?.status || currentAssignment?.status || 'N/A';
  const summaryDueDate = selectedRosterEntry?.dueDate || currentAssignment?.endDate || null;
  const summaryAttendanceRate = selectedRosterEntry?.attendanceRate ?? evidence.attendanceRate ?? null;
  const planMissing = hasSelection && !(dossier?.plan?.rotationPath || []).length;
  const summaryActionReasons = selectedRosterEntry
    ? (selectedRosterEntry.actionReasons || [])
    : (planMissing ? ['ROTATION_PLAN_MISSING'] : []);
  const summaryActionNeeded = selectedRosterEntry
    ? Boolean(selectedRosterEntry.actionNeeded)
    : summaryActionReasons.length > 0;

  const summaryDueLabel = summaryDueDate ? formatDate(summaryDueDate) : 'Not scheduled';
  const summaryAttendanceLabel = summaryAttendanceRate === null || summaryAttendanceRate === undefined
    ? '—'
    : `${Number(summaryAttendanceRate).toFixed(1)}%`;

  const canEvaluate = Boolean(currentAssignment);

  const renderRosterList = () => (
    <aside className="rotation-roster-panel">
      <div className="roster-header">
        <h2>Roster</h2>
        <p>Interns and staff in rotation scope</p>
      </div>

      <div className="roster-filters">
        <input
          className="roster-search"
          type="search"
          placeholder="Search name or department..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="roster-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All Statuses</option>
          {Object.keys(STATUS_LABELS).map((status) => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </select>
      </div>

      {rosterLoading && <div className="roster-state">Loading roster...</div>}
      {!rosterLoading && rosterError && <div className="roster-state error">{rosterError}</div>}

      <div className="roster-list">
        {filteredRoster.map((item) => {
          const hasAttendance = item.attendanceRate !== null && item.attendanceRate !== undefined;
          const attendanceLabel = hasAttendance
            ? `${Number(item.attendanceRate).toFixed(1)}%`
            : '—';
          const dueLabel = item.dueDate ? formatDate(item.dueDate) : 'Not scheduled';

          return (
            <button
              key={item.userId}
              type="button"
              className={`roster-item ${selectedUserId === item.userId ? 'active' : ''}`}
              onClick={() => handleRosterSelect(item)}
            >
              <div className="roster-item-header">
                <div>
                  <p className="roster-name">{item.name}</p>
                  <p className="roster-dept">{item.departmentName || 'Unassigned'}</p>
                </div>
                <span className={`status-pill status-${toStatusClass(item.status)}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>
              <div className="roster-metrics">
                <span>Due: {dueLabel}</span>
                <span>Attendance: {attendanceLabel}</span>
              </div>
              <div className="roster-progress">
                <div className="roster-progress-bar" style={{ width: `${Math.round((item.progress || 0) * 100)}%` }}></div>
              </div>
              {item.actionNeeded && (
                <div className="roster-action">
                  <span>Action Needed</span>
                  <div className="roster-action-reasons">
                    {(item.actionReasons || []).map((reason) => (
                      <span key={reason}>{ACTION_REASON_LABELS[reason] || reason}</span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
        {!rosterLoading && filteredRoster.length === 0 && (
          <div className="roster-state">No roster entries found.</div>
        )}
      </div>
    </aside>
  );

  const renderSummaryCard = () => (
    <section className="rotation-summary-panel">
      <div className="summary-card-header">
        <div>
          <p className="summary-eyebrow">Rotation Overview</p>
          <h2>{dossier?.user?.name || selectedUserName || 'Select a staff member'}</h2>
        </div>
      </div>

      {dossierLoading && hasSelection && <div className="summary-state">Loading summary...</div>}
      {!dossierLoading && dossierError && <div className="summary-state error">{dossierError}</div>}
      {!dossierLoading && !dossierError && !hasSelection && (
        <div className="summary-state">Select a staff member to view rotation summary.</div>
      )}

      {!dossierLoading && !dossierError && hasSelection && (
        <>
          <div className="summary-grid">
            <div>
              <span>Name</span>
              <strong>{dossier?.user?.name || selectedUserName}</strong>
            </div>
            <div>
              <span>Department</span>
              <strong>{summaryDepartment}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{STATUS_LABELS[summaryStatus] || summaryStatus}</strong>
            </div>
            <div>
              <span>Due Date</span>
              <strong>{summaryDueLabel}</strong>
            </div>
            <div>
              <span>Attendance</span>
              <strong>{summaryAttendanceLabel}</strong>
            </div>
          </div>

          {summaryActionNeeded && (
            <div className="summary-action-needed">
              <div className="summary-action-header">Action Needed</div>
              <div className="summary-action-list">
                {summaryActionReasons.map((reason) => (
                  <span key={reason}>{ACTION_REASON_LABELS[reason] || reason}</span>
                ))}
              </div>
            </div>
          )}

          <div className="summary-actions">
            <button type="button" onClick={() => setViewMode('PLAN')}>View Rotation Plan</button>
            <button type="button" disabled={!canEvaluate} onClick={() => setViewMode('DECISION')}>
              Evaluate Current Assignment
            </button>
            <button type="button" onClick={() => setViewMode('HISTORY')}>View History</button>
          </div>
        </>
      )}
    </section>
  );

  const renderTimelinePreview = () => (
    <details className="timeline-preview">
      <summary>Timeline Preview</summary>
      {axisMonths.length > 0 && (
        <div className="timeline-axis">
          {axisMonths.map((label) => (
            <span key={label} className="timeline-axis-label">{label}</span>
          ))}
        </div>
      )}
      <div className="timeline-tracks">
        {timelineEntries.length === 0 && (
          <div className="timeline-empty">No rotation assignments found.</div>
        )}
        {timelineEntries.map((entry) => {
          if (!entry.startDate || !entry.endDate || !timelineStart) return null;
          const entryStart = new Date(entry.startDate);
          const entryEnd = new Date(entry.endDate);
          if (Number.isNaN(entryStart.getTime()) || Number.isNaN(entryEnd.getTime())) return null;
          const startOffset = ((entryStart - timelineStart) / 86400000 / totalDays) * 100;
          const durationDays = Math.max(Math.round((entryEnd - entryStart) / 86400000), 1);
          const widthPercent = Math.max((durationDays / totalDays) * 100, 6);

          return (
            <div key={entry.id} className="timeline-row">
              <div className="timeline-row-label">
                <strong>{entry.departmentName}</strong>
                <span>{formatDate(entry.startDate)} - {formatDate(entry.endDate)}</span>
              </div>
              <div className="timeline-bar-track">
                <span
                  className={`timeline-bar timeline-bar-${toStatusClass(entry.status)}`}
                  style={{ left: `${startOffset}%`, width: `${widthPercent}%` }}
                />
              </div>
              <span className={`status-badge status-${toStatusClass(entry.status)}`}>
                {STATUS_LABELS[entry.status] || entry.status}
              </span>
            </div>
          );
        })}
      </div>
    </details>
  );

  const renderPlanView = () => (
    <section className="rotation-view-panel">
      <div className="view-header">
        <button type="button" className="back-button" onClick={() => setViewMode('OVERVIEW')}>
          ← Back to Overview
        </button>
        <h2>Rotation Plan</h2>
      </div>

      {dossierLoading && <div className="view-state">Loading rotation plan...</div>}
      {!dossierLoading && dossierError && <div className="view-state error">{dossierError}</div>}
      {!dossierLoading && !dossierError && !hasSelection && (
        <div className="view-state">Select a staff member to plan rotations.</div>
      )}

      {!dossierLoading && !dossierError && hasSelection && (
        <>
          {renderTimelinePreview()}
          <div className="rotation-path-table">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Start Date</th>
                  <th>Duration</th>
                  <th>End Date</th>
                  <th>Supervisor</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((row, index) => {
                  const endDate = computeEndDate(row.startDate, row.durationType, row.durationValue);
                  return (
                    <tr key={row.id}>
                      <td>
                        <select
                          value={row.departmentId}
                          onChange={(event) => handlePlanRowChange(index, 'departmentId', event.target.value)}
                        >
                          <option value="">Select department</option>
                          {departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(event) => handlePlanRowChange(index, 'startDate', event.target.value)}
                        />
                      </td>
                      <td className="duration-cell">
                        <select
                          value={row.durationType}
                          onChange={(event) => handlePlanRowChange(index, 'durationType', event.target.value)}
                        >
                          <option value="week">1 Week</option>
                          <option value="weeks">Weeks</option>
                          <option value="month">1 Month</option>
                          <option value="months">Months</option>
                          <option value="days">Days</option>
                          <option value="custom">Custom Days</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={row.durationValue}
                          onChange={(event) => handlePlanRowChange(index, 'durationValue', event.target.value)}
                        />
                      </td>
                      <td>{endDate || 'Auto'}</td>
                      <td>
                        <input
                          type="text"
                          placeholder="Supervisor ID (optional)"
                          value={row.supervisorId}
                          onChange={(event) => handlePlanRowChange(index, 'supervisorId', event.target.value)}
                        />
                      </td>
                      <td className="order-controls">
                        <button type="button" onClick={() => handleMovePlanRow(index, -1)}>Up</button>
                        <button type="button" onClick={() => handleMovePlanRow(index, 1)}>Down</button>
                        <button type="button" onClick={() => handleRemovePlanRow(index)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="rotation-path-actions">
              <button type="button" onClick={handleAddPlanRow}>Add Department</button>
              <button type="button" disabled={savingPlan} onClick={handleSavePlan}>
                {savingPlan ? 'Saving...' : 'Save Rotation Plan'}
              </button>
            </div>
          </div>
          {decisionError && <p className="dossier-note error">{decisionError}</p>}
        </>
      )}
    </section>
  );

  const renderDecisionView = () => (
    <section className="rotation-view-panel">
      <div className="view-header">
        <button type="button" className="back-button" onClick={() => setViewMode('OVERVIEW')}>
          ← Back to Overview
        </button>
        <h2>Current Assignment Evaluation</h2>
      </div>

      {dossierLoading && <div className="view-state">Loading assignment...</div>}
      {!dossierLoading && dossierError && <div className="view-state error">{dossierError}</div>}
      {!dossierLoading && !dossierError && !currentAssignment && (
        <div className="view-state">No active assignment available for evaluation.</div>
      )}

      {!dossierLoading && !dossierError && currentAssignment && (
        <div className="dossier-grid">
          <div className="dossier-panel">
            <h3>Evidence Gate</h3>
            <div className="dossier-field"><span>Attendance</span><strong>{summaryAttendanceLabel}</strong></div>
            <div className="dossier-field"><span>Actual Hours</span><strong>{evidence.actualHours ?? '—'}</strong></div>
            <div className="dossier-field"><span>Expected Hours</span><strong>{evidence.expectedHours ?? '—'}</strong></div>
            <div className="dossier-field"><span>Late Count</span><strong>{evidence.lateCount ?? '—'}</strong></div>
            <div className="dossier-field"><span>Missed Clock-Out</span><strong>{evidence.missedClockOutCount ?? '—'}</strong></div>
            <div className="dossier-field"><span>Corrections Pending</span><strong>{evidence.unresolvedCorrectionsCount ?? '—'}</strong></div>
            <p className={`dossier-note ${evidenceMeetsRequirement ? 'ok' : 'warn'}`}>
              {evidenceMeetsRequirement
                ? 'Evidence requirements met.'
                : 'Below requirement. Override requires notes and acknowledgment.'}
            </p>
          </div>

          <div className="dossier-panel">
            <h3>Decision Update</h3>
            <textarea
              rows="4"
              value={decisionNotes}
              placeholder="Notes (required for regress/decline or override)"
              onChange={(event) => setDecisionNotes(event.target.value)}
            />
            <div className="decision-row">
              <label>
                <input
                  type="checkbox"
                  checked={decisionOverride}
                  onChange={(event) => setDecisionOverride(event.target.checked)}
                />
                Override evidence failure
              </label>
              <input
                type="date"
                value={decisionReviewDate}
                onChange={(event) => setDecisionReviewDate(event.target.value)}
              />
            </div>
            {decisionError && <p className="dossier-note error">{decisionError}</p>}
            <div className="decision-actions">
              <button
                type="button"
                disabled={!canDecide || decisionLoading || (!evidenceMeetsRequirement && !decisionOverride)}
                onClick={() => handleDecision('COMPLETED')}
              >
                Complete
              </button>
              <button
                type="button"
                disabled={!canDecide || decisionLoading}
                onClick={() => handleDecision('REGRESS')}
              >
                Regress
              </button>
              <button
                type="button"
                disabled={!canDecide || decisionLoading}
                onClick={() => handleDecision('DECLINED')}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderHistoryView = () => (
    <section className="rotation-view-panel">
      <div className="view-header">
        <button type="button" className="back-button" onClick={() => setViewMode('OVERVIEW')}>
          ← Back to Overview
        </button>
        <h2>Rotation History</h2>
      </div>

      {dossierLoading && <div className="view-state">Loading history...</div>}
      {!dossierLoading && dossierError && <div className="view-state error">{dossierError}</div>}
      {!dossierLoading && !dossierError && (
        <div className="dossier-table-wrap">
          <table className="dossier-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Period</th>
                <th>Outcome</th>
                <th>Approved By</th>
                <th>Approved Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(dossier?.history || []).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.departmentName}</td>
                  <td>{formatDate(entry.startDate)} - {formatDate(entry.endDate)}</td>
                  <td>
                    <span className={`pill pill-${toStatusClass(entry.outcome)}`}>
                      {STATUS_LABELS[entry.outcome] || entry.outcome}
                    </span>
                  </td>
                  <td>{entry.adminName || 'N/A'}</td>
                  <td>{formatDate(entry.decidedAt || entry.endDate)}</td>
                  <td>{entry.evaluationSummary || '—'}</td>
                </tr>
              ))}
              {(!dossier?.history || dossier.history.length === 0) && (
                <tr><td colSpan="6" className="dossier-empty-row">No history recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

    return (
    <div className="rotation-plan-container">
      <section className="rotation-plan-hero">
        <div className="hero-content">
          <div className="hero-icon">
            <MdSchool />
          </div>
          <h1>Rotation Control Center</h1>
          <p className="hero-subtitle">
            Audit-ready rotation plans for interns and staff, driven by real attendance evidence.
          </p>
        </div>
      </section>

      {viewMode === 'OVERVIEW' && (
        <div className="rotation-plan-content rotation-layout">
          {userRole !== 'INTERN' && userRole !== 'STAFF' && renderRosterList()}
          {renderSummaryCard()}
        </div>
      )}

      {viewMode === 'PLAN' && (
        <div className="rotation-plan-content rotation-layout single">
          {renderPlanView()}
        </div>
      )}

      {viewMode === 'DECISION' && (
        <div className="rotation-plan-content rotation-layout single">
          {renderDecisionView()}
        </div>
      )}

      {viewMode === 'HISTORY' && (
        <div className="rotation-plan-content rotation-layout single">
          {renderHistoryView()}
        </div>
      )}
    </div>
  );
}

export default RotationPlan;
