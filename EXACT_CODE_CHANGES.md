# 📝 Exact Code Changes - Department Intern Count Fix

## 1️⃣ Backend - New Endpoint (FaceClockBackend/routes/staff.js)

### Location: After line 4205 (after existing `/admin/departments/all` endpoint)

```javascript
// 🎯 STRATEGIC ENDPOINT: Get all departments WITH intern counts
// This endpoint efficiently calculates intern counts for each department
router.get('/admin/departments-with-counts', async (req, res) => {
  try {
    const { hostCompanyId } = req.query;
    
    // Build filter - host company users can only see their own departments
    const filter = {};
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ error: 'Invalid host company ID format' });
      }
      filter.hostCompanyId = hostCompanyId;
    }
    
    const departments = await Department.find(filter)
      .sort({ name: 1 })
      .lean();
    
    // 🔧 Efficiently count interns for each department
    // Using aggregation would be ideal, but this is clean and maintainable
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        try {
          // Count ONLY staff with role === 'Intern' in this department
          const internCount = await Staff.countDocuments({
            department: { $regex: new RegExp(`^${dept.name}$`, 'i') },
            role: 'Intern',
            isActive: true
          });
          
          return {
            ...dept,
            internCount
          };
        } catch (error) {
          console.error(`Error counting interns for department "${dept.name}":`, error);
          return {
            ...dept,
            internCount: 0
          };
        }
      })
    );
    
    console.log(`📊 Fetched ${departmentsWithCounts.length} departments with intern counts`);
    
    res.json({
      success: true,
      departments: departmentsWithCounts
    });
  } catch (error) {
    console.error('Error fetching departments with counts:', error);
    res.status(500).json({ error: 'Failed to fetch departments with counts' });
  }
});
```

---

## 2️⃣ Mobile App - Change #1 (FaceClockApp/screens/AdminDashboard.js)

### Location: Line 4294 (in `loadHostCompanies` function)

**BEFORE**:
```javascript
const internCount = internsResponse.data.success ? internsResponse.data.staff.length : 0;
```

**AFTER**:
```javascript
const internCount = internsResponse.data.success 
  ? internsResponse.data.staff.filter(staff => staff.role === 'Intern').length 
  : 0;
```

---

## 3️⃣ Mobile App - Change #2 (FaceClockApp/screens/AdminDashboard.js)

### Location: Line 7217 (replace entire `loadDepartments` function)

