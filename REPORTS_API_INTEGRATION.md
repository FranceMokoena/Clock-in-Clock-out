# Reports Module - API Integration Checklist

## Overview

The Reports & Insights module is fully implemented with all UI, styling, and data processing logic. This document ensures proper API integration for production use.

## Required API Endpoints

### 1. Staff API - `staffAPI.getAll()`

**Purpose:** Fetch all staff members for filtering and reporting

**Expected Return Structure:**
```javascript
{
  success: true,
  data: [
    {
      id: "staff_001",
      name: "John Doe",
      email: "john.doe@company.com",
      hostCompanyId: "hc_001",
      departmentId: "dept_001",
      role: "Intern",
      status: "Active"
    },
    // ... more staff
  ]
}
```

**Fields Used by Reports:**
- `id`: Staff identifier
- `name`: Display in reports
- `hostCompanyId`: Company filtering
- `departmentId`: Department filtering

**Error Handling:** Returns empty array if API fails

---

### 2. Attendance API - `attendanceAPI.getAll()`

**Purpose:** Fetch all clock logs for analysis

**Expected Return Structure:**
```javascript
{
  success: true,
  data: [
    {
      id: "log_001",
      staffId: "staff_001",
      staffName: "John Doe",
      clockInTime: "2024-01-15T08:45:00Z",  // ISO 8601 format
      clockOutTime: "2024-01-15T17:30:00Z",
      deviceId: "device_001",
      deviceLocation: "Main Office",
      hostCompanyId: "hc_001",
      deviceQuality: 95,
      faceMatchScore: 0.98
    },
    // ... more logs
  ]
}
```

**Fields Used by Reports:**

| Field | Usage | Module |
|-------|-------|--------|
| `id` | Record identification | All |
| `staffId` | Link to staff member | All |
| `staffName` | Display in tables | Attendance, Behavioral, Compliance |
| `clockInTime` | Calculate hours, check punctuality | Attendance, Behavioral, Risk |
| `clockOutTime` | Calculate hours, flag missed | Attendance, Compliance |
| `deviceId` | Detect device manipulation | Compliance |
| `hostCompanyId` | Company-level analytics | Institutional |
| `deviceLocation` | Context for violations | Compliance |

**Time Format:**
- Must be ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- Or Unix timestamp (milliseconds): `1705324800000`
- Components will auto-detect and convert

**Quality Fields** (Optional):
- `deviceQuality`: 0-100 score (used for data quality assessment)
- `faceMatchScore`: 0-1.0 (used for reliability assessment)

**Error Handling:** Returns empty array if API fails

---

### 3. Host Company API - `hostCompanyAPI.getAll()`

**Purpose:** Fetch all host companies for filtering and ranking

**Expected Return Structure:**
```javascript
{
  success: true,
  data: [
    {
      id: "hc_001",
      name: "Acme Corporation",
      industry: "Technology",
      location: "San Francisco, CA",
      staffCount: 45,
      departmentCount: 5,
      contactEmail: "hr@acme.com"
    },
    // ... more companies
  ]
}
```

**Fields Used by Reports:**
- `id`: Company identifier
- `name`: Display in tables and rankings
- `staffCount`: Institutional reports ranking

**Error Handling:** Returns empty array if API fails

---

### 4. Department API - `departmentAPI.getAll()`

**Purpose:** Fetch all departments for filtering

**Expected Return Structure:**
```javascript
{
  success: true,
  data: [
    {
      id: "dept_001",
      name: "Engineering",
      hostCompanyId: "hc_001",
      managerName: "Jane Smith",
      staffCount: 12
    },
    // ... more departments
  ]
}
```

**Fields Used by Reports:**
- `id`: Department identifier
- `name`: Display in dropdowns and filters

**Error Handling:** Returns empty array if API fails

---

## API Integration Verification Checklist

### For Each Endpoint

- [ ] Endpoint is accessible and returns proper HTTP 200 status
- [ ] Response includes `success` boolean field
- [ ] Response includes `data` array field with records
- [ ] All required fields are populated (not null/undefined)
- [ ] Timestamps are in consistent format (ISO 8601 preferred)
- [ ] API handles no-data scenario (returns empty array, not error)
- [ ] API error responses are properly formatted
- [ ] Response times are <1s for typical dataset (1000 records)
- [ ] API supports filtering by date range (for future enhancement)
- [ ] API supports pagination (for large datasets)

### Integration Steps

**Step 1: Verify API Services Configuration**

Location: [src/services/api.js](../FaceClockDesktop/src/services/api.js)

Check that these are exported:
```javascript
export const staffAPI = {
  getAll: async () => { /* ... */ }
};

export const attendanceAPI = {
  getAll: async () => { /* ... */ }
};

export const hostCompanyAPI = {
  getAll: async () => { /* ... */ }
};

export const departmentAPI = {
  getAll: async () => { /* ... */ }
};
```

