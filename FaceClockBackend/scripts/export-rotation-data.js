#!/usr/bin/env node

/**
 * Export rotation data for all Intern/Staff users into a JSON report.
 *
 * Usage:
 *   node scripts/export-rotation-data.js
 *   node scripts/export-rotation-data.js --active-only
 *   node scripts/export-rotation-data.js --host-company-id <id>
 *   node scripts/export-rotation-data.js --output <path>
 *   node scripts/export-rotation-data.js --limit <number>
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Staff = require('../models/Staff');
const RotationPlan = require('../models/RotationPlan');
const RotationAssignment = require('../models/RotationAssignment');
const RotationHistory = require('../models/RotationHistory');
const RotationApproval = require('../models/RotationApproval');
const RotationDecision = require('../models/RotationDecision');
const Department = require('../models/Department');
const HostCompany = require('../models/HostCompany');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return index + 1 < args.length ? args[index + 1] : null;
};

const activeOnly = hasFlag('--active-only');
const hostCompanyId =
  getArgValue('--host-company-id') ||
  getArgValue('--hostCompanyId');
const outputPathArg = getArgValue('--output');
const limitArg = getArgValue('--limit');
const limit = Number.isFinite(Number(limitArg)) ? Number(limitArg) : null;

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI not found in .env');
  process.exit(1);
}

const mongoOptions = {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  w: 'majority'
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

const validateAssignmentsOverlap = (assignments) => {
  const normalized = assignments
    .filter((entry) => entry.startDate && entry.endDate)
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

const resolveDepartmentName = (departmentMap, departmentId) => {
  if (!departmentId) return null;
  const key = departmentId.toString();
  return departmentMap[key]?.name || null;
};

const main = async () => {
  let connectionOpen = false;
  try {
    await mongoose.connect(MONGO_URI, mongoOptions);
    connectionOpen = true;

    const staffFilter = { role: { $in: ['Intern', 'Staff'] } };
    if (activeOnly) staffFilter.isActive = true;
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        console.error('ERROR: Invalid host company id');
        process.exit(1);
      }
      staffFilter.hostCompanyId = hostCompanyId;
    }

    let staffQuery = Staff.find(staffFilter)
      .select('name surname idNumber role department hostCompanyId rotationPlan createdAt isActive')
      .sort({ name: 1, surname: 1 })
      .lean();
    if (limit) {
      staffQuery = staffQuery.limit(limit);
    }

    const staffList = await staffQuery;
    if (staffList.length === 0) {
      console.log('No staff records matched the filter.');
      return;
    }

    const staffIds = staffList.map((staff) => staff._id);

    const [plans, assignments, history] = await Promise.all([
      RotationPlan.find({ userId: { $in: staffIds } }).lean(),
      RotationAssignment.find({ userId: { $in: staffIds } }).lean(),
      RotationHistory.find({ userId: { $in: staffIds } }).lean()
    ]);

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const [approvals, decisions] = await Promise.all([
      assignmentIds.length
        ? RotationApproval.find({ assignmentId: { $in: assignmentIds } }).lean()
        : [],
      assignmentIds.length
        ? RotationDecision.find({ assignmentId: { $in: assignmentIds } }).lean()
        : []
    ]);

    const departmentIds = new Set();
    plans.forEach((plan) => {
      (plan.rotationPath || []).forEach((deptId) => {
        if (deptId) departmentIds.add(deptId.toString());
      });
    });
    assignments.forEach((assignment) => {
      if (assignment.departmentId) departmentIds.add(assignment.departmentId.toString());
    });
    history.forEach((entry) => {
      if (entry.departmentId) departmentIds.add(entry.departmentId.toString());
    });
    staffList.forEach((staff) => {
      const legacyPlan = staff.rotationPlan || null;
      if (legacyPlan?.currentDepartment?.departmentId) {
        departmentIds.add(legacyPlan.currentDepartment.departmentId.toString());
      }
      if (Array.isArray(legacyPlan?.history)) {
        legacyPlan.history.forEach((entry) => {
          if (entry.departmentId) departmentIds.add(entry.departmentId.toString());
        });
      }
    });

    const departments = departmentIds.size
      ? await Department.find({ _id: { $in: Array.from(departmentIds) } })
        .select('_id name departmentCode hostCompanyId companyName')
        .lean()
      : [];
    const departmentMap = {};
    departments.forEach((dept) => {
      departmentMap[dept._id.toString()] = dept;
    });

    const hostCompanyIds = new Set();
    staffList.forEach((staff) => {
      if (staff.hostCompanyId) hostCompanyIds.add(staff.hostCompanyId.toString());
    });
    plans.forEach((plan) => {
      if (plan.hostCompanyId) hostCompanyIds.add(plan.hostCompanyId.toString());
    });
    assignments.forEach((assignment) => {
      if (assignment.hostCompanyId) hostCompanyIds.add(assignment.hostCompanyId.toString());
    });

    const hostCompanies = hostCompanyIds.size
      ? await HostCompany.find({ _id: { $in: Array.from(hostCompanyIds) } })
        .select('_id name companyName')
        .lean()
      : [];
    const hostCompanyMap = {};
    hostCompanies.forEach((company) => {
      hostCompanyMap[company._id.toString()] = company;
    });

    const reviewerIds = new Set();
    assignments.forEach((assignment) => {
      if (assignment.supervisorId) reviewerIds.add(assignment.supervisorId.toString());
    });
    history.forEach((entry) => {
      if (entry.supervisorId) reviewerIds.add(entry.supervisorId.toString());
      if (entry.adminId) reviewerIds.add(entry.adminId.toString());
    });
    approvals.forEach((approval) => {
      if (approval.supervisorId) reviewerIds.add(approval.supervisorId.toString());
      if (approval.adminId) reviewerIds.add(approval.adminId.toString());
    });
    decisions.forEach((decision) => {
      if (decision.actorId) reviewerIds.add(decision.actorId.toString());
    });

    const reviewerStaff = reviewerIds.size
      ? await Staff.find({ _id: { $in: Array.from(reviewerIds) } })
        .select('_id name surname')
        .lean()
      : [];
    const staffNameMap = {};
    reviewerStaff.forEach((staff) => {
      staffNameMap[staff._id.toString()] = `${staff.name} ${staff.surname}`.trim();
    });

    const plansByUser = new Map();
    plans.forEach((plan) => {
      plansByUser.set(plan.userId.toString(), plan);
    });
    const assignmentsByUser = new Map();
    assignments.forEach((assignment) => {
      const key = assignment.userId.toString();
      if (!assignmentsByUser.has(key)) assignmentsByUser.set(key, []);
      assignmentsByUser.get(key).push(assignment);
    });
    const historyByUser = new Map();
    history.forEach((entry) => {
      const key = entry.userId.toString();
      if (!historyByUser.has(key)) historyByUser.set(key, []);
      historyByUser.get(key).push(entry);
    });

    const approvalsByAssignment = new Map();
    approvals.forEach((approval) => {
      const key = approval.assignmentId.toString();
      if (!approvalsByAssignment.has(key)) approvalsByAssignment.set(key, []);
      approvalsByAssignment.get(key).push(approval);
    });

    const decisionsByAssignment = new Map();
    decisions.forEach((decision) => {
      const key = decision.assignmentId.toString();
      if (!decisionsByAssignment.has(key)) decisionsByAssignment.set(key, []);
      decisionsByAssignment.get(key).push(decision);
    });

    const reportRows = [];
    const issueRows = [];
    const now = new Date();

    staffList.forEach((staff) => {
      const staffId = staff._id.toString();
      const plan = plansByUser.get(staffId) || null;
      const staffAssignments = assignmentsByUser.get(staffId) || [];
      const staffHistory = historyByUser.get(staffId) || [];
      const legacyPlan = staff.rotationPlan || null;

      const planRotationPath = (plan?.rotationPath || []).map((deptId) => ({
        departmentId: deptId,
        departmentName: resolveDepartmentName(departmentMap, deptId)
      }));

      const assignmentsOut = staffAssignments
        .slice()
        .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0))
        .map((assignment) => {
          const assignmentId = assignment._id.toString();
          const approvalEntries = (approvalsByAssignment.get(assignmentId) || []).map((entry) => ({
            ...entry,
            supervisorName: entry.supervisorId ? staffNameMap[entry.supervisorId.toString()] || null : null,
            adminName: entry.adminId ? staffNameMap[entry.adminId.toString()] || null : null
          }));
          const decisionEntries = (decisionsByAssignment.get(assignmentId) || []).map((entry) => ({
            ...entry,
            actorName: entry.actorId ? staffNameMap[entry.actorId.toString()] || null : null
          }));

          return {
            ...assignment,
            departmentName: resolveDepartmentName(departmentMap, assignment.departmentId),
            supervisorName: assignment.supervisorId ? staffNameMap[assignment.supervisorId.toString()] || null : null,
            approvals: approvalEntries,
            decisions: decisionEntries
          };
        });

      const historyOut = staffHistory
        .slice()
        .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0))
        .map((entry) => ({
          ...entry,
          departmentName: resolveDepartmentName(departmentMap, entry.departmentId),
          supervisorName: entry.supervisorId ? staffNameMap[entry.supervisorId.toString()] || null : null,
          adminName: entry.adminId ? staffNameMap[entry.adminId.toString()] || null : null
        }));

      const legacyOut = legacyPlan
        ? {
          ...legacyPlan,
          currentDepartment: legacyPlan.currentDepartment
            ? {
              ...legacyPlan.currentDepartment,
              departmentName:
                legacyPlan.currentDepartment.departmentName ||
                resolveDepartmentName(departmentMap, legacyPlan.currentDepartment.departmentId)
            }
            : null,
          history: Array.isArray(legacyPlan.history)
            ? legacyPlan.history.map((entry) => ({
              ...entry,
              departmentName:
                entry.departmentName ||
                resolveDepartmentName(departmentMap, entry.departmentId)
            }))
            : []
        }
        : null;

      const issues = [];
      const planExists = Boolean(plan);
      const legacyExists = Boolean(legacyPlan && (legacyPlan.currentDepartment || legacyPlan.history?.length));
      if (!planExists && !legacyExists) {
        issues.push({ code: 'MISSING_ROTATION_PLAN', detail: 'No RotationPlan or legacy plan found' });
      }
      if (planExists && (!plan.rotationPath || plan.rotationPath.length === 0)) {
        issues.push({ code: 'EMPTY_ROTATION_PATH', detail: 'Rotation plan has no departments' });
      }
      if (staffAssignments.length === 0 && planExists) {
        issues.push({ code: 'NO_ASSIGNMENTS', detail: 'Rotation plan exists but no assignments found' });
      }
      if (staffAssignments.length > 0 && !planExists && !legacyExists) {
        issues.push({ code: 'ASSIGNMENTS_WITHOUT_PLAN', detail: 'Assignments exist without plan' });
      }

      const assignmentDateIssues = staffAssignments.filter((assignment) => {
        if (!assignment.startDate || !assignment.endDate) return true;
        const start = new Date(assignment.startDate);
        const end = new Date(assignment.endDate);
        return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start;
      });
      if (assignmentDateIssues.length > 0) {
        issues.push({
          code: 'INVALID_ASSIGNMENT_DATES',
          detail: `Assignments with invalid date ranges: ${assignmentDateIssues.length}`
        });
      }

      if (!validateAssignmentsOverlap(staffAssignments)) {
        issues.push({ code: 'ASSIGNMENT_OVERLAP', detail: 'Assignment date ranges overlap' });
      }

      const activeAssignments = staffAssignments.filter((assignment) => assignment.status === 'ACTIVE');
      if (activeAssignments.length > 1) {
        issues.push({ code: 'MULTIPLE_ACTIVE_ASSIGNMENTS', detail: `Active assignments: ${activeAssignments.length}` });
      }
      activeAssignments.forEach((assignment) => {
        const endDate = assignment.endDate ? new Date(assignment.endDate) : null;
        if (endDate && endDate < now) {
          issues.push({
            code: 'ACTIVE_ASSIGNMENT_ENDED',
            detail: `Active assignment ${assignment._id} ends in the past`
          });
        }
      });

      if (planExists && plan.rotationPath?.length) {
        const planDeptIds = new Set(plan.rotationPath.map((deptId) => deptId.toString()));
        const assignmentsOutsidePlan = staffAssignments.filter((assignment) => {
          if (!assignment.departmentId) return true;
          return !planDeptIds.has(assignment.departmentId.toString());
        });
        if (assignmentsOutsidePlan.length > 0) {
          issues.push({
            code: 'ASSIGNMENT_NOT_IN_ROTATION_PATH',
            detail: `Assignments outside rotation path: ${assignmentsOutsidePlan.length}`
          });
        }
        const earliestAssignment = staffAssignments
          .slice()
          .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0))[0];
        if (earliestAssignment && earliestAssignment.departmentId) {
          const firstPlanId = plan.rotationPath[0]?.toString();
          const firstAssignmentId = earliestAssignment.departmentId.toString();
          if (firstPlanId && firstAssignmentId !== firstPlanId) {
            issues.push({
              code: 'FIRST_ASSIGNMENT_MISMATCH',
              detail: 'First assignment department does not match rotation plan start'
            });
          }
        }
      }

      if (planExists && staff.hostCompanyId && plan.hostCompanyId) {
        if (staff.hostCompanyId.toString() !== plan.hostCompanyId.toString()) {
          issues.push({ code: 'PLAN_HOST_COMPANY_MISMATCH', detail: 'Plan host company differs from staff host company' });
        }
      }
      staffAssignments.forEach((assignment) => {
        if (staff.hostCompanyId && assignment.hostCompanyId) {
          if (staff.hostCompanyId.toString() !== assignment.hostCompanyId.toString()) {
            issues.push({
              code: 'ASSIGNMENT_HOST_COMPANY_MISMATCH',
              detail: `Assignment ${assignment._id} host company differs from staff host company`
            });
          }
        }
      });

      const currentAssignment = getCurrentAssignment(staffAssignments);
      const staffCompany = staff.hostCompanyId ? hostCompanyMap[staff.hostCompanyId.toString()] : null;

      const row = {
        staff: {
          id: staff._id,
          name: staff.name,
          surname: staff.surname,
          idNumber: staff.idNumber,
          role: staff.role,
          isActive: staff.isActive,
          department: staff.department,
          hostCompanyId: staff.hostCompanyId || null,
          hostCompanyName: staffCompany?.companyName || staffCompany?.name || null,
          createdAt: staff.createdAt
        },
        plan: plan
          ? {
            ...plan,
            rotationPath: planRotationPath
          }
          : null,
        legacyPlan: legacyOut,
        assignments: assignmentsOut,
        currentAssignmentId: currentAssignment ? currentAssignment._id : null,
        history: historyOut,
        analysis: {
          assignmentCount: staffAssignments.length,
          historyCount: staffHistory.length,
          approvalCount: assignmentsOut.reduce((sum, a) => sum + (a.approvals?.length || 0), 0),
          decisionCount: assignmentsOut.reduce((sum, a) => sum + (a.decisions?.length || 0), 0),
          issues
        }
      };

      if (issues.length > 0) {
        issues.forEach((issue) => {
          issueRows.push({
            staffId: staff._id,
            staffName: `${staff.name} ${staff.surname}`.trim(),
            code: issue.code,
            detail: issue.detail
          });
        });
      }

      reportRows.push(row);
    });

    const summary = {
      staffCount: staffList.length,
      internCount: staffList.filter((staff) => staff.role === 'Intern').length,
      staffRoleCount: staffList.filter((staff) => staff.role === 'Staff').length,
      planCount: plans.length,
      assignmentCount: assignments.length,
      historyCount: history.length,
      approvalCount: approvals.length,
      decisionCount: decisions.length,
      issueCount: issueRows.length
    };

    const report = {
      generatedAt: new Date().toISOString(),
      filters: {
        activeOnly,
        hostCompanyId: hostCompanyId || null,
        limit
      },
      summary,
      issues: issueRows,
      staff: reportRows
    };

    const outputPath = outputPathArg
      ? path.resolve(outputPathArg)
      : path.resolve(__dirname, `rotation-data-report-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('Rotation data export complete.');
    console.log(`Staff: ${summary.staffCount}, Assignments: ${summary.assignmentCount}, Issues: ${summary.issueCount}`);
    console.log(`Report saved to: ${outputPath}`);
  } catch (error) {
    console.error('ERROR: Rotation data export failed.');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (connectionOpen) {
      await mongoose.connection.close();
    }
  }
};

main();
