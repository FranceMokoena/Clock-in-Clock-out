const DEFAULT_TEMPLATES = {
  emailSubject: 'Auto Report - {{reportType}} ({{periodLabel}})',
  emailBody: '{{salutation}}\n\nPlease find the attached {{reportType}} report for {{periodLabel}}.\n\nSummary:\n- Total staff: {{totalStaff}}\n- Total days: {{totalDays}}\n- Late clock-ins: {{totalLate}}\n- Total hours: {{totalHours}}\n\nRegards,\n{{signature}}',
  whatsappMessage: 'Auto report: {{reportType}} ({{periodLabel}}). Total staff: {{totalStaff}}, late: {{totalLate}}.',
  emailSignature: 'Internship Success',
  emailSalutation: 'Dear Sir/Madam,',
};

const renderTemplate = (template, data) => {
  if (!template) return '';
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const trimmed = String(key || '').trim();
    const value = data && Object.prototype.hasOwnProperty.call(data, trimmed) ? data[trimmed] : '';
    return value == null ? '' : String(value);
  });
};

const buildTemplateData = (report, settings = {}) => {
  const periodStart = report.periodStart ? new Date(report.periodStart) : null;
  const periodEnd = report.periodEnd ? new Date(report.periodEnd) : null;
  const periodLabel = periodStart && periodEnd
    ? `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
    : 'N/A';

  return {
    reportType: report.reportType || 'report',
    periodLabel,
    totalStaff: report.summary?.totalStaff ?? 0,
    totalDays: report.summary?.totalDays ?? 0,
    totalLate: report.summary?.totalLate ?? 0,
    totalHours: report.summary?.totalHours ?? 0,
    signature: settings.templates?.emailSignature || DEFAULT_TEMPLATES.emailSignature,
    salutation: settings.templates?.emailSalutation || DEFAULT_TEMPLATES.emailSalutation,
    recipientName: settings.ownerType || 'Admin',
  };
};

const getTemplateSet = (settings = {}) => ({
  emailSubject: settings.templates?.emailSubject || DEFAULT_TEMPLATES.emailSubject,
  emailBody: settings.templates?.emailBody || DEFAULT_TEMPLATES.emailBody,
  whatsappMessage: settings.templates?.whatsappMessage || DEFAULT_TEMPLATES.whatsappMessage,
  emailSignature: settings.templates?.emailSignature || DEFAULT_TEMPLATES.emailSignature,
  emailSalutation: settings.templates?.emailSalutation || DEFAULT_TEMPLATES.emailSalutation,
});

module.exports = {
  DEFAULT_TEMPLATES,
  renderTemplate,
  buildTemplateData,
  getTemplateSet,
};
