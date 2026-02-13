import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  dashboardAPI,
  devicesAPI,
  departmentAPI,
  hostCompanyAPI,
  locationsAPI,
  notificationAPI,
  reportRunsAPI,
  reportSettingsAPI,
  systemAPI,
} from '../../services/api';
import './AuditCenter.css';

// Endpoints consulted:
// - notificationAPI.getAll -> event log + developer reporting
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
const looksLikeObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || '').trim());

const formatDeviceInfoLabel = (info) => {
  if (!info || typeof info !== 'object') return '';
  const brand = info.brand || info.manufacturer || '';
  const model = info.modelName || info.model || info.deviceName || '';
  const primary = [brand, model].filter(Boolean).join(' ').trim();
  if (primary) return primary;
  const platform = info.platform || '';
  const osVersion = info.osVersion || '';
  const secondary = [platform, osVersion].filter(Boolean).join(' ').trim();
  return secondary;
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

const DEFAULT_SYSTEM_HEALTH_SECTIONS = [
  { key: 'infrastructure', label: 'Health & Dependencies' },
  { key: 'dataIntegrity', label: 'Data Integrity' },
  { key: 'businessLogic', label: 'Business Logic' },
  { key: 'operationalReliability', label: 'Operational Reliability' },
  { key: 'backgroundJobs', label: 'Background Jobs & Reports' },
  { key: 'mobileAppHealth', label: 'Mobile App Health' },
  { key: 'deviceTrust', label: 'Devices' },
  { key: 'reports', label: 'Reports & jobs' },
  { key: 'smtp', label: 'Email (SMTP)' },
  { key: 'faceRecognition', label: 'Face recognition' },
];

const resolveHealthStatusSeverity = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'RED' || normalized === 'CRITICAL') return 'critical';
  if (normalized === 'AMBER' || normalized === 'WARNING') return 'warning';
  if (normalized === 'OK' || normalized === 'INFO') return 'info';
  return 'info';
};

const SYSTEM_HEALTH_LANGUAGE = {
  statuses: [
    {
      label: 'OK',
      severity: 'info',
      description: 'Normal operation. No action required.',
    },
    {
      label: 'AMBER',
      severity: 'warning',
      description: 'Warning threshold reached. Investigate soon.',
    },
    {
      label: 'RED',
      severity: 'critical',
      description: 'Critical condition. Immediate attention required.',
    },
    {
      label: 'UNKNOWN',
      severity: 'info',
      description: 'Not enough data in the window to evaluate.',
    },
  ],
  timing: [
    'Peak usage windows: 07:30-08:30 and 16:00-17:30 (local time).',
    'Allowed clock tolerance: 15 minutes around expected time.',
  ],
  windows: [
    'Request latency/error checks look back 5 minutes.',
    'Geocoding and location checks look back 30 minutes.',
    'Report runs checks look back 24 hours.',
    'Memory trend looks back 10 minutes.',
  ],
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

const resolveDepartmentLabel = (entry, map = {}) => {
  const payload = entry?.data?.payload || {};
  const candidate =
    payload.departmentName
    || payload.department
    || entry?.relatedEntities?.departmentId?.name
    || entry?.subjectUserId?.department
    || entry?.relatedEntities?.departmentId;

  if (candidate && typeof candidate === 'object') {
    if (candidate.name) return candidate.name;
    if (candidate._id && map[candidate._id]) return map[candidate._id];
  }

  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (map[trimmed]) return map[trimmed];
    if (looksLikeObjectId(trimmed)) return map[trimmed] || 'Unknown';
    return trimmed || 'Unknown';
  }

  return 'Unknown';
};

const isLikelyOpaqueId = (value) => {
  if (!value) return false;
  const text = String(value).trim();
  if (text.length < 10) return false;
  if (looksLikeObjectId(text)) return true;
  if (/^[A-Fa-f0-9]{16,64}$/.test(text)) return true;
  if (/^[A-Za-z0-9_-]{12,}$/.test(text)) return true;
  return false;
};

