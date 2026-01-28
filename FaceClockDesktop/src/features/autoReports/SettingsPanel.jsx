import React, { useEffect, useMemo, useState } from 'react';
import { departmentAPI, reportSettingsAPI } from '../../services/api';

const DEFAULT_EMAIL_BODY =
  '{{salutation}}\n\nPlease find the attached {{reportType}} report for {{periodLabel}}.\n\nSummary:\n- Total staff: {{totalStaff}}\n- Total days: {{totalDays}}\n- Late clock-ins: {{totalLate}}\n- Total hours: {{totalHours}}\n\nRegards,\n{{signature}}';
const DEFAULT_STAFF_REG_BODY =
  'Dear {{fullName}},\n\nCongratulations! Your Internship Success Clock-in System account has been created.\n\nLogin details:\nUsername: {{username}}\nTemporary Password: {{temporaryPassword}}\nRole: {{role}}\nCompany: {{companyName}}\n\nLogin here: {{loginUrl}}\n\nFor security, please change your password after your first login.\n\nRegards,\n{{signature}}';
const DEFAULT_HOST_REG_BODY =
  'Dear {{companyName}},\n\nYour Host Company account has been created on the Internship Success Clock-in System.\n\nLogin details:\nUsername: {{username}}\nTemporary Password: {{temporaryPassword}}\nMentor/Contact: {{mentorName}}\n\nLogin here: {{loginUrl}}\n\nFor security, please change your password after your first login.\n\nRegards,\n{{signature}}';

