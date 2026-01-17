# Reports API Contracts & Data Integrity Specification

**Last Updated:** January 9, 2026  
**Status:** CRITICAL DATA INTEGRITY REQUIREMENT - NO HARDCODED VALUES ALLOWED  
**Purpose:** Ensure all reports are data-driven and audit-ready

---

## 1. Core Principle

✅ **ALL metrics, scores, and decisions must be derived from real data fetched from backend APIs.**  
❌ **NO hardcoded values, mock arrays, static scores, or placeholder data allowed.**

---

## 2. API Endpoints Used by Reports Module

### 2.1 Clock Logs / Attendance Data

**Endpoint:** `GET /staff/admin/reports/data`  
**Purpose:** Fetch clock logs and attendance records for analysis

**Request Parameters:**
```javascript
{
  startDate?: "2026-01-01T00:00:00Z",      // Optional: Start date in ISO format
  endDate?: "2026-01-31T23:59:59Z",        // Optional: End date in ISO format
  staffIds?: "id1,id2,id3" | "all",        // Optional: Comma-separated staff IDs or 'all'
  period?: "daily" | "weekly" | "monthly", // Optional: Date range type
  location?: string,                        // Optional: Filter by location
  role?: "Intern" | "Admin",                // Optional: Filter by role
  hostCompanyId?: "company_id",             // Optional: Filter by host company
  limit?: 10000                             // Optional: Record limit
}
```

**Response Schema:**
```javascript
{
  success: true,
  data: [
    {
      staff: {
        _id: string,
        name: string,
        surname: string,
        role: string,
        location: string,
        hostCompany: string,
        isActive: boolean
      },
      timesheet: [
        {
          date: "2026-01-15",
          timeIn: "09:05:00 AM",
          timeOut: "05:10:00 PM",
          startLunch: null,
          endLunch: null,
          confidence: {
            timeIn: 0.95,
            timeOut: 0.98
          }
        }
      ]
    }
  ],
  summary: {
    totalStaff: number,
    totalLogs: number,
    dateRange: { start: ISO8601, end: ISO8601 },
    filters: { location, role, period }
  }
}
```

### 2.2 Staff Records

**Endpoint:** `GET /staff/admin/staff`

**Request Parameters:**
```javascript
{
  hostCompanyId?: string,  // Filter by company
  isActive?: boolean,      // Filter active/inactive
  role?: string,           // Filter by role
  limit?: 10000
}
```

**Response Schema:**
```javascript
{
  success: true,
  staff: [
    {
      _id: string,
      name: string,
      surname: string,
      idNumber: string,
      role: "Intern" | "Supervisor" | "Admin",
      hostCompany: string,
      location: string,
      isActive: boolean,
      createdAt: ISO8601
    }
  ]
}
```

### 2.3 Host Companies

**Endpoint:** `GET /staff/admin/host-companies`

**Response Schema:**
```javascript
{
  success: true,
  companies: [
    {
      _id: string,
      companyName: string,
      registrationNumber?: string,
      contactPerson?: string,
      isActive: boolean
    }
  ]
}
```

---

## 3. Data Validation Rules (MUST APPLY)

### 3.1 Required Clock Log Fields

Every clock log record must have:

```javascript
{
  _id: string,                      // Unique record ID
  staffId: string,                  // Must be valid staff ID
  clockInTime: ISO8601,             // Valid timestamp
  hostCompany: string,              // Must match company in database
  clockOutTime?: ISO8601,           // Optional but preferred
  supervisorStatus?: string,        // 'pending', 'confirmed', 'rejected'
  deviceId?: string,                // Device used (if available)
  taskSessionId?: string,           // Task being worked on (if available)
  confidence?: number               // 0-1 face detection confidence
}
```

### 3.2 Validation Checklist

For every record loaded from API:

- [ ] `staffId` exists and is not null
- [ ] `clockInTime` is valid ISO8601 timestamp and not null
- [ ] `clockInTime` is not in future
- [ ] If `clockOutTime` exists, it must be after `clockInTime`
- [ ] `hostCompany` matches company in staff record
- [ ] No duplicate records (same staffId, same clockInTime)
- [ ] No overlapping sessions (same staff, overlapping times)
- [ ] Timezone consistency (all UTC or all local, not mixed)

### 3.3 Data Quality Flags

Flag and exclude records with:

```javascript
{
  INVALID_REQUIRED_FIELDS,     // Missing staffId, clockInTime, hostCompany
  INVALID_TIMESTAMP,           // clockOutTime before clockInTime
  MISSING_CLOCK_OUT,           // clockInTime without clockOutTime (warning, not error)
  DUPLICATE_RECORD,            // Same staff, same time
  OVERLAPPING_SESSION,         // Sessions for same staff overlap
  UNUSUAL_DURATION,            // Session > 12 hours or < 0.5 hours
  UNUSUAL_CLOCK_TIME,          // Clock outside 6 AM - 10 PM
  TIMEZONE_MISMATCH            // Mixed timezone formats
}
```