const resolveDeviceLabel = (entry, map = {}) => {
  const payload = entry?.data?.payload || {};
  const explicit =
    payload.deviceLabel
    || payload.deviceName
    || formatDeviceInfoLabel(payload.deviceInfo)
    || formatDeviceInfoLabel(entry?.deviceInfo);

  if (explicit) return explicit;

  const rawDevice = payload.device;
  if (rawDevice && !isLikelyOpaqueId(rawDevice)) {
    return rawDevice;
  }

  const fingerprint =
    payload.deviceFingerprint
    || payload.deviceId
    || (rawDevice && isLikelyOpaqueId(rawDevice) ? rawDevice : '')
    || entry?.deviceInfo?.deviceId
    || '';

  if (fingerprint && map[fingerprint]) return map[fingerprint];

  const trustedDevices =
    entry?.relatedEntities?.staffId?.trustedDevices
    || entry?.subjectUserId?.trustedDevices
    || [];

  if (fingerprint && Array.isArray(trustedDevices)) {
    const match = trustedDevices.find((device) => device?.fingerprint === fingerprint);
    if (match?.label) return match.label;
    const infoLabel = formatDeviceInfoLabel(match?.deviceInfo);
    if (infoLabel) return infoLabel;
  }

  const ownerLabel = payload.sharedDeviceOwner?.staffName;
  if (ownerLabel) return `${ownerLabel}'s device`;

  if (fingerprint && isLikelyOpaqueId(fingerprint)) return 'Registered Device';
  return fingerprint ? 'Registered Device' : '-';
};

