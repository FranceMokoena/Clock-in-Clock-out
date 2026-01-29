# High-Level Overview

Monorepo with three runtime targets: Expo React Native mobile (FaceClockApp), Electron + React desktop (FaceClockDesktop), and Node/Express + MongoDB backend (FaceClockBackend). package.json (line 57), package.json (line 41), package.json (line 29), server.js (line 2)
Core goal is biometric clock-in/clock-out with face recognition and location validation backed by staff and clock log data. app.json (line 3), staff.js (line 812), faceRecognitionONNX.js (line 1), staff.js (line 1339), Staff.js (line 5), ClockLog.js (line 3)
Real-time notifications are built around Socket.IO with persisted notifications. server.js (line 35), Notification.js (line 3), notificationHandler.js (line 13), notificationHandler.js (line 12)
Automated reporting exists via report settings, scheduled runs, and delivery hooks. reportScheduler.js (line 1), ReportSettings.js (line 10), ReportRun.js (line 3), reportDelivery.js (line 1)
Architecture Map

# Key directory map:
FaceClockApp/
  App.js (navigation + providers)
  context/ (theme + notifications)
  screens/ (admin, intern, shared clocking)
  utils/ (notifications, device/face helpers)
  config/ (API base, Expo plugin)
FaceClockDesktop/
  main.js, preload.js (Electron main + IPC)
  src/
    App.js (routes + ProtectedRoute)
    context/ (auth)
    services/ (API wrapper)
    components/Notifications/
FaceClockBackend/
  server.js (Express + Socket.IO + Mongo)
  routes/ (staff, locations, notifications, rotations, reports)
  models/ (Mongoose schemas)
  utils/ (face recognition, caching, logging, geocoding)
  modules/autoReports/ (scheduler + delivery)
  config/ (locations dataset + validation)
Sources: App.js (line 3), ThemeContext.js (line 1), NotificationContext.js (line 1), AdminLogin.js (line 1), ClockIn.js (line 1), notificationHandler.js (line 13), api.js (line 1), app.plugin.js (line 1), main.js (line 1), preload.js (line 1), App.js (line 1), AuthContext.js (line 1), api.js (line 1), notificationService.js (line 1), server.js (line 1), staff.js (line 125), locations.js (line 9), notifications.js (line 18), rotations.js (line 647), reportSettings.js (line 77), reportRuns.js (line 18), Staff.js (line 5), faceRecognitionONNX.js (line 1), staffCache.js (line 1), reportScheduler.js (line 1), locations.js (line 1)
Startup/Runtime Flow

# Mobile startup sequence:
index.js -> App
  -> SafeAreaProvider -> ThemeProvider -> NotificationProvider
  -> FaceSplashScreen (6s) -> NavigationContainer -> Stack screens
Sources: index.js (line 1), App.js (line 139), App.js (line 144), App.js (line 151), App.js (line 152), App.js (line 153), App.js (line 154), App.js (line 111), App.js (line 119)

# Desktop startup sequence:
main.js (Electron) -> BrowserWindow loads React app
src/index.js -> App -> AuthProvider -> Router -> ProtectedRoute -> screens
Sources: main.js (line 24), index.js (line 14), App.js (line 94), App.js (line 95), App.js (line 68)

# Backend startup sequence:
server.js -> dotenv -> Express + Socket.IO -> Mongo connect -> route mount
-> staff cache warm -> auto report scheduler start -> listen on PORT
Sources: server.js (line 1), server.js (line 32), server.js (line 35), server.js (line 82), server.js (line 101), server.js (line 278), server.js (line 283)

# Auth & Roles

Admin login: mobile and desktop call /staff/login; backend handles admin and host company login within this route. AdminLogin.js (line 49), api.js (line 67), staff.js (line 1885), staff.js (line 1922)
Intern login: mobile posts multipart form (idNumber, password, device headers) to /staff/intern/login; backend route processes intern auth and supports test accounts. Login.js (line 50), staff.js (line 1966), staff.js (line 1977)
Desktop auth state: AuthProvider stores userInfo and authToken in localStorage; ProtectedRoute gates screens on user. AuthContext.js (line 12), AuthContext.js (line 33), App.js (line 68)
Desktop API wrapper attaches Authorization: Bearer <token> if present. api.js (line 13)
Role gating in APIs relies on explicit userRole or role params (not token claims) in rotations and intern reports. rotations.js (line 35), internReports.js (line 100)
Mobile login handlers pass userInfo into navigation; token persistence is not shown in those screens. AdminLogin.js (line 55), Login.js (line 71)
# Data Schema

