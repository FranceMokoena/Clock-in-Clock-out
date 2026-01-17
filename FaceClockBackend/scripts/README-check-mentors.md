# Mentor Diagnostic Script

## Purpose
This script checks all host companies and departments to see which ones have mentor names assigned, and helps diagnose mentor-related issues.

## Usage

```bash
cd FaceClockBackend
node scripts/check-mentors.js
```

## What it checks:

1. **Host Companies**: Lists all companies and shows which ones have mentor names
2. **Departments**: Lists all departments and shows which ones have mentor names
3. **Staff Mentors**: Shows all active Staff members who can be mentors, grouped by company
4. **Specific IDs**: Checks the specific company and department IDs from error logs
5. **Staff Matching**: For each company/department, shows if there are any Staff members that match

## Output

The script will display:
- ✅ Companies/Departments WITH mentor names
- ❌ Companies/Departments WITHOUT mentor names
- 👥 Staff members who can be mentors (Role: Staff)
- 🔍 Detailed check of specific IDs from error logs
- Staff members matched to each company/department

## Example Output

```
📊 HOST COMPANIES WITH MENTOR NAMES
================================================================================

Total Host Companies: 3

✅ Companies WITH mentor names: 1

Companies with mentors:
  - ID: 695f81517274f21772557e12
    Name: Acme Corp
    Company Name: Acme Corporation
    Mentor Name: John Doe
    Active: Yes

...

📋 SUMMARY
================================================================================
Total Host Companies: 3
  - With mentor names: 1
  - Without mentor names: 2

Total Departments: 5
  - With mentor names: 2
  - Without mentor names: 3

Total Active Staff (potential mentors): 10
```

