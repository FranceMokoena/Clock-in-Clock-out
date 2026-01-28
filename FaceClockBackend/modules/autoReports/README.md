# Auto Reports Module

This folder contains backend logic for the auto reports feature:
- Weekly and monthly summary reports
- Late and missing clock-in detection
- PDF generation and delivery (email ready, WhatsApp stub)
- Templates and settings

Wire in SMTP settings in `.env` to enable email delivery.

# //TO GENERATE AUTO REPORT FOR DESIRED TIME


node -e "require('dotenv').config(); const mongoose=require('mongoose'); require('./models/HostCompany'); const ReportSettings=require('./models/ReportSettings'); const Staff=require('./models/Staff'); const ClockLog=require('./models/ClockLog'); const {DateTime}=require('luxon'); const {parseTimeString}=require('./modules/autoReports/timeUtils'); const reportGenerator=require('./modules/autoReports/reportGenerator'); const {generateReportPdf}=require('./modules/autoReports/pdfGenerator'); (async()=>{ await mongoose.connect(process.env.MONGO_URI); const settings=await ReportSettings.findOne({ownerType:'Admin'}).lean(); if(!settings){console.log('No ReportSettings found'); process.exit(1);} const tz=settings.timezone||'Africa/Johannesburg'; const lastLog=await ClockLog.findOne({clockType:'in'}).sort({timestamp:-1}).lean(); if(!lastLog){console.log('No clock-in logs found'); process.exit(1);} const staff=await Staff.findById(lastLog.staffId).populate('hostCompanyId','defaultClockInTime defaultClockOutTime defaultBreakStartTime defaultBreakEndTime companyName name').lean(); if(!staff){console.log('Staff not found'); process.exit(1);} const clockIn=DateTime.fromJSDate(lastLog.timestamp).setZone(tz); let diff=15; const expected=staff.clockInTime||staff.hostCompanyId?.defaultClockInTime; const parsed=expected?parseTimeString(expected):null; if(parsed){ const expectedTime=clockIn.set({hour:parsed.hour, minute:parsed.minute, second:0, millisecond:0}); diff=Math.max(1, Math.round(clockIn.diff(expectedTime,'minutes').minutes)); } const report=await reportGenerator.buildLateClockInReport({ staff, timestamp:lastLog.timestamp, timeDiffMinutes:diff, ownerType:settings.ownerType, ownerId:settings.ownerId, timezone:tz, graceMinutes:settings?.lateRule?.graceMinutes ?? 30 }); report.periodKey=`manual-late-${DateTime.now().toFormat('yyyyLLdd-HHmmss')}`; const pdf=await generateReportPdf(report); console.log('PDF:', pdf.filePath); process.exit(0); })().catch(err=>{console.error(err.message||err); process.exit(1);});"