const resolveLocationLabel = (entry, map = {}) => {
  const payload = entry?.data?.payload || {};
  const preferred =
    payload.locationName
    || payload.assignedLocation
    || payload.locationAddress;
  if (preferred) {
    const key = String(preferred).trim();
    if (map[key]?.name) return map[key].name;
    return preferred;
  }

  const raw = payload.location;
  if (!raw) return '-';
  const text = String(raw).trim();
  if (!text) return '-';
  if (map[text]?.name) return map[text].name;
  if (looksLikeObjectId(text)) return 'Assigned location';
  if (/^-?\d+(\.\d+)?[, ]\s*-?\d+(\.\d+)?$/.test(text)) {
    const staffLocation =
      entry?.subjectUserId?.location
      || entry?.relatedEntities?.staffId?.location
      || '';
    const staffKey = String(staffLocation || '').trim();
    if (staffKey && map[staffKey]?.name) return map[staffKey].name;
    if (staffKey) return staffKey;
    return 'GPS location';
  }
  return text;
};

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
  const canViewSystemHealth = Boolean(isAdmin);
  const [entries, setEntries] = useState([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState('');
  const [activeTab, setActiveTab] = useState('eventLog');
  const [selectedEvent, setSelectedEvent] = useState(null);
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
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState('');
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState('');
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [reportRuns, setReportRuns] = useState([]);
  const [reportRunsLoading, setReportRunsLoading] = useState(false);
  const [reportRunsError, setReportRunsError] = useState('');
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemHealthLoading, setSystemHealthLoading] = useState(false);
  const [systemHealthError, setSystemHealthError] = useState('');
  const [isHealthInfoOpen, setIsHealthInfoOpen] = useState(false);

  const hostCompanyMap = useMemo(() => {
    const map = {};
    hostCompanies.forEach((company) => {
      if (company?._id) {
        map[company._id] = company.companyName || company.name || 'Unknown';
      }
    });
    return map;
  }, [hostCompanies]);

  const departmentMap = useMemo(() => {
    const map = {};
    departments.forEach((dept) => {
      if (dept?._id) {
        map[dept._id] = dept.name || dept.departmentName || 'Unknown';
      }
    });
    return map;
  }, [departments]);

  const deviceMap = useMemo(() => {
    const map = {};
    devices.forEach((device) => {
      if (device?.fingerprint) {
        const label = device.label || formatDeviceInfoLabel(device.deviceInfo) || 'Registered Device';
        map[device.fingerprint] = label;
      }
    });
    return map;
  }, [devices]);

  const locationMap = useMemo(() => {
    const map = {};
    locations.forEach((loc) => {
      if (loc?.key) {
        map[loc.key] = {
          name: loc.name || loc.key,
          address: loc.address || loc.name || loc.key,
        };
      }
    });
    return map;
  }, [locations]);

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
    if (!canViewSystemHealth && activeTab === 'systemHealth') {
      setActiveTab('eventLog');
    }
    if (activeTab === 'detectors') {
      setActiveTab('eventLog');
    }
  }, [activeTab, canViewDeveloperReports, canViewSystemHealth]);

  useEffect(() => {
    if (isAdmin) {
      fetchHostCompanies();
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchEntries();
  }, [hostCompanyFilter, isAdmin, isHostCompany, hostCompanyId]);

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

  const fetchDepartments = useCallback(async () => {
    if (!isAdmin && !isHostCompany) return;
    setDepartmentsLoading(true);
    setDepartmentsError('');
    try {
      const hostId = scopedHostId();
      const params = hostId ? { hostCompanyId: hostId } : {};
      const response = await departmentAPI.getAll(params);
      if (response?.success) {
        const list = response.departments || [];
        setDepartments(Array.isArray(list) ? list : []);
      } else {
        setDepartments([]);
        setDepartmentsError(response?.error || 'Endpoint not connected');
      }
    } catch (error) {
      setDepartments([]);
      setDepartmentsError('Endpoint not connected');
    } finally {
      setDepartmentsLoading(false);
    }
  }, [isAdmin, isHostCompany, scopedHostId]);

  const fetchDevices = useCallback(async () => {
    if (!isAdmin && !isHostCompany) return;
    setDevicesLoading(true);
    setDevicesError('');
    try {
      const hostId = scopedHostId();
      const params = hostId ? { hostCompanyId: hostId } : {};
      const response = await devicesAPI.getAll(params);
      if (response?.success) {
        const list = response.devices || [];
        setDevices(Array.isArray(list) ? list : []);
      } else {
        setDevices([]);
        setDevicesError(response?.error || 'Endpoint not connected');
      }
    } catch (error) {
      setDevices([]);
      setDevicesError('Endpoint not connected');
    } finally {
      setDevicesLoading(false);
    }
  }, [isAdmin, isHostCompany, scopedHostId]);

  const fetchLocations = useCallback(async () => {
    if (!isAdmin && !isHostCompany) return;
    setLocationsLoading(true);
    setLocationsError('');
    try {
      const response = await locationsAPI.getAll();
      if (response?.success) {
        const list = response.locations || [];
        setLocations(Array.isArray(list) ? list : []);
      } else {
        setLocations([]);
        setLocationsError(response?.error || 'Endpoint not connected');
      }
    } catch (error) {
      setLocations([]);
      setLocationsError('Endpoint not connected');
    } finally {
      setLocationsLoading(false);
    }
  }, [isAdmin, isHostCompany]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

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

  const fetchSystemHealth = useCallback(async () => {
    if (!canViewSystemHealth) return;
    setSystemHealthLoading(true);
    setSystemHealthError('');
    try {
      const hostId = scopedHostId();
      const params = {};
      if (hostId) params.hostCompanyId = hostId;
      const response = await systemAPI.getSystemHealth(params);
      if (response?.success) {
        setSystemHealth(response);
      } else {
        setSystemHealth(null);
        setSystemHealthError(response?.error || 'Failed to load system health.');
      }
    } catch (error) {
      setSystemHealth(null);
      setSystemHealthError('Failed to load system health.');
    } finally {
      setSystemHealthLoading(false);
    }
  }, [canViewSystemHealth, scopedHostId]);

  useEffect(() => {
    if (activeTab === 'developerReports') {
      if (!canViewDeveloperReports) return;
      fetchDeveloperOverview();
      fetchReportRuns();
    }
    if (activeTab === 'systemHealth') {
      if (!canViewSystemHealth) return;
      fetchSystemHealth();
    }
  }, [activeTab, canViewDeveloperReports, canViewSystemHealth, fetchDeveloperOverview, fetchReportRuns, fetchSystemHealth]);
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
          resolveDepartmentLabel(entry, departmentMap),
          resolveLocationLabel(entry, locationMap)
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
    departmentMap,
    locationMap,
    scopedHostId,
  ]);

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
      }
    ];
  }, [overview, reportRuns]);

  const systemHealthSections = useMemo(() => {
    if (systemHealth?.sections?.length) {
      return systemHealth.sections;
    }
    const summaryKeys = systemHealth?.summary ? Object.keys(systemHealth.summary) : [];
    if (summaryKeys.length) {
      return summaryKeys.map((key) => {
        const fallback = DEFAULT_SYSTEM_HEALTH_SECTIONS.find((section) => section.key === key);
        return {
          key,
          label: fallback?.label || key,
          description: fallback?.description,
        };
      });
    }
    return DEFAULT_SYSTEM_HEALTH_SECTIONS;
  }, [systemHealth]);

  const systemHealthChecks = useMemo(() => (
    Array.isArray(systemHealth?.checks) ? systemHealth.checks : []
  ), [systemHealth]);

  const systemHealthChecksBySection = useMemo(() => {
    const map = {};
    systemHealthChecks.forEach((check) => {
      if (!check?.section) return;
      if (!map[check.section]) map[check.section] = [];
      map[check.section].push(check);
    });
    return map;
  }, [systemHealthChecks]);

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

  const closingDrawer = () => {
    setSelectedEvent(null);
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
              if (activeTab === 'developerReports') {
                fetchDeveloperOverview();
                fetchReportRuns();
              }
              if (activeTab === 'systemHealth' && canViewSystemHealth) {
                fetchSystemHealth();
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
        {canViewSystemHealth && (
          <button
            type="button"
            className={`tab-button ${activeTab === 'systemHealth' ? 'active' : ''}`}
            onClick={() => setActiveTab('systemHealth')}
          >
            System Health
          </button>
        )}
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
                              setSelectedEvent(entry);
                            }}
                          >
                            <td>{formatTimestamp(entry.createdAt)}</td>
                            <td>{resolveUserLabel(entry)}</td>
                            <td>{resolveActionType(entry)}</td>
                            <td>{renderResultCell(entry)}</td>
                            <td>{resolveHostCompanyLabel(entry, hostCompanyMap)}</td>
                            <td>{resolveDepartmentLabel(entry, departmentMap)}</td>
                            <td>{shorten(resolveDeviceLabel(entry, deviceMap), 14)}</td>
                            <td>{resolveLocationLabel(entry, locationMap)}</td>
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

        {activeTab === 'systemHealth' && (
          <div className="audit-tab-content">
            <div className="audit-dev-section">
              <div className="audit-dev-section-header">
                <div>
                  <div className="audit-dev-section-title">
                    <h3>System Health</h3>
                    <button
                      type="button"
                      className="audit-info-button"
                      title="How to read System Health"
                      onClick={() => setIsHealthInfoOpen(true)}
                    >
                      i
                    </button>
                  </div>
                  <p>Technical and business-critical signals for this scope.</p>
                </div>
                {systemHealthLoading && <span className="audit-pill severity-info">Loading</span>}
                {!systemHealthLoading && systemHealthError && (
                  <span className="audit-pill severity-critical">Error</span>
                )}
              </div>
              {systemHealthLoading && (
                <div className="audit-center-loading">
                  <div className="spinner" />
                  <p>Loading system health...</p>
                </div>
              )}
              {!systemHealthLoading && systemHealthError && (
                <div className="audit-center-error">
                  <p>{systemHealthError}</p>
                </div>
              )}
              {!systemHealthLoading && !systemHealthError && systemHealth && (
                <>
                  <div className="audit-overview-grid">
                    {systemHealthSections.map((section) => {
                      const item = systemHealth.summary?.[section.key];
                      if (!item) return null;
                      const status = String(item.status || 'UNKNOWN').toUpperCase();
                      const severity = resolveHealthStatusSeverity(status);
                      return (
                        <div key={section.key} className="audit-overview-card">
                          <div className="audit-overview-card-header">
                            <span className="audit-overview-label">{section.label || section.key}</span>
                            <span className={`audit-pill severity-${severity}`}>{status}</span>
                          </div>
                          <div className="audit-overview-value">
                            {item.reason || 'No details'}
                          </div>
                          {section.description && (
                            <div className="audit-overview-sub">{section.description}</div>
                          )}
                          {item.metrics && (
                            <div className="audit-overview-sub">
                              {Object.entries(item.metrics)
                                .filter(([metricKey, metricValue]) => metricValue !== null && metricValue !== undefined)
                                .map(([metricKey, metricValue]) => (
                                  <div key={metricKey}>
                                    <strong>{metricKey}:</strong> {typeof metricValue === 'number'
                                      ? metricValue.toFixed
                                        ? metricValue.toFixed(1)
                                        : metricValue
                                      : String(metricValue)}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {systemHealthChecks.length > 0 && (
                    <div className="audit-system-checks">
                      {systemHealthSections.map((section) => {
                        const checks = systemHealthChecksBySection[section.key] || [];
                        if (!checks.length) return null;
                        return (
                          <div key={section.key} className="audit-system-section">
                            <div className="audit-dev-section-header">
                              <div>
                                <h4>{section.label || section.key}</h4>
                                {section.description && <p>{section.description}</p>}
                              </div>
                            </div>
                            <div className="audit-table-wrapper">
                              <table className="audit-table">
                                <thead>
                                  <tr>
                                    <th>Check</th>
                                    <th>Status</th>
                                    <th>Detail</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {checks.map((check) => {
                                    const status = String(check.status || 'UNKNOWN').toUpperCase();
                                    const severity = resolveHealthStatusSeverity(status);
                                    return (
                                      <tr key={`${section.key}-${check.label}`}>
                                        <td>{check.label}</td>
                                        <td>
                                          <span className={`audit-pill severity-${severity}`}>{status}</span>
                                        </td>
                                        <td>
                                          <div>{check.detail || '-'}</div>
                                          {check.metrics && (
                                            <div className="audit-overview-sub">
                                              {Object.entries(check.metrics)
                                                .filter(([metricKey, metricValue]) => metricValue !== null && metricValue !== undefined)
                                                .map(([metricKey, metricValue]) => (
                                                  <div key={metricKey}>
                                                    <strong>{metricKey}:</strong> {typeof metricValue === 'number'
                                                      ? metricValue.toFixed
                                                        ? metricValue.toFixed(1)
                                                        : metricValue
                                                      : String(metricValue)}
                                                  </div>
                                                ))}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {systemHealthChecks.length === 0 && (
                    <div className="audit-center-empty">No diagnostic checks available.</div>
                  )}
                  <div className="audit-dev-section-footer">
                    <span className="audit-overview-sub">
                      Evaluated at {formatTimestamp(systemHealth.evaluatedAt)}
                      {' • '}
                      Window {systemHealth.windowMinutes || 60} minutes
                    </span>
                  </div>
                </>
              )}
            </div>
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

      {selectedEvent && (
        <div className="audit-drawer-overlay" onClick={closingDrawer}>
          <div className="audit-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="audit-drawer-header">
              <div>
                <h3>Event details</h3>
                <p>
                  {formatTimestamp(selectedEvent.createdAt)}
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
                  <div><span>Department</span><strong>{resolveDepartmentLabel(selectedEvent, departmentMap)}</strong></div>
                  <div><span>Device</span><strong>{resolveDeviceLabel(selectedEvent, deviceMap)}</strong></div>
                  <div><span>Location</span><strong>{resolveLocationLabel(selectedEvent, locationMap)}</strong></div>
                  <div><span>Reason</span><strong>{resolveReasonLabel(selectedEvent)}</strong></div>
                </div>
              )}
              <div className="audit-drawer-json">
                <span>Payload</span>
                <pre>{JSON.stringify(selectedEvent, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {isHealthInfoOpen && (
        <div className="audit-modal-overlay" onClick={() => setIsHealthInfoOpen(false)}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div>
                <h3>System Health language</h3>
                <p>What the colors and checks mean in this screen.</p>
              </div>
              <button type="button" onClick={() => setIsHealthInfoOpen(false)}>Close</button>
            </div>
            <div className="audit-modal-content">
              <div className="audit-modal-section">
                <h4>Status legend</h4>
                <div className="audit-legend-grid">
                  {SYSTEM_HEALTH_LANGUAGE.statuses.map((item) => (
                    <div key={item.label} className="audit-legend-card">
                      <div className="audit-legend-title">
                        <span className={`audit-pill severity-${item.severity}`}>{item.label}</span>
                        <strong>{item.label}</strong>
                      </div>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="audit-modal-section">
                <h4>Timing rules</h4>
                <div className="audit-modal-list">
                  {SYSTEM_HEALTH_LANGUAGE.timing.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>

              <div className="audit-modal-section">
                <h4>Lookback windows</h4>
                <div className="audit-modal-list">
                  {SYSTEM_HEALTH_LANGUAGE.windows.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditCenter;
