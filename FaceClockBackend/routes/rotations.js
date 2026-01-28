const express = require('express');
const mongoose = require('mongoose');

const RotationPlan = require('../models/RotationPlan');
const RotationAssignment = require('../models/RotationAssignment');
const RotationApproval = require('../models/RotationApproval');
const RotationHistory = require('../models/RotationHistory');
const RotationDecision = require('../models/RotationDecision');
const Staff = require('../models/Staff');
const Department = require('../models/Department');
const HostCompany = require('../models/HostCompany');
const Notification = require('../models/Notification');
const staffCache = require('../utils/staffCache');
const { computeRotationEvidence } = require('../utils/rotationEvidence');
const { logAction } = require('../utils/actionLogger');

const router = express.Router();

const SUPPORTED_ROLES = ['ADMIN', 'HOST_COMPANY', 'SUPERVISOR', 'INTERN', 'STAFF'];
const DUE_SOON_DAYS = Number.isFinite(Number(process.env.ROTATION_DUE_SOON_DAYS))
  ? Number(process.env.ROTATION_DUE_SOON_DAYS)
  : 7;
const ROTATION_ATTENDANCE_THRESHOLD = Number.isFinite(Number(process.env.ROTATION_ATTENDANCE_THRESHOLD))
  ? Number(process.env.ROTATION_ATTENDANCE_THRESHOLD)
  : 75;
const EMPTY_EVIDENCE = {
  actualHours: null,
  expectedHours: null,
  attendanceRate: null,
  lateCount: null,
  missedClockOutCount: null,
  unresolvedCorrectionsCount: null
};

const getRoleContext = (req = {}) => {
  const query = req.query || {};
  const body = req.body || {};
  const userRole = String(query.userRole || body.userRole || '').toUpperCase();
  const hostCompanyId = query.hostCompanyId || body.hostCompanyId || null;
  const actorId = query.actorId || body.actorId || null;
  const requesterId = query.requesterId || body.requesterId || null;
  return { userRole, hostCompanyId, actorId, requesterId };
};

const requireRole = (userRole, allowed) => {
  if (!SUPPORTED_ROLES.includes(userRole)) {
    return { ok: false, error: 'Invalid userRole' };
  }
  if (!allowed.includes(userRole)) {
    return { ok: false, error: 'Unauthorized for this action' };
  }
  return { ok: true };
};

const resolveDepartmentMap = async (departmentIds) => {
  if (!departmentIds || departmentIds.length === 0) return {};
  const departments = await Department.find({ _id: { $in: departmentIds } })
    .select('_id name')
    .lean();
  const map = {};
  departments.forEach((dept) => {
    map[dept._id.toString()] = dept.name;
  });
  return map;
};

const updateStaffDepartment = async ({ userId, departmentId, departmentName }) => {
  if (!userId) return null;
  let resolvedName = departmentName || null;

  if (!resolvedName && departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    const department = await Department.findById(departmentId).select('name').lean();
    resolvedName = department?.name || null;
  }

  if (!resolvedName) return null;
  await Staff.findByIdAndUpdate(userId, { department: resolvedName });
  if (staffCache && typeof staffCache.invalidate === 'function') {
    staffCache.invalidate();
  }
  return resolvedName;
};

const getCurrentAssignment = (assignments) => {
  if (!assignments || assignments.length === 0) return null;
  const statusPriority = {
    ACTIVE: 4,
    REGRESS: 4,
    PENDING_REVIEW: 3,
    PENDING_APPROVAL: 3,
    UPCOMING: 2,
    COMPLETED: 1,
    DECLINED: 0
  };
  return assignments
    .slice()
    .sort((a, b) => {
      const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.startDate || 0) - new Date(a.startDate || 0);
    })[0];
};

const mapLegacyStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'COMPLETED';
  if (normalized === 'paused') return 'PENDING_APPROVAL';
  if (normalized === 'active') return 'ACTIVE';
  return 'ACTIVE';
};

const mapLegacyApproval = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return 'APPROVE';
  if (normalized === 'denied' || normalized === 'rejected') return 'REJECT';
  return 'PENDING';
};

const normalizeAssignmentStatus = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PENDING_APPROVAL') return 'PENDING_REVIEW';
  if (normalized === 'PAUSED' || normalized === 'REQUIRES_ACTION') return 'DECLINED';
  return normalized || 'UPCOMING';
};

const buildActionNeeded = ({ dueSoon, approvalPending, belowAttendance, unresolvedCorrections, missingPlan }) => {
  const reasons = [];
  if (missingPlan) reasons.push('ROTATION_PLAN_MISSING');
  if (dueSoon) reasons.push('DUE_SOON');
  if (approvalPending) reasons.push('APPROVAL_PENDING');
  if (belowAttendance) reasons.push('BELOW_ATTENDANCE');
  if (unresolvedCorrections) reasons.push('UNRESOLVED_CORRECTIONS');
  return {
    actionNeeded: reasons.length > 0,
    actionReasons: reasons
  };
};

const computeDurationEndDate = (startDate, durationType, durationValue) => {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (!durationType) {
    return new Date(start);
  }
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

  return end;
};

const normalizeScheduleRows = (rows = [], planStart) => {
  let cursorStart = planStart ? new Date(planStart) : new Date();
  return rows.map((row) => {
    const startDate = row.startDate ? new Date(row.startDate) : new Date(cursorStart);
    const endDate = row.endDate
      ? new Date(row.endDate)
      : computeDurationEndDate(startDate, row.durationType, row.durationValue);

    const normalized = {
      ...row,
      startDate,
      endDate,
      durationType: row.durationType || 'weeks',
      durationValue: row.durationValue || 1
    };

    cursorStart = new Date(endDate || startDate);
    cursorStart.setDate(cursorStart.getDate() + 1);
    return normalized;
  });
};

