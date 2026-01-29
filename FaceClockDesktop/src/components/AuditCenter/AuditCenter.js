import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  dashboardAPI,
  hostCompanyAPI,
  notificationAPI,
  notAccountableAPI,
  reportRunsAPI,
  reportSettingsAPI,
  staffAPI,
  systemAPI,
} from '../../services/api';
import './AuditCenter.css';

// Endpoints consulted:
// - notificationAPI.getAll -> event log + developer reporting
// - notAccountableAPI.getAll -> automated detectors
// - hostCompanyAPI.getAll -> host company filter values
const DATE_PRESETS = [
  { key: 'today', label: 'Today', offset: 0 },
  { key: '7d', label: 'Last 7 days', offset: 6 },
  { key: '30d', label: 'Last 30 days', offset: 29 },
];
const PAGE_SIZE = 12;

const formatDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const formatTimestamp = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const toUpper = (value) => String(value || '').toUpperCase();
const shorten = (value, max = 12) => {
  if (!value) return '-';
  const text = String(value);
  return text.length <= max ? text : `${text.slice(0, max)}...`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US').format(value);
};

const formatUptime = (seconds) => {
  if (!Number.isFinite(seconds)) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const mapSeverityToCategory = (value) => {
  const normalized = String(value || 'medium').toLowerCase();
  if (['low', 'info'].includes(normalized)) return 'INFO';
  if (['medium', 'warning'].includes(normalized)) return 'WARNING';
  if (['high', 'urgent', 'critical'].includes(normalized)) return 'CRITICAL';
  return normalized.toUpperCase();
};

const severityDisplay = {
  INFO: 'Info',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
};

const resolveActionType = (entry) => {
  const fallback = entry?.data?.actionType
    || entry?.actionData?.actionType
    || entry?.type
    || entry?.title
    || 'UNKNOWN';

  if (fallback === 'SHARED_DEVICE_CLOCKIN' && entry?.data?.payload?.type) {
    return entry.data.payload.type.replace(/_/g, ' ').toUpperCase();
  }

  return toUpper(fallback);
};

const resolveSeverity = (entry) => (
  entry?.priority
  || entry?.data?.payload?.severity
  || 'medium'
);

const resolveUserLabel = (entry) => {
  const payload = entry?.data?.payload;
  if (payload?.staffName || payload?.internName) {
    return payload.staffName || payload.internName;
  }
  const subject = entry?.subjectUserId;
  if (subject && typeof subject === 'object') {
    return `${subject.name || ''} ${subject.surname || ''}`.trim() || 'Unknown';
  }
  return entry?.userName || 'Unknown';
};

const resolveHostCompanyLabel = (entry, map) => {
  const payload = entry?.data?.payload;
  const id = payload?.hostCompanyId || entry?.relatedEntities?.hostCompanyId;
  if (id && map[id]) return map[id];
  if (payload?.hostCompanyName) return payload.hostCompanyName;
  return 'Unknown';
};

const resolveDepartmentLabel = (entry) => (
  entry?.subjectUserId?.department
  || entry?.relatedEntities?.departmentId?.name
  || entry?.data?.payload?.departmentName
  || 'Unknown'
);

const resolveDeviceLabel = (entry) => {
  const payload = entry?.data?.payload || {};
  const fingerprint = payload.deviceFingerprint || payload.deviceId || entry?.deviceInfo?.deviceId || '';
  const ownerLabel = entry?.data?.payload?.sharedDeviceOwner?.staffName;
  if (fingerprint && ownerLabel) {
    return `${fingerprint} (via ${ownerLabel})`;
  }
  if (fingerprint) return fingerprint;
  if (ownerLabel) return `${ownerLabel}'s device`;
  return '-';
};

const resolveLocationLabel = (entry) => (
  entry?.data?.payload?.locationName
  || entry?.data?.payload?.location
  || '-'
);

const makePossessive = (name) => {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (trimmed.endsWith('s')) return `${trimmed}'`;
  return `${trimmed}'s`;
};

const resolveSharedDeviceOwnerLabel = (entry) => {
  const ownerName = entry?.data?.payload?.sharedDeviceOwner?.staffName;
  return ownerName ? `${makePossessive(ownerName)} device` : 'shared device';
};

const normalizeClockTypeKey = (value) => {
  if (!value) return '';
  return value.toString().replace(/-/g, '_').replace(/\s+/g, '_').toUpperCase();
};

const SHARED_DEVICE_ACTION_PHRASES = {
  IN: 'clocked in',
  OUT: 'clocked out',
  BREAK_START: 'started a break',
  BREAK_END: 'ended a break',
  LUNCH_START: 'started lunch',
  LUNCH_END: 'ended lunch',
};

const getSharedDeviceActionPhrase = (entry) => {
  const actionType = entry?.data?.payload?.type;
  const key = normalizeClockTypeKey(actionType);
  return SHARED_DEVICE_ACTION_PHRASES[key] || 'performed an action';
};

const isSharedDeviceEntry = (entry) => {
  const actionType = entry?.data?.payload?.actionType || entry?.type;
  return actionType === 'SHARED_DEVICE_CLOCKIN';
};

const getActionPhrase = (entry) => {
  const sharedPhrase = isSharedDeviceEntry(entry) ? getSharedDeviceActionPhrase(entry) : '';
  if (sharedPhrase) return sharedPhrase;
  const action = resolveActionType(entry);
  const normalized = action ? action.toUpperCase() : '';
  const map = {
    CLOCK_IN: 'clocked in',
    CLOCK_OUT: 'clocked out',
    BREAK_START: 'started tea time',
    BREAK_END: 'ended tea time',
    EXTRA_SHIFT_IN: 'started extra shift',
    EXTRA_SHIFT_OUT: 'ended extra shift',
    LUNCH_START: 'started lunch',
    LUNCH_END: 'ended lunch',
    DEVICE_APPROVED: 'approved a device',
    DEVICE_REVOKED: 'revoked a device',
  };
  if (map[normalized]) return map[normalized];
  if (!normalized) return 'performed an action';
  return normalized.toLowerCase().replace(/_/g, ' ');
};

const resolveReasonLabel = (entry) => {
  const payload = entry?.data?.payload || {};
  if (payload.reason) return payload.reason;
  return payload.reasonCode
    || payload.error
    || entry?.message
    || 'Unknown issue';
};


const ERROR_KEYWORDS = [
  'ERROR',
  'FAILED',
  'FAIL',
  'EXCEPTION',
  'TIMEOUT',
  'REJECTED',
  'DENIED',
  'MISSING',
  'ISSUE',
];

const isErrorLikeEntry = (entry) => {
  const severity = mapSeverityToCategory(resolveSeverity(entry));
  if (severity === 'CRITICAL') return true;
  const haystack = [
    entry?.title,
    entry?.message,
    resolveActionType(entry),
    resolveReasonLabel(entry),
    entry?.type,
  ].join(' ');
  return ERROR_KEYWORDS.some((keyword) => toUpper(haystack).includes(keyword));
};

const humanizeReportType = (value) => {
  const key = String(value || '').toLowerCase();
  if (key === 'weekly') return 'Weekly summary';
  if (key === 'monthly') return 'Monthly summary';
  if (key === 'late') return 'Late clock-in';
  if (key === 'missing') return 'Missing clock-in';
  return key ? key.replace(/_/g, ' ') : 'Report';
};

const normalizeReportStatus = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'sent') return { label: 'Sent', severity: 'info' };
  if (key === 'generated') return { label: 'Generated', severity: 'info' };
  if (key === 'queued') return { label: 'Queued', severity: 'warning' };
  if (key === 'failed') return { label: 'Failed', severity: 'critical' };
  return { label: status || 'Unknown', severity: 'warning' };
};

