# PHASE 1: TECHNICAL SUMMARY
## Project Understanding & Architecture Analysis

**Date**: 2025-01-27  
**Scope**: Face Clock-in/Clock-out System - Full Stack Refactoring

---

## 📁 PROJECT STRUCTURE

### Backend (`FaceClockBackend/`)
- **Entry**: `server.js` - Express server with Socket.IO
- **Models**: `models/` - Mongoose schemas (Staff, ClockLog, Department, HostCompany, PayrollRecord, Notification, etc.)
- **Routes**: `routes/staff.js` (5859+ lines - needs modularization)
- **Utils**: `utils/` - Face recognition, notifications, event emitter, geocoding
- **Database**: MongoDB (Mongoose ODM)

### Mobile App (`FaceClockApp/`)
- **Entry**: `App.js` - React Native with Expo, navigation stack
- **Screens**: `screens/` - AdminDashboard (11K+ lines), Intern screens, Shared screens
- **Components**: `components/` - NotificationBell, NotificationPanel, etc.
- **Context**: `context/` - ThemeContext, NotificationContext
- **Config**: `config/api.js` - API URL configuration

### Desktop App (`FaceClockDesktop/`)
- **Entry**: `main.js` - Electron app
- **Frontend**: `src/` - React components (Dashboard, StaffList, Departments, etc.)
- **Services**: `src/services/api.js` - API client

---

## 🏗️ ARCHITECTURE OVERVIEW

### Data Flow
```
Mobile/Desktop App → API Endpoints (routes/staff.js) → MongoDB Models → Response → Frontend State Update
```

### Key Technologies
- **Backend**: Node.js + Express + MongoDB + Socket.IO
- **Mobile**: React Native + Expo
- **Desktop**: Electron + React
- **Face Recognition**: ONNX Runtime (SCRFD + ArcFace)

---

## 👥 ROLES & PERMISSIONS

**Roles Defined in Staff Model:**
- `'Intern'` - Internship participants
- `'Staff'` - Regular staff members  
- `'Other'` - Other role types

**User Types (from Notification model):**
- `'HR'` - HR personnel
- `'HostCompany'` - Host company representatives
- `'Intern'` - Intern users
- `'Admin'` - System administrators
- `'DepartmentManager'` - Department managers
- `'Staff'` - Staff users
- `'All'` - Broadcast to all

**Access Control:**
- Admin: Full system access
- Host Company: Access to their interns/staff only (filtered by `hostCompanyId`)
- Intern/Staff: Self-access only (filtered by `staffId`)

---

## 📊 DATABASE SCHEMA

### Staff Model (`models/Staff.js`)
**Key Fields:**
- `stipendAmount` (Number, optional, min: 0) - **Single source of truth for stipend**
- `expectedWorkingDaysPerWeek` (Number, optional)
- `expectedWorkingDaysPerMonth` (Number, optional)
- `expectedHoursPerDay` (Number, optional)
- `expectedWeeklyHours` (Number, optional)
- `expectedMonthlyHours` (Number, optional)
- `clockInTime`, `clockOutTime`, `breakStartTime`, `breakEndTime` (String, HH:MM format)
- `hostCompanyId` (ObjectId, ref: 'HostCompany')
- `department` (String) - Stores department name (NOT ObjectId reference)
- `role` (enum: ['Intern', 'Staff', 'Other'])
- Face embeddings, profile picture, trusted devices, etc.

**Working Hours Source of Truth**: Staff model fields (lines 371-395)

### PayrollRecord Model (`models/PayrollRecord.js`)
**Fields:**
- `staffId` (ObjectId, ref: 'Staff')
- `totalHoursWorked` (Number)
- `clockInTime`, `clockOutTime`, `breakStartTime`, `breakEndTime` (Date)
- `weekStartDate`, `month`, `year` (for aggregations)
- `hostCompanyId` (ObjectId, ref: 'HostCompany')

