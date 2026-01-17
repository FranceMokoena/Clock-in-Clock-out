# 🚀 Deployment Guide - Department Intern Count Fix

## Pre-Deployment Checklist

- [ ] Review all code changes in `EXACT_CODE_CHANGES.md`
- [ ] Ensure backup of current codebase
- [ ] Test changes in development environment first
- [ ] Check that no other developers are working on related code
- [ ] Notify team of deployment plans

---

## Deployment Steps

### Step 1: Deploy Backend (FIRST)
**File**: `FaceClockBackend/routes/staff.js`

```bash
# 1. Navigate to backend directory
cd FaceClockBackend

# 2. Verify code changes are in place
# Check for the new endpoint: /staff/admin/departments-with-counts

# 3. Install/update dependencies if needed
npm install

# 4. Test locally if possible
npm test

# 5. Deploy to production server
# (Use your deployment method: git push, docker, etc.)
```

**Verification**:
```bash
# Test the new endpoint
curl http://your-server:5000/staff/admin/departments-with-counts

# Should return:
# {
#   "success": true,
#   "departments": [
#     { "_id": "...", "name": "Sales", "internCount": 5, ... },
#     { "_id": "...", "name": "Marketing", "internCount": 3, ... }
#   ]
# }
```

---

### Step 2: Deploy Mobile App
**File**: `FaceClockApp/screens/AdminDashboard.js`

```bash
# 1. Navigate to app directory
cd FaceClockApp

# 2. Verify code changes are in place
# Check 3 functions: loadHostCompanies, loadDepartments, loadHostCompanyDetails

# 3. Build the app
eas build --platform ios --non-interactive
eas build --platform android --non-interactive

# 4. Submit to app stores or deploy to test device
```

**Testing on Device**:
1. Clear app cache: Settings → App → FaceClock → Clear Cache
2. Force close and reopen app
3. Navigate to Departments view
4. Check console logs:
   - Should see: "✅ Loaded X departments with accurate intern counts"
   - Or fallback: "⚠️ New endpoint not available, using fallback method"

---

### Step 3: Deploy Desktop App
**File**: `FaceClockDesktop/src/components/Departments.js`

```bash
# 1. Navigate to desktop directory
cd FaceClockDesktop

# 2. Verify code changes are in place
# Check loadDepartments function

# 3. Build the app
npm run build

# 4. Deploy executable or installer
```

**Testing on Desktop**:
1. Close any running instances
2. Open Developer Tools (F12)
3. Check Console tab
4. Navigate to Departments view
5. Should see console message about loading departments with counts

---

## Testing Plan

### Test 1: Admin Dashboard - Departments
**Steps**:
1. Login as Admin
2. Click "Departments"
3. View departments list
4. **Expected**: Should see intern counts (not "0")

**Verification**:
```
✅ Department shows intern count
✅ Count matches registered interns
✅ Console shows success message
```

### Test 2: Host Company - Departments
**Steps**:
1. Login as Host Company
2. Navigate to company details
3. View company departments
4. **Expected**: Should see accurate intern counts

**Verification**:
```
✅ Only see own company's departments
✅ Intern counts are accurate
✅ No permission errors
```

### Test 3: Desktop App - Departments
**Steps**:
1. Open Desktop app
2. Login as Admin/Host Company
3. Go to Departments component
4. **Expected**: Accurate intern counts displayed

**Verification**:
```
✅ Departments load correctly
✅ Intern counts display
✅ No console errors
```

### Test 4: Add/Remove Intern
**Steps**:
1. Register a new intern in "Sales" department
2. Check Departments view
3. Sales count should increase by 1
4. **Expected**: Change reflected immediately

**Verification**:
```
✅ Count increases when intern added
✅ Count decreases when intern removed
✅ Changes appear within 1-2 seconds
```

### Test 5: Role Filtering
**Steps**:
1. In database, check a department with mixed roles
2. Ex: "Sales" has: 5 Interns + 3 Staff + 1 Other
3. Check Departments view for "Sales"
4. **Expected**: Should show 5, not 9

