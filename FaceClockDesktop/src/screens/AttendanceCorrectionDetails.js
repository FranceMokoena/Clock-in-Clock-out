import React, { useEffect, useState } from 'react';
import { MdPictureAsPdf } from 'react-icons/md';
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

const formatDateLong = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const openPdfWindow = (html, title) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow pop-ups to export the PDF.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title || 'Export PDF';
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
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
  const [exportingPdf, setExportingPdf] = useState(false);

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

  const buildCorrectionPdfHtml = () => {
    if (!correction) return '';
    const status = correction.status || 'pending';
    const statusColor = getStatusColor(status);
    const internNamePdf = correction.internId
      ? `${correction.internId.name || ''} ${correction.internId.surname || ''}`.trim() || correction.internName
      : correction.internName;
    const hostCompanyName = correction.hostCompanyName
      || correction.hostCompanyId?.companyName
      || correction.hostCompanyId?.name
      || correction.internId?.hostCompanyName
      || 'N/A';
    const departmentName = correction.departmentName
      || correction.department
      || correction.internId?.department
      || 'N/A';
    const internEmail = correction.internId?.email || correction.internId?.emailAddress || 'N/A';
    const internPhone = correction.internId?.phoneNumber || 'N/A';
    const correctionDate = formatDateLong(correction.date);
    const requestRef = correction._id ? String(correction._id).slice(-8) : 'N/A';
    const requestedChange = correction.requestedChange || {};
    const description = requestedChange.description || correction.reason || 'No description provided';
    const reviewerComment = correction.comments || correction.rejectionReason || '';
    const docs = Array.isArray(correction.supportingDocuments) ? correction.supportingDocuments : [];

    const detailRows = [
      `<div class="row"><span class="label">Issue Type</span><span class="value">${escapeHtml(getCorrectionTypeLabel(correction.correctionType))}</span></div>`,
      `<div class="row"><span class="label">Date of Issue</span><span class="value">${escapeHtml(correctionDate)}</span></div>`,
      `<div class="row"><span class="label">Status</span><span class="pill">${escapeHtml(status.toUpperCase())}</span></div>`,
    ];

    if (requestedChange.clockInTime) {
      detailRows.push(`<div class="row"><span class="label">Requested Clock-In</span><span class="value">${escapeHtml(formatTime(requestedChange.clockInTime))}</span></div>`);
    }
    if (requestedChange.clockOutTime) {
      detailRows.push(`<div class="row"><span class="label">Requested Clock-Out</span><span class="value">${escapeHtml(formatTime(requestedChange.clockOutTime))}</span></div>`);
    }
    if (requestedChange.breakStartTime) {
      detailRows.push(`<div class="row"><span class="label">Requested Break Start</span><span class="value">${escapeHtml(formatTime(requestedChange.breakStartTime))}</span></div>`);
    }
    if (requestedChange.breakEndTime) {
      detailRows.push(`<div class="row"><span class="label">Requested Break End</span><span class="value">${escapeHtml(formatTime(requestedChange.breakEndTime))}</span></div>`);
    }
    if (correction.requestedTime) {
      detailRows.push(`<div class="row"><span class="label">Requested Time</span><span class="value">${escapeHtml(correction.requestedTime)}</span></div>`);
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #1f2937; line-height: 1.6; }
            .header { border-bottom: 3px solid #3166AE; padding-bottom: 16px; margin-bottom: 20px; }
            h1 { color: #3166AE; margin: 0 0 4px 0; font-size: 24px; }
            .subtitle { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .section { margin-bottom: 20px; }
            .section-title { color: #fff; background: #3166AE; padding: 10px 12px; border-radius: 6px; font-weight: 700; margin-bottom: 12px; font-size: 13px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; background: #f9fafb; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
            .row:last-child { border-bottom: none; margin-bottom: 0; }
            .label { font-weight: 700; color: #4a5568; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; flex: 1; }
            .value { color: #111827; text-align: right; flex: 1.5; }
            .pill { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; border: 1px solid ${statusColor}; color: ${statusColor}; background-color: ${statusColor}20; }
            .description-box { background: #fff; border-left: 4px solid #3166AE; padding: 12px; border-radius: 4px; }
            .doc-list { margin: 0; padding-left: 18px; }
            .doc-list li { margin-bottom: 6px; font-size: 12px; }
            .timestamp { color: #6b7280; font-size: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Correction Request</h1>
            <div class="subtitle">Request Reference #${escapeHtml(requestRef)}</div>
          </div>

          <div class="section">
            <div class="section-title">REQUEST INFORMATION</div>
            <div class="card">
              <div class="row"><span class="label">Name</span><span class="value">${escapeHtml(internNamePdf || 'N/A')}</span></div>
              <div class="row"><span class="label">Department</span><span class="value">${escapeHtml(departmentName)}</span></div>
              <div class="row"><span class="label">Host Company</span><span class="value">${escapeHtml(hostCompanyName)}</span></div>
              <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(internEmail)}</span></div>
              <div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(internPhone)}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">CORRECTION DETAILS</div>
            <div class="card">
              ${detailRows.join('')}
            </div>
          </div>

          <div class="section">
            <div class="section-title">DESCRIPTION</div>
            <div class="description-box">
              ${escapeHtml(description)}
            </div>
          </div>

          ${reviewerComment ? `
          <div class="section">
            <div class="section-title">REVIEWER COMMENTS</div>
            <div class="description-box">
              ${escapeHtml(reviewerComment)}
            </div>
          </div>
          ` : ''}

          ${docs.length > 0 ? `
          <div class="section">
            <div class="section-title">SUPPORTING DOCUMENTS</div>
            <div class="card">
              <ul class="doc-list">
                ${docs.map(doc => `<li>${escapeHtml(doc.fileName || doc.fileUrl || 'Document')}</li>`).join('')}
              </ul>
            </div>
          </div>
          ` : ''}

          <div class="timestamp">
            <strong>Submitted:</strong> ${escapeHtml(formatDateTime(correction.createdAt))}
            ${correction.reviewedAt ? `<br><strong>Reviewed:</strong> ${escapeHtml(formatDateTime(correction.reviewedAt))}` : ''}
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = () => {
    if (!correction || exportingPdf) return;
    setExportingPdf(true);
    try {
      const html = buildCorrectionPdfHtml();
      openPdfWindow(html, 'Attendance Correction PDF');
    } finally {
      setTimeout(() => setExportingPdf(false), 600);
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
          <div className="modal-header-actions">
            <button
              type="button"
              className="export-pdf-btn"
              onClick={handleExportPdf}
              title="Export PDF"
              aria-label="Export PDF"
              disabled={exportingPdf}
            >
              <MdPictureAsPdf />
            </button>
            <button type="button" onClick={handleBack} aria-label="Close correction detail">&times;</button>
          </div>
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
