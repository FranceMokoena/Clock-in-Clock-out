import React, { useState, useEffect } from 'react';
import { MdCheckCircle, MdPending, MdEdit, MdClose, MdRefresh, MdDownload } from 'react-icons/md';
import { internReportsAPI } from '../../services/api';
import '../Reports.css';

function InternReportsAdmin({ isAdmin, hostCompanyId, isHostCompany }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Reviewed');
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Submitted', 'Reviewed', 'Actioned'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all', 'Low', 'Medium', 'High'

  // Load reports on component mount
  useEffect(() => {
    loadReports();
  }, [statusFilter, severityFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Admin fetches all reports
      const result = await internReportsAPI.getReports(
        null, // internId
        null, // hostCompanyId
        'ADMIN',
        100, // limit
        0 // skip
      );

      if (result.success) {
        let filteredReports = result.reports || [];

        // Apply filters
        if (statusFilter !== 'all') {
          filteredReports = filteredReports.filter(r => r.status === statusFilter);
        }
        if (severityFilter !== 'all') {
          filteredReports = filteredReports.filter(r => r.severity === severityFilter);
        }

        setReports(filteredReports);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.warn('Failed to load intern reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedReport) return;

    setUpdatingId(selectedReport._id);
    try {
      const result = await internReportsAPI.updateStatus(
        selectedReport._id,
        selectedStatus,
        adminNotes || null
      );

      if (result.success) {
        // Update local state
        setReports(reports.map(r =>
          r._id === selectedReport._id
            ? { ...r, status: selectedStatus, adminNotes, reviewedAt: new Date() }
            : r
        ));
        setShowStatusModal(false);
        setSelectedReport(null);
        setAdminNotes('');
      } else {
        alert(`Error: ${result.error || 'Failed to update report'}`);
      }
    } catch (err) {
      console.error('Error updating report:', err);
      alert('Failed to update report status');
    } finally {
      setUpdatingId(null);
    }
  };

  const openStatusModal = (report) => {
    setSelectedReport(report);
    setSelectedStatus(report.status || 'Reviewed');
    setAdminNotes(report.adminNotes || '');
    setShowStatusModal(true);
  };

  const openDetailModal = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedReport(null);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setAdminNotes('');
  };

  const exportListPDF = () => {
    if (reports.length === 0) {
      alert('No reports to export');
      return;
    }

    const rowsHtml = reports.map((r, i) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${i + 1}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${(r.title || '').replace(/</g, '&lt;')}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${r.reportType || '—'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${r.hostCompanyId?.name || 'Unknown'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${new Date(r.createdAt).toLocaleDateString()}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${r.status || '—'}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${r.severity || '—'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Intern Reports Export</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
          h1 { color: #3166AE; border-bottom: 3px solid #3166AE; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3166AE; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #f9fafb; }
          .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Intern Reports List</h1>
        <p style="color: #666;">Generated on ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Type</th>
              <th>Company</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">Total Reports: ${reports.length}</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const exportReportPDF = (report) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${report.title}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
          h1 { color: #3166AE; border-bottom: 3px solid #3166AE; padding-bottom: 10px; font-size: 24px; }
          .header { display: flex; gap: 20px; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 8px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
          .badge-submitted { background: #e3f2fd; color: #1565c0; }
          .badge-reviewed { background: #f3e5f5; color: #6a1b9a; }
          .badge-actioned { background: #e8f5e9; color: #2e7d32; }
          .badge-high { background: #ffebee; color: #c62828; }
          .badge-medium { background: #fff3e0; color: #f57c00; }
          .badge-low { background: #e8f5e9; color: #2e7d32; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .field { margin-bottom: 16px; }
          .label { font-weight: bold; color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          .value { color: #222; font-size: 14px; }
          .section-box { background: #f9f9f9; padding: 12px; border-radius: 4px; border-left: 3px solid #3166AE; margin-bottom: 16px; line-height: 1.6; }
          .admin-notes { border-left-color: #f57c00; background: #fff3e0; color: #e65100; }
          .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>${(report.title || '').replace(/</g, '&lt;')}</h1>
        <div class="header">
          <span class="badge badge-${report.status?.toLowerCase()}">${report.status}</span>
          <span class="badge badge-${report.severity?.toLowerCase()}">${report.severity} Severity</span>
        </div>

        <div class="grid">
          <div class="field">
            <div class="label">Intern Name</div>
            <div class="value">${report.internId?.name || 'N/A'} ${report.internId?.surname || ''}</div>
          </div>
          <div class="field">
            <div class="label">Intern ID</div>
            <div class="value">${report.internId?.idNumber || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">Company</div>
            <div class="value">${report.hostCompanyId?.name || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">Department</div>
            <div class="value">${report.internId?.department || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">Report Type</div>
            <div class="value">${report.reportType || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="label">Incident Date</div>
            <div class="value">${new Date(report.incidentDate).toLocaleDateString()}</div>
          </div>
          <div class="field">
            <div class="label">Submitted</div>
            <div class="value">${new Date(report.createdAt).toLocaleString()}</div>
          </div>
          <div class="field">
            <div class="label">Status</div>
            <div class="value">${report.status}</div>
          </div>
        </div>

        <div class="field">
          <div class="label">Description</div>
          <div class="section-box">${(report.description || '').replace(/</g, '&lt;')}</div>
        </div>

        ${report.supportingNotes ? `
          <div class="field">
            <div class="label">Supporting Notes</div>
            <div class="section-box">${(report.supportingNotes || '').replace(/</g, '&lt;')}</div>
          </div>
        ` : ''}

        ${report.adminNotes ? `
          <div class="field">
            <div class="label">Admin Notes</div>
            <div class="section-box admin-notes">${(report.adminNotes || '').replace(/</g, '&lt;')}</div>
          </div>
        ` : ''}

        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=1000,height=800');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted':
        return { bg: '#e3f2fd', color: '#1565c0', icon: <MdPending /> };
      case 'Reviewed':
        return { bg: '#f3e5f5', color: '#6a1b9a', icon: <MdCheckCircle /> };
      case 'Actioned':
        return { bg: '#e8f5e9', color: '#2e7d32', icon: <MdCheckCircle /> };
      default:
        return { bg: '#f5f5f5', color: '#666', icon: <MdPending /> };
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return { bg: '#ffebee', color: '#c62828' };
      case 'Medium':
        return { bg: '#fff3e0', color: '#f57c00' };
      case 'Low':
        return { bg: '#e8f5e9', color: '#2e7d32' };
      default:
        return { bg: '#f5f5f5', color: '#666' };
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#222' }}>Intern Reports Management</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          Review and acknowledge intern reports submitted by Host Companies
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
          backgroundColor: '#f9f9f9',
          padding: 12,
          borderRadius: 4,
          alignItems: 'center'
        }}
      >
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#555', marginRight: 8 }}>
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'inherit'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Reviewed">Reviewed/Acknowledged</option>
            <option value="Actioned">Actioned</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#555', marginRight: 8 }}>
            Severity:
          </label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'inherit'
            }}
          >
            <option value="all">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <button
          onClick={loadReports}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderRadius: 4,
            backgroundColor: '#1976d2',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <MdRefresh size={16} />
          Refresh
        </button>
        <button
          onClick={exportListPDF}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderRadius: 4,
            backgroundColor: '#10b981',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <MdDownload size={16} />
          Export PDF
        </button>
      </div>

      {/* Reports List - Table View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          Loading reports...
        </div>
      ) : reports.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#f9f9f9',
            borderRadius: 4,
            border: '1px dashed #ddd',
            color: '#999'
          }}
        >
          No reports found
        </div>
      ) : (
        <div style={{ overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: 4 }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f5f7fa',
                borderBottom: '2px solid #3166AE'
              }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#222' }}>#</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#222', minWidth: 200 }}>Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#222', minWidth: 100 }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#222', minWidth: 140 }}>Company</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#222', minWidth: 100 }}>Submitted</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#222', minWidth: 100 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#222', minWidth: 100 }}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => {
                const statusInfo = getStatusColor(report.status);
                const severityInfo = getSeverityColor(report.severity);
                
                return (
                  <tr
                    key={report._id}
                    onClick={() => openDetailModal(report)}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#fbfcfd',
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      ':hover': { backgroundColor: '#f0f4f9' }
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f4f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#fbfcfd'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#333' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#333', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.title}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#333' }}>{report.reportType || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#333' }}>{report.hostCompanyId?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#333' }}>{new Date(report.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 8px',
                        borderRadius: 3,
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color
                      }}>
                        {statusInfo.icon}
                        {report.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 3,
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: severityInfo.bg,
                        color: severityInfo.color
                      }}>
                        {report.severity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={closeStatusModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 8,
              width: '90%',
              maxWidth: 500,
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#f9f9f9'
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#222' }}>
                Update Report Status
              </h2>
              <button
                onClick={closeStatusModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MdClose size={24} color="#666" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {/* Report Info */}
              <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#555' }}>
                  <strong>Intern:</strong> {selectedReport.internId?.name} {selectedReport.internId?.surname}
                </p>
                <p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#555' }}>
                  <strong>Title:</strong> {selectedReport.title}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                  <strong>Current Status:</strong> {selectedReport.status}
                </p>
              </div>

              {/* Status Select */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#222' }}>
                  New Status <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: '#222'
                  }}
                >
                  <option value="Submitted">Submitted (No action yet)</option>
                  <option value="Reviewed">Reviewed / Acknowledged</option>
                  <option value="Actioned">Actioned (Disciplinary action taken)</option>
                </select>
              </div>

              {/* Admin Notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#222' }}>
                  Admin Notes <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this report (e.g., action taken, follow-up required)"
                  maxLength={500}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    color: '#222',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
                <small style={{ color: '#999', marginTop: 4, display: 'block' }}>
                  {adminNotes.length}/500 characters
                </small>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={closeStatusModal}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    background: '#f5f5f5',
                    color: '#222',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={updatingId === selectedReport._id}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    borderRadius: 4,
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: updatingId === selectedReport._id ? 'not-allowed' : 'pointer',
                    opacity: updatingId === selectedReport._id ? 0.7 : 1
                  }}
                >
                  {updatingId === selectedReport._id ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal - Shows full report when table row is clicked */}
      {showDetailModal && selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2001
          }}
          onClick={closeDetailModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 8,
              width: '90%',
              maxWidth: 700,
              maxHeight: '85vh',
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              backgroundColor: '#f5f7fa',
              borderBottom: '2px solid #3166AE',
              padding: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#222' }}>
                {selectedReport.title}
              </h2>
              <button
                onClick={closeDetailModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666',
                  padding: 0
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ overflow: 'auto', flex: 1, padding: 20 }}>
              {/* Status and Severity Row */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</p>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: getStatusColor(selectedReport.status).bg,
                    color: getStatusColor(selectedReport.status).color
                  }}>
                    {getStatusColor(selectedReport.status).icon}
                    {selectedReport.status}
                  </span>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity</p>
                  <span style={{
                    display: 'inline-block',
                    padding: '8px 12px',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: getSeverityColor(selectedReport.severity).bg,
                    color: getSeverityColor(selectedReport.severity).color
                  }}>
                    {selectedReport.severity}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e0e0e0' }}>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Intern</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#222', fontWeight: 500 }}>
                    {selectedReport.internId?.name} {selectedReport.internId?.surname}
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#999' }}>
                    ID: {selectedReport.internId?.idNumber}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Company</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#222', fontWeight: 500 }}>
                    {selectedReport.hostCompanyId?.name}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Department</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#222' }}>
                    {selectedReport.internId?.department || 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Report Type</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#222' }}>
                    {selectedReport.reportType}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e0e0e0' }}>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Incident Date</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#222' }}>
                    {new Date(selectedReport.incidentDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Submitted</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#222' }}>
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Description</p>
                <div style={{ backgroundColor: '#f9f9f9', padding: 12, borderRadius: 4, borderLeft: '3px solid #3166AE', fontSize: 13, color: '#333', lineHeight: 1.6 }}>
                  {selectedReport.description}
                </div>
              </div>

              {/* Supporting Notes */}
              {selectedReport.supportingNotes && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Supporting Notes</p>
                  <div style={{ backgroundColor: '#f9f9f9', padding: 12, borderRadius: 4, borderLeft: '3px solid #999', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                    {selectedReport.supportingNotes}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedReport.adminNotes && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Admin Notes</p>
                  <div style={{ backgroundColor: '#fff3e0', padding: 12, borderRadius: 4, borderLeft: '3px solid #f57c00', fontSize: 13, color: '#e65100', lineHeight: 1.6 }}>
                    {selectedReport.adminNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Action Buttons */}
            <div style={{
              borderTop: '1px solid #e0e0e0',
              padding: 16,
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              backgroundColor: '#f9f9f9'
            }}>
              <button
                onClick={closeDetailModal}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedStatus(selectedReport.status || 'Reviewed');
                  setAdminNotes(selectedReport.adminNotes || '');
                  setShowStatusModal(true);
                  setShowDetailModal(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                <MdEdit size={16} />
                Update Status
              </button>
              <button
                onClick={() => exportReportPDF(selectedReport)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                <MdDownload size={16} />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InternReportsAdmin;
