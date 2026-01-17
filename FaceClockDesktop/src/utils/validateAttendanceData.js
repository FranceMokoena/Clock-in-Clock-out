/**
 * Data Validation for Attendance Records
 * Ensures integrity of clock logs before analysis
 * 
 * Validates:
 * - Required fields exist and are correct type
 * - Timestamp consistency and timezone handling
 * - Clock-out completeness
 * - Overlapping sessions
 * - Data consistency
 */

// Required fields for a valid clock log record
const REQUIRED_FIELDS = [
  'staffId',      // Staff identifier
  'clockInTime',  // Clock-in timestamp
  'hostCompany',  // Company identifier
];

// Optional but important fields
const OPTIONAL_FIELDS = [
  'clockOutTime', // Clock-out timestamp (may be null for ongoing sessions)
  'deviceId',     // Device used for clock-in
  'deviceId',     // Device quality metrics
  'supervisorStatus', // Supervisor validation status
];

/**
 * Validate a single clock log record
 * @param {Object} log - Clock log object
 * @param {Object} options - Validation options
 * @returns {Object} - {valid: boolean, errors: string[], warnings: string[]}
 */
export function validateClockLog(log, options = {}) {
  const {
    requireClockOut = false,
    allowFutureTimestamps = false,
  } = options;

  const errors = [];
  const warnings = [];

  if (!log || typeof log !== 'object') {
    return {
      valid: false,
      errors: ['Clock log must be a valid object'],
      warnings: [],
    };
  }

  // Check required fields
  REQUIRED_FIELDS.forEach((field) => {
    if (!log[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate timestamps
  if (log.clockInTime) {
    const clockInDate = new Date(log.clockInTime);
    if (isNaN(clockInDate.getTime())) {
      errors.push('clockInTime is not a valid timestamp');
    } else if (!allowFutureTimestamps && clockInDate > new Date()) {
      warnings.push('Clock-in time is in the future');
    }
  }

  if (log.clockOutTime) {
    const clockOutDate = new Date(log.clockOutTime);
    if (isNaN(clockOutDate.getTime())) {
      errors.push('clockOutTime is not a valid timestamp');
    } else if (!allowFutureTimestamps && clockOutDate > new Date()) {
      warnings.push('Clock-out time is in the future');
    }

    // Clock-out must be after clock-in
    if (log.clockInTime && log.clockOutTime) {
      const clockInDate = new Date(log.clockInTime);
      if (clockOutDate <= clockInDate) {
        errors.push('Clock-out time must be after clock-in time');
      }
    }
  } else if (requireClockOut) {
    errors.push('Clock-out time is missing and required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an array of clock logs
 * @param {Array} logs - Array of clock log objects
 * @param {Object} options - Validation options
 * @returns {Object} - {valid: boolean, validLogs: Array, invalidLogs: Array, duplicates: Array, overlaps: Array}
 */
export function validateClockLogs(logs, options = {}) {
  const {
    requireClockOut = false,
  } = options;

  if (!Array.isArray(logs)) {
    return {
      valid: false,
      validLogs: [],
      invalidLogs: [],
      duplicates: [],
      overlaps: [],
      error: 'Clock logs must be an array',
    };
  }

  const validLogs = [];
  const invalidLogs = [];
  const duplicates = [];
  const overlaps = [];

  // Validate each log
  logs.forEach((log, index) => {
    const validation = validateClockLog(log, { requireClockOut });
    if (validation.valid) {
      validLogs.push({ ...log, _validationIndex: index });
    } else {
      invalidLogs.push({
        log,
        index,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }
  });

  // Check for duplicates (same staff, same clock-in time)
  const clockInMap = {};
  validLogs.forEach((log) => {
    const key = `${log.staffId}:${new Date(log.clockInTime).toISOString()}`;
    if (clockInMap[key]) {
      duplicates.push({
        original: clockInMap[key],
        duplicate: log,
        reason: 'Same staff, same clock-in time',
      });
    } else {
      clockInMap[key] = log;
    }
  });

  // Check for overlapping sessions (same staff, overlapping times)
  const staffSessions = {};
  validLogs.forEach((log) => {
    if (!staffSessions[log.staffId]) {
      staffSessions[log.staffId] = [];
    }
    staffSessions[log.staffId].push(log);
  });

  Object.entries(staffSessions).forEach(([staffId, sessions]) => {
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const s1 = sessions[i];
        const s2 = sessions[j];

        const s1In = new Date(s1.clockInTime);
        const s1Out = s1.clockOutTime ? new Date(s1.clockOutTime) : null;
        const s2In = new Date(s2.clockInTime);
        const s2Out = s2.clockOutTime ? new Date(s2.clockOutTime) : null;

        // Check if sessions overlap
        if (s1Out && s2Out) {
          if (s1In < s2Out && s2In < s1Out) {
            overlaps.push({
              session1: s1,
              session2: s2,
              staffId,
              reason: 'Overlapping attendance sessions detected',
            });
          }
        } else if (s1Out && !s2Out) {
          // s1 is completed, s2 is ongoing
          if (s1In < s2In && s2In < s1Out) {
            overlaps.push({
              session1: s1,
              session2: s2,
              staffId,
              reason: 'Clock-in during another session',
            });
          }
        } else if (!s1Out && s2Out) {
          // s1 is ongoing, s2 is completed
          if (s2In < s1In && s1In < s2Out) {
            overlaps.push({
              session1: s1,
              session2: s2,
              staffId,
              reason: 'Ongoing session overlaps with completed session',
            });
          }
        }
      }
    }
  });

  return {
    valid: invalidLogs.length === 0 && duplicates.length === 0 && overlaps.length === 0,
    validLogs,
    invalidLogs,
    duplicates,
    overlaps,
    summary: {
      total: logs.length,
      valid: validLogs.length,
      invalid: invalidLogs.length,
      duplicateCount: duplicates.length,
      overlapCount: overlaps.length,
    },
  };
}

/**
 * Filter out invalid records and return clean dataset with audit trail
 * @param {Array} logs - Array of clock logs
 * @param {Object} options - Filtering options
 * @returns {Object} - {validLogs: Array, audit: Object}
 */
export function sanitizeClockLogs(logs, options = {}) {
  const validation = validateClockLogs(logs, options);

  const audit = {
    timestamp: new Date().toISOString(),
    totalRecords: validation.summary.total,
    validRecords: validation.summary.valid,
    excludedRecords: {
      invalid: validation.summary.invalid,
      duplicates: validation.summary.duplicateCount,
      overlaps: validation.summary.overlapCount,
    },
    exclusionReasons: [
      ...validation.invalidLogs.map((item) => ({
        index: item.index,
        errors: item.errors,
      })),
      ...validation.duplicates.map((item) => ({
        reason: item.reason,
        logs: [item.original._validationIndex, item.duplicate._validationIndex],
      })),
      ...validation.overlaps.map((item) => ({
        reason: item.reason,
        staffId: item.staffId,
        logs: [item.session1._validationIndex, item.session2._validationIndex],
      })),
    ],
  };

  return {
    validLogs: validation.validLogs,
    audit,
  };
}

/**
 * Calculate hours worked between clock-in and clock-out
 * @param {string|Date} clockIn - Clock-in timestamp
 * @param {string|Date} clockOut - Clock-out timestamp
 * @returns {number} - Hours worked (or -1 if invalid)
 */
export function calculateHoursWorked(clockIn, clockOut) {
  if (!clockIn || !clockOut) return -1;

  const inDate = new Date(clockIn);
  const outDate = new Date(clockOut);

  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return -1;
  if (outDate <= inDate) return -1;

  return (outDate - inDate) / (1000 * 60 * 60); // Convert ms to hours
}

/**
 * Check if clock-in time meets punctuality standard
 * @param {string|Date} clockIn - Clock-in timestamp
 * @param {number} gracePeriodMinutes - Grace period in minutes (default: 0)
 * @returns {Object} - {onTime: boolean, minutesLate: number}
 */
export function checkPunctuality(clockIn, gracePeriodMinutes = 0) {
  if (!clockIn) return { onTime: false, minutesLate: null };

  const inDate = new Date(clockIn);
  if (isNaN(inDate.getTime())) return { onTime: false, minutesLate: null };

  // Get the start of the day
  const dayStart = new Date(inDate);
  dayStart.setHours(0, 0, 0, 0);

  // Standard work start time (9:00 AM)
  const standardStartTime = new Date(dayStart);
  standardStartTime.setHours(9, 0, 0, 0);

  // Apply grace period
  const cutoffTime = new Date(standardStartTime);
  cutoffTime.setMinutes(cutoffTime.getMinutes() + gracePeriodMinutes);

  const minutesLate = Math.max(
    0,
    (inDate - cutoffTime) / (1000 * 60)
  );

  return {
    onTime: minutesLate === 0,
    minutesLate: Math.round(minutesLate),
  };
}

/**
 * Check if clock-out is missing (incomplete record)
 * @param {Object} log - Clock log object
 * @returns {boolean} - True if clock-out is missing
 */
export function isClockOutMissing(log) {
  return !log || !log.clockOutTime;
}

/**
 * Flag records with data quality issues
 * @param {Array} logs - Array of clock logs
 * @returns {Array} - Flagged records with reasons
 */
export function flagDataQualityIssues(logs) {
  return logs
    .map((log, index) => {
      const flags = [];

      // Missing clock-out
      if (!log.clockOutTime) {
        flags.push('MISSING_CLOCK_OUT');
      }

      // Very long session (more than 12 hours)
      if (log.clockOutTime) {
        const hours = calculateHoursWorked(log.clockInTime, log.clockOutTime);
        if (hours > 12) {
          flags.push('UNUSUALLY_LONG_SESSION');
        }
        if (hours < 0.5) {
          flags.push('UNUSUALLY_SHORT_SESSION');
        }
      }

      // Clock-in outside business hours
      const clockInDate = new Date(log.clockInTime);
      const hour = clockInDate.getHours();
      if (hour < 6 || hour > 22) {
        flags.push('UNUSUAL_CLOCK_TIME');
      }

      // No supervisor confirmation
      if (!log.supervisorStatus || log.supervisorStatus === 'pending') {
        flags.push('UNCONFIRMED_SUPERVISOR');
      }

      return flags.length > 0
        ? { index, staffId: log.staffId, date: log.clockInTime, flags }
        : null;
    })
    .filter(Boolean);
}

/**
 * Generate audit trail for report calculations
 * @param {Array} logs - Clock logs used in calculation
 * @param {string} reportName - Name of the report
 * @param {Object} filters - Filters applied
 * @returns {Object} - Audit trail object
 */
export function generateAuditTrail(logs, reportName, filters = {}) {
  const dataIssues = flagDataQualityIssues(logs);

  return {
    report: reportName,
    generatedAt: new Date().toISOString(),
    dataRange: logs.length > 0
      ? {
          start: logs
            .map((l) => new Date(l.clockInTime).getTime())
            .reduce((a, b) => Math.min(a, b)),
          end: logs
            .map((l) => new Date(l.clockOutTime || l.clockInTime).getTime())
            .reduce((a, b) => Math.max(a, b)),
        }
      : null,
    recordsAnalyzed: logs.length,
    recordsWithIssues: dataIssues.length,
    filters: filters,
    dataQualityIssues: dataIssues,
    note: 'All metrics derived from validated attendance records. Missing or invalid records excluded.',
  };
}

export default {
  validateClockLog,
  validateClockLogs,
  sanitizeClockLogs,
  calculateHoursWorked,
  checkPunctuality,
  isClockOutMissing,
  flagDataQualityIssues,
  generateAuditTrail,
};
