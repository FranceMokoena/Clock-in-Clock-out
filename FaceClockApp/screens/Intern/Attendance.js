import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function InternAttendance({ navigation, route }) {
  const { theme } = useTheme();
  const dynamicStyles = getDynamicStyles(theme);
  const userInfo = route?.params?.userInfo || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(route?.params?.selectedPeriod || 'monthly');
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [selectedPeriod, userInfo.id]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/staff/intern/attendance/detailed`, {
        params: {
          internId: userInfo.id,
          period: selectedPeriod,
        },
      });

      if (response.data?.success) {
        setAttendanceData(response.data.attendance || []);
        setStats(response.data.stats || {});
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      Alert.alert('Error', 'Failed to load attendance data. Please try again.');
      setAttendanceData([]);
      setStats({
        totalHours: 0,
        totalMinutes: 0,
        daysPresent: 0,
        daysAbsent: 0,
        missingClockIns: 0,
        missingClockOuts: 0,
        submittedCorrections: 0,
        attendanceRate: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceData();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return 'Monthly';
    }
  };

  const exportTimesheet = () => {
    setShowExportModal(true);
  };

  const handleExport = async (format) => {
    setShowExportModal(false);
    if (format === 'pdf') {
      await generatePDF();
    } else {
      await generateCSV();
    }
  };

  const generatePDF = async () => {
    try {
      setExportingPDF(true);
      const periodLabel = getPeriodLabel();
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                padding: 30px;
                color: #1f2937;
                font-size: 12px;
                position: relative;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3166AE;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #3166AE;
                margin: 0;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: 1px;
              }
              .header p.subtitle {
                margin: 4px 0 0 0;
                font-size: 11px;
                color: #4b5563;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .header p.system {
                margin: 4px 0 0 0;
                font-size: 11px;
                color: #6b7280;
                letter-spacing: 0.5px;
              }
              .header h2 {
                color: #111827;
                margin: 10px 0 0 0;
                font-size: 18px;
                font-weight: 700;
              }
              .header h3 {
                color: #6b7280;
                margin: 4px 0 0 0;
                font-size: 14px;
                font-weight: 400;
              }
              .info-section {
                margin-bottom: 20px;
                background: #f9fafb;
                padding: 15px;
                border-radius: 8px;
              }
              .info-section p {
                margin: 6px 0;
                font-size: 12px;
              }
              .info-section strong {
                color: #374151;
              }
              .summary-section {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                margin-bottom: 25px;
              }
              .summary-card {
                flex: 1;
                min-width: 120px;
                background: #f0f9ff;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                border-left: 4px solid #3166AE;
              }
              .summary-card .value {
                font-size: 24px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 4px;
              }
              .summary-card .label {
                font-size: 11px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 11px;
              }
              th {
                background-color: #3166AE;
                color: white;
                font-weight: 700;
                padding: 12px 8px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                border: 1px solid #e5e7eb;
                padding: 10px 8px;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .status-complete {
                color: #059669;
                font-weight: 600;
              }
              .status-incomplete {
                color: #dc2626;
                font-weight: 600;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                font-size: 10px;
                color: #9ca3af;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>INTERNSHIP SUCCESS</h1>
              <p class="subtitle">Professional Recruitment, Placement, Management</p>
              <p class="system">Clock-In / Clock-Out System</p>
              <h2>Attendance Timesheet</h2>
              <h3>${periodLabel} Report</h3>
            </div>
            
            <div class="info-section">
              <p><strong>Name:</strong> ${userInfo.fullName || userInfo.name || 'N/A'}</p>
              <p><strong>Department:</strong> ${userInfo.department || 'N/A'}</p>
              <p><strong>Company:</strong> ${userInfo.hostCompanyName || userInfo.company || 'N/A'}</p>
              <p><strong>Period:</strong> ${periodLabel}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}</p>
            </div>
            
            <div class="summary-section">
              <div class="summary-card">
                <div class="value">${stats?.totalHoursFormatted || '0h 0m'}</div>
                <div class="label">Total Hours</div>
              </div>
              <div class="summary-card">
                <div class="value">${stats?.daysPresent || 0}</div>
                <div class="label">Days Present</div>
              </div>
              <div class="summary-card">
                <div class="value">${stats?.daysAbsent || 0}</div>
                <div class="label">Days Absent</div>
              </div>
              <div class="summary-card">
                <div class="value">${stats?.attendanceRate || 0}%</div>
                <div class="label">Attendance Rate</div>
              </div>
            </div>
            
            ${attendanceData.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendanceData.map(record => `
                    <tr>
                      <td>${formatDateOnly(record.date)}</td>
                      <td>${record.clockIn ? formatTime(record.clockIn) : '-'}</td>
                      <td>${record.clockOut ? formatTime(record.clockOut) : '-'}</td>
                      <td>${record.hoursWorkedFormatted || '0h 0m'}</td>
                      <td class="${record.hasClockIn && record.hasClockOut ? 'status-complete' : 'status-incomplete'}">
                        ${record.hasClockIn && record.hasClockOut ? 'Complete' : 'Incomplete'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="text-align: center; padding: 30px; color: #9ca3af;">No timesheet data available for this period</p>'}
            
            <div class="footer">
              <p>Generated by Internship Success Clock-In/Clock-Out System</p>
              <p>© ${new Date().getFullYear()} Internship Success. All rights reserved.</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Timesheet - ${userInfo.fullName || userInfo.name}`,
        });
      } else {
        Alert.alert('Success', `Timesheet saved to: ${uri}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF.');
    } finally {
      setExportingPDF(false);
    }
  };

  const generateCSV = async () => {
    try {
      setExportingPDF(true);
      
      // CSV Header
      let csv = 'Date,Day,Clock In,Clock Out,Hours Worked,Status\n';
      
      attendanceData.forEach(record => {
        const date = formatDateOnly(record.date);
        const day = new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' });
        const clockIn = record.clockIn ? formatTime(record.clockIn) : 'Missing';
        const clockOut = record.clockOut ? formatTime(record.clockOut) : 'Missing';
        const hours = record.hoursWorkedFormatted || '0h 0m';
        const status = record.hasClockIn && record.hasClockOut ? 'Complete' : 'Incomplete';
        
        csv += `"${date}","${day}","${clockIn}","${clockOut}","${hours}","${status}"\n`;
      });

      // Add summary
      csv += '\n\nSUMMARY\n';
      csv += `Total Hours,${stats?.totalHoursFormatted || '0h 0m'}\n`;
      csv += `Days Present,${stats?.daysPresent || 0}\n`;
      csv += `Days Absent,${stats?.daysAbsent || 0}\n`;
      csv += `Attendance Rate,${stats?.attendanceRate || 0}%\n`;
      csv += `Missing Clock-Ins,${stats?.missingClockIns || 0}\n`;
      csv += `Missing Clock-Outs,${stats?.missingClockOuts || 0}\n`;

      const fileName = `timesheet_${selectedPeriod}_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Timesheet CSV - ${userInfo.fullName || userInfo.name}`,
        });
      } else {
        Alert.alert('Success', `CSV saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error('CSV generation error:', error);
      Alert.alert('Error', 'Failed to generate CSV.');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, dynamicStyles.backButton]}
        >
          <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>My Attendance</Text>
        <TouchableOpacity 
          onPress={exportTimesheet} 
          style={[styles.exportButton, { backgroundColor: theme.primary || '#3166AE' }]}
          disabled={exportingPDF}
        >
          {exportingPDF ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.exportButtonText}>Export</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'today' && [styles.periodButtonActive, dynamicStyles.primary],
          ]}
          onPress={() => setSelectedPeriod('today')}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'today' && styles.periodButtonTextActive,
            ]}
          >
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'weekly' && [styles.periodButtonActive, dynamicStyles.primary],
          ]}
          onPress={() => setSelectedPeriod('weekly')}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'weekly' && styles.periodButtonTextActive,
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            selectedPeriod === 'monthly' && [styles.periodButtonActive, dynamicStyles.primary],
          ]}
          onPress={() => setSelectedPeriod('monthly')}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === 'monthly' && styles.periodButtonTextActive,
            ]}
          >
            Month
          </Text>
            </TouchableOpacity>
          </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary || '#3166AE'} />
            <Text style={[styles.loadingText, dynamicStyles.textSecondary]}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Statistics Cards */}
            {stats && (
              <View style={styles.statsContainer}>
                <View style={[styles.statCard, dynamicStyles.card]}>
                  <Text style={styles.statIcon}>⏰</Text>
                  <Text style={[styles.statValue, dynamicStyles.text]}>
                    {stats.totalHoursFormatted || '0h 0m'}
                  </Text>
                  <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Total Hours</Text>
                </View>
                <View style={[styles.statCard, dynamicStyles.card]}>
                  <Text style={styles.statIcon}>✅</Text>
                  <Text style={[styles.statValue, dynamicStyles.text]}>
                    {stats.daysPresent || 0}
                  </Text>
                  <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Days Present</Text>
                </View>
                <View style={[styles.statCard, dynamicStyles.card]}>
                  <Text style={styles.statIcon}>❌</Text>
                  <Text style={[styles.statValue, dynamicStyles.text]}>
                    {stats.daysAbsent || 0}
                  </Text>
                  <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Days Absent</Text>
                </View>
                <View style={[styles.statCard, dynamicStyles.card]}>
                  <Text style={styles.statIcon}>📊</Text>
                  <Text style={[styles.statValue, dynamicStyles.text]}>
                    {stats.attendanceRate || 0}%
                  </Text>
                  <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Attendance Rate</Text>
                </View>
              </View>
            )}

            {/* Detailed Statistics */}
            {stats && (
              <View style={[styles.detailedStatsCard, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.text]}>Detailed Statistics</Text>
                <View style={styles.detailedStatsRow}>
                  <Text style={[styles.detailedStatLabel, dynamicStyles.textSecondary]}>
                    Missing Clock-Ins:
                  </Text>
                  <Text style={[styles.detailedStatValue, dynamicStyles.text]}>
                    {stats.missingClockIns || 0}
                  </Text>
                </View>
                <View style={styles.detailedStatsRow}>
                  <Text style={[styles.detailedStatLabel, dynamicStyles.textSecondary]}>
                    Missing Clock-Outs:
                  </Text>
                  <Text style={[styles.detailedStatValue, dynamicStyles.text]}>
                    {stats.missingClockOuts || 0}
                  </Text>
            </View>
                <View style={styles.detailedStatsRow}>
                  <Text style={[styles.detailedStatLabel, dynamicStyles.textSecondary]}>
                    Submitted Corrections:
                  </Text>
                  <Text style={[styles.detailedStatValue, dynamicStyles.text]}>
                    {stats.submittedCorrections || 0}
              </Text>
            </View>
                <View style={styles.detailedStatsRow}>
                  <Text style={[styles.detailedStatLabel, dynamicStyles.textSecondary]}>
                    Expected Days:
                  </Text>
                  <Text style={[styles.detailedStatValue, dynamicStyles.text]}>
                    {stats.expectedDays || 0}
              </Text>
            </View>
          </View>
            )}

            {/* Timesheet Table Header */}
            <View style={[styles.timesheetCard, dynamicStyles.card]}>
              <Text style={[styles.sectionTitle, dynamicStyles.text]}>
                Timesheet Records ({attendanceData.length})
              </Text>
              
              {/* Table Header */}
              <View style={[styles.timesheetHeader, { borderBottomColor: theme.primary || '#3166AE' }]}>
                <Text style={[styles.timesheetHeaderText, { flex: 1.2 }]}>Date</Text>
                <Text style={[styles.timesheetHeaderText, { flex: 1 }]}>In</Text>
                <Text style={[styles.timesheetHeaderText, { flex: 1 }]}>Out</Text>
                <Text style={[styles.timesheetHeaderText, { flex: 0.8, textAlign: 'right' }]}>Hours</Text>
          </View>

          {attendanceData.length === 0 ? (
                <Text style={[styles.emptyText, dynamicStyles.textSecondary]}>
                  No attendance records found for this period.
                </Text>
              ) : (
                attendanceData.map((record, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.timesheetRow, 
                      { borderBottomColor: theme.border || '#f3f4f6' },
                      !record.hasClockIn || !record.hasClockOut ? styles.incompleteRow : null
                    ]}
                  >
                    <View style={{ flex: 1.2 }}>
                      <Text style={[styles.timesheetDate, dynamicStyles.text]}>
                        {new Date(record.date).toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric' 
                        })}
                  </Text>
                      <Text style={[styles.timesheetDay, dynamicStyles.textSecondary]}>
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                </View>
                    <Text 
                      style={[
                        styles.timesheetCell, 
                        { flex: 1 },
                        !record.clockIn && styles.missingValue
                      ]}
                    >
                      {formatTime(record.clockIn)}
                    </Text>
                    <Text 
                      style={[
                        styles.timesheetCell, 
                        { flex: 1 },
                        !record.clockOut && styles.missingValue
                      ]}
                    >
                      {formatTime(record.clockOut)}
                    </Text>
                    <Text 
                      style={[
                        styles.timesheetCell, 
                        styles.hoursCell,
                        { flex: 0.8, color: theme.primary || '#3166AE' }
                      ]}
                    >
                      {record.hoursWorkedFormatted || '0h 0m'}
                    </Text>
              </View>
            ))
          )}
        </View>
          </>
        )}
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowExportModal(false)}
        >
          <View style={[styles.modalContent, dynamicStyles.card]}>
            <Text style={[styles.modalTitle, dynamicStyles.text]}>Export Timesheet</Text>
            <Text style={[styles.modalSubtitle, dynamicStyles.textSecondary]}>
              Choose your preferred format
            </Text>
            
            <TouchableOpacity 
              style={[styles.exportOption, { backgroundColor: theme.primary || '#3166AE' }]}
              onPress={() => handleExport('pdf')}
            >
              <Text style={styles.exportOptionIcon}>📄</Text>
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>PDF Document</Text>
                <Text style={styles.exportOptionDesc}>Professional formatted report</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportOption, { backgroundColor: '#059669' }]}
              onPress={() => handleExport('csv')}
            >
              <Text style={styles.exportOptionIcon}>📊</Text>
              <View style={styles.exportOptionContent}>
                <Text style={styles.exportOptionTitle}>CSV Spreadsheet</Text>
                <Text style={styles.exportOptionDesc}>For Excel or Google Sheets</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={[styles.cancelButtonText, dynamicStyles.textSecondary]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getDynamicStyles = (theme) =>
  StyleSheet.create({
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
    primary: {
      backgroundColor: theme.primary || '#3166AE',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodButtonActive: {
    backgroundColor: '#3166AE',
    borderColor: '#3166AE',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  detailedStatsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    color: '#111827',
  },
  detailedStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailedStatLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailedStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  timesheetCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timesheetHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 2,
    marginBottom: 4,
  },
  timesheetHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  timesheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  incompleteRow: {
    backgroundColor: '#fef2f2',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  timesheetDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  timesheetDay: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  timesheetCell: {
    fontSize: 12,
    color: '#374151',
  },
  hoursCell: {
    fontWeight: '700',
    textAlign: 'right',
  },
  missingValue: {
    color: '#dc2626',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6b7280',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exportOptionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  exportOptionContent: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  exportOptionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
});