export default function AutoReportsSettingsPanel({ user, isHostCompany }) {
  const ownerType = isHostCompany ? 'HostCompany' : 'Admin';
  const ownerId = user?.id || user?._id || '';

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
        const response = await reportSettingsAPI.getSettings(ownerType, ownerId);
        if (response?.success && response?.settings) {
          const settings = response.settings;
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
        const response = await departmentAPI.getAll(params);
        if (response?.success && Array.isArray(response.departments)) {
          setDepartments(response.departments);
        }
      } catch (error) {
        // Non-blocking
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
      const response = await reportSettingsAPI.saveSettings(buildPayload());
      if (response?.success) {
        setStatusMessage('Settings saved successfully.');
      } else {
        setStatusMessage(response?.error || 'Failed to save settings.');
      }
    } catch (error) {
      setStatusMessage(error?.response?.data?.error || error?.message || 'Failed to save settings.');
    } finally {
      setSavingAuto(false);
      setSavingEmail(false);
      setSavingRegistration(false);
    }
  };

  const sendTestEmail = async (event) => {
    event?.preventDefault?.();
    if (!testEmail.trim()) {
      setTestStatus('Please enter a test email address.');
      return;
    }
    setSendingTest(true);
    setTestStatus('');
    try {
      const response = await reportSettingsAPI.sendSmtpTest(testEmail.trim());
      if (response?.success) {
        setTestStatus('Test email sent successfully.');
      } else {
        setTestStatus(response?.result?.reason || 'Failed to send test email.');
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

  const styles = {
    page: { background: '#f2f1ec', minHeight: '100%', padding: 24 },
    hero: { background: '#fff', border: '1px solid #c9c7be', borderRadius: 16, padding: 18, marginBottom: 18 },
    eyebrow: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#4a4f57', fontWeight: 700 },
    title: { margin: '6px 0 0', fontSize: 24, color: '#1f2a44', fontFamily: 'Georgia, serif' },
    subtitle: { marginTop: 6, color: '#596174', maxWidth: 560 },
    stampRow: { display: 'flex', gap: 8, marginTop: 12 },
    stamp: { border: '1px solid #1f2a44', color: '#1f2a44', padding: '4px 10px', borderRadius: 999, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 },
    stampMuted: { border: '1px solid #9aa1ab', color: '#6b7280', padding: '4px 10px', borderRadius: 999, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 },
    statusBox: { background: '#fff8e6', border: '1px solid #e3d3a7', borderRadius: 10, padding: 10, marginBottom: 12, color: '#1f2a44' },
    section: { background: '#fff', border: '1px solid #c9c7be', borderRadius: 14, padding: 16, marginBottom: 16 },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2ded3', paddingBottom: 10 },
    sectionTitle: { fontSize: 13, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: 800, color: '#1f2a44', fontFamily: 'Georgia, serif' },
    sectionHint: { fontSize: 12, color: '#6b7280', marginTop: 6 },
    chevron: { fontWeight: 700, color: '#1f2a44' },
    label: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: 700, color: '#394150', marginTop: 12 },
    muted: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    input: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #c9c7be', background: '#fcfbf7', marginTop: 6 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 },
    divider: { height: 1, background: '#e2ded3', margin: '12px 0' },
    button: { marginTop: 16, background: '#1f2a44', color: '#fff', border: '1px solid #0e1424', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' },
    buttonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
    dropdown: { border: '1px solid #c9c7be', background: '#f7f5ee', borderRadius: 8, padding: 10, marginTop: 6, cursor: 'pointer' },
    dropdownList: { marginTop: 8, border: '1px solid #c9c7be', borderRadius: 8, overflow: 'hidden' },
    dropdownItem: { padding: 10, borderBottom: '1px solid #efece3', background: '#fff', cursor: 'pointer' },
    tokensRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    infoBadge: { width: 22, height: 22, borderRadius: '50%', border: '1px solid #1f2a44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, cursor: 'pointer', background: '#f1f0ea', color: '#1f2a44' },
    modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalCard: { background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #c9c7be', width: 'min(720px, 90vw)', maxHeight: '85vh', overflow: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 800, color: '#1f2a44', fontFamily: 'Georgia, serif' },
    gmailCard: { border: '1px solid #e1e3e8', borderRadius: 12, padding: 14, background: '#fafafa' },
    gmailMeta: { fontSize: 12, color: '#5b6472', marginBottom: 4 },
    gmailDivider: { height: 1, background: '#e1e3e8', margin: '10px 0' },
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.eyebrow}>OFFICIAL REPORTING SETTINGS</div>
        <h2 style={styles.title}>Auto Reports</h2>
        <div style={styles.subtitle}>
          Configure schedules, recipients, and formal email templates for automatic reports.
        </div>
        <div style={styles.stampRow}>
          <div style={styles.stamp}>GOVERNMENT NOTICE</div>
          <div style={styles.stampMuted}>CONFIDENTIAL</div>
        </div>
      </div>

      {loading && <div style={{ marginBottom: 12 }}>Loading settings...</div>}
      {statusMessage && <div style={styles.statusBox}>{statusMessage}</div>}

      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => setAutoOpen((prev) => !prev)}>
          <div>
            <div style={styles.sectionTitle}>1) Auto Report Schedule & Recipients</div>
            <div style={styles.sectionHint}>Controls when reports are sent to you and host companies.</div>
          </div>
          <div style={styles.chevron}>{autoOpen ? 'v' : '>'}</div>
        </div>
        {autoOpen && (
          <>
            <label style={styles.label}>Email recipients (comma separated)</label>
            <input style={styles.input} value={emails} onChange={(e) => setEmails(e.target.value)} />

            <label style={styles.label}>WhatsApp recipients (comma separated)</label>
            <input style={styles.input} value={whatsappNumbers} onChange={(e) => setWhatsappNumbers(e.target.value)} />

            <div style={styles.divider} />

            <div style={styles.row}>
              <div>
                <div style={styles.label}>Weekly report (Friday)</div>
                <div style={styles.muted}>Sent every Friday at the selected time.</div>
              </div>
              <input type="checkbox" checked={weeklyEnabled} onChange={(e) => setWeeklyEnabled(e.target.checked)} />
            </div>
            <input style={styles.input} value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)} placeholder="17:00" />

            <div style={styles.row}>
              <div>
                <div style={styles.label}>Monthly report (last day)</div>
                <div style={styles.muted}>Sent on the last day of the month.</div>
              </div>
              <input type="checkbox" checked={monthlyEnabled} onChange={(e) => setMonthlyEnabled(e.target.checked)} />
            </div>
            <input style={styles.input} value={monthlyTime} onChange={(e) => setMonthlyTime(e.target.value)} placeholder="17:00" />
            <div style={styles.row}>
              <div style={styles.label}>Send only on the last day</div>
              <input type="checkbox" checked={monthlySendOnLastDay} onChange={(e) => setMonthlySendOnLastDay(e.target.checked)} />
            </div>

            <div style={styles.divider} />

            <label style={styles.label}>Late clock-in grace period (minutes)</label>
            <input style={styles.input} value={graceMinutes} onChange={(e) => setGraceMinutes(e.target.value)} />

            <div style={styles.row}>
              <div style={styles.label}>Notify on late clock-in</div>
              <input type="checkbox" checked={notifyOnLate} onChange={(e) => setNotifyOnLate(e.target.checked)} />
            </div>
            <div style={styles.row}>
              <div style={styles.label}>Notify on missing clock-in</div>
              <input type="checkbox" checked={notifyOnMissing} onChange={(e) => setNotifyOnMissing(e.target.checked)} />
            </div>

            <button
              type="button"
              style={{ ...styles.button, ...(savingAuto ? styles.buttonDisabled : {}) }}
              onClick={() => saveSettings('auto')}
              disabled={savingAuto}
            >
              {savingAuto ? 'Saving...' : 'Save Auto Report Settings'}
            </button>
          </>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => setEmailOpen((prev) => !prev)}>
          <div>
            <div style={styles.sectionTitle}>2) Email Delivery & Templates</div>
            <div style={styles.sectionHint}>Customize email content, salutation, and department scope.</div>
          </div>
          <div style={styles.chevron}>{emailOpen ? 'v' : '>'}</div>
        </div>
        {emailOpen && (
          <>
            <label style={styles.label}>Department scope</label>
            <div style={styles.dropdown} onClick={() => setDepartmentsOpen((prev) => !prev)}>
              {departmentLabel}
            </div>
            {departmentsOpen && (
              <div style={styles.dropdownList}>
                <div
                  style={styles.dropdownItem}
                  onClick={() => {
                    setIncludeAllDepartments(true);
                    setDepartmentName('');
                    setDepartmentsOpen(false);
                  }}
                >
                  All departments
                </div>
                {departments.map((dept) => (
                  <div
                    key={dept._id || dept.name}
                    style={styles.dropdownItem}
                    onClick={() => {
                      setIncludeAllDepartments(false);
                      setDepartmentName(dept.name);
                      setDepartmentsOpen(false);
                    }}
                  >
                    {dept.name}
                  </div>
                ))}
              </div>
            )}
            <div style={styles.muted}>
              {includeAllDepartments ? 'Reports include all departments.' : `Reports limited to: ${departmentName || 'Selected department'}`}
            </div>

            <div style={styles.divider} />

            <label style={styles.label}>Email subject template</label>
            <input style={styles.input} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />

            <label style={styles.label}>Salutation</label>
            <input style={styles.input} value={emailSalutation} onChange={(e) => setEmailSalutation(e.target.value)} />

            <label style={styles.label}>Email body template</label>
            <textarea style={{ ...styles.input, minHeight: 110 }} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />

            <label style={styles.label}>Email signature</label>
            <input style={styles.input} value={emailSignature} onChange={(e) => setEmailSignature(e.target.value)} />

            <label style={styles.label}>WhatsApp message template</label>
            <textarea style={{ ...styles.input, minHeight: 70 }} value={whatsappMessage} onChange={(e) => setWhatsappMessage(e.target.value)} />

            <div style={styles.tokensRow}>
              <div style={styles.label}>Template tokens</div>
              <div style={styles.infoBadge} onClick={() => setShowPreview(true)}>i</div>
            </div>
            <div style={styles.muted}>
              {'{{reportType}} {{periodLabel}} {{totalStaff}} {{totalDays}} {{totalLate}} {{totalHours}} {{signature}} {{salutation}}'}
            </div>

            <button
              type="button"
              style={{ ...styles.button, ...(savingEmail ? styles.buttonDisabled : {}) }}
              onClick={() => saveSettings('email')}
              disabled={savingEmail}
            >
              {savingEmail ? 'Saving...' : 'Save Email Setup'}
            </button>

            <div style={styles.divider} />

            <label style={styles.label}>Send test email</label>
            <div style={styles.muted}>Sends a quick test via backend SMTP to confirm delivery.</div>
            <input style={styles.input} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="name@example.com" />
            <button
              type="button"
              style={{ ...styles.button, ...(sendingTest ? styles.buttonDisabled : {}) }}
              onClick={sendTestEmail}
              disabled={sendingTest}
            >
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
            {testStatus && <div style={styles.muted}>{testStatus}</div>}
          </>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader} onClick={() => setRegistrationOpen((prev) => !prev)}>
          <div>
            <div style={styles.sectionTitle}>3) Registration Auto Setup</div>
            <div style={styles.sectionHint}>Automatic account creation emails with credentials and password-change guidance.</div>
          </div>
          <div style={styles.chevron}>{registrationOpen ? 'v' : '>'}</div>
        </div>
        {registrationOpen && (
          <>
            <div style={{ ...styles.tokensRow, marginTop: 8 }}>
              <div style={styles.label}>Section guide</div>
              <div style={styles.infoBadge} onClick={() => setShowRegistrationInfo(true)}>i</div>
            </div>

            <div style={styles.row}>
              <div style={styles.label}>Intern/Staff Account Creation Email</div>
              <input type="checkbox" checked={staffRegEnabled} onChange={(e) => setStaffRegEnabled(e.target.checked)} />
            </div>
            <label style={styles.label}>Subject</label>
            <input style={styles.input} value={staffRegSubject} onChange={(e) => setStaffRegSubject(e.target.value)} />
            <label style={styles.label}>Email body</label>
            <textarea style={{ ...styles.input, minHeight: 110 }} value={staffRegBody} onChange={(e) => setStaffRegBody(e.target.value)} />

            <div style={styles.divider} />

            <div style={styles.row}>
              <div style={styles.label}>Host Company Account Creation Email</div>
              <input type="checkbox" checked={hostRegEnabled} onChange={(e) => setHostRegEnabled(e.target.checked)} />
            </div>
            <label style={styles.label}>Subject</label>
            <input style={styles.input} value={hostRegSubject} onChange={(e) => setHostRegSubject(e.target.value)} />
            <label style={styles.label}>Email body</label>
            <textarea style={{ ...styles.input, minHeight: 110 }} value={hostRegBody} onChange={(e) => setHostRegBody(e.target.value)} />

            <div style={styles.label}>Registration template tokens</div>
            <div style={styles.muted}>
              {'{{fullName}} {{role}} {{companyName}} {{mentorName}} {{username}} {{temporaryPassword}} {{loginUrl}} {{signature}}'}
            </div>

            <button
              type="button"
              style={{ ...styles.button, ...(savingRegistration ? styles.buttonDisabled : {}) }}
              onClick={() => saveSettings('registration')}
              disabled={savingRegistration}
            >
              {savingRegistration ? 'Saving...' : 'Save Registration Setup'}
            </button>
          </>
        )}
      </div>

      {showPreview && (
        <div style={styles.modalBackdrop} onClick={() => setShowPreview(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Email Preview</div>
              <button type="button" onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', color: '#1f2a44', fontWeight: 700 }}>Close</button>
            </div>
            <div style={styles.gmailCard}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{previewSubject || 'Auto Report'}</div>
              <div style={styles.gmailMeta}>From: {previewData.signature}</div>
              <div style={styles.gmailMeta}>To: {previewRecipient}</div>
              <div style={styles.gmailMeta}>Attachment: Timesheet Report (PDF)</div>
              <div style={styles.gmailDivider} />
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5 }}>{previewBody || DEFAULT_EMAIL_BODY}</div>
            </div>
          </div>
        </div>
      )}

      {showRegistrationInfo && (
        <div style={styles.modalBackdrop} onClick={() => setShowRegistrationInfo(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Registration Emails</div>
              <button type="button" onClick={() => setShowRegistrationInfo(false)} style={{ background: 'none', border: 'none', color: '#1f2a44', fontWeight: 700 }}>Close</button>
            </div>
            <div style={{ background: '#f7f5ee', border: '1px solid #e2ded3', borderRadius: 10, padding: 12 }}>
              <p style={{ marginTop: 0 }}>
                This section controls automatic emails sent when a new staff/intern or host company account is created.
                The message includes login credentials and a notice to change their password after first login.
              </p>
              <p style={{ marginBottom: 0 }}>
                Use the tokens listed below the templates to insert names, usernames, temporary passwords, and login links.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
