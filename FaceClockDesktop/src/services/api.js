import axios from 'axios';
import API_BASE_URL from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      // Auto-attach hostCompanyId for Host Company users to enforce server-side scoping.
      // This keeps mobile login and existing calls unchanged while ensuring accurate data scoping.
      const storedUser = localStorage.getItem('userInfo');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const method = (config.method || '').toLowerCase();
        const url = config.url || '';

        // Only attach for GET requests and when user is a host company
        if (user?.type === 'hostCompany' && method === 'get') {
          // Skip auth/register/clocking intern endpoints
          const skipPaths = ['/staff/login', '/staff/register', '/staff/clock', '/staff/validate-preview'];
          const shouldSkip = skipPaths.some(p => url.includes(p));
          if (!shouldSkip) {
            config.params = { ...(config.params || {}), hostCompanyId: user.id };
          }
        }
      }
    } catch (err) {
      // Fail silently - don't block requests if localStorage parsing fails
      console.warn('Could not attach hostCompanyId to request:', err?.message || err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/staff/login', { username, password });
    return response.data;
  },
};

// Staff API
export const staffAPI = {
  getList: async (params = {}) => {
    const response = await api.get('/staff/list', { params });
    return response.data;
  },
  getAll: async (params = {}) => {
    const response = await api.get('/staff/admin/staff', { params });
    return response.data;
  },
  // Note: Mobile app doesn't use a separate details endpoint
  // It uses the data from /admin/staff with fullData=true and enriches it
  // For interns, it adds intern dashboard data
  getInternDashboard: async (internId, period = 'monthly') => {
    const response = await api.get('/staff/intern/dashboard', {
      params: { internId, period }
    });
    return response.data;
  },
  getInternLeaveApplications: async (internId) => {
    const response = await api.get('/staff/intern/leave-applications', {
      params: { internId }
    });
    return response.data;
  },
  getInternAttendanceCorrections: async (internId) => {
    const response = await api.get('/staff/intern/attendance-corrections', {
      params: { internId }
    });
    return response.data;
  },
  getDayDetails: async (staffId, date) => {
    const response = await api.get(`/staff/admin/staff/${staffId}/day-details`, {
      params: { date }
    });
    return response.data;
  },
  getTimesheet: async (staffId, month, year) => {
    const response = await api.get(`/staff/admin/staff/${staffId}/timesheet`, {
      params: { month, year }
    });
    return response.data;
  },
  getStipend: async (staffId) => {
    const response = await api.get('/staff/intern/stipend', {
      params: { internId: staffId }
    });
    return response.data;
  },
  getDetailedAttendance: async (staffId, params = {}) => {
    const response = await api.get('/staff/intern/attendance/detailed', {
      params: { internId: staffId, ...params }
    });
    return response.data;
  },
  updateStipend: async (staffId, data, params = {}) => {
    const response = await api.put(`/staff/admin/staff/${staffId}/stipend`, data, { params });
    return response.data;
  },
  getWorkingHours: async (staffId, params = {}) => {
    const response = await api.get('/staff/intern/working-hours', {
      params: { internId: staffId, ...params }
    });
    return response.data;
  },
  updateWorkingHours: async (staffId, data, params = {}) => {
    const response = await api.put(`/staff/admin/staff/${staffId}/working-hours`, data, { params });
    return response.data;
  },
  getRotationPlan: async (staffId) => {
    const response = await api.get(`/staff/admin/staff/${staffId}/rotation-plan`);
    return response.data;
  },
  updateRotationPlan: async (staffId, data, params = {}) => {
    const response = await api.put(`/staff/admin/staff/${staffId}/rotation-plan`, data, { params });
    return response.data;
  },
  getInternDashboard: async (internId, period = 'monthly') => {
    const response = await api.get('/staff/intern/dashboard', {
      params: { internId, period }
    });
    return response.data;
  },
  // Note: Update and delete endpoints may need to be added to backend
  // For now, we'll use isActive flag for deactivation
  update: async (staffId, data) => {
    // This endpoint may need to be implemented in backend
    // For now, we'll try PUT to /staff/admin/staff/:id
    const response = await api.put(`/staff/admin/staff/${staffId}`, data);
    return response.data;
  },
  deactivate: async (staffId) => {
    // Deactivate by setting isActive to false
    const response = await api.put(`/staff/admin/staff/${staffId}`, { isActive: false });
    return response.data;
  },
};