Entities and fields (top-level; nested objects called out in notes):
Entity | Fields | Notes
Staff | name, surname, idNumber, phoneNumber, email, role, department, hostCompanyId, mentorId, mentorName, location, locationLatitude, locationLongitude, locationAddress, clockInTime, clockOutTime, breakStartTime, breakEndTime, extraHoursStartTime, extraHoursEndTime, faceEmbedding, faceEmbeddings, embeddingQualities, centroidEmbedding, idEmbedding, idEmbeddingQuality, idDocumentType, rekognitionCollectionId, rekognitionFaceIds, rekognitionEnabled, rekognitionLastSyncedAt, s3ImageKeys, s3Bucket, trustedDevices, facialFeatures, encryptedEmbedding, createdAt, isActive, profilePicture, stipendAmount, expectedWorkingDaysPerWeek, expectedWorkingDaysPerMonth, expectedHoursPerDay, expectedWeeklyHours, expectedMonthlyHours, rotationPlan, password | hostCompanyId ref HostCompany; mentorId ref Staff; trustedDevices and facialFeatures are subdocs; rotationPlan embeds currentDepartment + history
HostCompany | name, companyName, mentorName, registrationNumber, operatingHours, defaultClockInTime, defaultClockOutTime, defaultBreakStartTime, defaultBreakEndTime, emailAddress, businessType, industry, username, password, isActive, createdAt, updatedAt | password hashed
Department | name, departmentCode, companyName, mentorName, hostCompanyId, description, location, locationLatitude, locationLongitude, locationAddress, isActive, createdAt, updatedAt | hostCompanyId ref HostCompany
ClockLog | staffId, staffName, clockType, timestamp, confidence, deviceFingerprint, riskScore, signals | staffId ref Staff; signals include face/temporal/device/location
AttendanceCorrection | internId, internName, date, correctionType, originalClockLogId, requestedChange, supportingDocuments, status, reviewedBy, reviewedAt, rejectionReason, hostCompanyId, createdAt, updatedAt | internId ref Staff; requestedChange includes clockIn/clockOut/break/lunch + description
LeaveApplication | internId, internName, leaveType, startDate, endDate, numberOfDays, reason, supportingDocuments, status, createdByRole, createdById, reviewedBy, reviewedAt, rejectionReason, hostCompanyId, createdAt, updatedAt | internId ref Staff
InternReport | internId, hostCompanyId, reportType, severity, title, description, incidentDate, supportingNotes, submittedByRole, submittedByUserId, status, adminNotes, reviewedAt, reviewedByUserId | internId ref Staff; hostCompanyId ref HostCompany
Notification | recipientType, recipientId, subjectUserId, actorId, title, message, type, priority, data, source, deviceInfo, relatedEntities, deliveryChannels, deliveryStatus, isRead, readAt, isArchived, archivedAt, actionUrl, actionData, createdAt, expiresAt | subjectUserId/actorId ref Staff
PayrollRecord | staffId, staffName, date, clockInTime, clockOutTime, breakStartTime, breakEndTime, lunchStartTime, lunchEndTime, extraShiftStartTime, extraShiftEndTime, totalHoursWorked, breakDuration, lunchDuration, extraShiftHours, weekStartDate, month, year, hostCompanyId, isWeekend, isHoliday, notes, createdAt, updatedAt | staffId ref Staff
DeviceInfo | userId, userName, deviceFingerprint, deviceName, platform, brand, manufacturer, modelName, osVersion, appVersion, buildNumber, language, timezone, deviceId, screenWidth, screenHeight, screenScale, deviceType, hostCompanyId, isActive, firstSeenAt, lastSeenAt, createdAt, updatedAt | userId ref Staff; hostCompanyId ref HostCompany
DeviceQuality | deviceFingerprint, qualityTier, averageBlurVariance, averageImageWidth, averageImageHeight, averageBrightness, averageQualityScore, qualityHistory, totalClockIns, successfulClockIns, lastUpdated, firstSeen, lastSeen | qualityHistory stores blur/size/brightness/score/timestamp
FailedMatch | staffId, embedding, bestSimilarity, bestMatchStaffId, bestMatchStaffName, quality, timestamp, reason, reviewed, reviewNotes | staffId/bestMatchStaffId ref Staff
RotationPlan | userId, hostCompanyId, rotationPath, status, startDate, endDate, createdAt, updatedAt | rotationPath is array of Department refs
RotationAssignment | planId, userId, hostCompanyId, departmentId, startDate, endDate, durationType, durationValue, supervisorId, status, notes, reviewDate, createdAt, updatedAt | planId ref RotationPlan; departmentId ref Department; userId ref Staff
RotationApproval | assignmentId, supervisorRecommendation, supervisorNotes, supervisorAt, supervisorId, adminDecision, adminNotes, adminAt, adminId, createdAt, updatedAt | assignmentId ref RotationAssignment
RotationDecision | assignmentId, decisionType, notes, overrideFlag, actorId, decidedAt | assignmentId ref RotationAssignment
RotationHistory | userId, hostCompanyId, departmentId, startDate, endDate, evaluationSummary, outcome, supervisorId, adminId, decidedAt, createdAt | userId ref Staff; departmentId ref Department
ReportSettings | ownerType, ownerId, timezone, weekly, monthly, lateRule, recipients, filters, templates, registrationTemplates | weekly/monthly use schedule schema with enabled/dayOfWeek/time/sendOnLastDay
ReportRun | ownerType, ownerId, reportType, periodKey, periodStart, periodEnd, staffId, recipients, status, fileUrl, errorMessage | reportType in weekly/monthly/late/missing
Sources: Staff.js (line 5), HostCompany.js (line 4), Department.js (line 3), ClockLog.js (line 3), AttendanceCorrection.js (line 3), LeaveApplication.js (line 3), InternReport.js (line 3), Notification.js (line 3), PayrollRecord.js (line 3), DeviceInfo.js (line 3), DeviceQuality.js (line 8), FailedMatch.js (line 7), RotationPlan.js (line 3), RotationAssignment.js (line 3), RotationApproval.js (line 3), RotationDecision.js (line 3), RotationHistory.js (line 3), ReportSettings.js (line 3), ReportSettings.js (line 10), ReportRun.js (line 3)
# API Inventory