**Purpose**: Calculated hours from actual clock logs, used for payroll computation

### Notification Model (`models/Notification.js`)
**Key Fields:**
- `recipientType` (enum: ['HR', 'HostCompany', 'Intern', 'All', 'Admin', 'DepartmentManager', 'Staff'])
- `recipientId` (ObjectId, optional) - **CRITICAL: Must match correct user**
- `subjectUserId` - **NOT PRESENT** - Need to add this field
- `actorId` - **NOT PRESENT** - Need to add this field
- `relatedEntities.staffId` (ObjectId) - Who the notification is about
- `type`, `message`, `priority`, `isRead`

**ISSUE**: No `subjectUserId` or `actorId` fields - these need to be added for proper routing

### Department Model (`models/Department.js`)
**Fields:**
- `name` (String, unique)
- `hostCompanyId` (ObjectId, ref: 'HostCompany')
- `location`, `locationLatitude`, `locationLongitude`

**Note**: Staff members reference departments by name (string), NOT by ObjectId

---

## 🔌 API ENDPOINTS

### Stipend & Working Hours Endpoints

**GET `/api/staff/intern/stipend`** (Line 2150)
- Params: `internId`
- Returns: `{ success, stipendAmount }`
- **Status**: ✅ Exists

**GET `/api/staff/intern/working-hours`** (Line 2190)
- Params: `internId`, `month`, `year` (optional)
- Returns: Working hours fields from Staff model
- **Status**: ✅ Exists

**PUT `/api/staff/admin/staff/:staffId/stipend`** (Line 5799)
- Body: `{ stipendAmount }`
- Updates: `staff.stipendAmount`
- **Status**: ✅ Exists

**PUT `/api/staff/admin/staff/:staffId/working-hours`** (Line 5859)
- Body: `{ expectedWorkingDaysPerWeek, expectedWorkingDaysPerMonth, expectedHoursPerDay, expectedWeeklyHours, expectedMonthlyHours }`
- Updates: All working hours fields on Staff model
- **Status**: ✅ Exists

### Department Endpoints

**GET `/api/staff/admin/departments-with-counts`** (Line 4723)
- **ISSUE**: Line 4746 filters by `role: 'Intern'` only
- **FIX NEEDED**: Include `'Staff'` role: `{ role: { $in: ['Intern', 'Staff'] } }`

**GET `/api/staff/list`** (Line 1536)
- Params: `hostCompanyId`, `departmentId`
- Returns: All active staff matching filters
- **Status**: ✅ Works (no role filter applied here - good)

---

## 🔔 NOTIFICATION SYSTEM

### Current Flow
1. Action occurs (clock-in, leave request, etc.)
2. `logAction()` called from `utils/actionLogger.js` (Line 21)
3. `getRecipientsForAction()` from `utils/notificationRules.js` determines recipients
4. Notification created with `recipientType` and `recipientId`
5. Real-time delivery via Socket.IO (`utils/eventEmitter.js`)

### Notification Routing (`utils/notificationRules.js`)

**Current Recipient Logic:**
- `CLOCK_IN/CLOCK_OUT`: Admins + Host Company + Department Managers
  - **PROBLEM**: Interns receiving notifications about others' clock-ins
- `LEAVE_REQUEST`: Admins + Host Company + Department Managers + Requester
  - **PROBLEM**: Interns may receive notifications about other interns' leave requests
- `ATTENDANCE_CORRECTION_REQUEST`: Similar issue

**Root Cause**: 
- Notifications use `recipientType` but don't strictly validate `recipientId` matches the intended user
- Socket.IO delivery doesn't filter by `recipientId` properly
- No `subjectUserId` field to track "who this notification is about"

### Notification Delivery Issues

**File**: `utils/actionLogger.js`, `utils/eventEmitter.js`
- Real-time notifications broadcast via Socket.IO
- **ISSUE**: Recipients not properly filtered by `recipientId` in Socket delivery

