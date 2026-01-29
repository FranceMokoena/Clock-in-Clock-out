import React, { useState, useEffect } from 'react';
import { MdAssignment } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI } from '../services/api';
import './AttendanceCorrections.css';

function AttendanceCorrections({ isAdmin, hostCompanyId, isHostCompany, onSwitchToLeave }) {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadCorrections();
  }, [statusFilter, hostCompanyId, isHostCompany]);

  const loadCorrections = async () => {
    setLoading(true);
    try {
      const params = {
        reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(isHostCompany && hostCompanyId && { hostCompanyId })
      };
      const response = await attendanceAPI.getCorrections(params);
      if (response.success) {
        setCorrections(response.corrections || []);
      }
    } catch (error) {
      console.error('Error loading attendance corrections:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCorrectionDetails = (correction, focusAction = false) => {
    if (!correction || !correction._id) return;
    navigate(`/attendance-corrections/${correction._id}`, {
      state: {
        correction,
        showActionForm: focusAction,
      },
    });
  };

  const getCorrectionTypeLabel = (type) => {
    if (!type) return 'Other';
    const typeStr = String(type);
    switch (typeStr) {
      case 'missing_clock_in': return 'Missing Clock-In';
      case 'missing_clock_out': return 'Missing Clock-Out';
      case 'wrong_time': return 'Wrong Time';
      case 'missing_break': return 'Missing Break';
      default: return typeStr.replace(/_/g, ' ');
    }
  };

  const getRequestedTime = (corr) => {
    if (!corr) return null;
    const requested = corr.requestedChange || {};
    return (
      requested.clockInTime ||
      requested.clockOutTime ||
      requested.breakStartTime ||
      requested.breakEndTime ||
      requested.lunchStartTime ||
      requested.lunchEndTime ||
      requested.requestedTime ||
      corr.requestedTime ||
      null
    );
  };

  const getCorrectionReason = (corr) => {
    if (!corr) return 'N/A';
    const requested = corr.requestedChange || {};
    return requested.description || requested.reason || corr.reason || 'N/A';
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

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading attendance corrections...</p>
      </div>
    );
  }

  return (
    <div className="corrections-container">
      <div className="corrections-header">
        <h2>Attendance Corrections</h2>
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

      {corrections.length > 0 ? (
        <div className="corrections-table-container">
          <table className="corrections-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Date</th>
                <th>Type</th>
                <th>Requested Time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((corr) => (
                <tr key={corr._id}>
                  <td>{corr.internName || corr.staffName || 'N/A'}</td>
                  <td>{corr.date ? new Date(corr.date).toLocaleDateString() : 'N/A'}</td>
                  <td>{getCorrectionTypeLabel(corr.correctionType || corr.type)}</td>
                  <td>{formatTime(getRequestedTime(corr))}</td>
                  <td className="reason-cell">{getCorrectionReason(corr)}</td>
                  <td>
                    <span className={`status-badge ${corr.status === 'approved' ? 'status-approved' : corr.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                      {corr.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-details-btn"
                        onClick={() => openCorrectionDetails(corr)}
                      >
                        View Details
                      </button>
                      {corr.status === 'pending' && corr.canReview && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => openCorrectionDetails(corr, true)}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => openCorrectionDetails(corr, true)}
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
          <p>No attendance corrections found.</p>
        </div>
      )}

    </div>
  );
}

export default AttendanceCorrections;