Base + health:
GET/POST /api/health - health + version + db status
ALL /api and / - API root listing
Sources: server.js (line 109), server.js (line 146), server.js (line 187)

Staff auth and clocking:
GET /api/staff/test
POST /api/staff/register - multipart: image1..image5, idImage + staff fields
POST /api/staff/clock - multipart: image + type + latitude/longitude
POST /api/staff/login - json: username, password
POST /api/staff/intern/login - multipart: idNumber, password, optional image + device headers
GET /api/staff/verify-registration
GET /api/staff/verify-clock
GET /api/staff/list
GET /api/staff/logs
GET /api/staff/cache/stats
POST /api/staff/cache/refresh
POST /api/staff/validate-preview - multipart: image
Sources: staff.js (line 125), staff.js (line 130), staff.js (line 812), staff.js (line 1885), staff.js (line 1966), staff.js (line 1678), staff.js (line 1708), staff.js (line 1746), staff.js (line 1813), staff.js (line 1860), staff.js (line 1871), staff.js (line 3802)

# Intern endpoints:
GET /api/staff/intern/dashboard - query: internId, period
GET /api/staff/intern/stipend - query: internId
GET /api/staff/intern/working-hours - query: internId
GET /api/staff/intern/attendance/detailed - query: internId, month, year
POST /api/staff/intern/attendance-corrections
GET /api/staff/intern/attendance-corrections
POST /api/staff/intern/leave-applications
GET /api/staff/intern/leave-applications
POST /api/staff/intern/upload-profile-picture - multipart
Sources: staff.js (line 2165), staff.js (line 2362), staff.js (line 2402), staff.js (line 2624), staff.js (line 3848), staff.js (line 3924), staff.js (line 4128), staff.js (line 4303), staff.js (line 4340)