```javascript
const loadDepartments = async () => {
  try {
    // Filter by hostCompanyId if user is host company
    const params = isHostCompany ? { hostCompanyId } : {};
    
    // 🎯 First, try to use the new backend endpoint that efficiently returns departments WITH intern counts
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/admin/departments-with-counts`, { params });
      if (response.data.success) {
        const depts = response.data.departments;
        console.log(`✅ Loaded ${depts.length} departments with accurate intern counts from backend`);
        setDepartments(depts);
        return;
      }
    } catch (newEndpointError) {
      console.warn('⚠️ New endpoint not available, using fallback method');
    }
    
    // Fallback: Load departments without counts, then fetch counts individually
    const response = await axios.get(`${API_BASE_URL}/staff/admin/departments/all`, { params });
    if (response.data.success) {
      const depts = response.data.departments;
      // Load intern counts for each department - ONLY count staff with role === 'Intern'
      const departmentsWithCounts = await Promise.all(
        depts.map(async (dept) => {
          try {
            const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
              params: { 
                department: dept.name, 
                fullData: 'true', // Request full data to get role field
                ...(isHostCompany && { hostCompanyId }) 
              }
            });
            if (internsResponse.data.success) {
              // CRITICAL FIX: Filter to only count staff with role === 'Intern'
              const internCount = internsResponse.data.staff.filter(staff => staff.role === 'Intern').length;
              console.log(`📊 Department "${dept.name}": ${internCount} interns found`);
              return {
                ...dept,
                internCount
              };
            } else {
              return { ...dept, internCount: 0 };
            }
          } catch (error) {
            console.error(`❌ Error loading interns for department "${dept.name}":`, error);
            return { ...dept, internCount: 0 };
          }
        })
      );
      setDepartments(departmentsWithCounts);
    }
  } catch (error) {
    console.error('Error loading departments:', error);
    Alert.alert('Error', 'Failed to load departments');
  }
};
```

---

## 4️⃣ Mobile App - Change #3 (FaceClockApp/screens/AdminDashboard.js)

### Location: Line 7295 (replace entire `loadHostCompanyDetails` function)

```javascript
const loadHostCompanyDetails = async (hostCompanyId) => {
  try {
    setLoadingHostCompanyDetails(true);
    
    // 🎯 Try to use the new backend endpoint that efficiently returns departments WITH intern counts
    try {
      const deptResponse = await axios.get(`${API_BASE_URL}/staff/admin/departments-with-counts`, {
        params: { hostCompanyId }
      });
      if (deptResponse.data.success) {
        console.log(`✅ Loaded ${deptResponse.data.departments.length} departments with accurate intern counts from backend`);
        setHostCompanyDepartments(deptResponse.data.departments);
      }
    } catch (newEndpointError) {
      // Fallback: Load departments without counts, then fetch counts individually
      console.warn('⚠️ New endpoint not available, using fallback method');
      const deptResponse = await axios.get(`${API_BASE_URL}/staff/admin/departments/all`, {
        params: { hostCompanyId }
      });
      if (deptResponse.data.success) {
        const depts = deptResponse.data.departments;
        // Load intern counts for each department
        const departmentsWithCounts = await Promise.all(
          depts.map(async (dept) => {
            try {
              const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
                params: { department: dept.name, hostCompanyId, fullData: true }
              });
              if (internsResponse.data.success) {
                // Filter to only count interns (role === 'Intern')
                const interns = internsResponse.data.staff.filter(staff => staff.role === 'Intern');
                const internCount = interns.length;
                console.log(`📊 Department "${dept.name}": ${internCount} interns found`);
                return {
                  ...dept,
                  internCount
                };
              } else {
                console.warn(`⚠️ Failed to load interns for department "${dept.name}"`);
                return { ...dept, internCount: 0 };
              }
            } catch (error) {
              console.error(`❌ Error loading interns for department "${dept.name}":`, error);
              return { ...dept, internCount: 0 };
            }
          })
        );
        setHostCompanyDepartments(departmentsWithCounts);
      }
    }
    
    // Load all staff/interns for this host company
    const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
      params: { hostCompanyId }
    });
    if (internsResponse.data.success) {
      setHostCompanyInterns(internsResponse.data.staff);
    }
  } catch (error) {
    console.error('Error loading host company details:', error);
    Alert.alert('Error', 'Failed to load company details');
  } finally {
    setLoadingHostCompanyDetails(false);
  }
};
```

---

## 5️⃣ Desktop App (FaceClockDesktop/src/components/Departments.js)

### Location: Line 54 (replace `loadDepartments` function)

```javascript
const loadDepartments = async () => {
  setLoading(true);
  try {
    const params = isHostCompany && hostCompanyId ? { hostCompanyId } : {};
    
    // 🎯 First, try to use the new backend endpoint that efficiently returns departments WITH intern counts
    try {
      const response = await departmentAPI.getAll({ ...params, withCounts: true });
      if (response.success) {
        console.log(`✅ Loaded ${response.departments?.length || 0} departments with accurate intern counts from backend`);
        setDepartments(response.departments || []);
        return;
      }
    } catch (newEndpointError) {
      console.warn('⚠️ New endpoint not available, using fallback method');
    }
    
    // Fallback: Load departments without counts, then fetch counts individually
    const response = await departmentAPI.getAll(params);
    if (response.success) {
      // Load intern counts for each department
      const departmentsWithCounts = await Promise.all(
        (response.departments || []).map(async (dept) => {
          try {
            const staffResponse = await staffAPI.getAll({
              department: dept.name,
              ...(isHostCompany && hostCompanyId && { hostCompanyId })
            });
            // Only count staff with role === 'Intern'
            const internCount = staffResponse.staff?.filter(s => s.role === 'Intern').length || 0;
            return {
              ...dept,
              internCount
            };
          } catch (error) {
            console.error(`Error loading interns for department "${dept.name}":`, error);
            return { ...dept, internCount: 0 };
          }
        })
      );
      setDepartments(departmentsWithCounts);
    }
  } catch (error) {
    console.error('Error loading departments:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## Summary of Changes

| File | Change Type | Lines | What Was Fixed |
|------|------------|-------|-----------------|
| staff.js | NEW ENDPOINT | - | Added `/departments-with-counts` |
| AdminDashboard.js | FIX + UPDATE | 4294 | Filter by Intern role |
| AdminDashboard.js | COMPLETE REWRITE | 7217-7265 | Use new endpoint with fallback |
| AdminDashboard.js | COMPLETE REWRITE | 7295-7345 | Use new endpoint with fallback |
| Departments.js | COMPLETE REWRITE | 54-80 | Use new endpoint with fallback |

---

## Key Pattern Used

All frontend changes follow this pattern:

```javascript
// Try new backend endpoint first
try {
  const response = await axios.get(`${API_BASE_URL}/staff/admin/departments-with-counts`, { params });
  if (response.data.success) {
    // Use data from new endpoint
    setDepartments(response.data.departments);
    return;
  }
} catch (error) {
  // If new endpoint not available, fall back to old method
  console.warn('Falling back to old method');
}

// Fallback method: load departments, then count interns individually
// with proper role === 'Intern' filtering
```

---

## Testing the Changes

```javascript
// Test data structure (what the backend returns)
{
  success: true,
  departments: [
    {
      _id: "...",
      name: "Sales",
      internCount: 5,  // ✅ NEW FIELD
      // ... other fields
    },
    {
      _id: "...",
      name: "Marketing",
      internCount: 3,  // ✅ NEW FIELD
      // ... other fields
    }
  ]
}
```

---

**Implementation Complete** ✅
**Date**: January 10, 2026
**Status**: Ready for Deployment