### 3.4 Invalid Record Handling

When invalid records are detected:

```javascript
// NEVER silently ignore or auto-fill
// ALWAYS:
1. Log the error
2. Exclude from analysis
3. Include in audit trail with reason
4. Show user: "X records excluded due to data quality issues"

// Example audit trail:
{
  recordsAnalyzed: 150,
  recordsExcluded: 3,
  excludedRecords: [
    { index: 5, reason: "Missing clock-out time" },
    { index: 42, reason: "Duplicate record" },
    { index: 99, reason: "Overlapping session" }
  ]
}
```

---

## 4. Metric Calculation Rules

### 4.1 Attendance Integrity

**Definition:** % of staff with at least 1 complete session (both clock-in AND clock-out)

**Formula:**
```
attendanceIntegrity = (staffWithCompleteSessions / totalStaffInCompany) * 100
```

**Calculation Rules:**
- Count only records with BOTH `clockInTime` AND `clockOutTime`
- Count each staff member once (even if multiple complete sessions)
- Exclude staff with no attendance records

### 4.2 Punctuality/Lateness

**Definition:** Clock-in before configured grace period (typically 9:00 AM)

**Formula:**
```
punctualityRate = (onTimeArrivals / totalArrivals) * 100
latenessRate = 100 - punctualityRate
```

**Configuration:**
```javascript
// Define in config, NOT hardcoded:
const BUSINESS_START_TIME = process.env.GRACE_PERIOD || "09:00";
// Default: 9:00 AM
// Configurable per company if needed
```

### 4.3 Compliance Score (Institutional Reports)

**Definition:** Weighted score based on actual metrics

**Formula:**
```
complianceScore = 
  (attendanceIntegrity * 0.4) + 
  (supervisorParticipation * 0.4) - 
  (violationPenalty * 0.2)

// Where violationPenalty = min(50, violationCount * 3)
```

**Constraints:**
- Score range: 0-100
- All inputs must be calculated from real data
- Violations = actual missed clock-outs
- No random generation

### 4.4 Risk Score (Risk Alert Reports)

**Definition:** Multi-factor risk assessment

**Formula:**
```
riskScore = 
  (absenteeismRate * 0.4) + 
  (latenessRate * 0.3) + 
  (violationPenalty * 0.3)

// Where violationPenalty = min(100, violationCount * 10)

dropoutLikelihood = 
  (absenteeismRate * 0.5) + 
  (riskScore * 0.5)
```

**Risk Levels:**
```
riskScore >= 75: HIGH RISK (red)
riskScore >= 50: MEDIUM RISK (yellow)
riskScore < 50:  LOW RISK (green)
riskScore = 0:   UNKNOWN (no data) (gray)
```

### 4.5 Supervisor Participation

**Definition:** % of records with supervisor validation

**Formula:**
```
supervisorParticipation = 
  (recordsWithSupervisorStatus / totalRecords) * 100

// Where supervisorStatus = 'confirmed' or 'approved'
```

---

## 5. Data Transparency Requirements

Every report MUST expose:

### 5.1 Data Range
```javascript
dataRange: {
  start: ISO8601,
  end: ISO8601,
  daysIncluded: number
}
```

### 5.2 Record Count
```javascript
recordsAnalyzed: number,
recordsExcluded: number,
excludedReasons: [
  { reason: "Missing clock-out", count: 3 },
  { reason: "Duplicate entry", count: 1 }
]
```

### 5.3 Calculation Basis
```javascript
calculationMethod: "Weighted formula with component weights",
dataSource: "Backend API /staff/admin/reports/data",
validationApplied: "All records validated for required fields"
```

### 5.4 Audit Trail
```javascript
auditTrail: {
  timestamp: ISO8601,
  recordsAnalyzed: number,
  recordsWithIssues: number,
  dataQualityScore: 0-100,
  excludedRecordsDetail: [...]
}
```

---

## 6. Empty State Handling

When data is unavailable:

```javascript
// NEVER show fake data
// DO show:

// If no records found:
"No attendance records found for the selected period and filters."

// If partial data:
"Warning: Data is incomplete (X of Y expected records). Analysis based on available data."

// If API error:
"Error loading data: [specific error message]"
"Please try again or contact system administrator."

// If processing error:
"Unable to calculate report due to data validation errors. Please review excluded records below."
```

---

## 7. Error Handling Standards

### 7.1 API Failures

```javascript
try {
  const response = await attendanceAPI.getAll(params);
  
  if (!response.success) {
    // API returned error response
    logError("API error:", response.error);
    showUserMessage("Unable to load data. Please try again.");
    return null;
  }
  
  if (!Array.isArray(response.data) && !Array.isArray(response.clockLogs)) {
    // Invalid response structure
    logError("Invalid API response structure");
    showUserMessage("Data format error. Please contact support.");
    return null;
  }
  
  const logs = response.data || response.clockLogs || [];
  if (logs.length === 0) {
    // No data - not an error, just empty
    showUserMessage("No records available for selected criteria.");
    return null;
  }
  
} catch (error) {
  logError("API request failed:", error.message);
  showUserMessage(`Error: ${error.message}`);
  return null;
}
```

