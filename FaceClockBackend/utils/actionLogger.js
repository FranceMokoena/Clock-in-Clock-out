/**
 * 📝 ACTION LOGGER SERVICE
 * 
 * Logs every action in the system:
 * - Clock in/out
 * - Staff registration
 * - Leave requests
 * - Attendance corrections
 * - Payroll actions
 * - Security events
 */

const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const eventEmitter = require('./eventEmitter');
const { getRecipientsForAction, getNotificationMetadata } = require('./notificationRules');

/**
 * Log and notify for an action
 */
async function logAction(actionType, payload, initiatedBy = null) {
  try {
    // Get notification metadata
    const metadata = getNotificationMetadata(actionType);

    // Get recipients for this action
    const recipients = await getRecipientsForAction(actionType, payload);

    // Create notification document for persistence
    const notification = await createNotification(
      actionType,
      payload,
      recipients,
      metadata,
      initiatedBy
    );

    // Emit event for real-time delivery
    eventEmitter.emitAction(actionType, {
      ...payload,
      notification: notification._id,
      metadata
    });

    // Send real-time notifications to connected users
    await sendRealtimeNotifications(notification, recipients, metadata);

    console.log(`✅ Action logged: ${actionType}`);
    return notification;

  } catch (error) {
    console.error(`❌ Error logging action ${actionType}:`, error);
    // Don't fail the main operation if notification fails
    throw error;
  }
}

/**
 * Create notification document in database
 */