const renderResultCell = (entry) => {
  const sharedDeviceName = entry?.data?.payload?.sharedDeviceOwner?.staffName;
  if (sharedDeviceName) {
    return (
      <>
        <span className="audit-result-name audit-result-name--actor">{resolveUserLabel(entry)}</span>{' '}
        {getActionPhrase(entry)} using{' '}
        <span className="audit-result-name audit-result-name--owner">{resolveSharedDeviceOwnerLabel(entry)}</span>
      </>
    );
  }
  return resolveReasonLabel(entry);
};

const deriveDetectorSeverity = (entry) => {
  const reason = (entry?.reason || entry?.details || '').toLowerCase();
  if (reason.includes('wrong time') || reason.includes('late')) return 'WARNING';
  if (reason.includes('no clock-in') || reason.includes('not recorded')) return 'CRITICAL';
  return 'INFO';
};

const getRangeDates = (key) => {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const preset = DATE_PRESETS.find((item) => item.key === key);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (preset) {
    from.setDate(from.getDate() - preset.offset);
  }
  return { from, to };
};

const extractHostId = (entry) => (
  entry?.data?.payload?.hostCompanyId || entry?.relatedEntities?.hostCompanyId || ''
);
function AuditCenter({ isAdmin, hostCompanyId, isHostCompany }) {
  const defaultRange = getRangeDates('7d');
  const canViewDeveloperReports = Boolean(isAdmin);
  const [entries, setEntries] = useState([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');
  const [detectors, setDetectors] = useState([]);
  const [detectorLoading, setDetectorLoading] = useState(false);
  const [detectorError, setDetectorError] = useState('');
  const [activeTab, setActiveTab] = useState('eventLog');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDetector, setSelectedDetector] = useState(null);
  const [datePreset, setDatePreset] = useState('7d');
  const [dateFrom, setDateFrom] = useState(formatDateInput(defaultRange.from));
  const [dateTo, setDateTo] = useState(formatDateInput(defaultRange.to));
  const [hostCompanyFilter, setHostCompanyFilter] = useState(isHostCompany ? hostCompanyId : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hostCompanies, setHostCompanies] = useState([]);
  const [hostCompaniesLoading, setHostCompaniesLoading] = useState(false);
  const [hostCompaniesError, setHostCompaniesError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [reportRuns, setReportRuns] = useState([]);
  const [reportRunsLoading, setReportRunsLoading] = useState(false);
  const [reportRunsError, setReportRunsError] = useState('');

  const hostCompanyMap = useMemo(() => {
    const map = {};
    hostCompanies.forEach((company) => {
      if (company?._id) {
        map[company._id] = company.companyName || company.name || 'Unknown';
      }
    });
    return map;
  }, [hostCompanies]);

  useEffect(() => {
    if (datePreset !== 'custom') {
      const range = getRangeDates(datePreset);
      setDateFrom(formatDateInput(range.from));
      setDateTo(formatDateInput(range.to));
    }
  }, [datePreset]);

  useEffect(() => {
    if (!canViewDeveloperReports && activeTab === 'developerReports') {
      setActiveTab('eventLog');
    }
  }, [activeTab, canViewDeveloperReports]);

  useEffect(() => {
    if (isAdmin) {
      fetchHostCompanies();
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchEntries();
  }, [hostCompanyFilter, isAdmin, isHostCompany, hostCompanyId]);

  useEffect(() => {
    fetchDetectors();
  }, [dateTo, hostCompanyFilter, isAdmin, isHostCompany, hostCompanyId]);

  const fetchHostCompanies = useCallback(async () => {
    setHostCompaniesLoading(true);
    setHostCompaniesError('');
    try {
      const response = await hostCompanyAPI.getAll();
      if (response?.success) {
        const companies = response.companies || response.hostCompanies || [];
        setHostCompanies(Array.isArray(companies) ? companies : []);
      } else {
        setHostCompanies([]);
        setHostCompaniesError('Endpoint not connected');
      }
    } catch (error) {
      setHostCompanies([]);
      setHostCompaniesError('Endpoint not connected');
    } finally {
      setHostCompaniesLoading(false);
    }
  }, []);

  const scopedHostId = useCallback(() => {
    if (hostCompanyFilter) return hostCompanyFilter;
    if (isHostCompany && hostCompanyId) return hostCompanyId;
    return '';
  }, [hostCompanyFilter, hostCompanyId, isHostCompany]);

  const fetchEntries = useCallback(async () => {
    if (!isAdmin && !isHostCompany) return;
    setEventLoading(true);
    setEventError('');
    try {
      const params = {
        recipientType: isAdmin ? 'Admin' : 'HostCompany',
        limit: 1000,
      };
      const hostId = scopedHostId();
      if (hostId) params.hostCompanyId = hostId;
      const response = await notificationAPI.getAll(params);
      if (response?.success) {
        setEntries(Array.isArray(response.notifications) ? response.notifications : []);
        setLastRefresh(new Date());
      } else {
        setEntries([]);
        setEventError(response?.error || 'Failed to load audit events.');
      }
    } catch (error) {
      setEntries([]);
      setEventError('Failed to load audit events.');
    } finally {
      setEventLoading(false);
    }
  }, [isAdmin, isHostCompany, hostCompanyId, hostCompanyFilter, scopedHostId]);

  const fetchDetectors = useCallback(async () => {
    if (!isAdmin && !isHostCompany) return;
    setDetectorLoading(true);
    setDetectorError('');
    try {
      const params = { date: dateTo || formatDateInput(new Date()) };
      const hostId = scopedHostId();
      if (hostId) params.hostCompanyId = hostId;
      const response = await notAccountableAPI.getAll(params);
      if (response?.success) {
        setDetectors(Array.isArray(response.notAccountable) ? response.notAccountable : []);
      } else {
        setDetectors([]);
        setDetectorError('No data available (endpoint not connected)');
      }
    } catch (error) {
      setDetectors([]);
      setDetectorError('No data available (endpoint not connected)');
    } finally {
      setDetectorLoading(false);
    }
  }, [dateTo, isAdmin, isHostCompany, hostCompanyId, hostCompanyFilter, scopedHostId]);

  const fetchDeveloperOverview = useCallback(async () => {
    if (!isAdmin) return;
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const hostId = scopedHostId();
      const [health, cacheStats, stats, smtpStatus] = await Promise.all([
        systemAPI.getHealth(),
        systemAPI.getCacheStats(),
        dashboardAPI.getStats(hostId || null),
        reportSettingsAPI.getSmtpStatus(),
      ]);
      setOverview({
        health,
        cache: cacheStats?.cache || null,
        stats: stats?.stats || null,
        smtp: smtpStatus?.status || null,
      });
    } catch (error) {
      setOverview(null);
      setOverviewError('Failed to load system overview.');
    } finally {
      setOverviewLoading(false);
    }
  }, [isAdmin, scopedHostId]);

  const fetchStaffList = useCallback(async () => {
    if (!isAdmin) return;
    setStaffLoading(true);
    setStaffError('');
    try {
      const hostId = scopedHostId();
      const params = hostId ? { hostCompanyId: hostId } : {};
      const response = await staffAPI.getList(params);
      if (response?.success) {
        setStaffList(Array.isArray(response.staff) ? response.staff : []);
      } else {
        setStaffList([]);
        setStaffError(response?.error || 'Failed to load staff list.');
      }
    } catch (error) {
      setStaffList([]);
      setStaffError('Failed to load staff list.');
    } finally {
      setStaffLoading(false);
    }
  }, [isAdmin, scopedHostId]);

  const fetchReportRuns = useCallback(async () => {
    if (!isAdmin) return;
    setReportRunsLoading(true);
    setReportRunsError('');
    try {
      const hostId = scopedHostId();
      const params = {
        limit: 25,
      };
      if (hostId) params.hostCompanyId = hostId;
      const response = await reportRunsAPI.getAll(params);
      if (response?.success) {
        setReportRuns(Array.isArray(response.runs) ? response.runs : []);
      } else {
        setReportRuns([]);
        setReportRunsError(response?.error || 'Failed to load report runs.');
      }
    } catch (error) {
      setReportRuns([]);
      setReportRunsError('Failed to load report runs.');
    } finally {
      setReportRunsLoading(false);
    }
  }, [isAdmin, scopedHostId]);

  useEffect(() => {
    if (activeTab !== 'developerReports' || !canViewDeveloperReports) return;
    fetchDeveloperOverview();
    fetchStaffList();
    fetchReportRuns();
  }, [activeTab, canViewDeveloperReports, fetchDeveloperOverview, fetchStaffList, fetchReportRuns]);
  const startDate = dateFrom ? new Date(dateFrom) : null;
  const endDate = dateTo ? new Date(dateTo) : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  const filteredEntries = useMemo(() => {
    const scopeHost = scopedHostId();
    const upperSearch = toUpper(searchTerm);
    const userSearch = toUpper(userFilter);
    return entries.filter((entry) => {
      const createdAt = entry?.createdAt ? new Date(entry.createdAt) : null;
      if (startDate && createdAt && createdAt < startDate) return false;
      if (endDate && createdAt && createdAt > endDate) return false;
      if (scopeHost) {
        const entryHost = extractHostId(entry);
        if (entryHost && entryHost !== scopeHost) return false;
      }
      const severity = mapSeverityToCategory(resolveSeverity(entry));
      if (severityFilter !== 'ALL' && severity !== severityFilter) return false;
      const entryType = toUpper(resolveActionType(entry));
      if (typeFilter !== 'ALL' && entryType !== typeFilter) return false;
      if (userSearch && !toUpper(resolveUserLabel(entry)).includes(userSearch)) return false;
      if (upperSearch) {
        const haystack = [
          resolveActionType(entry),
          resolveReasonLabel(entry),
          resolveUserLabel(entry),
          resolveHostCompanyLabel(entry, hostCompanyMap),
          resolveDepartmentLabel(entry),
          resolveLocationLabel(entry)
        ].join(' ');
        if (!toUpper(haystack).includes(upperSearch)) return false;
      }
      return true;
    });
  }, [
    entries,
    startDate,
    endDate,
    severityFilter,
    typeFilter,
    userFilter,
    searchTerm,
    hostCompanyFilter,
    isHostCompany,
    hostCompanyId,
    hostCompanyMap,
    scopedHostId,
  ]);

  const developerEntries = useMemo(() => {
    const scopeHost = scopedHostId();
    return entries.filter((entry) => {
      const createdAt = entry?.createdAt ? new Date(entry.createdAt) : null;
      if (startDate && createdAt && createdAt < startDate) return false;
      if (endDate && createdAt && createdAt > endDate) return false;
      if (scopeHost) {
        const entryHost = extractHostId(entry);
        if (entryHost && entryHost !== scopeHost) return false;
      }
      return true;
    });
  }, [entries, startDate, endDate, scopedHostId]);

  const typeOptions = useMemo(() => (
    Array.from(new Set(entries.map((entry) => toUpper(resolveActionType(entry))))).sort()
  ), [entries]);

  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];
    list.sort((a, b) => {
      const valueByKey = (entry, key) => {
        if (key === 'time') return entry?.createdAt ? new Date(entry.createdAt).getTime() : 0;
        if (key === 'actor') return resolveUserLabel(entry).toLowerCase();
        if (key === 'action') return resolveActionType(entry).toLowerCase();
        if (key === 'company') return resolveHostCompanyLabel(entry, hostCompanyMap).toLowerCase();
        if (key === 'severity') return mapSeverityToCategory(resolveSeverity(entry));
        return resolveActionType(entry);
      };
      const valueA = valueByKey(a, sortKey);
      const valueB = valueByKey(b, sortKey);
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      return 0;
    });
    return list;
  }, [filteredEntries, sortKey, sortOrder, hostCompanyMap]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortedEntries.length]);

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedEntries.slice(start, start + PAGE_SIZE);
  }, [sortedEntries, currentPage]);

  const staffResults = useMemo(() => {
    if (!Array.isArray(staffList)) return [];
    const term = toUpper(userQuery);
    const filtered = staffList.filter((member) => {
      if (!term) return true;
      const haystack = [
        member?.name,
        member?.surname,
        member?.idNumber,
        member?.phoneNumber,
        member?.role,
        member?.department,
        member?.mentorName,
        member?.hostCompanyId,
        hostCompanyMap[member?.hostCompanyId]
      ].join(' ');
      return toUpper(haystack).includes(term);
    });
    return term ? filtered : filtered.slice(0, 25);
  }, [staffList, userQuery, hostCompanyMap]);

  const recentErrors = useMemo(() => {
    const notificationErrors = developerEntries
      .filter(isErrorLikeEntry)
      .map((entry) => ({
        id: entry?._id,
        type: 'notification',
        title: resolveActionType(entry),
        summary: entry?.message || resolveReasonLabel(entry),
        severity: mapSeverityToCategory(resolveSeverity(entry)),
        time: entry?.createdAt,
        payload: entry,
      }));

    const reportRunErrors = reportRuns
      .filter((run) => run?.status === 'failed')
      .map((run) => ({
        id: run?._id,
        type: 'report',
        title: `${humanizeReportType(run?.reportType)} failed`,
        summary: run?.errorMessage || 'Report delivery failed',
        severity: 'CRITICAL',
        time: run?.createdAt,
        payload: run,
      }));

    return [...reportRunErrors, ...notificationErrors]
      .filter((item) => item.time)
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10);
  }, [developerEntries, reportRuns]);

  const overviewCards = useMemo(() => {
    const health = overview?.health || {};
    const cache = overview?.cache || {};
    const stats = overview?.stats || {};
    const smtp = overview?.smtp || {};
    const desktopVersion = process.env.REACT_APP_VERSION || 'unknown';
    return [
      { label: 'API status', value: health.status || 'Unknown', hint: health.message || '' },
      { label: 'API version', value: health.version || 'unknown', hint: health.service || '' },
      { label: 'Desktop build', value: desktopVersion, hint: 'React desktop' },
      { label: 'Uptime', value: formatUptime(health.uptimeSeconds), hint: 'Server uptime' },
      {
        label: 'Database',
        value: health.database?.status || 'unknown',
        hint: health.database?.name ? `DB: ${health.database.name}` : ''
      },
      {
        label: 'Websocket',
        value: formatNumber(health.websocket?.activeConnections),
        hint: 'Active connections'
      },
      {
        label: 'Memory (RSS)',
        value: health.memory?.rss || '-',
        hint: `Heap ${health.memory?.heapUsed || '-'}/${health.memory?.heapTotal || '-'}`
      },
      {
        label: 'Cache',
        value: cache.lastUpdate ? formatTimestamp(cache.lastUpdate) : 'Not loaded',
        hint: cache.isExpired ? 'Cache stale' : 'Cache fresh'
      },
      { label: 'Total staff', value: formatNumber(stats.totalStaff), hint: 'Active users' },
      { label: 'Clock-ins today', value: formatNumber(stats.clockInsToday), hint: 'Today' },
      { label: 'Currently in', value: formatNumber(stats.currentlyIn), hint: 'Active session' },
      { label: 'Late arrivals', value: formatNumber(stats.lateArrivals), hint: 'Today' },
      {
        label: 'SMTP',
        value: smtp.configured ? 'Configured' : 'Not configured',
        hint: smtp.user || ''
      }
    ];
  }, [overview]);

  const monitorChecks = useMemo(() => {
    const health = overview?.health || {};
    const cache = overview?.cache || {};
    const smtp = overview?.smtp || {};
    const failedRuns = reportRuns.filter((run) => run?.status === 'failed');
    return [
      {
        label: 'API health',
        status: health.status === 'OK' ? 'OK' : 'Issue',
        severity: health.status === 'OK' ? 'info' : 'critical',
        detail: health.message || 'Health endpoint'
      },
      {
        label: 'Database',
        status: health.database?.status || 'unknown',
        severity: health.database?.status === 'connected' ? 'info' : 'critical',
        detail: health.database?.host ? `Host: ${health.database.host}` : ''
      },
      {
        label: 'Cache freshness',
        status: cache.isExpired ? 'Stale' : 'Fresh',
        severity: cache.isExpired ? 'warning' : 'info',
        detail: cache.lastUpdate ? `Last update ${formatTimestamp(cache.lastUpdate)}` : 'No cache activity'
      },
      {
        label: 'SMTP',
        status: smtp.configured ? 'Configured' : 'Missing',
        severity: smtp.configured ? 'info' : 'warning',
        detail: smtp.user ? `User: ${smtp.user}` : 'No SMTP user configured'
      },
      {
        label: 'Auto reports',
        status: failedRuns.length ? 'Issues detected' : 'Healthy',
        severity: failedRuns.length ? 'critical' : 'info',
        detail: failedRuns.length ? `${failedRuns.length} failed run(s)` : 'No failed runs'
      },
      {
        label: 'Recent errors',
        status: recentErrors.length ? `${recentErrors.length} flagged` : 'None',
        severity: recentErrors.length ? 'warning' : 'info',
        detail: recentErrors.length ? 'Review the errors feed' : 'No critical events found'
      }
    ];
  }, [overview, reportRuns, recentErrors]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSortIndicator = (key) => {
    if (sortKey !== key) return '?';
    return sortOrder === 'asc' ? '?' : '?';
  };

  const detectorsDateLabel = dateTo
    ? new Date(dateTo).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'latest';

  const closingDrawer = () => {
    setSelectedEvent(null);
    setSelectedDetector(null);
    setSelectedUser(null);
  };

  const hostCompanyTitle = hostCompaniesError
    ? 'Endpoint not connected'
    : hostCompaniesLoading
      ? 'Loading host companies'
      : '';
  if (!isAdmin && !isHostCompany) {
    return (
      <div className="audit-center-container">
        <div className="audit-center-empty">
          <h2>Audit Center</h2>
          <p>Access is restricted to admin and host company users.</p>
        </div>
      </div>
    );
  }

  const lastSynced = lastRefresh ? formatTimestamp(lastRefresh) : 'Not synced yet';

  return (
    <div className="audit-center-container">
      <div className="audit-center-header">
        <div>
          <h1>Audit Center</h1>
          <p>System monitoring, compliance, and operational intelligence</p>
        </div>
        <div className="audit-center-header-actions">
          <span>Last synced: {lastSynced}</span>
          <button
            type="button"
            className="audit-center-refresh"
            onClick={() => {
              fetchEntries();
              fetchDetectors();
              if (activeTab === 'developerReports') {
                fetchDeveloperOverview();
                fetchStaffList();
                fetchReportRuns();
              }
            }}
          >
            Refresh data
          </button>
        </div>
      </div>

      <div className="audit-center-filters">
        <div className="audit-filter-group">
          <label>Date range</label>
          <select value={datePreset} onChange={(event) => setDatePreset(event.target.value)}>
            {DATE_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>{preset.label}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
          <div className="audit-date-fields">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDatePreset('custom');
                setDateFrom(event.target.value);
              }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDatePreset('custom');
                setDateTo(event.target.value);
              }}
            />
          </div>
        </div>

        <div className="audit-filter-group">
          <label>Host company</label>
          <select
            value={hostCompanyFilter}
            onChange={(event) => setHostCompanyFilter(event.target.value)}
            disabled={!isAdmin || hostCompaniesLoading || Boolean(hostCompaniesError)}
            title={hostCompanyTitle}
          >
            <option value="">All companies</option>
            {hostCompanies.map((company) => (
              <option key={company._id} value={company._id}>
                {company.companyName || company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="audit-filter-group">
          <label>User search</label>
          <input
            type="text"
            value={userFilter}
            placeholder="Filter by user"
            onChange={(event) => setUserFilter(event.target.value)}
          />
        </div>

        <div className="audit-filter-group">
          <label>Severity</label>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="ALL">All</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div className="audit-filter-group">
          <label>Type</label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="ALL">All</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="audit-filter-group audit-filter-grow">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search reason, location..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div className="audit-center-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === 'eventLog' ? 'active' : ''}`}
          onClick={() => setActiveTab('eventLog')}
        >
          Event Log
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'detectors' ? 'active' : ''}`}
          onClick={() => setActiveTab('detectors')}
        >
          Automated Detectors
        </button>
        {canViewDeveloperReports && (
          <button
            type="button"
            className={`tab-button ${activeTab === 'developerReports' ? 'active' : ''}`}
            onClick={() => setActiveTab('developerReports')}
          >
            Developer Reports
          </button>
        )}
      </div>

      <div className="audit-center-tab-panel">
        {activeTab === 'eventLog' && (
          <div className="audit-tab-content">
            {eventLoading && (
              <div className="audit-center-loading">
                <div className="spinner" />
                <p>Loading events...</p>
              </div>
            )}
            {!eventLoading && eventError && (
              <div className="audit-center-error">
                <p>{eventError}</p>
                <button type="button" onClick={fetchEntries}>Retry</button>
              </div>
            )}
            {!eventLoading && !eventError && paginatedEntries.length === 0 && (
              <div className="audit-center-empty">No events available for this range.</div>
            )}
            {!eventLoading && !eventError && paginatedEntries.length > 0 && (
              <>
                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('time')}>Time <span>{getSortIndicator('time')}</span></th>
                        <th onClick={() => handleSort('actor')}>Actor <span>{getSortIndicator('actor')}</span></th>
                        <th onClick={() => handleSort('action')}>Action <span>{getSortIndicator('action')}</span></th>
                        <th>Result</th>
                        <th onClick={() => handleSort('company')}>Host Company <span>{getSortIndicator('company')}</span></th>
                        <th>Department</th>
                        <th>Device</th>
                        <th>Location</th>
                        <th onClick={() => handleSort('severity')}>Severity <span>{getSortIndicator('severity')}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEntries.map((entry) => {
                        const severityKey = mapSeverityToCategory(resolveSeverity(entry));
                        return (
                          <tr
                            key={entry._id}
                            onClick={() => {
                              setSelectedUser(null);
                              setSelectedDetector(null);
                              setSelectedEvent(entry);
                            }}
                          >
                            <td>{formatTimestamp(entry.createdAt)}</td>
                            <td>{resolveUserLabel(entry)}</td>
                            <td>{resolveActionType(entry)}</td>
                            <td>{renderResultCell(entry)}</td>
                            <td>{resolveHostCompanyLabel(entry, hostCompanyMap)}</td>
                            <td>{resolveDepartmentLabel(entry)}</td>
                            <td>{shorten(resolveDeviceLabel(entry), 14)}</td>
                            <td>{resolveLocationLabel(entry)}</td>
                            <td>
                              <span className={`audit-pill severity-${severityKey.toLowerCase()}`}>
                                {severityDisplay[severityKey]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="audit-center-pagination">
                  <button type="button" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>Previous</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'detectors' && (
          <div className="audit-tab-content">
            <div className="audit-detector-header">
              <h3>Not-accountable detectors</h3>
              <p>Showing results for {detectorsDateLabel}</p>
            </div>
            {detectorLoading && (
              <div className="audit-center-loading">
                <div className="spinner" />
                <p>Loading detectors...</p>
              </div>
            )}
            {!detectorLoading && detectorError && (
              <div className="audit-center-error"><p>{detectorError}</p></div>
            )}
            {!detectorLoading && !detectorError && detectors.length === 0 && (
              <div className="audit-center-empty">No detector issues for this day.</div>
            )}
            {!detectorLoading && !detectorError && detectors.length > 0 && (
              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Detector</th>
                      <th>User</th>
                      <th>Trigger</th>
                      <th>Severity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectors.map((detector) => (
                      <tr
                        key={detector._id || `${detector.staffId}-${detector.reason}`}
                        onClick={() => {
                          setSelectedUser(null);
                          setSelectedEvent(null);
                          setSelectedDetector(detector);
                        }}
                      >
                        <td>{formatTimestamp(detector.clockInTimestamp || detector.clockOutTimestamp)}</td>
                        <td>{detector.reason}</td>
                        <td>{detector.staffName}</td>
                        <td>{detector.details || 'Review required'}</td>
                        <td>
                          <span className={`audit-pill severity-${deriveDetectorSeverity(detector).toLowerCase()}`}>
                            {severityDisplay[deriveDetectorSeverity(detector)]}
                          </span>
                        </td>
                        <td><span className="audit-pill status-pill">Open</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {canViewDeveloperReports && activeTab === 'developerReports' && (
          <div className="audit-tab-content">
            <div className="audit-dev-section">
              <div className="audit-dev-section-header">
                <div>
                  <h3>System overview</h3>
                  <p>App version, health, and key operational metrics.</p>
                </div>
                {overviewLoading && <span className="audit-pill severity-info">Loading</span>}
                {!overviewLoading && overviewError && (
                  <span className="audit-pill severity-critical">Error</span>
                )}
              </div>
              {overviewLoading && (
                <div className="audit-center-loading">
                  <div className="spinner" />
                  <p>Loading system overview...</p>
                </div>
              )}
              {!overviewLoading && overviewError && (
                <div className="audit-center-error">
                  <p>{overviewError}</p>
                </div>
              )}
              {!overviewLoading && !overviewError && (
                <div className="audit-overview-grid">
                  {overviewCards.map((card) => (
                    <div key={card.label} className="audit-overview-card">
                      <span className="audit-overview-label">{card.label}</span>
                      <div className="audit-overview-value">{card.value}</div>
                      {card.hint && <div className="audit-overview-sub">{card.hint}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="audit-dev-section">
              <div className="audit-dev-section-header">
                <div>
                  <h3>User lookup</h3>
                  <p>Find users for support tickets without manual queries.</p>
                </div>
              </div>
              <div className="audit-user-search">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Search name, ID number, phone, role, department..."
                />
                <span className="audit-user-meta">
                  Showing {staffResults.length} of {staffList.length}
                </span>
              </div>
              {staffLoading && (
                <div className="audit-center-loading">
                  <div className="spinner" />
                  <p>Loading staff list...</p>
                </div>
              )}
              {!staffLoading && staffError && (
                <div className="audit-center-error">
                  <p>{staffError}</p>
                </div>
              )}
              {!staffLoading && !staffError && staffResults.length === 0 && (
                <div className="audit-center-empty">No staff match this search.</div>
              )}
              {!staffLoading && !staffError && staffResults.length > 0 && (
                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Host Company</th>
                        <th>ID / Phone</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffResults.map((member) => (
                        <tr
                          key={member._id}
                          onClick={() => {
                            setSelectedEvent(null);
                            setSelectedDetector(null);
                            setSelectedUser(member);
                          }}
                        >
                          <td>{`${member.name || ''} ${member.surname || ''}`.trim() || 'Unknown'}</td>
                          <td>{member.role || 'Unknown'}</td>
                          <td>{member.department || 'Unknown'}</td>
                          <td>{hostCompanyMap[member.hostCompanyId] || 'Unknown'}</td>
                          <td>{member.idNumber || member.phoneNumber || '-'}</td>
                          <td>{formatDateOnly(member.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="audit-dev-section">
              <div className="audit-dev-section-header">
                <div>
                  <h3>Recent errors</h3>
                  <p>Plain-language error feed (notifications + report failures).</p>
                </div>
              </div>
              {recentErrors.length === 0 && (
                <div className="audit-center-empty">No recent errors flagged.</div>
              )}
              {recentErrors.length > 0 && (
                <div className="audit-error-list">
                  {recentErrors.map((item) => (
                    <div key={item.id} className="audit-error-item">
                      <div>
                        <div className="audit-error-title">{item.title || 'System event'}</div>
                        <p className="audit-error-summary">{item.summary}</p>
                        <span className="audit-error-meta">
                          {formatTimestamp(item.time)} • {item.type === 'report' ? 'Auto report' : 'Notification'}
                        </span>
                      </div>
                      <span className={`audit-pill severity-${String(item.severity || 'info').toLowerCase()}`}>
                        {severityDisplay[item.severity] || item.severity || 'Info'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="audit-dev-section">
              <div className="audit-dev-section-header">
                <div>
                  <h3>Background jobs</h3>
                  <p>Auto-report scheduler status and recent runs.</p>
                </div>
              </div>
              {reportRunsLoading && (
                <div className="audit-center-loading">
                  <div className="spinner" />
                  <p>Loading report runs...</p>
                </div>
              )}
              {!reportRunsLoading && reportRunsError && (
                <div className="audit-center-error">
                  <p>{reportRunsError}</p>
                </div>
              )}
              {!reportRunsLoading && !reportRunsError && reportRuns.length === 0 && (
                <div className="audit-center-empty">No report runs recorded yet.</div>
              )}
              {!reportRunsLoading && !reportRunsError && reportRuns.length > 0 && (
                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>Status</th>
                        <th>Period</th>
                        <th>Created</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRuns.slice(0, 12).map((run) => {
                        const statusMeta = normalizeReportStatus(run?.status);
                        const periodLabel = run?.periodStart && run?.periodEnd
                          ? `${formatDateOnly(run.periodStart)} - ${formatDateOnly(run.periodEnd)}`
                          : (run?.periodKey || '-');
                        return (
                          <tr key={run._id}>
                            <td>{humanizeReportType(run?.reportType)}</td>
                            <td>
                              <span className={`audit-pill severity-${statusMeta.severity}`}>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td>{periodLabel}</td>
                            <td>{formatTimestamp(run?.createdAt)}</td>
                            <td>{run?.errorMessage || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="audit-dev-section">
              <div className="audit-dev-section-header">
                <div>
                  <h3>Self-monitoring</h3>
                  <p>Automated checks for technical and business logic signals.</p>
                </div>
              </div>
              <div className="audit-check-grid">
                {monitorChecks.map((check) => (
                  <div key={check.label} className="audit-check-card">
                    <div className="audit-check-header">
                      <span className={`audit-pill severity-${check.severity}`}>{check.status}</span>
                      <strong>{check.label}</strong>
                    </div>
                    <p>{check.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {(selectedEvent || selectedDetector || selectedUser) && (
        <div className="audit-drawer-overlay" onClick={closingDrawer}>
          <div className="audit-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="audit-drawer-header">
              <div>
                <h3>
                  {selectedEvent
                    ? 'Event details'
                    : selectedDetector
                      ? 'Detector details'
                      : 'User details'}
                </h3>
                <p>
                  {selectedEvent
                    ? formatTimestamp(selectedEvent.createdAt)
                    : selectedDetector
                      ? detectorsDateLabel
                      : formatDateOnly(selectedUser?.createdAt)}
                </p>
              </div>
              <button type="button" onClick={closingDrawer}>Close</button>
            </div>
            <div className="audit-drawer-content">
              {selectedEvent && (
                <div className="audit-drawer-grid">
                  <div><span>Action</span><strong>{resolveActionType(selectedEvent)}</strong></div>
                  <div><span>Severity</span><strong>{mapSeverityToCategory(resolveSeverity(selectedEvent))}</strong></div>
                  <div><span>User</span><strong>{resolveUserLabel(selectedEvent)}</strong></div>
                  <div><span>Host company</span><strong>{resolveHostCompanyLabel(selectedEvent, hostCompanyMap)}</strong></div>
                  <div><span>Department</span><strong>{resolveDepartmentLabel(selectedEvent)}</strong></div>
                  <div><span>Device</span><strong>{resolveDeviceLabel(selectedEvent)}</strong></div>
                  <div><span>Location</span><strong>{resolveLocationLabel(selectedEvent)}</strong></div>
                  <div><span>Reason</span><strong>{resolveReasonLabel(selectedEvent)}</strong></div>
                </div>
              )}
              {selectedDetector && (
                <div className="audit-drawer-grid">
                  <div><span>User</span><strong>{selectedDetector.staffName}</strong></div>
                  <div><span>Detector</span><strong>{selectedDetector.reason}</strong></div>
                  <div><span>Details</span><strong>{selectedDetector.details || 'N/A'}</strong></div>
                  <div><span>Host company</span><strong>{selectedDetector.hostCompanyName || 'Unknown'}</strong></div>
                  <div><span>Department</span><strong>{selectedDetector.department || 'Not set'}</strong></div>
                  <div><span>Severity</span><strong>{severityDisplay[deriveDetectorSeverity(selectedDetector)]}</strong></div>
                </div>
              )}
              {selectedUser && (
                <div className="audit-drawer-grid">
                  <div><span>Name</span><strong>{`${selectedUser.name || ''} ${selectedUser.surname || ''}`.trim() || 'Unknown'}</strong></div>
                  <div><span>Role</span><strong>{selectedUser.role || 'Unknown'}</strong></div>
                  <div><span>Department</span><strong>{selectedUser.department || 'Unknown'}</strong></div>
                  <div><span>Host company</span><strong>{hostCompanyMap[selectedUser.hostCompanyId] || 'Unknown'}</strong></div>
                  <div><span>ID Number</span><strong>{selectedUser.idNumber || 'N/A'}</strong></div>
                  <div><span>Phone</span><strong>{selectedUser.phoneNumber || 'N/A'}</strong></div>
                  <div><span>Mentor</span><strong>{selectedUser.mentorName || 'N/A'}</strong></div>
                  <div><span>Created</span><strong>{formatDateOnly(selectedUser.createdAt)}</strong></div>
                </div>
              )}
              <div className="audit-drawer-json">
                <span>Payload</span>
                <pre>{JSON.stringify(selectedEvent || selectedDetector || selectedUser, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditCenter;
