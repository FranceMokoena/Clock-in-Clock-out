const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

const normalizeRecipientType = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  if (lower === 'admin' || lower === 'administrator') return 'Admin';
  if (lower === 'hr') return 'HR';
  if (lower === 'hostcompany' || lower === 'host company' || lower === 'host_company' || lower === 'host') {
    return 'HostCompany';
  }
  if (lower === 'departmentmanager' || lower === 'department manager') return 'DepartmentManager';
  if (lower === 'intern') return 'Intern';
  if (lower === 'staff') return 'Staff';
  if (lower === 'all') return 'All';
  return raw;
};

const resolveRecipientTypeSet = (value) => {
  const normalized = normalizeRecipientType(value);
  if (!normalized) return null;
  if (normalized === 'Admin') return ['Admin', 'HR'];
  if (normalized === 'HR') return ['HR', 'Admin'];
  if (normalized === 'HostCompany') return ['HostCompany'];
  if (normalized === 'DepartmentManager') return ['DepartmentManager'];
  if (normalized === 'Intern') return ['Intern'];
  if (normalized === 'Staff') return ['Staff'];
  if (normalized === 'All') return ['All'];
  return [normalized];
};

/**
 * GET /api/notifications
 * Fetch notifications for a user
 * Query params:
 *   - recipientId: User/Host Company ID
 *   - recipientType: 'HR', 'HostCompany', 'Intern', 'All'
 *   - hostCompanyId: Filter by host company (optional)
 *   - departmentId: Filter by department (optional)
 *   - isRead: true/false (optional)
 *   - limit: number of notifications to fetch (default: 20)
 *   - skip: pagination offset (default: 0)
 */