// Rotation API
export const rotationAPI = {
  getRoster: async (params = {}) => {
    const response = await api.get('/rotations/roster', { params });
    return response.data;
  },
  getTimeline: async (userId, params = {}) => {
    const response = await api.get(`/rotations/users/${userId}/timeline`, { params });
    return response.data;
  },
  getDossier: async (userId, params = {}) => {
    const response = await api.get(`/rotations/users/${userId}/dossier`, { params });
    return response.data;
  },
  createPlan: async (userId, data, params = {}) => {
    const response = await api.post(`/rotations/users/${userId}/plan`, data, { params });
    return response.data;
  },
  assign: async (userId, data, params = {}) => {
    const response = await api.post(`/rotations/users/${userId}/assign`, data, { params });
    return response.data;
  },
  evaluate: async (assignmentId, data, params = {}) => {
    const response = await api.post(`/rotations/assignments/${assignmentId}/evaluate`, data, { params });
    return response.data;
  },
  updateStatus: async (assignmentId, data, params = {}) => {
    const response = await api.patch(`/rotations/assignments/${assignmentId}/status`, data, { params });
    return response.data;
  },
  decide: async (assignmentId, data, params = {}) => {
    const response = await api.post(`/rotations/assignments/${assignmentId}/decide`, data, { params });
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (hostCompanyId = null) => {
    const params = hostCompanyId ? { hostCompanyId } : {};
    const response = await api.get('/staff/admin/stats', { params });
    return response.data;
  },
  getRecentActivity: async (hostCompanyId = null, params = {}) => {
    const queryParams = {
      ...params,
      ...(hostCompanyId ? { hostCompanyId } : {})
    };
    // For now, return notifications as recent activity
    const response = await api.get('/notifications', { params: queryParams });
    if (response.data.success && response.data.notifications) {
      return {
        success: true,
        activity: response.data.notifications
      };
    }
    return { success: true, activity: [] };
  },
};

// Host Company API
export const hostCompanyAPI = {
  getAll: async () => {
    const response = await api.get('/staff/admin/host-companies');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/staff/admin/host-companies/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/staff/admin/host-companies', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/staff/admin/host-companies/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/staff/admin/host-companies/${id}`);
    return response.data;
  },
};

// Department API
export const departmentAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/staff/admin/departments/all', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/staff/admin/departments/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/staff/admin/departments', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/staff/admin/departments/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/staff/admin/departments/${id}`);
    return response.data;
  },
};

// Leave Applications API
export const leaveAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/staff/admin/leave-applications', { params });
    return response.data;
  },
  getInternApplications: async (internId) => {
    const response = await api.get('/staff/intern/leave-applications', {
      params: { internId }
    });
    return response.data;
  },
  updateStatus: async (id, action, rejectionReason = null) => {
    const response = await api.put(`/staff/admin/leave-applications/${id}`, {
      action,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
    });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/staff/intern/leave-applications', data);
    return response.data;
  },
};

// Clock Logs API (Attendance Records)
export const clockLogAPI = {
  // Get clock logs for reporting - uses /staff/admin/reports/data endpoint
  getAll: async (params = {}) => {
    const response = await api.get('/staff/admin/reports/data', { params });
    return response.data;
  },
  // Get detailed attendance/clock logs (if separate endpoint exists)
  getLogs: async (params = {}) => {
    const response = await api.get('/staff/logs', { params });
    return response.data;
  },
};

// Attendance Corrections API
export const attendanceAPI = {
  // Alias to clockLogAPI for backward compatibility with existing reports code
  getAll: async (params = {}) => {
    return clockLogAPI.getAll(params);
  },
  getCorrections: async (params = {}) => {
    const response = await api.get('/staff/admin/attendance-corrections', { params });
    return response.data;
  },
  getInternCorrections: async (internId) => {
    const response = await api.get('/staff/intern/attendance-corrections', {
      params: { internId }
    });
    return response.data;
  },
  updateStatus: async (id, action, rejectionReason = null) => {
    const response = await api.put(`/staff/admin/attendance-corrections/${id}`, {
      action,
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
    });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/staff/intern/attendance-corrections', data);
    return response.data;
  },
};

// Not Accountable API
export const notAccountableAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/staff/admin/not-accountable', { params });
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  getData: async (params = {}) => {
    const response = await api.get('/staff/admin/reports/data', { params });
    return response.data;
  },
};

// Locations API
export const locationsAPI = {
  getAll: async () => {
    const response = await api.get('/locations/all');
    return response.data;
  },
};

// Intern Reports API
export const internReportsAPI = {
  // Create a new intern report
  create: async (data) => {
    const response = await api.post('/intern-reports', data);
    return response.data;
  },
  // Fetch reports for a specific intern or host company
  getReports: async (internId, hostCompanyId, userRole, limit = 50, skip = 0) => {
    const response = await api.get('/intern-reports', {
      params: {
        internId,
        hostCompanyId,
        userRole,
        limit,
        skip
      }
    });
    return response.data;
  },
  // Fetch a single report by ID
  getById: async (reportId, userRole, userId = null, hostCompanyId = null) => {
    const response = await api.get(`/intern-reports/${reportId}`, {
      params: {
        userRole,
        userId,
        hostCompanyId
      }
    });
    return response.data;
  },
  // Update report status (admin only)
  updateStatus: async (reportId, status, adminNotes = null, reviewedByUserId = null) => {
    const response = await api.patch(`/intern-reports/${reportId}`, {
      userRole: 'ADMIN',
      status,
      adminNotes,
      reviewedByUserId
    });
    return response.data;
  }
};

// Devices API
export const devicesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/staff/admin/devices', { params });
    return response.data;
  },
  updateStatus: async (deviceId, action) => {
    const response = await api.patch(`/staff/admin/devices/${deviceId}`, { action });
    return response.data;
  },
};

export default api;