const buildTimelinePayload = async (userId) => {
  const staff = await Staff.findById(userId)
    .select('name surname role department hostCompanyId rotationPlan createdAt')
    .lean();
  if (!staff) {
    return null;
  }

  const legacyPlan = staff.rotationPlan || null;
  const [assignments, history] = await Promise.all([
    RotationAssignment.find({ userId })
      .sort({ startDate: 1 })
      .lean(),
    RotationHistory.find({ userId })
      .sort({ startDate: 1 })
      .lean()
  ]);

  const assignmentIds = assignments.map((assignment) => assignment._id);
  const approvals = assignmentIds.length
    ? await RotationApproval.find({ assignmentId: { $in: assignmentIds } })
      .sort({ updatedAt: -1 })
      .lean()
    : [];

  const departmentIds = [
    ...assignments.map((assignment) => assignment.departmentId),
    ...history.map((entry) => entry.departmentId)
  ].filter(Boolean);
  if (legacyPlan?.currentDepartment?.departmentId) {
    departmentIds.push(legacyPlan.currentDepartment.departmentId);
  }
  if (legacyPlan?.history?.length) {
    legacyPlan.history.forEach((entry) => {
      if (entry.departmentId) {
        departmentIds.push(entry.departmentId);
      }
    });
  }
  const departmentMap = await resolveDepartmentMap(departmentIds);

  const supervisorIds = [
    ...assignments.map((assignment) => assignment.supervisorId),
    ...history.map((entry) => entry.supervisorId)
  ].filter(Boolean);
  const supervisors = supervisorIds.length
    ? await Staff.find({ _id: { $in: supervisorIds } })
      .select('name surname')
      .lean()
    : [];
  const supervisorMap = {};
  supervisors.forEach((supervisor) => {
    supervisorMap[supervisor._id.toString()] = `${supervisor.name} ${supervisor.surname}`.trim();
  });

  let currentAssignment = getCurrentAssignment(assignments);
  const latestApproval = currentAssignment
    ? approvals.find((approval) => approval.assignmentId.toString() === currentAssignment._id.toString())
    : null;

  let entries = [
    ...history.map((entry) => ({
      id: entry._id,
      departmentName: departmentMap[entry.departmentId?.toString()] || 'Unknown',
      start: entry.startDate,
      end: entry.endDate,
      status: entry.outcome || 'COMPLETED'
    })),
    ...assignments.map((assignment) => ({
      id: assignment._id,
      departmentName: departmentMap[assignment.departmentId?.toString()] || 'Unknown',
      start: assignment.startDate,
      end: assignment.endDate,
      status: normalizeAssignmentStatus(assignment.status)
    }))
  ];

  if (entries.length === 0 && legacyPlan) {
    const legacyHistory = Array.isArray(legacyPlan.history) ? legacyPlan.history : [];
    entries = legacyHistory.map((entry, index) => ({
      id: entry._id || `legacy-history-${index}`,
      departmentName: entry.departmentName || departmentMap[entry.departmentId?.toString()] || 'Unknown',
      start: entry.startDate || null,
      end: entry.endDate || entry.startDate || null,
      status: mapLegacyStatus(entry.status || 'completed')
    }));

    if (legacyPlan.currentDepartment?.departmentId || legacyPlan.currentDepartment?.departmentName) {
      const currentStart = legacyPlan.startDate || new Date();
      const currentEnd = legacyPlan.endDate || new Date();
      const legacyCurrentEntry = {
        id: `legacy-current-${staff._id}`,
        departmentName: legacyPlan.currentDepartment.departmentName
          || departmentMap[legacyPlan.currentDepartment.departmentId?.toString()]
          || 'Unassigned',
        start: currentStart,
        end: currentEnd,
        status: mapLegacyStatus(legacyPlan.status)
      };
      entries.push(legacyCurrentEntry);
      currentAssignment = {
        _id: legacyCurrentEntry.id,
        departmentId: legacyPlan.currentDepartment.departmentId || null,
        departmentName: legacyCurrentEntry.departmentName,
        supervisorId: legacyPlan.approvals?.[legacyPlan.approvals.length - 1]?.supervisorId || null,
        status: legacyCurrentEntry.status,
        startDate: currentStart,
        endDate: currentEnd
      };
    }
  }

  if (entries.length === 0 && staff?.department) {
    const departmentName = typeof staff.department === 'string'
      ? staff.department
      : (staff.department?.name || 'Unassigned');
    const fallbackStart = legacyPlan?.startDate || staff.createdAt || new Date();
    const fallbackEnd = legacyPlan?.endDate || new Date();
    const fallbackEntry = {
      id: `fallback-current-${staff._id}`,
      departmentName,
      start: fallbackStart,
      end: fallbackEnd,
      status: mapLegacyStatus(legacyPlan?.status || 'active')
    };
    entries.push(fallbackEntry);
    currentAssignment = {
      _id: fallbackEntry.id,
      departmentId: legacyPlan?.currentDepartment?.departmentId || null,
      departmentName,
      supervisorId: legacyPlan?.approvals?.[legacyPlan?.approvals?.length - 1]?.supervisorId || null,
      status: fallbackEntry.status,
      startDate: fallbackStart,
      endDate: fallbackEnd
    };
  }

  const evidence = currentAssignment
    ? await computeRotationEvidence({
      userId,
      startDate: currentAssignment.startDate || currentAssignment.start,
      endDate: currentAssignment.endDate || currentAssignment.end || new Date()
    })
    : { ...EMPTY_EVIDENCE };

  return {
    user: {
      id: staff._id,
      name: `${staff.name} ${staff.surname}`.trim(),
      role: staff.role
    },
    current: currentAssignment
      ? {
        departmentId: currentAssignment.departmentId,
        departmentName: departmentMap[currentAssignment.departmentId?.toString()]
          || currentAssignment.departmentName
          || 'Unknown',
        supervisorId: currentAssignment.supervisorId || null,
        supervisorName: currentAssignment.supervisorId
          ? (supervisorMap[currentAssignment.supervisorId.toString()] || null)
          : null,
        status: normalizeAssignmentStatus(currentAssignment.status),
        start: currentAssignment.startDate,
        end: currentAssignment.endDate
      }
      : null,
    entries,
    approval: {
      supervisorRecommendation: latestApproval?.supervisorRecommendation
        || mapLegacyApproval(legacyPlan?.approvals?.[legacyPlan?.approvals?.length - 1]?.status)
        || 'PENDING',
      supervisorAt: latestApproval?.supervisorAt || legacyPlan?.approvals?.[legacyPlan?.approvals?.length - 1]?.createdAt || null,
      adminDecision: latestApproval?.adminDecision
        || mapLegacyApproval(legacyPlan?.approvals?.[legacyPlan?.approvals?.length - 1]?.status)
        || 'PENDING',
      adminAt: latestApproval?.adminAt || legacyPlan?.approvals?.[legacyPlan?.approvals?.length - 1]?.createdAt || null
    },
    evidence
  };
};