# Admin endpoints (stats, staff, reports, accountability):
GET /api/staff/admin/stats
GET /api/staff/admin/staff
GET /api/staff/admin/staff/:staffId/day-details
GET /api/staff/admin/staff/:staffId/timesheet
GET /api/staff/admin/not-accountable
GET /api/staff/admin/reports/data
GET /api/staff/admin/attendance-corrections
PUT /api/staff/admin/attendance-corrections/:id
GET /api/staff/admin/leave-applications
PUT /api/staff/admin/leave-applications/:id
Sources: staff.js (line 2902), staff.js (line 3029), staff.js (line 3681), staff.js (line 4588), staff.js (line 3344), staff.js (line 4748), staff.js (line 3961), staff.js (line 4026), staff.js (line 4428), staff.js (line 4488)

# Admin endpoints (departments, host companies, diagnostics, devices, staff updates):
GET /api/staff/admin/departments
GET /api/staff/admin/departments/all
GET /api/staff/admin/departments-with-counts
GET /api/staff/admin/debug/department-staff-mapping
GET /api/staff/admin/departments/:id
POST /api/staff/admin/departments
PUT /api/staff/admin/departments/:id
DELETE /api/staff/admin/departments/:id
GET /api/staff/admin/host-companies
GET /api/staff/admin/host-companies/:id
POST /api/staff/admin/host-companies
PUT /api/staff/admin/host-companies/:id
DELETE /api/staff/admin/host-companies/:id
GET /api/staff/admin/diagnostics
GET /api/staff/admin/diagnostics/:id
PUT /api/staff/admin/staff/:staffId/stipend
PUT /api/staff/admin/staff/:staffId/working-hours
DELETE /api/staff/admin/staff/:staffId
GET /api/staff/admin/devices
PATCH /api/staff/admin/devices/:deviceId
Sources: staff.js (line 4960), staff.js (line 4977), staff.js (line 5003), staff.js (line 5073), staff.js (line 5115), staff.js (line 5152), staff.js (line 5292), staff.js (line 5427), staff.js (line 5477), staff.js (line 5534), staff.js (line 5593), staff.js (line 5752), staff.js (line 5894), staff.js (line 5971), staff.js (line 6032), staff.js (line 6106), staff.js (line 6166), staff.js (line 6248), staff.js (line 6304), staff.js (line 6365)

# Locations:
GET /api/locations/all
GET /api/locations/search
GET /api/locations/provinces
Sources: locations.js (line 9), locations.js (line 27), locations.js (line 55)

# Notifications:
GET /api/notifications - query filters (recipientId, recipientType, hostCompanyId, departmentId, isRead, limit, skip)
GET /api/notifications/unread-count
POST /api/notifications - create
POST /api/notifications/:id/read
POST /api/notifications/read-all
DELETE /api/notifications/delete-all
DELETE /api/notifications/:id
Sources: notifications.js (line 18), notifications.js (line 119), notifications.js (line 193), notifications.js (line 236), notifications.js (line 273), notifications.js (line 312), notifications.js (line 345)

# Intern reports:
POST /api/intern-reports
GET /api/intern-reports
GET /api/intern-reports/:reportId
PATCH /api/intern-reports/:reportId
Sources: internReports.js (line 10), internReports.js (line 100), internReports.js (line 208), internReports.js (line 259)

# Rotations:
GET /api/rotations/roster
GET /api/rotations/users/:userId/timeline
GET /api/rotations/users/:userId/dossier
POST /api/rotations/users/:userId/plan
POST /api/rotations/users/:userId/assign
POST /api/rotations/assignments/:assignmentId/evaluate
PATCH /api/rotations/assignments/:assignmentId/status
POST /api/rotations/assignments/:assignmentId/decide
Sources: rotations.js (line 647), rotations.js (line 846), rotations.js (line 903), rotations.js (line 946), rotations.js (line 1108), rotations.js (line 1262), rotations.js (line 1359), rotations.js (line 1580)

# Report settings + runs:
GET /api/report-settings
POST /api/report-settings
PUT /api/report-settings/:id
GET /api/report-settings/smtp/status
POST /api/report-settings/smtp/test
GET /api/report-runs
Sources: reportSettings.js (line 77), reportSettings.js (line 125), reportSettings.js (line 150), reportSettings.js (line 101), reportSettings.js (line 111), reportRuns.js (line 18)

