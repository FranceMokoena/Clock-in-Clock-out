import React, { useState, useEffect } from 'react';
import { dashboardAPI, hostCompanyAPI, departmentAPI } from '../services/api';
import './Recents.css';

function Recents({ isAdmin, hostCompanyId, isHostCompany }) {
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('last10');
  const [selectedHostCompany, setSelectedHostCompany] = useState(hostCompanyId || '');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [hostCompanies, setHostCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [hostCompaniesLoading, setHostCompaniesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadHostCompanies();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedHostCompany) {
      loadDepartments();
    }
  }, [selectedHostCompany]);

  useEffect(() => {
    loadRecents();
  }, [filterType, selectedHostCompany, selectedDepartment]);

  const loadHostCompanies = async () => {
    try {
      setHostCompaniesLoading(true);
      const response = await hostCompanyAPI.getAll();
      if (response.success) {
        const companies = response.companies || response.hostCompanies || response.data || [];
        setHostCompanies(Array.isArray(companies) ? companies : []);
      } else {
        setHostCompanies([]);
      }
    } catch (err) {
      setHostCompanies([]);
    } finally {
      setHostCompaniesLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const params = selectedHostCompany ? { hostCompanyId: selectedHostCompany } : {};
      const response = await departmentAPI.getAll(params);
      if (response.success) {
        const depts = response.departments || response.data || [];
        setDepartments(Array.isArray(depts) ? depts : []);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadRecents = async () => {
    try {
      setLoading(true);
      setError(null);
      let limit = filterType === 'last10' ? 10 : 100;
      const params = { limit };
      let queryHostCompanyId = hostCompanyId;
      if (isAdmin && selectedHostCompany) {
        queryHostCompanyId = selectedHostCompany;
      }
      if (queryHostCompanyId) {
        params.hostCompanyId = queryHostCompanyId;
      }
      if (selectedDepartment) {
        params.departmentId = selectedDepartment;
      }
      const response = await dashboardAPI.getRecentActivity(queryHostCompanyId, params);
      if (response.success && Array.isArray(response.activity)) {
        setRecents(response.activity);
      } else {
        setRecents([]);
      }
    } catch (err) {
      setError('Failed to load recent activities');
      setRecents([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'CLOCK_IN': return 'CI';
      case 'CLOCK_OUT': return 'CO';
      case 'LEAVE_REQUEST': return 'LR';
      case 'LEAVE_APPROVED': return 'LA';
      case 'LEAVE_REJECTED': return 'LR';
      case 'ATTENDANCE_CORRECTION_REQUEST': return 'CR';
      case 'ATTENDANCE_CORRECTION_APPROVED': return 'CA';
      case 'ATTENDANCE_CORRECTION_REJECTED': return 'CR';
      case 'STAFF_REGISTERED': return 'SR';
      case 'DEVICE_APPROVED': return 'DA';
      case 'DEPARTMENT_CREATED': return 'DC';
      default: return 'EV';
    }
  };

  const getActivityColor = (type) => {
    if (type.includes('CLOCK_IN')) return '#047857';
    if (type.includes('CLOCK_OUT')) return '#b91c1c';
    if (type.includes('LEAVE')) return '#1d4ed8';
    if (type.includes('CORRECTION')) return '#9d174d';
    if (type.includes('APPROVED')) return '#047857';
    if (type.includes('REJECTED')) return '#b91c1c';
    return '#0f172a';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityTitle = (activity) => {
    const data = activity.data || {};
    switch (activity.type) {
      case 'CLOCK_IN': return `${data.staffName} clocked in`;
      case 'CLOCK_OUT': return `${data.staffName} clocked out`;
      case 'LEAVE_REQUEST': return `${data.staffName} submitted a leave request`;
      case 'LEAVE_APPROVED': return `Leave approved for ${data.staffName}`;
      case 'LEAVE_REJECTED': return `Leave rejected for ${data.staffName}`;
      case 'ATTENDANCE_CORRECTION_REQUEST': return `${data.staffName} requested correction`;
      case 'ATTENDANCE_CORRECTION_APPROVED': return `Attendance correction approved`;
      case 'ATTENDANCE_CORRECTION_REJECTED': return `Attendance correction rejected`;
      case 'STAFF_REGISTERED': return `${data.staffName || 'New staff'} registered`;
      case 'DEVICE_APPROVED': return `Device approved: ${data.deviceName || 'Unknown device'}`;
      case 'DEPARTMENT_CREATED': return `Department created: ${data.departmentName}`;
      default: return activity.title || 'System activity logged';
    }
  };

  const getActivityDetails = (activity) => {
    const data = activity.data || {};
    switch (activity.type) {
      case 'CLOCK_IN':
      case 'CLOCK_OUT':
        return `${data.location || 'Location not recorded'} � ${new Date(data.timestamp || activity.createdAt).toLocaleTimeString()}`;
      case 'LEAVE_REQUEST':
        return `From ${new Date(data.startDate).toLocaleDateString()} to ${new Date(data.endDate).toLocaleDateString()}`;
      case 'ATTENDANCE_CORRECTION_REQUEST':
        return `For ${new Date(data.date).toLocaleDateString()}`;
      default:
        return activity.message || 'No additional details';
    }
  };

  if (loading) {
    return (
      <div className="recents-page">
        <div className="recents-panel">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading recent activities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recents-page">
      <section className="recents-panel recents-hero">
        <div className="recents-hero-content">
          <span className="official-tag">OFFICIAL ACTIVITY REGISTER</span>
          <h2>Recent Activity Log</h2>
          <p>Chronological summary of clocks, leave requests, corrections, approvals, and operational alerts.</p>
        </div>
        <div className="recents-hero-actions">
          <span className="hero-meta">Updated every 5 minutes</span>
          <button onClick={loadRecents} className="refresh-button" title="Refresh recent activity log">
            Refresh
          </button>
        </div>
      </section>

      <section className="recents-panel recents-filters">
        <div className="filter-group">
          <label>Record Scope:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterType === 'last10' ? 'active' : ''}`}
              onClick={() => setFilterType('last10')}
            >
              Latest 10
            </button>
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Full Register
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="filter-group">
            <label>Host Company:</label>
            <select
              value={selectedHostCompany}
              onChange={(e) => {
                setSelectedHostCompany(e.target.value);
                setSelectedDepartment('');
              }}
              disabled={hostCompaniesLoading}
              className="filter-select"
            >
              <option value="">All Companies</option>
              {hostCompanies.map(company => (
                <option key={company._id} value={company._id}>
                  {company.companyName || company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedHostCompany && (
          <div className="filter-group">
            <label>Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={departmentsLoading}
              className="filter-select"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-info">
          Showing <strong>{recents.length}</strong> {recents.length === 1 ? 'event' : 'events'}
        </div>
      </section>

      {error && (
        <section className="recents-panel error-panel">
          {error}
        </section>
      )}

      <section className="recents-panel recents-list-panel">
        {recents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">ℹ️</div>
            <p>No recorded activity for the selected filters.</p>
          </div>
        ) : (
          <div className="recents-list">
            {recents.map((activity) => (
              <div
                key={activity._id}
                className="recent-item"
                style={{ borderLeftColor: getActivityColor(activity.type) }}
              >
                <div className="recent-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="recent-content">
                  <div className="recent-title">{getActivityTitle(activity)}</div>
                  <div className="recent-details">{getActivityDetails(activity)}</div>
                </div>
                <div className="recent-time">{formatTime(activity.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Recents;