---

## 💰 STIPEND & WORKING HOURS LOGIC

### Storage Location
- **Primary**: `Staff.stipendAmount` (Number)
- **Working Hours**: `Staff.expectedWorkingDaysPerWeek`, `expectedWorkingDaysPerMonth`, `expectedHoursPerDay`, `expectedWeeklyHours`, `expectedMonthlyHours`

### Calculation Usage
- Payroll calculations use `PayrollRecord.totalHoursWorked` (from actual clock logs)
- Expected hours from Staff model used for:
  - Validation/comparison
  - Payroll expectations
  - Dashboard displays

### Current Issues

**Frontend (Mobile - AdminDashboard.js):**
- Line 2767: `handleSaveStipend()` - ✅ Working
- Line 2812: `handleSaveWorkingHours()` - ✅ Working  
- **ISSUE**: Staff details may not refresh after save in some cases

**Frontend (Desktop - StaffList.js):**
- Line 287: `handleSaveStipend()` - ✅ Working
- Line 324: `handleSaveWorkingHours()` - ✅ Working

**Backend:**
- Endpoints exist and work correctly
- **MINOR ISSUE**: No validation for impossible combinations (e.g., 0 days with 40 hours)

---

## 📋 DEPARTMENTS LIST ISSUE

### Current Implementation

**Backend** (`routes/staff.js`, Line 4746):
```javascript
const allInterns = await Staff.find({
  role: 'Intern',  // ❌ Only Interns
  isActive: true
}).select('department').lean();
```

**Frontend - Desktop** (`FaceClockDesktop/src/components/Departments.js`, Line 88):
```javascript
const interns = staffResponse.staff.filter(s => s.role === 'Intern');  // ❌ Only Interns
```

**Frontend - Mobile** (`FaceClockApp/screens/AdminDashboard.js`):
- Uses backend endpoint, inherits the issue

### Required Fix
- Change `role: 'Intern'` to `role: { $in: ['Intern', 'Staff'] }`
- Change frontend filter to include both roles
- Update count field name from `internCount` to `memberCount` or `staffCount`

---

## 📝 REPORTS → CASELOGS RENAME

### Files Referencing "Reports":

1. **Mobile App Navigation**:
   - `App.js` Line 130: `InternReports` route name
   - `screens/Intern/Dashboard.js` - Menu item text
   - `screens/Intern/InternReports.js` - File name and screen content

2. **Backend**:
   - `routes/internReports.js` - Route file (may need renaming)
   - `models/InternReport.js` - Model name (keep as-is for DB compatibility)

3. **UI Labels**:
   - All "Reports" text should become "CASELOGS"
   - Route name: Keep `InternReports` for compatibility, or add redirect

---

## 🔄 ROTATION PLAN (NEW FEATURE)

### Current State
- File exists: `FaceClockApp/screens/Intern/RotationPlan.js`
- **Status**: Skeleton only - needs full implementation

### Required Implementation

**Database Models Needed:**
1. `RotationPlan` - User's rotation path (ordered departments)
2. `RotationAssignment` - Current department assignment with dates
3. `RotationHistory` - Completed rotations
4. `RotationApproval` - Supervisor recommendations + admin decisions

**Backend Endpoints Needed:**
- `GET /api/staff/rotation-plan/:staffId` - Get rotation plan
- `POST /api/staff/rotation-plan` - Create rotation plan
- `PUT /api/staff/rotation-plan/:staffId` - Update rotation plan
- `POST /api/staff/rotation-plan/:staffId/assign` - Assign to department
- `POST /api/staff/rotation-plan/:staffId/approve` - Approve rotation
- `PUT /api/staff/rotation-plan/:staffId/current-assignment` - Update current assignment

**Workflow:**
1. Admin assigns initial department
2. Track attendance + performance metrics
3. Supervisor submits evaluation/recommendation
4. Admin approves/denies rotation
5. On approval: Move user to next department in rotation path
6. Notifications: rotation due, approval pending, approved/denied, department changed

