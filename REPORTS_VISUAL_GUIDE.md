# Reports & Insights Module - Visual Architecture & User Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD (Main View)                    │
│                                                              │
│  [Sidebar]                                                   │
│  - Home                                                      │
│  - Admin Dashboard                                           │
│  - Registers                                                 │
│  - ... other options ...                                     │
│  - Reports ✨ NEW MODULE                                     │
│                                                              │
└────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────┐
        │     Reports.js (Wrapper)         │
        │   Renders → ReportsIndex         │
        └─────────────────────────────────┘
                              ↓
        ┌────────────────────────────────────────────────┐
        │          ReportsIndex.js (Hub)                  │
        │                                                 │
        │  ┌──────────────────────────────────────────┐ │
        │  │   Overview Stats Grid                    │ │
        │  │  [Total Interns] [Departments]          │ │
        │  │  [Present Today] [Total Records]        │ │
        │  └──────────────────────────────────────────┘ │
        │                                                 │
        │  ┌──────────────────────────────────────────┐ │
        │  │  6-Section Menu Cards                    │ │
        │  │  ┌─┐  ┌─┐  ┌─┐                           │ │
        │  │  │1│  │2│  │3│  ...                     │ │
        │  │  └─┘  └─┘  └─┘                           │ │
        │  │  1: Attendance   2: Behavioral           │ │
        │  │  3: Compliance   4: Performance          │ │
        │  │  5: Risk & Alert 6: Institutional        │ │
        │  └──────────────────────────────────────────┘ │
        │                                                 │
        │     activeSection === null ? Show overview     │
        │     activeSection === 'attendance' ? Show 1    │
        │     activeSection === 'behavioral' ? Show 2    │
        │     ... etc ...                                │
        └────────────────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────────────────────┐
        │  Selected Report Component + ReportFilters             │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ ReportFilters.js (Shared Component)             │  │
        │  │ [Month ▼] [Year ▼] [Intern ▼] [Company ▼]      │  │
        │  │ [Department ▼] [Timeframe ▼]                    │  │
        │  └────────────────────────────────────────────────┘  │
        │                                                       │
        │  ┌────────────────────────────────────────────────┐  │
        │  │ Report-Specific Content                        │  │
        │  │ (AttendanceReports, BehavioralReports, etc)    │  │
        │  │                                                │  │
        │  │ [Summary Cards] [Visualizations] [Tables]      │  │
        │  └────────────────────────────────────────────────┘  │
        └──────────────────────────────────────────────────────┘
```

---

## User Flow: Navigating Reports

### Flow 1: View Overview Statistics

```
User opens Reports
        ↓
ReportsIndex loads
        ↓
loadOverviewStats() called
        ↓
API Calls:
├─ staffAPI.getAll() → Count = total interns
├─ attendanceAPI.getAll() → Filter for today
├─ hostCompanyAPI.getAll() → Count = departments
└─ attedanceAPI.getAll() → Count = all records
        ↓
Overview stats displayed in grid
        ↓
6-section menu cards visible
        ↓
User sees:
├─ Total Interns: 45
├─ Total Departments: 5
├─ Present Today: 38
└─ Total Records: 12,450
```

### Flow 2: View Attendance Report

```
User clicks "Attendance Reports" card
        ↓
setActiveSection('attendance')
        ↓
AttendanceReports component renders
        ↓
ReportFilters load with defaults:
├─ Month: Current month
├─ Year: Current year
├─ Intern: All
├─ Company: All
├─ Department: All
└─ Timeframe: Monthly
        ↓
loadReports() called with filters
        ↓
attendanceAPI.getAll() → Raw clock logs
        ↓
processAttendanceData(logs, filters)
├─ Filter by date range
├─ Group by date
├─ Calculate: consistency, punctuality, hours
├─ Flag: missed clock-outs
└─ Return: aggregated metrics
        ↓
Display Results:
├─ Summary Cards
│  ├─ Consistency: 87.5%
│  ├─ Punctuality: 92.0%
│  ├─ Total Hours: 340.5
│  └─ Avg Hours/Day: 8.2
│
├─ AttendanceHeatmap
│  ├─ Calendar grid for month
│  ├─ Green = on-time
│  ├─ Yellow = late
│  ├─ Red = absent
│  └─ Legend + stats
│
└─ Detailed Table
   ├─ Date | Status | Clock In | Clock Out | Hours
   └─ [50 rows visible, scrollable]
        ↓
