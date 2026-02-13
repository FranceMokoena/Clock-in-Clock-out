import React, { useState, useEffect, useRef } from 'react';
import { hostCompanyAPI } from '../services/api';
import './HostCompanies.css';

const resolveProfilePicture = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(data:|https?:|file:|blob:)/i.test(trimmed)) return trimmed;
  const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100;
  if (looksBase64) return `data:image/jpeg;base64,${trimmed}`;
  return trimmed;
};

const getCompanyInitials = (company) => {
  const name = (company?.companyName || company?.name || '').trim();
  if (!name) return 'HC';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'H';
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};

function HostCompanies({ isAdmin }) {
  const [hostCompanies, setHostCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHostCompany, setSelectedHostCompany] = useState(null);
  const [editingHostCompany, setEditingHostCompany] = useState(null);
  const [showHostCompanyModal, setShowHostCompanyModal] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [profilePreview, setProfilePreview] = useState({ src: '', name: '' });
  
  // Form fields for host company
  const [hostCompanyName, setHostCompanyName] = useState('');
  const [hostCompanyCompanyName, setHostCompanyCompanyName] = useState('');
  const [hostCompanyRegistrationNumber, setHostCompanyRegistrationNumber] = useState('');
  const [hostCompanyOperatingHours, setHostCompanyOperatingHours] = useState('');
  const [hostCompanyEmail, setHostCompanyEmail] = useState('');
  const [hostCompanyBusinessType, setHostCompanyBusinessType] = useState('');
  const [hostCompanyIndustry, setHostCompanyIndustry] = useState('');
  const [hostCompanyUsername, setHostCompanyUsername] = useState('');
  const [hostCompanyPassword, setHostCompanyPassword] = useState('');
  const [hostCompanyMentorName, setHostCompanyMentorName] = useState('');
  const [hostCompanyDefaultClockInTime, setHostCompanyDefaultClockInTime] = useState('');
  const [hostCompanyDefaultClockOutTime, setHostCompanyDefaultClockOutTime] = useState('');
  const [hostCompanyDefaultBreakStartTime, setHostCompanyDefaultBreakStartTime] = useState('');
  const [hostCompanyDefaultBreakEndTime, setHostCompanyDefaultBreakEndTime] = useState('');
  const [savingHostCompany, setSavingHostCompany] = useState(false);

  useEffect(() => {
    loadHostCompanies();
  }, []);

  const loadHostCompanies = async () => {
    setLoading(true);
    try {
      const response = await hostCompanyAPI.getAll();
      if (response.success) {
        const companiesWithCounts = response.companies.map(company => ({
          ...company,
          departmentCount: company.departmentCount || 0,
          internCount: company.internCount || 0
        }));
        setHostCompanies(companiesWithCounts);
      }
    } catch (error) {
      console.error('Error loading host companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHostCompanies();
    setRefreshing(false);
  };

  const resetHostCompanyForm = () => {
    setHostCompanyName('');
    setHostCompanyCompanyName('');
    setHostCompanyRegistrationNumber('');
    setHostCompanyOperatingHours('');
    setHostCompanyEmail('');
    setHostCompanyBusinessType('');
    setHostCompanyIndustry('');
    setHostCompanyUsername('');
    setHostCompanyPassword('');
    setHostCompanyMentorName('');
    setHostCompanyDefaultClockInTime('');
    setHostCompanyDefaultClockOutTime('');
    setHostCompanyDefaultBreakStartTime('');
    setHostCompanyDefaultBreakEndTime('');
  };

  const handleEditHostCompany = (company) => {
    setEditingHostCompany(company);
    setHostCompanyName(company.name || '');
    setHostCompanyCompanyName(company.companyName || '');
    setHostCompanyRegistrationNumber(company.registrationNumber || '');
    setHostCompanyOperatingHours(company.operatingHours || '');
    setHostCompanyEmail(company.emailAddress || '');
    setHostCompanyBusinessType(company.businessType || '');
    setHostCompanyIndustry(company.industry || '');
    setHostCompanyUsername(company.username || '');
    setHostCompanyPassword('');
    setHostCompanyMentorName(company.mentorName || '');
    setHostCompanyDefaultClockInTime(company.defaultClockInTime || '');
    setHostCompanyDefaultClockOutTime(company.defaultClockOutTime || '');
    setHostCompanyDefaultBreakStartTime(company.defaultBreakStartTime || '');
    setHostCompanyDefaultBreakEndTime(company.defaultBreakEndTime || '');
    setShowHostCompanyModal(true);
  };

  const handleSaveHostCompany = async () => {
    if (!hostCompanyName.trim()) {
      alert('Company name is required');
      return;
    }
    
    if (!hostCompanyCompanyName.trim()) {
      alert('Company name is required');
      return;
    }

    if (!editingHostCompany) {
      // Creating new - username and password required
      if (!hostCompanyUsername.trim()) {
        alert('Username is required');
        return;
      }
      
      if (!hostCompanyPassword || hostCompanyPassword.length < 6) {
        alert('Password is required and must be at least 6 characters');
        return;
      }
    }

    try {
      setSavingHostCompany(true);
      if (editingHostCompany) {
        // Update existing
        const updateData = {
          name: hostCompanyName.trim(),
          companyName: hostCompanyCompanyName.trim(),
          registrationNumber: hostCompanyRegistrationNumber.trim() || undefined,
          operatingHours: hostCompanyOperatingHours.trim() || undefined,
          emailAddress: hostCompanyEmail.trim() || undefined,
          businessType: hostCompanyBusinessType || undefined,
          industry: hostCompanyIndustry.trim() || undefined,
          mentorName: hostCompanyMentorName.trim() || undefined,
          isActive: editingHostCompany.isActive
        };
        
        // Only update username if provided
        if (hostCompanyUsername.trim()) {
          updateData.username = hostCompanyUsername.trim();
        }
        
        // Only update password if provided (for security, don't require it on edit)
        if (hostCompanyPassword && hostCompanyPassword.length >= 6) {
          updateData.password = hostCompanyPassword;
        }
        
        // Update default working hours if provided
        if (hostCompanyDefaultClockInTime.trim()) {
          updateData.defaultClockInTime = hostCompanyDefaultClockInTime.trim();
        } else {
          updateData.defaultClockInTime = undefined;
        }
        if (hostCompanyDefaultClockOutTime.trim()) {
          updateData.defaultClockOutTime = hostCompanyDefaultClockOutTime.trim();
        } else {
          updateData.defaultClockOutTime = undefined;
        }
        if (hostCompanyDefaultBreakStartTime.trim()) {
          updateData.defaultBreakStartTime = hostCompanyDefaultBreakStartTime.trim();
        } else {
          updateData.defaultBreakStartTime = undefined;
        }
        if (hostCompanyDefaultBreakEndTime.trim()) {
          updateData.defaultBreakEndTime = hostCompanyDefaultBreakEndTime.trim();
        } else {
          updateData.defaultBreakEndTime = undefined;
        }
        
        await hostCompanyAPI.update(editingHostCompany._id, updateData);
        alert('Host company updated successfully');
      } else {
        // Create new - only include fields that have values
        const createData = {
          name: hostCompanyName.trim(),
          companyName: hostCompanyCompanyName.trim(),
          username: hostCompanyUsername.trim(),
          password: hostCompanyPassword
        };
        
        // Only add optional fields if they have values
        if (hostCompanyRegistrationNumber.trim()) {
          createData.registrationNumber = hostCompanyRegistrationNumber.trim();
        }
        if (hostCompanyOperatingHours.trim()) {
          createData.operatingHours = hostCompanyOperatingHours.trim();
        }
        if (hostCompanyEmail.trim()) {
          createData.emailAddress = hostCompanyEmail.trim();
        }
        if (hostCompanyBusinessType) {
          createData.businessType = hostCompanyBusinessType;
        }
        if (hostCompanyIndustry.trim()) {
          createData.industry = hostCompanyIndustry.trim();
        }
        if (hostCompanyMentorName.trim()) {
          createData.mentorName = hostCompanyMentorName.trim();
        }
        // Add default working hours if provided
        if (hostCompanyDefaultClockInTime.trim()) {
          createData.defaultClockInTime = hostCompanyDefaultClockInTime.trim();
        }
        if (hostCompanyDefaultClockOutTime.trim()) {
          createData.defaultClockOutTime = hostCompanyDefaultClockOutTime.trim();
        }
        if (hostCompanyDefaultBreakStartTime.trim()) {
          createData.defaultBreakStartTime = hostCompanyDefaultBreakStartTime.trim();
        }
        if (hostCompanyDefaultBreakEndTime.trim()) {
          createData.defaultBreakEndTime = hostCompanyDefaultBreakEndTime.trim();
        }
        
        await hostCompanyAPI.create(createData);
        alert('Host company created successfully');
      }
      
      setShowHostCompanyModal(false);
      setEditingHostCompany(null);
      resetHostCompanyForm();
      await loadHostCompanies();
    } catch (error) {
      console.error('Error saving host company:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingHostCompany(false);
    }
  };

  const handleDeleteHostCompany = async (company) => {
    const departmentCount = company.departmentCount || 0;
    const internCount = company.internCount || 0;
    const hasRelatedData = departmentCount > 0 || internCount > 0;

    const warningMessage = hasRelatedData
      ? `WARNING: This will permanently delete:\n\n` +
        `• Host Company: "${company.companyName || company.name}"\n` +
        `• ${departmentCount} Department(s)\n` +
        `• ${internCount} Staff/Intern(s)\n` +
        `• All related attendance records\n` +
        `• All leave applications\n` +
        `• All attendance corrections\n\n` +
        `This action CANNOT be undone!`
      : `Are you sure you want to delete "${company.companyName || company.name}"?\n\nThis action cannot be undone.`;

    if (!window.confirm(warningMessage)) {
      return;
    }

    try {
      const url = hasRelatedData
        ? `/api/staff/admin/host-companies/${company._id}?cascade=true`
        : `/api/staff/admin/host-companies/${company._id}`;

      await hostCompanyAPI.delete(company._id);
      await loadHostCompanies();
    } catch (error) {
      console.error('Error deleting host company:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleViewHostCompanyDetails = (company) => {
    setSelectedHostCompany(company);
  };

  const openProfilePreview = (company) => {
    const src = resolveProfilePicture(company?.profilePicture);
    if (!src) return;
    setProfilePreview({
      src,
      name: company?.companyName || company?.name || 'Host Company'
    });
    setShowProfilePreview(true);
  };

  const closeProfilePreview = () => {
    setShowProfilePreview(false);
    setProfilePreview({ src: '', name: '' });
  };

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <p>Only administrators can manage host companies.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="hc-loading">
        <div className="spinner"></div>
        <p>Loading companies...</p>
      </div>
    );
  }

  // If a company is selected, show details view
  if (selectedHostCompany) {
    const selectedProfileSrc = resolveProfilePicture(selectedHostCompany.profilePicture);
    return (
      <div className="hc-container">
        {/* PAGE HEADER */}
        <div className="hc-page-header">
          <div>
            <h1 className="hc-page-title">🏢 HOST COMPANY REGISTRY</h1>
            <p className="hc-page-subtitle">Registered Organizations & Business Entities</p>
          </div>
          <button className="hc-back-btn" onClick={() => setSelectedHostCompany(null)}>
            ← Back to List
          </button>
        </div>

        {/* DETAILS VIEW */}
        <div className="hc-details-view">
          {/* Company Header */}
          <div className="hc-company-header">
            <div className="hc-company-header-left">
              <button
                className="hc-avatar-button hc-avatar-large"
                onClick={(event) => {
                  event.stopPropagation();
                  openProfilePreview(selectedHostCompany);
                }}
                disabled={!selectedProfileSrc}
                type="button"
              >
                {selectedProfileSrc ? (
                  <img src={selectedProfileSrc} alt="Host company profile" />
                ) : (
                  <span>{getCompanyInitials(selectedHostCompany)}</span>
                )}
              </button>
              <div>
                <h2 className="hc-company-name">{selectedHostCompany.companyName}</h2>
                <p className="hc-company-mentor">Mentor: {selectedHostCompany.name}</p>
              </div>
            </div>
            <div className="hc-company-actions">
              <span className={`hc-status-badge ${selectedHostCompany.isActive ? 'active' : 'inactive'}`}>
                {selectedHostCompany.isActive ? 'Active' : 'Inactive'}
              </span>
              <button 
                className="hc-edit-btn"
                onClick={() => handleEditHostCompany(selectedHostCompany)}
              >
                ✎ Edit
              </button>
              <button 
                className="hc-delete-btn"
                onClick={() => handleDeleteHostCompany(selectedHostCompany)}
              >
                🗑 Delete
              </button>
            </div>
          </div>

          {/* Details Sections */}
          <div className="hc-details-sections">
            <section className="hc-section">
              <h3 className="hc-section-title">📋 Basic Information</h3>
              <div className="hc-detail-row">
                <span className="hc-label">Company Name:</span>
                <span className="hc-value">{selectedHostCompany.companyName || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Mentor Name:</span>
                <span className="hc-value">{selectedHostCompany.name || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Username:</span>
                <span className="hc-value">{selectedHostCompany.username || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Email Address:</span>
                <span className="hc-value">{selectedHostCompany.emailAddress || '—'}</span>
              </div>
            </section>

            <section className="hc-section">
              <h3 className="hc-section-title">🏢 Business Information</h3>
              <div className="hc-detail-row">
                <span className="hc-label">Registration Number:</span>
                <span className="hc-value">{selectedHostCompany.registrationNumber || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Business Type:</span>
                <span className="hc-value">{selectedHostCompany.businessType || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Industry:</span>
                <span className="hc-value">{selectedHostCompany.industry || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Operating Hours:</span>
                <span className="hc-value">{selectedHostCompany.operatingHours || '—'}</span>
              </div>
            </section>

            <section className="hc-section">
              <h3 className="hc-section-title">⏰ Default Working Hours</h3>
              <div className="hc-detail-row">
                <span className="hc-label">Clock-In Time:</span>
                <span className="hc-value">{selectedHostCompany.defaultClockInTime || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Clock-Out Time:</span>
                <span className="hc-value">{selectedHostCompany.defaultClockOutTime || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Break Start Time:</span>
                <span className="hc-value">{selectedHostCompany.defaultBreakStartTime || '—'}</span>
              </div>
              <div className="hc-detail-row">
                <span className="hc-label">Break End Time:</span>
                <span className="hc-value">{selectedHostCompany.defaultBreakEndTime || '—'}</span>
              </div>
            </section>

            <section className="hc-section">
              <h3 className="hc-section-title">📊 Statistics</h3>
              <div className="hc-stats-grid">
                <div className="hc-stat-card">
                  <div className="hc-stat-number">{selectedHostCompany.departmentCount || 0}</div>
                  <div className="hc-stat-label">Departments</div>
                </div>
                <div className="hc-stat-card">
                  <div className="hc-stat-number">{selectedHostCompany.internCount || 0}</div>
                  <div className="hc-stat-label">Staff/Interns</div>
                </div>
              </div>
            </section>
          </div>

          <div className="hc-footer-note">
            Select an action above or return to the list to manage other companies.
          </div>
        </div>

        {/* EDIT MODAL - Inside details view */}
        {showHostCompanyModal && (
          <div className="hc-modal-overlay" onClick={() => {
            setShowHostCompanyModal(false);
            setEditingHostCompany(null);
            resetHostCompanyForm();
          }}>
            <div className="hc-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="hc-modal-header">
                <h2>
                  {editingHostCompany ? '✎ Edit Host Company' : '+ Register New Host Company'}
                </h2>
                <button 
                  className="hc-modal-close"
                  onClick={() => {
                    setShowHostCompanyModal(false);
                    setEditingHostCompany(null);
                    resetHostCompanyForm();
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="hc-modal-body">
                <div className="hc-form-sections">
                  {/* Basic Information Section */}
                  <div className="hc-form-section">
                    <h3 className="hc-form-section-title">Basic Information</h3>
                    <div className="hc-form-grid">
                      <div className="hc-form-group">
                        <label>Host Name *</label>
                        <input
                          type="text"
                          value={hostCompanyName}
                          onChange={(e) => setHostCompanyName(e.target.value)}
                          placeholder="e.g., John Doe"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Company Name *</label>
                        <input
                          type="text"
                          value={hostCompanyCompanyName}
                          onChange={(e) => setHostCompanyCompanyName(e.target.value)}
                          placeholder="e.g., Tech Company Ltd"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Email Address</label>
                        <input
                          type="email"
                          value={hostCompanyEmail}
                          onChange={(e) => setHostCompanyEmail(e.target.value)}
                          placeholder="company@example.com"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Mentor Name</label>
                        <input
                          type="text"
                          value={hostCompanyMentorName}
                          onChange={(e) => setHostCompanyMentorName(e.target.value)}
                          placeholder="Mentor's name"
                        />
                      </div>
                      {!editingHostCompany && (
                        <>
                          <div className="hc-form-group">
                            <label>Username *</label>
                            <input
                              type="text"
                              value={hostCompanyUsername}
                              onChange={(e) => setHostCompanyUsername(e.target.value)}
                              placeholder="Login username"
                            />
                          </div>
                          <div className="hc-form-group">
                            <label>Password *</label>
                            <input
                              type="password"
                              value={hostCompanyPassword}
                              onChange={(e) => setHostCompanyPassword(e.target.value)}
                              placeholder="Minimum 6 characters"
                            />
                          </div>
                        </>
                      )}
                      {editingHostCompany && (
                        <>
                          <div className="hc-form-group">
                            <label>Username</label>
                            <input
                              type="text"
                              value={hostCompanyUsername}
                              onChange={(e) => setHostCompanyUsername(e.target.value)}
                              placeholder="Leave blank to keep current"
                            />
                          </div>
                          <div className="hc-form-group">
                            <label>Password</label>
                            <input
                              type="password"
                              value={hostCompanyPassword}
                              onChange={(e) => setHostCompanyPassword(e.target.value)}
                              placeholder="Leave blank to keep current"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Business Information Section */}
                  <div className="hc-form-section">
                    <h3 className="hc-form-section-title">Business Information</h3>
                    <div className="hc-form-grid">
                      <div className="hc-form-group">
                        <label>Registration Number</label>
                        <input
                          type="text"
                          value={hostCompanyRegistrationNumber}
                          onChange={(e) => setHostCompanyRegistrationNumber(e.target.value)}
                          placeholder="e.g., REG123456"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Business Type</label>
                        <select 
                          value={hostCompanyBusinessType}
                          onChange={(e) => setHostCompanyBusinessType(e.target.value)}
                        >
                          <option value="">Select business type</option>
                          <option value="IT">IT</option>
                          <option value="Finance">Finance</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Retail">Retail</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="hc-form-group">
                        <label>Industry</label>
                        <input
                          type="text"
                          value={hostCompanyIndustry}
                          onChange={(e) => setHostCompanyIndustry(e.target.value)}
                          placeholder="e.g., Software Development"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Operating Hours</label>
                        <input
                          type="text"
                          value={hostCompanyOperatingHours}
                          onChange={(e) => setHostCompanyOperatingHours(e.target.value)}
                          placeholder="e.g., 9:00 AM - 5:00 PM"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Default Working Hours Section */}
                  <div className="hc-form-section">
                    <h3 className="hc-form-section-title">Default Working Hours</h3>
                    <div className="hc-form-grid">
                      <div className="hc-form-group">
                        <label>Clock In Time (HH:MM)</label>
                        <input
                          type="text"
                          value={hostCompanyDefaultClockInTime}
                          onChange={(e) => setHostCompanyDefaultClockInTime(e.target.value)}
                          placeholder="e.g., 08:00"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Clock Out Time (HH:MM)</label>
                        <input
                          type="text"
                          value={hostCompanyDefaultClockOutTime}
                          onChange={(e) => setHostCompanyDefaultClockOutTime(e.target.value)}
                          placeholder="e.g., 17:00"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Break Start Time (HH:MM)</label>
                        <input
                          type="text"
                          value={hostCompanyDefaultBreakStartTime}
                          onChange={(e) => setHostCompanyDefaultBreakStartTime(e.target.value)}
                          placeholder="e.g., 12:00"
                        />
                      </div>
                      <div className="hc-form-group">
                        <label>Break End Time (HH:MM)</label>
                        <input
                          type="text"
                          value={hostCompanyDefaultBreakEndTime}
                          onChange={(e) => setHostCompanyDefaultBreakEndTime(e.target.value)}
                          placeholder="e.g., 14:00"
                        />
                      </div>
                    </div>

                    {editingHostCompany && (
                      <div className="hc-form-section">
                        <h3 className="hc-form-section-title">Status</h3>
                        <div className="hc-form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={editingHostCompany.isActive}
                              onChange={(e) => setEditingHostCompany({
                                ...editingHostCompany,
                                isActive: e.target.checked
                              })}
                            />
                            {' '}Active
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="hc-modal-actions">
                <button 
                  className="hc-btn-cancel"
                  onClick={() => {
                    setShowHostCompanyModal(false);
                    setEditingHostCompany(null);
                    resetHostCompanyForm();
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="hc-btn-save"
                  onClick={handleSaveHostCompany}
                  disabled={savingHostCompany}
                >
                  {savingHostCompany ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showProfilePreview && (
          <div className="hc-profile-modal" onClick={closeProfilePreview}>
            <div className="hc-profile-modal-content" onClick={(e) => e.stopPropagation()}>
              <img src={profilePreview.src} alt={profilePreview.name} />
              <div className="hc-profile-modal-name">{profilePreview.name}</div>
              <button className="hc-profile-modal-close" onClick={closeProfilePreview}>Close</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="hc-container">
      {/* PAGE HEADER */}
      <div className="hc-page-header">
        <div>
          <h1 className="hc-page-title">🏢 HOST COMPANY REGISTRY</h1>
          <p className="hc-page-subtitle">Registered Organizations & Business Entities</p>
        </div>
        <div className="hc-header-actions">
          <button className="hc-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <button 
            className="hc-add-btn"
            onClick={() => {
              setEditingHostCompany(null);
              resetHostCompanyForm();
              setShowHostCompanyModal(true);
            }}
          >
            + Register New
          </button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="hc-stats-summary">
        <div className="hc-stat-box">
          <div className="hc-stat-value">{hostCompanies.length}</div>
          <div className="hc-stat-text">Total Companies</div>
        </div>
        <div className="hc-stat-box">
          <div className="hc-stat-value" style={{ color: '#16a34a' }}>
            {hostCompanies.filter(c => c.isActive).length}
          </div>
          <div className="hc-stat-text">Active</div>
        </div>
        <div className="hc-stat-box">
          <div className="hc-stat-value" style={{ color: '#6366f1' }}>
            {hostCompanies.reduce((sum, c) => sum + (c.internCount || 0), 0)}
          </div>
          <div className="hc-stat-text">Total Staff</div>
        </div>
      </div>

      {/* HOST COMPANIES TABLE */}
      <div className="hc-table-wrapper">
        {/* Table Header */}
        <div className="hc-table-header">
          <span>REGISTERED HOST COMPANIES</span>
        </div>

        {/* Column Headers */}
        <div className="hc-table-columns">
          <div className="hc-col-company">Company Name</div>
          <div className="hc-col-reg">Registration No.</div>
          <div className="hc-col-industry">Industry</div>
          <div className="hc-col-depts">Depts</div>
          <div className="hc-col-staff">Staff</div>
          <div className="hc-col-status">Status</div>
        </div>

        {/* Table Body */}
        {hostCompanies.length === 0 ? (
          <div className="hc-empty-state">
            <span className="hc-empty-icon">🏢</span>
            <p className="hc-empty-title">No Host Companies Registered</p>
            <p className="hc-empty-subtitle">Click "Register New" to add a host company to the system</p>
          </div>
        ) : (
          <div className="hc-table-body">
            {hostCompanies.map((company, index) => {
              const profileSrc = resolveProfilePicture(company.profilePicture);
              return (
                <div 
                  key={company._id}
                  className={`hc-table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                  onClick={() => handleViewHostCompanyDetails(company)}
                >
                {/* Company Name Column */}
                <div className="hc-col-company">
                  <div className="hc-company-title-row">
                    <button
                      className="hc-avatar-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openProfilePreview(company);
                      }}
                      disabled={!profileSrc}
                      type="button"
                    >
                      {profileSrc ? (
                        <img src={profileSrc} alt="Host company profile" />
                      ) : (
                        <span>{getCompanyInitials(company)}</span>
                      )}
                    </button>
                    <div className="hc-company-text">
                      <div className="hc-company-title">{company.companyName || company.name}</div>
                      {company.companyName && company.name !== company.companyName && (
                        <div className="hc-company-subtitle">{company.name}</div>
                      )}
                      {company.emailAddress && (
                        <div className="hc-company-email">✉️ {company.emailAddress}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Registration Number Column */}
                <div className="hc-col-reg">
                  {company.registrationNumber || '—'}
                </div>

                {/* Industry Column */}
                <div className="hc-col-industry">
                  {company.industry || '—'}
                </div>

                {/* Departments Count Column */}
                <div className="hc-col-depts">
                  <span className="hc-count-badge depts">
                    {company.departmentCount || 0}
                  </span>
                </div>

                {/* Staff Count Column */}
                <div className="hc-col-staff">
                  <span className="hc-count-badge staff">
                    {company.internCount || 0}
                  </span>
                </div>

                {/* Status Column */}
                <div className="hc-col-status">
                  <span className={`hc-status-badge ${company.isActive ? 'active' : 'inactive'}`}>
                    {company.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER NOTE */}
      <div className="hc-footer-note">
        Select a company from the list above to view full details, departments, staff members, and management options.
      </div>

      {/* ADD/EDIT MODAL - In list view */}
      {showHostCompanyModal && (
        <div className="hc-modal-overlay" onClick={() => {
          setShowHostCompanyModal(false);
          setEditingHostCompany(null);
          resetHostCompanyForm();
        }}>
          <div className="hc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hc-modal-header">
              <h2>
                {editingHostCompany ? '✎ Edit Host Company' : '+ Register New Host Company'}
              </h2>
              <button 
                className="hc-modal-close"
                onClick={() => {
                  setShowHostCompanyModal(false);
                  setEditingHostCompany(null);
                  resetHostCompanyForm();
                }}
              >
                ✕
              </button>
            </div>

            <div className="hc-modal-body">
              <div className="hc-form-sections">
                {/* Basic Information Section */}
                <div className="hc-form-section">
                  <h3 className="hc-form-section-title">Basic Information</h3>
                  <div className="hc-form-grid">
                    <div className="hc-form-group">
                      <label>Host Name *</label>
                      <input
                        type="text"
                        value={hostCompanyName}
                        onChange={(e) => setHostCompanyName(e.target.value)}
                        placeholder="e.g., John Doe"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Company Name *</label>
                      <input
                        type="text"
                        value={hostCompanyCompanyName}
                        onChange={(e) => setHostCompanyCompanyName(e.target.value)}
                        placeholder="e.g., Tech Company Ltd"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        value={hostCompanyEmail}
                        onChange={(e) => setHostCompanyEmail(e.target.value)}
                        placeholder="company@example.com"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Mentor Name</label>
                      <input
                        type="text"
                        value={hostCompanyMentorName}
                        onChange={(e) => setHostCompanyMentorName(e.target.value)}
                        placeholder="Mentor's name"
                      />
                    </div>
                    {!editingHostCompany && (
                      <>
                        <div className="hc-form-group">
                          <label>Username *</label>
                          <input
                            type="text"
                            value={hostCompanyUsername}
                            onChange={(e) => setHostCompanyUsername(e.target.value)}
                            placeholder="Login username"
                          />
                        </div>
                        <div className="hc-form-group">
                          <label>Password *</label>
                          <input
                            type="password"
                            value={hostCompanyPassword}
                            onChange={(e) => setHostCompanyPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                          />
                        </div>
                      </>
                    )}
                    {editingHostCompany && (
                      <>
                        <div className="hc-form-group">
                          <label>Username</label>
                          <input
                            type="text"
                            value={hostCompanyUsername}
                            onChange={(e) => setHostCompanyUsername(e.target.value)}
                            placeholder="Leave blank to keep current"
                          />
                        </div>
                        <div className="hc-form-group">
                          <label>Password</label>
                          <input
                            type="password"
                            value={hostCompanyPassword}
                            onChange={(e) => setHostCompanyPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Business Information Section */}
                <div className="hc-form-section">
                  <h3 className="hc-form-section-title">Business Information</h3>
                  <div className="hc-form-grid">
                    <div className="hc-form-group">
                      <label>Registration Number</label>
                      <input
                        type="text"
                        value={hostCompanyRegistrationNumber}
                        onChange={(e) => setHostCompanyRegistrationNumber(e.target.value)}
                        placeholder="e.g., REG123456"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Business Type</label>
                      <select 
                        value={hostCompanyBusinessType}
                        onChange={(e) => setHostCompanyBusinessType(e.target.value)}
                      >
                        <option value="">Select business type</option>
                        <option value="IT">IT</option>
                        <option value="Finance">Finance</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Retail">Retail</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="hc-form-group">
                      <label>Industry</label>
                      <input
                        type="text"
                        value={hostCompanyIndustry}
                        onChange={(e) => setHostCompanyIndustry(e.target.value)}
                        placeholder="e.g., Software Development"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Operating Hours</label>
                      <input
                        type="text"
                        value={hostCompanyOperatingHours}
                        onChange={(e) => setHostCompanyOperatingHours(e.target.value)}
                        placeholder="e.g., 9:00 AM - 5:00 PM"
                      />
                    </div>
                  </div>
                </div>

                {/* Default Working Hours Section */}
                <div className="hc-form-section">
                  <h3 className="hc-form-section-title">Default Working Hours</h3>
                  <div className="hc-form-grid">
                    <div className="hc-form-group">
                      <label>Clock In Time (HH:MM)</label>
                      <input
                        type="text"
                        value={hostCompanyDefaultClockInTime}
                        onChange={(e) => setHostCompanyDefaultClockInTime(e.target.value)}
                        placeholder="e.g., 08:00"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Clock Out Time (HH:MM)</label>
                      <input
                        type="text"
                        value={hostCompanyDefaultClockOutTime}
                        onChange={(e) => setHostCompanyDefaultClockOutTime(e.target.value)}
                        placeholder="e.g., 17:00"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Break Start Time (HH:MM)</label>
                      <input
                        type="text"
                        value={hostCompanyDefaultBreakStartTime}
                        onChange={(e) => setHostCompanyDefaultBreakStartTime(e.target.value)}
                        placeholder="e.g., 12:00"
                      />
                    </div>
                    <div className="hc-form-group">
                      <label>Break End Time (HH:MM)</label>
                      <input
                        type="text"
                        value={hostCompanyDefaultBreakEndTime}
                        onChange={(e) => setHostCompanyDefaultBreakEndTime(e.target.value)}
                        placeholder="e.g., 14:00"
                      />
                    </div>
                  </div>

                  {editingHostCompany && (
                    <div className="hc-form-section">
                      <h3 className="hc-form-section-title">Status</h3>
                      <div className="hc-form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={editingHostCompany.isActive}
                            onChange={(e) => setEditingHostCompany({
                              ...editingHostCompany,
                              isActive: e.target.checked
                            })}
                          />
                          {' '}Active
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="hc-modal-actions">
              <button 
                className="hc-btn-cancel"
                onClick={() => {
                  setShowHostCompanyModal(false);
                  setEditingHostCompany(null);
                  resetHostCompanyForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="hc-btn-save"
                onClick={handleSaveHostCompany}
                disabled={savingHostCompany}
              >
                {savingHostCompany ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfilePreview && (
        <div className="hc-profile-modal" onClick={closeProfilePreview}>
          <div className="hc-profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={profilePreview.src} alt={profilePreview.name} />
            <div className="hc-profile-modal-name">{profilePreview.name}</div>
            <button className="hc-profile-modal-close" onClick={closeProfilePreview}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HostCompanies;

