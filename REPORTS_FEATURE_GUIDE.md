# Reports Feature - Visual Guide & Quick Reference

## Dashboard Card Replacement

### Before
```
┌─────────────────────────────────────┐
│ Quick Actions                       │
├─────────────────────────────────────┤
│ 🕐        📊        📄      💰      │
│ Clock In   My        MY      Payroll │
│            Attendance APPLIC.        │
└─────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────┐
│ Quick Actions                       │
├─────────────────────────────────────┤
│ 📋        📊        📄      💰      │
│ Reports    My        MY      Payroll │
│            Attendance APPLIC.        │
└─────────────────────────────────────┘
```

---

## Reports Screen Layout

### Header
```
← Back                                    My Reports
```

### Report Card Example
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Behavioural Concern                [HIGH]    │
│     Jan 15, 2024 at 10:30 AM                    │
├─────────────────────────────────────────────────┤
│ REPORT TITLE: Missed Meeting Yesterday          │
├─────────────────────────────────────────────────┤
│ The employee was 30 minutes late to the         │
│ scheduled team meeting this morning without     │
│ prior notification. This is the second time     │
│ this week.                                      │
├─────────────────────────────────────────────────┤
│ Supporting Notes:                               │
│ │ Employee was not responsive on Slack         │
│ │ Team meeting was time-sensitive              │
├─────────────────────────────────────────────────┤
│ METADATA:                                       │
│ Incident Date:  Jan 15, 2024 at 10:00 AM       │
│ Host Company:   ABC Corporation                │
│ Status:         [Reviewed]                      │
├─────────────────────────────────────────────────┤
│ Admin Notes:                                    │
│ │ Follow-up required. Employee acknowledged   │
│ │ the issue and promised improvement.         │
├─────────────────────────────────────────────────┤
│ Reviewed on: Jan 16, 2024 at 2:30 PM           │
└─────────────────────────────────────────────────┘
```

---

## Report Types & Severity Matrix

| Report Type | Icon | Example | Severity Range |
|------------|------|---------|-----------------|
| Behavioural Concern | ⚠️ | Unprofessional conduct, attitude issues | Low - High |
| Policy Violation | ⛔ | Breaking company rules | High |
| Attendance Concern | 📅 | Late arrivals, absences | Low - Medium |
| Performance Concern | 📉 | Missing targets, quality issues | Low - High |
| General Observation | 📝 | Feedback, notes | Low - Medium |

---

## Status Flow & Colors

```
Created
   │
   ├─→ Submitted (🔵 Blue) - Initial report
   │       │
   │       └─→ Reviewed (🟢 Green) - Admin reviewed
   │             │
   │             └─→ Actioned (🟣 Purple) - Action taken
```

---

## Data Fields Displayed

### Required Fields (Always Shown)
- ✅ Report Type
- ✅ Severity Level
- ✅ Report Title
- ✅ Description
- ✅ Incident Date
- ✅ Host Company Name
- ✅ Current Status
- ✅ Creation Date/Time

### Optional Fields (Show When Available)
- ⚙️ Supporting Notes (if provided)
- ⚙️ Admin Notes (if provided by reviewer)
- ⚙️ Review Date (if report was reviewed)

---

## User Interactions

### From Dashboard
1. **Click "Reports" Card** → Navigate to Reports Screen
2. See all issued reports
3. Can **pull to refresh** to get latest reports
4. Report cards display all information at a glance

### Report Card Details
- **Expandable UI**: Full details visible on card
- **Color Coded**: Easy to identify report severity and status
- **Icons**: Quick visual identification of report type
- **Timestamps**: Know when report was created and reviewed

---

## API Flow Diagram

```
┌─────────────────────────────────────────────────┐
│         Intern Dashboard                        │
│  [Click Reports Card]                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         InternReports Screen                    │
│  - Fetch request with internId & userRole      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Backend: GET /api/intern-reports              │
│  Query: ?internId={id}&userRole=INTERN         │
│  Auth: Bearer Token                            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Database: InternReport Collection             │
│  Filter by internId (role-based access)        │
│  Populate: internId, hostCompanyId details     │
│  Sort: By createdAt (newest first)             │
│  Paginate: limit=50, skip=0                    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Response: Array of InternReport objects       │
│  - Each with full details                      │
│  - Populated company & intern info             │
│  - Includes pagination metadata                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Frontend: Display Reports List                │
│  - Show loading state while fetching           │
│  - Render each report in card format           │
│  - Color code severity and status              │
│  - Handle errors with retry option             │
│  - Support pull-to-refresh                     │
└─────────────────────────────────────────────────┘
```

---

## Empty State Scenarios

### No Reports Yet
```
┌─────────────────────────────────────┐
│          📋                         │
│   No reports found                  │
│   You don't have any reports yet    │
└─────────────────────────────────────┘
```

### Error Loading Reports
```
┌──────────────────────────────────────────┐
│ ⚠️ Failed to fetch reports               │
│ [Retry Button]                           │
└──────────────────────────────────────────┘
```

---

## Theme Support

### Dark Mode
- Background: #1a1a1a (very dark gray)
- Card: #2a2a2a (dark gray)
- Text: #ffffff (white)
- Borders: #444444 (medium gray)

### Light Mode
- Background: #f5f5f5 (light gray)
- Card: #ffffff (white)
- Text: #333333 (dark gray)
- Borders: #e0e0e0 (light gray)

---

## Testing Checklist

- [ ] Click Reports card from Dashboard
- [ ] Verify screen loads with loading indicator
- [ ] Confirm all reports display for the intern
- [ ] Check report card shows all fields correctly
- [ ] Verify severity badges have correct colors
- [ ] Confirm status badges display correctly
- [ ] Test pull-to-refresh functionality
- [ ] Verify dark mode styling
- [ ] Verify light mode styling
- [ ] Test empty state message
- [ ] Test error handling with retry
- [ ] Verify proper date/time formatting
- [ ] Check responsive layout on different screen sizes

---

## Code Locations

### Frontend
- **Dashboard Card**: [FaceClockApp/screens/Intern/Dashboard.js#L378](FaceClockApp/screens/Intern/Dashboard.js#L378)
- **Reports Screen**: [FaceClockApp/screens/Intern/InternReports.js](FaceClockApp/screens/Intern/InternReports.js)
- **Navigation Setup**: [FaceClockApp/App.js#L21](FaceClockApp/App.js#L21) and [#L129](FaceClockApp/App.js#L129)

### Backend
- **Model**: [FaceClockBackend/models/InternReport.js](FaceClockBackend/models/InternReport.js)
- **Routes**: [FaceClockBackend/routes/internReports.js](FaceClockBackend/routes/internReports.js)
- **Server Registration**: [FaceClockBackend/server.js#L10](FaceClockBackend/server.js#L10) and [#L98](FaceClockBackend/server.js#L98)

---

## Features Included

✅ **Display Reports**: All reports issued to the intern  
✅ **Full Details**: All report fields displayed  
✅ **Status Tracking**: Shows submitted/reviewed/actioned status  
✅ **Severity Color Code**: Red/Orange/Yellow for severity levels  
✅ **Company Info**: Shows host company name for each report  
✅ **Admin Feedback**: Displays admin notes when available  
✅ **Review History**: Shows review date if report was reviewed  
✅ **Pull to Refresh**: Get latest reports  
✅ **Error Handling**: Retry button on failures  
✅ **Loading States**: Proper feedback during data fetch  
✅ **Empty State**: Message when no reports exist  
✅ **Theme Support**: Works in dark and light modes  
✅ **Responsive UI**: Adapts to different screen sizes