User adjusts filters
        ↓
Filters onChange triggers new loadReports()
        ↓
New data displayed
```

### Flow 3: View Compliance Report

```
User clicks "Compliance & Ethics" card
        ↓
setActiveSection('compliance')
        ↓
ComplianceReports component renders
        ↓
ReportFilters load
        ↓
loadReports() called
        ↓
attendanceAPI.getAll() → All clock logs
        ↓
processComplianceData(logs, filters)
├─ Check each log for violations:
│  ├─ Missed clock-out? → HIGH severity
│  ├─ Repeated lateness? → MEDIUM severity
│  └─ Unusual time? → LOW severity
│
├─ Check for manipulation:
│  ├─ Same device ID, different staff? → FLAG
│  ├─ Overlapping sessions? → FLAG
│  └─ Rapid clock-in/out? → FLAG
│
└─ Lock audit records with timestamp
        ↓
Display Results:
├─ Violations List
│  ├─ Card 1: [HIGH] Missed Clock-Out
│  │  Staff: John Doe | Date: 2024-01-15
│  │  Status: [LOCKED] 🔒
│  │
│  ├─ Card 2: [MEDIUM] Repeated Lateness
│  │  Staff: Jane Smith | Count: 5 instances
│  │  Status: [LOCKED] 🔒
│  │
│  └─ [Filter Buttons] [All] [High] [Medium] [Low]
│
├─ Manipulation Risks (Admin Only)
│  ├─ Device #001 used by 3 different staff
│  ├─ Overlapping sessions detected: 2 instances
│  └─ Rapid cycles: 1 instance
│
└─ Audit Trail Table
   ├─ Violation | Staff | Date | Status | Signature
   └─ [All records LOCKED, tamper-evident]
        ↓
Admin can review immutable records
        ↓
Cannot modify, only view history
```

### Flow 4: View Risk & Alerts

```
User clicks "Risk & Alert Reports" card
        ↓
setActiveSection('riskAlert')
        ↓
RiskAlertReports component renders
        ↓
ReportFilters load
        ↓
loadReports() called
        ↓
attendanceAPI.getAll() + staffAPI.getAll()
        ↓
processRiskData(logs, staff, filters)
├─ For each intern:
│  ├─ Calculate absenteeism %
│  ├─ Calculate lateness %
│  ├─ Count violations
│  ├─ Risk Score = ((abs × 0.4 + late × 0.3 + viol × 5) / 10)
│  ├─ Dropout Prediction = (score + absenteeism) / 2
│  └─ Generate flags: [High Absenteeism] [Frequent Lateness]
│
└─ Sort by risk score descending
        ↓
Display Results:
├─ Risk Summary Grid
│  ├─ HIGH RISK: 7 interns
│  ├─ MEDIUM RISK: 12 interns
│  ├─ LOW RISK: 26 interns
│  └─ AVG RISK SCORE: 42
│
├─ Filter Buttons
│  ├─ [All] (45)
│  ├─ [High] (7) [Active]
│  ├─ [Medium] (12)
│  └─ [Low] (26)
│
└─ Risk Profile Cards
   ├─ Card 1: 🔴 HIGH RISK
   │  Name: John Doe
   │  Risk Score: 78/100
   │  Absenteeism: 35%
   │  Lateness: 60%
   │  Violations: 2
   │  Days Present: 18
   │  Flags: [High Absenteeism] [Dropout Risk]
   │
   ├─ Card 2: 🟡 MEDIUM RISK
   │  Name: Jane Smith
   │  Risk Score: 52/100
   │  Absenteeism: 20%
   │  Lateness: 40%
   │  Violations: 0
   │  Days Present: 28
   │  Flags: [Frequent Lateness]
   │
   └─ ... more cards ...
        ↓
Admin identifies highest-risk interns
        ↓
Takes early intervention actions
        ↓
Dropout rate prevented
```

---

## Data Processing Pipeline

### Attendance Data Processing

```
Raw Clock Logs from API:
[
  { staffId: 1, clockInTime: "08:45", clockOutTime: "17:30" },
  { staffId: 1, clockInTime: "09:15", clockOutTime: "17:45" },
  { staffId: 1, clockInTime: "08:30", clockOutTime: null },  ← missed clock-out
  ...
]
        ↓
