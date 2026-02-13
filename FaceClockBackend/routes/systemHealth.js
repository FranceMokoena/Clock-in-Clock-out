const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const ClockLog = require('../models/ClockLog');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const DeviceInfo = require('../models/DeviceInfo');
const ReportRun = require('../models/ReportRun');
const FailedMatch = require('../models/FailedMatch');
const Staff = require('../models/Staff');
const HostCompany = require('../models/HostCompany');
const Department = require('../models/Department');
const RequestMetric = require('../models/RequestMetric');
const SystemEvent = require('../models/SystemEvent');
const SystemHealthSample = require('../models/SystemHealthSample');
const eventEmitter = require('../utils/eventEmitter');
const rekognition = require('../utils/rekognitionClient');
const faceRecognition = require('../utils/faceRecognitionONNX');
const { getSmtpStatus } = require('../modules/autoReports/reportDelivery');

const router = express.Router();

const PEAK_WINDOWS = [
  { start: '07:30', end: '08:30', label: 'Morning clock-in' },
  { start: '16:00', end: '17:30', label: 'Afternoon clock-out' },
];
const TOLERANCE_MINUTES = 15;
const MEMORY_HIGH_PERCENT = 80;
const MEMORY_HIGH_MINUTES = 10;
const DB_DISCONNECTED_MINUTES = 1;
const GEO_WINDOW_MINUTES = 30;
const REQUEST_WINDOW_MINUTES = 5;
const FACE_MATCH_AMBER = 5;
const FACE_MATCH_RED = 15;
const DUPLICATE_AMBER = 5;
const DUPLICATE_RED = 20;
const POLICY_AMBER = 5;
const POLICY_RED = 20;

const SECTIONS = [
  {
    key: 'infrastructure',
    label: 'Health & Dependencies',
    description: 'API, database, email, recognition, and geocoding checks.',
  },
  {
    key: 'dataIntegrity',
    label: 'Data Integrity',
    description: 'Clock sequence integrity, missing clock-outs, and orphans.',
  },
  {
    key: 'businessLogic',
    label: 'Business Logic',
    description: 'Not-accountable events, policy violations, and device trust.',
  },
  {
    key: 'operationalReliability',
    label: 'Operational Reliability',
    description: 'Latency, error rates, and timeouts for critical APIs.',
  },
  {
    key: 'backgroundJobs',
    label: 'Background Jobs & Reports',
    description: 'Report runs, scheduler heartbeat, and delivery failures.',
  },
  {
    key: 'mobileAppHealth',
    label: 'Mobile App Health',
    description: 'Clock API performance and connection stability.',
  },
];

const STATUS_RANK = {
  UNKNOWN: 0,
  OK: 1,
  AMBER: 2,
  RED: 3,
};

const dbStateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const dbStateTracker = {
  state: mongoose.connection.readyState,
  changedAt: new Date(),
};

if (!mongoose.connection.__systemHealthListenerAttached) {
  mongoose.connection.__systemHealthListenerAttached = true;
  const update = (state) => {
    dbStateTracker.state = state;
    dbStateTracker.changedAt = new Date();
  };
  mongoose.connection.on('connected', () => update(1));
  mongoose.connection.on('disconnected', () => update(0));
  mongoose.connection.on('connecting', () => update(2));
  mongoose.connection.on('disconnecting', () => update(3));
}

const parseIntSafe = (value, defaultValue) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;
  return parsed;
};

