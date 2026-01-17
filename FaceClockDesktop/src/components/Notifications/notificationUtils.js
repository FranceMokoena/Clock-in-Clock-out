import React from 'react';
import { MdWarning, MdCheckCircle, MdInfo, MdError, MdPerson, MdAssignment } from 'react-icons/md';

/**
 * Format notification type to readable text
 */
export const formatNotificationType = (type) => {
  const typeMap = {
    // Clock-In Events
    CLOCKIN_SUCCESS: 'Clock-In Successful',
    CLOCKOUT_SUCCESS: 'Clock-Out Successful',
    LATE_CLOCKIN: 'Late Clock-In',
    MISSING_CLOCKIN: 'Missing Clock-In',
    EARLY_CLOCKOUT: 'Early Clock-Out',
    
    // Registration & Staff
    STAFF_REGISTERED: 'New Staff Registered',
    INTERN_REGISTERED: 'New Intern Registered',
    NEW_INTERN: 'New Intern',
    NEW_STAFF: 'New Staff Member',
    STAFF_ACTIVATED: 'Staff Activated',
    STAFF_DEACTIVATED: 'Staff Deactivated',
    
    // Device Management
    DEVICE_APPROVAL_PENDING: 'Device Approval Pending',
    DEVICE_APPROVED: 'Device Approved',
    DEVICE_REJECTED: 'Device Rejected',
    DEVICE_REGISTERED: 'New Device Registered',
    
    // Department & Company
    DEPARTMENT_CREATED: 'Department Created',
    DEPARTMENT_UPDATED: 'Department Updated',
    DEPARTMENT_DELETED: 'Department Deleted',
    COMPANY_CREATED: 'Company Created',
    COMPANY_UPDATED: 'Company Updated',
    COMPANY_DELETED: 'Company Deleted',
    
    // Leave & Attendance
    LEAVE_REQUEST: 'Leave Application',
    LEAVE_APPROVED: 'Leave Approved',
    LEAVE_REJECTED: 'Leave Rejected',
    LEAVE_PENDING: 'Leave Pending Review',
    LEAVE_CANCELLED: 'Leave Cancelled',
    INTERN_REPORTED: 'Intern Reported',
    INTERN_ABSENT: 'Intern Absent',
    
    // Corrections
    CORRECTION_REQUEST: 'Attendance Correction Request',
    CORRECTION_APPROVED: 'Correction Approved',
    CORRECTION_REJECTED: 'Correction Rejected',
    CORRECTION_PENDING: 'Correction Pending Review',
    
    // Reports
    REPORT_GENERATED: 'Report Generated',
    REPORT_EXPORTED: 'Report Exported',
    
    // System
    attendance_summary: 'Attendance Summary',
    payroll: 'Payroll',
    system: 'System Notification',
    other: 'Notification'
  };

  return typeMap[type] || type.replace(/_/g, ' ');
};

/**
 * Get icon for notification type
 */