Step 1: Filter by date range
├─ startDate: 2024-01-01
├─ endDate: 2024-01-31
└─ Result: 20 logs for January
        ↓
Step 2: Group by date
├─ 2024-01-15: [log1]
├─ 2024-01-16: [log2]
├─ 2024-01-17: [log3 - missed clock-out]
└─ ... 18 total days
        ↓
Step 3: Calculate metrics per day
For each day:
├─ Hours: clockOut - clockIn = 8.75, 8.5, null
├─ OnTime: clockInTime < 09:00? = true, false, true
├─ Missed: clockOutTime exists? = yes, yes, NO
└─ Status: ON_TIME, LATE, MISSED_OUT
        ↓
Step 4: Aggregate across period
├─ Total Days: 18 (tracked)
├─ On-Time Days: 12
├─ Late Days: 5
├─ Missed Clock-Outs: 1
├─ Total Hours: 146.25
└─ Average Hours: 8.125
        ↓
Step 5: Calculate rates
├─ Consistency = 12/18 = 66.7%
├─ Punctuality = 12/18 = 66.7%
└─ Status = "Needs Improvement"
        ↓
Output: Aggregated Metrics
{
  consistencyRate: 0.667,
  punctualityRate: 0.667,
  totalHours: 146.25,
  avgHours: 8.125,
  lateArrivals: 5,
  missedClockOuts: 1,
  totalDays: 18,
  lastUpdated: "2024-01-31T23:59:59Z"
}
        ↓
