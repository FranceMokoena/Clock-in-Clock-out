import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import './LeaveApplications.css';

function LeaveApplications({ isAdmin, hostCompanyId, isHostCompany }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingApplication, setProcessingApplication] = useState(false);

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

  const handleViewDetails = (application) => {
    setSelectedApp(application);
    setShowDetailsModal(true);
  };

  const handleAction = async (applicationId, action) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessingApplication(true);
    try {
      await leaveAPI.updateStatus(applicationId, action, rejectionReason);
      setShowActionModal(false);
      setShowDetailsModal(false);
      setSelectedApp(null);
      setRejectionReason('');
      loadApplications();
    } catch (error) {
      console.error('Error updating leave application:', error);
      alert('Error updating application: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingApplication(false);
    }
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
                        onClick={() => handleViewDetails(app)}
                      >
                        View Details
                      </button>
                      {app.status === 'pending' && app.canReview && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => {
                              setSelectedApp(app);
                              setShowDetailsModal(true);
                              setShowActionModal(true);
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => {
                              setSelectedApp(app);
                              setShowDetailsModal(true);
                              setShowActionModal(true);
                            }}
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

      {/* Full Details Modal - Shows complete application information */}
      {showDetailsModal && selectedApp && (
        <div className="modal-overlay" onClick={() => {
          setShowDetailsModal(false);
          setShowActionModal(false);
          setSelectedApp(null);
          setRejectionReason('');
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Leave Application Details</h3>
              <button onClick={() => {
                setShowDetailsModal(false);
                setShowActionModal(false);
                setSelectedApp(null);
                setRejectionReason('');
              }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="official-ribbon">
                <div>
                  <strong>Official Leave Review</strong>
                  <div className="ribbon-subtitle">Government Form Presentation</div>
                </div>
                <span className="ribbon-badge">Review</span>
              </div>

              <div className="details-section">
                <h4>Intern Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">
                    {(selectedApp.internId?.name || selectedApp.internName || 'N/A')} {selectedApp.internId?.surname || ''}
                  </span>
                </div>
                {(selectedApp.internId?.email || selectedApp.internId?.emailAddress) && (
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">
                      {selectedApp.internId?.email || selectedApp.internId?.emailAddress}
                    </span>
                  </div>
                )}
                {selectedApp.internId?.phoneNumber && (
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedApp.internId.phoneNumber}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">
                    {selectedApp.departmentName || selectedApp.department || selectedApp.internId?.department || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Host Company:</span>
                  <span className="detail-value">
                    {selectedApp.hostCompanyName || 
                     selectedApp.hostCompanyId?.companyName || 
                     selectedApp.hostCompanyId?.name || 
                     selectedApp.internId?.hostCompanyName || 
                     'N/A'}
                  </span>
                </div>
                {(selectedApp.internId?.location || selectedApp.location) && (
                  <div className="detail-row">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">
                      {selectedApp.internId?.location || selectedApp.location || 'N/A'}
                    </span>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h4>Leave Application Details</h4>
                <div className="detail-row">
                  <span className="detail-label">Leave Type:</span>
                  <span className="detail-value">{selectedApp.leaveType || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Start Date:</span>
                  <span className="detail-value">{formatDate(selectedApp.startDate)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">End Date:</span>
                  <span className="detail-value">{formatDate(selectedApp.endDate)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Number of Days:</span>
                  <span className="detail-value">{selectedApp.numberOfDays || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reason:</span>
                  <span className="detail-value">{selectedApp.reason || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span 
                    className="status-badge" 
                    style={{
                      backgroundColor: getStatusColor(selectedApp.status) + '20',
                      color: getStatusColor(selectedApp.status),
                      borderColor: getStatusColor(selectedApp.status)
                    }}
                  >
                    {(selectedApp.status || 'pending').toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedApp.rejectionReason && (
                <div className="details-section">
                  <h4>Rejection Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Rejection Reason:</span>
                    <span className="detail-value rejection-reason">{selectedApp.rejectionReason}</span>
                  </div>
                </div>
              )}

              {selectedApp.reviewedAt && (
                <div className="details-section">
                  <h4>Review Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Reviewed At:</span>
                    <span className="detail-value">{formatDate(selectedApp.reviewedAt)}</span>
                  </div>
                </div>
              )}

              {selectedApp.supportingDocuments && selectedApp.supportingDocuments.length > 0 && (
                <div className="details-section">
                  <h4>Supporting Documents</h4>
                  <div className="document-list">
                    {selectedApp.supportingDocuments.map((doc, idx) => (
                      <div key={idx} className="document-item">
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="document-link"
                        >
                          {doc.fileName || `Document ${idx + 1}`}
                        </a>
                        <span className="document-type">({doc.fileType || 'Unknown type'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.createdAt && (
                <div className="details-section">
                  <div className="detail-row">
                    <span className="detail-label">Application Submitted:</span>
                    <span className="detail-value">{formatDate(selectedApp.createdAt)}</span>
                  </div>
                </div>
              )}

              {!selectedApp.canReview && (
                <div className="info-banner">
                  View only: approvals are limited to the registering admin or the owning host company.
                </div>
              )}

              {selectedApp.status === 'pending' && selectedApp.canReview && (
                <div className="modal-actions-section">
                  {!showActionModal ? (
                    <div className="action-buttons-full">
                      <button
                        className="approve-btn-full"
                        onClick={() => setShowActionModal(true)}
                      >
                        Approve Application
                      </button>
                      <button
                        className="reject-btn-full"
                        onClick={() => setShowActionModal(true)}
                      >
                        Reject Application
                      </button>
                    </div>
                  ) : (
                    <div className="action-form">
                      <label>Rejection Reason (required if rejecting):</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        rows="4"
                        className="rejection-textarea"
                      />
                      <div className="action-buttons-full">
                        <button
                          className="approve-btn-full"
                          onClick={() => handleAction(selectedApp._id, 'approve')}
                          disabled={processingApplication}
                        >
                          {processingApplication ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          className="reject-btn-full"
                          onClick={() => handleAction(selectedApp._id, 'reject')}
                          disabled={processingApplication || !rejectionReason.trim()}
                        >
                          {processingApplication ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setShowActionModal(false);
                            setRejectionReason('');
                          }}
                          disabled={processingApplication}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveApplications;

