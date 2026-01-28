# Audit Blogs System Map (Desktop UI)

## A) Where “blog entries” are created/stored
- Model/collection: `FaceClockBackend/models/Notification.js` (notifications are the audit/blog records).
- Writer service: `FaceClockBackend/utils/actionLogger.js` via `logAction()` -> creates `Notification` records.
- Known write locations:
  - `FaceClockBackend/routes/staff.js` logs: `CLOCK_IN`, `STAFF_REGISTERED`, `ATTENDANCE_CORRECTION_REQUEST`, `LEAVE_REQUEST`, `STAFF_REMOVED`, device approvals/revokes.
  - `FaceClockBackend/routes/rotations.js` logs rotation actions (`ROTATION_*`).
- Not found in codebase: explicit blog entries for network errors, unassigned location blocks, device mismatch blocks, or failed clock-in/out (beyond `FAILED_RECOGNITION`/`SECURITY_ALERT` message templates in `actionLogger.js`).
- Separate data source (not “blogs”): `FaceClockBackend/models/ClockLog.js` stores raw clock-in/out logs.

## B) How blog entries are fetched today
- Backend endpoint: `GET /api/notifications` in `FaceClockBackend/routes/notifications.js`.
- Desktop frontend usage:
  - `FaceClockDesktop/src/services/api.js` -> `dashboardAPI.getRecentActivity()` uses `/notifications`.
  - `FaceClockDesktop/src/components/Notifications/notificationService.js` uses `/notifications` for the bell/recents list.
- No dedicated “audit blog” endpoint found; Audit Blogs must read from `/notifications`.

## C) Auth/scoping rules
- `/api/notifications` filters by `recipientType` + `recipientId`:
  - Admin/HostCompany can also see `recipientType: 'All'`.
  - Intern/Staff are strictly scoped to their own `recipientId` or `subjectUserId`.
- `hostCompanyId` filter is applied via `data.payload.hostCompanyId`.
- `departmentId` filter is applied via `data.payload.departmentId`.
