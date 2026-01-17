/**
 * 🎯 NOTIFICATION RULES ENGINE
 * 
 * Determines who should receive notifications based on:
 * - Action type (clock-in, leave request, etc.)
 * - User role (admin, HR, host company, intern)
 * - Department
 * - Host company
 * - Priority level
 */

const Staff = require('../models/Staff');
const HostCompany = require('../models/HostCompany');
const Department = require('../models/Department');

/**
 * Get recipients for a specific action
 */
async function getRecipientsForAction(actionType, payload) {
  const recipients = {
    admins: [],
    hostCompany: [],
    department: [],
    specific: [],
    allUsers: false
  };

  try {
    switch (actionType) {
      case 'CLOCK_IN':
        // Notify:
        // - Admin
        // - Host company owner
        // - Department manager
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.departmentId) {
          recipients.department = await getDepartmentManagers(payload.departmentId);
        }
        break;

      case 'CLOCK_OUT':
        // Same as CLOCK_IN
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.departmentId) {
          recipients.department = await getDepartmentManagers(payload.departmentId);
        }
        break;

      case 'STAFF_REGISTERED':
        // Notify admin, host company
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      case 'STAFF_REMOVED':
        // Notify admin, host company, affected staff member
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.staffId) {
          recipients.specific = [payload.staffId];
        }
        break;

      case 'LEAVE_REQUEST':
        // Notify admin, host company, department manager, and the requester gets confirmation
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.departmentId) {
          recipients.department = await getDepartmentManagers(payload.departmentId);
        }
        if (payload.requesterId) {
          recipients.specific = [payload.requesterId]; // Confirmation to requester
        }
        break;

      case 'LEAVE_APPROVED':
        // Notify the requester and admin
        recipients.admins = await getAdmins();
        if (payload.requesterId) {
          recipients.specific = [payload.requesterId];
        }
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      case 'LEAVE_REJECTED':
        // Notify the requester only
        if (payload.requesterId) {
          recipients.specific = [payload.requesterId];
        }
        break;

      case 'ATTENDANCE_CORRECTION_REQUEST':
        // Notify admin, host company, department manager
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.departmentId) {
          recipients.department = await getDepartmentManagers(payload.departmentId);
        }
        if (payload.requesterId) {
          recipients.specific.push(payload.requesterId); // Confirmation
        }
        break;

      case 'ATTENDANCE_CORRECTION_APPROVED':
        // Notify requester, admin, host company
        if (payload.requesterId) {
          recipients.specific = [payload.requesterId];
        }
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      case 'ATTENDANCE_CORRECTION_REJECTED':
        // Notify requester only
        if (payload.requesterId) {
          recipients.specific = [payload.requesterId];
        }
        break;

      case 'PAYROLL_PROCESSED':
        // Notify admin, host company, and all staff in host company
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
          recipients.department = await getStaffByHostCompany(payload.hostCompanyId);
        }
        break;

      case 'PAYROLL_GENERATED':
        // Notify admin and affected staff
        recipients.admins = await getAdmins();
        if (payload.staffIds && Array.isArray(payload.staffIds)) {
          recipients.specific = payload.staffIds;
        }
        break;

      case 'SYSTEM_ALERT':
        // Notify all admins
        recipients.admins = await getAdmins();
        break;

      case 'SECURITY_ALERT':
        // Notify admin and host company
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      case 'FAILED_RECOGNITION':
        // Notify admin and host company - security issue
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      case 'DEPARTMENT_CREATED':
      case 'DEPARTMENT_UPDATED':
        // Notify admin and host company
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      // ===== INTERN NOTIFICATIONS =====
      case 'INTERN_REPORTED':
        // Notify: Admin, Host Company, and the Intern
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.internId) {
          recipients.specific = [payload.internId];
        }
        break;

      case 'INTERN_FLAGGED':
        // Notify: Admin, Host Company, and the Intern
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.internId) {
          recipients.specific = [payload.internId];
        }
        break;

      case 'INTERN_NOT_ACCOUNTABLE':
        // Notify: Admin, Host Company, and the Intern
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.internId) {
          recipients.specific = [payload.internId];
        }
        break;

      case 'INTERN_MISSING_CLOCKIN':
        // Notify: Admin, Host Company, and the Intern
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.internId) {
          recipients.specific = [payload.internId];
        }
        break;

      case 'INTERN_MISSING_CLOCKOUT':
        // Notify: Admin, Host Company, and the Intern
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        if (payload.internId) {
          recipients.specific = [payload.internId];
        }
        break;

      // ===== HOST COMPANY NOTIFICATIONS =====
      case 'STAFF_CLOCKIN':
      case 'STAFF_CLOCKOUT':
        // Notify: Host Company only (not admins)
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      case 'STAFF_CLOCKIN_LATE':
      case 'STAFF_MISSING_CLOCKIN':
      case 'STAFF_MISSING_CLOCKOUT':
      case 'STAFF_ABSENT':
        // Notify: Admin and Host Company
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      case 'REPORT_ACTION_TAKEN':
        // Notify: Admin and Host Company
        recipients.admins = await getAdmins();
        if (payload.hostCompanyId) {
          recipients.hostCompany = await getHostCompanyAdmins(payload.hostCompanyId);
        }
        break;

      default:
        // Default: notify admins only
        recipients.admins = await getAdmins();
    }
  } catch (error) {
    console.error('❌ Error getting recipients:', error);
  }

  return recipients;
}