router.get('/', async (req, res) => {
  try {
    const { recipientId, recipientType, hostCompanyId, departmentId, isRead, limit = 20, skip = 0 } = req.query;

    const filter = {};

    // Build filter based on query params
    // 🔒 CRITICAL FIX: Interns and Staff should ONLY receive notifications where:
    // 1. recipientId matches their ID (direct recipient)
    // 2. subjectUserId matches their ID (notification is about them)
    // They should NOT receive 'All' broadcasts unless explicitly intended
    if (recipientId) {
      const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
      
      // For Intern/Staff: strict filtering - only their own notifications
      if (recipientType === 'Intern' || recipientType === 'Staff') {
        filter.$or = [
          { recipientId: recipientObjectId },
          { subjectUserId: recipientObjectId } // Also include notifications about them
        ];
      } else {
        // For Admin/HostCompany: can receive 'All' broadcasts
        filter.$or = [
          { recipientId: recipientObjectId },
          { recipientType: 'All' }
        ];
      }
    }

    if (recipientType) {
      if (filter.$or) {
        // For Intern/Staff: strict type matching (no 'All' broadcasts)
        if (recipientType === 'Intern' || recipientType === 'Staff') {
          filter.$and = [
            { $or: filter.$or },
            { recipientType: recipientType } // NO 'All' for Interns/Staff
          ];
        } else {
          // For Admin/HostCompany: can receive 'All' broadcasts
          filter.$and = [
            { $or: filter.$or },
            { recipientType: { $in: [recipientType, 'All'] } }
          ];
        }
        delete filter.$or;
      } else {
        // For Intern/Staff: strict type matching
        if (recipientType === 'Intern' || recipientType === 'Staff') {
          filter.recipientType = recipientType; // NO 'All'
        } else {
          filter.recipientType = { $in: [recipientType, 'All'] };
        }
      }
    }

    // Filter by host company
    if (hostCompanyId) {
      filter['data.payload.hostCompanyId'] = hostCompanyId;
    }

    // Filter by department
    if (departmentId) {
      filter['data.payload.departmentId'] = departmentId;
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('subjectUserId', 'name surname role department location locationAddress trustedDevices')
      .populate('relatedEntities.staffId', 'name surname role department location locationAddress trustedDevices')
      .populate('relatedEntities.hostCompanyId', 'name companyName')
      .populate('relatedEntities.departmentId', 'name')
      .lean();

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      notifications,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for a user
 */
router.get('/unread-count', async (req, res) => {
  try {
    const { recipientId, recipientType } = req.query;

    const filter = { isRead: false };

    // 🔒 CRITICAL FIX: Apply same strict filtering for unread count
    if (recipientId) {
      const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
      
      if (recipientType === 'Intern' || recipientType === 'Staff') {
        filter.$or = [
          { recipientId: recipientObjectId },
          { subjectUserId: recipientObjectId }
        ];
      } else {
        filter.$or = [
          { recipientId: recipientObjectId },
          { recipientType: 'All' }
        ];
      }
    }

    if (recipientType) {
      if (filter.$or) {
        if (recipientType === 'Intern' || recipientType === 'Staff') {
          filter.$and = [
            { $or: filter.$or },
            { recipientType: recipientType }
          ];
        } else {
          filter.$and = [
            { $or: filter.$or },
            { recipientType: { $in: [recipientType, 'All'] } }
          ];
        }
        delete filter.$or;
      } else {
        if (recipientType === 'Intern' || recipientType === 'Staff') {
          filter.recipientType = recipientType;
        } else {
          filter.recipientType = { $in: [recipientType, 'All'] };
        }
      }
    }

    const count = await Notification.countDocuments(filter);

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

/**
 * POST /api/notifications
 * Create a new notification
 * Body:
 *   - type: Notification type
 *   - title: Notification title
 *   - message: Notification message
 *   - recipientType: 'HR', 'HostCompany', 'Intern', 'All'
 *   - recipientId: (optional) specific user/host company ID
 *   - relatedId: (optional) ID of related entity (staff, intern, etc)
 *   - actionUrl: (optional) URL to navigate to when clicked
 *   - priority: (optional) 'low', 'medium', 'high', 'urgent'
 */
router.post('/', async (req, res) => {
  try {
    const { type, title, message, recipientType, recipientId, relatedId, actionUrl, priority, data } = req.body;

    // Validate required fields
    if (!type || !title || !message || !recipientType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, title, message, recipientType'
      });
    }

    const notification = new Notification({
      type,
      title,
      message,
      recipientType,
      recipientId: recipientId || null,
      relatedId: relatedId || null,
      actionUrl: actionUrl || null,
      priority: priority || 'medium',
      data: data || null
    });

    await notification.save();

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all unread notifications as read for a user
 */
router.post('/read-all', async (req, res) => {
  try {
    const { recipientId, recipientType } = req.body;

    const filter = { isRead: false };

    if (recipientId) {
      filter.recipientId = new mongoose.Types.ObjectId(recipientId);
    }

    if (recipientType) {
      filter.recipientType = { $in: [recipientType, 'All'] };
    }

    const result = await Notification.updateMany(
      filter,
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
});

/**
 * DELETE /api/notifications/delete-all
 * Delete all notifications for a user
 */
router.delete('/delete-all', async (req, res) => {
  try {
    const { recipientId, recipientType } = req.body;

    const filter = {};
    const normalizedType = normalizeRecipientType(recipientType);
    const recipientTypes = resolveRecipientTypeSet(recipientType);
    const isInternOrStaff = normalizedType === 'Intern' || normalizedType === 'Staff';
    const includeAll = normalizedType && !isInternOrStaff;

    if (recipientId) {
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid recipientId format'
        });
      }
      const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
      if (isInternOrStaff) {
        filter.$or = [
          { recipientId: recipientObjectId },
          { subjectUserId: recipientObjectId }
        ];
      } else {
        filter.recipientId = recipientObjectId;
      }
    }

    if (recipientTypes) {
      const typeSet = includeAll && !recipientTypes.includes('All')
        ? [...recipientTypes, 'All']
        : recipientTypes;
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { recipientType: { $in: typeSet } }
        ];
        delete filter.$or;
      } else {
        filter.recipientType = { $in: typeSet };
      }
    }

    const result = await Notification.deleteMany(filter);

    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notifications'
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

module.exports = router;
