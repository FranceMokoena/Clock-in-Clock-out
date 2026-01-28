const nodemailer = require('nodemailer');
const { generateReportPdf } = require('./pdfGenerator');
const { renderTemplate, buildTemplateData, getTemplateSet } = require('./reportTemplates');

const getSmtpTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const buildFromAddress = () => {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'Biometric Attendance System';
  if (!fromEmail) return undefined;
  return fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
};

const sendEmailReport = async ({ to, subject, text, attachments }) => {
  const transport = getSmtpTransport();
  if (!transport) {
    return { sent: false, skipped: true, reason: 'SMTP not configured' };
  }

  const from = buildFromAddress();
  const info = await transport.sendMail({
    from,
    to,
    subject,
    text,
    attachments,
  });

  return { sent: true, messageId: info.messageId };
};

const sendPlainEmail = async ({ to, subject, text }) => {
  return sendEmailReport({ to, subject, text, attachments: undefined });
};

const sendTestEmail = async ({ to }) => {
  const transport = getSmtpTransport();
  if (!transport) {
    return { sent: false, skipped: true, reason: 'SMTP not configured' };
  }
  if (!to) {
    return { sent: false, skipped: true, reason: 'Missing test email recipient' };
  }

  const from = buildFromAddress();
  const info = await transport.sendMail({
    from,
    to,
    subject: 'SMTP Test Successful',
    text: 'Your Gmail SMTP configuration is working correctly.',
  });

  return { sent: true, messageId: info.messageId };
};

const getSmtpStatus = () => {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER || '';
  const fromName = process.env.SMTP_FROM_NAME || 'Biometric Attendance System';
  return {
    configured: Boolean(host && user && process.env.SMTP_PASS),
    host,
    port,
    secure,
    user,
    fromName,
  };
};

const sendWhatsAppReport = async ({ to }) => {
  if (!to || !to.length) {
    return { sent: false, skipped: true, reason: 'No WhatsApp recipients' };
  }
  if (!process.env.WHATSAPP_API_URL) {
    return { sent: false, skipped: true, reason: 'WhatsApp provider not configured' };
  }
  return { sent: false, skipped: true, reason: 'WhatsApp provider not implemented' };
};

const deliverReport = async ({ report, settings }) => {
  try {
    const pdf = await generateReportPdf(report);
    const templates = getTemplateSet(settings);
    const templateData = buildTemplateData(report, settings);

    const subject = renderTemplate(templates.emailSubject, templateData);
    const body = renderTemplate(templates.emailBody, templateData);
    const whatsappMessage = renderTemplate(templates.whatsappMessage, templateData);

    const emailRecipients = settings?.recipients?.emails || [];
    const whatsappRecipients = settings?.recipients?.whatsappNumbers || [];

    const emailResult = emailRecipients.length
      ? await sendEmailReport({
          to: emailRecipients.join(','),
          subject,
          text: body,
          attachments: [{ filename: pdf.fileName, path: pdf.filePath }],
        })
      : { sent: false, skipped: true, reason: 'No email recipients' };

    const whatsappResult = whatsappRecipients.length
      ? await sendWhatsAppReport({
          to: whatsappRecipients,
          message: whatsappMessage,
          filePath: pdf.filePath,
        })
      : { sent: false, skipped: true, reason: 'No WhatsApp recipients' };

    return {
      success: Boolean(emailResult.sent || whatsappResult.sent),
      filePath: pdf.filePath,
      emailResult,
      whatsappResult,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error?.message || 'Failed to deliver report',
    };
  }
};

module.exports = {
  deliverReport,
  sendTestEmail,
  getSmtpStatus,
  sendPlainEmail,
};
