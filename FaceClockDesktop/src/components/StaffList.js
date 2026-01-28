import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffAPI, departmentAPI } from '../services/api';
import './StaffList.css';

const getInitials = (member) => {
  const name = `${member?.name || ''} ${member?.surname || ''}`.trim();
  if (!name) return 'NA';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0] || 'N';
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'Not set';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `R ${numeric.toFixed(2)}`;
};

function StaffList({ hostCompanyId, isHostCompany }) {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadStaff();
    loadDepartments();
  }, [selectedMonth, selectedYear, hostCompanyId]);

  useEffect(() => {
    applyFilters();
  }, [staff, searchTerm, roleFilter, departmentFilter]);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        year: selectedYear,
        fullData: 'true',
        ...(isHostCompany && hostCompanyId && { hostCompanyId }),
      };
      const response = await staffAPI.getAll(params);
      if (response.success) {
        setStaff(response.staff || []);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const params = isHostCompany && hostCompanyId ? { hostCompanyId } : {};
      const response = await departmentAPI.getAll(params);
      if (response.success) {
        setDepartments(response.departments || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...staff];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        (member.name && member.name.toLowerCase().includes(term)) ||
        (member.surname && member.surname.toLowerCase().includes(term)) ||
        (member.idNumber && member.idNumber.includes(term)) ||
        (member.phoneNumber && member.phoneNumber.includes(term))
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(member => (
        member.department === departmentFilter ||
        (typeof member.department === 'object' && member.department?.name === departmentFilter)
      ));
    }

    setFilteredStaff(filtered);
  };

  const goToDetails = (member) => {
    if (!member || !member._id) return;
    navigate(`/staff/${member._id}`, {
      state: {
        staff: member,
        month: selectedMonth,
        year: selectedYear,
      }
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-large"></div>
        <p>Loading staff data...</p>
      </div>
    );
  }

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Staff & Interns</h2>
        <div className="filters-row">
          <div className="month-year-selector">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="staff-filters">
        <input
          type="text"
          placeholder="Search by name, ID, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="filter-select">
          <option value="all">All Roles</option>
          <option value="Intern">Intern</option>
          <option value="Staff">Staff</option>
          <option value="Other">Other</option>
        </select>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="filter-select">
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {filteredStaff.length > 0 ? (
        <div className="staff-table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Company</th>
                <th>Status</th>

                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr key={member._id}>
                  <td>
                    <div className="profile-avatar-cell">
                      {member.profilePicture ? (
                        <img src={member.profilePicture} alt={`${member.name || 'User'} avatar`} />
                      ) : (
                        <span>{getInitials(member)}</span>
                      )}
                    </div>
                  </td>
                  <td>{member.name} {member.surname}</td>
                  <td>
                    <span className={`role-badge role-${member.role?.toLowerCase()}`}>
                      {member.role || 'N/A'}
                    </span>
                  </td>
                  <td>{member.department || 'N/A'}</td>
                  <td>{member.hostCompanyName || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>


                  <td>
                    <button className="view-details-btn" onClick={() => goToDetails(member)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {staff.length === 0
              ? 'No staff members found for the selected period.'
              : 'No staff members match the current filters.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default StaffList;