async function createNotification(actionType, payload, recipients, metadata, initiatedBy) {
  try {
    // Determine notification title and message
    const { title, message } = getNotificationMessages(actionType, payload);

    // Create one notification per recipient type and save to database
    const notifications = [];

    // Create for each admin
    for (const adminId of recipients.admins) {
      const notif = new Notification({
        type: metadata.notificationType,
        title,
        message,
        recipientType: 'Admin',
        recipientId: adminId,
        subjectUserId: payload.staffId ? new mongoose.Types.ObjectId(payload.staffId) : (payload.internId ? new mongoose.Types.ObjectId(payload.internId) : null),
        actorId: initiatedBy || null,
        priority: metadata.priority,
        relatedEntities: {
          staffId: payload.staffId ? new mongoose.Types.ObjectId(payload.staffId) : null,
          hostCompanyId: payload.hostCompanyId ? new mongoose.Types.ObjectId(payload.hostCompanyId) : null,
          departmentId: payload.departmentId ? new mongoose.Types.ObjectId(payload.departmentId) : null
        },
        data: {
          actionType,
          payload,
          initiatedBy,
          channels: {
            inApp: metadata.sendInApp,
            push: metadata.sendPush,
            email: metadata.sendEmail
          }
        },
        isRead: false
      });
      await notif.save();
      notifications.push(notif);
    }

    // Create for each host company admin
    for (const hostCompanyAdminId of recipients.hostCompany) {
      const notif = new Notification({
        type: metadata.notificationType,
        title,
        message,
        recipientType: 'HostCompany',
        recipientId: hostCompanyAdminId,
        subjectUserId: payload.staffId ? new mongoose.Types.ObjectId(payload.staffId) : (payload.internId ? new mongoose.Types.ObjectId(payload.internId) : null),
        actorId: initiatedBy || null,
        priority: metadata.priority,
        relatedEntities: {
          staffId: payload.staffId ? new mongoose.Types.ObjectId(payload.staffId) : null,
          hostCompanyId: payload.hostCompanyId ? new mongoose.Types.ObjectId(payload.hostCompanyId) : null,
          departmentId: payload.departmentId ? new mongoose.Types.ObjectId(payload.departmentId) : null
        },
        data: {
          actionType,
          payload,
          initiatedBy,
          channels: {
            inApp: metadata.sendInApp,
            push: metadata.sendPush,
            email: metadata.sendEmail
          }
        },
        isRead: false
      });
      await notif.save();
      notifications.push(notif);
    }

    // Create for each department manager
    for (const deptManagerId of recipients.department) {
      const notif = new Notification({
        type: metadata.notificationType,
        title,
        message,
        recipientType: 'DepartmentManager',
        recipientId: deptManagerId,
        subjectUserId: payload.staffId ? new mongoose.Types.ObjectId(payload.staffId) : (payload.internId ? new mongoose.Types.ObjectId(payload.internId) : null),
        actorId: initiatedBy || null,
        priority: metadata.priority,
        relatedEntities: {
          staffId: payload.staffId ? new mongoose.Types.ObjectId(payload.staffId) : null,
          hostCompanyId: payload.hostCompanyId ? new mongoose.Types.ObjectId(payload.hostCompanyId) : null,
          departmentId: payload.departmentId ? new mongoose.Types.ObjectId(payload.departmentId) : null
        },
        data: {
          actionType,
          payload,
          initiatedBy,
          channels: {
            inApp: metadata.sendInApp,
            push: metadata.sendPush,
            email: metadata.sendEmail
          }
        },
        isRead: false
      });
      await notif.save();
      notifications.push(notif);
    }

    // Create for specific users
    for (const specificUserId of recipients.specific) {
      // Determine recipient type based on payload (Intern or Staff)
      const userRecipientType = payload.role === 'Staff' ? 'Staff' : 'Intern';

      const notif = new Notification({
        type: metadata.notificationType,
        title,
        message,
        recipientType: userRecipientType,
        recipientId: specificUserId,
        subjectUserId: payload.staffId || payload.internId || payload.requesterId || specificUserId, // Who it's about
        actorId: initiatedBy || null, // Who triggered it
        priority: metadata.priority,
        relatedEntities: {
          staffId: payload.staffId ? new mongoose.Types.ObjectId(payload.staffId) : null,
          hostCompanyId: payload.hostCompanyId ? new mongoose.Types.ObjectId(payload.hostCompanyId) : null,
          departmentId: payload.departmentId ? new mongoose.Types.ObjectId(payload.departmentId) : null
        },
        data: {
          actionType,
          payload,
          initiatedBy,
          channels: {
            inApp: metadata.sendInApp,
            push: metadata.sendPush,
            email: metadata.sendEmail
          }
        },
        isRead: false
      });
      await notif.save();
      notifications.push(notif);
    }

    // If no notifications were created (empty recipients), return a constructed Notification document
    if (notifications.length > 0) {
      return notifications[0];
    }

    // Build a fallback notification object (not persisted) so callers can safely reference _id
    const fallback = new Notification({
      type: metadata.notificationType || 'system',
      title,
      message,
      recipientType: 'All',
      recipientId: null,
      priority: metadata.priority || 'medium',
      data: {
        actionType,
        payload,
        initiatedBy,
        channels: {
          inApp: metadata.sendInApp,
          push: metadata.sendPush,
          email: metadata.sendEmail
        }
      },
      isRead: false,
      createdAt: new Date()
    });

    // Ensure an _id exists even though not saved
    if (!fallback._id) fallback._id = new mongoose.Types.ObjectId();
    return fallback;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

/**
 * Send real-time notifications to connected users
 */
async function sendRealtimeNotifications(notification, recipients, metadata) {
  try {
    const notificationPayload = {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      type: notification.type,
      createdAt: notification.createdAt,
      data: notification.data
    };

    // Send to admins (CRITICAL: Must use 'Admin' to match desktop Socket.IO auth)
    for (const adminId of recipients.admins) {
      eventEmitter.sendToUser(adminId, 'Admin', notificationPayload);
      // Send updated unread count
      try {
        const count = await Notification.countDocuments({ recipientId: adminId, isRead: false });
        eventEmitter.sendToUser(adminId, 'Admin', { count }, 'notification_count');
      } catch (err) {
        console.warn('⚠️ Failed to fetch/send unread count for admin', adminId, err.message);
      }
    }

    // Send to host company admins (CRITICAL: Must use 'HostCompany' to match desktop Socket.IO auth)
    for (const hostCompanyAdminId of recipients.hostCompany) {
      eventEmitter.sendToUser(hostCompanyAdminId, 'HostCompany', notificationPayload);
      try {
        const count = await Notification.countDocuments({ recipientId: hostCompanyAdminId, isRead: false });
        eventEmitter.sendToUser(hostCompanyAdminId, 'HostCompany', { count }, 'notification_count');
      } catch (err) {
        console.warn('⚠️ Failed to fetch/send unread count for host admin', hostCompanyAdminId, err.message);
      }
    }

    // Send to department managers (CRITICAL: Must use 'DeptManager' to match desktop Socket.IO auth)
    for (const deptManagerId of recipients.department) {
      eventEmitter.sendToUser(deptManagerId, 'DeptManager', notificationPayload);
      try {
        const count = await Notification.countDocuments({ recipientId: deptManagerId, isRead: false });
        eventEmitter.sendToUser(deptManagerId, 'DeptManager', { count }, 'notification_count');
      } catch (err) {
        console.warn('⚠️ Failed to fetch/send unread count for manager', deptManagerId, err.message);
      }
    }

    // Send to specific users (CRITICAL: Must use 'User' to match desktop Socket.IO auth)
    for (const specificUserId of recipients.specific) {
      eventEmitter.sendToUser(specificUserId, 'User', notificationPayload);
      try {
        const count = await Notification.countDocuments({ recipientId: specificUserId, isRead: false });
        eventEmitter.sendToUser(specificUserId, 'User', { count }, 'notification_count');
      } catch (err) {
        console.warn('⚠️ Failed to fetch/send unread count for user', specificUserId, err.message);
      }
    }
  } catch (error) {
    console.error('❌ Error sending real-time notifications:', error);
  }
}

/**
 * Get human-readable notification messages
 */
function getNotificationMessages(actionType, payload) {
  let title = '';
  let message = '';

  switch (actionType) {
    case 'CLOCK_IN':
      title = '✅ Clock In Recorded';
      message = `${payload.staffName} clocked in at ${new Date(payload.timestamp).toLocaleTimeString()}`;
      break;

    case 'CLOCK_OUT':
      title = '👋 Clock Out Recorded';
      message = `${payload.staffName} clocked out at ${new Date(payload.timestamp).toLocaleTimeString()}`;
      break;

    case 'STAFF_REGISTERED':
      title = '👤 New Staff Registered';
      message = `${payload.staffName} (${payload.role}) has been registered`;
      break;

    case 'STAFF_REMOVED':
      title = '⚠️ Staff Member Removed';
      message = `${payload.staffName} has been removed from the system`;
      break;

    case 'LEAVE_REQUEST':
      title = '🏖️ Leave Request Submitted';
      message = `${payload.staffName} has requested leave from ${new Date(payload.startDate).toLocaleDateString()} to ${new Date(payload.endDate).toLocaleDateString()}`;
      break;

    case 'LEAVE_APPROVED':
      title = '✅ Leave Approved';
      message = `Your leave request has been approved by ${payload.approvedBy}`;
      break;

    case 'LEAVE_REJECTED':
      title = '❌ Leave Rejected';
      message = `Your leave request has been rejected`;
      break;

    case 'ATTENDANCE_CORRECTION_REQUEST':
      title = '📝 Attendance Correction Requested';
      message = `${payload.staffName} has requested an attendance correction for ${new Date(payload.date).toLocaleDateString()}`;
      break;

    case 'ATTENDANCE_CORRECTION_APPROVED':
      title = '✅ Attendance Correction Approved';
      message = `Your attendance correction has been approved`;
      break;

    case 'ATTENDANCE_CORRECTION_REJECTED':
      title = '❌ Attendance Correction Rejected';
      message = `Your attendance correction has been rejected`;
      break;

    case 'PAYROLL_PROCESSED':
      title = '💰 Payroll Processed';
      message = `Payroll for ${payload.period} has been processed and is ready for distribution`;
      break;

    case 'PAYROLL_GENERATED':
      title = '💳 Your Payroll Generated';
      message = `Your payroll for ${payload.period} has been generated`;
      break;

    case 'SECURITY_ALERT':
      title = '🚨 Security Alert';
      message = payload.message || 'A security event has been detected';
      break;

    case 'FAILED_RECOGNITION':
      title = '⚠️ Recognition Failed';
      message = `Failed face recognition attempt at ${payload.location}`;
      break;

    case 'SYSTEM_ALERT':
      title = '⚙️ System Alert';
      message = payload.message || 'A system event has occurred';
      break;

    case 'DEPARTMENT_CREATED':
      title = '🏢 Department Created';
      message = `New department "${payload.departmentName}" has been created`;
      break;

    case 'DEPARTMENT_UPDATED':
      title = '🏢 Department Updated';
      message = `Department "${payload.departmentName}" has been updated`;
      break;

    // ===== INTERN NOTIFICATIONS =====
    case 'INTERN_REPORTED':
      title = '⚠️ You Have Been Reported';
      message = `An incident report has been filed regarding your conduct`;
      break;

    case 'INTERN_FLAGGED':
      title = '🚩 Account Flagged';
      message = `Your account has been flagged for review`;
      break;

    case 'INTERN_NOT_ACCOUNTABLE':
      title = '⚠️ Not Accountable Status';
      message = `You have been marked as "Not Accountable" for the period`;
      break;

    case 'INTERN_MISSING_CLOCKIN':
      title = '❌ Missing Clock-In';
      message = `You are missing a clock-in for ${new Date(payload.date || Date.now()).toLocaleDateString()}`;
      break;

    case 'INTERN_MISSING_CLOCKOUT':
      title = '❌ Missing Clock-Out';
      message = `You are missing a clock-out for ${new Date(payload.date || Date.now()).toLocaleDateString()}`;
      break;

    // ===== HOST COMPANY NOTIFICATIONS =====
    case 'STAFF_CLOCKIN':
      title = '✅ Staff Clock In';
      message = `${payload.staffName} has clocked in at ${new Date(payload.timestamp).toLocaleTimeString()}`;
      break;

    case 'STAFF_CLOCKOUT':
      title = '👋 Staff Clock Out';
      message = `${payload.staffName} has clocked out at ${new Date(payload.timestamp).toLocaleTimeString()}`;
      break;

    case 'STAFF_CLOCKIN_LATE':
      title = '⏰ Late Clock In';
      message = `${payload.staffName} clocked in late at ${new Date(payload.timestamp).toLocaleTimeString()}`;
      break;

    case 'STAFF_MISSING_CLOCKIN':
      title = '❌ Staff Missing Clock-In';
      message = `${payload.staffName} is missing clock-in for ${new Date(payload.date || Date.now()).toLocaleDateString()}`;
      break;

    case 'STAFF_MISSING_CLOCKOUT':
      title = '❌ Staff Missing Clock-Out';
      message = `${payload.staffName} is missing clock-out for ${new Date(payload.date || Date.now()).toLocaleDateString()}`;
      break;

    case 'STAFF_ABSENT':
      title = '📋 Staff Absent';
      message = `${payload.staffName} is marked absent for ${new Date(payload.date || Date.now()).toLocaleDateString()}`;
      break;

    case 'REPORT_ACTION_TAKEN':
      title = '✅ Report Reviewed';
      message = `Action has been taken on the incident report regarding ${payload.staffName}`;
      break;


    case 'ROTATION_PLAN_CREATED':
      title = 'Rotation Plan Created';
      message = `A new rotation plan has been created for ${payload.staffName}.`;
      break;

    case 'ROTATION_PLAN_UPDATED':
      title = 'Rotation Plan Updated';
      message = `Rotation plan updated for ${payload.staffName}.`;
      break;

    case 'ROTATION_DUE_SOON':
      title = 'Rotation Due Soon';
      message = `${payload.staffName} rotation assignment is nearing its end date.`;
      break;

    case 'ROTATION_EVIDENCE_FAILED':
      title = 'Rotation Evidence Failed';
      message = `${payload.staffName} rotation evidence did not meet requirements.`;
      break;

    case 'ROTATION_EVALUATION_SUBMITTED':
      title = 'Rotation Evaluation Submitted';
      message = `Supervisor evaluation submitted for ${payload.staffName}.`;
      break;

    case 'ROTATION_APPROVAL_PENDING':
      title = 'Rotation Approval Pending';
      message = `Approval is pending for ${payload.staffName} rotation.`;
      break;

    case 'ROTATION_APPROVED':
      title = 'Rotation Approved';
      message = `${payload.staffName} rotation has been approved.`;
      break;

    case 'ROTATION_DENIED':
      title = 'Rotation Denied';
      message = `${payload.staffName} rotation was denied.`;
      break;

    case 'ROTATION_COMPLETED':
      title = 'Rotation Completed';
      message = `${payload.staffName} rotation assignment has been completed.`;
      break;

    case 'ROTATION_REGRESSED':
      title = 'Rotation Regressed';
      message = `${payload.staffName} rotation requires additional review.`;
      break;

    case 'ROTATION_DECLINED':
      title = 'Rotation Declined';
      message = `${payload.staffName} rotation was declined and requires action.`;
      break;

    case 'ROTATION_DEPARTMENT_CHANGED':
      title = 'Rotation Department Changed';
      message = `${payload.staffName} has been moved to a new rotation department.`;
      break;

    default:
      title = 'System Notification';
      message = actionType;
  }

  return { title, message };
}

/**
 * Create a quick notification (for simple cases)
 */
async function createQuickNotification(recipientId, recipientType, title, message, type = 'other', priority = 'medium', data = {}) {
  try {
    const notification = new Notification({
      type,
      title,
      message,
      recipientType,
      recipientId,
      priority,
      data,
      isRead: false
    });

    await notification.save();

    // Send real-time if user is connected (CRITICAL: Use recipientType directly, don't lowercase!)
    eventEmitter.sendToUser(recipientId, recipientType, {
      _id: notification._id,
      title,
      message,
      priority,
      type,
      createdAt: notification.createdAt
    });

    return notification;
  } catch (error) {
    console.error('❌ Error creating quick notification:', error);
  }
}

/**
 * Bulk create notifications
 */
async function bulkCreateNotifications(recipientIds, recipientType, title, message, type = 'other', priority = 'medium') {
  try {
    const notifications = recipientIds.map(id => ({
      type,
      title,
      message,
      recipientType,
      recipientId: id,
      priority,
      isRead: false
    }));

    const result = await Notification.insertMany(notifications);

    // Send real-time to each (CRITICAL: Use recipientType directly, don't lowercase!)
    recipientIds.forEach((id, idx) => {
      if (result[idx]) {
        eventEmitter.sendToUser(id, recipientType, {
          _id: result[idx]._id,
          title,
          message,
          priority,
          type,
          createdAt: result[idx].createdAt
        });
      }
    });

    return result;
  } catch (error) {
    console.error('❌ Error in bulk create notifications:', error);
  }
}

module.exports = {
  logAction,
  createNotification,
  sendRealtimeNotifications,
  createQuickNotification,
  bulkCreateNotifications
};
