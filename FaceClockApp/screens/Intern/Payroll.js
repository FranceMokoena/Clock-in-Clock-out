import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function InternPayroll({ navigation, route }) {
  const { theme } = useTheme();
  const userInfo = route?.params?.userInfo || {};
  const [stipendAmount, setStipendAmount] = useState(null);
  const [workingHours, setWorkingHours] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stipendError, setStipendError] = useState('');
  const [workingHoursError, setWorkingHoursError] = useState('');
  const [attendanceError, setAttendanceError] = useState('');
  const [exportingPayslip, setExportingPayslip] = useState(false);
  const dynamicStyles = getDynamicStyles(theme);

  useEffect(() => {
    const loadPayrollData = async () => {
      if (!userInfo?.id) {
        setStipendError('Intern information is missing.');
        setWorkingHoursError('Intern information is missing.');
        setAttendanceError('Intern information is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setStipendError('');
        setWorkingHoursError('');
        setAttendanceError('');

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const [stipendResult, hoursResult, attendanceResult] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/staff/intern/stipend`, {
            params: { internId: userInfo.id },
          }),
          axios.get(`${API_BASE_URL}/staff/intern/working-hours`, {
            params: { internId: userInfo.id, month: currentMonth, year: currentYear },
          }),
          axios.get(`${API_BASE_URL}/staff/intern/attendance/detailed`, {
            params: { internId: userInfo.id, period: 'monthly' },
          }),
        ]);

        if (stipendResult.status === 'fulfilled' && stipendResult.value?.data?.success) {
          setStipendAmount(stipendResult.value.data.stipendAmount ?? null);
        } else {
          setStipendError('Unable to load stipend.');
        }

        if (hoursResult.status === 'fulfilled' && hoursResult.value?.data?.success) {
          setWorkingHours(hoursResult.value.data.workingHours ?? null);
        } else {
          setWorkingHoursError('Unable to load working hours.');
        }

        if (attendanceResult.status === 'fulfilled' && attendanceResult.value?.data?.success) {
          setAttendanceStats(attendanceResult.value.data.stats ?? null);
        } else {
          setAttendanceError('Unable to load attendance data.');
        }
      } catch (error) {
        console.error('Failed to load payroll data:', error);
        setStipendError('Unable to load stipend.');
        setWorkingHoursError('Unable to load working hours.');
        setAttendanceError('Unable to load attendance data.');
      } finally {
        setLoading(false);
      }
    };

    loadPayrollData();
  }, [userInfo?.id]);

  const formatStipendAmount = (amount) => {
    if (amount === null || amount === undefined || amount === '') return 'Not assigned';
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) return String(amount);
    return `R ${numeric.toFixed(2)}`;
  };

  const formatHoursValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Not assigned';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return String(value);
    if (Number.isInteger(numeric)) return `${numeric}`;
    return numeric.toFixed(2);
  };

  const formatHourMinutes = (hoursValue) => {
    if (!Number.isFinite(hoursValue)) return 'Not available';
    const totalMinutes = Math.round(hoursValue * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const formatHoursDelta = (hoursValue) => {
    if (!Number.isFinite(hoursValue)) return 'Not available';
    const sign = hoursValue >= 0 ? '+' : '-';
    return `${sign}${formatHourMinutes(Math.abs(hoursValue))}`;
  };

  const formatCurrency = (amount) => {
    if (!Number.isFinite(amount)) return 'Not available';
    return `R ${amount.toFixed(2)}`;
  };

  const formatWorkingHoursSource = (source) => {
    if (source === 'staff') return 'Assigned by admin or host company';
    if (source === 'hostCompany') return 'Host company defaults';
    if (source === 'registration') return 'Registration defaults';
    return 'Not assigned';
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const actualMinutes = Number.isFinite(attendanceStats?.totalMinutes)
    ? attendanceStats.totalMinutes
    : null;
  const actualHours = actualMinutes !== null ? actualMinutes / 60 : null;
  const expectedMonthlyHours = Number.isFinite(workingHours?.monthlyHours)
    ? workingHours.monthlyHours
    : null;
  const varianceHours = (actualHours !== null && expectedMonthlyHours !== null)
    ? actualHours - expectedMonthlyHours
    : null;
  const completionRate = (actualHours !== null && expectedMonthlyHours && expectedMonthlyHours > 0)
    ? Math.round((actualHours / expectedMonthlyHours) * 100)
    : null;
  const hourlyRate = (stipendAmount !== null && expectedMonthlyHours && expectedMonthlyHours > 0)
    ? stipendAmount / expectedMonthlyHours
    : null;
  const earnings = (hourlyRate !== null && actualHours !== null)
    ? actualHours * hourlyRate
    : null;
  const statementPeriod = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const issuedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const issuedTo = userInfo.fullName || userInfo.name || 'Intern';
  const issuedRole = userInfo.role || 'Intern';
  const issuedDepartment = userInfo.department || 'Not specified';
  const issuedCompany = userInfo.company || userInfo.hostCompanyName || 'Not specified';
  const stipendDisplay = formatStipendAmount(stipendAmount);
  const workingDaysWeekDisplay = workingHours
    ? formatHoursValue(workingHours.workingDaysPerWeek)
    : 'Not assigned';
  const workingDaysMonthDisplay = workingHours
    ? formatHoursValue(workingHours.workingDaysPerMonth)
    : 'Not assigned';
  const hoursPerDayDisplay = workingHours
    ? formatHoursValue(workingHours.hoursPerDay)
    : 'Not assigned';
  const weeklyHoursDisplay = workingHours
    ? formatHoursValue(workingHours.weeklyHours)
    : 'Not assigned';
  const monthlyHoursDisplay = workingHours
    ? formatHoursValue(workingHours.monthlyHours)
    : 'Not assigned';
  const workingHoursSourceDisplay = workingHours
    ? formatWorkingHoursSource(workingHours.source)
    : 'Not assigned';
  const actualHoursDisplay = actualHours !== null ? formatHourMinutes(actualHours) : 'Not available';
  const expectedHoursDisplay = expectedMonthlyHours !== null
    ? formatHourMinutes(expectedMonthlyHours)
    : 'Not available';
  const varianceDisplay = formatHoursDelta(varianceHours);
  const completionDisplay = completionRate !== null ? `${completionRate}%` : 'Not available';
  const daysPresentDisplay = attendanceStats ? `${attendanceStats.daysPresent ?? 0}` : 'Not available';
  const attendanceRateDisplay = attendanceStats ? `${attendanceStats.attendanceRate ?? 0}%` : 'Not available';
  const hourlyRateDisplay = hourlyRate !== null ? formatCurrency(hourlyRate) : 'Not available';
  const earningsDisplay = earnings !== null ? formatCurrency(earnings) : 'Not available';

  const handleExportPayslip = async () => {
    try {
      setExportingPayslip(true);
      const pdfPrimary = theme.primary || '#3166AE';
      const sectionBg = '#e9f0fb';
      const html = `
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
                border: 3px solid ${pdfPrimary};
                background: ${pdfPrimary};
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
              }
              .meta-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 12px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 12px;
              }
              .meta-row:last-child {
                border-bottom: none;
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
                border-left: 4px solid ${pdfPrimary};
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: ${pdfPrimary};
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
              td.value {
                text-align: right;
                font-weight: 700;
              }
              .amount {
                font-size: 16px;
                font-weight: 800;
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
                <div class="subtitle">Statement Period: ${escapeHtml(statementPeriod)}</div>
              </div>
              <div class="seal">
                OFFICIAL
                <span>PAYSLIP</span>
              </div>
            </div>

            <div class="meta">
              <div class="meta-row">
                <div class="label">Issued To</div>
                <div class="value">${escapeHtml(issuedTo)}</div>
              </div>
              <div class="meta-row">
                <div class="label">Role</div>
                <div class="value">${escapeHtml(issuedRole)}</div>
              </div>
              <div class="meta-row">
                <div class="label">Department</div>
                <div class="value">${escapeHtml(issuedDepartment)}</div>
              </div>
              <div class="meta-row">
                <div class="label">Company</div>
                <div class="value">${escapeHtml(issuedCompany)}</div>
              </div>
              <div class="meta-row">
                <div class="label">Issued On</div>
                <div class="value">${escapeHtml(issuedDate)}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Compensation Summary</div>
              <table>
                <tr>
                  <td>Monthly Stipend (Full Month)</td>
                  <td class="value amount">${escapeHtml(stipendDisplay)}</td>
                </tr>
              </table>
              <div class="note">Monthly stipend reflects full attendance for the statement period.</div>
            </div>

            <div class="section">
              <div class="section-title">Assigned Working Hours</div>
              <table>
                <tr>
                  <td>Working Days per Week</td>
                  <td class="value">${escapeHtml(workingDaysWeekDisplay)}</td>
                </tr>
                <tr>
                  <td>Working Days per Month</td>
                  <td class="value">${escapeHtml(workingDaysMonthDisplay)}</td>
                </tr>
                <tr>
                  <td>Hours per Day</td>
                  <td class="value">${escapeHtml(hoursPerDayDisplay)}</td>
                </tr>
                <tr>
                  <td>Weekly Hours</td>
                  <td class="value">${escapeHtml(weeklyHoursDisplay)}</td>
                </tr>
                <tr>
                  <td>Monthly Hours</td>
                  <td class="value">${escapeHtml(monthlyHoursDisplay)}</td>
                </tr>
                <tr>
                  <td>Source</td>
                  <td class="value">${escapeHtml(workingHoursSourceDisplay)}</td>
                </tr>
              </table>
              <div class="note">Assigned hours are expectations only. Earnings use actual attendance.</div>
            </div>

            <div class="section">
              <div class="section-title">Attendance Summary (This Month)</div>
              <table>
                <tr>
                  <td>Actual Hours Worked</td>
                  <td class="value">${escapeHtml(actualHoursDisplay)}</td>
                </tr>
                <tr>
                  <td>Expected Monthly Hours</td>
                  <td class="value">${escapeHtml(expectedHoursDisplay)}</td>
                </tr>
                <tr>
                  <td>Hours Variance (Actual - Expected)</td>
                  <td class="value">${escapeHtml(varianceDisplay)}</td>
                </tr>
                <tr>
                  <td>Completion vs Expected</td>
                  <td class="value">${escapeHtml(completionDisplay)}</td>
                </tr>
                <tr>
                  <td>Days Present</td>
                  <td class="value">${escapeHtml(daysPresentDisplay)}</td>
                </tr>
                <tr>
                  <td>Attendance Rate</td>
                  <td class="value">${escapeHtml(attendanceRateDisplay)}</td>
                </tr>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Earnings (Attendance Based)</div>
              <table>
                <tr>
                  <td>Hourly Rate</td>
                  <td class="value">${escapeHtml(hourlyRateDisplay)}</td>
                </tr>
                <tr>
                  <td>Earned This Month</td>
                  <td class="value amount">${escapeHtml(earningsDisplay)}</td>
                </tr>
              </table>
              <div class="note">Earnings are calculated from actual hours worked only.</div>
            </div>

            <div class="footer">
              System generated statement. For discrepancies, contact your host company or admin.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Payroll Statement',
        });
      } else {
        Alert.alert('Exported', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Failed to export payslip:', error);
      Alert.alert('Error', 'Failed to export payslip.');
    } finally {
      setExportingPayslip(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, dynamicStyles.backButton]}
        >
          <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Payroll</Text>
        <TouchableOpacity
          onPress={handleExportPayslip}
          style={[
            styles.exportButton,
            dynamicStyles.exportButton,
            (loading || exportingPayslip) && styles.exportButtonDisabled,
          ]}
          disabled={loading || exportingPayslip}
        >
          {exportingPayslip ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.exportButtonText}>PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statementCard, dynamicStyles.card, dynamicStyles.statementCard]}>
          <View style={[styles.statementHeader, dynamicStyles.statementHeader]}>
            <View style={styles.statementHeaderLeft}>
              <Text style={[styles.statementOrg, dynamicStyles.statementOrg]}>INTERNSHIP SUCCESS</Text>
              <Text style={[styles.statementTitle, dynamicStyles.statementTitle]}>PAYROLL STATEMENT</Text>
              <Text style={[styles.statementSubtitle, dynamicStyles.statementSubtitle]}>
                Statement Period: {statementPeriod}
              </Text>
            </View>
            <View style={styles.statementSeal}>
              <Text style={[styles.statementSealText, dynamicStyles.statementSealText]}>OFFICIAL</Text>
              <Text style={[styles.statementSealSubText, dynamicStyles.statementSealSubText]}>Payslip</Text>
            </View>
          </View>

          <View style={[styles.metaSection, dynamicStyles.metaSection]}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, dynamicStyles.metaLabel]}>Issued To</Text>
              <Text style={[styles.metaValue, dynamicStyles.metaValue]}>{issuedTo}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, dynamicStyles.metaLabel]}>Role</Text>
              <Text style={[styles.metaValue, dynamicStyles.metaValue]}>{issuedRole}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, dynamicStyles.metaLabel]}>Department</Text>
              <Text style={[styles.metaValue, dynamicStyles.metaValue]}>{issuedDepartment}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, dynamicStyles.metaLabel]}>Company</Text>
              <Text style={[styles.metaValue, dynamicStyles.metaValue]}>{issuedCompany}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, dynamicStyles.metaLabel]}>Issued On</Text>
              <Text style={[styles.metaValue, dynamicStyles.metaValue]}>{issuedDate}</Text>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={[styles.sectionHeader, dynamicStyles.sectionHeader]}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Compensation Summary</Text>
            </View>
            <View style={styles.sectionBody}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary || '#3166AE'} />
                  <Text style={[styles.loadingTextInline, dynamicStyles.textSecondary]}>
                    Loading stipend data...
                  </Text>
                </View>
              ) : (
                <View style={[styles.dataRow, styles.dataRowLast, dynamicStyles.dataRow]}>
                  <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Monthly Stipend (Full Month)</Text>
                  <Text style={[styles.dataValue, styles.amountValue, dynamicStyles.dataValue]}>
                    {formatStipendAmount(stipendAmount)}
                  </Text>
                </View>
              )}
              {stipendError ? (
                <Text style={[styles.noteText, styles.noteError]}>{stipendError}</Text>
              ) : (
                <Text style={[styles.noteText, dynamicStyles.noteText]}>
                  Monthly stipend reflects full attendance for the statement period.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={[styles.sectionHeader, dynamicStyles.sectionHeader]}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Assigned Working Hours</Text>
            </View>
            <View style={styles.sectionBody}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary || '#3166AE'} />
                  <Text style={[styles.loadingTextInline, dynamicStyles.textSecondary]}>
                    Loading working hours...
                  </Text>
                </View>
              ) : workingHours ? (
                <>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Working Days per Week</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {formatHoursValue(workingHours.workingDaysPerWeek)}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Working Days per Month</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {formatHoursValue(workingHours.workingDaysPerMonth)}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Hours per Day</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {formatHoursValue(workingHours.hoursPerDay)}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Weekly Hours</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {formatHoursValue(workingHours.weeklyHours)}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Monthly Hours</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {formatHoursValue(workingHours.monthlyHours)}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, styles.dataRowLast, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Source</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {formatWorkingHoursSource(workingHours.source)}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.noteText, dynamicStyles.noteText]}>Working hours not assigned.</Text>
              )}
              {workingHoursError ? (
                <Text style={[styles.noteText, styles.noteError]}>{workingHoursError}</Text>
              ) : (
                <Text style={[styles.noteText, dynamicStyles.noteText]}>
                  Assigned hours are expectations only. Earnings use actual attendance.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={[styles.sectionHeader, dynamicStyles.sectionHeader]}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Attendance Summary (This Month)</Text>
            </View>
            <View style={styles.sectionBody}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary || '#3166AE'} />
                  <Text style={[styles.loadingTextInline, dynamicStyles.textSecondary]}>
                    Loading attendance data...
                  </Text>
                </View>
              ) : attendanceStats ? (
                <>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Actual Hours Worked</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {actualHours !== null ? formatHourMinutes(actualHours) : 'Not available'}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Expected Monthly Hours</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {expectedMonthlyHours !== null ? formatHourMinutes(expectedMonthlyHours) : 'Not available'}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Hours Variance (Actual - Expected)</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {formatHoursDelta(varianceHours)}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Completion vs Expected</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {completionRate !== null ? `${completionRate}%` : 'Not available'}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Days Present</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {attendanceStats.daysPresent ?? 0}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, styles.dataRowLast, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Attendance Rate</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {attendanceStats.attendanceRate ?? 0}%
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.noteText, dynamicStyles.noteText]}>Attendance data not available.</Text>
              )}
              {attendanceError ? (
                <Text style={[styles.noteText, styles.noteError]}>{attendanceError}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={[styles.sectionHeader, dynamicStyles.sectionHeader]}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Earnings (Attendance Based)</Text>
            </View>
            <View style={styles.sectionBody}>
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary || '#3166AE'} />
                  <Text style={[styles.loadingTextInline, dynamicStyles.textSecondary]}>
                    Calculating earnings...
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.dataRow, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Hourly Rate</Text>
                    <Text style={[styles.dataValue, dynamicStyles.dataValue]}>
                      {hourlyRate !== null ? formatCurrency(hourlyRate) : 'Not available'}
                    </Text>
                  </View>
                  <View style={[styles.dataRow, styles.dataRowLast, dynamicStyles.dataRow]}>
                    <Text style={[styles.dataLabel, dynamicStyles.dataLabel]}>Earned This Month</Text>
                    <Text style={[styles.dataValue, styles.amountValue, dynamicStyles.dataValue]}>
                      {earnings !== null ? formatCurrency(earnings) : 'Not available'}
                    </Text>
                  </View>
                </>
              )}
              <Text style={[styles.noteText, dynamicStyles.noteText]}>
                Earnings are calculated from actual hours worked only.
              </Text>
            </View>
          </View>

          <View style={styles.statementFooter}>
            <Text style={[styles.footerText, dynamicStyles.footerText]}>
              System generated statement. For discrepancies, contact your host company or admin.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getDynamicStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.background,
  },
  header: {
    borderBottomColor: theme.border || '#e5e7eb',
  },
  backButton: {
    backgroundColor: theme.buttonSecondary || '#f3f4f6',
  },
  backButtonText: {
    color: theme.primary || '#3166AE',
  },
  headerTitle: {
    color: theme.text,
  },
  exportButton: {
    backgroundColor: theme.primary || '#3166AE',
    borderColor: theme.primary || '#3166AE',
  },
  statementCard: {
    borderTopColor: theme.primary || '#3166AE',
  },
  statementHeader: {
    backgroundColor: theme.primary || '#3166AE',
  },
  statementOrg: {
    color: '#fff',
  },
  statementTitle: {
    color: '#fff',
  },
  statementSubtitle: {
    color: '#e5edff',
  },
  statementSealText: {
    color: '#fff',
  },
  statementSealSubText: {
    color: '#e5edff',
  },
  metaSection: {
    backgroundColor: theme.surface || '#f8fafc',
    borderBottomColor: theme.border || '#e5e7eb',
  },
  metaLabel: {
    color: theme.textSecondary || '#6b7280',
  },
  metaValue: {
    color: theme.text,
  },
  sectionHeader: {
    backgroundColor: theme.primary ? `${theme.primary}14` : '#e9f0fb',
    borderLeftColor: theme.primary || '#3166AE',
    borderBottomColor: theme.border || '#e5e7eb',
  },
  sectionTitle: {
    color: theme.primary || '#3166AE',
  },
  dataRow: {
    borderBottomColor: theme.border || '#e5e7eb',
  },
  dataLabel: {
    color: theme.textSecondary || '#6b7280',
  },
  dataValue: {
    color: theme.text,
  },
  noteText: {
    color: theme.textSecondary || '#6b7280',
  },
  footerText: {
    color: theme.textSecondary || '#6b7280',
  },
  card: {
    backgroundColor: theme.card || '#ffffff',
    borderColor: theme.border || '#e5e7eb',
  },
  text: {
    color: theme.text,
  },
  textSecondary: {
    color: theme.textSecondary || '#6b7280',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#fff',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statementCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderTopWidth: 4,
    overflow: 'hidden',
  },
  statementHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statementHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  statementOrg: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statementTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statementSubtitle: {
    fontSize: 12,
    marginTop: 6,
  },
  statementSeal: {
    width: 74,
    height: 74,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  statementSealText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statementSealSubText: {
    fontSize: 9,
    marginTop: 2,
  },
  metaSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionBlock: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dataRowLast: {
    borderBottomWidth: 0,
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    paddingRight: 8,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingTextInline: {
    fontSize: 12,
  },
  noteText: {
    marginTop: 10,
    fontSize: 11,
    fontStyle: 'italic',
  },
  noteError: {
    color: '#b91c1c',
    fontStyle: 'normal',
  },
  statementFooter: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  footerText: {
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  contentCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    color: '#6b7280',
  },
  stipendValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoGroup: {
    marginTop: 8,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
});