const buildDossierPayload = async (userId) => {
  const staff = await Staff.findById(userId)
    .select('name surname role idNumber department hostCompanyId rotationPlan createdAt')
    .lean();
  if (!staff) {
    return null;
  }

  const plan = await RotationPlan.findOne({ userId }).lean();
  const [assignments, history] = await Promise.all([
    RotationAssignment.find({ userId }).sort({ startDate: 1 }).lean(),
    RotationHistory.find({ userId }).sort({ startDate: 1 }).lean()
  ]);

  const assignmentIds = assignments.map((assignment) => assignment._id);
  const approvals = assignmentIds.length
    ? await RotationApproval.find({ assignmentId: { $in: assignmentIds } })
      .sort({ updatedAt: -1 })
      .lean()
    : [];

  const decisionDocs = assignmentIds.length
    ? await RotationDecision.find({ assignmentId: { $in: assignmentIds } })
      .sort({ decidedAt: -1 })
      .lean()
    : [];

  const departmentIds = [
    ...assignments.map((assignment) => assignment.departmentId),
    ...history.map((entry) => entry.departmentId)
  ].filter(Boolean);

  const legacyPlan = staff.rotationPlan || null;
  if (legacyPlan?.currentDepartment?.departmentId) {
    departmentIds.push(legacyPlan.currentDepartment.departmentId);
  }
  if (legacyPlan?.history?.length) {
    legacyPlan.history.forEach((entry) => {
      if (entry.departmentId) departmentIds.push(entry.departmentId);
    });
  }

  const departmentMap = await resolveDepartmentMap(departmentIds);

  const supervisorIds = [
    ...assignments.map((assignment) => assignment.supervisorId),
    ...history.map((entry) => entry.supervisorId)
  ].filter(Boolean);
  const supervisors = supervisorIds.length
    ? await Staff.find({ _id: { $in: supervisorIds } })
      .select('name surname')
      .lean()
    : [];
  const supervisorMap = {};
  supervisors.forEach((supervisor) => {
    supervisorMap[supervisor._id.toString()] = `${supervisor.name} ${supervisor.surname}`.trim();
  });

  const adminIds = history
    .map((entry) => entry.adminId)
    .filter(Boolean);
  const adminUsers = adminIds.length
    ? await Staff.find({ _id: { $in: adminIds } })
      .select('name surname')
      .lean()
    : [];
  const adminMap = {};
  adminUsers.forEach((admin) => {
    adminMap[admin._id.toString()] = `${admin.name} ${admin.surname}`.trim();
  });
  if (adminIds.some((id) => id.toString() === '000000000000000000000001')) {
    adminMap['000000000000000000000001'] = 'System Administrator';
  }

  const adminIdStrings = adminIds.map((id) => id.toString());
  const missingAdminIds = adminIdStrings.filter((id) => !adminMap[id]);
  const uniqueMissingAdminIds = Array.from(new Set(missingAdminIds));
  const hostCompanyApprovers = uniqueMissingAdminIds.length
    ? await HostCompany.find({ _id: { $in: uniqueMissingAdminIds } })
      .select('name companyName')
      .lean()
    : [];
  const hostCompanyApproverMap = {};
  hostCompanyApprovers.forEach((company) => {
    hostCompanyApproverMap[company._id.toString()] = company.companyName || company.name || null;
  });

  let normalizedAssignments = assignments.map((assignment) => {
    const approval = approvals.find((entry) => entry.assignmentId.toString() === assignment._id.toString());
    const decision = decisionDocs.find((entry) => entry.assignmentId.toString() === assignment._id.toString());
    return {
      id: assignment._id,
      departmentId: assignment.departmentId,
      departmentName: departmentMap[assignment.departmentId?.toString()] || 'Unknown',
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      durationType: assignment.durationType || null,
      durationValue: assignment.durationValue || null,
      supervisorId: assignment.supervisorId || null,
      supervisorName: assignment.supervisorId
        ? (supervisorMap[assignment.supervisorId.toString()] || null)
        : null,
      status: normalizeAssignmentStatus(assignment.status),
      notes: assignment.notes || null,
      reviewDate: assignment.reviewDate || null,
      approval: approval || null,
      decision: decision || null
    };
  });

  if (normalizedAssignments.length === 0 && legacyPlan) {
    const legacyHistory = Array.isArray(legacyPlan.history) ? legacyPlan.history : [];
    normalizedAssignments = legacyHistory.map((entry, index) => ({
      id: entry._id || `legacy-history-${index}`,
      departmentId: entry.departmentId || null,
      departmentName: entry.departmentName || departmentMap[entry.departmentId?.toString()] || 'Unknown',
      startDate: entry.startDate || null,
      endDate: entry.endDate || entry.startDate || null,
      durationType: null,
      durationValue: null,
      supervisorId: null,
      supervisorName: null,
      status: mapLegacyStatus(entry.status || 'completed'),
      notes: entry.notes || null,
      reviewDate: null,
      approval: null,
      decision: null
    }));

    if (legacyPlan.currentDepartment?.departmentId || legacyPlan.currentDepartment?.departmentName) {
      normalizedAssignments.push({
        id: `legacy-current-${staff._id}`,
        departmentId: legacyPlan.currentDepartment.departmentId || null,
        departmentName: legacyPlan.currentDepartment.departmentName
          || departmentMap[legacyPlan.currentDepartment.departmentId?.toString()]
          || 'Unassigned',
        startDate: legacyPlan.startDate || staff.createdAt || new Date(),
        endDate: legacyPlan.endDate || new Date(),
        durationType: null,
        durationValue: null,
        supervisorId: legacyPlan.approvals?.[legacyPlan.approvals.length - 1]?.supervisorId || null,
        supervisorName: null,
        status: mapLegacyStatus(legacyPlan.status),
        notes: legacyPlan.notes || null,
        reviewDate: null,
        approval: null,
        decision: null
      });
    }
  }

  if (normalizedAssignments.length === 0 && staff.department) {
    const fallbackStart = legacyPlan?.startDate || staff.createdAt || new Date();
    const fallbackEnd = legacyPlan?.endDate || new Date();
    const fallbackDepartmentName = typeof staff.department === 'string'
      ? staff.department
      : (staff.department?.name || 'Unassigned');
    normalizedAssignments = [
      {
        id: `fallback-current-${staff._id}`,
        departmentId: null,
        departmentName: fallbackDepartmentName,
        startDate: fallbackStart,
        endDate: fallbackEnd,
        durationType: null,
        durationValue: null,
        supervisorId: null,
        supervisorName: null,
        status: 'ACTIVE',
        notes: null,
        reviewDate: null,
        approval: null,
        decision: null
      }
    ];
  }

  const currentAssignment = getCurrentAssignment(
    normalizedAssignments.map((assignment) => ({
      ...assignment,
      startDate: assignment.startDate,
      endDate: assignment.endDate
    }))
  );

  const evidence = currentAssignment
    ? await computeRotationEvidence({
      userId,
      startDate: currentAssignment.startDate || new Date(),
      endDate: currentAssignment.endDate || new Date()
    })
    : { ...EMPTY_EVIDENCE };

  const hostCompany = staff.hostCompanyId
    ? await HostCompany.findById(staff.hostCompanyId).select('name companyName').lean()
    : null;

  const rotationPath = plan?.rotationPath || [];
  const historyRows = history.map((entry) => {
    const adminId = entry.adminId ? entry.adminId.toString() : null;
    const supervisorId = entry.supervisorId ? entry.supervisorId.toString() : null;
    const adminName = adminId ? (adminMap[adminId] || null) : null;
    const supervisorName = supervisorId ? (supervisorMap[supervisorId] || null) : null;
    let approvedByRole = null;
    let approvedByName = null;

    if (adminId && adminMap[adminId]) {
      approvedByRole = 'Admin';
      approvedByName = adminMap[adminId];
    } else if (adminId && hostCompanyApproverMap[adminId]) {
      approvedByRole = 'Host Company';
      approvedByName = hostCompanyApproverMap[adminId];
    } else if (supervisorName) {
      approvedByRole = 'Host Company';
      approvedByName = supervisorName;
    }

    return {
      id: entry._id,
      departmentName: departmentMap[entry.departmentId?.toString()] || 'Unknown',
      startDate: entry.startDate,
      endDate: entry.endDate,
      outcome: entry.outcome || 'COMPLETED',
      evaluationSummary: entry.evaluationSummary || null,
      decidedAt: entry.decidedAt || entry.endDate || null,
      adminName,
      supervisorName,
      approvedByRole,
      approvedByName
    };
  });

  return {
    user: {
      id: staff._id,
      name: `${staff.name} ${staff.surname}`.trim(),
      role: staff.role,
      idNumber: staff.idNumber,
      hostCompanyName: hostCompany?.companyName || hostCompany?.name || null
    },
    plan: {
      id: plan?._id || null,
      status: plan?.status || (legacyPlan ? mapLegacyStatus(legacyPlan.status) : 'ACTIVE'),
      rotationPath
    },
    assignments: normalizedAssignments,
    currentAssignment: currentAssignment
      ? {
        ...currentAssignment,
        departmentName: currentAssignment.departmentName || departmentMap[currentAssignment.departmentId?.toString()] || 'Unknown',
        status: normalizeAssignmentStatus(currentAssignment.status)
      }
      : null,
    evidence,
    history: historyRows
  };
};

