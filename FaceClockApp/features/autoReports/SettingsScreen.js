import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

const DEFAULT_EMAIL_BODY =
  '{{salutation}}\n\nPlease find the attached {{reportType}} report for {{periodLabel}}.\n\nSummary:\n- Total staff: {{totalStaff}}\n- Total days: {{totalDays}}\n- Late clock-ins: {{totalLate}}\n- Total hours: {{totalHours}}\n\nRegards,\n{{signature}}';
const DEFAULT_STAFF_REG_BODY =
  'Dear {{fullName}},\n\nCongratulations! Your Internship Success Clock-in System account has been created.\n\nLogin details:\nUsername: {{username}}\nTemporary Password: {{temporaryPassword}}\nRole: {{role}}\nCompany: {{companyName}}\n\nLogin here: {{loginUrl}}\n\nFor security, please change your password after your first login.\n\nRegards,\n{{signature}}';
const DEFAULT_HOST_REG_BODY =
  'Dear {{companyName}},\n\nYour Host Company account has been created on the Internship Success Clock-in System.\n\nLogin details:\nUsername: {{username}}\nTemporary Password: {{temporaryPassword}}\nMentor/Contact: {{mentorName}}\n\nLogin here: {{loginUrl}}\n\nFor security, please change your password after your first login.\n\nRegards,\n{{signature}}';