# Client usage (desktop and mobile call patterns):
Desktop uses /staff/login, /staff/list, /staff/admin/staff, /staff/admin/stats, /staff/admin/not-accountable, /staff/admin/host-companies, /staff/admin/departments, /staff/admin/leave-applications, /staff/admin/attendance-corrections, /staff/admin/reports/data, /report-settings, /report-runs, /intern-reports, /notifications, /locations/all, /health
Mobile uses /staff/login, /staff/intern/login, /staff/register, /staff/clock, /notifications
Sources: api.js (line 67), api.js (line 75), api.js (line 79), api.js (line 210), api.js (line 375), api.js (line 251), api.js (line 275), api.js (line 299), api.js (line 346), api.js (line 329), api.js (line 391), api.js (line 412), api.js (line 429), api.js (line 239), api.js (line 219), AdminLogin.js (line 49), Login.js (line 58), RegisterStaff.js (line 1059), ClockIn.js (line 1427), notificationService.js (line 5)

# Route/Screen Map

Mobile navigation stack (React Navigation): MainMenu, RegisterStaff, ClockIn (Shared), Recents, AdminLogin, AdminDashboard, InternLogin, InternDashboard, InternAttendance, InternApplications, InternPayroll, InternReports, InternAttendanceCorrections, InternRotationPlan, UnifiedLogin. App.js (line 9), App.js (line 119)
Desktop routes (React Router): /login, /dashboard, /staff/:staffId, /leave-applications/:applicationId, /attendance-corrections/:correctionId, /reports/attendance-timesheet. App.js (line 99), App.js (line 133)
Feature Flows

Staff registration: mobile collects multiple images and posts multipart form to /staff/register; backend validates fields, geocodes/assigns location, stores Staff record, and can send registration email using templates. RegisterStaff.js (line 1059), staff.js (line 130), staff.js (line 239), Staff.js (line 5), staff.js (line 648), ReportSettings.js (line 36)
Clock-in/out: mobile uses camera + location, posts to /staff/clock with device headers; backend does Rekognition then ONNX fallback, validates location, enforces one-per-day for core events, writes ClockLog and emits notifications. ClockIn.js (line 16), ClockIn.js (line 1427), staff.js (line 812), staff.js (line 859), faceRecognitionONNX.js (line 1), staff.js (line 1339), staff.js (line 1111), ClockLog.js (line 3), actionLogger.js (line 66), eventEmitter.js (line 59)
Notifications: backend logs actions into Notification model and emits Socket.IO events; API supports list/unread/mark read; clients connect via Socket.IO and poll/fetch for updates. actionLogger.js (line 66), Notification.js (line 3), notifications.js (line 18), notificationHandler.js (line 13), NotificationContext.js (line 39), notificationHandler.js (line 12)
Attendance corrections: interns submit requests; admin lists and updates status; stored in AttendanceCorrection model with requestedChange and supporting documents. staff.js (line 3848), staff.js (line 3961), staff.js (line 4026), AttendanceCorrection.js (line 3)
Leave applications: interns submit, admins review; stored in LeaveApplication model. staff.js (line 4128), staff.js (line 4428), staff.js (line 4488), LeaveApplication.js (line 3)
Intern reports (developer/disciplinary reports): role-filtered create/read/update in /intern-reports, stored in InternReport model. internReports.js (line 10), internReports.js (line 100), internReports.js (line 259), InternReport.js (line 3)
Rotations: roster and user timelines/dossiers plus plan/assign/evaluate/decide flows; stored across rotation models; evidence uses attendance-based defaults. rotations.js (line 647), rotations.js (line 946), RotationPlan.js (line 3), RotationAssignment.js (line 3), RotationApproval.js (line 3), RotationDecision.js (line 3), RotationHistory.js (line 3), rotationEvidence.js (line 104)
Auto reports: scheduler reads ReportSettings, generates ReportRun entries, and delivers reports via SMTP or WhatsApp placeholder. reportScheduler.js (line 1), ReportSettings.js (line 10), ReportRun.js (line 3), reportDelivery.js (line 1)
Device management and quality: device fingerprints are sent from mobile; DeviceInfo and DeviceQuality track hardware and camera quality; admin can list and patch devices. ClockIn.js (line 1427), DeviceInfo.js (line 3), DeviceQuality.js (line 8), staff.js (line 6304), staff.js (line 6365)
Diagnostics: admin diagnostics endpoint surfaces embedding counts and quality for staff re-enrollment decisions. staff.js (line 5971)
Location system: location dataset + validation helpers in config/locations, served via /locations; staff clocking validates proximity to stored coordinates. locations.js (line 1), locations.js (line 9), staff.js (line 1339)
Config & Env Vars