const validateAssignmentsOverlap = (assignments) => {
  const normalized = assignments
    .map((entry) => ({
      start: new Date(entry.startDate),
      end: new Date(entry.endDate)
    }))
    .sort((a, b) => a.start - b.start);

  for (let i = 1; i < normalized.length; i += 1) {
    const prev = normalized[i - 1];
    const current = normalized[i];
    if (current.start <= prev.end) {
      return false;
    }
  }
  return true;
};

router.get('/roster', async (req, res) => {
  try {
    const { userRole, hostCompanyId, actorId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['ADMIN', 'HOST_COMPANY']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    if (userRole === 'HOST_COMPANY' && !hostCompanyId) {
      return res.status(400).json({ success: false, error: 'hostCompanyId is required for Host Company users' });
    }

    const staffFilter = { isActive: true, role: { $in: ['Intern', 'Staff'] } };
    if (hostCompanyId) {
      staffFilter.hostCompanyId = hostCompanyId;
    }

    const staffList = await Staff.find(staffFilter)
      .select('name surname department hostCompanyId role rotationPlan createdAt')
      .lean();

    const staffIds = staffList.map((staff) => staff._id);
    const assignments = staffIds.length
      ? await RotationAssignment.find({ userId: { $in: staffIds } }).lean()
      : [];

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const approvals = assignmentIds.length
      ? await RotationApproval.find({ assignmentId: { $in: assignmentIds } })
        .sort({ updatedAt: -1 })
        .lean()
      : [];

    const departmentIds = assignments.map((assignment) => assignment.departmentId).filter(Boolean);
    const departmentMap = await resolveDepartmentMap(departmentIds);

    const assignmentsByUser = new Map();
    assignments.forEach((assignment) => {
      const key = assignment.userId.toString();
      if (!assignmentsByUser.has(key)) {
        assignmentsByUser.set(key, []);
      }
      assignmentsByUser.get(key).push(assignment);
    });

    const now = new Date();
    const dueSoonCutoff = new Date(now.getTime() + (DUE_SOON_DAYS * 86400000));
    const dueSoonAssignments = [];

    const roster = await Promise.all(staffList.map(async (staff) => {
      const key = staff._id.toString();
      const userAssignments = assignmentsByUser.get(key) || [];
      let currentAssignment = getCurrentAssignment(userAssignments);
      const legacyPlan = staff.rotationPlan || null;
      const hasLegacyPlan = Boolean(
        legacyPlan
        && (legacyPlan.currentDepartment?.departmentId
          || legacyPlan.currentDepartment?.departmentName
          || (Array.isArray(legacyPlan.history) && legacyPlan.history.length > 0))
      );
      const hasFallbackDepartment = !currentAssignment && !hasLegacyPlan && Boolean(staff.department);

      if (!currentAssignment && legacyPlan?.currentDepartment?.departmentId) {
        currentAssignment = {
          _id: `legacy-${staff._id}`,
          departmentId: legacyPlan.currentDepartment.departmentId,
          startDate: legacyPlan.startDate || staff.createdAt || new Date(),
          endDate: legacyPlan.endDate || new Date(),
          status: mapLegacyStatus(legacyPlan.status)
        };
      }

      const departmentName = currentAssignment
        ? (departmentMap[currentAssignment.departmentId?.toString()]
          || legacyPlan?.currentDepartment?.departmentName
          || 'Unknown')
        : (legacyPlan?.currentDepartment?.departmentName || staff.department || 'Unassigned');

      const approval = currentAssignment && mongoose.Types.ObjectId.isValid(currentAssignment._id)
        ? approvals.find((entry) => entry.assignmentId.toString() === currentAssignment._id.toString())
        : null;

      if (
        currentAssignment
        && ['ACTIVE', 'REGRESS'].includes(String(currentAssignment.status).toUpperCase())
        && currentAssignment.endDate
        && new Date(currentAssignment.endDate) <= dueSoonCutoff
        && new Date(currentAssignment.endDate) >= now
        && mongoose.Types.ObjectId.isValid(currentAssignment._id)
      ) {
        dueSoonAssignments.push({ assignment: currentAssignment, staff });
      }

      let progress = 0;
      if (currentAssignment?.startDate && currentAssignment?.endDate) {
        const start = new Date(currentAssignment.startDate).getTime();
        const end = new Date(currentAssignment.endDate).getTime();
        if (end > start) {
          progress = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
        }
      }

      const approvalStatus = approval?.adminDecision && approval.adminDecision !== 'PENDING'
        ? approval.adminDecision
        : (approval?.supervisorRecommendation && approval.supervisorRecommendation !== 'PENDING'
          ? approval.supervisorRecommendation
          : (legacyPlan?.approvals?.length ? mapLegacyApproval(legacyPlan.approvals[legacyPlan.approvals.length - 1].status) : 'PENDING'));

      const evidence = currentAssignment?.startDate
        ? await computeRotationEvidence({
          userId: staff._id,
          startDate: currentAssignment.startDate,
          endDate: currentAssignment.endDate
        })
        : {
          actualHours: null,
          expectedHours: null,
          attendanceRate: null,
          lateCount: null,
          missedClockOutCount: null,
          unresolvedCorrectionsCount: null
        };

      const dueSoon = Boolean(
        currentAssignment
        && currentAssignment.endDate
        && new Date(currentAssignment.endDate) <= dueSoonCutoff
        && new Date(currentAssignment.endDate) >= now
      );
      const approvalPending = Boolean(currentAssignment) && (
        approvalStatus === 'PENDING'
        || ['PENDING_REVIEW', 'PENDING_APPROVAL'].includes(normalizeAssignmentStatus(currentAssignment?.status))
      );
      const belowAttendance = evidence.attendanceRate !== null
        && Number(evidence.attendanceRate) < ROTATION_ATTENDANCE_THRESHOLD;
      const unresolvedCorrections = evidence.unresolvedCorrectionsCount !== null
        && Number(evidence.unresolvedCorrectionsCount) > 0;
      const actionNeeded = buildActionNeeded({
        dueSoon,
        approvalPending,
        belowAttendance,
        unresolvedCorrections,
        missingPlan: hasFallbackDepartment
      });

      const fallbackStatus = staff.department ? 'ACTIVE' : 'UPCOMING';

      return {
        userId: staff._id,
        name: `${staff.name} ${staff.surname}`.trim(),
        departmentName,
        status: normalizeAssignmentStatus(currentAssignment?.status || legacyPlan?.status || fallbackStatus),
        dueDate: currentAssignment?.endDate || null,
        progress,
        approvalStatus,
        attendanceRate: evidence.attendanceRate,
        actionNeeded: actionNeeded.actionNeeded,
        actionReasons: actionNeeded.actionReasons
      };
    }));

    if (dueSoonAssignments.length > 0) {
      const dueSoonIds = dueSoonAssignments.map((entry) => entry.assignment._id);
      const existingNotifications = await Notification.find({
        'data.actionType': 'ROTATION_DUE_SOON',
        'data.payload.assignmentId': { $in: dueSoonIds }
      })
        .select('data.payload.assignmentId')
        .lean();
      const existingMap = new Set(
        existingNotifications.map((entry) => entry?.data?.payload?.assignmentId?.toString()).filter(Boolean)
      );

      await Promise.all(
        dueSoonAssignments
          .filter((entry) => !existingMap.has(entry.assignment._id.toString()))
          .map((entry) => logAction(
            'ROTATION_DUE_SOON',
            {
              staffId: entry.staff._id,
              staffName: `${entry.staff.name} ${entry.staff.surname}`.trim(),
              role: entry.staff.role,
              hostCompanyId: entry.staff.hostCompanyId || null,
              departmentId: entry.assignment.departmentId,
              assignmentId: entry.assignment._id,
              dueDate: entry.assignment.endDate
            },
            actorId || null
          ))
      );
    }

    return res.json({ success: true, roster });
  } catch (error) {
    console.error('Error fetching rotation roster:', error);
    return res.status(500).json({ success: false, error: 'Failed to load rotation roster' });
  }
});

router.get('/users/:userId/timeline', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const { userRole, hostCompanyId, requesterId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['ADMIN', 'HOST_COMPANY', 'SUPERVISOR', 'INTERN', 'STAFF']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    const staff = await Staff.findById(userId).select('hostCompanyId').lean();
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    if (userRole === 'HOST_COMPANY') {
      if (!hostCompanyId) {
        return res.status(400).json({ success: false, error: 'hostCompanyId is required for Host Company users' });
      }
      if (!staff.hostCompanyId || staff.hostCompanyId.toString() !== hostCompanyId.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied for this user' });
      }
    }

    if (userRole === 'INTERN' || userRole === 'STAFF') {
      if (!requesterId || requesterId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied for this user' });
      }
    }

    if (userRole === 'SUPERVISOR') {
      const assignments = await RotationAssignment.find({ userId })
        .select('_id supervisorId')
        .lean();
      const isAssignedSupervisor = assignments.some((assignment) =>
        assignment.supervisorId && assignment.supervisorId.toString() === requesterId?.toString()
      );
      if (!isAssignedSupervisor) {
        return res.status(403).json({ success: false, error: 'Supervisor access denied for this user' });
      }
    }

    const timeline = await buildTimelinePayload(userId);
    if (!timeline) {
      return res.status(404).json({ success: false, error: 'Rotation data not found' });
    }

    return res.json({ success: true, ...timeline });
  } catch (error) {
    console.error('Error fetching rotation timeline:', error);
    return res.status(500).json({ success: false, error: 'Failed to load rotation timeline' });
  }
});