const toMinutes = (timeString) => {
  if (!timeString) return null;
  const parts = timeString.split(':');
  if (parts.length !== 2) return null;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const isWithinWindow = (date, window) => {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = toMinutes(window.start);
  const end = toMinutes(window.end);
  if (start === null || end === null) return false;
  return minutes >= start && minutes <= end;
};

const pickWorstStatus = (statuses = []) => {
  if (!statuses.length) return 'UNKNOWN';
  return statuses.reduce((worst, current) => {
    const rank = STATUS_RANK[current] ?? 0;
    const worstRank = STATUS_RANK[worst] ?? 0;
    return rank > worstRank ? current : worst;
  }, 'UNKNOWN');
};

const buildSectionSummary = (checks) => {
  const summary = {};
  SECTIONS.forEach((section) => {
    const sectionChecks = checks.filter((check) => check.section === section.key);
    const statuses = sectionChecks.map((check) => check.status);
    const status = pickWorstStatus(statuses);
    let reason = 'No checks available';
    if (status === 'OK') {
      reason = 'All checks healthy';
    } else if (status !== 'UNKNOWN') {
      const worstCheck = sectionChecks.find((check) => check.status === status);
      reason = worstCheck?.detail || 'Attention required';
    }
    summary[section.key] = {
      status,
      reason,
      metrics: {
        checks: sectionChecks.length,
      },
    };
  });
  return summary;
};

const computeRequestStats = (metrics, pathPrefix) => {
  const list = metrics.filter((metric) => metric.path.startsWith(pathPrefix));
  if (!list.length) {
    return {
      count: 0,
      errorRate: null,
      timeoutCount: 0,
      averageMs: null,
      p95Ms: null,
    };
  }

  const durations = list.map((metric) => metric.durationMs).filter((value) => Number.isFinite(value));
  durations.sort((a, b) => a - b);

  const count = list.length;
  const errorCount = list.filter((metric) => metric.outcome === 'error' || metric.statusCode >= 500).length;
  const timeoutCount = list.filter((metric) => metric.outcome === 'timeout').length;
  const sum = durations.reduce((acc, value) => acc + value, 0);
  const averageMs = durations.length ? sum / durations.length : null;
  const p95Index = durations.length ? Math.max(0, Math.ceil(durations.length * 0.95) - 1) : null;
  const p95Ms = p95Index !== null ? durations[p95Index] : null;
  const errorRate = count > 0 ? (errorCount / count) * 100 : null;

  return {
    count,
    errorRate,
    timeoutCount,
    averageMs,
    p95Ms,
  };
};

const getWorkingHours = (staff, hostDefaults) => {
  if (staff.clockInTime && staff.clockOutTime) {
    return {
      clockIn: toMinutes(staff.clockInTime),
      clockOut: toMinutes(staff.clockOutTime),
      breakStart: toMinutes(staff.breakStartTime),
      breakEnd: toMinutes(staff.breakEndTime),
      source: 'staff',
    };
  }
  const hostId = staff.hostCompanyId?.toString?.();
  const host = hostId ? hostDefaults[hostId] : null;
  if (host?.defaultClockInTime && host?.defaultClockOutTime) {
    return {
      clockIn: toMinutes(host.defaultClockInTime),
      clockOut: toMinutes(host.defaultClockOutTime),
      breakStart: toMinutes(host.defaultBreakStartTime),
      breakEnd: toMinutes(host.defaultBreakEndTime),
      source: 'hostCompany',
    };
  }
  return null;
};

router.get('/', async (req, res) => {
  try {
    const { hostCompanyId, windowMinutes } = req.query;
    const now = new Date();
    const lookbackMinutes = parseIntSafe(windowMinutes, 60);
    const windowStart = new Date(now.getTime() - lookbackMinutes * 60 * 1000);
    const requestWindowStart = new Date(now.getTime() - REQUEST_WINDOW_MINUTES * 60 * 1000);
    const geoWindowStart = new Date(now.getTime() - GEO_WINDOW_MINUTES * 60 * 1000);
    const memoryWindowStart = new Date(now.getTime() - MEMORY_HIGH_MINUTES * 60 * 1000);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const hostFilter = {};
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ success: false, error: 'Invalid hostCompanyId' });
      }
      hostFilter.hostCompanyId = new mongoose.Types.ObjectId(hostCompanyId);
    }

    const staffFilter = { isActive: true, ...(hostFilter.hostCompanyId ? { hostCompanyId: hostFilter.hostCompanyId } : {}) };
    const staffPromise = Staff.find(staffFilter)
      .select('_id name role department hostCompanyId clockInTime clockOutTime breakStartTime breakEndTime')
      .lean();

    const activeDevicesPromise = DeviceInfo.countDocuments({
      isActive: true,
      ...(hostFilter.hostCompanyId ? { hostCompanyId: hostFilter.hostCompanyId } : {}),
    });

    const pendingDevicesPromise = Staff.aggregate([
      { $match: staffFilter },
      { $unwind: '$trustedDevices' },
      { $match: { 'trustedDevices.status': 'pending' } },
      { $count: 'pendingDevices' },
    ]);

    const reportRunsPromise = ReportRun.find({
      createdAt: { $gte: last24h },
      ...(hostFilter.hostCompanyId ? { ownerType: 'HostCompany', ownerId: hostFilter.hostCompanyId } : {}),
    }).lean();

    const reportRunsAllPromise = ReportRun.find({
      ...(hostFilter.hostCompanyId ? { ownerType: 'HostCompany', ownerId: hostFilter.hostCompanyId } : {}),
    }).sort({ createdAt: -1 }).limit(1).lean();

    const lastSuccessPromise = ReportRun.findOne({
      status: { $in: ['sent', 'generated'] },
      ...(hostFilter.hostCompanyId ? { ownerType: 'HostCompany', ownerId: hostFilter.hostCompanyId } : {}),
    }).sort({ createdAt: -1 }).lean();

    const failedMatchesPromise = FailedMatch.countDocuments({
      timestamp: { $gte: windowStart },
    });

    const smtpStatus = getSmtpStatus();
    const smtpLastTestPromise = SystemEvent.findOne({
      type: { $in: ['SMTP_TEST_SUCCESS', 'SMTP_TEST_FAILED'] },
    }).sort({ createdAt: -1 }).lean();

    const duplicateEventsPromise = SystemEvent.find({
      type: 'DUPLICATE_CLOCK_ATTEMPT',
      createdAt: { $gte: last24h },
      ...(hostFilter.hostCompanyId ? { hostCompanyId: hostFilter.hostCompanyId } : {}),
    }).select('staffId deviceFingerprint').lean();

    const policyEventsPromise = SystemEvent.find({
      type: { $in: ['DUPLICATE_CLOCK_ATTEMPT', 'TIME_POLICY_WARNING'] },
      createdAt: { $gte: last24h },
      ...(hostFilter.hostCompanyId ? { hostCompanyId: hostFilter.hostCompanyId } : {}),
    }).select('staffId type').lean();

    const deviceTrustEventsPromise = SystemEvent.countDocuments({
      type: 'DEVICE_TRUST_FAILED',
      createdAt: { $gte: last24h },
      ...(hostFilter.hostCompanyId ? { hostCompanyId: hostFilter.hostCompanyId } : {}),
    });

    const geocodeEventsPromise = SystemEvent.find({
      type: { $in: ['GEOCODE_SUCCESS', 'GEOCODE_FAILURE'] },
      createdAt: { $gte: geoWindowStart },
    }).select('type').lean();

    const locationFailuresPromise = SystemEvent.countDocuments({
      type: { $in: ['LOCATION_VALIDATION_FAILED', 'LOCATION_CONFIG_MISSING'] },
      createdAt: { $gte: geoWindowStart },
      ...(hostFilter.hostCompanyId ? { hostCompanyId: hostFilter.hostCompanyId } : {}),
    });

    const requestMetricsPromise = RequestMetric.find({
      createdAt: { $gte: requestWindowStart },
    }).select('path statusCode durationMs outcome').lean();

    const memorySamplesPromise = SystemHealthSample.find({
      createdAt: { $gte: memoryWindowStart },
    }).select('memoryPercent').lean();

    const orphanedClockLogsPromise = ClockLog.countDocuments({
      $or: [{ staffId: { $exists: false } }, { staffId: null }],
    });

    const orphanedCorrectionsPromise = AttendanceCorrection.countDocuments({
      $or: [{ internId: { $exists: false } }, { internId: null }],
    });

    const [
      staffList,
      activeDevices,
      pendingDevicesAgg,
      reportRuns,
      reportRunsAll,
      lastSuccessRun,
      failedMatchesLastWindow,
      smtpLastTest,
      duplicateEvents,
      policyEvents,
      deviceTrustFailures,
      geocodeEvents,
      locationFailures,
      requestMetrics,
      memorySamples,
      orphanedClockLogs,
      orphanedCorrections,
    ] = await Promise.all([
      staffPromise,
      activeDevicesPromise,
      pendingDevicesPromise,
      reportRunsPromise,
      reportRunsAllPromise,
      lastSuccessPromise,
      failedMatchesPromise,
      smtpLastTestPromise,
      duplicateEventsPromise,
      policyEventsPromise,
      deviceTrustEventsPromise,
      geocodeEventsPromise,
      locationFailuresPromise,
      requestMetricsPromise,
      memorySamplesPromise,
      orphanedClockLogsPromise,
      orphanedCorrectionsPromise,
    ]);

    const staffIds = staffList.map((staff) => staff._id);
    const logs = staffIds.length
      ? await ClockLog.find({
          staffId: { $in: staffIds },
          timestamp: { $gte: dayStart, $lt: dayEnd },
        }).select('staffId clockType timestamp').lean()
      : [];

    const hostCompanyIds = [...new Set(staffList.map((staff) => staff.hostCompanyId).filter(Boolean))];
    const hostDefaults = {};
    if (hostCompanyIds.length) {
      const hostCompanies = await HostCompany.find({ _id: { $in: hostCompanyIds } })
        .select('_id defaultClockInTime defaultClockOutTime defaultBreakStartTime defaultBreakEndTime')
        .lean();
      hostCompanies.forEach((company) => {
        hostDefaults[company._id.toString()] = company;
      });
    }

    const departmentIds = [...new Set(
      staffList
        .map((staff) => (typeof staff.department === 'string' ? staff.department : null))
        .filter((dept) => dept && mongoose.Types.ObjectId.isValid(dept))
    )];
    const departmentNameMap = {};
    if (departmentIds.length) {
      const departments = await Department.find({ _id: { $in: departmentIds } })
        .select('_id name')
        .lean();
      departments.forEach((dept) => {
        departmentNameMap[dept._id.toString()] = dept.name;
      });
    }

    const logsByStaff = new Map();
    logs.forEach((log) => {
      const staffId = log.staffId?.toString();
      if (!staffId) return;
      if (!logsByStaff.has(staffId)) {
        logsByStaff.set(staffId, []);
      }
      logsByStaff.get(staffId).push(log);
    });

    const staffStats = {
      activeStaffCount: staffList.length,
      missingClockOutCount: 0,
      missingInWithOutCount: 0,
      duplicateInOutCount: 0,
      outOfRangeCount: 0,
      breakSequenceIssues: 0,
      sequenceIssueStaffCount: 0,
      notAccountableCount: 0,
      notAccountableDepartments: {},
    };

    const toleranceMinutes = TOLERANCE_MINUTES;

    staffList.forEach((staff) => {
      const staffId = staff._id.toString();
      const staffLogs = logsByStaff.get(staffId) || [];
      const counts = {
        in: 0,
        out: 0,
        break_start: 0,
        break_end: 0,
      };

      staffLogs.forEach((log) => {
        if (counts[log.clockType] !== undefined) {
          counts[log.clockType] += 1;
        }
      });

      const hasIn = counts.in > 0;
      const hasOut = counts.out > 0;
      if (hasIn && !hasOut) staffStats.missingClockOutCount += 1;
      if (!hasIn && hasOut) staffStats.missingInWithOutCount += 1;
      if (counts.in > 1 || counts.out > 1) staffStats.duplicateInOutCount += 1;
      if (counts.break_end > 0 && counts.break_start === 0) staffStats.breakSequenceIssues += 1;

      const workingHours = getWorkingHours(staff, hostDefaults);
      let outOfRange = false;
      let notAccountable = false;

      const getExpected = (minutes) => {
        if (minutes === null || minutes === undefined) return null;
        const expected = new Date(dayStart);
        expected.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        return expected;
      };

      const checkLogTime = (log, expectedMinutes, allowEarly = true) => {
        if (!log || expectedMinutes === null || expectedMinutes === undefined) return;
        const expected = getExpected(expectedMinutes);
        if (!expected) return;
        const diffMinutes = (new Date(log.timestamp) - expected) / (1000 * 60);
        if (Math.abs(diffMinutes) > toleranceMinutes) {
          outOfRange = true;
        }
        if (diffMinutes > toleranceMinutes) {
          notAccountable = true;
        }
        if (!allowEarly && diffMinutes < -toleranceMinutes) {
          outOfRange = true;
        }
      };

      if (workingHours) {
        const clockInLog = staffLogs.find((log) => log.clockType === 'in');
        const clockOutLog = staffLogs.find((log) => log.clockType === 'out');
        const breakStartLog = staffLogs.find((log) => log.clockType === 'break_start');
        const breakEndLog = staffLogs.find((log) => log.clockType === 'break_end');

        if (!clockInLog) {
          notAccountable = true;
        }

        if (clockInLog) {
          checkLogTime(clockInLog, workingHours.clockIn, true);
        }
        if (clockOutLog) {
          checkLogTime(clockOutLog, workingHours.clockOut, true);
        }
        if (breakStartLog) {
          checkLogTime(breakStartLog, workingHours.breakStart, true);
        }
        if (breakEndLog) {
          checkLogTime(breakEndLog, workingHours.breakEnd, true);
        }
      }

      if (outOfRange) staffStats.outOfRangeCount += 1;
      if (
        (!hasIn && hasOut)
        || counts.in > 1
        || counts.out > 1
        || outOfRange
        || (counts.break_end > 0 && counts.break_start === 0)
      ) {
        staffStats.sequenceIssueStaffCount += 1;
      }

      if (notAccountable) {
        staffStats.notAccountableCount += 1;
        const deptId = staff.department?.toString?.();
        const deptName = departmentNameMap[deptId] || staff.department || 'Unknown';
        staffStats.notAccountableDepartments[deptName] = (staffStats.notAccountableDepartments[deptName] || 0) + 1;
      }
    });

    const missingClockOutPercent = staffStats.activeStaffCount
      ? (staffStats.missingClockOutCount / staffStats.activeStaffCount) * 100
      : null;
    const notAccountablePercent = staffStats.activeStaffCount
      ? (staffStats.notAccountableCount / staffStats.activeStaffCount) * 100
      : null;

    const duplicateByStaff = new Map();
    duplicateEvents.forEach((event) => {
      const staffId = event.staffId?.toString() || 'unknown';
      duplicateByStaff.set(staffId, (duplicateByStaff.get(staffId) || 0) + 1);
    });
    const duplicateTotals = duplicateEvents.length;
    const maxDuplicateByStaff = duplicateByStaff.size
      ? Math.max(...Array.from(duplicateByStaff.values()))
      : 0;

    const policyByStaff = new Map();
    policyEvents.forEach((event) => {
      const staffId = event.staffId?.toString() || 'unknown';
      policyByStaff.set(staffId, (policyByStaff.get(staffId) || 0) + 1);
    });
    const policyTotals = policyEvents.length;
    const maxPolicyByStaff = policyByStaff.size
      ? Math.max(...Array.from(policyByStaff.values()))
      : 0;

    const geocodeAttempts = geocodeEvents.length;
    const geocodeFailures = geocodeEvents.filter((event) => event.type === 'GEOCODE_FAILURE').length;
    const geocodeFailureRate = geocodeAttempts > 0 ? (geocodeFailures / geocodeAttempts) * 100 : null;

    const pendingDevices = pendingDevicesAgg.length ? pendingDevicesAgg[0].pendingDevices : 0;
    const inPeakWindow = PEAK_WINDOWS.some((window) => isWithinWindow(now, window));

    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const memoryPercent = totalMemory > 0 ? (memoryUsage.rss / totalMemory) * 100 : null;
    const memoryHighSamples = memorySamples.filter((sample) => (sample.memoryPercent || 0) >= MEMORY_HIGH_PERCENT);
    const memoryHighForDuration = memorySamples.length >= MEMORY_HIGH_MINUTES
      && memoryHighSamples.length >= MEMORY_HIGH_MINUTES;

    const apiConnections = eventEmitter.getActiveConnections();
    const dbState = dbStateTracker.state;
    const dbStateDurationMinutes = (now - dbStateTracker.changedAt) / (1000 * 60);

    const onnxStatus = faceRecognition.getModelStatus ? faceRecognition.getModelStatus() : { loaded: true, error: null };
    const rekognitionConfigured = rekognition.isConfigured();
    let rekognitionValid = null;
    if (rekognitionConfigured) {
      await rekognition.validateCredentials().catch(() => {});
      const validationStatus = rekognition.getValidationStatus ? rekognition.getValidationStatus() : null;
      rekognitionValid = validationStatus ? validationStatus.valid : null;
    }

    const smtpConfigured = smtpStatus.configured;
    const smtpLastTestStatus = smtpLastTest?.type === 'SMTP_TEST_FAILED'
      ? 'failed'
      : smtpLastTest?.type === 'SMTP_TEST_SUCCESS'
        ? 'success'
        : 'unknown';

    const requestStatsClock = computeRequestStats(requestMetrics, '/api/staff/clock');
    const requestStatsNotifications = computeRequestStats(requestMetrics, '/api/notifications');

    const checks = [];
    const pushCheck = (section, label, status, detail, metrics = {}) => {
      checks.push({
        section,
        label,
        status,
        detail,
        metrics,
      });
    };

    let apiHealthStatus = 'OK';
    let apiHealthDetail = 'API responding normally';
    if (dbState !== 1) {
      apiHealthStatus = 'RED';
      apiHealthDetail = `API health degraded (database ${dbStateMap[dbState] || 'unknown'})`;
    } else if (inPeakWindow && apiConnections === 0) {
      apiHealthStatus = 'RED';
      apiHealthDetail = 'Websocket connections are 0 during peak usage';
    } else if (memoryHighForDuration) {
      apiHealthStatus = 'AMBER';
      apiHealthDetail = `Memory above ${MEMORY_HIGH_PERCENT}% for ${MEMORY_HIGH_MINUTES} minutes`;
    }
    pushCheck('infrastructure', 'API health', apiHealthStatus, apiHealthDetail, {
      memoryPercent: memoryPercent ? Number(memoryPercent.toFixed(1)) : null,
      memoryHighSamples: memoryHighSamples.length,
      websocketConnections: apiConnections,
      peakWindow: inPeakWindow ? 'active' : 'off',
    });

    let dbStatus = 'OK';
    let dbDetail = 'Database connected';
    if (dbState !== 1 && dbStateDurationMinutes > DB_DISCONNECTED_MINUTES) {
      dbStatus = 'RED';
      dbDetail = `Database ${dbStateMap[dbState] || 'unknown'} for ${dbStateDurationMinutes.toFixed(1)} minutes`;
    } else if (dbState !== 1) {
      dbStatus = 'AMBER';
      dbDetail = `Database ${dbStateMap[dbState] || 'unknown'} for ${dbStateDurationMinutes.toFixed(1)} minutes`;
    }
    pushCheck('infrastructure', 'Database connection', dbStatus, dbDetail, {
      state: dbStateMap[dbState] || 'unknown',
      minutesInState: Number(dbStateDurationMinutes.toFixed(1)),
    });

    let smtpStatusLevel = 'OK';
    let smtpDetail = 'SMTP configured and healthy';
    if (!smtpConfigured) {
      smtpStatusLevel = 'AMBER';
      smtpDetail = 'SMTP not configured';
    } else if (smtpLastTestStatus === 'failed') {
      smtpStatusLevel = 'RED';
      smtpDetail = 'SMTP configured but last test failed';
    } else if (smtpLastTestStatus === 'unknown') {
      smtpStatusLevel = 'AMBER';
      smtpDetail = 'SMTP configured but no test recorded';
    }
    pushCheck('infrastructure', 'SMTP / Email', smtpStatusLevel, smtpDetail, {
      configured: smtpConfigured,
      lastTestStatus: smtpLastTestStatus,
      lastTestAt: smtpLastTest?.createdAt || null,
    });

    let faceStatus = 'OK';
    let faceDetail = 'Face recognition healthy';
    if (!onnxStatus.loaded) {
      faceStatus = 'RED';
      faceDetail = onnxStatus.error || 'ONNX models not loaded';
    } else if (failedMatchesLastWindow >= FACE_MATCH_RED) {
      faceStatus = 'RED';
      faceDetail = `${failedMatchesLastWindow} failed matches in last ${lookbackMinutes} minutes`;
    } else if (failedMatchesLastWindow >= FACE_MATCH_AMBER) {
      faceStatus = 'AMBER';
      faceDetail = `${failedMatchesLastWindow} failed matches in last ${lookbackMinutes} minutes`;
    }
    pushCheck('infrastructure', 'Face recognition', faceStatus, faceDetail, {
      onnxLoaded: onnxStatus.loaded,
      rekognitionConfigured,
      rekognitionValid,
      failedMatchesLastWindow,
    });

    let geoStatus = 'OK';
    let geoDetail = 'Geocoding stable';
    if (geocodeFailureRate !== null && geocodeFailureRate > 5) {
      geoStatus = 'RED';
      geoDetail = `Geocoding failures ${geocodeFailureRate.toFixed(1)}% in last ${GEO_WINDOW_MINUTES} minutes`;
    } else if (locationFailures > 5) {
      geoStatus = 'AMBER';
      geoDetail = 'Location validation failures spiking';
    } else if (geocodeFailureRate === null) {
      geoStatus = 'UNKNOWN';
      geoDetail = 'No geocoding activity in window';
    }
    pushCheck('infrastructure', 'Geocoding / Location', geoStatus, geoDetail, {
      geocodeAttempts,
      geocodeFailures,
      geocodeFailureRate: geocodeFailureRate !== null ? Number(geocodeFailureRate.toFixed(1)) : null,
      locationFailures,
    });

    let sequenceStatus = 'OK';
    let sequenceDetail = 'Clock sequences look valid';
    if (staffStats.sequenceIssueStaffCount > 0) {
      sequenceStatus = 'RED';
      sequenceDetail = `${staffStats.sequenceIssueStaffCount} staff with sequence issues today`;
    }
    pushCheck('dataIntegrity', 'Clock sequence integrity', sequenceStatus, sequenceDetail, {
      staffWithIssues: staffStats.sequenceIssueStaffCount,
      missingInWithOut: staffStats.missingInWithOutCount,
      duplicateInOut: staffStats.duplicateInOutCount,
      outsideAllowedRange: staffStats.outOfRangeCount,
      breakEndWithoutStart: staffStats.breakSequenceIssues,
    });

    let missingOutStatus = 'OK';
    let missingOutDetail = 'Missing clock-outs within tolerance';
    if (missingClockOutPercent === null) {
      missingOutStatus = 'UNKNOWN';
      missingOutDetail = 'No staff activity for today';
    } else if (missingClockOutPercent > 10) {
      missingOutStatus = 'RED';
      missingOutDetail = `Missing clock-outs at ${missingClockOutPercent.toFixed(1)}%`;
    } else if (missingClockOutPercent > 3) {
      missingOutStatus = 'AMBER';
      missingOutDetail = `Missing clock-outs at ${missingClockOutPercent.toFixed(1)}%`;
    }
    pushCheck('dataIntegrity', 'Missing clock-outs', missingOutStatus, missingOutDetail, {
      missingClockOutCount: staffStats.missingClockOutCount,
      missingClockOutPercent: missingClockOutPercent !== null ? Number(missingClockOutPercent.toFixed(1)) : null,
      activeStaff: staffStats.activeStaffCount,
    });

    let duplicateStatus = 'OK';
    let duplicateDetail = 'No duplicate attempts in last 24h';
    if (duplicateTotals >= DUPLICATE_RED || maxDuplicateByStaff >= 3) {
      duplicateStatus = 'RED';
      duplicateDetail = `Duplicate attempts ${duplicateTotals} in last 24h`;
    } else if (duplicateTotals >= DUPLICATE_AMBER) {
      duplicateStatus = 'AMBER';
      duplicateDetail = `Duplicate attempts ${duplicateTotals} in last 24h`;
    }
    pushCheck('dataIntegrity', 'Duplicate action attempts', duplicateStatus, duplicateDetail, {
      duplicateAttempts: duplicateTotals,
      maxPerStaff: maxDuplicateByStaff,
    });

    let orphanStatus = 'OK';
    let orphanDetail = 'No orphaned records detected';
    if (orphanedClockLogs > 0 || orphanedCorrections > 0) {
      orphanStatus = 'RED';
      orphanDetail = 'Orphaned records detected';
    }
    pushCheck('dataIntegrity', 'Orphaned records', orphanStatus, orphanDetail, {
      orphanedClockLogs,
      orphanedCorrections,
    });

    let notAccountableStatus = 'OK';
    let notAccountableDetail = 'Not-accountable levels normal';
    let topDepartment = null;
    if (notAccountablePercent === null) {
      notAccountableStatus = 'UNKNOWN';
      notAccountableDetail = 'No staff activity for today';
    } else {
      const deptEntries = Object.entries(staffStats.notAccountableDepartments);
      if (deptEntries.length) {
        deptEntries.sort((a, b) => b[1] - a[1]);
        const [deptName, count] = deptEntries[0];
        topDepartment = { name: deptName, count };
        if (count >= 5 && count / staffStats.notAccountableCount >= 0.5) {
          notAccountableStatus = 'RED';
          notAccountableDetail = `Repeated issues in ${deptName}`;
        }
      }
      if (notAccountablePercent > 15) {
        notAccountableStatus = 'RED';
        notAccountableDetail = `Not-accountable at ${notAccountablePercent.toFixed(1)}%`;
      } else if (notAccountablePercent >= 5) {
        notAccountableStatus = 'AMBER';
        notAccountableDetail = `Not-accountable at ${notAccountablePercent.toFixed(1)}%`;
      }
    }
    pushCheck('businessLogic', 'Not-accountable events', notAccountableStatus, notAccountableDetail, {
      notAccountableCount: staffStats.notAccountableCount,
      notAccountablePercent: notAccountablePercent !== null ? Number(notAccountablePercent.toFixed(1)) : null,
      topDepartment: topDepartment ? `${topDepartment.name} (${topDepartment.count})` : null,
    });

    let policyStatus = 'OK';
    let policyDetail = 'No policy violations detected';
    if (policyTotals >= POLICY_RED || maxPolicyByStaff >= 3) {
      policyStatus = 'RED';
      policyDetail = `Policy violations ${policyTotals} in last 24h`;
    } else if (policyTotals >= POLICY_AMBER) {
      policyStatus = 'AMBER';
      policyDetail = `Policy violations ${policyTotals} in last 24h`;
    }
    pushCheck('businessLogic', 'Policy violations', policyStatus, policyDetail, {
      policyViolations: policyTotals,
      maxPerStaff: maxPolicyByStaff,
    });

    let deviceTrustStatus = 'OK';
    let deviceTrustDetail = 'Device trust stable';
    if (deviceTrustFailures > 10) {
      deviceTrustStatus = 'RED';
      deviceTrustDetail = `${deviceTrustFailures} unapproved device attempts in last 24h`;
    } else if (pendingDevices > 20) {
      deviceTrustStatus = 'AMBER';
      deviceTrustDetail = `${pendingDevices} pending device approvals`;
    }
    pushCheck('businessLogic', 'Device trust failures', deviceTrustStatus, deviceTrustDetail, {
      pendingApprovals: pendingDevices,
      unapprovedAttempts: deviceTrustFailures,
      activeDevices,
    });

    let latencyStatus = 'OK';
    let latencyDetail = 'Request latency within limits';
    const latencyRed = [requestStatsClock, requestStatsNotifications].some(
      (stats) => (stats.averageMs || 0) > 15000 || (stats.p95Ms || 0) > 30000
    );
    const latencyAmber = [requestStatsClock, requestStatsNotifications].some(
      (stats) => (stats.averageMs || 0) > 5000
    );
    if (latencyRed) {
      latencyStatus = 'RED';
      latencyDetail = 'Latency exceeds critical thresholds';
    } else if (latencyAmber) {
      latencyStatus = 'AMBER';
      latencyDetail = 'Latency above 5 seconds average';
    }
    pushCheck('operationalReliability', 'Request latency', latencyStatus, latencyDetail, {
      clockAvgMs: requestStatsClock.averageMs ? Math.round(requestStatsClock.averageMs) : null,
      clockP95Ms: requestStatsClock.p95Ms ? Math.round(requestStatsClock.p95Ms) : null,
      notificationsAvgMs: requestStatsNotifications.averageMs ? Math.round(requestStatsNotifications.averageMs) : null,
      notificationsP95Ms: requestStatsNotifications.p95Ms ? Math.round(requestStatsNotifications.p95Ms) : null,
    });

    let errorStatus = 'OK';
    let errorDetail = 'Error rates within limits';
    const errorRateRed = [requestStatsClock, requestStatsNotifications].some(
      (stats) => (stats.errorRate || 0) > 5
    );
    const errorRateAmber = [requestStatsClock, requestStatsNotifications].some(
      (stats) => (stats.errorRate || 0) > 2
    );
    if (errorRateRed) {
      errorStatus = 'RED';
      errorDetail = 'Error rates above 5%';
    } else if (errorRateAmber) {
      errorStatus = 'AMBER';
      errorDetail = 'Error rates above 2%';
    }
    pushCheck('operationalReliability', 'Error rate', errorStatus, errorDetail, {
      clockErrorRate: requestStatsClock.errorRate !== null ? Number(requestStatsClock.errorRate.toFixed(1)) : null,
      notificationsErrorRate: requestStatsNotifications.errorRate !== null ? Number(requestStatsNotifications.errorRate.toFixed(1)) : null,
    });

    let timeoutStatus = 'OK';
    let timeoutDetail = 'No timeouts detected';
    const timeoutCount = requestStatsClock.timeoutCount + requestStatsNotifications.timeoutCount;
    if (timeoutCount > 0) {
      timeoutStatus = 'RED';
      timeoutDetail = `${timeoutCount} timeouts in last ${REQUEST_WINDOW_MINUTES} minutes`;
    }
    pushCheck('operationalReliability', 'Timeouts', timeoutStatus, timeoutDetail, {
      clockTimeouts: requestStatsClock.timeoutCount,
      notificationsTimeouts: requestStatsNotifications.timeoutCount,
    });

    const reportFailures = reportRuns.filter((run) => run.status === 'failed');
    const reportFailurePercent = reportRuns.length
      ? (reportFailures.length / reportRuns.length) * 100
      : null;
    const lastRunAt = reportRunsAll.length ? reportRunsAll[0].createdAt : null;
    const lastSuccessAt = lastSuccessRun?.createdAt || null;

    let reportStatus = 'OK';
    let reportDetail = 'Report runs healthy';
    if (reportFailures.length >= 3) {
      reportStatus = 'RED';
      reportDetail = `${reportFailures.length} failed runs in last 24h`;
    } else if (reportFailures.length >= 1) {
      reportStatus = 'AMBER';
      reportDetail = `${reportFailures.length} failed run(s) in last 24h`;
    }
    pushCheck('backgroundJobs', 'Report runs', reportStatus, reportDetail, {
      totalRuns24h: reportRuns.length,
      failedRuns24h: reportFailures.length,
      failurePercent: reportFailurePercent !== null ? Number(reportFailurePercent.toFixed(1)) : null,
    });

    let schedulerStatus = 'OK';
    let schedulerDetail = 'Scheduler heartbeat healthy';
    if (!lastRunAt) {
      schedulerStatus = 'RED';
      schedulerDetail = 'No report run recorded yet';
    } else if (lastRunAt < last7d) {
      schedulerStatus = 'RED';
      schedulerDetail = 'No report run created in 7 days';
    }
    pushCheck('backgroundJobs', 'Scheduler heartbeat', schedulerStatus, schedulerDetail, {
      lastRunAt,
    });

    let deliveryStatus = 'OK';
    let deliveryDetail = 'Delivery success within limits';
    if (reportFailurePercent !== null && reportFailurePercent > 20) {
      deliveryStatus = 'RED';
      deliveryDetail = `Delivery failures ${reportFailurePercent.toFixed(1)}% in 24h`;
    }
    if (!lastSuccessAt || lastSuccessAt < last7d) {
      deliveryStatus = 'RED';
      deliveryDetail = 'No successful report run in 7 days';
    }
    pushCheck('backgroundJobs', 'Delivery', deliveryStatus, deliveryDetail, {
      lastSuccessAt,
      failurePercent24h: reportFailurePercent !== null ? Number(reportFailurePercent.toFixed(1)) : null,
    });

    let mobileStatus = 'OK';
    let mobileDetail = 'Mobile clock endpoint healthy';
    if (requestStatsClock.timeoutCount > 0 || (requestStatsClock.errorRate || 0) > 5) {
      mobileStatus = 'RED';
      mobileDetail = 'Clock API experiencing failures/timeouts';
    } else if ((requestStatsClock.errorRate || 0) > 2 || (requestStatsClock.averageMs || 0) > 5000) {
      mobileStatus = 'AMBER';
      mobileDetail = 'Clock API degraded';
    } else if (!requestStatsClock.count) {
      mobileStatus = 'UNKNOWN';
      mobileDetail = 'No clock traffic in last 5 minutes';
    }
    pushCheck('mobileAppHealth', 'Clock API health', mobileStatus, mobileDetail, {
      requests: requestStatsClock.count,
      errorRate: requestStatsClock.errorRate !== null ? Number(requestStatsClock.errorRate.toFixed(1)) : null,
      averageMs: requestStatsClock.averageMs ? Math.round(requestStatsClock.averageMs) : null,
      p95Ms: requestStatsClock.p95Ms ? Math.round(requestStatsClock.p95Ms) : null,
      timeouts: requestStatsClock.timeoutCount,
    });

    const summary = buildSectionSummary(checks);

    res.json({
      success: true,
      evaluatedAt: now,
      scope: hostFilter.hostCompanyId ? { hostCompanyId: hostFilter.hostCompanyId } : { scope: 'global' },
      windowMinutes: lookbackMinutes,
      sections: SECTIONS,
      summary,
      checks,
    });
  } catch (error) {
    console.error('Error in /api/system-health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate system health',
    });
  }
});

module.exports = router;
