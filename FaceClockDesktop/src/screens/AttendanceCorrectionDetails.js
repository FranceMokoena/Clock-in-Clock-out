import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import '../components/AttendanceCorrections.css';
import './AttendanceCorrectionDetails.css';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getCorrectionTypeLabel = (type) => {
  if (!type) return 'Correction';
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

function AttendanceCorrectionDetails() {
  const { correctionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isHostCompany } = useAuth();
  const [correction, setCorrection] = useState(location.state?.correction || null);
  const [loading, setLoading] = useState(!correction);
  const [error, setError] = useState('');
  const [showActionForm, setShowActionForm] = useState(location.state?.showActionForm ?? false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const reviewerRole = isHostCompany ? 'hostCompany' : 'admin';
  const reviewerHostCompanyId = isHostCompany ? user?.id : undefined;

  useEffect(() => {
    if (correction) return;
    const loadCorrection = async () => {
      setLoading(true);
      try {
        const params = {
          reviewerRole,
          ...(reviewerHostCompanyId ? { hostCompanyId: reviewerHostCompanyId } : {}),
        };
        const response = await attendanceAPI.getById(correctionId, params);
        if (response.success && response.correction) {
          setCorrection(response.correction);
        } else {
          setError(response.error || 'Attendance correction not found.');
        }
      } catch (err) {
        console.error('Failed to load correction detail:', err);
        setError('Unable to load attendance correction at this time.');
      } finally {
        setLoading(false);
      }
    };
    loadCorrection();
  }, [correction, correctionId, reviewerHostCompanyId, reviewerRole]);

  const handleBack = () => {
    navigate('/dashboard', { state: { view: 'attendanceCorrections' } });
  };

  const handleAction = async (action) => {
    if (!correction) return;
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason before rejecting.');
      return;
    }
    setProcessing(true);
    try {
      const response = await attendanceAPI.updateStatus(correction._id, action, rejectionReason);
      if (response?.success && response.correction) {
        setCorrection(response.correction);
        setShowActionForm(false);
        setRejectionReason('');
      } else {
        alert(response?.error || 'Unable to update correction.');
      }
    } catch (err) {
      console.error('Error updating correction:', err);
      alert('Error updating correction: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="correction-details-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading attendance correction...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="correction-details-page">
        <div className="details-header">
          <button className="view-details-btn" type="button" onClick={handleBack}>Back to list</button>
        </div>
        <div className="empty-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!correction) {
    return (
      <div className="correction-details-page">
        <div className="details-header">
          <button className="view-details-btn" type="button" onClick={handleBack}>Back to list</button>
        </div>
        <div className="empty-state">
          <p>Correction details are unavailable.</p>
        </div>
      </div>
    );
  }

  const internName = correction.internId
    ? `${correction.internId.name || ''} ${correction.internId.surname || ''}`.trim() || correction.internName
    : correction.internName;

  return (
    <div className="correction-details-page">
      <div className="details-header">
        <button className="view-details-btn" type="button" onClick={handleBack}>Back to list</button>
        <h2>Attendance Correction Details</h2>
      </div>
      <div className="modal-content large-modal correction-detail-panel">
        <div className="modal-header">
          <h3>Attendance Correction Review</h3>
          <button type="button" onClick={handleBack} aria-label="Close correction detail">&times;</button>
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
              <span className="detail-value">{internName || 'N/A'}</span>
            </div>
            {(correction.internId?.email || correction.internId?.emailAddress) && (
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">
                  {correction.internId?.email || correction.internId?.emailAddress}
                </span>
              </div>
            )}
            {correction.internId?.phoneNumber && (
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{correction.internId.phoneNumber}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Department:</span>
              <span className="detail-value">
                {correction.departmentName || correction.department || correction.internId?.department || 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Host Company:</span>
              <span className="detail-value">
                {correction.hostCompanyName ||
                  correction.hostCompanyId?.companyName ||
                  correction.hostCompanyId?.name ||
                  correction.internId?.hostCompanyName ||
                  'N/A'}
              </span>
            </div>
          </div>

          <div className="details-section">
            <h4>Correction Details</h4>
            <div className="detail-row">
              <span className="detail-label">Correction Type:</span>
              <span className="detail-value">{getCorrectionTypeLabel(correction.correctionType)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{formatDate(correction.date)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span
                className="status-badge"
                style={{
                  backgroundColor: getStatusColor(correction.status) + '20',
                  color: getStatusColor(correction.status),
                  borderColor: getStatusColor(correction.status),
                }}
              >
                {(correction.status || 'pending').toUpperCase()}
              </span>
            </div>
            {correction.requestedChange && (
              <>
                {correction.requestedChange.clockInTime && (
                  <div className="detail-row">
                    <span className="detail-label">Requested Clock-In:</span>
                    <span className="detail-value">{formatTime(correction.requestedChange.clockInTime)}</span>
                  </div>
                )}
                {correction.requestedChange.clockOutTime && (
                  <div className="detail-row">
                    <span className="detail-label">Requested Clock-Out:</span>
                    <span className="detail-value">{formatTime(correction.requestedChange.clockOutTime)}</span>
                  </div>
                )}
                {correction.requestedChange.breakStartTime && (
                  <div className="detail-row">
                    <span className="detail-label">Requested Break Start:</span>
                    <span className="detail-value">{formatTime(correction.requestedChange.breakStartTime)}</span>
                  </div>
                )}
                {correction.requestedChange.breakEndTime && (
                  <div className="detail-row">
                    <span className="detail-label">Requested Break End:</span>
                    <span className="detail-value">{formatTime(correction.requestedChange.breakEndTime)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">
                    {correction.requestedChange.description || 'No description provided'}
                  </span>
                </div>
              </>
            )}
            {correction.requestedTime && (
              <div className="detail-row">
                <span className="detail-label">Requested Time:</span>
                <span className="detail-value">{correction.requestedTime}</span>
              </div>
            )}
            {correction.reason && (
              <div className="detail-row">
                <span className="detail-label">Reason:</span>
                <span className="detail-value">{correction.reason}</span>
              </div>
            )}
          </div>

          {correction.rejectionReason && (
            <div className="details-section">
              <h4>Rejection Information</h4>
              <div className="detail-row">
                <span className="detail-label">Rejection Reason:</span>
                <span className="detail-value rejection-reason">{correction.rejectionReason}</span>
              </div>
            </div>
          )}

          {correction.reviewedAt && (
            <div className="details-section">
              <h4>Review Information</h4>
              <div className="detail-row">
                <span className="detail-label">Reviewed At:</span>
                <span className="detail-value">{formatDate(correction.reviewedAt)}</span>
              </div>
            </div>
          )}

          {correction.supportingDocuments && correction.supportingDocuments.length > 0 && (
            <div className="details-section">
              <h4>Supporting Documents</h4>
              <div className="document-list">
                {correction.supportingDocuments.map((doc, idx) => (
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

          {correction.createdAt && (
            <div className="details-section">
              <div className="detail-row">
                <span className="detail-label">Application Submitted:</span>
                <span className="detail-value">{formatDate(correction.createdAt)}</span>
              </div>
            </div>
          )}

          {!correction.canReview && (
            <div className="info-banner">
              View only: approvals are limited to the registering admin or the owning host company.
            </div>
          )}

          {correction.status === 'pending' && correction.canReview && (
            <div className="modal-actions-section">
              {!showActionForm ? (
                <div className="action-buttons-full">
                  <button
                    className="approve-btn-full"
                    type="button"
                    onClick={() => setShowActionForm(true)}
                  >
                    Approve Correction
                  </button>
                  <button
                    className="reject-btn-full"
                    type="button"
                    onClick={() => setShowActionForm(true)}
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
                      type="button"
                      onClick={() => handleAction('approve')}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      className="reject-btn-full"
                      type="button"
                      onClick={() => handleAction('reject')}
                      disabled={processing || !rejectionReason.trim()}
                    >
                      {processing ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      className="cancel-btn"
                      type="button"
                      onClick={() => {
                        setShowActionForm(false);
                        setRejectionReason('');
                      }}
                      disabled={processing}
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
  );
}

export default AttendanceCorrectionDetails;