router.get('/users/:userId/dossier', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const { userRole, hostCompanyId, requesterId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['ADMIN', 'HOST_COMPANY', 'SUPERVISOR', 'INTERN', 'STAFF']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    const staff = await Staff.findById(userId).select('hostCompanyId').lean();
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    if (userRole === 'HOST_COMPANY') {
      if (!hostCompanyId) {
        return res.status(400).json({ success: false, error: 'hostCompanyId is required for Host Company users' });
      }
      if (!staff.hostCompanyId || staff.hostCompanyId.toString() !== hostCompanyId.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied for this user' });
      }
    }

    if ((userRole === 'INTERN' || userRole === 'STAFF') && requesterId && requesterId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied for this user' });
    }

    const dossier = await buildDossierPayload(userId);
    if (!dossier) {
      return res.status(404).json({ success: false, error: 'Rotation dossier not found' });
    }

    return res.json({ success: true, ...dossier });
  } catch (error) {
    console.error('Error fetching rotation dossier:', error);
    return res.status(500).json({ success: false, error: 'Failed to load rotation dossier' });
  }
});

router.post('/users/:userId/plan', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const { userRole, hostCompanyId, actorId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['ADMIN', 'HOST_COMPANY']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    if (userRole === 'HOST_COMPANY' && !hostCompanyId) {
      return res.status(400).json({ success: false, error: 'hostCompanyId is required for Host Company users' });
    }

    const staff = await Staff.findById(userId).select('hostCompanyId name surname role').lean();
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    if (hostCompanyId && staff.hostCompanyId && staff.hostCompanyId.toString() !== hostCompanyId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied for this user' });
    }

    const scheduleRows = Array.isArray(req.body.scheduleRows) ? req.body.scheduleRows : [];
    if (scheduleRows.length === 0) {
      return res.status(400).json({ success: false, error: 'scheduleRows must include at least one department row' });
    }

    const rotationPath = Array.isArray(req.body.rotationPath) && req.body.rotationPath.length > 0
      ? req.body.rotationPath
      : scheduleRows.map((row) => row.departmentId);

    const uniqueDeptIds = Array.from(new Set(rotationPath.map((id) => id?.toString()).filter(Boolean)));
    if (uniqueDeptIds.length === 0) {
      return res.status(400).json({ success: false, error: 'rotationPath must include at least one departmentId' });
    }

    const departments = await Department.find({ _id: { $in: uniqueDeptIds } })
      .select('_id hostCompanyId name')
      .lean();
    if (departments.length !== uniqueDeptIds.length) {
      return res.status(400).json({ success: false, error: 'One or more departments are invalid' });
    }
    if (hostCompanyId) {
      const outOfScope = departments.find((dept) => dept.hostCompanyId && dept.hostCompanyId.toString() !== hostCompanyId.toString());
      if (outOfScope) {
        return res.status(403).json({ success: false, error: 'Department not in host company scope' });
      }
    }

    const planStart = scheduleRows[0]?.startDate ? new Date(scheduleRows[0].startDate) : new Date();
    const normalizedRows = normalizeScheduleRows(scheduleRows, planStart);
    const invalidRow = normalizedRows.find((row) => !row.departmentId || !mongoose.Types.ObjectId.isValid(row.departmentId));
    if (invalidRow) {
      return res.status(400).json({ success: false, error: 'All schedule rows must include valid departmentId values' });
    }

    const hasOverlap = validateAssignmentsOverlap(normalizedRows);
    if (!hasOverlap) {
      return res.status(400).json({ success: false, error: 'Schedule rows overlap. Please adjust dates.' });
    }

    const existingPlan = await RotationPlan.findOne({ userId }).lean();
    const activeAssignment = await RotationAssignment.findOne({ userId, status: 'ACTIVE' }).lean();
    if (activeAssignment && normalizedRows[0]?.departmentId?.toString() !== activeAssignment.departmentId?.toString()) {
      return res.status(409).json({ success: false, error: 'Active rotation exists. Complete or regress it before re-planning.' });
    }

    const plan = await RotationPlan.findOneAndUpdate(
      { userId },
      {
        userId,
        hostCompanyId: staff.hostCompanyId || hostCompanyId || null,
        rotationPath: uniqueDeptIds,
        status: 'ACTIVE',
        startDate: normalizedRows[0]?.startDate || planStart,
        endDate: normalizedRows[normalizedRows.length - 1]?.endDate || null
      },
      { upsert: true, new: true }
    );

    await RotationAssignment.deleteMany({
      userId,
      status: { $in: ['UPCOMING', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'REGRESS', 'DECLINED'] }
    });

    const createdAssignments = [];
    for (let i = 0; i < normalizedRows.length; i += 1) {
      const row = normalizedRows[i];
      const isFirst = i === 0;
      const assignmentStatus = isFirst ? 'ACTIVE' : 'UPCOMING';

      if (isFirst && activeAssignment) {
        const updated = await RotationAssignment.findByIdAndUpdate(
          activeAssignment._id,
          {
            planId: plan._id,
            departmentId: row.departmentId,
            startDate: row.startDate,
            endDate: row.endDate,
            durationType: row.durationType,
            durationValue: row.durationValue,
            supervisorId: row.supervisorId || activeAssignment.supervisorId || null,
            status: 'ACTIVE',
            notes: row.notes || activeAssignment.notes || null
          },
          { new: true }
        );
        createdAssignments.push(updated);
        continue;
      }

      const assignment = new RotationAssignment({
        planId: plan._id,
        userId,
        hostCompanyId: staff.hostCompanyId || hostCompanyId || null,
        departmentId: row.departmentId,
        startDate: row.startDate,
        endDate: row.endDate,
        durationType: row.durationType,
        durationValue: row.durationValue,
        supervisorId: row.supervisorId || null,
        status: assignmentStatus,
        notes: row.notes || null,
        reviewDate: row.reviewDate || null
      });
      await assignment.save();
      createdAssignments.push(assignment);
    }

    const activeAssignmentEntry = createdAssignments.find((entry) => entry?.status === 'ACTIVE');
    if (activeAssignmentEntry) {
      await updateStaffDepartment({
        userId,
        departmentId: activeAssignmentEntry.departmentId
      });
    }

    const actionType = existingPlan ? 'ROTATION_PLAN_UPDATED' : 'ROTATION_PLAN_CREATED';
    await logAction(
      actionType,
      {
        staffId: staff._id,
        staffName: `${staff.name} ${staff.surname}`.trim(),
        role: staff.role,
        hostCompanyId: staff.hostCompanyId || hostCompanyId || null,
        planId: plan._id
      },
      actorId || null
    );

    const dossier = await buildDossierPayload(userId);
    return res.status(201).json({ success: true, plan, assignments: createdAssignments, dossier });
  } catch (error) {
    console.error('Error creating rotation plan:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create rotation plan' });
  }
});