Mobile: API base uses EXPO_PUBLIC_API_URL and EXPO_PUBLIC_BACKEND_IP; EAS sets EXPO_PUBLIC_API_ENV; app identifiers/permissions in app.json; compileSdk patch plugin in app.plugin.js. api.js (line 12), api.js (line 33), eas.json (line 18), app.json (line 14), app.plugin.js (line 6)
Desktop: REACT_APP_API_URL controls API base; Electron uses NODE_ENV and FORCE_DESKTOP_PROD for dev/prod behavior. api.js (line 3), main.js (line 3), main.js (line 4)
Backend: MONGO_URI, PORT, API_BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, PORTAL_LOGIN_URL, APP_LOGIN_URL, AWS and S3 config, device fingerprint secret, Azure Face config, SMTP and WhatsApp config, report time zone, rotation tuning, default clock times, encryption key. server.js (line 18), server.js (line 65), server.js (line 283), staff.js (line 1904), staff.js (line 648), rekognitionClient.js (line 14), rekognitionClient.js (line 41), rekognitionClient.js (line 66), faceRecognitionONNX.js (line 201), azureFaceClient.js (line 14), reportDelivery.js (line 6), reportDelivery.js (line 91), timeUtils.js (line 3), rotations.js (line 20), rotationEvidence.js (line 104), rotationEvidence.js (line 135), Staff.js (line 504)
Findings + Risks
# THIS CODE IS MOST LIKELY DEAD...i neeed to remove it
P0: Default admin credentials are accepted when env vars are missing (admin / admin123), granting admin access without DB validation. staff.js (line 1903)
P0: Authorization decisions in several endpoints rely on client-supplied userRole or query params; server mounts routes without auth middleware, so role spoofing is possible. server.js (line 101), rotations.js (line 35), internReports.js (line 100)
P0: Mobile notification handler uses hardcoded http://localhost:5000/api for mark-as-read, which will fail in production and bypass configured API base. notificationHandler.js (line 302)
P1: Test accounts bypass face recognition in intern login and can return mock user data; this is risky if left enabled in production. staff.js (line 1977)
P1: ENCRYPTION_KEY falls back to a random value if missing or short; this can break decryption of stored embeddings across restarts. Staff.js (line 504)
P1: Desktop API wrapper calls endpoints not implemented in backend (PUT /staff/admin/staff/:id and PUT /staff/admin/staff/:id/rotation-plan), likely resulting in 404s or silent failures. api.js (line 160), api.js (line 146), staff.js (line 6106), staff.js (line 6166)
P2: Likely dead code: ClockIn.js exists but main navigator imports the shared clock screen instead. ClockIn.js (line 1), App.js (line 11)
P2: Duplicate Staff model file (Staff (1).js) and unused Azure face client suggest dead or legacy code paths. Staff (1).js (line 5), azureFaceClient.js (line 1)







# Recommended Roadmap FIXES AND ADJUSTMENT FOR SYSTEM ACCURACY AND RELIABILITY

Lock down auth: add JWT/session verification middleware in backend; move role/host scoping into verified claims and remove reliance on client-supplied userRole.
Remove defaults and test shortcuts: replace hardcoded admin credentials and test intern flows with environment-gated dev-only switches.
Align API contracts: either add missing backend endpoints used by desktop or update desktop wrapper to call existing routes.
Fix environment consistency: eliminate hardcoded localhost URLs in mobile notification handler; standardize API base for all clients.
Observability upgrades: expand diagnostics to include runtime errors and report runs, and add structured logging/metrics.
Clean up dead code and add tests: remove duplicate models/unused modules and add at least API integration tests for auth, clocking, and reports.

# Audit Center Access Control (Immediate Requirement)

- Developer Reports must be Admin-only.
- Host Company users should not see the "Developer Reports" tab or its content, even if they navigate directly.
- All developer-report data fetches should be guarded by Admin role checks.

# Diagnostics and Self-Monitoring Spec

Purpose
- Provide a human-readable, operator-grade view of system health, failures, and business-logic risks.
- Surface issues that matter to decision-makers (not raw logs).

Data Sources (Existing)
- Health: /api/health (uptime, DB status, memory, websocket counts).
- Cache: /api/staff/cache/stats (face cache status).
- Reports: /api/report-runs (queued/failed runs).
- Face diagnostics: /api/staff/admin/diagnostics (embedding quality and re-enroll flags).

