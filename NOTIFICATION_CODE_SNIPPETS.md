# 🔌 CODE SNIPPETS FOR ROUTE INTEGRATION

This file contains ready-to-use code snippets for integrating `logAction()` into existing routes.

## PREREQUISITE: Add to Top of Each Route File

```javascript
const { logAction } = require('../utils/actionLogger');
```

---

## 1. CLOCK IN/OUT ROUTE (routes/staff.js)

### Clock In - After successful save

```javascript
router.post('/clock', upload.single('image'), async (req, res) => {
  try {
    // ... existing validation and processing ...

    const clockLog = new ClockLog({
      staffId: staff._id,
      timestamp: new Date(),
      type: req.body.type, // 'in' or 'out'
      location: req.body.location,
      // ... other fields ...
    });
    
    const savedClockLog = await clockLog.save();

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    if (req.body.type === 'in') {
      await logAction('CLOCK_IN', {
        staffId: staff._id.toString(),
        staffName: staff.name,
        timestamp: savedClockLog.timestamp,
        hostCompanyId: staff.hostCompanyId?.toString(),
        departmentId: staff.department?.toString(),
        location: req.body.location
      }, req.user?._id || null);
    } else if (req.body.type === 'out') {
      await logAction('CLOCK_OUT', {
        staffId: staff._id.toString(),
        staffName: staff.name,
        timestamp: savedClockLog.timestamp,
        hostCompanyId: staff.hostCompanyId?.toString(),
        departmentId: staff.department?.toString(),
        location: req.body.location
      }, req.user?._id || null);
    }

    res.json({
      success: true,
      message: `Clock ${req.body.type === 'in' ? 'in' : 'out'} recorded`,
      clockLog: savedClockLog
    });

  } catch (error) {
    console.error('Error clocking:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 2. STAFF REGISTRATION ROUTE (routes/staff.js)

### Register Staff - After successful save

```javascript
router.post('/register', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'image5', maxCount: 1 },
]), async (req, res) => {
  try {
    // ... existing registration logic ...

    const staff = new Staff({
      name: req.body.name,
      role: req.body.role,
      // ... other fields ...
    });

    await staff.save();

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('STAFF_REGISTERED', {
      staffId: staff._id.toString(),
      staffName: staff.name,
      role: staff.role,
      hostCompanyId: staff.hostCompanyId?.toString(),
      department: staff.department?.toString()
    }, req.user?._id || null);

    res.json({
      success: true,
      message: 'Staff registered successfully',
      staff
    });

  } catch (error) {
    console.error('Error registering staff:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 3. REMOVE STAFF ROUTE (routes/staff.js)

### Delete/Remove Staff - After successful deletion

```javascript
router.delete('/remove/:staffId', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.staffId);
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const staffName = staff.name;
    const hostCompanyId = staff.hostCompanyId;

    await Staff.findByIdAndDelete(req.params.staffId);

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('STAFF_REMOVED', {
      staffId: req.params.staffId,
      staffName: staffName,
      hostCompanyId: hostCompanyId?.toString()
    }, req.user?._id || null);

    res.json({
      success: true,
      message: 'Staff member removed successfully'
    });

  } catch (error) {
    console.error('Error removing staff:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 4. LEAVE APPLICATION ROUTES (routes/leaveApplications.js)

### Submit Leave Request

```javascript
router.post('/request', async (req, res) => {
  try {
    const staff = await Staff.findById(req.body.staffId);
    
    const leaveApplication = new LeaveApplication({
      staffId: req.body.staffId,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      reason: req.body.reason,
      type: req.body.type || 'annual',
      status: 'pending'
    });

    await leaveApplication.save();

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('LEAVE_REQUEST', {
      staffId: req.body.staffId,
      staffName: staff.name,
      startDate: leaveApplication.startDate,
      endDate: leaveApplication.endDate,
      reason: leaveApplication.reason,
      leaveApplicationId: leaveApplication._id.toString(),
      hostCompanyId: staff.hostCompanyId?.toString(),
      departmentId: staff.department?.toString(),
      requesterId: req.body.staffId
    }, req.user?._id || null);

    res.json({
      success: true,
      message: 'Leave request submitted',
      leaveApplication
    });

  } catch (error) {
    console.error('Error submitting leave:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Approve Leave Request

```javascript
router.post('/approve/:leaveId', async (req, res) => {
  try {
    const leaveApp = await LeaveApplication.findById(req.params.leaveId);
    const staff = await Staff.findById(leaveApp.staffId);

    const updatedLeave = await LeaveApplication.findByIdAndUpdate(
      req.params.leaveId,
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedDate: new Date()
      },
      { new: true }
    );

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('LEAVE_APPROVED', {
      leaveApplicationId: leaveApp._id.toString(),
      staffId: leaveApp.staffId.toString(),
      staffName: staff.name,
      requesterId: leaveApp.staffId.toString(),
      approvedBy: req.user.name,
      approvalDate: new Date(),
      startDate: leaveApp.startDate,
      endDate: leaveApp.endDate,
      hostCompanyId: staff.hostCompanyId?.toString()
    }, req.user._id);

    res.json({
      success: true,
      message: 'Leave approved',
      leaveApplication: updatedLeave
    });

  } catch (error) {
    console.error('Error approving leave:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Reject Leave Request

```javascript
router.post('/reject/:leaveId', async (req, res) => {
  try {
    const leaveApp = await LeaveApplication.findById(req.params.leaveId);
    const staff = await Staff.findById(leaveApp.staffId);

    const updatedLeave = await LeaveApplication.findByIdAndUpdate(
      req.params.leaveId,
      {
        status: 'rejected',
        rejectedBy: req.user._id,
        rejectionReason: req.body.reason,
        rejectionDate: new Date()
      },
      { new: true }
    );

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('LEAVE_REJECTED', {
      leaveApplicationId: leaveApp._id.toString(),
      staffId: leaveApp.staffId.toString(),
      staffName: staff.name,
      requesterId: leaveApp.staffId.toString(),
      rejectedBy: req.user.name,
      rejectionReason: req.body.reason,
      rejectionDate: new Date()
    }, req.user._id);

    res.json({
      success: true,
      message: 'Leave rejected',
      leaveApplication: updatedLeave
    });

  } catch (error) {
    console.error('Error rejecting leave:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 5. ATTENDANCE CORRECTION ROUTES (routes/attendanceCorrections.js)

### Submit Correction Request

```javascript
router.post('/request', async (req, res) => {
  try {
    const staff = await Staff.findById(req.body.staffId);

    const correction = new AttendanceCorrection({
      staffId: req.body.staffId,
      date: new Date(req.body.date),
      originalClockIn: req.body.originalClockIn,
      correctedClockIn: req.body.correctedClockIn,
      originalClockOut: req.body.originalClockOut,
      correctedClockOut: req.body.correctedClockOut,
      reason: req.body.reason,
      status: 'pending'
    });

    await correction.save();

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('ATTENDANCE_CORRECTION_REQUEST', {
      staffId: req.body.staffId,
      staffName: staff.name,
      date: correction.date,
      reason: correction.reason,
      attendanceCorrectionId: correction._id.toString(),
      hostCompanyId: staff.hostCompanyId?.toString(),
      departmentId: staff.department?.toString(),
      requesterId: req.body.staffId
    }, req.user?._id || null);

    res.json({
      success: true,
      message: 'Correction request submitted',
      correction
    });

  } catch (error) {
    console.error('Error submitting correction:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Approve Correction

```javascript
router.post('/approve/:correctionId', async (req, res) => {
  try {
    const correction = await AttendanceCorrection.findById(req.params.correctionId);
    const staff = await Staff.findById(correction.staffId);

    const updated = await AttendanceCorrection.findByIdAndUpdate(
      req.params.correctionId,
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedDate: new Date()
      },
      { new: true }
    );

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('ATTENDANCE_CORRECTION_APPROVED', {
      staffId: correction.staffId.toString(),
      staffName: staff.name,
      date: correction.date,
      attendanceCorrectionId: correction._id.toString(),
      requesterId: correction.staffId.toString(),
      approvedBy: req.user.name,
      hostCompanyId: staff.hostCompanyId?.toString()
    }, req.user._id);

    res.json({
      success: true,
      message: 'Correction approved',
      correction: updated
    });

  } catch (error) {
    console.error('Error approving correction:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Reject Correction

```javascript
router.post('/reject/:correctionId', async (req, res) => {
  try {
    const correction = await AttendanceCorrection.findById(req.params.correctionId);
    const staff = await Staff.findById(correction.staffId);

    const updated = await AttendanceCorrection.findByIdAndUpdate(
      req.params.correctionId,
      {
        status: 'rejected',
        rejectedBy: req.user._id,
        rejectionReason: req.body.reason,
        rejectionDate: new Date()
      },
      { new: true }
    );

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('ATTENDANCE_CORRECTION_REJECTED', {
      staffId: correction.staffId.toString(),
      staffName: staff.name,
      date: correction.date,
      attendanceCorrectionId: correction._id.toString(),
      requesterId: correction.staffId.toString(),
      rejectedBy: req.user.name,
      rejectionReason: req.body.reason
    }, req.user._id);

    res.json({
      success: true,
      message: 'Correction rejected',
      correction: updated
    });

  } catch (error) {
    console.error('Error rejecting correction:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 6. PAYROLL ROUTES (routes/payroll.js)

### Generate Payroll

```javascript
router.post('/generate', async (req, res) => {
  try {
    const period = req.body.period; // 'Jan-2025', etc
    
    // Generate payroll for all staff in host company
    const staffList = await Staff.find({
      hostCompanyId: req.body.hostCompanyId
    });

    const payrollRecords = [];

    for (const staff of staffList) {
      const payroll = new PayrollRecord({
        staffId: staff._id,
        period,
        // ... calculate salary, deductions, etc ...
        status: 'generated'
      });

      await payroll.save();
      payrollRecords.push(payroll);

      // 🔔 LOG ACTION FOR INDIVIDUAL PAYROLL
      await logAction('PAYROLL_GENERATED', {
        staffId: staff._id.toString(),
        staffName: staff.name,
        period,
        payrollRecordId: payroll._id.toString(),
        hostCompanyId: req.body.hostCompanyId
      }, req.user._id);
    }

    res.json({
      success: true,
      message: 'Payroll generated',
      count: payrollRecords.length
    });

  } catch (error) {
    console.error('Error generating payroll:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Process/Finalize Payroll

```javascript
router.post('/process', async (req, res) => {
  try {
    const period = req.body.period;
    
    const result = await PayrollRecord.updateMany(
      {
        period,
        status: 'generated'
      },
      {
        status: 'processed',
        processedDate: new Date(),
        processedBy: req.user._id
      }
    );

    // 🔔 LOG ACTION FOR PAYROLL PROCESSING
    await logAction('PAYROLL_PROCESSED', {
      period,
      hostCompanyId: req.body.hostCompanyId,
      processedBy: req.user.name,
      recordCount: result.modifiedCount
    }, req.user._id);

    res.json({
      success: true,
      message: `Payroll processed for ${period}`,
      processedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error processing payroll:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 7. DEPARTMENT ROUTES (routes/departments.js)

### Create Department

```javascript
router.post('/create', async (req, res) => {
  try {
    const department = new Department({
      name: req.body.name,
      hostCompanyId: req.body.hostCompanyId,
      managerId: req.body.managerId,
      // ... other fields ...
    });

    await department.save();

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('DEPARTMENT_CREATED', {
      departmentId: department._id.toString(),
      departmentName: department.name,
      hostCompanyId: req.body.hostCompanyId
    }, req.user._id);

    res.json({
      success: true,
      message: 'Department created',
      department
    });

  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Update Department

```javascript
router.put('/update/:deptId', async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.deptId,
      req.body,
      { new: true }
    );

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('DEPARTMENT_UPDATED', {
      departmentId: department._id.toString(),
      departmentName: department.name,
      hostCompanyId: department.hostCompanyId,
      changes: req.body
    }, req.user._id);

    res.json({
      success: true,
      message: 'Department updated',
      department
    });

  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 8. SECURITY ALERTS (In routes/staff.js or separate route)

### Failed Recognition Alert

```javascript
// In clock-in validation if face recognition fails multiple times
const failedAttempts = await getFailedAttemptCount(staffId, location);

if (failedAttempts > 3) {
  // 🔔 LOG SECURITY ALERT
  await logAction('FAILED_RECOGNITION', {
    staffId: staffId.toString(),
    staffName: staff.name,
    location,
    attemptCount: failedAttempts,
    hostCompanyId: staff.hostCompanyId?.toString()
  }, null);
}
```

### Multiple Failed Logins Alert

```javascript
// In login route if password wrong multiple times
const failedLogins = await getFailedLoginCount(email);

if (failedLogins > 5) {
  // 🔔 LOG SECURITY ALERT
  await logAction('SECURITY_ALERT', {
    message: `Multiple failed login attempts for ${email}`,
    email,
    attemptCount: failedLogins,
    hostCompanyId: staff?.hostCompanyId?.toString()
  }, null);
}
```

---

## PATTERN SUMMARY

All integrations follow this pattern:

```javascript
// 1. Save to database
const entity = new Model({ /* ... */ });
await entity.save();

// 2. Log action
await logAction('ACTION_TYPE', {
  // Required fields
  staffId: staff._id.toString(),
  staffName: staff.name,
  timestamp: new Date(),
  
  // Context fields
  hostCompanyId: staff.hostCompanyId?.toString(),
  departmentId: staff.department?.toString(),
  
  // Related IDs (if applicable)
  leaveApplicationId: leave._id.toString(),
  
  // Additional context
  location: req.body.location,
  reason: req.body.reason
}, req.user?._id);

// 3. Return response
res.json({ success: true, /* ... */ });
```

---

## ✅ CHECKLIST FOR EACH ROUTE

- [ ] Import: `const { logAction } = require('../utils/actionLogger');`
- [ ] After save: `await logAction('ACTION_TYPE', payload, userId);`
- [ ] Include: `staffId`, `staffName`, `timestamp` (or `date`)
- [ ] Include: `hostCompanyId`, `departmentId` if applicable
- [ ] Include: Related IDs if available
- [ ] Include: Additional context (location, reason, etc)
- [ ] Test: Verify notification appears in database
- [ ] Test: Verify real-time notification on connected client

---

## 🧪 QUICK TEST

After adding logAction to a route:

```bash
# 1. Start backend with debugging
DEBUG=* npm run dev

# 2. Test the route
curl -X POST http://localhost:5000/api/staff/clock \
  -H "Content-Type: application/json" \
  -d '{"staffId":"...", "type":"in"}'

# 3. Check logs for
# "✅ Action logged: CLOCK_IN"
# "📤 Notification sent to admin:..."

# 4. Query database
db.notifications.find().sort({createdAt: -1}).limit(1)

# 5. Check /api/health for active connections
curl http://localhost:5000/api/health
```