Display in UI
```

---

## API Data Flow

```
┌─────────────────────────────────────────────┐
│        Reports Component Lifecycle          │
└─────────────────────────────────────────────┘
                        ↓
              useEffect([], [])
                        ↓
         componentDidMount equivalent
                        ↓
        ┌──────────────────────────────┐
        │    loadOverviewStats()        │
        └──────────────────────────────┘
                        ↓
        ┌──────────────────────────────────────────────┐
        │  Parallel API Calls                           │
        ├──────────────────────────────────────────────┤
        │ • staffAPI.getAll()                           │
        │ • attendanceAPI.getAll()                      │
        │ • hostCompanyAPI.getAll()                     │
        │ • departmentAPI.getAll()                      │
        └──────────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────────────────────┐
        │  Transform API Responses                      │
        ├──────────────────────────────────────────────┤
        │ • Count total staff                           │
        │ • Filter attendance for today                 │
        │ • Count unique departments                    │
        │ • Count all records                           │
        └──────────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────────────────────┐
        │  setOverviewStats({...})                      │
        └──────────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────────────────────┐
        │  Render Overview Grid                         │
        ├──────────────────────────────────────────────┤
        │ ┌──────────────────────────────────────────┐│
        │ │ Total Interns | Departments | Present | │
        │ │ Records       |                           ││
        │ └──────────────────────────────────────────┘│
        └──────────────────────────────────────────────┘
                        ↓
        User clicks Attendance Report card
                        ↓
        setActiveSection('attendance')
                        ↓
        AttendanceReports component mounts
                        ↓
        useEffect([filters], ...)
                        ↓
        loadReports() called
                        ↓
        ┌──────────────────────────────────────────────┐
        │  Fetch Data with Filters Applied             │
        ├──────────────────────────────────────────────┤
        │ const logs = await attendanceAPI.getAll()    │
        │                                               │
        │ processAttendanceData(logs, {                │
        │   startDate: "2024-01-01",                   │
        │   endDate: "2024-01-31",                     │
        │   staffId: null,                             │
        │   hostCompanyId: null,                       │
        │   departmentId: null                         │
        │ })                                           │
        └──────────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────────────────────┐
        │  Data Transformation Complete                │
        │  Returns: {                                  │
        │    consistencyRate: 0.875,                   │
        │    punctualityRate: 0.920,                   │
        │    totalHours: 340.5,                        │
        │    avgHours: 8.2,                            │
        │    ...                                       │
        │  }                                           │
        └──────────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────────────────────┐
        │  Render Attendance Report UI                 │
        ├──────────────────────────────────────────────┤
        │ ┌──────────────────────────────────────────┐│
        │ │ Summary Cards (Consistency, Punctuality) ││
        │ │ AttendanceHeatmap (Calendar visualization││
        │ │ Detailed Table (Day-by-day breakdown)    ││
        │ └──────────────────────────────────────────┘│
        └──────────────────────────────────────────────┘
```

---

## Component Dependency Tree

```
Reports.js (Wrapper)
    └─ ReportsIndex.js (Main Hub)
        ├─ ReportFilters.js (Shared in all children)
        │
        ├─ AttendanceReports.js
        │  ├─ AttendanceHeatmap.js
        │  └─ [API: attendanceAPI.getAll()]
        │
        ├─ BehavioralReports.js
        │  └─ [API: attendanceAPI.getAll()]
        │
        ├─ ComplianceReports.js
        │  └─ [API: attendanceAPI.getAll()]
        │
        ├─ PerformanceReports.js
        │  └─ [API: attendanceAPI.getAll()]
        │
        ├─ RiskAlertReports.js
        │  └─ [API: attendanceAPI + staffAPI]
        │
        └─ InstitutionalReports.js
           └─ [API: staffAPI + hostCompanyAPI]

CSS Dependencies:
├─ ReportsIndex.css
├─ ReportFilters.css
├─ AttendanceReports.css
├─ BehavioralReports.css
├─ ComplianceReports.css
├─ PerformanceReports.css
├─ RiskAlertReports.css
└─ InstitutionalReports.css
```

---

## State Management

### ReportsIndex State
```javascript
const [activeSection, setActiveSection] = useState(null);
// null = Overview, 'attendance' = AttendanceReports, etc.

const [overviewStats, setOverviewStats] = useState({
  totalInterns: 0,
  totalDepartments: 0,
  presentToday: 0,
  totalRecords: 0,
  loading: true,
  error: null
});
```

### Individual Report State
```javascript
// Example: AttendanceReports
const [reportData, setReportData] = useState(null);
const [loading, setLoading] = useState(true);
const [filters, setFilters] = useState({
  timeframe: 'monthly',
  month: currentMonth,
  year: currentYear,
  intern: null,
  company: null,
  department: null
});
```

---

## Styling Hierarchy

```
Global Theme
    ├─ Colors
    │  ├─ Primary Blue: #3166AE
    │  ├─ Hover Blue: #e3f2fd
    │  ├─ Severity Red: #dc2626
    │  ├─ Severity Orange: #f59e0b
    │  └─ Severity Blue: #3b82f6
    │
    ├─ Transitions
    │  └─ 0.3s cubic-bezier(0.4, 0, 0.2, 1)
    │
    └─ Responsive
       ├─ Desktop: Full layouts
       ├─ Tablet (1024px): Optimized
       └─ Mobile (768px): Stacked

Component-Specific Styles
    ├─ ReportsIndex
    │  ├─ .reports-container
    │  ├─ .overview-stats-grid
    │  └─ .report-menu-cards
    │
    ├─ AttendanceReports
    │  ├─ .summary-cards
    │  ├─ .heatmap-container
    │  └─ .detail-table
    │
    └─ [Each component] ...
```

---

## Test Scenarios

### Test 1: View Overview
1. Open Reports
2. Verify 4 overview stats load
3. Verify 6 menu cards display
4. Expected: Stats show correct counts, cards have icons

### Test 2: View Attendance Report
1. Navigate to Attendance Reports
2. Filters load with defaults
3. Data aggregates correctly
4. Heatmap shows calendar
5. Expected: Consistency rate calculated correctly

### Test 3: View Risk Report
1. Navigate to Risk & Alert Reports
2. Risk profiles load
3. Risk scores calculated
4. Filter by High Risk
5. Expected: Only high-risk interns visible

### Test 4: Test Filters
1. Change month filter
2. Change year filter
3. Select specific intern
4. Select specific company
5. Expected: Data recalculates, display updates

### Test 5: Check Immutable Records
1. Navigate to Compliance Reports
2. View violation cards
3. Attempt to edit (should be locked)
4. Check audit trail
5. Expected: All records marked as LOCKED, cannot modify

---

This visual guide provides complete understanding of how the Reports & Insights module works from user interaction through data processing and UI rendering.
