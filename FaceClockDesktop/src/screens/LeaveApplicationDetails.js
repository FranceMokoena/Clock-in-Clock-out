import React, { useEffect, useState } from 'react';
import { MdPictureAsPdf } from 'react-icons/md';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { leaveAPI } from '../services/api';
import '../components/LeaveApplications.css';
import './LeaveApplicationDetails.css';

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

const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return '#16a34a';
    case 'rejected': return '#dc2626';
    case 'pending': return '#f59e0b';
    default: return '#6b7280';
  }
};

const formatDateShort = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

function LeaveApplicationDetails() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isHostCompany } = useAuth();
  const [application, setApplication] = useState(location.state?.application || null);
  const [loading, setLoading] = useState(!application);
  const [error, setError] = useState('');
  const [showActionForm, setShowActionForm] = useState(location.state?.showActionForm ?? false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const reviewerRole = isHostCompany ? 'hostCompany' : 'admin';
  const reviewerHostCompanyId = isHostCompany ? user?.id : undefined;

  useEffect(() => {
    if (application) return;
    const loadApplication = async () => {
      setLoading(true);
      try {
        const params = {
          reviewerRole,
          ...(reviewerHostCompanyId ? { hostCompanyId: reviewerHostCompanyId } : {}),
        };
        const response = await leaveAPI.getById(applicationId, params);
        if (response.success && response.application) {
          setApplication(response.application);
        } else {
          setError(response.error || 'Leave application not found.');
        }
      } catch (err) {
        console.error('Failed to load leave application detail:', err);
        setError('Unable to load leave application at this time.');
      } finally {
        setLoading(false);
      }
    };
    loadApplication();
  }, [application, applicationId, reviewerHostCompanyId, reviewerRole]);

  const handleBack = () => {
    navigate('/dashboard', { state: { view: 'leaveApplications' } });
  };

  const handleAction = async (action) => {
    if (!application) return;
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason before rejecting.');
      return;
    }
    setProcessing(true);
    try {
      const response = await leaveAPI.updateStatus(application._id, action, rejectionReason);
      if (response?.success && response.application) {
        setApplication(response.application);
        setShowActionForm(false);
        setRejectionReason('');
      } else {
        alert(response?.error || 'Unable to update application.');
      }
    } catch (err) {
      console.error('Error updating leave application:', err);
      alert('Error updating application: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const buildLeavePdfHtml = () => {
    if (!application) return '';
    const internNamePdf = application.internId
      ? `${application.internId.name || ''} ${application.internId.surname || ''}`.trim() || application.internName
      : application.internName;
    const status = application.status || 'pending';
    const statusColor = getStatusColor(status);
    const hostCompanyName = application.hostCompanyName
      || application.hostCompanyId?.companyName
      || application.hostCompanyId?.name
      || application.internId?.hostCompanyName
      || 'N/A';
    const departmentName = application.departmentName
      || application.department
      || application.internId?.department
      || 'N/A';
    const internEmail = application.internId?.email || application.internId?.emailAddress || 'N/A';
    const internPhone = application.internId?.phoneNumber || 'N/A';
    const docs = Array.isArray(application.supportingDocuments) ? application.supportingDocuments : [];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #1f2937; }
            h1 { color: #3166AE; margin-bottom: 6px; }
            .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
            .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-top: 12px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; gap: 16px; }
            .label { font-weight: 700; color: #374151; }
            .value { color: #111827; text-align: right; }
            .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; border: 1px solid ${statusColor}; color: ${statusColor}; background-color: ${statusColor}20; }
            .note { color: #6b7280; font-size: 11px; margin-top: 16px; }
            .doc-list { margin: 0; padding-left: 18px; }
            .doc-list li { margin-bottom: 6px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Leave Application</h1>
          <div class="subtitle">Official copy - Generated ${escapeHtml(new Date().toLocaleString('en-US'))}</div>
          <div class="card">
            <div class="row"><span class="label">Name</span><span class="value">${escapeHtml(internNamePdf || 'N/A')}</span></div>
            <div class="row"><span class="label">Department</span><span class="value">${escapeHtml(departmentName)}</span></div>
            <div class="row"><span class="label">Host Company</span><span class="value">${escapeHtml(hostCompanyName)}</span></div>
            <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(internEmail)}</span></div>
            <div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(internPhone)}</span></div>
          </div>
          <div class="card">
            <div class="row"><span class="label">Leave Type</span><span class="value">${escapeHtml(application.leaveType || 'N/A')}</span></div>
            <div class="row"><span class="label">Dates</span><span class="value">${escapeHtml(formatDateShort(application.startDate))} - ${escapeHtml(formatDateShort(application.endDate))}</span></div>
            <div class="row"><span class="label">Days</span><span class="value">${escapeHtml(application.numberOfDays || 'N/A')}</span></div>
            <div class="row"><span class="label">Status</span><span class="pill">${escapeHtml(status.toUpperCase())}</span></div>
          </div>
          <div class="card">
            <div class="label" style="margin-bottom:6px;">Reason</div>
            <div class="value" style="text-align:left;">${escapeHtml(application.reason || 'No reason provided')}</div>
          </div>
          ${application.rejectionReason ? `
            <div class="card">
              <div class="label" style="margin-bottom:6px;">Rejection Reason</div>
              <div class="value" style="text-align:left;">${escapeHtml(application.rejectionReason)}</div>
            </div>
          ` : ''}
          ${docs.length > 0 ? `
            <div class="card">
              <div class="label" style="margin-bottom:6px;">Supporting Documents</div>
              <ul class="doc-list">
                ${docs.map(doc => `<li>${escapeHtml(doc.fileName || doc.fileUrl || 'Document')}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          <div class="note">
            Submitted: ${escapeHtml(formatDateShort(application.createdAt))}${application.reviewedAt ? ` - Reviewed: ${escapeHtml(formatDateShort(application.reviewedAt))}` : ''}
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = () => {
    if (!application || exportingPdf) return;
    setExportingPdf(true);
    try {
      const html = buildLeavePdfHtml();
      openPdfWindow(html, 'Leave Application PDF');
    } finally {
      setTimeout(() => setExportingPdf(false), 600);
    }
  };

  if (loading) {
    return (
      <div className="leave-details-page">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading leave application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leave-details-page">
        <div className="details-header">
          <button className="view-details-btn" type="button" onClick={handleBack}>Back to list</button>
        </div>
        <div className="empty-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="leave-details-page">
        <div className="details-header">
          <button className="view-details-btn" type="button" onClick={handleBack}>Back to list</button>
        </div>
        <div className="empty-state">
          <p>Leave application details are unavailable.</p>
        </div>
      </div>
    );
  }

  const internName = application.internId
    ? `${application.internId.name || ''} ${application.internId.surname || ''}`.trim() || application.internName
    : application.internName;

  return (
    <div className="leave-details-page">
      <div className="details-header">
        <button className="view-details-btn" type="button" onClick={handleBack}>Back to list</button>
        <h2>Leave Application Details</h2>
      </div>
      <div className="modal-content large-modal leave-detail-panel">
        <div className="modal-header">
          <h3>Leave Application Details</h3>
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
            <button type="button" onClick={handleBack} aria-label="Close details">&times;</button>
          </div>
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
              <span className="detail-value">{internName || 'N/A'}</span>
            </div>
            {(application.internId?.email || application.internId?.emailAddress) && (
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">
                  {application.internId?.email || application.internId?.emailAddress}
                </span>
              </div>
            )}
            {application.internId?.phoneNumber && (
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{application.internId.phoneNumber}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Department:</span>
              <span className="detail-value">
                {application.departmentName || application.department || application.internId?.department || 'N/A'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Host Company:</span>
              <span className="detail-value">
                {application.hostCompanyName ||
                  application.hostCompanyId?.companyName ||
                  application.hostCompanyId?.name ||
                  application.internId?.hostCompanyName ||
                  'N/A'}
              </span>
            </div>
            {(application.internId?.location || application.location) && (
              <div className="detail-row">
                <span className="detail-label">Location:</span>
                <span className="detail-value">
                  {application.internId?.location || application.location || 'N/A'}
                </span>
              </div>
            )}
          </div>

          <div className="details-section">
            <h4>Leave Application Details</h4>
            <div className="detail-row">
              <span className="detail-label">Leave Type:</span>
              <span className="detail-value">{application.leaveType || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Start Date:</span>
              <span className="detail-value">{formatDate(application.startDate)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">End Date:</span>
              <span className="detail-value">{formatDate(application.endDate)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Number of Days:</span>
              <span className="detail-value">{application.numberOfDays || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Reason:</span>
              <span className="detail-value">{application.reason || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span
                className="status-badge"
                style={{
                  backgroundColor: getStatusColor(application.status) + '20',
                  color: getStatusColor(application.status),
                  borderColor: getStatusColor(application.status),
                }}
              >
                {(application.status || 'pending').toUpperCase()}
              </span>
            </div>
          </div>

          {application.rejectionReason && (
            <div className="details-section">
              <h4>Rejection Information</h4>
              <div className="detail-row">
                <span className="detail-label">Rejection Reason:</span>
                <span className="detail-value rejection-reason">{application.rejectionReason}</span>
              </div>
            </div>
          )}

          {application.reviewedAt && (
            <div className="details-section">
              <h4>Review Information</h4>
              <div className="detail-row">
                <span className="detail-label">Reviewed At:</span>
                <span className="detail-value">{formatDate(application.reviewedAt)}</span>
              </div>
            </div>
          )}

          {application.supportingDocuments && application.supportingDocuments.length > 0 && (
            <div className="details-section">
              <h4>Supporting Documents</h4>
              <div className="document-list">
                {application.supportingDocuments.map((doc, idx) => (
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

          {application.createdAt && (
            <div className="details-section">
              <div className="detail-row">
                <span className="detail-label">Application Submitted:</span>
                <span className="detail-value">{formatDate(application.createdAt)}</span>
              </div>
            </div>
          )}

          {!application.canReview && (
            <div className="info-banner">
              View only: approvals are limited to the registering admin or the owning host company.
            </div>
          )}

          {application.status === 'pending' && application.canReview && (
            <div className="modal-actions-section">
              {!showActionForm ? (
                <div className="action-buttons-full">
                  <button
                    className="approve-btn-full"
                    type="button"
                    onClick={() => setShowActionForm(true)}
                  >
                    Approve Application
                  </button>
                  <button
                    className="reject-btn-full"
                    type="button"
                    onClick={() => setShowActionForm(true)}
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

export default LeaveApplicationDetails;