router.post('/users/:userId/assign', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const { userRole, hostCompanyId, actorId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['ADMIN', 'HOST_COMPANY']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    const {
      rotationPath = [],
      assignments = [],
      startDate,
      endDate,
      supervisorId
    } = req.body;

    if (!Array.isArray(rotationPath) || rotationPath.length === 0) {
      return res.status(400).json({ success: false, error: 'rotationPath must include at least one departmentId' });
    }

    const staff = await Staff.findById(userId).select('hostCompanyId role name surname').lean();
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    if (userRole === 'HOST_COMPANY') {
      if (!hostCompanyId) {
        return res.status(400).json({ success: false, error: 'hostCompanyId is required for Host Company users' });
      }
      if (!staff.hostCompanyId || staff.hostCompanyId.toString() !== hostCompanyId.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied for this user' });
      }
    }

    const uniqueDeptIds = Array.from(new Set(rotationPath.map((id) => id.toString())));
    const departments = await Department.find({ _id: { $in: uniqueDeptIds } })
      .select('_id')
      .lean();
    if (departments.length !== uniqueDeptIds.length) {
      return res.status(400).json({ success: false, error: 'One or more departmentIds are invalid' });
    }

    const normalizedAssignments = [];
    if (Array.isArray(assignments) && assignments.length > 0) {
      assignments.forEach((assignment, index) => {
        if (!assignment.departmentId || !assignment.startDate || !assignment.endDate) {
          throw new Error('Each assignment requires departmentId, startDate, and endDate');
        }
        const start = new Date(assignment.startDate);
        const end = new Date(assignment.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
          throw new Error('Invalid assignment date range');
        }
        normalizedAssignments.push({
          userId,
          hostCompanyId: staff.hostCompanyId || null,
          departmentId: assignment.departmentId,
          startDate: start,
          endDate: end,
          supervisorId: assignment.supervisorId || supervisorId || null,
          status: index === 0 ? 'ACTIVE' : 'UPCOMING'
        });
      });
    } else {
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, error: 'startDate and endDate are required when assignments are not provided' });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return res.status(400).json({ success: false, error: 'Invalid assignment date range' });
      }
      normalizedAssignments.push({
        userId,
        hostCompanyId: staff.hostCompanyId || null,
        departmentId: rotationPath[0],
        startDate: start,
        endDate: end,
        supervisorId: supervisorId || null,
        status: 'ACTIVE'
      });
    }

    if (!validateAssignmentsOverlap(normalizedAssignments)) {
      return res.status(400).json({ success: false, error: 'Assignments contain overlapping date ranges' });
    }

    const existingAssignments = await RotationAssignment.find({ userId }).lean();
    for (const newAssignment of normalizedAssignments) {
      const overlaps = existingAssignments.some((existing) => {
        const existingStart = new Date(existing.startDate);
        const existingEnd = new Date(existing.endDate);
        return newAssignment.startDate <= existingEnd && newAssignment.endDate >= existingStart;
      });
      if (overlaps) {
        return res.status(400).json({ success: false, error: 'New assignments overlap with existing rotations' });
      }
    }

    const plan = await RotationPlan.findOneAndUpdate(
      { userId },
      {
        userId,
        hostCompanyId: staff.hostCompanyId || null,
        rotationPath,
        status: 'ACTIVE',
        startDate: normalizedAssignments[0]?.startDate || null,
        endDate: normalizedAssignments[normalizedAssignments.length - 1]?.endDate || null
      },
      { upsert: true, new: true }
    );

    normalizedAssignments.forEach((assignment) => {
      assignment.planId = plan._id;
    });

    const createdAssignments = await RotationAssignment.insertMany(normalizedAssignments);
    const activeAssignment = createdAssignments.find((entry) => entry?.status === 'ACTIVE');
    if (activeAssignment) {
      await updateStaffDepartment({
        userId,
        departmentId: activeAssignment.departmentId
      });
    }

    await logAction(
      'ROTATION_DEPARTMENT_CHANGED',
      {
        staffId: staff._id,
        staffName: `${staff.name} ${staff.surname}`.trim(),
        role: staff.role,
        hostCompanyId: staff.hostCompanyId || null,
        departmentId: normalizedAssignments[0].departmentId,
        assignmentId: createdAssignments[0]._id
      },
      actorId || null
    );

    const timeline = await buildTimelinePayload(userId);
    return res.status(201).json({ success: true, assignments: createdAssignments, timeline });
  } catch (error) {
    console.error('Error assigning rotation plan:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to create rotation assignments'
    });
  }
});

