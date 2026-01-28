import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveAPI } from '../services/api';
import './LeaveApplications.css';

function LeaveApplications({ isAdmin, hostCompanyId, isHostCompany }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const navigate = useNavigate();

  useEffect(() => {
    loadApplications();
  }, [statusFilter, hostCompanyId, isHostCompany]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = {
        reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(isHostCompany && hostCompanyId && { hostCompanyId })
      };
      const response = await leaveAPI.getAll(params);
      if (response.success) {
        setApplications(response.applications || []);
      }
    } catch (error) {
      console.error('Error loading leave applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const openApplicationDetails = (application, focusAction = false) => {
    if (!application || !application._id) return;
    navigate(`/leave-applications/${application._id}`, {
      state: {
        application,
        showActionForm: focusAction,
      },
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#16a34a';
      case 'rejected': return '#dc2626';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading leave applications...</p>
      </div>
    );
  }

  return (
    <div className="leave-applications-container">
      <div className="applications-header">
        <h2>Leave Applications</h2>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {applications.length > 0 ? (
        <div className="applications-table-container">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td>{app.internName || app.staffName || 'N/A'}</td>
                  <td>{app.startDate ? new Date(app.startDate).toLocaleDateString() : 'N/A'}</td>
                  <td>{app.endDate ? new Date(app.endDate).toLocaleDateString() : 'N/A'}</td>
                  <td>{app.numberOfDays || 'N/A'}</td>
                  <td>{app.leaveType || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
                      {app.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-details-btn"
                        onClick={() => openApplicationDetails(app)}
                      >
                        View Details
                      </button>
                      {app.status === 'pending' && app.canReview && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => openApplicationDetails(app, true)}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => openApplicationDetails(app, true)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>No leave applications found.</p>
        </div>
      )}

    </div>
  );
}

export default LeaveApplications;
