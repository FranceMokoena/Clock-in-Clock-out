const mongoose = require('mongoose');
const os = require('os');
const SystemEvent = require('../models/SystemEvent');
const RequestMetric = require('../models/RequestMetric');
const SystemHealthSample = require('../models/SystemHealthSample');
const eventEmitter = require('./eventEmitter');

const normalizeId = (value) => {
  if (!value) return undefined;
  const stringValue = typeof value === 'string' ? value : value.toString?.();
  if (!stringValue || !mongoose.Types.ObjectId.isValid(stringValue)) return undefined;
  return new mongoose.Types.ObjectId(stringValue);
};

const recordSystemEvent = (event = {}) => {
  if (!event.type) return;
  const payload = {
    type: event.type,
    severity: event.severity || 'warning',
    message: event.message || '',
    hostCompanyId: normalizeId(event.hostCompanyId),
    staffId: normalizeId(event.staffId),
    deviceFingerprint: event.deviceFingerprint,
    route: event.route || '',
    statusCode: event.statusCode,
    metadata: event.metadata || null,
    createdAt: event.createdAt || new Date(),
  };

  setImmediate(() => {
    SystemEvent.create(payload).catch((error) => {
      console.warn('Monitoring event failed to persist:', error?.message || error);
    });
  });
};

const createRequestMetricsMiddleware = ({ includePaths = [] } = {}) => {
  const normalizedPaths = includePaths
    .filter(Boolean)
    .map((path) => (path.endsWith('/') ? path.slice(0, -1) : path));

  const shouldTrack = (path) => normalizedPaths.some((prefix) => path.startsWith(prefix));

  return (req, res, next) => {
    const rawPath = (req.originalUrl || req.url || '').split('?')[0];
    const path = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
    if (!shouldTrack(path)) return next();

    const startTime = process.hrtime.bigint();
    let recorded = false;

    const record = (forcedOutcome) => {
      if (recorded) return;
      recorded = true;
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      const statusCode = res.statusCode || null;
      const outcome = forcedOutcome || (statusCode >= 500 ? 'error' : 'success');

      RequestMetric.create({
        path,
        method: req.method,
        statusCode,
        durationMs: Math.round(durationMs),
        outcome,
      }).catch((error) => {
        console.warn('Request metric failed to persist:', error?.message || error);
      });
    };

    res.on('finish', () => record());
    res.on('close', () => {
      if (!res.writableEnded) {
        record('timeout');
      }
    });

    next();
  };
};

const startSystemHealthSampler = ({ intervalMs = 60000 } = {}) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const sample = async () => {
    try {
      const usage = process.memoryUsage();
      const totalMem = os.totalmem();
      const memoryPercent = totalMem > 0 ? (usage.rss / totalMem) * 100 : null;
      const dbState = mongoose.connection.readyState;

      await SystemHealthSample.create({
        memoryRssMB: Math.round(usage.rss / 1024 / 1024),
        memoryHeapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
        memoryHeapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
        memoryPercent: memoryPercent !== null ? Number(memoryPercent.toFixed(2)) : null,
        dbState,
        dbStateLabel: dbStateMap[dbState] || 'unknown',
        activeConnections: eventEmitter.getActiveConnections(),
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn('System health sample failed:', error?.message || error);
    }
  };

  sample();
  return setInterval(sample, intervalMs);
};

module.exports = {
  recordSystemEvent,
  createRequestMetricsMiddleware,
  startSystemHealthSampler,
};
