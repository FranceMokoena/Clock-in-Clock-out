import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { hostCompanyAPI, notificationAPI, notAccountableAPI } from '../../services/api';
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

const getActionTypeText = (entry) => {
  const fallback = entry?.data?.payload?.actionType
    || entry?.data?.actionType
    || entry?.actionData?.actionType
    || entry?.type
    || entry?.title
    || '';
  return toUpper(fallback);
};

const getNormalizedEntryText = (entry) => (
  `${getActionTypeText(entry)} ${toUpper(resolveReasonLabel(entry))}`
);

const matchesKeywords = (entry, keywords = []) => {
  if (!Array.isArray(keywords) || keywords.length === 0) return false;
  const haystack = getNormalizedEntryText(entry);
  return keywords.some((keyword) => haystack.includes(toUpper(keyword)));
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

  const REPORT_KEYWORD_BUCKETS = {
    failedClockIns: [
      'FAILED CLOCK',
      'FAILED_RECOGNITION',
      'MISSING CLOCK IN',
      'NO CLOCK IN',
      'MISSED CLOCK IN',
      'FACE NOT RECOGNIZED',
    ],
    missedClockOuts: [
      'MISSING CLOCK OUT',
      'NO CLOCK OUT',
      'MISSED CLOCK OUT',
      'CLOCK OUT FAILED',
    ],
    networkIssues: [
      'NETWORK',
      'OFFLINE',
      'TIMEOUT',
      'CONNECTIVITY',
    ],
    locationDenied: [
      'LOCATION_DENIED',
      'GEOFENCE',
      'OUTSIDE',
      'UNASSIGNED',
      'LOCATION ERROR',
      'LOCATION REJECTED',
    ],
    deviceMismatch: [
      'DEVICE_MISMATCH',
      'FINGERPRINT',
      'DEVICE NOT ALLOWED',
      'UNRECOGNIZED DEVICE',
      'DEVICE REJECTED',
    ],
  };

  const reportCounts = useMemo(() => {
    const counts = {};
    Object.entries(REPORT_KEYWORD_BUCKETS).forEach(([key, keywords]) => {
      counts[key] = entries.filter((entry) => matchesKeywords(entry, keywords)).length;
    });
    return counts;
  }, [entries]);

  const reportCards = [
    { key: 'failedClockIns', label: 'Failed clock-ins', severity: 'warning', description: 'Face or device issues halted sign-ins.' },
    { key: 'missedClockOuts', label: 'Missed clock-outs', severity: 'info', description: 'Early leave without checkout.' },
    { key: 'networkIssues', label: 'Network issues', severity: 'warning', description: 'Connectivity warnings reported.' },
    { key: 'locationDenied', label: 'Location denied', severity: 'critical', description: 'Geo restrictions triggered prevents.' },
    { key: 'deviceMismatch', label: 'Device mismatch', severity: 'critical', description: 'Fingerprints were rejected.' },
  ];

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
        <button
          type="button"
          className={`tab-button ${activeTab === 'developerReports' ? 'active' : ''}`}
          onClick={() => setActiveTab('developerReports')}
        >
          Developer Reports
        </button>
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
                          <tr key={entry._id} onClick={() => setSelectedEvent(entry)}>
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
                      <tr key={detector._id || `${detector.staffId}-${detector.reason}`} onClick={() => setSelectedDetector(detector)}>
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

        {activeTab === 'developerReports' && (
          <div className="audit-tab-content">
            <h3 className="audit-report-title">Developer reporting</h3>
            <div className="audit-report-grid">
              {reportCards.map((card) => (
                <div key={card.key} className="audit-report-card">
                  <div className="audit-report-card-header">
                    <span className={`audit-pill severity-${card.severity}`}>{card.label}</span>
                  </div>
                  <div className="audit-report-card-body">
                    <div className="audit-report-count">{reportCounts[card.key]}</div>
                    <p>{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(selectedEvent || selectedDetector) && (
        <div className="audit-drawer-overlay" onClick={closingDrawer}>
          <div className="audit-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="audit-drawer-header">
              <div>
                <h3>{selectedEvent ? 'Event details' : 'Detector details'}</h3>
                <p>{selectedEvent ? formatTimestamp(selectedEvent.createdAt) : detectorsDateLabel}</p>
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
              <div className="audit-drawer-json">
                <span>Payload</span>
                <pre>{JSON.stringify(selectedEvent || selectedDetector, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditCenter;
