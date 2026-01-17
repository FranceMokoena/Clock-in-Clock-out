const Notification = require('../models/Notification');

/**
 * Create a notification for late clock-in
 */
const notifyLateClockin = async (staffId, staffName, hostCompanyId) => {
  try {
    const notification = new Notification({
      type: 'LATE_CLOCKIN',
      title: 'Late Clock-In',
      message: `${staffName} clocked in late today`,
      recipientType: hostCompanyId ? 'HostCompany' : 'HR',
      recipientId: hostCompanyId || null,
      relatedId: staffId,
      priority: 'high'
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating late clock-in notification:', error);
  }
};

/**
 * Create a notification for new intern registered
 */
const notifyNewIntern = async (internId, internName, hostCompanyId) => {
  try {
    const notification = new Notification({
      type: 'NEW_INTERN',
      title: 'New Intern Registered',
      message: `New intern ${internName} has been registered`,
      recipientType: 'All',
      relatedId: internId,
      hostCompanyId: hostCompanyId || null,
      priority: 'medium'
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating new intern notification:', error);
  }
};

/**
 * Create a notification for new staff registered
 */
const notifyNewStaff = async (staffId, staffName, hostCompanyId) => {
  try {
    const notification = new Notification({
      type: 'NEW_STAFF',
      title: 'New Staff Member',
      message: `New staff member ${staffName} has been registered`,
      recipientType: 'HR',
      relatedId: staffId,
      hostCompanyId: hostCompanyId || null,
      priority: 'medium'
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating new staff notification:', error);
  }
};

/**
 * Create a notification for intern reported
 */
const notifyInternReported = async (internId, internName, reason, hostCompanyId) => {
  try {
    const notification = new Notification({
      type: 'INTERN_REPORTED',
      title: 'Intern Reported',
      message: `${internName} has been reported: ${reason}`,
      recipientType: hostCompanyId ? 'HostCompany' : 'HR',
      recipientId: hostCompanyId || null,
      relatedId: internId,
      priority: 'urgent'
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating intern reported notification:', error);
  }
};

/**
 * Create a notification for intern absent
 */
const notifyInternAbsent = async (internId, internName, hostCompanyId) => {
  try {
    const notification = new Notification({
      type: 'INTERN_ABSENT',
      title: 'Intern Absent',
      message: `${internName} is marked as absent today`,
      recipientType: hostCompanyId ? 'HostCompany' : 'HR',
      recipientId: hostCompanyId || null,
      relatedId: internId,
      priority: 'high'
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating intern absent notification:', error);
  }
};

/**
 * Create a notification for missing clock-in
 */
const notifyMissingClockin = async (staffId, staffName, hostCompanyId) => {
  try {
    const notification = new Notification({
      type: 'MISSING_CLOCKIN',
      title: 'Missing Clock-In',
      message: `${staffName} has not clocked in today`,
      recipientType: hostCompanyId ? 'HostCompany' : 'HR',
      recipientId: hostCompanyId || null,
      relatedId: staffId,
      priority: 'high'
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating missing clock-in notification:', error);
  }
};

/**
 * Create a generic notification
 */
const createNotification = async (type, title, message, recipientType, recipientId = null, relatedId = null, priority = 'medium') => {
  try {
    const notification = new Notification({
      type,
      title,
      message,
      recipientType,
      recipientId,
      relatedId,
      priority
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId) => {
  try {
    const result = await Notification.findByIdAndDelete(notificationId);
    return result;
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};

module.exports = {
  notifyLateClockin,
  notifyNewIntern,
  notifyNewStaff,
  notifyInternReported,
  notifyInternAbsent,
  notifyMissingClockin,
  createNotification,
  markAsRead,
  deleteNotification
};
