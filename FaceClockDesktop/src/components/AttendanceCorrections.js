import React, { useState, useEffect } from 'react';
import { MdAssignment } from 'react-icons/md';
import { attendanceAPI } from '../services/api';
import './AttendanceCorrections.css';

function AttendanceCorrections({ isAdmin, hostCompanyId, isHostCompany, onSwitchToLeave }) {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingCorrection, setProcessingCorrection] = useState(false);

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

  const handleViewDetails = (correction) => {
    setSelectedCorrection(correction);
    setShowDetailsModal(true);
  };

  const handleAction = async (correctionId, action) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessingCorrection(true);
    try {
      await attendanceAPI.updateStatus(correctionId, action, rejectionReason);
      setShowActionModal(false);
      setShowDetailsModal(false);
      setSelectedCorrection(null);
      setRejectionReason('');
      loadCorrections();
    } catch (error) {
      console.error('Error updating correction:', error);
      alert('Error updating correction: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingCorrection(false);
    }
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
                  <td>{getCorrectionTypeLabel(corr.type)}</td>
                  <td>{corr.requestedTime || 'N/A'}</td>
                  <td className="reason-cell">{corr.reason || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${corr.status === 'approved' ? 'status-approved' : corr.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                      {corr.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-details-btn"
                        onClick={() => handleViewDetails(corr)}
                      >
                        View Details
                      </button>
                      {corr.status === 'pending' && corr.canReview && (
                        <>
                          <button
                            className="approve-btn"
                            onClick={() => {
                              setSelectedCorrection(corr);
                              setShowDetailsModal(true);
                              setShowActionModal(true);
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => {
                              setSelectedCorrection(corr);
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
          <p>No attendance corrections found.</p>
        </div>
      )}

      {/* Full Details Modal - Shows complete correction information */}
      {showDetailsModal && selectedCorrection && (
        <div className="modal-overlay" onClick={() => {
          setShowDetailsModal(false);
          setShowActionModal(false);
          setSelectedCorrection(null);
          setRejectionReason('');
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Attendance Correction Details</h3>
              <button onClick={() => {
                setShowDetailsModal(false);
                setShowActionModal(false);
                setSelectedCorrection(null);
                setRejectionReason('');
              }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="official-ribbon">
                <div>
                  <strong>Official Correction Review</strong>
                  <div className="ribbon-subtitle">Government Form Presentation</div>
                </div>
                <span className="ribbon-badge">Review</span>
              </div>

              <div className="details-section">
                <h4>Intern Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">
                    {(selectedCorrection.internId?.name || selectedCorrection.internName || 'N/A')} {selectedCorrection.internId?.surname || ''}
                  </span>
                </div>
                {(selectedCorrection.internId?.email || selectedCorrection.internId?.emailAddress) && (
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">
                      {selectedCorrection.internId?.email || selectedCorrection.internId?.emailAddress}
                    </span>
                  </div>
                )}
                {selectedCorrection.internId?.phoneNumber && (
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedCorrection.internId.phoneNumber}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">
                    {selectedCorrection.departmentName || selectedCorrection.department || selectedCorrection.internId?.department || 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Host Company:</span>
                  <span className="detail-value">
                    {selectedCorrection.hostCompanyName || 
                     selectedCorrection.hostCompanyId?.companyName || 
                     selectedCorrection.hostCompanyId?.name || 
                     selectedCorrection.internId?.hostCompanyName || 
                     'N/A'}
                  </span>
                </div>
              </div>

              <div className="details-section">
                <h4>Correction Details</h4>
                <div className="detail-row">
                  <span className="detail-label">Correction Type:</span>
                  <span className="detail-value">{getCorrectionTypeLabel(selectedCorrection.correctionType)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{formatDate(selectedCorrection.date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span 
                    className="status-badge" 
                    style={{
                      backgroundColor: getStatusColor(selectedCorrection.status) + '20',
                      color: getStatusColor(selectedCorrection.status),
                      borderColor: getStatusColor(selectedCorrection.status)
                    }}
                  >
                    {(selectedCorrection.status || 'pending').toUpperCase()}
                  </span>
                </div>
                {selectedCorrection.requestedChange && (
                  <>
                    {selectedCorrection.requestedChange.clockInTime && (
                      <div className="detail-row">
                        <span className="detail-label">Requested Clock-In Time:</span>
                        <span className="detail-value">{formatTime(selectedCorrection.requestedChange.clockInTime)}</span>
                      </div>
                    )}
                    {selectedCorrection.requestedChange.clockOutTime && (
                      <div className="detail-row">
                        <span className="detail-label">Requested Clock-Out Time:</span>
                        <span className="detail-value">{formatTime(selectedCorrection.requestedChange.clockOutTime)}</span>
                      </div>
                    )}
                    {selectedCorrection.requestedChange.breakStartTime && (
                      <div className="detail-row">
                        <span className="detail-label">Requested Break Start:</span>
                        <span className="detail-value">{formatTime(selectedCorrection.requestedChange.breakStartTime)}</span>
                      </div>
                    )}
                    {selectedCorrection.requestedChange.breakEndTime && (
                      <div className="detail-row">
                        <span className="detail-label">Requested Break End:</span>
                        <span className="detail-value">{formatTime(selectedCorrection.requestedChange.breakEndTime)}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Description:</span>
                      <span className="detail-value">{selectedCorrection.requestedChange.description || 'No description provided'}</span>
                    </div>
                  </>
                )}
                {selectedCorrection.requestedTime && (
                  <div className="detail-row">
                    <span className="detail-label">Requested Time:</span>
                    <span className="detail-value">{selectedCorrection.requestedTime}</span>
                  </div>
                )}
                {selectedCorrection.reason && (
                  <div className="detail-row">
                    <span className="detail-label">Reason:</span>
                    <span className="detail-value">{selectedCorrection.reason}</span>
                  </div>
                )}
              </div>

              {selectedCorrection.rejectionReason && (
                <div className="details-section">
                  <h4>Rejection Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Rejection Reason:</span>
                    <span className="detail-value rejection-reason">{selectedCorrection.rejectionReason}</span>
                  </div>
                </div>
              )}

              {selectedCorrection.reviewedAt && (
                <div className="details-section">
                  <h4>Review Information</h4>
                  <div className="detail-row">
                    <span className="detail-label">Reviewed At:</span>
                    <span className="detail-value">{formatDate(selectedCorrection.reviewedAt)}</span>
                  </div>
                </div>
              )}

              {selectedCorrection.supportingDocuments && selectedCorrection.supportingDocuments.length > 0 && (
                <div className="details-section">
                  <h4>Supporting Documents</h4>
                  <div className="document-list">
                    {selectedCorrection.supportingDocuments.map((doc, idx) => (
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

              {selectedCorrection.createdAt && (
                <div className="details-section">
                  <div className="detail-row">
                    <span className="detail-label">Application Submitted:</span>
                    <span className="detail-value">{formatDate(selectedCorrection.createdAt)}</span>
                  </div>
                </div>
              )}

              {!selectedCorrection.canReview && (
                <div className="info-banner">
                  View only: approvals are limited to the registering admin or the owning host company.
                </div>
              )}

              {selectedCorrection.status === 'pending' && selectedCorrection.canReview && (
                <div className="modal-actions-section">
                  {!showActionModal ? (
                    <div className="action-buttons-full">
                      <button
                        className="approve-btn-full"
                        onClick={() => setShowActionModal(true)}
                      >
                        Approve Correction
                      </button>
                      <button
                        className="reject-btn-full"
                        onClick={() => setShowActionModal(true)}
                      >
                        Reject Correction
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
                          onClick={() => handleAction(selectedCorrection._id, 'approve')}
                          disabled={processingCorrection}
                        >
                          {processingCorrection ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          className="reject-btn-full"
                          onClick={() => handleAction(selectedCorrection._id, 'reject')}
                          disabled={processingCorrection || !rejectionReason.trim()}
                        >
                          {processingCorrection ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setShowActionModal(false);
                            setRejectionReason('');
                          }}
                          disabled={processingCorrection}
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

export default AttendanceCorrections;