/**
 * Get all admin users
 */
async function getAdmins() {
  try {
    // Always include the system admin
    const adminIds = ['000000000000000000000001']; // System admin ObjectId
    
    // Also get any Staff members with Admin role
    const staffAdmins = await Staff.find({ role: 'Admin' })
      .select('_id')
      .lean();
    
    staffAdmins.forEach(a => {
      if (a._id.toString() !== '000000000000000000000001') {
        adminIds.push(a._id);
      }
    });
    
    return adminIds;
  } catch (error) {
    console.error('❌ Error fetching admins:', error);
    // Always return system admin even if there's an error
    return ['000000000000000000000001'];
  }
}

/**
 * Get host company admins (representatives)
 */
async function getHostCompanyAdmins(hostCompanyId) {
  try {
    const hostCompany = await HostCompany.findById(hostCompanyId)
      .select('representativeId admins')
      .lean();
    
    if (!hostCompany) return [];
    
    const adminIds = [];
    if (hostCompany.representativeId) {
      adminIds.push(hostCompany.representativeId);
    }
    if (hostCompany.admins && Array.isArray(hostCompany.admins)) {
      adminIds.push(...hostCompany.admins);
    }
    
    return adminIds;
  } catch (error) {
    console.error('❌ Error fetching host company admins:', error);
    return [];
  }
}

/**
 * Get department managers
 */
async function getDepartmentManagers(departmentId) {
  try {
    const department = await Department.findById(departmentId)
      .select('managerId managers')
      .lean();
    
    if (!department) return [];
    
    const managerIds = [];
    if (department.managerId) {
      managerIds.push(department.managerId);
    }
    if (department.managers && Array.isArray(department.managers)) {
      managerIds.push(...department.managers);
    }
    
    return managerIds;
  } catch (error) {
    console.error('❌ Error fetching department managers:', error);
    return [];
  }
}

/**
 * Get all staff in a host company
 */
async function getStaffByHostCompany(hostCompanyId) {
  try {
    const staff = await Staff.find({ hostCompanyId })
      .select('_id')
      .lean();
    return staff.map(s => s._id);
  } catch (error) {
    console.error('❌ Error fetching staff by host company:', error);
    return [];
  }
}

/**
 * Get notification priority and type based on action
 */
function getNotificationMetadata(actionType) {
  const metadata = {
    priority: 'medium',
    notificationType: 'other',
    shouldPersist: true,
    sendEmail: false,
    sendPush: true,
    sendInApp: true
  };

  switch (actionType) {
    case 'CLOCK_IN':
    case 'CLOCK_OUT':
      metadata.notificationType = 'attendance';
      metadata.priority = 'low';
      break;

    case 'LEAVE_REQUEST':
      metadata.notificationType = 'leave_request';
      metadata.priority = 'high';
      metadata.sendEmail = true;
      break;

    case 'LEAVE_APPROVED':
      metadata.notificationType = 'leave_approved';
      metadata.priority = 'medium';
      metadata.sendEmail = true;
      break;

    case 'ATTENDANCE_CORRECTION_REQUEST':
      metadata.notificationType = 'attendance_correction';
      metadata.priority = 'high';
      metadata.sendEmail = true;
      break;

    case 'PAYROLL_PROCESSED':
      metadata.notificationType = 'payroll';
      metadata.priority = 'high';
      metadata.sendEmail = true;
      break;

    case 'SECURITY_ALERT':
    case 'FAILED_RECOGNITION':
      metadata.notificationType = 'security';
      metadata.priority = 'urgent';
      metadata.sendEmail = true;
      break;

    case 'SYSTEM_ALERT':
      metadata.notificationType = 'system';
      metadata.priority = 'high';
      break;

    // Intern notification types
    case 'INTERN_REPORTED':
    case 'INTERN_FLAGGED':
      metadata.notificationType = 'staff_action';
      metadata.priority = 'high';
      metadata.sendPush = true;
      break;

    case 'INTERN_NOT_ACCOUNTABLE':
    case 'INTERN_MISSING_CLOCKIN':
    case 'INTERN_MISSING_CLOCKOUT':
      metadata.notificationType = 'attendance';
      metadata.priority = 'high';
      metadata.sendPush = true;
      break;

    // Host Company notification types
    case 'STAFF_CLOCKIN':
    case 'STAFF_CLOCKOUT':
      metadata.notificationType = 'attendance';
      metadata.priority = 'low';
      break;

    case 'STAFF_CLOCKIN_LATE':
    case 'STAFF_MISSING_CLOCKIN':
    case 'STAFF_MISSING_CLOCKOUT':
    case 'STAFF_ABSENT':
      metadata.notificationType = 'attendance';
      metadata.priority = 'high';
      metadata.sendPush = true;
      break;

    case 'REPORT_ACTION_TAKEN':
      metadata.notificationType = 'staff_action';
      metadata.priority = 'high';
      metadata.sendPush = true;
      break;
  }

  return metadata;
}

module.exports = {
  getRecipientsForAction,
  getAdmins,
  getHostCompanyAdmins,
  getDepartmentManagers,
  getStaffByHostCompany,
  getNotificationMetadata
};