export const getNotificationIcon = (type) => {
  const { MdPhoneAndroid, MdSchedule, MdVerified, MdBlock } = require('react-icons/md');
  
  const iconMap = {
    // Clock-In Events
    CLOCKIN_SUCCESS: <MdCheckCircle style={{ color: '#4CAF50' }} />,
    CLOCKOUT_SUCCESS: <MdCheckCircle style={{ color: '#4CAF50' }} />,
    LATE_CLOCKIN: <MdWarning style={{ color: '#FF9800' }} />,
    MISSING_CLOCKIN: <MdWarning style={{ color: '#F44336' }} />,
    EARLY_CLOCKOUT: <MdWarning style={{ color: '#FF9800' }} />,
    
    // Registration & Staff
    STAFF_REGISTERED: <MdPerson style={{ color: '#4CAF50' }} />,
    INTERN_REGISTERED: <MdPerson style={{ color: '#4CAF50' }} />,
    NEW_INTERN: <MdPerson style={{ color: '#4CAF50' }} />,
    NEW_STAFF: <MdPerson style={{ color: '#4CAF50' }} />,
    STAFF_ACTIVATED: <MdCheckCircle style={{ color: '#4CAF50' }} />,
    STAFF_DEACTIVATED: <MdBlock style={{ color: '#F44336' }} />,
    
    // Device Management
    DEVICE_APPROVAL_PENDING: <MdPhoneAndroid style={{ color: '#2196F3' }} />,
    DEVICE_APPROVED: <MdVerified style={{ color: '#4CAF50' }} />,
    DEVICE_REJECTED: <MdBlock style={{ color: '#F44336' }} />,
    DEVICE_REGISTERED: <MdPhoneAndroid style={{ color: '#2196F3' }} />,
    
    // Department & Company
    DEPARTMENT_CREATED: <MdAssignment style={{ color: '#2196F3' }} />,
    DEPARTMENT_UPDATED: <MdAssignment style={{ color: '#2196F3' }} />,
    DEPARTMENT_DELETED: <MdWarning style={{ color: '#F44336' }} />,
    COMPANY_CREATED: <MdAssignment style={{ color: '#2196F3' }} />,
    COMPANY_UPDATED: <MdAssignment style={{ color: '#2196F3' }} />,
    COMPANY_DELETED: <MdWarning style={{ color: '#F44336' }} />,
    
    // Leave & Attendance
    LEAVE_REQUEST: <MdAssignment style={{ color: '#2196F3' }} />,
    LEAVE_APPROVED: <MdCheckCircle style={{ color: '#4CAF50' }} />,
    LEAVE_REJECTED: <MdBlock style={{ color: '#F44336' }} />,
    LEAVE_PENDING: <MdSchedule style={{ color: '#FF9800' }} />,
    LEAVE_CANCELLED: <MdWarning style={{ color: '#FF9800' }} />,
    INTERN_REPORTED: <MdAssignment style={{ color: '#2196F3' }} />,
    INTERN_ABSENT: <MdError style={{ color: '#F44336' }} />,
    
    // Corrections
    CORRECTION_REQUEST: <MdWarning style={{ color: '#FF9800' }} />,
    CORRECTION_APPROVED: <MdCheckCircle style={{ color: '#4CAF50' }} />,
    CORRECTION_REJECTED: <MdBlock style={{ color: '#F44336' }} />,
    CORRECTION_PENDING: <MdSchedule style={{ color: '#FF9800' }} />,
    
    // Reports
    REPORT_GENERATED: <MdCheckCircle style={{ color: '#2196F3' }} />,
    REPORT_EXPORTED: <MdCheckCircle style={{ color: '#2196F3' }} />,
    
    // System
    attendance_summary: <MdCheckCircle style={{ color: '#2196F3' }} />,
    payroll: <MdCheckCircle style={{ color: '#4CAF50' }} />,
    system: <MdInfo style={{ color: '#2196F3' }} />,
    other: <MdInfo style={{ color: '#9CA3AF' }} />
  };

  return iconMap[type] || <MdInfo style={{ color: '#9CA3AF' }} />;
};

/**
 * Get color for notification type
 */
export const getNotificationColor = (type) => {
  const colorMap = {
    // Clock-In Events
    CLOCKIN_SUCCESS: '#4CAF50',
    CLOCKOUT_SUCCESS: '#4CAF50',
    LATE_CLOCKIN: '#FF9800',
    MISSING_CLOCKIN: '#F44336',
    EARLY_CLOCKOUT: '#FF9800',
    
    // Registration & Staff
    STAFF_REGISTERED: '#4CAF50',
    INTERN_REGISTERED: '#4CAF50',
    NEW_INTERN: '#4CAF50',
    NEW_STAFF: '#4CAF50',
    STAFF_ACTIVATED: '#4CAF50',
    STAFF_DEACTIVATED: '#F44336',
    
    // Device Management
    DEVICE_APPROVAL_PENDING: '#2196F3',
    DEVICE_APPROVED: '#4CAF50',
    DEVICE_REJECTED: '#F44336',
    DEVICE_REGISTERED: '#2196F3',
    
    // Department & Company
    DEPARTMENT_CREATED: '#2196F3',
    DEPARTMENT_UPDATED: '#2196F3',
    DEPARTMENT_DELETED: '#F44336',
    COMPANY_CREATED: '#2196F3',
    COMPANY_UPDATED: '#2196F3',
    COMPANY_DELETED: '#F44336',
    
    // Leave & Attendance
    LEAVE_REQUEST: '#2196F3',
    LEAVE_APPROVED: '#4CAF50',
    LEAVE_REJECTED: '#F44336',
    LEAVE_PENDING: '#FF9800',
    LEAVE_CANCELLED: '#FF9800',
    INTERN_REPORTED: '#2196F3',
    INTERN_ABSENT: '#F44336',
    
    // Corrections
    CORRECTION_REQUEST: '#FF9800',
    CORRECTION_APPROVED: '#4CAF50',
    CORRECTION_REJECTED: '#F44336',
    CORRECTION_PENDING: '#FF9800',
    
    // Reports
    REPORT_GENERATED: '#2196F3',
    REPORT_EXPORTED: '#2196F3',
    
    // System
    attendance_summary: '#2196F3',
    payroll: '#4CAF50',
    system: '#2196F3',
    other: '#9CA3AF'
  };

  return colorMap[type] || '#9CA3AF';
};