router.post('/assignments/:assignmentId/evaluate', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ success: false, error: 'Invalid assignment ID' });
    }

    const { userRole, hostCompanyId, actorId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['SUPERVISOR', 'ADMIN', 'HOST_COMPANY']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    const { supervisorId, supervisorRecommendation, supervisorNotes } = req.body;
    if (!supervisorId || !mongoose.Types.ObjectId.isValid(supervisorId)) {
      return res.status(400).json({ success: false, error: 'supervisorId is required' });
    }

    const assignment = await RotationAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    if (userRole === 'HOST_COMPANY') {
      if (!hostCompanyId) {
        return res.status(400).json({ success: false, error: 'hostCompanyId is required for Host Company users' });
      }
      if (!assignment.hostCompanyId || assignment.hostCompanyId.toString() !== hostCompanyId.toString()) {
        return res.status(403).json({ success: false, error: 'Access denied for this assignment' });
      }
    }

    if (assignment.supervisorId && assignment.supervisorId.toString() !== supervisorId.toString()) {
      return res.status(403).json({ success: false, error: 'Supervisor is not assigned to this rotation' });
    }

    const supervisor = await Staff.findById(supervisorId).select('hostCompanyId role').lean();
    if (!supervisor) {
      return res.status(404).json({ success: false, error: 'Supervisor not found' });
    }

    if (assignment.hostCompanyId && supervisor.hostCompanyId && assignment.hostCompanyId.toString() !== supervisor.hostCompanyId.toString()) {
      return res.status(403).json({ success: false, error: 'Supervisor not in same host company' });
    }

    assignment.supervisorId = supervisorId;
    assignment.status = 'PENDING_REVIEW';
    await assignment.save();

    const approval = await RotationApproval.findOneAndUpdate(
      { assignmentId },
      {
        assignmentId,
        supervisorRecommendation: supervisorRecommendation || 'PENDING',
        supervisorNotes: supervisorNotes || '',
        supervisorAt: new Date(),
        supervisorId
      },
      { upsert: true, new: true }
    );

    const staff = await Staff.findById(assignment.userId).select('name surname role hostCompanyId').lean();
    if (staff) {
      await logAction(
        'ROTATION_EVALUATION_SUBMITTED',
        {
          staffId: staff._id,
          staffName: `${staff.name} ${staff.surname}`.trim(),
          role: staff.role,
          hostCompanyId: staff.hostCompanyId || null,
          departmentId: assignment.departmentId,
          assignmentId: assignment._id
        },
        actorId || supervisorId
      );

      await logAction(
        'ROTATION_APPROVAL_PENDING',
        {
          staffId: staff._id,
          staffName: `${staff.name} ${staff.surname}`.trim(),
          role: staff.role,
          hostCompanyId: staff.hostCompanyId || null,
          departmentId: assignment.departmentId,
          assignmentId: assignment._id
        },
        actorId || supervisorId
      );
    }

    return res.json({ success: true, approval });
  } catch (error) {
    console.error('Error submitting rotation evaluation:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit evaluation' });
  }
});

router.patch('/assignments/:assignmentId/status', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ success: false, error: 'Invalid assignment ID' });
    }

    const { userRole, hostCompanyId, actorId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['ADMIN', 'HOST_COMPANY']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    const decision = String(req.body.decision || '').toUpperCase();
    if (!['COMPLETED', 'REGRESS', 'DECLINED'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Invalid decision type' });
    }

    const notes = String(req.body.notes || '').trim();
    const overrideFlag = Boolean(req.body.overrideFlag);
    const reviewDateInput = req.body.reviewDate ? new Date(req.body.reviewDate) : null;
    const endDateInput = req.body.endDate ? new Date(req.body.endDate) : null;

    const assignment = await RotationAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    if (hostCompanyId && assignment.hostCompanyId && assignment.hostCompanyId.toString() !== hostCompanyId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied for this assignment' });
    }

    if (['REGRESS', 'DECLINED'].includes(decision) && !notes) {
      return res.status(400).json({ success: false, error: 'Notes are required for this decision' });
    }

    const [staffRecord, departmentRecord] = await Promise.all([
      Staff.findById(assignment.userId)
        .select('name surname role hostCompanyId department')
        .lean(),
      assignment.departmentId
        ? Department.findById(assignment.departmentId).select('name').lean()
        : Promise.resolve(null)
    ]);

    const staffName = staffRecord ? `${staffRecord.name} ${staffRecord.surname}`.trim() : null;
    const staffRole = staffRecord?.role || null;
    const resolvedHostCompanyId = assignment.hostCompanyId || staffRecord?.hostCompanyId || null;
    const departmentName = departmentRecord?.name || staffRecord?.department || null;
    const baseLogPayload = {
      staffId: assignment.userId,
      staffName: staffName || undefined,
      role: staffRole || undefined,
      hostCompanyId: resolvedHostCompanyId,
      assignmentId: assignment._id,
      departmentId: assignment.departmentId,
      departmentName: departmentName || undefined
    };

    const evidence = await computeRotationEvidence({
      userId: assignment.userId,
      startDate: assignment.startDate,
      endDate: assignment.endDate || new Date()
    });

    const evidenceFailed = Number(evidence.attendanceRate || 0) < ROTATION_ATTENDANCE_THRESHOLD
      || Number(evidence.unresolvedCorrectionsCount || 0) > 0;

    if (decision === 'COMPLETED' && evidenceFailed && (!overrideFlag || !notes)) {
      await logAction(
        'ROTATION_EVIDENCE_FAILED',
        {
          ...baseLogPayload,
          attendanceRate: evidence.attendanceRate,
          unresolvedCorrectionsCount: evidence.unresolvedCorrectionsCount
        },
        actorId || null
      );
      return res.status(409).json({
        success: false,
        error: 'Evidence requirements not met. Override requires notes and acknowledgement.'
      });
    }

    if (decision === 'COMPLETED' && evidenceFailed) {
      await logAction(
        'ROTATION_EVIDENCE_FAILED',
        {
          ...baseLogPayload,
          attendanceRate: evidence.attendanceRate,
          unresolvedCorrectionsCount: evidence.unresolvedCorrectionsCount,
          overrideFlag: true
        },
        actorId || null
      );
    }

    const decisionRecord = new RotationDecision({
      assignmentId: assignment._id,
      decisionType: decision,
      notes,
      overrideFlag,
      actorId: actorId || null,
      decidedAt: new Date()
    });
    await decisionRecord.save();

    if (decision === 'REGRESS') {
      assignment.status = 'REGRESS';
      if (endDateInput && !Number.isNaN(endDateInput.getTime())) {
        assignment.endDate = endDateInput;
      }
      if (reviewDateInput && !Number.isNaN(reviewDateInput.getTime())) {
        assignment.reviewDate = reviewDateInput;
      } else if (assignment.endDate) {
        const review = new Date(assignment.endDate);
        review.setDate(review.getDate() + 7);
        assignment.reviewDate = review;
      }
      assignment.notes = notes;
      await assignment.save();

      await logAction(
        'ROTATION_REGRESSED',
        {
          ...baseLogPayload
        },
        actorId || null
      );

      const dossier = await buildDossierPayload(assignment.userId);
      return res.json({ success: true, assignment, decision: decisionRecord, dossier });
    }

    if (decision === 'DECLINED') {
      assignment.status = 'DECLINED';
      assignment.notes = notes;
      await assignment.save();

      await RotationPlan.findOneAndUpdate(
        { userId: assignment.userId },
        { status: 'REQUIRES_ACTION' }
      );

      await logAction(
        'ROTATION_DECLINED',
        {
          ...baseLogPayload
        },
        actorId || null
      );

      const dossier = await buildDossierPayload(assignment.userId);
      return res.json({ success: true, assignment, decision: decisionRecord, dossier });
    }

    // COMPLETED
    assignment.status = 'COMPLETED';
    assignment.notes = notes || assignment.notes;
    await assignment.save();

    await RotationHistory.create({
      userId: assignment.userId,
      hostCompanyId: assignment.hostCompanyId || null,
      departmentId: assignment.departmentId,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      evaluationSummary: notes || '',
      outcome: 'COMPLETED',
      supervisorId: assignment.supervisorId || null,
      adminId: actorId || null,
      decidedAt: new Date()
    });

    const nextAssignment = await RotationAssignment.findOne({
      userId: assignment.userId,
      status: 'UPCOMING'
    }).sort({ startDate: 1 });

    if (nextAssignment) {
      nextAssignment.status = 'ACTIVE';
      await nextAssignment.save();

      const nextDepartmentName = await updateStaffDepartment({
        userId: assignment.userId,
        departmentId: nextAssignment.departmentId
      });

      await logAction(
        'ROTATION_DEPARTMENT_CHANGED',
        {
          ...baseLogPayload,
          assignmentId: nextAssignment._id,
          departmentId: nextAssignment.departmentId,
          departmentName: nextDepartmentName || undefined
        },
        actorId || null
      );
    } else {
      await RotationPlan.findOneAndUpdate(
        { userId: assignment.userId },
        { status: 'COMPLETED' }
      );
    }

    await logAction(
      'ROTATION_COMPLETED',
      {
        ...baseLogPayload
      },
      actorId || null
    );

    const dossier = await buildDossierPayload(assignment.userId);
    return res.json({ success: true, assignment, decision: decisionRecord, dossier });
  } catch (error) {
    console.error('Error updating rotation assignment status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update rotation assignment status' });
  }
});

