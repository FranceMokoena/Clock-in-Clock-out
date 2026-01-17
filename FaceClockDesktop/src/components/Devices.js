import React, { useState, useEffect } from 'react';
import { MdDelete, MdCheckCircle, MdRefresh, MdChevronRight, MdClose } from 'react-icons/md';
import { devicesAPI } from '../services/api';
import './Devices.css';

function Devices({ isAdmin, hostCompanyId, isHostCompany }) {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    loadDevices();
  }, [hostCompanyId, isHostCompany]);

  useEffect(() => {
    applyFilters();
  }, [devices, searchTerm, filterStatus, sortBy]);

  const loadDevices = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = isHostCompany && hostCompanyId ? { hostCompanyId } : {};
      const response = await devicesAPI.getAll(params);
      if (response.success) {
        setDevices(response.devices || []);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      setMessage({ type: 'error', text: 'Failed to load devices' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = devices;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.staffName?.toLowerCase().includes(term) ||
        d.staffIdNumber?.toLowerCase().includes(term) ||
        d.deviceInfo?.modelName?.toLowerCase().includes(term) ||
        d.fingerprint?.includes(term)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.registeredAt) - new Date(a.registeredAt);
        case 'status':
          const statusOrder = { pending: 0, trusted: 1, revoked: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'name':
          return (a.staffName || '').localeCompare(b.staffName || '');
        default:
          return 0;
      }
    });

    setFilteredDevices(filtered);
  };

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
  };

  const handleApproveClick = () => {
    setConfirmAction('approve');
    setShowConfirmModal(true);
  };

  const handleRejectClick = () => {
    setConfirmAction('reject');
    setShowConfirmModal(true);
  };

  const handleRevokeClick = () => {
    setConfirmAction('revoke');
    setShowConfirmModal(true);
  };

  const confirmActionHandler = async () => {
    if (!selectedDevice || !confirmAction) return;

    setProcessing(true);
    setMessage(null);
    try {
      const response = await devicesAPI.updateStatus(selectedDevice._id, confirmAction);
      if (response.success) {
        setMessage({
          type: 'success',
          text: `Device ${confirmAction === 'approve' ? 'approved' : confirmAction === 'reject' ? 'rejected' : 'revoked'} successfully`
        });
        loadDevices();
        setShowDetailModal(false);
        setShowConfirmModal(false);
        setSelectedDevice(null);
        setConfirmAction(null);
      } else {
        setMessage({ type: 'error', text: response.error || 'Action failed' });
      }
    } catch (error) {
      console.error('Error updating device:', error);
      setMessage({ type: 'error', text: 'Failed to update device status' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'trusted':
        return <span className="badge badge-success">Approved</span>;
      case 'revoked':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="devices-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="devices-container">
      <div className="devices-header">
        <h2>Device Management</h2>
        <button className="btn btn-refresh" onClick={() => loadDevices()} disabled={loading}>
          <MdRefresh /> Refresh
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button className="alert-close" onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="devices-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by staff name, device model, or fingerprint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="all">All Status</option>
            <option value="pending">Pending Approval</option>
            <option value="trusted">Approved</option>
            <option value="revoked">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="date">Most Recent</option>
            <option value="status">Status</option>
            <option value="name">Staff Name</option>
          </select>
        </div>

        <div className="filter-info">
          {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="devices-list-view">
        {filteredDevices.length === 0 ? (
          <div className="empty-state">
            <p>No devices found</p>
          </div>
        ) : (
          <table className="devices-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Device</th>
                <th>Registered</th>
                <th>Last Seen</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map(device => (
                <tr key={device._id} className="device-row">
                  <td className="staff-cell">
                    <div className="staff-info">
                      <div className="staff-name">{device.staffName || 'Unknown'}</div>
                      <div className="staff-id">{device.staffIdNumber || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="device-cell">
                    <div className="device-info-short">
                      <div className="device-model">{device.deviceInfo?.modelName || 'Unknown'}</div>
                      <div className="device-platform">{device.deviceInfo?.platform || 'Unknown'}</div>
                    </div>
                  </td>
                  <td className="date-cell">{formatDate(device.registeredAt)}</td>
                  <td className="date-cell">{formatDate(device.lastSeenAt)}</td>
                  <td className="status-cell">{getStatusBadge(device.status)}</td>
                  <td className="action-cell">
                    <button
                      className="btn-view"
                      onClick={() => handleSelectDevice(device)}
                      title="View details"
                    >
                      <MdChevronRight />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedDevice && (
        <div className="modal-overlay" onClick={() => !processing && setShowDetailModal(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Device Details</h3>
              <button className="modal-close" onClick={() => !processing && setShowDetailModal(false)}>
                <MdClose />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>Staff Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Name:</span>
                    <span className="value">{selectedDevice.staffName || 'Unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">ID Number:</span>
                    <span className="value">{selectedDevice.staffIdNumber || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Email:</span>
                    <span className="value">{selectedDevice.staffEmail || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Role:</span>
                    <span className="value">{selectedDevice.staffRole || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Device Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Device Model:</span>
                    <span className="value">{selectedDevice.deviceInfo?.modelName || 'Unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Platform:</span>
                    <span className="value">{selectedDevice.deviceInfo?.platform || 'Unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">OS Version:</span>
                    <span className="value">{selectedDevice.deviceInfo?.osVersion || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">App Version:</span>
                    <span className="value">{selectedDevice.deviceInfo?.appVersion || 'N/A'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="label">Fingerprint:</span>
                    <span className="value monospace">{selectedDevice.fingerprint || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Timeline</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">Registered:</span>
                    <span className="value">{formatDate(selectedDevice.registeredAt)}</span>
                  </div>
                  {selectedDevice.lastSeenAt && (
                    <div className="detail-item">
                      <span className="label">Last Seen:</span>
                      <span className="value">{formatDate(selectedDevice.lastSeenAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h4>Status</h4>
                <div className="status-display">
                  {getStatusBadge(selectedDevice.status)}
                  <p className="status-description">
                    {selectedDevice.status === 'pending' && 'This device is waiting for approval'}
                    {selectedDevice.status === 'trusted' && 'This device has been approved and can be used'}
                    {selectedDevice.status === 'revoked' && 'This device has been revoked and cannot be used'}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDetailModal(false)}
                disabled={processing}
              >
                Close
              </button>
              {selectedDevice.status === 'pending' && (
                <>
                  <button
                    className="btn btn-danger"
                    onClick={handleRejectClick}
                    disabled={processing}
                  >
                    <MdDelete /> Reject
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleApproveClick}
                    disabled={processing}
                  >
                    <MdCheckCircle /> Approve
                  </button>
                </>
              )}
              {selectedDevice.status === 'trusted' && (
                <button
                  className="btn btn-danger"
                  onClick={handleRevokeClick}
                  disabled={processing}
                >
                  <MdDelete /> Revoke Access
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedDevice && confirmAction && (
        <div className="modal-overlay" onClick={() => !processing && setShowConfirmModal(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {confirmAction === 'approve' && 'Approve Device'}
              {confirmAction === 'reject' && 'Reject Device'}
              {confirmAction === 'revoke' && 'Revoke Device Access'}
            </h3>

            <p className="modal-text">
              {confirmAction === 'approve' && `Are you sure you want to approve this device for ${selectedDevice.staffName}?`}
              {confirmAction === 'reject' && `Are you sure you want to reject this device for ${selectedDevice.staffName}?`}
              {confirmAction === 'revoke' && `Are you sure you want to revoke access to this device?`}
            </p>

            <div className="device-preview">
              <p><strong>Device:</strong> {selectedDevice.deviceInfo?.modelName || 'Unknown'}</p>
              <p><strong>Staff:</strong> {selectedDevice.staffName}</p>
              <p><strong>Registered:</strong> {formatDate(selectedDevice.registeredAt)}</p>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className={`btn btn-${confirmAction === 'approve' ? 'success' : 'danger'}`}
                onClick={confirmActionHandler}
                disabled={processing}
              >
                {processing ? 'Processing...' : (
                  <>
                    {confirmAction === 'approve' && <><MdCheckCircle /> Approve</>}
                    {(confirmAction === 'reject' || confirmAction === 'revoke') && <><MdDelete /> {confirmAction === 'revoke' ? 'Revoke' : 'Reject'}</>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Devices;