/**
 * Map notification type to dashboard view
 */
export const getNotificationNavigation = (type) => {
  const navigationMap = {
    // Clock-In Events -> Not Accountable
    CLOCKIN_SUCCESS: 'notAccountable',
    CLOCKOUT_SUCCESS: 'notAccountable',
    LATE_CLOCKIN: 'notAccountable',
    MISSING_CLOCKIN: 'notAccountable',
    EARLY_CLOCKOUT: 'notAccountable',
    
    // Registration & Staff -> Staff List
    STAFF_REGISTERED: 'staff',
    INTERN_REGISTERED: 'staff',
    NEW_INTERN: 'staff',
    NEW_STAFF: 'staff',
    STAFF_ACTIVATED: 'staff',
    STAFF_DEACTIVATED: 'staff',
    
    // Device Management -> Devices
    DEVICE_APPROVAL_PENDING: 'devices',
    DEVICE_APPROVED: 'devices',
    DEVICE_REJECTED: 'devices',
    DEVICE_REGISTERED: 'devices',
    
    // Department & Company -> respective managers
    DEPARTMENT_CREATED: 'departments',
    DEPARTMENT_UPDATED: 'departments',
    DEPARTMENT_DELETED: 'departments',
    COMPANY_CREATED: 'companies',
    COMPANY_UPDATED: 'companies',
    COMPANY_DELETED: 'companies',
    
    // Leave & Attendance
    LEAVE_REQUEST: 'leaveApplications',
    LEAVE_APPROVED: 'leaveApplications',
    LEAVE_REJECTED: 'leaveApplications',
    LEAVE_PENDING: 'leaveApplications',
    LEAVE_CANCELLED: 'leaveApplications',
    INTERN_REPORTED: 'leaveApplications',
    INTERN_ABSENT: 'staff',
    
    // Corrections -> Attendance Corrections
    CORRECTION_REQUEST: 'attendanceCorrections',
    CORRECTION_APPROVED: 'attendanceCorrections',
    CORRECTION_REJECTED: 'attendanceCorrections',
    CORRECTION_PENDING: 'attendanceCorrections',
    
    // Reports
    REPORT_GENERATED: 'reports',
    REPORT_EXPORTED: 'reports',
    
    // Default to overview
    attendance_summary: 'overview',
    payroll: 'overview',
    system: 'overview',
    other: 'overview'
  };

  return navigationMap[type] || 'overview';
};

/**
 * Format time difference to human-readable format
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const seconds = Math.floor((now - new Date(date)) / 1000);

  if (seconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  // Fall back to date format
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get URL to navigate to for different notification types
 */
export const getNavigationUrl = (notification) => {
  const { type, relatedId } = notification;

  const urlMap = {
    LATE_CLOCKIN: `/dashboard?view=notAccountable&staffId=${relatedId}`,
    NEW_INTERN: `/dashboard?view=staff&internId=${relatedId}`,
    NEW_STAFF: `/dashboard?view=staff&staffId=${relatedId}`,
    INTERN_REPORTED: `/dashboard?view=leaveApplications&internId=${relatedId}`,
    INTERN_ABSENT: `/dashboard?view=staff&internId=${relatedId}`,
    MISSING_CLOCKIN: `/dashboard?view=notAccountable&staffId=${relatedId}`,
    leave_request: `/dashboard?view=leaveApplications`,
    attendance_correction: `/dashboard?view=attendanceCorrections`,
    payroll: `/dashboard?view=reports`,
    attendance_summary: `/dashboard?view=overview`
  };

  return urlMap[type] || '/dashboard';
};

/**
 * Filter notifications by type
 */
export const filterNotificationsByType = (notifications, type) => {
  if (!type) return notifications;
  return notifications.filter(n => n.type === type);
};

/**
 * Sort notifications by date
 */
export const sortNotificationsByDate = (notifications, order = 'desc') => {
  const sorted = [...notifications];
  sorted.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
  return sorted;
};

/**
 * Group notifications by type
 */
export const groupNotificationsByType = (notifications) => {
  return notifications.reduce((groups, notification) => {
    const type = notification.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(notification);
    return groups;
  }, {});
};