router.post('/assignments/:assignmentId/decide', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ success: false, error: 'Invalid assignment ID' });
    }

    const { userRole, hostCompanyId, actorId } = getRoleContext(req);
    const roleCheck = requireRole(userRole, ['ADMIN']);
    if (!roleCheck.ok) {
      return res.status(403).json({ success: false, error: roleCheck.error });
    }

    const { adminDecision, adminNotes, adminId, nextAssignment } = req.body;
    if (!adminDecision || !['APPROVE', 'REJECT'].includes(adminDecision)) {
      return res.status(400).json({ success: false, error: 'adminDecision must be APPROVE or REJECT' });
    }

    const assignment = await RotationAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    if (hostCompanyId && assignment.hostCompanyId && assignment.hostCompanyId.toString() !== hostCompanyId.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied for this assignment' });
    }

    const approval = await RotationApproval.findOneAndUpdate(
      { assignmentId },
      {
        assignmentId,
        adminDecision,
        adminNotes: adminNotes || '',
        adminAt: new Date(),
        adminId: adminId || actorId || null
      },
      { upsert: true, new: true }
    );

    const staff = await Staff.findById(assignment.userId).select('name surname role hostCompanyId').lean();

    if (adminDecision === 'APPROVE') {
      assignment.status = 'COMPLETED';
      await assignment.save();

      const existingHistory = await RotationHistory.findOne({
        userId: assignment.userId,
        departmentId: assignment.departmentId,
        startDate: assignment.startDate,
        endDate: assignment.endDate
      }).lean();

      if (!existingHistory) {
        await RotationHistory.create({
          userId: assignment.userId,
          hostCompanyId: assignment.hostCompanyId || null,
          departmentId: assignment.departmentId,
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          evaluationSummary: adminNotes || '',
          outcome: 'COMPLETED',
          supervisorId: approval.supervisorId || null,
          adminId: adminId || actorId || null
        });
      }

      const plan = await RotationPlan.findOne({ userId: assignment.userId }).lean();
      const currentIndex = plan?.rotationPath
        ? plan.rotationPath.findIndex((deptId) => deptId.toString() === assignment.departmentId.toString())
        : -1;
      const nextDepartmentId = currentIndex >= 0 && plan?.rotationPath
        ? plan.rotationPath[currentIndex + 1]
        : null;

      if (nextDepartmentId) {
        let nextEntry = await RotationAssignment.findOne({
          userId: assignment.userId,
          departmentId: nextDepartmentId,
          status: 'UPCOMING'
        });

        if (!nextEntry && nextAssignment) {
          if (!nextAssignment.startDate || !nextAssignment.endDate) {
            return res.status(400).json({ success: false, error: 'nextAssignment requires startDate and endDate' });
          }
          const nextStart = new Date(nextAssignment.startDate);
          const nextEnd = new Date(nextAssignment.endDate);
          if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd < nextStart) {
            return res.status(400).json({ success: false, error: 'Invalid nextAssignment date range' });
          }
          nextEntry = await RotationAssignment.create({
            userId: assignment.userId,
            hostCompanyId: assignment.hostCompanyId || null,
            departmentId: nextDepartmentId,
            startDate: nextStart,
            endDate: nextEnd,
            supervisorId: nextAssignment.supervisorId || null,
            status: 'ACTIVE'
          });
        } else if (nextEntry) {
          nextEntry.status = 'ACTIVE';
          await nextEntry.save();
        } else {
          return res.status(400).json({ success: false, error: 'Next assignment not found or provided' });
        }

        await RotationPlan.findOneAndUpdate(
          { userId: assignment.userId },
          {
            status: 'ACTIVE',
            startDate: nextEntry.startDate,
            endDate: nextEntry.endDate
          }
        );

        await updateStaffDepartment({
          userId: assignment.userId,
          departmentId: nextEntry.departmentId
        });

        if (staff) {
          await logAction(
            'ROTATION_DEPARTMENT_CHANGED',
            {
              staffId: staff._id,
              staffName: `${staff.name} ${staff.surname}`.trim(),
              role: staff.role,
              hostCompanyId: staff.hostCompanyId || null,
              departmentId: nextEntry.departmentId,
              assignmentId: nextEntry._id
            },
            actorId || adminId || null
          );
        }
      } else {
        await RotationPlan.findOneAndUpdate(
          { userId: assignment.userId },
          { status: 'COMPLETED' }
        );
      }

      if (staff) {
        await logAction(
          'ROTATION_APPROVED',
          {
            staffId: staff._id,
            staffName: `${staff.name} ${staff.surname}`.trim(),
            role: staff.role,
            hostCompanyId: staff.hostCompanyId || null,
            departmentId: assignment.departmentId,
            assignmentId: assignment._id
          },
          actorId || adminId || null
        );
      }
    } else {
      assignment.status = 'PENDING_APPROVAL';
      await assignment.save();

      if (staff) {
        await logAction(
          'ROTATION_DENIED',
          {
            staffId: staff._id,
            staffName: `${staff.name} ${staff.surname}`.trim(),
            role: staff.role,
            hostCompanyId: staff.hostCompanyId || null,
            departmentId: assignment.departmentId,
            assignmentId: assignment._id
          },
          actorId || adminId || null
        );
      }
    }

    const timeline = await buildTimelinePayload(assignment.userId);
    return res.json({ success: true, approval, timeline });
  } catch (error) {
    console.error('Error processing rotation decision:', error);
    return res.status(500).json({ success: false, error: 'Failed to process decision' });
  }
});

module.exports = router;
