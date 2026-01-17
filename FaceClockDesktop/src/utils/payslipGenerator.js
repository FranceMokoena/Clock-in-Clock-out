export const generatePayslipHTML = ({
  issuedTo = 'Staff',
  role = 'Staff',
  department = 'Not specified',
  company = 'Not specified',
  stipend = null,
  workingHours = null,
  attendanceSummary = null,
  actualHours = 0,
  expectedMonthlyHours = 0,
  hourlyRate = null,
  earnings = null,
}) => {
  const primaryColor = '#3166AE';
  const sectionBg = '#e9f0fb';
  const sanitize = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
    return `R ${Number(value).toFixed(2)}`;
  };

  const formatHours = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
    return `${Number(value).toFixed(2)} hrs`;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: "Times New Roman", "Segoe UI", serif;
            color: #111827;
            margin: 0;
            padding: 32px;
            background: #ffffff;
          }
          .header {
            border: 3px solid ${primaryColor};
            background: ${primaryColor};
            color: #ffffff;
            padding: 18px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .org {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-top: 6px;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 12px;
            margin-top: 6px;
            color: #e5edff;
          }
          .seal {
            width: 76px;
            height: 76px;
            border-radius: 40px;
            border: 2px solid #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .seal span {
            font-size: 9px;
            letter-spacing: 0.5px;
            margin-top: 2px;
            color: #e5edff;
          }
          .meta {
            border: 1px solid #e5e7eb;
            border-top: none;
            margin-top: 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 14px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
          }
          .label {
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #6b7280;
          }
          .value {
            font-weight: 600;
            text-align: right;
          }
          .section {
            border: 1px solid #e5e7eb;
            margin-top: 16px;
          }
          .section-title {
            background: ${sectionBg};
            border-left: 4px solid ${primaryColor};
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: ${primaryColor};
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .note {
            font-size: 11px;
            color: #6b7280;
            padding: 8px 12px 12px;
            font-style: italic;
          }
          .footer {
            margin-top: 18px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="org">INTERNSHIP SUCCESS</div>
            <div class="title">Payroll Statement</div>
            <div class="subtitle">Official Document</div>
          </div>
          <div class="seal">
            OFFICIAL
            <span>PAYSLIP</span>
          </div>
        </div>

        <div class="meta">
          <div class="meta-row">
            <div class="label">Issued To</div>
            <div class="value">${sanitize(issuedTo)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Role</div>
            <div class="value">${sanitize(role)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Department</div>
            <div class="value">${sanitize(department)}</div>
          </div>
          <div class="meta-row">
            <div class="label">Company</div>
            <div class="value">${sanitize(company)}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Compensation Summary</div>
          <table>
            <tr>
              <td>Monthly Stipend (Full Month)</td>
              <td class="value">${formatCurrency(stipend)}</td>
            </tr>
          </table>
          <div class="note">Monthly stipend is the fully attended expectation.</div>
        </div>

        <div class="section">
          <div class="section-title">Assigned Working Hours</div>
          <table>
            <tr>
              <td>Working Days / Week</td>
              <td class="value">${formatHourValue(workingHours?.expectedWorkingDaysPerWeek)}</td>
            </tr>
            <tr>
              <td>Working Days / Month</td>
              <td class="value">${formatHourValue(workingHours?.expectedWorkingDaysPerMonth)}</td>
            </tr>
            <tr>
              <td>Hours / Day</td>
              <td class="value">${formatHourValue(workingHours?.expectedHoursPerDay)}</td>
            </tr>
            <tr>
              <td>Weekly Hours</td>
              <td class="value">${formatHourValue(workingHours?.expectedWeeklyHours)}</td>
            </tr>
            <tr>
              <td>Monthly Hours</td>
              <td class="value">${formatHourValue(workingHours?.expectedMonthlyHours)}</td>
            </tr>
          </table>
          <div class="note">Assigned hours represent expectations only.</div>
        </div>

        <div class="section">
          <div class="section-title">Attendance-Based Earnings</div>
          <table>
            <tr>
              <td>Actual Hours Worked</td>
              <td class="value">${formatHours(actualHours)}</td>
            </tr>
            <tr>
              <td>Expected Monthly Hours</td>
              <td class="value">${formatHours(expectedMonthlyHours)}</td>
            </tr>
            <tr>
              <td>Hourly Rate</td>
              <td class="value">${hourlyRate !== null ? formatCurrency(hourlyRate) : 'N/A'}</td>
            </tr>
            <tr>
              <td>Earnings</td>
              <td class="value">${earnings !== null ? formatCurrency(earnings) : 'N/A'}</td>
            </tr>
          </table>
          <div class="note">Earnings are calculated strictly from actual attendance.</div>
        </div>

        <div class="footer">
          System generated payslip. Contact your administrator for discrepancies.
        </div>
      </body>
    </html>
  `;
};