Diagnostics Panels
- System Overview: API status, DB status, uptime, memory, active sockets.
- Error Feed: recent critical notifications + failed report runs.
- Background Jobs: report scheduler state + last 10 report runs.
- Self-Monitoring Checks (rule engine):
  - Face data quality: % of staff with <3 embeddings OR centroidQuality < 0.70.
  - Device trust drift: % of recent clock-ins from untrusted devices.
  - Location failures: count of 403 location failures in last 24h.
  - Clock anomalies: duplicate clock attempts rejected in last 24h.
  - Reporting health: report runs failed in last 7 days.
  - Data integrity: staff missing hostCompanyId or department.

Output Format
- Each check returns: status (OK/WARN/CRITICAL), short label, human explanation, last updated timestamp.
- Each card links to a drilldown table (optional).

Retention
- 30-day rolling windows for trend checks.
- 7-day window for operational alerts.

Access Control
- Admin-only.
- Host companies see only scoped operational tabs (Event Log, Detectors) and no system diagnostics.

# Mobile App Health Monitoring Spec

Goal
- Show live health of the mobile fleet: connectivity, API reliability, camera/location readiness, and last-seen activity.

Client Telemetry (to implement)
- Mobile heartbeat payload (sent every 5-10 minutes while app is open):
  - deviceId, staffId, appVersion, buildNumber, platform, timezone
  - lastClockAction timestamp
  - API base URL
  - network status (online/offline, latency sample)
  - websocket state (connected/disconnected)
  - camera permission status, location permission status
  - last error (type, message, timestamp)

Backend Storage (to implement)
- New collection: MobileHealth
  - staffId, deviceId, appVersion, platform, lastSeenAt, lastError, apiLatencyMs, socketStatus, permissions, networkStatus
  - indexes on staffId + lastSeenAt

UI Panels (Audit Center)
- Mobile Health Summary:
  - Active devices (last 30 min)
  - Offline devices (last 24h)
  - High error rate devices
  - Outdated app versions
- Device Health Table:
  - Staff name, device id, app version, last seen, socket status, API latency, permissions
- Failure Feed:
  - Last 50 mobile errors with human-readable description and device/staff context

Alerts
- CRITICAL: >5% devices reporting API errors in last hour.
- WARNING: average API latency > 2s for 15 minutes.
- WARNING: camera or location permission revoked for active staff.

Security and Privacy
- Do not store photos or raw biometrics in telemetry.
- Hash device identifiers if needed.
Appendix: File Citations

Mobile core: index.js (line 1), App.js (line 3), AdminLogin.js (line 49), Login.js (line 58), RegisterStaff.js (line 1059), ClockIn.js (line 1427), ThemeContext.js (line 1), NotificationContext.js (line 1), notificationHandler.js (line 13), api.js (line 12), app.json (line 14), eas.json (line 18), app.plugin.js (line 6)
Desktop core: main.js (line 24), preload.js (line 1), index.js (line 14), App.js (line 94), AuthContext.js (line 12), api.js (line 67), api.js (line 3), notificationHandler.js (line 12)
Backend core: server.js (line 32), staff.js (line 130), notifications.js (line 18), rotations.js (line 647), locations.js (line 9), internReports.js (line 10), reportSettings.js (line 77), reportRuns.js (line 18), faceRecognitionONNX.js (line 1), rekognitionClient.js (line 14), actionLogger.js (line 66), eventEmitter.js (line 33), rotationEvidence.js (line 104), reportScheduler.js (line 1), reportDelivery.js (line 1), timeUtils.js (line 3)
Backend models: Staff.js (line 5), HostCompany.js (line 4), Department.js (line 3), ClockLog.js (line 3), AttendanceCorrection.js (line 3), LeaveApplication.js (line 3), InternReport.js (line 3), Notification.js (line 3), PayrollRecord.js (line 3), DeviceInfo.js (line 3), DeviceQuality.js (line 8), FailedMatch.js (line 7), RotationPlan.js (line 3), RotationAssignment.js (line 3), RotationApproval.js (line 3), RotationDecision.js (line 3), RotationHistory.js (line 3), ReportSettings.js (line 10), ReportRun.js (line 3), Staff (1).js (line 5)
