const express = require('express');
const mongoose = require('mongoose');
const ReportSettings = require('../models/ReportSettings');
const { sendTestEmail, getSmtpStatus } = require('../modules/autoReports/reportDelivery');
const { recordSystemEvent } = require('../utils/monitoring');

const router = express.Router();

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizePayload = (payload = {}) => {
  const recipients = {
    emails: normalizeArray(payload?.recipients?.emails || payload?.emails),
    whatsappNumbers: normalizeArray(payload?.recipients?.whatsappNumbers || payload?.whatsappNumbers),
  };

  const weekly = payload.weekly || {};
  const monthly = payload.monthly || {};
  const filters = payload.filters || {};
  const registrationTemplates = payload.registrationTemplates || {};

  return {
    timezone: payload.timezone,
    weekly: {
      enabled: weekly.enabled !== false,
      dayOfWeek: weekly.dayOfWeek ?? 5,
      time: weekly.time || '17:00',
      sendOnLastDay: weekly.sendOnLastDay !== false,
    },
    monthly: {
      enabled: monthly.enabled !== false,
      dayOfWeek: monthly.dayOfWeek ?? 5,
      time: monthly.time || '17:00',
      sendOnLastDay: monthly.sendOnLastDay !== false,
    },
    lateRule: {
      graceMinutes: payload?.lateRule?.graceMinutes ?? payload?.graceMinutes ?? 30,
      notifyOnLateClockIn: payload?.lateRule?.notifyOnLateClockIn !== false,
      notifyOnMissingClockIn: payload?.lateRule?.notifyOnMissingClockIn !== false,
    },
    recipients,
    filters: {
      departmentName: filters.departmentName || payload?.departmentName || '',
      includeAllDepartments: filters.includeAllDepartments !== false,
    },
    templates: {
      emailSubject: payload?.templates?.emailSubject,
      emailBody: payload?.templates?.emailBody,
      whatsappMessage: payload?.templates?.whatsappMessage,
      emailSignature: payload?.templates?.emailSignature,
      emailSalutation: payload?.templates?.emailSalutation,
    },
    registrationTemplates: {
      staff: {
        enabled: registrationTemplates?.staff?.enabled !== false,
        subject: registrationTemplates?.staff?.subject,
        body: registrationTemplates?.staff?.body,
      },
      hostCompany: {
        enabled: registrationTemplates?.hostCompany?.enabled !== false,
        subject: registrationTemplates?.hostCompany?.subject,
        body: registrationTemplates?.hostCompany?.body,
      },
    },
  };
};

router.get('/', async (req, res) => {
  try {
    const { ownerType, ownerId } = req.query;
    if (!ownerType || !ownerId) {
      return res.status(400).json({ success: false, error: 'ownerType and ownerId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({ success: false, error: 'Invalid ownerId' });
    }

    const settings = await ReportSettings.findOne({ ownerType, ownerId }).lean();
    if (settings) {
      return res.json({ success: true, settings });
    }

    const defaults = new ReportSettings({ ownerType, ownerId });
    return res.json({ success: true, settings: defaults.toObject() });
  } catch (error) {
    console.error('Error fetching report settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

router.get('/smtp/status', (req, res) => {
  try {
    const status = getSmtpStatus();
    return res.json({ success: true, status });
  } catch (error) {
    console.error('Error fetching SMTP status:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch SMTP status' });
  }
});

router.post('/smtp/test', async (req, res) => {
  try {
    const to = req.body?.to;
    const result = await sendTestEmail({ to });
    if (!result.sent) {
      recordSystemEvent({
        type: 'SMTP_TEST_FAILED',
        severity: 'critical',
        message: result.reason || 'SMTP test failed',
        metadata: {
          to,
          reason: result.reason,
        },
      });
      return res.status(400).json({ success: false, result });
    }
    recordSystemEvent({
      type: 'SMTP_TEST_SUCCESS',
      severity: 'info',
      message: 'SMTP test succeeded',
      metadata: {
        to,
        messageId: result.messageId,
      },
    });
    return res.json({ success: true, result });
  } catch (error) {
    console.error('Error sending SMTP test email:', error);
    return res.status(500).json({ success: false, error: 'Failed to send test email' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ownerType, ownerId } = req.body;
    if (!ownerType || !ownerId) {
      return res.status(400).json({ success: false, error: 'ownerType and ownerId are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({ success: false, error: 'Invalid ownerId' });
    }

    const payload = normalizePayload(req.body);

    const settings = await ReportSettings.findOneAndUpdate(
      { ownerType, ownerId },
      { $set: { ...payload, ownerType, ownerId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving report settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid settings id' });
    }

    const payload = normalizePayload(req.body);
    const settings = await ReportSettings.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    ).lean();

    if (!settings) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating report settings:', error);
    return res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

module.exports = router;
