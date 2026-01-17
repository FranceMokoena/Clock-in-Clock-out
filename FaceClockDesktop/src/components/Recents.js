import React, { useState, useEffect } from 'react';
import { dashboardAPI, hostCompanyAPI, departmentAPI } from '../services/api';
import './Recents.css';

function Recents({ isAdmin, hostCompanyId, isHostCompany }) {
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filterType, setFilterType] = useState('last10'); // last10, all
  const [selectedHostCompany, setSelectedHostCompany] = useState(hostCompanyId || '');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [hostCompanies, setHostCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [hostCompaniesLoading, setHostCompaniesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  // Load host companies for filter (only for admin)
  useEffect(() => {
    if (isAdmin) {
      loadHostCompanies();
    }
  }, [isAdmin]);

  // Load departments when host company changes
  useEffect(() => {
    if (selectedHostCompany) {
      loadDepartments();
    }
  }, [selectedHostCompany]);

  // Load recents when filters change
  useEffect(() => {
    loadRecents();
  }, [filterType, selectedHostCompany, selectedDepartment]);

  const loadHostCompanies = async () => {
    try {
      setHostCompaniesLoading(true);
      const response = await hostCompanyAPI.getAll();
      console.log('✅ Host companies response:', response);
      
      // Backend returns 'companies' field
      if (response.success) {
        const companies = response.companies || response.hostCompanies || response.data || [];
        if (Array.isArray(companies) && companies.length > 0) {
          setHostCompanies(companies);
          console.log(`✅ Loaded ${companies.length} host companies`);
        } else {
          console.warn('⚠️ No companies found in response');
          setHostCompanies([]);
        }
      } else {
        console.warn('⚠️ Failed to load host companies:', response.error);
        setHostCompanies([]);
      }
    } catch (err) {
      console.error('❌ Error loading host companies:', err);
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
      console.log('Departments response:', response);
      
      // Handle different response formats
      if (response.success) {
        const depts = response.departments || response.data || [];
        if (Array.isArray(depts)) {
          setDepartments(depts);
          console.log('✅ Loaded departments:', depts.length);
        } else {
          console.warn('⚠️ Departments not in expected format');
          setDepartments([]);
        }
      } else {
        console.warn('⚠️ Failed to load departments:', response.error);
        setDepartments([]);
      }
    } catch (err) {
      console.error('❌ Error loading departments:', err);
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadRecents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine limit based on filter
      let limit = 100;
      if (filterType === 'last10') {
        limit = 10;
      }
      
      // Build params
      const params = { limit };
      
      // Add host company filter
      let queryHostCompanyId = hostCompanyId;
      if (isAdmin && selectedHostCompany) {
        queryHostCompanyId = selectedHostCompany;
      }
      
      if (queryHostCompanyId) {
        params.hostCompanyId = queryHostCompanyId;
      }
      
      // Add department filter
      if (selectedDepartment) {
        params.departmentId = selectedDepartment;
      }
      
      // Fetch notifications
      const response = await dashboardAPI.getRecentActivity(
        queryHostCompanyId,
        params
      );
      
      if (response.success && response.activity) {
        setRecents(response.activity);
      } else {
        setRecents([]);
      }
    } catch (err) {
      console.error('Error loading recents:', err);
      setError('Failed to load recent activities');
      setRecents([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'CLOCK_IN':
        return '🟢';
      case 'CLOCK_OUT':
        return '🔴';
      case 'LEAVE_REQUEST':
        return '🏖️';
      case 'LEAVE_APPROVED':
        return '✅';
      case 'LEAVE_REJECTED':
        return '❌';
      case 'ATTENDANCE_CORRECTION_REQUEST':
        return '📝';
      case 'ATTENDANCE_CORRECTION_APPROVED':
        return '✅';
      case 'ATTENDANCE_CORRECTION_REJECTED':
        return '❌';
      case 'STAFF_REGISTERED':
        return '👤';
      case 'DEVICE_APPROVED':
        return '📱';
      case 'DEPARTMENT_CREATED':
        return '🏢';
      default:
        return 'ℹ️';
    }
  };

  const getActivityColor = (type) => {
    if (type.includes('CLOCK_IN')) return '#4CAF50';
    if (type.includes('CLOCK_OUT')) return '#F44336';
    if (type.includes('LEAVE')) return '#2196F3';
    if (type.includes('CORRECTION')) return '#FF9800';
    if (type.includes('APPROVED')) return '#4CAF50';
    if (type.includes('REJECTED')) return '#F44336';
    return '#9C27B0';
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
      case 'CLOCK_IN':
        return `${data.staffName} clocked in`;
      case 'CLOCK_OUT':
        return `${data.staffName} clocked out`;
      case 'LEAVE_REQUEST':
        return `${data.staffName} requested leave`;
      case 'LEAVE_APPROVED':
        return `Leave approved for ${data.staffName}`;
      case 'LEAVE_REJECTED':
        return `Leave rejected for ${data.staffName}`;
      case 'ATTENDANCE_CORRECTION_REQUEST':
        return `${data.staffName} requested attendance correction`;
      case 'ATTENDANCE_CORRECTION_APPROVED':
        return `Attendance correction approved`;
      case 'ATTENDANCE_CORRECTION_REJECTED':
        return `Attendance correction rejected`;
      case 'STAFF_REGISTERED':
        return `${data.staffName} registered as ${data.role}`;
      case 'DEVICE_APPROVED':
        return `Device approved: ${data.deviceName}`;
      case 'DEPARTMENT_CREATED':
        return `Department created: ${data.departmentName}`;
      default:
        return activity.title || 'System Activity';
    }
  };

  const getActivityDetails = (activity) => {
    const data = activity.data || {};
    switch (activity.type) {
      case 'CLOCK_IN':
      case 'CLOCK_OUT':
        return `${data.location || 'Unknown location'} • ${new Date(data.timestamp).toLocaleTimeString()}`;
      case 'LEAVE_REQUEST':
        return `From ${new Date(data.startDate).toLocaleDateString()} to ${new Date(data.endDate).toLocaleDateString()}`;
      case 'ATTENDANCE_CORRECTION_REQUEST':
        return `For ${new Date(data.date).toLocaleDateString()}`;
      default:
        return activity.message || '';
    }
  };

  if (loading) {
    return (
      <div className="recents-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading recent activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recents-container">
      <div className="recents-header">
        <h2>📋 Recent Activities</h2>
        <button onClick={loadRecents} className="refresh-button" title="Refresh">
          🔄
        </button>
      </div>

      {/* Filter Controls */}
      <div className="recents-filters">
        <div className="filter-group">
          <label>Show:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterType === 'last10' ? 'active' : ''}`}
              onClick={() => setFilterType('last10')}
            >
              Last 10
            </button>
            <button 
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
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
                setSelectedDepartment(''); // Reset department when company changes
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
          Showing {recents.length} {recents.length === 1 ? 'activity' : 'activities'}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading recent activities...</p>
        </div>
      ) : recents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No recent activities yet</p>
        </div>
      ) : (
        <div className="recents-list">
          {recents.map((activity) => (
            <div key={activity._id} className="recent-item" style={{ borderLeftColor: getActivityColor(activity.type) }}>
              <div className="recent-icon">
                {getActivityIcon(activity.type)}
              </div>
              <div className="recent-content">
                <div className="recent-title">
                  {getActivityTitle(activity)}
                </div>
                <div className="recent-details">
                  {getActivityDetails(activity)}
                </div>
              </div>
              <div className="recent-time">
                {formatTime(activity.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Recents;