### 7.2 Validation Failures

```javascript
const { validLogs, invalidLogs, duplicates, overlaps } = validateClockLogs(logs);

if (invalidLogs.length > 0) {
  logWarning(`${invalidLogs.length} records failed validation`);
  invalidLogs.forEach(item => {
    logWarning(`Record ${item.index}: ${item.errors.join(", ")}`);
  });
}

if (validLogs.length === 0) {
  showUserMessage("No valid records available. All records excluded due to data quality issues.");
  return null;
}

// Continue with validLogs only
// Include audit trail showing what was excluded
```

---

## 8. Configuration Requirements

System configuration (NOT hardcoded):

```javascript
// Grace period for punctuality calculation
GRACE_PERIOD_START_TIME = "09:00" // Configurable
GRACE_PERIOD_MINUTES = 0          // Grace minutes within start time

// Risk weighting
RISK_WEIGHTS = {
  absenteeism: 0.4,
  lateness: 0.3,
  violations: 0.3
}

// Compliance weighting
COMPLIANCE_WEIGHTS = {
  attendance: 0.4,
  supervision: 0.4,
  violations: 0.2
}

// Data validation
EXCLUDE_WEEKENDS = true
WORKING_DAYS_PER_WEEK = 5 // Mon-Fri
MONTHS_WORKING_DAYS = {
  January: 23,  // Calculated: 31 days - weekends
  // ... etc
}

// Thresholds for flags
LATE_THRESHOLD_CONSECUTIVE = 5
ABSENCE_THRESHOLD_PERCENTAGE = 30
VIOLATION_THRESHOLD = 3
```

---

## 9. Compliance & Audit Trail

Every report must be:

### 9.1 Reproducible
```
- Same input data → Same output
- No random generation
- No stochastic calculations
- Deterministic formulas only
```

### 9.2 Auditable
```
- All calculations exposed
- Data sources documented
- Exclusions explained
- Timestamps included
```

### 9.3 Defensible
```
- Basis for every decision documented
- Violations proven by data
- Thresholds defined
- Source records available
```

---

## 10. Reporting Checklist

Before releasing any report:

- [ ] All data sourced from API, NOT hardcoded
- [ ] All metrics calculated from real records
- [ ] Invalid records identified and excluded
- [ ] Exclusions documented with reasons
- [ ] Data range exposed in UI
- [ ] Record count shows in summary
- [ ] Calculation method explained
- [ ] Audit trail available
- [ ] Empty states handle missing data
- [ ] No fake/mock data in any scenario
- [ ] Grade system (A-F) if applicable, based on actual scores
- [ ] Trends calculated from historical comparison, not guessed
- [ ] Risk flags triggered only by proven patterns
- [ ] All timestamps in consistent timezone
- [ ] CSV/PDF exports include audit information

---

## 11. Specific Report Requirements

### InstitutionalReports
- ✅ Compliance scores calculated from real metrics
- ✅ Staff counts are actual, not random
- ✅ Violations are actual missed clock-outs
- ✅ Supervisor participation is actual percentage
- ✅ Data transparency shows records analyzed

### AttendanceReports
- ✅ Hours worked calculated from actual timestamps
- ✅ Late arrivals based on configurable grace period
- ✅ Grace period NOT hardcoded in calculation
- ✅ Early departures calculated from actual clock-out times
- ✅ Missed clock-outs flagged, not hidden

### BehavioralReports
- ✅ Trends calculated from historical comparison
- ✅ Grace period configurable, not hardcoded
- ✅ Patterns detected from real data, not guessed
- ✅ Consistency score based on actual attendance
- ✅ Day-of-week patterns from actual pattern analysis

### RiskAlertReports
- ✅ Working days calculated correctly (Mon-Fri)
- ✅ Risk scores weighted and normalized
- ✅ Dropout likelihood based on actual behavior
- ✅ Flags triggered by proven patterns only
- ✅ Risk levels mapped to actual risk scores

### PerformanceReports
- ✅ Hours worked from actual clock times
- ✅ Supervisor validation from actual records
- ✅ Productivity based on attendance consistency
- ✅ NO mock task completion estimates
- ✅ Data quality metrics included

---

## 12. Testing & Validation

Before deployment:

```javascript
// 1. Test with minimal data
// 2. Test with missing fields
// 3. Test with invalid timestamps
// 4. Test with overlapping sessions
// 5. Test with no records
// 6. Test with very large datasets (10k+ records)
// 7. Verify all calculations manually
// 8. Compare with backend calculations
// 9. Audit trail accuracy
// 10. Empty state rendering
```

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-09 | 1.0 | Initial specification - Data integrity requirements |

---

**APPROVAL REQUIRED:** All deviations from this specification must be documented and approved by compliance team.
