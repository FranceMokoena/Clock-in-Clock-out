import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import API_BASE_URL from '../../config/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function InternApplications({ navigation, route }) {
  const { theme } = useTheme();
  const dynamic = getDynamicStyles(theme);
  const userInfo = route?.params?.userInfo || {};

  // Format date to human-readable format (e.g., "14 Jan 2024")
  const formatDateReadable = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If invalid date, return as-is
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('leave');

  // Leave
  const [leaveType, setLeaveType] = useState('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [supportingDocs, setSupportingDocs] = useState([]);

  // Correction
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionType, setCorrectionType] = useState('missing_clock_in');
  const [correctionDescription, setCorrectionDescription] = useState('');

  const [leaveApplications, setLeaveApplications] = useState([]);
  const [corrections, setCorrections] = useState([]);

  // Collapsible sections
  const [leaveFormExpanded, setLeaveFormExpanded] = useState(false);
  const [correctionFormExpanded, setCorrectionFormExpanded] = useState(false);

  // Detail modal
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationDetail, setShowApplicationDetail] = useState(false);
  const [selectedApplicationType, setSelectedApplicationType] = useState('leave'); // 'leave' or 'correction'

  // Date picker modal
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState(null); // 'startDate', 'endDate', 'correctionDate'
  const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
  const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth() + 1);
  const [datePickerDay, setDatePickerDay] = useState(new Date().getDate());

  useEffect(() => {
    loadData();
  }, []);

  // Auto-calc number of days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const days = Math.max(1, Math.round((end - start) / msPerDay) + 1);
        setNumberOfDays(String(days));
      }
    }
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      if (!userInfo.id) return;
      setLoading(true);

      const [leaveRes, corrRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/staff/intern/leave-applications`, {
          params: { internId: userInfo.id },
        }),
        axios.get(`${API_BASE_URL}/staff/intern/attendance-corrections`, {
          params: { internId: userInfo.id },
        }),
      ]);

      if (leaveRes.data?.success) setLeaveApplications(leaveRes.data.applications || []);
      if (corrRes.data?.success) setCorrections(corrRes.data.corrections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitLeave = async () => {
    if (!startDate || !endDate || !numberOfDays || !leaveReason.trim()) {
      return Alert.alert('Incomplete Form', 'All fields are required.');
    }

    if (leaveType === 'Sick' && supportingDocs.length === 0) {
      return Alert.alert('Supporting document required', 'Please attach a sick note.');
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/staff/intern/leave-applications`, {
        internId: userInfo.id,
        internName: userInfo.fullName || userInfo.name,
        leaveType,
        startDate,
        endDate,
        numberOfDays: Number(numberOfDays),
        reason: leaveReason.trim(),
        hostCompanyId: userInfo.hostCompanyId,
        supportingDocuments: supportingDocs.map((doc) => ({
          fileName: doc.name,
          fileUrl: doc.uri,
          fileType: doc.mimeType || 'application/octet-stream',
        })),
        createdByRole: userInfo.type || 'intern',
        createdById: userInfo.id,
      });

      if (res.data?.success) {
        Alert.alert('Success', 'Leave request submitted.');
        setStartDate('');
        setEndDate('');
        setNumberOfDays('');
        setLeaveReason('');
        setSupportingDocs([]);
        loadData();
      }
    } catch (e) {
      const errorMessage = e.response?.data?.error || e.message || 'Failed to submit leave application';
      Alert.alert('Error', errorMessage);
      console.error('Leave application error:', e.response?.data || e);
    } finally {
      setSubmitting(false);
    }
  };

  const submitCorrection = async () => {
    if (!correctionDate || !correctionDescription.trim()) {
      return Alert.alert('Incomplete Form', 'Please complete all fields.');
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/staff/intern/attendance-corrections`, {
        internId: userInfo.id,
        internName: userInfo.fullName || userInfo.name,
        date: correctionDate,
        correctionType,
        requestedChange: { description: correctionDescription.trim() },
        hostCompanyId: userInfo.hostCompanyId,
      });

      if (res.data?.success) {
        Alert.alert('Success', 'Correction request submitted.');
        setCorrectionDate('');
        setCorrectionDescription('');
        loadData();
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to get days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDate = (year, month, day) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Helper function to parse date from YYYY-MM-DD
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return {
      year: parseInt(parts[0]),
      month: parseInt(parts[1]),
      day: parseInt(parts[2]),
    };
  };

  const openDatePicker = (type) => {
    let currentDate;
    if (type === 'startDate' && startDate) {
      currentDate = parseDate(startDate);
    } else if (type === 'endDate' && endDate) {
      currentDate = parseDate(endDate);
    } else if (type === 'correctionDate' && correctionDate) {
      currentDate = parseDate(correctionDate);
    }

    if (currentDate) {
      setDatePickerYear(currentDate.year);
      setDatePickerMonth(currentDate.month);
      setDatePickerDay(currentDate.day);
    } else {
      const today = new Date();
      setDatePickerYear(today.getFullYear());
      setDatePickerMonth(today.getMonth() + 1);
      setDatePickerDay(today.getDate());
    }

    setDatePickerType(type);
    setShowDatePicker(true);
  };

  const confirmDatePicker = () => {
    const dateStr = formatDate(datePickerYear, datePickerMonth, datePickerDay);
    if (datePickerType === 'startDate') {
      setStartDate(dateStr);
    } else if (datePickerType === 'endDate') {
      setEndDate(dateStr);
    } else if (datePickerType === 'correctionDate') {
      setCorrectionDate(dateStr);
    }
    setShowDatePicker(false);
  };

  const pickSupportingDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result?.assets) {
        setSupportingDocs((prev) => [...prev, ...result.assets]);
      } else if (!result.canceled && result.uri) {
        setSupportingDocs((prev) => [...prev, result]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not pick document');
    }
  };

  const StatusChip = ({ status }) => {
    const color =
      status === 'approved'
        ? '#16a34a'
        : status === 'rejected'
        ? '#dc2626'
        : '#eab308';

    return (
      <View style={[styles.statusChip, { backgroundColor: `${color}20`, borderColor: color }]}>
        <Text style={[styles.statusText, { color }]}>{status?.toUpperCase()}</Text>
      </View>
    );
  };

  const exportApplicationPDF = async (application) => {
    if (!application) return;
    try {
      const status = application.status || 'pending';
      const statusColor =
        status === 'approved' ? '#16a34a' : status === 'rejected' ? '#dc2626' : '#eab308';
      const hostCompanyName = userInfo.hostCompanyName || userInfo.company || 'N/A';

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #1f2937; }
              h1 { color: #3166AE; margin-bottom: 8px; }
              .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-top: 12px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { font-weight: 700; color: #374151; }
              .value { color: #111827; text-align: right; }
              .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; border: 1px solid ${statusColor}; color: ${statusColor}; background-color: ${statusColor}20; }
            </style>
          </head>
          <body>
            <h1>Leave Application</h1>
            <div class="card">
              <div class="row"><span class="label">Name</span><span class="value">${userInfo.fullName || userInfo.name}</span></div>
              <div class="row"><span class="label">Department</span><span class="value">${userInfo.department || 'N/A'}</span></div>
              <div class="row"><span class="label">Host Company</span><span class="value">${hostCompanyName}</span></div>
              <div class="row"><span class="label">Leave Type</span><span class="value">${application.leaveType}</span></div>
              <div class="row"><span class="label">Dates</span><span class="value">${application.startDate} - ${application.endDate}</span></div>
              <div class="row"><span class="label">Days</span><span class="value">${application.numberOfDays}</span></div>
              <div class="row"><span class="label">Status</span><span class="pill">${status.toUpperCase()}</span></div>
            </div>
            <div class="card">
              <div class="label" style="margin-bottom:6px;">Reason</div>
              <div class="value" style="text-align:left;">${application.reason || 'No reason provided'}</div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Leave Application PDF' });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not export PDF');
    }
  };

  const exportCorrectionPDF = async (correction) => {
    if (!correction) return;
    try {
      const status = correction.status || 'pending';
      const statusColor =
        status === 'approved' ? '#16a34a' : status === 'rejected' ? '#dc2626' : '#eab308';
      const hostCompanyName = userInfo.hostCompanyName || userInfo.company || 'N/A';
      const correctionDate = new Date(correction.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #1f2937; line-height: 1.6; }
              .header { border-bottom: 3px solid #3166AE; padding-bottom: 16px; margin-bottom: 20px; }
              h1 { color: #3166AE; margin: 0 0 4px 0; font-size: 24px; }
              .subtitle { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
              .section { margin-bottom: 20px; }
              .section-title { color: #fff; background: #3166AE; padding: 10px 12px; border-radius: 6px; font-weight: 700; margin-bottom: 12px; font-size: 13px; }
              .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; background: #f9fafb; }
              .row { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
              .row:last-child { border-bottom: none; margin-bottom: 0; }
              .label { font-weight: 700; color: #4a5568; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; flex: 1; }
              .value { color: #111827; text-align: right; flex: 1.5; }
              .pill { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; border: 1px solid ${statusColor}; color: ${statusColor}; background-color: ${statusColor}20; }
              .description-box { background: #fff; border-left: 4px solid #3166AE; padding: 12px; border-radius: 4px; }
              .timestamp { color: #6b7280; font-size: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Attendance Correction Request</h1>
              <div class="subtitle">Request Reference #${correction._id?.slice(-8) || 'N/A'}</div>
            </div>

            <div class="section">
              <div class="section-title">📋 REQUEST INFORMATION</div>
              <div class="card">
                <div class="row"><span class="label">Name</span><span class="value">${userInfo.fullName || userInfo.name}</span></div>
                <div class="row"><span class="label">Department</span><span class="value">${userInfo.department || 'N/A'}</span></div>
                <div class="row"><span class="label">Host Company</span><span class="value">${hostCompanyName}</span></div>
                <div class="row"><span class="label">Email</span><span class="value">${userInfo.email || userInfo.emailAddress || 'N/A'}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">🔧 CORRECTION DETAILS</div>
              <div class="card">
                <div class="row"><span class="label">Issue Type</span><span class="value">${correction.correctionType?.replace(/_/g, ' ').toUpperCase()}</span></div>
                <div class="row"><span class="label">Date of Issue</span><span class="value">${correctionDate}</span></div>
                <div class="row"><span class="label">Status</span><span class="pill">${status.toUpperCase()}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">📝 DESCRIPTION</div>
              <div class="description-box">
                ${correction.requestedChange?.description || 'No description provided'}
              </div>
            </div>

            ${correction.comments ? `
            <div class="section">
              <div class="section-title">💬 REVIEWER COMMENTS</div>
              <div class="description-box">
                ${correction.comments}
              </div>
            </div>
            ` : ''}

            <div class="timestamp">
              <strong>Submitted:</strong> ${new Date(correction.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              ${correction.reviewedAt ? `<br><strong>Reviewed:</strong> ${new Date(correction.reviewedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Correction Request PDF' });
      }
    } catch (error) {
      Alert.alert('Error', 'Could not export PDF');
    }
  };

  return (
    <SafeAreaView style={[styles.container, dynamic.container]}>
      {/* Header */}
      <View style={[styles.header, dynamic.header]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, dynamic.text]}>Applications</Text>
          <Text style={dynamic.subText}>Leave & Attendance Requests</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tabs - Professional Government Style */}
        <View style={styles.tabsContainer}>
          {['leave', 'correction'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.govTab,
                activeTab === t ? styles.govTabActive : styles.govTabInactive,
              ]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.govTabText,
                activeTab === t ? styles.govTabTextActive : styles.govTabTextInactive,
              ]}>
                {t === 'leave' ? '📋 LEAVE APPLICATIONS' : '🔧 ATTENDANCE CORRECTIONS'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" />
        ) : activeTab === 'leave' ? (
          <>
            {/* Leave Form - Professional Government Style */}
            <View style={styles.govFormWrapper}>
              {/* Form Header */}
              <TouchableOpacity
                style={styles.govFormHeader}
                onPress={() => setLeaveFormExpanded(!leaveFormExpanded)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.govFormTitle}>Leave Application</Text>
                  <Text style={styles.govFormSubtitle}>Submit a formal leave request</Text>
                </View>
                <Text style={styles.govFormArrow}>
                  {leaveFormExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {leaveFormExpanded && (
              <>
                <View style={styles.govFormContent}>
                  {/* Leave Type Section */}
                  <View style={styles.govFormSection}>
                    <Text style={styles.govFormLabel}>Leave Type *</Text>
                    <ChipRow
                      options={['Annual', 'Sick', 'Study Leave', 'Family Responsibility', 'Other']}
                      value={leaveType}
                      onChange={setLeaveType}
                    />
                  </View>

                  {/* Dates Section */}
                  <View style={styles.govFormSection}>
                    <Text style={styles.govFormLabel}>Start Date *</Text>
                    <DatePickerInput value={startDate} onPress={() => openDatePicker('startDate')} />
                  </View>

                  <View style={styles.govFormSection}>
                    <Text style={styles.govFormLabel}>End Date *</Text>
                    <DatePickerInput value={endDate} onPress={() => openDatePicker('endDate')} />
                  </View>

                  {/* Days Section */}
                  <View style={styles.govFormSection}>
                    <View style={styles.govLabelWithInfo}>
                      <Text style={styles.govFormLabel}>Number of Days *</Text>
                      <TouchableOpacity onPress={() => Alert.alert('Information', 'Automatically calculated from start and end dates.')}>
                        <Text style={styles.govInfoIcon}>ⓘ</Text>
                      </TouchableOpacity>
                    </View>
                    <Input value={numberOfDays} onChange={setNumberOfDays} keyboard="numeric" editable={false} />
                    <Text style={styles.govFieldNote}>Auto-calculated from selected dates</Text>
                  </View>

                  {/* Reason Section */}
                  <View style={styles.govFormSection}>
                    <Text style={styles.govFormLabel}>Reason for Leave *</Text>
                    <Input multiline value={leaveReason} onChange={setLeaveReason} />
                    <Text style={styles.govFieldNote}>{leaveReason.length}/500 characters</Text>
                  </View>

                  {/* Sick Leave Document Section */}
                  {leaveType === 'Sick' && (
                    <View style={[styles.govFormSection, styles.govSickNoteSection]}>
                      <View style={styles.govLabelWithInfo}>
                        <Text style={styles.govFormLabel}>Medical Proof (required) *</Text>
                        <TouchableOpacity onPress={() => Alert.alert('Required Document', 'Attach a doctor\'s note, clinic letter, or medical certificate as proof.')}>
                          <Text style={styles.govInfoIcon}>ⓘ</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity style={styles.govUploadBtn} onPress={pickSupportingDoc}>
                        <Text style={styles.govUploadBtnText}>+ Upload Document</Text>
                      </TouchableOpacity>
                      {supportingDocs.length > 0 && (
                        <View style={styles.govDocList}>
                          <Text style={styles.govDocListTitle}>Attached Documents:</Text>
                          {supportingDocs.map((doc, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.govDocItem}
                              onPress={() => {
                                if (doc.uri) {
                                  Alert.alert('Document', doc.name || 'Attachment');
                                }
                              }}
                            >
                              <Text style={styles.govDocItemText}>📎 {doc.name || 'Attachment'}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Submit Button */}
                  <PrimaryButton onPress={submitLeave} loading={submitting} text="Submit Leave Request" />
                </View>
              </>
              )}
            </View>

            {/* Leave Applications List - Professional Government Style (Admin Table Design) */}
            <View style={[styles.adminTableWrapper, dynamic.card]}>
              {/* Table Header */}
              <View style={styles.adminTableHeader}>
                <Text style={styles.adminTableHeaderText}>My Leave Applications</Text>
              </View>

              {leaveApplications.length === 0 ? (
                <View style={styles.adminEmptyState}>
                  <Text style={styles.adminEmptyIcon}>📋</Text>
                  <Text style={styles.adminEmptyTitle}>No Leave Applications</Text>
                  <Text style={styles.adminEmptyText}>Submit your first leave request using the form above</Text>
                </View>
              ) : (
                <>
                  {/* Column Headers */}
                  <View style={styles.adminColumnHeaders}>
                    <Text style={[styles.adminColumnHeader, { flex: 1.5 }]}>Leave Type</Text>
                    <Text style={[styles.adminColumnHeader, { flex: 1.5 }]}>Start Date</Text>
                    <Text style={[styles.adminColumnHeader, { flex: 1.2 }]}>End Date</Text>
                    <Text style={[styles.adminColumnHeader, { flex: 0.8 }]}>Days</Text>
                    <Text style={[styles.adminColumnHeader, { flex: 1 }]}>Status</Text>
                  </View>

                  {/* Table Rows */}
                  {leaveApplications.map((item, index) => (
                    <TouchableOpacity
                      key={item._id || index}
                      style={[
                        styles.adminTableRow,
                        index % 2 === 0 ? styles.adminTableRowEven : styles.adminTableRowOdd,
                      ]}
                      onPress={() => {
                        setSelectedApplication(item);
                        setSelectedApplicationType('leave');
                        setShowApplicationDetail(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.adminTableCell, { flex: 1.5, fontWeight: '600', color: '#1f2937' }]}>
                        {item.leaveType}
                      </Text>
                      <Text style={[styles.adminTableCell, { flex: 1.5, color: '#6b7280', fontSize: 12 }]}>
                        {formatDateReadable(item.startDate)}
                      </Text>
                      <Text style={[styles.adminTableCell, { flex: 1.2, color: '#6b7280', fontSize: 12 }]}>
                        {formatDateReadable(item.endDate)}
                      </Text>
                      <View style={[styles.adminTableCell, { flex: 0.8, alignItems: 'center' }]}>
                        <View style={styles.adminCountBadge}>
                          <Text style={styles.adminCountBadgeText}>{item.numberOfDays}</Text>
                        </View>
                      </View>
                      <View style={[styles.adminTableCell, { flex: 1 }]}>
                        <StatusChip status={item.status} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Correction Form - Collapsible */}
            <View style={[styles.card, dynamic.card]}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setCorrectionFormExpanded(!correctionFormExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Attendance Correction</Text>
                <Text style={styles.collapsibleArrow}>
                  {correctionFormExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {correctionFormExpanded && (
              <>

              <Label text="Date" />
              <DatePickerInput value={correctionDate} onPress={() => openDatePicker('correctionDate')} />

              <Label text="Issue Type" />
              <ChipRow
                options={[
                  'missing_clock_in',
                  'missing_clock_out',
                  'wrong_time',
                  'missing_break',
                  'other',
                ]}
                value={correctionType}
                onChange={setCorrectionType}
              />

              <Label text="Details" />
              <Input multiline value={correctionDescription} onChange={setCorrectionDescription} />

              <PrimaryButton
                onPress={submitCorrection}
                loading={submitting}
                text="Submit Correction Request"
              />
              </>
              )}
            </View>

            {/* Correction Requests List - Professional Government Style (Admin Table Design) */}
            <View style={[styles.adminTableWrapper, dynamic.card]}>
              {/* Table Header */}
              <View style={styles.adminTableHeader}>
                <Text style={styles.adminTableHeaderText}>My Correction Requests</Text>
              </View>

              {corrections.length === 0 ? (
                <View style={styles.adminEmptyState}>
                  <Text style={styles.adminEmptyIcon}>🔍</Text>
                  <Text style={styles.adminEmptyTitle}>No Correction Requests</Text>
                  <Text style={styles.adminEmptyText}>Submit your first correction request using the form above</Text>
                </View>
              ) : (
                <>
                  {/* Column Headers */}
                  <View style={styles.adminColumnHeaders}>
                    <Text style={[styles.adminColumnHeader, { flex: 1.8 }]}>Issue Type</Text>
                    <Text style={[styles.adminColumnHeader, { flex: 1.5 }]}>Date</Text>
                    <Text style={[styles.adminColumnHeader, { flex: 1.2 }]}>Description</Text>
                    <Text style={[styles.adminColumnHeader, { flex: 1 }]}>Status</Text>
                  </View>

                  {/* Table Rows */}
                  {corrections.map((item, index) => (
                    <TouchableOpacity
                      key={item._id || index}
                      style={[
                        styles.adminTableRow,
                        index % 2 === 0 ? styles.adminTableRowEven : styles.adminTableRowOdd,
                      ]}
                      onPress={() => {
                        setSelectedApplication(item);
                        setSelectedApplicationType('correction');
                        setShowApplicationDetail(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.adminTableCell, { flex: 1.8, fontWeight: '600', color: '#1f2937' }]}>
                        {item.correctionType?.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <Text style={[styles.adminTableCell, { flex: 1.5, color: '#6b7280', fontSize: 12 }]}>
                        {formatDateReadable(item.date)}
                      </Text>
                      <Text style={[styles.adminTableCell, { flex: 1.2, color: '#6b7280', fontSize: 11 }]} numberOfLines={1}>
                        {item.requestedChange?.description || 'N/A'}
                      </Text>
                      <View style={[styles.adminTableCell, { flex: 1 }]}>
                        <StatusChip status={item.status} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Application/Correction Detail Modal */}
      <Modal
        visible={showApplicationDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowApplicationDetail(false);
          setSelectedApplication(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {selectedApplicationType === 'leave' ? 'Leave Application Details' : 'Correction Request Details'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowApplicationDetail(false);
                setSelectedApplication(null);
              }}>
                <Text style={styles.datePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <ScrollView style={{ maxHeight: '88%' }} showsVerticalScrollIndicator={true}>
                <View style={styles.detailContainer}>
                  {selectedApplicationType === 'leave' ? (
                    /* Leave Application Details */
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Host Company:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.hostCompanyName ||
                            selectedApplication.hostCompanyId?.companyName ||
                            userInfo.hostCompanyName ||
                            userInfo.company ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.departmentName ||
                            selectedApplication.department ||
                            userInfo.department ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Intern Email:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.internId?.email ||
                            selectedApplication.internId?.emailAddress ||
                            selectedApplication.internEmail ||
                            userInfo.email ||
                            userInfo.emailAddress ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Location:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.internId?.location ||
                            selectedApplication.location ||
                            selectedApplication.internLocation ||
                            userInfo.location ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Leave Type:</Text>
                        <Text style={styles.detailValue}>{selectedApplication.leaveType}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Start Date:</Text>
                        <Text style={styles.detailValue}>
                          {formatDateReadable(selectedApplication.startDate)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>End Date:</Text>
                        <Text style={styles.detailValue}>
                          {formatDateReadable(selectedApplication.endDate)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Number of Days:</Text>
                        <Text style={styles.detailValue}>{selectedApplication.numberOfDays}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reason:</Text>
                        <Text style={styles.detailValue}>{selectedApplication.reason}</Text>
                      </View>

                      {selectedApplication.supportingDocuments &&
                        selectedApplication.supportingDocuments.length > 0 && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Attachments:</Text>
                            <View style={{ flex: 2 }}>
                              {selectedApplication.supportingDocuments.map((doc, idx) => (
                                <TouchableOpacity
                                  key={idx}
                                  onPress={async () => {
                                    try {
                                      const url = doc.fileUrl || doc.uri;
                                      if (!url) {
                                        Alert.alert('Attachment', 'No file link available for this document.');
                                        return;
                                      }
                                      const canOpen = await Linking.canOpenURL(url);
                                      if (!canOpen) {
                                        Alert.alert(
                                          'Attachment',
                                          'This attachment link cannot be opened on this device.'
                                        );
                                        return;
                                      }
                                      await Linking.openURL(url);
                                    } catch (error) {
                                      Alert.alert('Attachment', 'Failed to open attachment.');
                                    }
                                  }}
                                >
                                  <Text style={[styles.detailValue, { textDecorationLine: 'underline' }]}>
                                    {doc.fileName || 'Document'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <StatusChip status={selectedApplication.status} />
                      </View>

                      {selectedApplication.rejectionReason && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Rejection Reason:</Text>
                          <Text style={[styles.detailValue, { color: '#dc2626' }]}>
                            {selectedApplication.rejectionReason}
                          </Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Submitted:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedApplication.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      {selectedApplication.reviewedAt && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Reviewed:</Text>
                          <Text style={styles.detailValue}>
                            {new Date(selectedApplication.reviewedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    /* Correction Request Details */
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Host Company:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.hostCompanyName ||
                            userInfo.hostCompanyName ||
                            userInfo.company ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Department:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.departmentName ||
                            userInfo.department ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Intern Email:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.internId?.email ||
                            userInfo.email ||
                            userInfo.emailAddress ||
                            'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Issue Type:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.correctionType?.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date of Issue:</Text>
                        <Text style={styles.detailValue}>
                          {formatDateReadable(selectedApplication.date)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description:</Text>
                        <Text style={styles.detailValue}>
                          {selectedApplication.requestedChange?.description || 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Status:</Text>
                        <StatusChip status={selectedApplication.status} />
                      </View>

                      {selectedApplication.comments && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Comments:</Text>
                          <Text style={styles.detailValue}>
                            {selectedApplication.comments}
                          </Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Submitted:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedApplication.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      {selectedApplication.reviewedAt && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Reviewed:</Text>
                          <Text style={styles.detailValue}>
                            {new Date(selectedApplication.reviewedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {selectedApplicationType === 'leave' && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 4 }]}
                    onPress={() => exportApplicationPDF(selectedApplication)}
                  >
                    <Text style={styles.primaryText}>📥 Export as PDF</Text>
                  </TouchableOpacity>
                )}

                {selectedApplicationType === 'correction' && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 4 }]}
                    onPress={() => exportCorrectionPDF(selectedApplication)}
                  >
                    <Text style={styles.primaryText}>📥 Export as PDF</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {datePickerType === 'startDate'
                  ? 'Start Date'
                  : datePickerType === 'endDate'
                  ? 'End Date'
                  : 'Correction Date'}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContent}>
              {/* Year Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Year</Text>
                <ScrollView
                  style={styles.datePickerScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {Array.from({ length: 100 }, (_, i) => {
                    const year = new Date().getFullYear() - 50 + i;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.datePickerOption,
                          datePickerYear === year && styles.datePickerOptionActive,
                        ]}
                        onPress={() => {
                          setDatePickerYear(year);
                          const daysInMonth = getDaysInMonth(year, datePickerMonth);
                          if (datePickerDay > daysInMonth) {
                            setDatePickerDay(daysInMonth);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.datePickerOptionText,
                            datePickerYear === year && styles.datePickerOptionTextActive,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Month</Text>
                <ScrollView
                  style={styles.datePickerScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    return (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.datePickerOption,
                          datePickerMonth === month && styles.datePickerOptionActive,
                        ]}
                        onPress={() => {
                          setDatePickerMonth(month);
                          const daysInMonth = getDaysInMonth(datePickerYear, month);
                          if (datePickerDay > daysInMonth) {
                            setDatePickerDay(daysInMonth);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.datePickerOptionText,
                            datePickerMonth === month && styles.datePickerOptionTextActive,
                          ]}
                        >
                          {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'short' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Day Picker */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Day</Text>
                <ScrollView
                  style={styles.datePickerScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {Array.from({ length: getDaysInMonth(datePickerYear, datePickerMonth) }, (_, i) => {
                    const day = i + 1;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.datePickerOption,
                          datePickerDay === day && styles.datePickerOptionActive,
                        ]}
                        onPress={() => setDatePickerDay(day)}
                      >
                        <Text
                          style={[
                            styles.datePickerOptionText,
                            datePickerDay === day && styles.datePickerOptionTextActive,
                          ]}
                        >
                          {String(day).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerButtonCancel}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerButtonConfirm} onPress={confirmDatePicker}>
                <Text style={styles.datePickerButtonConfirmText}>Set Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Reusable UI ---------- */

const Label = ({ text }) => <Text style={styles.label}>{text}</Text>;

const Input = ({ multiline, keyboard, value, onChange, placeholder }) => (
  <TextInput
    style={[styles.input, multiline && styles.textArea]}
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    keyboardType={keyboard}
    multiline={multiline}
  />
);

const DatePickerInput = ({ value, onPress }) => (
  <TouchableOpacity
    style={[styles.input, styles.datePickerInputContainer]}
    onPress={onPress}
  >
    <Text style={[styles.datePickerInputText, !value && styles.datePickerInputPlaceholder]}>
      {value || 'Tap to select date'}
    </Text>
  </TouchableOpacity>
);

const ChipRow = ({ options, value, onChange }) => (
  <View style={styles.chipRow}>
    {options.map((o) => (
      <TouchableOpacity
        key={o}
        style={[styles.chip, value === o && styles.chipActive]}
        onPress={() => onChange(o)}
      >
        <Text style={[styles.chipText, value === o && styles.chipTextActive]}>
          {o.replace(/_/g, ' ')}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const PrimaryButton = ({ onPress, loading, text }) => (
  <TouchableOpacity style={styles.primaryBtn} onPress={onPress} disabled={loading}>
    <Text style={styles.primaryText}>{loading ? 'Submitting…' : text}</Text>
  </TouchableOpacity>
);

const RecordList = ({ title, data, children }) => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {data.length === 0 ? (
      <Text style={styles.empty}>No records found.</Text>
    ) : (
      data.map((item) => (
        <View key={item._id} style={styles.record}>
          {children(item)}
        </View>
      ))
    )}
  </View>
);

/* ---------- Styles ---------- */

const getDynamicStyles = (theme) => ({
  container: { backgroundColor: theme.background },
  header: { borderBottomColor: theme.border },
  card: { backgroundColor: theme.card, borderColor: theme.border },
  text: { color: theme.text },
  subText: { color: theme.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  backText: { fontSize: 20, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  /* ===== PROFESSIONAL TABS ===== */
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  govTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  govTabActive: {
    backgroundColor: '#3166AE',
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  govTabInactive: {
    backgroundColor: 'transparent',
  },
  govTabText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  govTabTextActive: {
    color: '#fff',
  },
  govTabTextInactive: {
    color: '#4a5568',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  collapsibleArrow: {
    fontSize: 16,
    color: '#3166AE',
    fontWeight: '600',
  },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  textArea: { height: 90, textAlignVertical: 'top', paddingTop: 10 },
  inlineLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoIcon: {
    color: '#3166AE',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
    paddingHorizontal: 6,
  },
  uploadBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#3166AE',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  uploadBtnText: { color: '#3166AE', fontWeight: '700' },
  docItem: { fontSize: 13, color: '#111827', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: '#3166AE', borderColor: '#3166AE' },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3166AE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  record: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  recordTitle: { fontWeight: '700' },
  empty: { color: '#6b7280' },
  /* ===== GOVERNMENT FORM STYLES ===== */
  govFormWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  govFormHeader: {
    backgroundColor: '#3166AE',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  govFormTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 1,
    letterSpacing: 0.3,
  },
  govFormSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  govFormArrow: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  govFormContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
  },
  govFormSection: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  govFormLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  govLabelWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  govInfoIcon: {
    color: '#3166AE',
    fontSize: 12,
    fontWeight: '600',
  },
  govFieldNote: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  govSickNoteSection: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderBottomWidth: 0,
    borderRadius: 6,
  },
  govUploadBtn: {
    borderWidth: 1.5,
    borderColor: '#3166AE',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
  },
  govUploadBtnText: {
    color: '#3166AE',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  govDocList: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  govDocListTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4a5568',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  govDocItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 3,
    backgroundColor: '#f9fafb',
    borderRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: '#3166AE',
  },
  govDocItemText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  /* ===== ADMIN TABLE STYLES (MATCHING DESKTOP) ===== */
  adminTableWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  adminTableHeader: {
    backgroundColor: '#3166AE',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminTableHeaderText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  adminColumnHeaders: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    gap: 8,
  },
  adminColumnHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminTableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    gap: 8,
  },
  adminTableRowEven: {
    backgroundColor: '#ffffff',
  },
  adminTableRowOdd: {
    backgroundColor: '#f8fafc',
  },
  adminTableCell: {
    fontSize: 13,
    color: '#111827',
  },
  adminCountBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  adminCountBadgeText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '700',
  },
  adminEmptyState: {
    paddingVertical: 60,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  adminEmptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  adminEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  adminEmptyText: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
    padding: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  datePickerClose: {
    fontSize: 24,
    color: '#718096',
  },
  datePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
    fontWeight: '600',
  },
  datePickerScroll: {
    maxHeight: 200,
    width: '100%',
  },
  datePickerScrollContent: {
    alignItems: 'center',
  },
  datePickerOption: {
    padding: 12,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginVertical: 2,
  },
  datePickerOptionActive: {
    backgroundColor: '#eff6ff',
  },
  datePickerOptionText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#2d3748',
  },
  datePickerOptionTextActive: {
    fontWeight: 'bold',
    color: '#3166AE',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerButtonCancel: {
    flex: 1,
    padding: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  datePickerButtonConfirm: {
    flex: 1,
    padding: 12,
    backgroundColor: '#3166AE',
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  datePickerInputContainer: {
    justifyContent: 'center',
  },
  datePickerInputText: {
    fontSize: 16,
    color: '#2d3748',
  },
  datePickerInputPlaceholder: {
    color: '#9ca3af',
  },
  detailContainer: {
    paddingVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
});
