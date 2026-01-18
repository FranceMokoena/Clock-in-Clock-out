import React, { useState, useEffect } from 'react';
import { MdFolderOpen, MdEdit, MdDelete, MdArrowForward } from 'react-icons/md';
import { departmentAPI, staffAPI, hostCompanyAPI, locationsAPI } from '../services/api';
import './Departments.css';

function Departments({ isAdmin, hostCompanyId, isHostCompany }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showListView, setShowListView] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [hostCompanies, setHostCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    departmentCode: '',
    companyName: '',
    description: '',
    location: '',
    customAddress: '',
    hostCompanyId: hostCompanyId || '',
    isActive: true,
  });

  useEffect(() => {
    loadDepartments();
    if (isAdmin) {
      loadHostCompanies();
    }
    loadLocations();
  }, [hostCompanyId, isHostCompany, isAdmin]);

  const loadHostCompanies = async () => {
    try {
      const response = await hostCompanyAPI.getAll();
      if (response.success) {
        setHostCompanies(response.companies || []);
      }
    } catch (error) {
      console.error('Error loading host companies:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await locationsAPI.getAll();
      if (response.success && response.locations) {
        setLocations(response.locations);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const params = isHostCompany && hostCompanyId ? { hostCompanyId } : {};

      // Get all departments
      const deptResponse = await departmentAPI.getAll(params);

      if (!deptResponse.success) {
        setDepartments([]);
        setLoading(false);
        return;
      }

      const allDepartments = deptResponse.departments || [];
      console.log(`✅ Loaded ${allDepartments.length} departments`);

      // For each department, fetch interns matching that department name
      const departmentsWithInterns = await Promise.all(
        allDepartments.map(async (dept) => {
          try {
            console.log(`📍 Fetching interns for department: "${dept.name}"`);

            // Use the same approach as mobile app: query staff with department filter
            const staffResponse = await staffAPI.getAll({
              department: dept.name,
              fullData: 'true',
              ...(isHostCompany && hostCompanyId && { hostCompanyId })
            });

            const interns = staffResponse.success && Array.isArray(staffResponse.staff)
              ? staffResponse.staff.filter(s => s.role === 'Intern')
              : [];

            console.log(`✅ Department "${dept.name}": ${interns.length} interns found`);

            return {
              ...dept,
              internCount: interns.length
            };
          } catch (error) {
            console.error(`❌ Error loading interns for department "${dept.name}":`, error.message);
            return {
              ...dept,
              internCount: 0
            };
          }
        })
      );

      setDepartments(departmentsWithInterns);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (dept) => {
    setSelectedDepartment(dept);
    setShowDetailsModal(true);
    setShowListView(false);
  };

  const handleEdit = (dept, event) => {
    if (event) {
      event.stopPropagation();
    }
    setEditingDepartment(dept);
    setFormData({
      name: dept.name || '',
      departmentCode: dept.departmentCode || '',
      companyName: dept.companyName || '',
      description: dept.description || '',
      location: dept.location || '',
      customAddress: dept.locationAddress || '',
      hostCompanyId: dept.hostCompanyId ? dept.hostCompanyId.toString() : (hostCompanyId || ''),
      isActive: dept.isActive !== undefined ? dept.isActive : true,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        hostCompanyId: formData.hostCompanyId || (hostCompanyId || undefined),
      };
      if (editingDepartment) {
        await departmentAPI.update(editingDepartment._id, dataToSave);
      } else {
        await departmentAPI.create(dataToSave);
      }
      setShowModal(false);
      setEditingDepartment(null);
      loadDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      alert('Error saving department: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (dept, event) => {
    if (event) {
      event.stopPropagation();
    }
    if (!window.confirm(`Are you sure you want to delete "${dept.name}"? This will also affect all associated staff/interns.`)) {
      return;
    }
    try {
      await departmentAPI.delete(dept._id);
      loadDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Error deleting department: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading departments...</p>
      </div>
    );
  }

  return (
    <div className="departments-container">
      <div className="departments-header">
        <h2>Departments</h2>
        {(isAdmin || isHostCompany) && (
          <button className="add-button" onClick={() => {
            setEditingDepartment(null);
            setFormData({
              name: '',
              departmentCode: '',
              companyName: '',
              description: '',
              location: '',
              customAddress: '',
              hostCompanyId: hostCompanyId || '',
              isActive: true,
            });
            setShowModal(true);
          }}>
            + Add Department
          </button>
        )}
      </div>

      {/* LIST VIEW */}
      <div className="departments-list">
        {departments.length === 0 ? (
          <div className="empty-state">
            <MdFolderOpen size={48} />
            <p>No departments found</p>
          </div>
        ) : (
          departments.map((dept) => (
            <div
              key={dept._id}
              className="department-list-item"
              onClick={() => handleViewDetails(dept)}
            >
              <div className="department-list-left">
                <div className="department-list-icon">
                  <MdFolderOpen />
                </div>
                <div className="department-list-info">
                  <div className="department-list-title">{dept.name}</div>
                  <div className="department-list-subtitle">{dept.companyName}</div>
                  <div className="department-list-meta">
                    <span className="meta-item">📍 {dept.location || 'No location'}</span>
                    <span className="meta-item">👥 {dept.internCount || 0} Interns</span>
                    {dept.description && <span className="meta-item">📝 {dept.description}</span>}
                  </div>
                </div>
              </div>
              <div className="department-list-right">
                <span className={`status-badge ${dept.isActive ? 'active' : 'inactive'}`}>
                  {dept.isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  className="view-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(dept);
                  }}
                >
                  View Details <MdArrowForward />
                </button>
              </div>
              {(isAdmin || isHostCompany) && (
                <div className="department-list-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="icon-btn edit-btn"
                    onClick={(e) => handleEdit(dept, e)}
                    title="Edit"
                  >
                    <MdEdit />
                  </button>
                  <button
                    className="icon-btn delete-btn"
                    onClick={(e) => handleDelete(dept, e)}
                    title="Delete"
                  >
                    <MdDelete />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDepartment ? 'Edit Department' : 'Add Department'}</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Department Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter department name"
                />
              </div>
              <div className="form-group">
                <label>Department Code</label>
                <input
                  type="text"
                  value={formData.departmentCode}
                  onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                  placeholder="Enter department code"
                />
              </div>
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              {isAdmin && (
                <div className="form-group">
                  <label>Host Company</label>
                  <select
                    value={formData.hostCompanyId}
                    onChange={(e) => setFormData({ ...formData, hostCompanyId: e.target.value })}
                  >
                    <option value="">Select Company</option>
                    {hostCompanies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Location</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc._id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Custom Address</label>
                <input
                  type="text"
                  value={formData.customAddress}
                  onChange={(e) => setFormData({ ...formData, customAddress: e.target.value })}
                  placeholder="Enter custom address"
                />
              </div>
              {editingDepartment && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    {' '}Active
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="save-btn" onClick={handleSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL DETAILS MODAL */}
      {showDetailsModal && selectedDepartment && (
        <div className="modal-overlay" onClick={() => {
          setShowDetailsModal(false);
          setSelectedDepartment(null);
          setShowListView(true);
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header government-header">
              <div>
                <h3>Department Details</h3>
                <p className="modal-subtitle">Complete Department Profile</p>
              </div>
              <button onClick={() => {
                setShowDetailsModal(false);
                setSelectedDepartment(null);
                setShowListView(true);
              }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="department-detail-status">
                <h2>{selectedDepartment.name}</h2>
                <span className={`status-badge ${selectedDepartment.isActive ? 'active' : 'inactive'}`}>
                  {selectedDepartment.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="details-section">
                <h4>📋 Basic Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Department Name:</span>
                  <span className="detail-value">{selectedDepartment.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Department Code:</span>
                  <span className="detail-value">{selectedDepartment.departmentCode || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Company Name:</span>
                  <span className="detail-value">{selectedDepartment.companyName || 'N/A'}</span>
                </div>
              </div>

              <div className="details-section">
                <h4>📍 Location Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedDepartment.location || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Custom Address:</span>
                  <span className="detail-value">{selectedDepartment.locationAddress || 'N/A'}</span>
                </div>
              </div>

              {selectedDepartment.description && (
                <div className="details-section">
                  <h4>📝 Description</h4>
                  <div className="detail-row">
                    <span className="detail-value full-width">{selectedDepartment.description}</span>
                  </div>
                </div>
              )}

              <div className="details-section">
                <h4>📊 Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">{selectedDepartment.internCount || 0}</div>
                    <div className="stat-label">Interns</div>
                  </div>
                </div>
              </div>

              <div className="modal-actions-section">
                {(isAdmin || isHostCompany) && (
                  <button
                    className="edit-btn-full"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedDepartment, null);
                    }}
                  >
                    Edit Department
                  </button>
                )}
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDepartment(null);
                    setShowListView(true);
                  }}
                >
                  Back to List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Departments;