export default function AutoReportsSettingsScreen({ userInfo }) {
  const ownerType = userInfo?.type === 'hostCompany' ? 'HostCompany' : 'Admin';
  const ownerId = userInfo?.id || userInfo?._id || '';
  const isHostCompany = ownerType === 'HostCompany';

  const [loading, setLoading] = useState(true);
  const [savingAuto, setSavingAuto] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [autoOpen, setAutoOpen] = useState(true);
  const [emailOpen, setEmailOpen] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const [emails, setEmails] = useState('');
  const [whatsappNumbers, setWhatsappNumbers] = useState('');
  const [weeklyEnabled, setWeeklyEnabled] = useState(true);
  const [weeklyTime, setWeeklyTime] = useState('17:00');
  const [monthlyEnabled, setMonthlyEnabled] = useState(true);
  const [monthlyTime, setMonthlyTime] = useState('17:00');
  const [monthlySendOnLastDay, setMonthlySendOnLastDay] = useState(true);
  const [graceMinutes, setGraceMinutes] = useState('30');
  const [notifyOnLate, setNotifyOnLate] = useState(true);
  const [notifyOnMissing, setNotifyOnMissing] = useState(true);

  const [departments, setDepartments] = useState([]);
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [includeAllDepartments, setIncludeAllDepartments] = useState(true);

  const [emailSubject, setEmailSubject] = useState('Auto Report - {{reportType}} ({{periodLabel}})');
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [emailSalutation, setEmailSalutation] = useState('Dear Sir/Madam,');
  const [emailSignature, setEmailSignature] = useState('Internship Success');
  const [whatsappMessage, setWhatsappMessage] = useState(
    'Auto report: {{reportType}} ({{periodLabel}}). Total staff: {{totalStaff}}, late: {{totalLate}}.'
  );

  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showRegistrationInfo, setShowRegistrationInfo] = useState(false);

  const [staffRegEnabled, setStaffRegEnabled] = useState(true);
  const [staffRegSubject, setStaffRegSubject] = useState('Welcome to Internship Success Clock-in System');
  const [staffRegBody, setStaffRegBody] = useState(DEFAULT_STAFF_REG_BODY);
  const [hostRegEnabled, setHostRegEnabled] = useState(true);
  const [hostRegSubject, setHostRegSubject] = useState('Your Host Company Account is Ready');
  const [hostRegBody, setHostRegBody] = useState(DEFAULT_HOST_REG_BODY);

  useEffect(() => {
    const loadSettings = async () => {
      if (!ownerId) {
        setLoading(false);
        setStatusMessage('Missing user context. Please re-login.');
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/report-settings`, {
          params: { ownerType, ownerId },
        });
        if (response?.data?.success && response?.data?.settings) {
          const settings = response.data.settings;
          setEmails((settings.recipients?.emails || []).join(', '));
          setWhatsappNumbers((settings.recipients?.whatsappNumbers || []).join(', '));
          setWeeklyEnabled(settings.weekly?.enabled !== false);
          setWeeklyTime(settings.weekly?.time || '17:00');
          setMonthlyEnabled(settings.monthly?.enabled !== false);
          setMonthlyTime(settings.monthly?.time || '17:00');
          setMonthlySendOnLastDay(settings.monthly?.sendOnLastDay !== false);
          setGraceMinutes(String(settings.lateRule?.graceMinutes ?? 30));
          setNotifyOnLate(settings.lateRule?.notifyOnLateClockIn !== false);
          setNotifyOnMissing(settings.lateRule?.notifyOnMissingClockIn !== false);

          setDepartmentName(settings.filters?.departmentName || '');
          setIncludeAllDepartments(settings.filters?.includeAllDepartments !== false);

          setEmailSubject(settings.templates?.emailSubject || emailSubject);
          setEmailBody(settings.templates?.emailBody || DEFAULT_EMAIL_BODY);
          setEmailSalutation(settings.templates?.emailSalutation || emailSalutation);
          setEmailSignature(settings.templates?.emailSignature || emailSignature);
          setWhatsappMessage(settings.templates?.whatsappMessage || whatsappMessage);

          const regTemplates = settings.registrationTemplates || {};
          setStaffRegEnabled(regTemplates?.staff?.enabled !== false);
          setStaffRegSubject(regTemplates?.staff?.subject || staffRegSubject);
          setStaffRegBody(regTemplates?.staff?.body || DEFAULT_STAFF_REG_BODY);
          setHostRegEnabled(regTemplates?.hostCompany?.enabled !== false);
          setHostRegSubject(regTemplates?.hostCompany?.subject || hostRegSubject);
          setHostRegBody(regTemplates?.hostCompany?.body || DEFAULT_HOST_REG_BODY);
        }
      } catch (error) {
        setStatusMessage(error?.message || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    const loadDepartments = async () => {
      try {
        const params = isHostCompany && ownerId ? { hostCompanyId: ownerId } : {};
        const response = await axios.get(`${API_BASE_URL}/staff/admin/departments/all`, { params });
        if (response?.data?.success && Array.isArray(response.data.departments)) {
          setDepartments(response.data.departments);
        }
      } catch (error) {
        // Non-blocking: leave dropdown empty if fetch fails.
      }
    };

    loadSettings();
    loadDepartments();
  }, [ownerId, ownerType, isHostCompany]);

  const buildPayload = () => ({
    ownerType,
    ownerId,
    recipients: {
      emails: emails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
      whatsappNumbers: whatsappNumbers
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    },
    weekly: {
      enabled: weeklyEnabled,
      dayOfWeek: 5,
      time: weeklyTime || '17:00',
      sendOnLastDay: true,
    },
    monthly: {
      enabled: monthlyEnabled,
      dayOfWeek: 5,
      time: monthlyTime || '17:00',
      sendOnLastDay: monthlySendOnLastDay,
    },
    lateRule: {
      graceMinutes: Number(graceMinutes) || 30,
      notifyOnLateClockIn: notifyOnLate,
      notifyOnMissingClockIn: notifyOnMissing,
    },
    filters: {
      departmentName: includeAllDepartments ? '' : departmentName,
      includeAllDepartments,
    },
    templates: {
      emailSubject,
      emailBody,
      emailSignature,
      emailSalutation,
      whatsappMessage,
    },
    registrationTemplates: {
      staff: {
        enabled: staffRegEnabled,
        subject: staffRegSubject,
        body: staffRegBody,
      },
      hostCompany: {
        enabled: hostRegEnabled,
        subject: hostRegSubject,
        body: hostRegBody,
      },
    },
  });

  const saveSettings = async (section) => {
    if (!ownerId) {
      setStatusMessage('Missing user context. Please re-login.');
      return;
    }
    if (section === 'auto') setSavingAuto(true);
    if (section === 'email') setSavingEmail(true);
    if (section === 'registration') setSavingRegistration(true);
    setStatusMessage('');
    try {
      const response = await axios.post(`${API_BASE_URL}/report-settings`, buildPayload());
      if (response?.data?.success) {
        setStatusMessage('Settings saved successfully.');
      } else {
        setStatusMessage(response?.data?.error || 'Failed to save settings.');
      }
    } catch (error) {
      setStatusMessage(error?.response?.data?.error || error?.message || 'Failed to save settings.');
    } finally {
      setSavingAuto(false);
      setSavingEmail(false);
      setSavingRegistration(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      setTestStatus('Please enter a test email address.');
      return;
    }
    setSendingTest(true);
    setTestStatus('');
    try {
      const response = await axios.post(`${API_BASE_URL}/report-settings/smtp/test`, {
        to: testEmail.trim(),
      });
      if (response?.data?.success) {
        setTestStatus('Test email sent successfully.');
      } else {
        setTestStatus(response?.data?.result?.reason || 'Failed to send test email.');
      }
    } catch (error) {
      setTestStatus(error?.response?.data?.error || error?.message || 'Failed to send test email.');
    } finally {
      setSendingTest(false);
    }
  };

  const departmentLabel = useMemo(() => {
    if (includeAllDepartments || !departmentName) return 'All departments';
    return departmentName;
  }, [includeAllDepartments, departmentName]);

  const previewData = useMemo(() => ({
    reportType: 'weekly',
    periodLabel: '01 Mar 2026 - 07 Mar 2026',
    totalStaff: '24',
    totalDays: '120',
    totalLate: '7',
    totalHours: '860',
    signature: emailSignature || 'Biometric Attendance System',
    salutation: emailSalutation || 'Dear Sir/Madam,',
  }), [emailSignature, emailSalutation]);

  const renderTemplate = (text) => {
    if (!text) return '';
    return text.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const token = String(key || '').trim();
      return previewData[token] ?? '';
    });
  };

  const previewSubject = useMemo(() => renderTemplate(emailSubject), [emailSubject, previewData]);
  const previewBody = useMemo(() => renderTemplate(emailBody), [emailBody, previewData]);
  const previewRecipient = useMemo(() => {
    if (emails && emails.trim()) return emails;
    return 'recipient@example.com';
  }, [emails]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>OFFICIAL REPORTING SETTINGS</Text>
        <Text style={styles.title}>Auto Reports</Text>
        <Text style={styles.subtitle}>
          Configure schedules, recipients, and formal email templates for automatic reports.
        </Text>
        <View style={styles.stampRow}>
          <Text style={styles.stamp}>GOVERNMENT NOTICE</Text>
          <Text style={styles.stampMuted}>CONFIDENTIAL</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#0f172a" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      ) : null}

      {statusMessage ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.sectionToggle} onPress={() => setAutoOpen((prev) => !prev)}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>1) Auto Report Schedule & Recipients</Text>
            <Text style={styles.sectionHint}>Controls when reports are sent to you and host companies.</Text>
          </View>
          <Text style={styles.chevron}>{autoOpen ? 'v' : '>'}</Text>
        </TouchableOpacity>

        {autoOpen ? (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Email recipients (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={emails}
              onChangeText={setEmails}
              placeholder="admin@company.com, host@company.com"
              placeholderTextColor="#8a94a6"
            />

            <Text style={styles.label}>WhatsApp recipients (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={whatsappNumbers}
              onChangeText={setWhatsappNumbers}
              placeholder="+27820000000, +27830000000"
              placeholderTextColor="#8a94a6"
            />

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Weekly report (Friday)</Text>
                <Text style={styles.muted}>Sent every Friday at the selected time.</Text>
              </View>
              <Switch value={weeklyEnabled} onValueChange={setWeeklyEnabled} />
            </View>
            <TextInput
              style={styles.input}
              value={weeklyTime}
              onChangeText={setWeeklyTime}
              placeholder="17:00"
              placeholderTextColor="#8a94a6"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Monthly report (last day)</Text>
                <Text style={styles.muted}>Sent on the last day of the month.</Text>
              </View>
              <Switch value={monthlyEnabled} onValueChange={setMonthlyEnabled} />
            </View>
            <TextInput
              style={styles.input}
              value={monthlyTime}
              onChangeText={setMonthlyTime}
              placeholder="17:00"
              placeholderTextColor="#8a94a6"
            />
            <View style={styles.row}>
              <Text style={styles.label}>Send only on the last day</Text>
              <Switch value={monthlySendOnLastDay} onValueChange={setMonthlySendOnLastDay} />
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Late clock-in grace period (minutes)</Text>
            <TextInput
              style={styles.input}
              value={graceMinutes}
              onChangeText={setGraceMinutes}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor="#8a94a6"
            />

            <View style={styles.row}>
              <Text style={styles.label}>Notify on late clock-in</Text>
              <Switch value={notifyOnLate} onValueChange={setNotifyOnLate} />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Notify on missing clock-in</Text>
              <Switch value={notifyOnMissing} onValueChange={setNotifyOnMissing} />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, savingAuto && styles.buttonDisabled]}
              onPress={() => saveSettings('auto')}
              disabled={savingAuto}
            >
              <Text style={styles.primaryButtonText}>
                {savingAuto ? 'Saving...' : 'Save Auto Report Settings'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.sectionToggle} onPress={() => setEmailOpen((prev) => !prev)}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>2) Email Delivery & Templates</Text>
            <Text style={styles.sectionHint}>
              Customize email content, salutation, and department scope.
            </Text>
          </View>
          <Text style={styles.chevron}>{emailOpen ? 'v' : '>'}</Text>
        </TouchableOpacity>

        {emailOpen ? (
          <View style={styles.sectionBody}>
            <Text style={styles.label}>Department scope</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setDepartmentsOpen((prev) => !prev)}
            >
              <Text style={styles.dropdownText}>{departmentLabel}</Text>
            </TouchableOpacity>
            {departmentsOpen ? (
              <View style={styles.dropdownList}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setIncludeAllDepartments(true);
                    setDepartmentName('');
                    setDepartmentsOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>All departments</Text>
                </TouchableOpacity>
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept._id || dept.name}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setIncludeAllDepartments(false);
                      setDepartmentName(dept.name);
                      setDepartmentsOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{dept.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <Text style={styles.muted}>
              {includeAllDepartments
                ? 'Reports include all departments.'
                : `Reports limited to: ${departmentName || 'Selected department'}`}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Email subject template</Text>
            <TextInput
              style={styles.input}
              value={emailSubject}
              onChangeText={setEmailSubject}
              placeholder="Auto Report - {{reportType}} ({{periodLabel}})"
              placeholderTextColor="#8a94a6"
            />

            <Text style={styles.label}>Salutation</Text>
            <TextInput
              style={styles.input}
              value={emailSalutation}
              onChangeText={setEmailSalutation}
              placeholder="Dear Sir/Madam,"
              placeholderTextColor="#8a94a6"
            />

            <Text style={styles.label}>Email body template</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={emailBody}
              onChangeText={setEmailBody}
              placeholder={DEFAULT_EMAIL_BODY}
              placeholderTextColor="#8a94a6"
              multiline
            />

            <Text style={styles.label}>Email signature</Text>
            <TextInput
              style={styles.input}
              value={emailSignature}
              onChangeText={setEmailSignature}
              placeholder="Internship Success"
              placeholderTextColor="#8a94a6"
            />

            <Text style={styles.label}>WhatsApp message template</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              value={whatsappMessage}
              onChangeText={setWhatsappMessage}
              placeholder="Auto report: {{reportType}} ({{periodLabel}})..."
              placeholderTextColor="#8a94a6"
              multiline
            />

            <View style={styles.tokensRow}>
              <Text style={styles.tokensLabel}>Template tokens</Text>
              <TouchableOpacity style={styles.infoBadge} onPress={() => setShowPreview(true)}>
                <Text style={styles.infoBadgeText}>i</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tokensValue}>
              {'{{reportType}} {{periodLabel}} {{totalStaff}} {{totalDays}} {{totalLate}} {{totalHours}} {{signature}} {{salutation}}'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, savingEmail && styles.buttonDisabled]}
              onPress={() => saveSettings('email')}
              disabled={savingEmail}
            >
              <Text style={styles.primaryButtonText}>
                {savingEmail ? 'Saving...' : 'Save Email Setup'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.label}>Send test email</Text>
            <Text style={styles.muted}>
              Sends a quick test via backend SMTP to confirm delivery.
            </Text>
            <TextInput
              style={styles.input}
              value={testEmail}
              onChangeText={setTestEmail}
              placeholder="name@example.com"
              placeholderTextColor="#8a94a6"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.primaryButton, sendingTest && styles.buttonDisabled]}
              onPress={sendTestEmail}
              disabled={sendingTest}
            >
              <Text style={styles.primaryButtonText}>
                {sendingTest ? 'Sending...' : 'Send Test Email'}
              </Text>
            </TouchableOpacity>
            {testStatus ? <Text style={styles.statusMessage}>{testStatus}</Text> : null}
          </View>
        ) : null}
      </View>
      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.sectionToggle} onPress={() => setRegistrationOpen((prev) => !prev)}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>3) Registration Auto Setup</Text>
            <Text style={styles.sectionHint}>
              Automatic account creation emails with credentials and password-change guidance.
            </Text>
          </View>
          <Text style={styles.chevron}>{registrationOpen ? 'v' : '>'}</Text>
        </TouchableOpacity>

        {registrationOpen ? (
          <View style={styles.sectionBody}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Section guide</Text>
              <TouchableOpacity style={styles.infoBadge} onPress={() => setShowRegistrationInfo(true)}>
                <Text style={styles.infoBadgeText}>i</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>Intern/Staff Account Creation Email</Text>
              <Switch value={staffRegEnabled} onValueChange={setStaffRegEnabled} />
            </View>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={staffRegSubject}
              onChangeText={setStaffRegSubject}
              placeholder="Welcome to Internship Success Clock-in System"
              placeholderTextColor="#8a94a6"
            />
            <Text style={styles.label}>Email body</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={staffRegBody}
              onChangeText={setStaffRegBody}
              placeholder={DEFAULT_STAFF_REG_BODY}
              placeholderTextColor="#8a94a6"
              multiline
            />

            <View style={styles.divider} />

            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>Host Company Account Creation Email</Text>
              <Switch value={hostRegEnabled} onValueChange={setHostRegEnabled} />
            </View>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={hostRegSubject}
              onChangeText={setHostRegSubject}
              placeholder="Your Host Company Account is Ready"
              placeholderTextColor="#8a94a6"
            />
            <Text style={styles.label}>Email body</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={hostRegBody}
              onChangeText={setHostRegBody}
              placeholder={DEFAULT_HOST_REG_BODY}
              placeholderTextColor="#8a94a6"
              multiline
            />

            <Text style={styles.tokensLabel}>Registration template tokens</Text>
            <Text style={styles.tokensValue}>
              {'{{fullName}} {{role}} {{companyName}} {{mentorName}} {{username}} {{temporaryPassword}} {{loginUrl}} {{signature}}'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, savingRegistration && styles.buttonDisabled]}
              onPress={() => saveSettings('registration')}
              disabled={savingRegistration}
            >
              <Text style={styles.primaryButtonText}>
                {savingRegistration ? 'Saving...' : 'Save Registration Setup'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <Modal visible={showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Email Preview</Text>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gmailCard}>
              <Text style={styles.gmailSubject}>{previewSubject || 'Auto Report'}</Text>
              <Text style={styles.gmailMeta}>From: {previewData.signature}</Text>
              <Text style={styles.gmailMeta}>To: {previewRecipient}</Text>
              <Text style={styles.gmailMeta}>Attachment: Timesheet Report (PDF)</Text>
              <View style={styles.gmailDivider} />
              <ScrollView style={styles.gmailBodyScroll} contentContainerStyle={styles.gmailBodyContent}>
                <Text style={styles.gmailBody}>{previewBody || DEFAULT_EMAIL_BODY}</Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRegistrationInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegistrationInfo(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registration Emails</Text>
              <TouchableOpacity onPress={() => setShowRegistrationInfo(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoPanel}>
              <Text style={styles.infoText}>
                This section controls automatic emails sent when a new staff/intern or host company account is created.
                The message includes login credentials and a notice to change their password after first login.
              </Text>
              <Text style={styles.infoText}>
                Use the tokens listed below the templates to insert names, usernames, temporary passwords, and login links.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f1ec' },
  content: { padding: 16 },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c9c7be',
    marginBottom: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#4a4f57',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    color: '#1f2a44',
    letterSpacing: 0.4,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 13,
    color: '#596174',
    marginTop: 6,
    lineHeight: 18,
  },
  stampRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stamp: {
    borderWidth: 1,
    borderColor: '#1f2a44',
    color: '#1f2a44',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  stampMuted: {
    borderWidth: 1,
    borderColor: '#9aa1ab',
    color: '#6b7280',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { color: '#6b7280', fontSize: 12 },
  statusBox: {
    backgroundColor: '#fff8e6',
    borderWidth: 1,
    borderColor: '#e3d3a7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  statusMessage: { color: '#1f2a44', fontSize: 12 },

  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#c9c7be',
    marginBottom: 16,
  },
  sectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2ded3',
    paddingBottom: 10,
  },
  sectionHeading: { flex: 1, marginRight: 12 },
  sectionBody: { marginTop: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1f2a44',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: 'serif',
  },
  sectionHint: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  chevron: { fontSize: 18, fontWeight: '700', color: '#1f2a44' },

  label: {
    fontSize: 11,
    color: '#394150',
    marginTop: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  muted: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#c9c7be',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    backgroundColor: '#fcfbf7',
    color: '#111827',
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  textAreaSmall: { minHeight: 70, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2ded3',
    marginVertical: 12,
  },

  dropdownButton: {
    borderWidth: 1,
    borderColor: '#c9c7be',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    backgroundColor: '#f7f5ee',
  },
  dropdownText: { color: '#111827', fontSize: 13 },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#c9c7be',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#efece3',
  },
  dropdownItemText: { color: '#111827', fontSize: 13 },

  tokensRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  tokensLabel: { fontSize: 11, color: '#394150', marginTop: 12, fontWeight: '700', letterSpacing: 0.8 },
  tokensValue: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  infoBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#1f2a44',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f0ea',
  },
  infoBadgeText: { color: '#1f2a44', fontWeight: '800', fontSize: 12 },
  blockHeader: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockTitle: { fontSize: 12, fontWeight: '700', color: '#1f2a44', textTransform: 'uppercase' },

  primaryButton: {
    marginTop: 16,
    backgroundColor: '#1f2a44',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0e1424',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '800', letterSpacing: 0.6 },
  buttonDisabled: { opacity: 0.6 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c9c7be',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2a44',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'serif',
  },
  modalClose: { color: '#1f2a44', fontWeight: '700' },
  gmailCard: {
    borderWidth: 1,
    borderColor: '#e1e3e8',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fafafa',
  },
  gmailSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  gmailMeta: { fontSize: 12, color: '#5b6472', marginBottom: 4 },
  gmailDivider: { height: 1, backgroundColor: '#e1e3e8', marginVertical: 10 },
  gmailBodyScroll: { maxHeight: 260 },
  gmailBodyContent: { paddingBottom: 12 },
  gmailBody: { fontSize: 13, color: '#111827', lineHeight: 18 },

  infoPanel: {
    backgroundColor: '#f7f5ee',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2ded3',
  },
  infoText: { fontSize: 12, color: '#374151', lineHeight: 18, marginBottom: 8 },
});