---

## ⚠️ IDENTIFIED ISSUES & AMBIGUITIES

### Critical Issues

1. **Notifications Going to Wrong Users**
   - **Location**: `utils/notificationRules.js`, `utils/actionLogger.js`
   - **Cause**: No strict `recipientId` validation in Socket.IO delivery
   - **Fix**: Add `subjectUserId`/`actorId` fields, enforce `recipientId` matching in delivery

2. **Departments Show Only Interns**
   - **Location**: `routes/staff.js:4746`, `FaceClockDesktop/src/components/Departments.js:88`
   - **Fix**: Include `'Staff'` role in queries

3. **Staff Details May Not Refresh After Stipend/Working Hours Update**
   - **Location**: `FaceClockApp/screens/AdminDashboard.js`, `FaceClockDesktop/src/components/StaffList.js`
   - **Fix**: Ensure state refresh after API response

### Ambiguities

1. **Department Reference Format**
   - Staff model uses `department` as String (name), not ObjectId
   - Some queries may expect ObjectId format
   - **Resolution**: Check all queries use string matching

2. **Working Hours Calculation**
   - Multiple fields: `expectedHoursPerDay`, `expectedWeeklyHours`, `expectedMonthlyHours`
   - **Ambiguity**: Which field takes precedence if all are set?
   - **Resolution**: Need validation rules or priority order

3. **Rotation Plan Integration**
   - How does rotation affect current `Staff.department` field?
   - **Resolution**: Need to define: Does rotation update `Staff.department` immediately, or maintain history?

---

## 📦 KEY MODULES/COMPONENTS

### Backend Modules
- `utils/actionLogger.js` - Logs actions and creates notifications
- `utils/notificationRules.js` - Determines notification recipients
- `utils/eventEmitter.js` - Socket.IO real-time delivery
- `utils/faceRecognitionONNX.js` - Face recognition engine
- `utils/staffCache.js` - Staff data caching

### Frontend Components (Mobile)
- `screens/AdminDashboard.js` (11K+ lines - **NEEDS MODULARIZATION**)
- `screens/Intern/Dashboard.js` - Intern dashboard
- `screens/Intern/Payroll.js` - Payroll display
- `screens/Intern/InternReports.js` - Reports/Caselogs screen
- `components/NotificationBell.js` - Notification UI

### Frontend Components (Desktop)
- `src/components/StaffList.js` - Staff management
- `src/components/Departments.js` - Department listing
- `src/components/Reports/` - Various report components

---

## 🎯 PHASE 2 PRIORITIES

### High Priority Modularization
1. **Split `routes/staff.js`** (5859 lines) into:
   - `routes/staff/auth.js` - Login, registration
   - `routes/staff/clock.js` - Clock-in/out
   - `routes/staff/admin.js` - Admin endpoints
   - `routes/staff/stipend.js` - Stipend & working hours
   - `routes/staff/departments.js` - Department management

2. **Split `screens/AdminDashboard.js`** (11K+ lines) into:
   - `screens/Admin/Dashboard.js` - Main dashboard
   - `screens/Admin/StaffList.js` - Staff list component
   - `screens/Admin/StaffDetails.js` - Staff details modal/screen
   - `screens/Admin/Departments.js` - Department management

---

## ✅ SUMMARY

**Database Schema**: Well-defined, minor additions needed (`subjectUserId`, `actorId` in Notification model)

**API Endpoints**: Stipend/working hours endpoints exist and work

**Notification System**: Architecture exists but routing logic needs fixes

**Frontend**: Large files need modularization, UI logic is functional

**Known Issues**: 3 critical issues identified, 3 ambiguities to resolve

**Next Steps**: Phase 2 modularization → Phase 3 fixes → Phase 4 quality gates

---

**Document Status**: ✅ Complete - Ready for Phase 2