**Verification**:
```
✅ Only Interns are counted
✅ Staff role not counted
✅ Other role not counted
```

### Test 6: Active Status Check
**Steps**:
1. Deactivate an intern (set isActive=false)
2. Check Departments view
3. **Expected**: Count should decrease

**Verification**:
```
✅ Deactivated staff not counted
✅ Reactivating staff increases count
```

### Test 7: Host Company Filtering
**Steps**:
1. Login as Host Company A
2. Check departments
3. **Expected**: Only see departments from Company A
4. **Expected**: Intern counts reflect only Company A's interns

**Verification**:
```
✅ Cannot see other companies' departments
✅ Counts are accurate for own company
```

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback
```bash
# Revert the changes
git revert <commit-hash>

# Redeploy previous version
# (Use your deployment method)
```

### Symptoms That Require Rollback
- ❌ Departments not loading at all
- ❌ Intern counts showing as `-1` or errors
- ❌ App crashes when viewing departments
- ❌ Permission errors when viewing departments
- ❌ Host companies can see other companies' departments

### If Rollback Needed
1. Immediately revert backend changes
2. Revert mobile app changes
3. Revert desktop changes
4. Verify old version works
5. Investigate root cause
6. Fix issues
7. Redeploy

---

## Monitoring After Deployment

### Check Logs
```bash
# Backend logs
tail -f logs/application.log
grep "departments-with-counts" logs/application.log
grep "Fetched.*departments with intern counts" logs/application.log
```

### Monitor Errors
Watch for these error patterns:
```
❌ "Error fetching departments with counts"
❌ "Error counting interns for department"
❌ "Failed to fetch departments"
```

### Performance Monitoring
Check response times:
- Expected: < 500ms for departments with counts
- If slower: Check database indexes and queries

### User Reports
Monitor for:
- Department counts showing incorrectly
- App crashes on departments page
- Permission errors
- Missing data

---

## Success Criteria

✅ All tests pass
✅ No console errors in any app
✅ Intern counts match actual registrations
✅ Performance acceptable (< 500ms response time)
✅ No user reports of issues
✅ Backend logs show successful counts
✅ All departments pages load correctly

---

## Post-Deployment Tasks

1. **Monitor for 24 hours**
   - Watch error logs
   - Check user reports
   - Verify counts are accurate

2. **Announce Changes**
   - Email users about fix
   - Update documentation
   - Close related tickets

3. **Create Backup**
   - Save deployment info
   - Document any issues found
   - Record rollback procedure if used

4. **Update Wiki/Docs**
   - Add to changelog
   - Update API documentation
   - Document new endpoint

---

## Rollback Verification

After rollback (if needed), verify:
```
✅ Old app loads correctly
✅ Department view works
✅ No new errors introduced
✅ Previous data intact
```

---

## Support Contact

If issues arise:
1. Check logs first
2. Review `EXACT_CODE_CHANGES.md`
3. Test in development environment
4. Contact development team

---

## Version Information

- **Backend Route File**: `FaceClockBackend/routes/staff.js`
- **Mobile Screen File**: `FaceClockApp/screens/AdminDashboard.js`
- **Desktop Component File**: `FaceClockDesktop/src/components/Departments.js`
- **New Endpoint**: `GET /staff/admin/departments-with-counts`
- **Deployment Date**: January 10, 2026
- **Priority**: HIGH
- **Estimated Downtime**: None (backward compatible)

---

## Checklist Summary

```
PRE-DEPLOYMENT
[ ] Code reviewed
[ ] Backup created
[ ] Team notified

DEPLOYMENT
[ ] Backend deployed
[ ] Mobile app deployed
[ ] Desktop app deployed

TESTING
[ ] Admin dashboard works
[ ] Host company view works
[ ] Desktop app works
[ ] Add/remove intern works
[ ] Role filtering correct
[ ] Active status check works
[ ] Host company filtering works

POST-DEPLOYMENT
[ ] Monitor logs
[ ] Announce changes
[ ] Update documentation
[ ] Close tickets
```

---

**Ready for Deployment** ✅

All files modified correctly and documented.
No syntax errors found.
All changes backward compatible.
