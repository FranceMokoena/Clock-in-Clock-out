# Multi-Role Notification System - Implementation Specification

## CURRENT STATE (Admin Desktop - Reference)
- **Socket.IO Auth**: `{userId, userType: 'Admin'}`
- **DB Model**: `Notification` with `recipientType` (Admin, HR, All) and `recipientId`
- **Notification API**: GET /api/notifications, POST /read, etc.
- **Service Pattern**: NotificationService (Socket.IO events) + NotificationContext (React state)

## ADDITIONS NEEDED

### A. BACKEND (FaceClockBackend)

#### 1. notificationRules.js - ADD CASES
```
NEW ACTION TYPES:
- INTERN_REPORTED
- INTERN_FLAGGED
- INTERN_NOT_ACCOUNTABLE
- INTERN_MISSING_CLOCKIN
- INTERN_MISSING_CLOCKOUT

- STAFF_CLOCKIN (for host company)
- STAFF_CLOCKIN_LATE (for host company)
- STAFF_MISSING_CLOCKIN (for host company)
- STAFF_MISSING_CLOCKOUT (for host company)
- STAFF_ABSENT (for host company)
- REPORT_ACTION_TAKEN (for host company)
- STAFF_REGISTERED (for host company - already exists)
```

#### 2. eventEmitter.js - ADD METHODS
```
- emitToIntern(internId, notification)
- emitToHostCompany(hostCompanyId, notification)
- Socket rooms: 'intern:{internId}' and 'company:{companyId}'
```

#### 3. Clock-in routes (staff.js) - ADD EMITTERS
When clock-in/out detected late/missing → emit notifications

#### 4. Notification Model - VERIFY
Already has `recipientType` enum → ADD 'HostCompany' and 'Intern'

---

### B. MOBILE APP (FaceClockApp)

#### 1. Intern Dashboard
- Import NotificationBell component
- Pass navigation
- Show bell in header
- Recents screen already created

#### 2. Host Company Mobile (NEW SCREENS)
- HostCompanyLogin.js (if not exists)
- HostCompanyDashboard.js
- NotificationBell in header
- Recents screen specific to company

---

### C. DESKTOP APP (FaceClockDesktop)

#### 1. Host Company Dashboard (NEW)
- HostCompanyDashboard.jsx component
- NotificationBell same as Admin
- NotificationPanel same as Admin
- But filter notifications by hostCompanyId

---

## SOCKET.IO ROOM STRATEGY
```
Admin connects: Admin:000000000000000000000001
Intern connects: Intern:{internId}
Host Company: HostCompany:{companyId}

Emit patterns:
- Admin notifications: emit to Admin rooms
- Intern notifications: emit to Intern:{internId} room
- Host Company notifications: emit to HostCompany:{companyId} room
```

## DB SCHEMA COMPATIBILITY
No schema change needed - just use existing fields:
- `recipientType`: 'Admin' | 'HostCompany' | 'Intern'
- `recipientId`: userId or companyId or internId
- `relatedEntities.hostCompanyId`: for filtering
- `relatedEntities.staffId`: for filtering

## TIMELINE
1. Backend notification emitters (1 hour)
2. Mobile app Intern notifications (1 hour)
3. Mobile app Host Company (1 hour)
4. Desktop Host Company (1 hour)
5. Testing (1 hour)
