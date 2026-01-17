import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { internReportsAPI } from '../../services/api';
import '../Reports.css';

function InternReportModal({ isOpen, onClose, internId, hostCompanyId, onReportSubmitted }) {
  const [reportType, setReportType] = useState('Behavioural Concern');
  const [severity, setSeverity] = useState('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [supportingNotes, setSupportingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const reportTypes = [
    'Behavioural Concern',
    'Policy Violation',
    'Attendance Concern',
    'Performance Concern',
    'General Observation'
  ];

  const severities = ['Low', 'Medium', 'High'];

  const handleReset = () => {
    setReportType('Behavioural Concern');
    setSeverity('Medium');
    setTitle('');
    setDescription('');
    setIncidentDate(new Date().toISOString().split('T')[0]);
    setSupportingNotes('');
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (!incidentDate) {
      setError('Incident date is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        internId,
        hostCompanyId,
        reportType,
        severity,
        title: title.trim(),
        description: description.trim(),
        incidentDate: new Date(incidentDate),
        supportingNotes: supportingNotes.trim() || null,
        submittedByRole: 'HOST_COMPANY'
      };

      const result = await internReportsAPI.create(payload);

      if (result.success) {
        setSuccess('Report submitted successfully');
        handleReset();
        setTimeout(() => {
          onReportSubmitted();
          handleClose();
        }, 1500);
      } else {
        setError(result.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-overlay"
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
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          width: '90%',
          maxWidth: 700,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
          padding: 0
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
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#222' }}>Submit New Report</h2>
          <button
            aria-label="Close modal"
            onClick={handleClose}
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
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Report Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>
              Report Type <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#222',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>
              Severity <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#222',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              {severities.map((sev) => (
                <option key={sev} value={sev}>
                  {sev}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>
              Title <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the report"
              maxLength={200}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#222',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#999', marginTop: 4, display: 'block' }}>
              {title.length}/200 characters
            </small>
          </div>

          {/* Incident Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>
              Incident Date <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#222',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>
              Detailed Description <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the incident or concern"
              maxLength={5000}
              rows={6}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#222',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
            <small style={{ color: '#999', marginTop: 4, display: 'block' }}>
              {description.length}/5000 characters
            </small>
          </div>

          {/* Supporting Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#222' }}>
              Supporting Notes <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>(Optional)</span>
            </label>
            <textarea
              value={supportingNotes}
              onChange={(e) => setSupportingNotes(e.target.value)}
              placeholder="Any additional information, references, or attachments (text only)"
              maxLength={2000}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid #ddd',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#222',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
            <small style={{ color: '#999', marginTop: 4, display: 'block' }}>
              {supportingNotes.length}/2000 characters
            </small>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 12px',
                backgroundColor: '#ffebee',
                border: '1px solid #ffcdd2',
                borderRadius: 4,
                color: '#c62828',
                fontSize: 14
              }}
            >
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 12px',
                backgroundColor: '#e8f5e9',
                border: '1px solid #c8e6c9',
                borderRadius: 4,
                color: '#2e7d32',
                fontSize: 14
              }}
            >
              {success}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: 4,
                border: '1px solid #ddd',
                background: '#f5f5f5',
                color: '#222',
                fontSize: 14,
                fontWeight: 500,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: 4,
                border: 'none',
                background: '#1976d2',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InternReportModal;
