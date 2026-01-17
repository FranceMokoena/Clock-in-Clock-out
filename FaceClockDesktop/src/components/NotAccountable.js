import React, { useState, useEffect } from 'react';
import { notAccountableAPI } from '../services/api';
import './NotAccountable.css';

function NotAccountable({ isAdmin, hostCompanyId, isHostCompany }) {
  const [notAccountable, setNotAccountable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadNotAccountable();
  }, [selectedDate, hostCompanyId]);

  const loadNotAccountable = async () => {
    setLoading(true);
    try {
      const params = {
        date: selectedDate,
        ...(isHostCompany && hostCompanyId && { hostCompanyId })
      };
      const response = await notAccountableAPI.getAll(params);
      if (response.success) {
        setNotAccountable(response.notAccountable || []);
      }
    } catch (error) {
      console.error('Error loading not accountable staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (staff) => {
    setSelectedStaff(staff);
    setShowDetailsModal(true);
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading not accountable staff...</p>
      </div>
    );
  }

  return (
    <div className="not-accountable-container">
      <div className="not-accountable-header">
        <h2>Not Accountable Staff</h2>
        <div className="date-selector">
          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {notAccountable.length > 0 ? (
        <div className="not-accountable-table-container">
          <table className="not-accountable-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Company</th>
                <th>Expected Clock-In</th>
                <th>Expected Clock-Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {notAccountable.map((staff) => (
                <tr 
                  key={staff.staffId || staff._id}
                  className="clickable-row"
                  onClick={() => handleViewDetails(staff)}
                >
                  <td>{staff.staffName || staff.name}</td>
                  <td>
                    <span className={`role-badge role-${staff.role?.toLowerCase() || 'other'}`}>
                      {staff.role || 'N/A'}
                    </span>
                  </td>
                  <td>{staff.department || 'N/A'}</td>
                  <td>{staff.hostCompanyName || 'N/A'}</td>
                  <td>{staff.expectedClockIn || 'N/A'}</td>
                  <td>{staff.expectedClockOut || 'N/A'}</td>
                  <td>
                    <span className="status-badge warning">
                      Not Accountable
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>All staff are accountable for {selectedDate}.</p>
        </div>
      )}

      {/* Full Details Modal */}
      {showDetailsModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => {
          setShowDetailsModal(false);
          setSelectedStaff(null);
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Not Accountable - Staff Details</h3>
              <button onClick={() => {
                setShowDetailsModal(false);
                setSelectedStaff(null);
              }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="official-ribbon">
                <div>
                  <strong>Accountability Review</strong>
                  <div className="ribbon-subtitle">Attendance Issue Analysis</div>
                </div>
                <span className="status-badge warning">Not Accountable</span>
              </div>

              <div className="details-section">
                <h4>Staff Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{selectedStaff.staffName || selectedStaff.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <span className="detail-value">
                    <span className={`role-badge role-${selectedStaff.role?.toLowerCase() || 'other'}`}>
                      {selectedStaff.role || 'N/A'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department:</span>
                  <span className="detail-value">{selectedStaff.department || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Host Company:</span>
                  <span className="detail-value">{selectedStaff.hostCompanyName || 'N/A'}</span>
                </div>
              </div>

              <div className="details-section">
                <h4>Issue Details</h4>
                <div className="detail-row">
                  <span className="detail-label">Reason:</span>
                  <span className="detail-value issue-reason">{selectedStaff.reason || 'No reason provided'}</span>
                </div>
                {selectedStaff.details && (
                  <div className="detail-row">
                    <span className="detail-label">Details:</span>
                    <span className="detail-value">{selectedStaff.details}</span>
                  </div>
                )}
              </div>

              <div className="details-section">
                <h4>Expected vs Actual</h4>
                <div className="detail-row">
                  <span className="detail-label">Expected Clock-In:</span>
                  <span className="detail-value">{formatTime(selectedStaff.expectedClockIn)}</span>
                </div>
                {selectedStaff.clockInTime && (
                  <div className="detail-row">
                    <span className="detail-label">Actual Clock-In:</span>
                    <span className="detail-value">{formatTime(selectedStaff.clockInTime)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Expected Clock-Out:</span>
                  <span className="detail-value">{formatTime(selectedStaff.expectedClockOut)}</span>
                </div>
                {selectedStaff.clockOutTime && (
                  <div className="detail-row">
                    <span className="detail-label">Actual Clock-Out:</span>
                    <span className="detail-value">{formatTime(selectedStaff.clockOutTime)}</span>
                  </div>
                )}
                {selectedStaff.breakStartTime && (
                  <div className="detail-row">
                    <span className="detail-label">Break Start Time:</span>
                    <span className="detail-value">{formatTime(selectedStaff.breakStartTime)}</span>
                  </div>
                )}
                {selectedStaff.breakEndTime && (
                  <div className="detail-row">
                    <span className="detail-label">Break End Time:</span>
                    <span className="detail-value">{formatTime(selectedStaff.breakEndTime)}</span>
                  </div>
                )}
                {selectedStaff.expectedBreakStart && (
                  <div className="detail-row">
                    <span className="detail-label">Expected Break Start:</span>
                    <span className="detail-value">{formatTime(selectedStaff.expectedBreakStart)}</span>
                  </div>
                )}
                {selectedStaff.expectedBreakEnd && (
                  <div className="detail-row">
                    <span className="detail-label">Expected Break End:</span>
                    <span className="detail-value">{formatTime(selectedStaff.expectedBreakEnd)}</span>
                  </div>
                )}
              </div>

              <div className="info-banner warning">
                This staff member did not meet attendance expectations for {selectedDate}. 
                Please review the details above and take appropriate action if needed.
              </div>

              <div className="modal-actions-section">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedStaff(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotAccountable;

