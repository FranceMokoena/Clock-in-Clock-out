import React from 'react';
import { MdFilterList } from 'react-icons/md';
import './ReportFilters.css';

function ReportFilters({
  timeframe,
  onTimeframeChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  interns,
  selectedIntern,
  onInternChange,
  companies,
  selectedCompany,
  onCompanyChange,
  departments,
  selectedDepartment,
  onDepartmentChange,
  showTimeframe = true,
  showMonth = true,
  showYear = true,
  showIntern = true,
  showCompany = true,
  showDepartment = false
}) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="report-filters-container">
      <div className="filters-header">
        <MdFilterList className="filter-icon" />
        <h3>Filters</h3>
      </div>

      <div className="filters-grid">
        {showTimeframe && (
          <div className="filter-group">
            <label htmlFor="timeframe">Timeframe</label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="filter-select"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        {showMonth && (
          <div className="filter-group">
            <label htmlFor="month">Month</label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(parseInt(e.target.value))}
              className="filter-select"
            >
              {months.map((month, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        )}

        {showYear && (
          <div className="filter-group">
            <label htmlFor="year">Year</label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="filter-select"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {showIntern && interns?.length > 0 && (
          <div className="filter-group">
            <label htmlFor="intern">Intern</label>
            <select
              id="intern"
              value={selectedIntern || ''}
              onChange={(e) => onInternChange(e.target.value || null)}
              className="filter-select"
            >
              <option value="">All Interns</option>
              {interns.map((intern) => (
                <option key={intern._id} value={intern._id}>
                  {intern.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showCompany && companies?.length > 0 && (
          <div className="filter-group">
            <label htmlFor="company">Host Company</label>
            <select
              id="company"
              value={selectedCompany || ''}
              onChange={(e) => onCompanyChange(e.target.value || null)}
              className="filter-select"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.name || company._id} value={company.name || company._id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showDepartment && departments?.length > 0 && (
          <div className="filter-group">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              value={selectedDepartment || ''}
              onChange={(e) => onDepartmentChange(e.target.value || null)}
              className="filter-select"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportFilters;