**Step 2: Test API Endpoints**

In browser console:
```javascript
import { staffAPI, attendanceAPI, hostCompanyAPI, departmentAPI } from './services/api';

// Test each API
staffAPI.getAll().then(data => console.log('Staff:', data));
attendanceAPI.getAll().then(data => console.log('Attendance:', data));
hostCompanyAPI.getAll().then(data => console.log('Companies:', data));
departmentAPI.getAll().then(data => console.log('Departments:', data));
```

**Step 3: Run Reports Module**

1. Navigate to Dashboard
2. Click Reports from sidebar
3. Wait for overview stats to load
4. Verify no console errors
5. Try each report section
6. Test filters work correctly

**Step 4: Validate Data Processing**

Check browser console for:
- No undefined errors in processAttendanceData()
- No undefined errors in processBehavioralData()
- No undefined errors in processComplianceData()
- Calculations complete without errors

---

## Backend API Implementation Reference

### If Building Backend from Scratch

All endpoints should support optional query parameters:

```
GET /api/staff?limit=1000&skip=0
GET /api/attendance?limit=1000&skip=0&startDate=2024-01-01&endDate=2024-12-31
GET /api/companies?limit=1000&skip=0
GET /api/departments?limit=1000&skip=0
```

### Performance Recommendations

**For Large Datasets:**
- Add pagination (limit, skip/offset parameters)
- Add date range filtering (startDate, endDate)
- Add selective field return (?fields=id,name,email)
- Implement caching (Cache-Control headers)
- Consider database indexing on:
  - clockInTime, clockOutTime (for range queries)
  - staffId (for filtering)
  - hostCompanyId (for company reports)
  - deviceId (for manipulation detection)

**Example Backend Implementation Pattern:**

```javascript
// Node.js/Express example
app.get('/api/attendance', async (req, res) => {
  try {
    const { limit = 1000, skip = 0, startDate, endDate } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.clockInTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const data = await AttendanceLog
      .find(query)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

---

## Troubleshooting Guide

### Issue: "Loading reports..." Spinner Never Completes

**Cause:** API endpoints not returning data

**Solution:**
1. Check browser Network tab in DevTools
2. Verify API URLs are correct
3. Check API response format matches expected structure
4. Look for 404 or 500 errors in console

### Issue: Empty Report Sections

**Cause:** API returning empty arrays

**Solution:**
1. Verify database has clock log records
2. Check date range filters aren't excluding all data
3. Verify staffId linking is correct
4. Run database query directly: `db.attendancelogs.count()`

### Issue: Incorrect Calculations in Reports

**Cause:** Timestamp format mismatch or missing fields

**Solution:**
1. Log raw API response: Add console.log in loadReport()
2. Verify clockInTime/clockOutTime are present
3. Check timestamp format (ISO 8601 vs Unix)
4. Ensure time zones are consistent

### Issue: Filters Don't Work

**Cause:** ReportFilters component not connected to data loading

**Solution:**
1. Verify onFiltersChange callback is implemented
2. Check useEffect dependencies include filter state
3. Verify API results update when filters change

---

## Data Validation Rules

All incoming API data should validate:

```javascript
// Minimal validation
const isValidAttendanceLog = (log) => {
  return (
    log.id &&
    log.staffId &&
    log.clockInTime &&
    new Date(log.clockInTime).getTime() > 0
  );
};

const isValidStaff = (staff) => {
  return (
    staff.id &&
    staff.name &&
    staff.hostCompanyId
  );
};
```

---

## Next Steps After Integration

1. **Test with Real Data:** Run through full workflow with production database
2. **Monitor Performance:** Check report loading times with 10k+ records
3. **Implement Export:** Add CSV/PDF generation (frameworks ready)
4. **Set Up Alerts:** Configure email notifications for high-risk interns
5. **Schedule Reports:** Set up automated daily/weekly report generation
6. **Archive Historical:** Plan data retention and archival strategy

---

## Support & Debugging

**For Issues Contact:**
- Check [REPORTS_MODULE_DOCUMENTATION.md](REPORTS_MODULE_DOCUMENTATION.md) for component details
- Review data flow diagrams in documentation
- Check browser console for specific error messages
- Verify API endpoint URLs are correct
- Confirm database records exist for test date ranges

**Debug Helper:** Add this to Reports component to verify API data

```javascript
console.log('Staff API:', staffAPI);
console.log('Attendance API:', attendanceAPI);
console.log('Companies API:', hostCompanyAPI);

// Test fetch
staffAPI.getAll().then(data => {
  console.log('Staff data:', data);
  console.log('Staff count:', data?.length || 0);
});
```

---

**Module Status:** ✅ Code Complete, Ready for API Integration
**Last Updated:** January 2024
**Files Modified:** 1 (Reports.js)
**Files Created:** 16 (8 JS components + 8 CSS files)
**Total Lines of Code:** 2700+
