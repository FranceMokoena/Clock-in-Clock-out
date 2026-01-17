import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, lightTheme } from '../context/ThemeContext';
import Recents from './Shared/Recents';
import { useNotifications } from '../context/NotificationContext';
import { getDeviceHeaders } from '../utils/deviceInfo';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { generateDashboardPDF } from '../utils/pdfGenerator';

// Global helper function for correction type labels - defined outside component for maximum accessibility
const getCorrectionTypeLabelGlobal = (type) => {
  if (!type) return 'Other';
  const typeStr = String(type);
  switch (typeStr) {
    case 'missing_clock_in':
      return 'Missing Clock-In';
    case 'missing_clock_out':
      return 'Missing Clock-Out';
    case 'wrong_time':
      return 'Wrong Time';
    case 'missing_break':
      return 'Missing Break';
    default:
      return typeStr.replace(/_/g, ' ') || 'Other';
  }
};

export default function AdminDashboard({ navigation, route }) {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme;
  const isDarkMode = themeContext?.isDarkMode || false;
  // Get user info from route params (set during login)
  const userInfo = route?.params?.userInfo || { type: 'admin' };
  const isAdmin = userInfo.type === 'admin';
  const isHostCompany = userInfo.type === 'hostCompany';
  const hostCompanyId = isHostCompany ? userInfo.id : null;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'staff', 'notAccountable'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  
  // Avatar dropdown and notifications
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const { unreadCount } = useNotifications();
  const [leaveNotificationViewed, setLeaveNotificationViewed] = useState(false);
  const [correctionsNotificationViewed, setCorrectionsNotificationViewed] = useState(false);
  
  // Dashboard stats
  const [stats, setStats] = useState(null);
  
  // Staff list with timesheets
  const [staff, setStaff] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Staff view states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffDetails, setShowStaffDetails] = useState(false);
  const [showTimesheetView, setShowTimesheetView] = useState(false);
  const [timesheetPeriod, setTimesheetPeriod] = useState('today'); // 'today', 'weekly', 'monthly'
  const [staffDetails, setStaffDetails] = useState(null);
  const [staffTimesheet, setStaffTimesheet] = useState([]);
  const [staffDetailsLoading, setStaffDetailsLoading] = useState(false);
  const [showStaffInfoExpanded, setShowStaffInfoExpanded] = useState(true);
  const [showLeaveApplicationsExpanded, setShowLeaveApplicationsExpanded] = useState(false);
  const [showAttendanceCorrectionsExpanded, setShowAttendanceCorrectionsExpanded] = useState(false);
  const [showRecentAttendanceExpanded, setShowRecentAttendanceExpanded] = useState(false);
  const [stipendAmountInput, setStipendAmountInput] = useState('');
  const [savingStipend, setSavingStipend] = useState(false);
  const [workingHoursInput, setWorkingHoursInput] = useState({
    workingDaysPerWeek: '',
    workingDaysPerMonth: '',
    hoursPerDay: '',
    weeklyHours: '',
    monthlyHours: '',
  });
  const [savingWorkingHours, setSavingWorkingHours] = useState(false);
  
  // Not accountable
  const [notAccountable, setNotAccountable] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // PDF export
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingDepartment, setExportingDepartment] = useState(false);
  const [exportingHostCompany, setExportingHostCompany] = useState(false);
  const [exportingAllDepartments, setExportingAllDepartments] = useState(false);
  const [exportingAllHostCompanies, setExportingAllHostCompanies] = useState(false);
  const [exportingLeavePDF, setExportingLeavePDF] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingCorrectionsCount, setPendingCorrectionsCount] = useState(0);
  const [reportsGeneratedCount, setReportsGeneratedCount] = useState(0);
  
  // Attendance Corrections state
  const [attendanceCorrections, setAttendanceCorrections] = useState([]);
  const [correctionsStatusFilter, setCorrectionsStatusFilter] = useState('pending');
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionRejectionReason, setCorrectionRejectionReason] = useState('');
  
  // Reports state
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [availableInterns, setAvailableInterns] = useState([]);
  const [previousReports, setPreviousReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    title: '',
    description: '',
    reportType: 'Behavioral',
    severity: 'Medium'
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [reportStatusUpdate, setReportStatusUpdate] = useState({
    status: 'Submitted',
    adminNotes: ''
  });
  const [processingCorrection, setProcessingCorrection] = useState(false);
  
  // Devices state
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const [showDeviceConfirm, setShowDeviceConfirm] = useState(false);
  const [deviceAction, setDeviceAction] = useState(null); // 'approve', 'reject', 'revoke'
  const [processingDevice, setProcessingDevice] = useState(false);
  const [deviceSearchTerm, setDeviceSearchTerm] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all'); // 'all', 'pending', 'trusted', 'revoked'
  const [deviceSortOrder, setDeviceSortOrder] = useState('newest'); // 'newest', 'oldest', 'name'
  
  // Helper function to load logo as base64
  const [logoBase64, setLogoBase64] = useState(null);
  const [watermarkBase64, setWatermarkBase64] = useState(null);
  
  useEffect(() => {
    const loadLogos = async () => {
      try {
        // Load watermark.png for watermark
        const watermarkAsset = Asset.fromModule(require('../assets/WATERMARK.png'));
        await watermarkAsset.downloadAsync();
        if (watermarkAsset.localUri) {
          const watermarkBase64Data = await FileSystem.readAsStringAsync(watermarkAsset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setWatermarkBase64(`data:image/png;base64,${watermarkBase64Data}`);
        }
        
        // Load cappp.jpg for header logo (with fallback)
        let logoAsset;
        try {
          logoAsset = Asset.fromModule(require('../assets/cappp.jpg'));
          await logoAsset.downloadAsync();
        } catch (error) {
          console.warn('⚠️ cappp.jpg not found, using APP -ICON.png as fallback');
          logoAsset = Asset.fromModule(require('../assets/APP-ICON.png'));
          await logoAsset.downloadAsync();
        }
        if (logoAsset.localUri) {
          const logoBase64Data = await FileSystem.readAsStringAsync(logoAsset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setLogoBase64(`data:image/jpeg;base64,${logoBase64Data}`);
        }
      } catch (error) {
        console.warn('Could not load logos:', error);
        // Don't set placeholder - leave as null so nothing shows
        // This prevents the green bar from appearing
      }
    };
    loadLogos();
  }, []);
  
  // Helper function to generate PDF header with logo
  const getPDFHeaderHTML = (title, subtitle = '') => {
    // Only show logo if it's actually loaded (not placeholder)
    const logo = logoBase64 && logoBase64 !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' 
      ? logoBase64 
      : null;
    
    return `
      <div style="position: relative; margin-bottom: 30px; border-bottom: 3px solid #3166AE; padding-bottom: 20px;">
        ${logo ? `
        <div style="position: absolute; top: 0; left: 0;">
          <img src="${logo}" alt="Internship Success Logo" style="width: 80px; height: 80px; object-fit: contain;" onerror="this.style.display='none';" />
        </div>
        ` : ''}
        <div style="text-align: center; ${logo ? 'margin-left: 100px;' : ''}">
          <h1 style="color: #3166AE; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px;">INTERNSHIP SUCCESS</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #4b5563; font-style: italic; text-transform: uppercase; letter-spacing: 1px;">
            Professional Recruitment, Placement, Management
          </p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280; letter-spacing: 0.5px;">
            Clock-In / Clock-Out System
          </p>
          <h2 style="color: #111827; margin: 10px 0 0 0; font-size: 18px; font-weight: 700;">${title}</h2>
          ${subtitle ? `<h3 style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px; font-weight: 400;">${subtitle}</h3>` : ''}
        </div>
      </div>
    `;
  };
  
  // Helper function to generate watermark CSS
  const getWatermarkCSS = () => {
    // Only use watermark if it's actually loaded (not placeholder)
    const watermark = watermarkBase64 && watermarkBase64 !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      ? watermarkBase64 
      : null;
    
    if (!watermark) return '';
    
    return `
      .watermark-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .watermark-logo {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        height: 80%;
        max-width: 600px;
        max-height: 600px;
        opacity: 0.05;
        background-image: url('${watermark}');
        background-repeat: no-repeat;
        background-size: contain;
        background-position: center;
      }
      body {
        position: relative;
        background: white;
      }
      body > * {
        position: relative;
        z-index: 1;
        background: transparent;
      }
      table, th, td {
        background: rgba(255, 255, 255, 0.98) !important;
      }
      .info-section, .summary, .staff-section, .company-section, .department-section {
        background: rgba(249, 250, 251, 0.98) !important;
      }
    `;
  };
  
  // Helper function to generate watermark HTML
  const getWatermarkHTML = () => {
    // Only use watermark if it's actually loaded (not placeholder)
    const watermark = watermarkBase64 && watermarkBase64 !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      ? watermarkBase64 
      : null;
    
    if (!watermark) return '';
    
    return `
      <div class="watermark-container">
        <div class="watermark-logo"></div>
      </div>
    `;
  };
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  // Day details modal
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);
  
  // Department interns modal
  const [showDepartmentInterns, setShowDepartmentInterns] = useState(false);
  const [showDepartmentDetails, setShowDepartmentDetails] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentInterns, setDepartmentInterns] = useState([]);
  const [loadingDepartmentInterns, setLoadingDepartmentInterns] = useState(false);
  
  // Host company detail view state
  const [showHostCompanyDetails, setShowHostCompanyDetails] = useState(false); // kept for backward compatibility, no longer used as modal
  const [selectedHostCompany, setSelectedHostCompany] = useState(null);
  const [hostCompanyDepartments, setHostCompanyDepartments] = useState([]);
  const [hostCompanyInterns, setHostCompanyInterns] = useState([]);
  const [loadingHostCompanyDetails, setLoadingHostCompanyDetails] = useState(false);

  // Leave applications
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [leaveApplicationStatusFilter, setLeaveApplicationStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [selectedLeaveApplication, setSelectedLeaveApplication] = useState(null);
  const [showLeaveApplicationModal, setShowLeaveApplicationModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingApplication, setProcessingApplication] = useState(false);

  const dynamicStyles = getDynamicStyles(theme);

  useEffect(() => {
    loadData();
    // Reset staff view states when switching away from staff view
    if (activeView !== 'staff') {
      setShowStaffDetails(false);
      setShowTimesheetView(false);
      setSelectedStaff(null);
      setStaffDetails(null);
      setStaffTimesheet([]);
    }
    // Reset device view states when switching away from devices view
    if (activeView !== 'devices') {
      setShowDeviceDetails(false);
      setShowDeviceConfirm(false);
      setSelectedDevice(null);
      setDeviceAction(null);
    }
  }, [activeView, selectedMonth, selectedYear, selectedDate]);

  // Apply filters when device filter params change
  useEffect(() => {
    if (activeView === 'devices' && devices.length > 0) {
      applyDeviceFilters(devices);
    }
  }, [deviceStatusFilter, deviceSearchTerm, deviceSortOrder, devices]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeView === 'dashboard') {
        await loadStats();
      } else if (activeView === 'staff') {
        await loadStaff();
      } else if (activeView === 'notAccountable') {
        await loadNotAccountable();
      } else if (activeView === 'leaveApplications') {
        await loadLeaveApplications();
      } else if (activeView === 'attendanceCorrections') {
        await loadAttendanceCorrections();
      } else if (activeView === 'hostCompanies') {
        await loadHostCompanies();
      } else if (activeView === 'recents') {
        // Recents view uses its own data hooks; nothing to preload here
        await Promise.resolve();
      } else if (activeView === 'reports') {
        await loadReportsData();
      } else if (activeView === 'devices') {
        await loadDevices();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadStats = async () => {
    try {
      const params = isHostCompany ? { hostCompanyId } : {};
      const response = await axios.get(`${API_BASE_URL}/staff/admin/stats`, { params });
      if (response.data.success) {
        setStats(response.data.stats);
      }

      // Load pending leave applications count for quick actions
      try {
        const leaveParams = {
          reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
          status: 'pending',
        };
        if (hostCompanyId) {
          leaveParams.hostCompanyId = hostCompanyId;
        }
        const leaveRes = await axios.get(`${API_BASE_URL}/staff/admin/leave-applications`, { params: leaveParams });
        if (leaveRes.data?.success && Array.isArray(leaveRes.data.applications)) {
          setPendingLeaveCount(leaveRes.data.applications.length);
        } else {
          setPendingLeaveCount(0);
        }
      } catch (leaveErr) {
        console.warn('Failed to load pending leave count:', leaveErr.message);
        setPendingLeaveCount(0);
      }

      // Load pending corrections count
      try {
        const correctionsParams = { status: 'pending', reviewerRole: isHostCompany ? 'hostCompany' : 'admin' };
        if (hostCompanyId) {
          correctionsParams.hostCompanyId = hostCompanyId;
        }
        const correctionsRes = await axios.get(`${API_BASE_URL}/staff/admin/attendance-corrections`, { params: correctionsParams });
        if (correctionsRes.data?.success && Array.isArray(correctionsRes.data.corrections)) {
          setPendingCorrectionsCount(correctionsRes.data.corrections.length);
        } else {
          setPendingCorrectionsCount(0);
        }
      } catch (correctionsErr) {
        console.warn('Failed to load pending corrections count:', correctionsErr.message);
        setPendingCorrectionsCount(0);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      throw error;
    }
  };

  const loadStaff = async () => {
    try {
      // Load staff list with full data from admin endpoint
      const today = new Date();
      const params = { 
        fullData: 'true', // Get all fields including department, hostCompany, etc.
        month: today.getMonth() + 1, // Current month (required by endpoint)
        year: today.getFullYear(), // Current year (required by endpoint)
        ...(isHostCompany && { hostCompanyId })
      };
      const response = await axios.get(`${API_BASE_URL}/staff/admin/staff`, { 
        params,
        timeout: 10000 // 10 second timeout
      });
      if (response.data.success) {
        // The admin/staff endpoint returns staff with all fields
        setStaff(response.data.staff);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      console.error('🔴 Network Error Details:');
      console.error('   API URL:', API_BASE_URL);
      console.error('   Error Message:', error.message);
      console.error('   Please ensure:');
      console.error('   1. Backend server is running on port 5000');
      console.error('   2. IP address (192.168.88.41) matches your computer');
      console.error('   3. Check firewall settings');
      throw error;
    }
  };

  // Note: loadStaffDetails is no longer needed - we use staff list data directly
  // Keeping function for potential future use but it's not called anymore

  const loadStaffTimesheet = async (staffId, period) => {
    try {
      setLoadingData(true);
      const today = new Date();
      let response;

      if (period === 'today') {
        // Use day-details endpoint for today
        const date = today.toISOString().split('T')[0];
        response = await axios.get(`${API_BASE_URL}/staff/admin/staff/${staffId}/day-details`, {
          params: { date },
          timeout: 10000 // 10 second timeout
        });
        
        if (response.data.success) {
          // Convert day-details logs to a single, accurate timesheet row
          const logs = response.data.logs || [];
          const aggregated = {
            date,
            clockInTime: null,
            clockOutTime: null,
            lunchStartTime: null,
            lunchEndTime: null,
            timeIn: null,
            timeOut: null,
            startLunch: null,
            endLunch: null,
          };

          logs.forEach(log => {
            if (log.clockType === 'in') {
              aggregated.clockInTime = aggregated.clockInTime || log.timestamp;
              aggregated.timeIn = aggregated.timeIn || log.time;
            } else if (log.clockType === 'out') {
              aggregated.clockOutTime = log.timestamp || aggregated.clockOutTime;
              aggregated.timeOut = log.time || aggregated.timeOut;
            } else if (log.clockType === 'break_start') {
              aggregated.lunchStartTime = aggregated.lunchStartTime || log.timestamp;
              aggregated.startLunch = aggregated.startLunch || log.time;
            } else if (log.clockType === 'break_end') {
              aggregated.lunchEndTime = log.timestamp || aggregated.lunchEndTime;
              aggregated.endLunch = log.time || aggregated.endLunch;
            }
          });

          setStaffTimesheet(logs.length ? [aggregated] : []);
        } else {
          setStaffTimesheet([]);
        }
      } else {
        // Use timesheet endpoint for weekly/monthly
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        
        response = await axios.get(`${API_BASE_URL}/staff/admin/staff/${staffId}/timesheet`, {
          params: { month, year },
          timeout: 10000 // 10 second timeout
        });
        
        if (response.data.success) {
          const timesheetData = response.data.timesheet || [];
          // Filter based on period
          if (period === 'weekly') {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            const weekEnd = new Date(today);
            const filtered = timesheetData.filter(entry => {
              const entryDate = new Date(entry.date);
              return entryDate >= weekStart && entryDate <= weekEnd;
            });
            setStaffTimesheet(filtered);
          } else if (period === 'monthly') {
            setStaffTimesheet(timesheetData);
          } else {
            setStaffTimesheet(timesheetData);
          }
        } else {
          setStaffTimesheet([]);
        }
      }
    } catch (error) {
      console.error('Error loading timesheet:', error);
      console.error('🔴 Network Error Details:');
      console.error('   API URL:', API_BASE_URL);
      console.error('   Staff ID:', staffId);
      console.error('   Period:', period);
      console.error('   Error Message:', error.message);
      console.error('   Please ensure:');
      console.error('   1. Backend server is running on port 5000');
      console.error('   2. IP address (192.168.88.41) matches your computer');
      console.error('   3. Check firewall settings');
      Alert.alert('Error', 'Failed to load timesheet data. Check that backend server is running.');
      setStaffTimesheet([]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadNotAccountable = async () => {
    try {
      const params = { 
        date: selectedDate,
        ...(isHostCompany && { hostCompanyId })
      };
      const response = await axios.get(`${API_BASE_URL}/staff/admin/not-accountable`, { params });
      if (response.data.success) {
        setNotAccountable(response.data.notAccountable);
      }
    } catch (error) {
      console.error('Error loading not accountable:', error);
      throw error;
    }
  };

  const handleViewDayDetails = async (staffIdentifier, date) => {
    try {
      setLoadingDayDetails(true);
      setShowDayDetails(true);
      
      // If staffIdentifier is an ID, use it directly; otherwise find by name
      let staffId = staffIdentifier;
      if (typeof staffIdentifier === 'string' && !staffIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a name, find the staff member
        const staffResponse = await axios.get(`${API_BASE_URL}/staff/list`);
        const staffMember = staffResponse.data.staff?.find(s => s.name === staffIdentifier);
        if (staffMember) {
          staffId = staffMember._id;
        } else {
          throw new Error('Staff member not found');
        }
      }

      const response = await axios.get(`${API_BASE_URL}/staff/admin/staff/${staffId}/day-details`, {
        params: { date }
      });

      if (response.data.success) {
        setSelectedDayDetails(response.data);
      }
    } catch (error) {
      console.error('Error loading day details:', error);
      Alert.alert('Error', 'Failed to load day details. Please try again.');
      setShowDayDetails(false);
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const exportDepartmentPDF = async (department) => {
    try {
      setExportingDepartment(true);
      
      // Load all interns for this department
      const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
        params: { 
          department: department.name,
          fullData: true,
          ...(isHostCompany && { hostCompanyId })
        }
      });
      
      const interns = internsResponse.data.success ? internsResponse.data.staff : [];
      
      // Create professional HTML table
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${getWatermarkCSS()}
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                padding: 30px;
                color: #1f2937;
                font-size: 12px;
                position: relative;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3166AE;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #3166AE;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
              }
              .header h2 {
                color: #6b7280;
                margin: 8px 0 0 0;
                font-size: 16px;
                font-weight: 400;
              }
              .info-section {
                margin-bottom: 30px;
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
              }
              .info-title {
                font-size: 16px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
              }
              .info-item {
                display: flex;
                flex-direction: column;
              }
              .info-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-value {
                color: #1f2937;
                font-size: 13px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 11px;
              }
              th {
                background-color: #3166AE;
                color: white;
                font-weight: 700;
                padding: 12px 8px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                border: 1px solid #e5e7eb;
                padding: 10px 8px;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              tr:hover {
                background-color: #f3f4f6;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #9ca3af;
                font-size: 10px;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              .no-data {
                text-align: center;
                padding: 30px;
                color: #9ca3af;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            ${getWatermarkHTML()}
            ${getPDFHeaderHTML('Department Report', department.name || 'Department')}
            
            <div class="info-section">
              <div class="info-title">Department Information</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Department Name</div>
                  <div class="info-value">${department.name || 'N/A'}</div>
                </div>
                ${department.departmentCode ? `
                <div class="info-item">
                  <div class="info-label">Department Code</div>
                  <div class="info-value">${department.departmentCode}</div>
                </div>
                ` : ''}
                <div class="info-item">
                  <div class="info-label">Company Name</div>
                  <div class="info-value">${department.companyName || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">${department.isActive ? 'Active' : 'Inactive'}</div>
                </div>
                ${department.location ? `
                <div class="info-item">
                  <div class="info-label">Location</div>
                  <div class="info-value">${department.location}</div>
                </div>
                ` : ''}
                ${department.locationAddress ? `
                <div class="info-item">
                  <div class="info-label">Address</div>
                  <div class="info-value">${department.locationAddress}</div>
                </div>
                ` : ''}
                ${department.locationLatitude && department.locationLongitude ? `
                <div class="info-item">
                  <div class="info-label">Coordinates</div>
                  <div class="info-value">${department.locationLatitude.toFixed(6)}, ${department.locationLongitude.toFixed(6)}</div>
                </div>
                ` : ''}
                ${department.description ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                  <div class="info-label">Description</div>
                  <div class="info-value">${department.description}</div>
                </div>
                ` : ''}
                ${department.createdAt ? `
                <div class="info-item">
                  <div class="info-label">Created At</div>
                  <div class="info-value">${new Date(department.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</div>
                </div>
                ` : ''}
                ${department.updatedAt ? `
                <div class="info-item">
                  <div class="info-label">Last Updated</div>
                  <div class="info-value">${new Date(department.updatedAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div class="info-section">
              <div class="info-title">Interns (${interns.length})</div>
              ${interns.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Surname</th>
                    <th>ID Number</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${interns.map(intern => `
                    <tr>
                      <td>${intern.name || 'N/A'}</td>
                      <td>${intern.surname || 'N/A'}</td>
                      <td>${intern.idNumber || 'N/A'}</td>
                      <td>${intern.phoneNumber || 'N/A'}</td>
                      <td>${intern.role || 'N/A'}</td>
                      <td>${intern.location || 'N/A'}</td>
                      <td>${intern.isActive ? 'Active' : 'Inactive'}</td>
                      <td>${intern.createdAt ? new Date(intern.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : '<div class="no-data">No interns found in this department</div>'}
            </div>
            
            <div class="footer">
              Generated on ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Department Report - ${department.name}`
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting department PDF:', error);
      Alert.alert('Error', 'Failed to export department data. Please try again.');
    } finally {
      setExportingDepartment(false);
    }
  };
  
  const exportAllDepartmentsPDF = async () => {
    try {
      setExportingAllDepartments(true);
      
      // Load all departments - for admin, get ALL departments; for host company, get only their departments
      const params = isHostCompany ? { hostCompanyId } : {};
      console.log('📊 Exporting all departments with params:', params);
      const deptResponse = await axios.get(`${API_BASE_URL}/staff/admin/departments/all`, {
        params
      });
      
      const allDepartments = deptResponse.data.success ? deptResponse.data.departments : [];
      console.log('📊 Total departments found:', allDepartments.length);
      
      if (allDepartments.length === 0) {
        Alert.alert('No Data', 'No departments found to export.');
        setExportingAllDepartments(false);
        return;
      }
      
      // Load all interns for each department
      const departmentsWithInterns = await Promise.all(
        allDepartments.map(async (dept) => {
          console.log(`📊 Loading interns for department: ${dept.name}`);
          const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
            params: { 
              department: dept.name,
              fullData: true,
              ...(isHostCompany && { hostCompanyId })
            }
          });
          const interns = internsResponse.data.success ? internsResponse.data.staff : [];
          console.log(`📊 Department "${dept.name}": ${interns.length} interns`);
          return {
            ...dept,
            interns
          };
        })
      );
      
      console.log(`📊 Exporting ${departmentsWithInterns.length} departments with interns`);
      
      // Create professional HTML table
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${getWatermarkCSS()}
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                padding: 30px;
                color: #1f2937;
                font-size: 12px;
                position: relative;
              }
              .summary {
                margin-bottom: 30px;
                background: #f0f9ff;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #3166AE;
              }
              .summary-title {
                font-size: 16px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 10px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
              }
              .summary-item {
                display: flex;
                flex-direction: column;
              }
              .summary-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .summary-value {
                color: #1f2937;
                font-size: 18px;
                font-weight: 700;
              }
              .department-section {
                margin-bottom: 40px;
                page-break-inside: avoid;
              }
              .department-header {
                background: #3166AE;
                color: white;
                padding: 15px 20px;
                border-radius: 8px 8px 0 0;
                margin-bottom: 0;
              }
              .department-title {
                font-size: 18px;
                font-weight: 700;
                margin: 0;
              }
              .info-section {
                background: #f9fafb;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .info-title {
                font-size: 14px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 20px;
              }
              .info-item {
                display: flex;
                flex-direction: column;
              }
              .info-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-value {
                color: #1f2937;
                font-size: 13px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                font-size: 11px;
              }
              th {
                background-color: #374151;
                color: white;
                font-weight: 700;
                padding: 12px 8px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                border: 1px solid #e5e7eb;
                padding: 10px 8px;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #9ca3af;
                font-size: 10px;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              .no-data {
                text-align: center;
                padding: 20px;
                color: #9ca3af;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            ${getWatermarkHTML()}
            ${getPDFHeaderHTML('All Departments Report', 'Complete Department & Intern Data')}
            
            <div class="summary">
              <div class="summary-title">Summary</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Total Departments</div>
                  <div class="summary-value">${allDepartments.length}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Interns</div>
                  <div class="summary-value">${departmentsWithInterns.reduce((sum, dept) => sum + dept.interns.length, 0)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Active Departments</div>
                  <div class="summary-value">${allDepartments.filter(d => d.isActive).length}</div>
                </div>
              </div>
            </div>
            
            ${departmentsWithInterns.map((dept, index) => `
              <div class="department-section">
                <div class="department-header">
                  <div class="department-title">${index + 1}. ${dept.name || 'Department'} ${dept.departmentCode ? `(${dept.departmentCode})` : ''}</div>
                </div>
                <div class="info-section">
                  <div class="info-title">Department Information</div>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Department Name</div>
                      <div class="info-value">${dept.name || 'N/A'}</div>
                    </div>
                    ${dept.departmentCode ? `
                    <div class="info-item">
                      <div class="info-label">Department Code</div>
                      <div class="info-value">${dept.departmentCode}</div>
                    </div>
                    ` : ''}
                    <div class="info-item">
                      <div class="info-label">Company Name</div>
                      <div class="info-value">${dept.companyName || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Status</div>
                      <div class="info-value">${dept.isActive ? 'Active' : 'Inactive'}</div>
                    </div>
                    ${dept.location ? `
                    <div class="info-item">
                      <div class="info-label">Location</div>
                      <div class="info-value">${dept.location}</div>
                    </div>
                    ` : ''}
                    ${dept.locationAddress ? `
                    <div class="info-item">
                      <div class="info-label">Address</div>
                      <div class="info-value">${dept.locationAddress}</div>
                    </div>
                    ` : ''}
                    ${dept.locationLatitude && dept.locationLongitude ? `
                    <div class="info-item">
                      <div class="info-label">Coordinates</div>
                      <div class="info-value">${dept.locationLatitude.toFixed(6)}, ${dept.locationLongitude.toFixed(6)}</div>
                    </div>
                    ` : ''}
                    ${dept.description ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                      <div class="info-label">Description</div>
                      <div class="info-value">${dept.description}</div>
                    </div>
                    ` : ''}
                    ${dept.createdAt ? `
                    <div class="info-item">
                      <div class="info-label">Created At</div>
                      <div class="info-value">${new Date(dept.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</div>
                    </div>
                    ` : ''}
                  </div>
                  
                  <div class="info-title">Interns (${dept.interns.length})</div>
                  ${dept.interns.length > 0 ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Surname</th>
                        <th>ID Number</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${dept.interns.map(intern => `
                        <tr>
                          <td>${intern.name || 'N/A'}</td>
                          <td>${intern.surname || 'N/A'}</td>
                          <td>${intern.idNumber || 'N/A'}</td>
                          <td>${intern.phoneNumber || 'N/A'}</td>
                          <td>${intern.role || 'N/A'}</td>
                          <td>${intern.location || 'N/A'}</td>
                          <td>${intern.isActive ? 'Active' : 'Inactive'}</td>
                          <td>${intern.createdAt ? new Date(intern.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  ` : '<div class="no-data">No interns found in this department</div>'}
                </div>
              </div>
            `).join('')}
            
            <div class="footer">
              Generated on ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `All Departments Report`
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting all departments PDF:', error);
      Alert.alert('Error', 'Failed to export all departments data. Please try again.');
    } finally {
      setExportingAllDepartments(false);
    }
  };
  
  const exportAllHostCompaniesPDF = async () => {
    try {
      setExportingAllHostCompanies(true);
      
      // Load all host companies - for admin, get ALL companies; for host company, get only their company
      const params = isHostCompany ? { hostCompanyId } : {};
      console.log('📊 Exporting all host companies with params:', params);
      const companiesResponse = await axios.get(`${API_BASE_URL}/staff/admin/host-companies`, {
        params
      });
      
      const allCompanies = companiesResponse.data.success ? companiesResponse.data.companies : [];
      console.log('📊 Total host companies found:', allCompanies.length);
      
      if (allCompanies.length === 0) {
        Alert.alert('No Data', 'No host companies found to export.');
        setExportingAllHostCompanies(false);
        return;
      }
      
      // Load all departments and interns for each company
      const companiesWithData = await Promise.all(
        allCompanies.map(async (company) => {
          console.log(`📊 Loading data for company: ${company.name}`);
          const [deptResponse, internsResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/staff/admin/departments/all`, {
              params: { hostCompanyId: company._id }
            }),
            axios.get(`${API_BASE_URL}/staff/admin/staff`, {
              params: { hostCompanyId: company._id, fullData: true }
            })
          ]);
          
          const departments = deptResponse.data.success ? deptResponse.data.departments : [];
          const interns = internsResponse.data.success ? internsResponse.data.staff : [];
          console.log(`📊 Company "${company.name}": ${departments.length} departments, ${interns.length} interns`);
          return {
            ...company,
            departments,
            interns
          };
        })
      );
      
      console.log(`📊 Exporting ${companiesWithData.length} companies with full data`);
      
      // Create professional HTML table
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${getWatermarkCSS()}
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                padding: 30px;
                color: #1f2937;
                font-size: 12px;
                position: relative;
              }
              .summary {
                margin-bottom: 30px;
                background: #f0f9ff;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #3166AE;
              }
              .summary-title {
                font-size: 16px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 10px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 15px;
              }
              .summary-item {
                display: flex;
                flex-direction: column;
              }
              .summary-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .summary-value {
                color: #1f2937;
                font-size: 18px;
                font-weight: 700;
              }
              .company-section {
                margin-bottom: 50px;
                page-break-inside: avoid;
              }
              .company-header {
                background: #3166AE;
                color: white;
                padding: 15px 20px;
                border-radius: 8px 8px 0 0;
                margin-bottom: 0;
              }
              .company-title {
                font-size: 18px;
                font-weight: 700;
                margin: 0;
              }
              .info-section {
                background: #f9fafb;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-top: none;
                margin-bottom: 20px;
              }
              .info-title {
                font-size: 14px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 20px;
              }
              .info-item {
                display: flex;
                flex-direction: column;
              }
              .info-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-value {
                color: #1f2937;
                font-size: 13px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                font-size: 11px;
              }
              th {
                background-color: #374151;
                color: white;
                font-weight: 700;
                padding: 12px 8px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                border: 1px solid #e5e7eb;
                padding: 10px 8px;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #9ca3af;
                font-size: 10px;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              .no-data {
                text-align: center;
                padding: 20px;
                color: #9ca3af;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            ${getWatermarkHTML()}
            ${getPDFHeaderHTML('All Host Companies Report', 'Complete Company, Department & Intern Data')}
            
            <div class="summary">
              <div class="summary-title">Summary</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Total Companies</div>
                  <div class="summary-value">${allCompanies.length}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Departments</div>
                  <div class="summary-value">${companiesWithData.reduce((sum, c) => sum + c.departments.length, 0)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Interns</div>
                  <div class="summary-value">${companiesWithData.reduce((sum, c) => sum + c.interns.length, 0)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Active Companies</div>
                  <div class="summary-value">${allCompanies.filter(c => c.isActive).length}</div>
                </div>
              </div>
            </div>
            
            ${companiesWithData.map((company, index) => `
              <div class="company-section">
                <div class="company-header">
                  <div class="company-title">${index + 1}. ${company.name || 'Host Company'}</div>
                </div>
                
                <div class="info-section">
                  <div class="info-title">Company Information</div>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Company Name</div>
                      <div class="info-value">${company.name || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Full Company Name</div>
                      <div class="info-value">${company.companyName || 'N/A'}</div>
                    </div>
                    ${company.registrationNumber ? `
                    <div class="info-item">
                      <div class="info-label">Registration Number</div>
                      <div class="info-value">${company.registrationNumber}</div>
                    </div>
                    ` : ''}
                    ${company.businessType ? `
                    <div class="info-item">
                      <div class="info-label">Business Type</div>
                      <div class="info-value">${company.businessType}</div>
                    </div>
                    ` : ''}
                    ${company.industry ? `
                    <div class="info-item">
                      <div class="info-label">Industry</div>
                      <div class="info-value">${company.industry}</div>
                    </div>
                    ` : ''}
                    ${company.operatingHours ? `
                    <div class="info-item">
                      <div class="info-label">Operating Hours</div>
                      <div class="info-value">${company.operatingHours}</div>
                    </div>
                    ` : ''}
                    ${company.emailAddress ? `
                    <div class="info-item">
                      <div class="info-label">Email Address</div>
                      <div class="info-value">${company.emailAddress}</div>
                    </div>
                    ` : ''}
                    <div class="info-item">
                      <div class="info-label">Status</div>
                      <div class="info-value">${company.isActive ? 'Active' : 'Inactive'}</div>
                    </div>
                    ${company.createdAt ? `
                    <div class="info-item">
                      <div class="info-label">Created At</div>
                      <div class="info-value">${new Date(company.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</div>
                    </div>
                    ` : ''}
                  </div>
                  
                  <div class="info-title">Departments (${company.departments.length})</div>
                  ${company.departments.length > 0 ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${company.departments.map(dept => `
                        <tr>
                          <td>${dept.name || 'N/A'}</td>
                          <td>${dept.departmentCode || '-'}</td>
                          <td>${dept.location || 'N/A'}</td>
                          <td>${dept.isActive ? 'Active' : 'Inactive'}</td>
                          <td>${dept.createdAt ? new Date(dept.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  ` : '<div class="no-data">No departments found</div>'}
                  
                  <div class="info-title" style="margin-top: 25px;">All Interns (${company.interns.length})</div>
                  ${company.interns.length > 0 ? `
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Surname</th>
                        <th>ID Number</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${company.interns.map(intern => `
                        <tr>
                          <td>${intern.name || 'N/A'}</td>
                          <td>${intern.surname || 'N/A'}</td>
                          <td>${intern.idNumber || 'N/A'}</td>
                          <td>${intern.phoneNumber || 'N/A'}</td>
                          <td>${intern.role || 'N/A'}</td>
                          <td>${intern.department || 'N/A'}</td>
                          <td>${intern.location || 'N/A'}</td>
                          <td>${intern.isActive ? 'Active' : 'Inactive'}</td>
                          <td>${intern.createdAt ? new Date(intern.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  ` : '<div class="no-data">No interns found</div>'}
                </div>
              </div>
            `).join('')}
            
            <div class="footer">
              Generated on ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `All Host Companies Report`
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting all host companies PDF:', error);
      Alert.alert('Error', 'Failed to export all host companies data. Please try again.');
    } finally {
      setExportingAllHostCompanies(false);
    }
  };

  const exportHostCompanyPDF = async (company) => {
    try {
      setExportingHostCompany(true);
      
      // Load all departments and interns for this host company
      const [deptResponse, internsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/staff/admin/departments/all`, {
          params: { hostCompanyId: company._id }
        }),
        axios.get(`${API_BASE_URL}/staff/admin/staff`, {
          params: { hostCompanyId: company._id, fullData: true }
        })
      ]);
      
      const departments = deptResponse.data.success ? deptResponse.data.departments : [];
      const interns = internsResponse.data.success ? internsResponse.data.staff : [];
      
      // Create professional HTML table
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                padding: 30px;
                color: #1f2937;
                font-size: 12px;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3166AE;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #3166AE;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
              }
              .header h2 {
                color: #6b7280;
                margin: 8px 0 0 0;
                font-size: 16px;
                font-weight: 400;
              }
              .info-section {
                margin-bottom: 30px;
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
              }
              .info-title {
                font-size: 16px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 15px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
              }
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
              }
              .info-item {
                display: flex;
                flex-direction: column;
              }
              .info-label {
                font-weight: 600;
                color: #6b7280;
                font-size: 11px;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-value {
                color: #1f2937;
                font-size: 13px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 11px;
              }
              th {
                background-color: #3166AE;
                color: white;
                font-weight: 700;
                padding: 12px 8px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                border: 1px solid #e5e7eb;
                padding: 10px 8px;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              tr:hover {
                background-color: #f3f4f6;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #9ca3af;
                font-size: 10px;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              .no-data {
                text-align: center;
                padding: 30px;
                color: #9ca3af;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            ${getWatermarkHTML()}
            ${getPDFHeaderHTML('Host Company Report', company.name || 'Host Company')}
            
            <div class="info-section">
              <div class="info-title">Company Information</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Company Name</div>
                  <div class="info-value">${company.name || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Full Company Name</div>
                  <div class="info-value">${company.companyName || 'N/A'}</div>
                </div>
                ${company.registrationNumber ? `
                <div class="info-item">
                  <div class="info-label">Registration Number</div>
                  <div class="info-value">${company.registrationNumber}</div>
                </div>
                ` : ''}
                ${company.businessType ? `
                <div class="info-item">
                  <div class="info-label">Business Type</div>
                  <div class="info-value">${company.businessType}</div>
                </div>
                ` : ''}
                ${company.industry ? `
                <div class="info-item">
                  <div class="info-label">Industry</div>
                  <div class="info-value">${company.industry}</div>
                </div>
                ` : ''}
                ${company.operatingHours ? `
                <div class="info-item">
                  <div class="info-label">Operating Hours</div>
                  <div class="info-value">${company.operatingHours}</div>
                </div>
                ` : ''}
                ${company.emailAddress ? `
                <div class="info-item">
                  <div class="info-label">Email Address</div>
                  <div class="info-value">${company.emailAddress}</div>
                </div>
                ` : ''}
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">${company.isActive ? 'Active' : 'Inactive'}</div>
                </div>
                ${company.createdAt ? `
                <div class="info-item">
                  <div class="info-label">Created At</div>
                  <div class="info-value">${new Date(company.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</div>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div class="info-section">
              <div class="info-title">Departments (${departments.length})</div>
              ${departments.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${departments.map(dept => `
                    <tr>
                      <td>${dept.name || 'N/A'}</td>
                      <td>${dept.departmentCode || '-'}</td>
                      <td>${dept.location || 'N/A'}</td>
                      <td>${dept.isActive ? 'Active' : 'Inactive'}</td>
                      <td>${dept.createdAt ? new Date(dept.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : '<div class="no-data">No departments found</div>'}
            </div>
            
            <div class="info-section">
              <div class="info-title">All Interns (${interns.length})</div>
              ${interns.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Surname</th>
                    <th>ID Number</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${interns.map(intern => `
                    <tr>
                      <td>${intern.name || 'N/A'}</td>
                      <td>${intern.surname || 'N/A'}</td>
                      <td>${intern.idNumber || 'N/A'}</td>
                      <td>${intern.phoneNumber || 'N/A'}</td>
                      <td>${intern.role || 'N/A'}</td>
                      <td>${intern.department || 'N/A'}</td>
                      <td>${intern.location || 'N/A'}</td>
                      <td>${intern.isActive ? 'Active' : 'Inactive'}</td>
                      <td>${intern.createdAt ? new Date(intern.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : '<div class="no-data">No interns found</div>'}
            </div>
            
            <div class="footer">
              Generated on ${new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Host Company Report - ${company.name}`
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting host company PDF:', error);
      Alert.alert('Error', 'Failed to export host company data. Please try again.');
    } finally {
      setExportingHostCompany(false);
    }
  };

  const exportPDF = async (staffMember) => {
    try {
      setExportingPDF(true);
      const response = await axios.get(
        `${API_BASE_URL}/staff/admin/staff/${staffMember._id}/timesheet`,
        { params: { month: selectedMonth, year: selectedYear } }
      );

      if (!response.data.success) {
        throw new Error('Failed to fetch timesheet data');
      }

      const { staff: staffData, timesheet } = response.data;
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

      // Create HTML for PDF
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${getWatermarkCSS()}
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #333;
                position: relative;
              }
              .info {
                margin-bottom: 30px;
              }
              .info-row {
                display: flex;
                margin-bottom: 10px;
              }
              .info-label {
                font-weight: bold;
                width: 150px;
              }
              .info-value {
                flex: 1;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #3166AE;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              .no-data {
                text-align: center;
                padding: 20px;
                color: #999;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            ${getWatermarkHTML()}
            ${getPDFHeaderHTML('Monthly Timesheet', `${monthName} ${selectedYear}`)}
            <div class="info">
              <div class="info-row">
                <div class="info-label">Name:</div>
                <div class="info-value">${staffData.name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">ID Number:</div>
                <div class="info-value">${staffData.idNumber}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Phone:</div>
                <div class="info-value">${staffData.phoneNumber}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Role:</div>
                <div class="info-value">${staffData.role}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Location:</div>
                <div class="info-value">${staffData.location}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Start Lunch</th>
                  <th>End Lunch</th>
                  <th>Time Out</th>
                </tr>
              </thead>
              <tbody>
                ${timesheet.length > 0 ? timesheet.map(entry => `
                  <tr style="${entry.extraHours ? 'background-color: #fee2e2;' : ''}">
                    <td>
                      ${new Date(entry.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                      ${entry.extraHours ? `<br><span style="color: #dc2626; font-size: 10px; font-weight: 600;">${entry.extraHours}</span>` : ''}
                    </td>
                    <td>${entry.timeIn || '-'}</td>
                    <td>${entry.startLunch || '-'}</td>
                    <td>${entry.endLunch || '-'}</td>
                    <td>${entry.timeOut || '-'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" class="no-data">No timesheet data available</td></tr>'}
              </tbody>
            </table>
            <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
              Generated on ${new Date().toLocaleString()}
            </div>
          </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html });
      
      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Timesheet - ${staffData.name} - ${monthName} ${selectedYear}`
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Export reports list as PDF (table)
  const exportReportsListPDF = async (reports = []) => {
    try {
      if (!reports || reports.length === 0) {
        Alert.alert('No Data', 'No reports available to export.');
        return;
      }
      setExportingPDF(true);

      const rowsHtml = reports.map((r, i) => `
        <tr>
          <td style="padding:8px; border:1px solid #ddd;">${i + 1}</td>
          <td style="padding:8px; border:1px solid #ddd;">${(r.title || '').replace(/</g, '&lt;')}</td>
          <td style="padding:8px; border:1px solid #ddd;">${(r.reportType || '')}</td>
          <td style="padding:8px; border:1px solid #ddd;">${(r.hostCompanyId?.name || r.hostCompanyId?.companyName || 'Unknown')}</td>
          <td style="padding:8px; border:1px solid #ddd;">${r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</td>
          <td style="padding:8px; border:1px solid #ddd;">${r.status || ''}</td>
          <td style="padding:8px; border:1px solid #ddd;">${r.severity || ''}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            ${getWatermarkCSS()}
            body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #3166AE; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9fafb; }
          </style>
        </head>
        <body>
          ${getWatermarkHTML()}
          ${getPDFHeaderHTML('Intern Reports', 'Exported Report List')}
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Type</th>
                <th>Company</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div style="margin-top:20px; color:#666; font-size:12px;">Generated: ${new Date().toLocaleString()}</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Intern Reports Export' });
      } else {
        Alert.alert('Exported', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting reports list PDF:', error);
      Alert.alert('Error', 'Failed to export reports.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Export a single report as PDF
  const exportReportPDF = async (report) => {
    try {
      setExportingPDF(true);
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            ${getWatermarkCSS()}
            body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
            .section { margin-bottom: 16px; }
            .label { font-weight: 700; color: #374151; width: 160px; display: inline-block; }
            .value { color: #111827; }
            .box { border-left: 4px solid #3166AE; background: #fff; padding: 12px; border-radius: 6px; }
          </style>
        </head>
        <body>
          ${getWatermarkHTML()}
          ${getPDFHeaderHTML(report.title || 'Report', report.reportType || '')}

          <div class="section box">
            <div><span class="label">Intern:</span> <span class="value">${report.internId?.name || report.internName || 'N/A'}</span></div>
            <div><span class="label">Company:</span> <span class="value">${report.hostCompanyId?.name || report.hostCompanyId?.companyName || 'N/A'}</span></div>
            <div><span class="label">Severity:</span> <span class="value">${report.severity || 'N/A'}</span></div>
            <div><span class="label">Status:</span> <span class="value">${report.status || 'N/A'}</span></div>
            <div style="margin-top:12px;"><span class="label">Incident Date:</span> <span class="value">${report.incidentDate ? new Date(report.incidentDate).toLocaleString() : 'N/A'}</span></div>
          </div>

          <div class="section">
            <h3 style="margin:8px 0; color:#111827;">Description</h3>
            <div class="box">${(report.description || 'No description provided').replace(/</g, '&lt;')}</div>
          </div>

          ${report.supportingNotes ? `
            <div class="section">
              <h3 style="margin:8px 0; color:#111827;">Supporting Notes</h3>
              <div class="box">${report.supportingNotes.replace(/</g, '&lt;')}</div>
            </div>
          ` : ''}

          ${report.adminNotes ? `
            <div class="section">
              <h3 style="margin:8px 0; color:#111827;">Admin Notes</h3>
              <div class="box">${report.adminNotes.replace(/</g, '&lt;')}</div>
            </div>
          ` : ''}

          <div style="margin-top:20px; color:#666; font-size:12px;">Generated: ${new Date().toLocaleString()}</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Report - ${report.title}` });
      } else {
        Alert.alert('Exported', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting report PDF:', error);
      Alert.alert('Error', 'Failed to export report PDF.');
    } finally {
      setExportingPDF(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getInitials = (first = '', last = '') => {
    const initials = `${first?.[0] || ''}${last?.[0] || ''}`.trim().toUpperCase();
    return initials || '•';
  };

  const formatDepartmentLabel = (departmentValue, fallbackName) => {
    const label = departmentValue?.name || departmentValue || fallbackName;
    if (!label) return 'N/A';
    if (typeof label === 'string' && /^[0-9a-fA-F]{24}$/.test(label)) {
      return 'Department';
    }
    return label;
  };

  // Simple Animated Circular Pie Chart Component
  const AnimatedPieChart = ({ data, size = 150, loading = false }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const { width: screenWidth } = Dimensions.get('window');
    const chartSize = Math.min(size, screenWidth * 0.4);
    const strokeWidth = 30;
    const radius = (chartSize - strokeWidth) / 2;
    
    useEffect(() => {
      // Only animate if not loading and data exists with values
      if (!loading && data && data.length > 0) {
        const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
        if (total > 0) {
          animatedValue.setValue(0); // Reset before animating
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }).start();
        } else {
          animatedValue.setValue(0);
        }
      } else {
        animatedValue.setValue(0);
      }
    }, [loading, data]);
    
    // Show loading only if explicitly loading AND no data yet
    if (loading && (!data || data.length === 0)) {
      return (
        <View style={[styles.pieChartContainer, { width: chartSize, height: chartSize, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }
    
    // Check for data
    if (!data || data.length === 0) {
      return (
        <View style={[styles.pieChartContainer, { width: chartSize, height: chartSize, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.pieChartEmptyText, dynamicStyles.pieChartEmptyText]}>No Data</Text>
        </View>
      );
    }
    
    // Calculate total and percentages
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    if (total === 0) {
      return (
        <View style={[styles.pieChartContainer, { width: chartSize, height: chartSize, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[styles.pieChartEmptyText, dynamicStyles.pieChartEmptyText]}>No Data</Text>
        </View>
      );
    }
    
    // Create slices with proper angles for circular pie chart
    let currentAngle = -90; // Start from top
    const slices = data.map((item) => {
      const value = item.value || 0;
      const percentage = (value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      
      return {
        ...item,
        value,
        percentage: percentage.toFixed(1),
        startAngle,
        endAngle,
        angle,
      };
    });
    
    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
    });
    
    return (
      <View style={[styles.pieChartContainer, { width: chartSize, height: chartSize }]}>
        <Animated.View
          style={[
            {
              width: chartSize,
              height: chartSize,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Background circle */}
          <View
            style={{
              position: 'absolute',
              width: chartSize,
              height: chartSize,
              borderRadius: chartSize / 2,
              backgroundColor: isDarkMode ? theme.surface : '#f5f5f5',
            }}
          />
          
          {/* Pie slices - using border-based approach for proper circular segments */}
          {slices.map((slice, index) => {
            const rotation = slice.startAngle;
            const sweepAngle = slice.angle;
            
            // Determine which borders to show based on angle
            const showTop = true; // Always show top for first quadrant
            const showRight = sweepAngle > 90;
            const showBottom = sweepAngle > 180;
            const showLeft = sweepAngle > 270;
            
            return (
              <Animated.View
                key={index}
                style={{
                  position: 'absolute',
                  width: chartSize,
                  height: chartSize,
                  transform: [{ rotate: `${rotation}deg` }],
                  opacity: animatedValue,
                }}
              >
                <View
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    left: (chartSize - radius * 2) / 2,
                    top: (chartSize - radius * 2) / 2,
                    borderRadius: radius,
                    borderWidth: strokeWidth,
                    borderColor: 'transparent',
                    borderTopColor: showTop ? slice.color : 'transparent',
                    borderRightColor: showRight ? slice.color : 'transparent',
                    borderBottomColor: showBottom ? slice.color : 'transparent',
                    borderLeftColor: showLeft ? slice.color : 'transparent',
                    transform: [{ rotate: `${Math.min(sweepAngle, 90) / 2}deg` }],
                  }}
                />
              </Animated.View>
            );
          })}
          
          {/* Center circle with total - properly centered */}
          <View
            style={{
              position: 'absolute',
              width: chartSize - strokeWidth * 2 - 6,
              height: chartSize - strokeWidth * 2 - 6,
              borderRadius: (chartSize - strokeWidth * 2 - 6) / 2,
              backgroundColor: isDarkMode ? theme.background : '#fff',
              top: strokeWidth + 3,
              left: strokeWidth + 3,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Text style={[styles.pieChartTotal, dynamicStyles.pieChartTotal]}>{total}</Text>
            <Text style={[styles.pieChartLabel, dynamicStyles.pieChartLabel]}>Total</Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  // Load interns for host company when reports view is active
  useEffect(() => {
    if (activeView === 'reports' && isHostCompany && hostCompanyId) {
      loadAvailableInterns();
    }
  }, [activeView, isHostCompany, hostCompanyId]);

  // Load reports for selected intern
  useEffect(() => {
    if (selectedIntern && isHostCompany) {
      loadInternReports(selectedIntern._id || selectedIntern.id);
    }
  }, [selectedIntern, isHostCompany]);

  const renderDashboard = () => {
    if (!stats) return null;
    
    // Prepare pie chart data - don't filter out zeros, show them
    const attendancePieData = [
      { label: 'Present', value: stats.currentlyIn || 0, color: '#4CAF50' },
      { label: 'Absent', value: Math.max(0, (stats.totalStaff || 0) - (stats.currentlyIn || 0)), color: '#F44336' },
    ];
    
    const statusPieData = [
      { label: 'On Time', value: Math.max(0, (stats.clockInsToday || 0) - (stats.lateArrivals || 0)), color: '#2196F3' },
      { label: 'Late', value: stats.lateArrivals || 0, color: '#FF9800' },
    ];

    return (
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.dashboardContainer}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Dashboard Overview</Text>
          
          {/* Pie Charts Section */}
          <View style={styles.pieChartsContainer}>
            <View style={[styles.pieChartCard, dynamicStyles.statCard]}>
              <Text style={[styles.pieChartTitle, dynamicStyles.statLabel]}>Attendance Status</Text>
              <AnimatedPieChart data={attendancePieData} size={220} loading={loading} />
              <View style={styles.pieChartLegend}>
                {attendancePieData.map((item, index) => (
                  <View key={index} style={styles.pieChartLegendItem}>
                    <View style={[styles.pieChartLegendColor, { backgroundColor: item.color }]} />
                    <Text style={[styles.pieChartLegendText, dynamicStyles.statLabel]}>
                      {item.label}: {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={[styles.pieChartCard, dynamicStyles.statCard]}>
              <Text style={[styles.pieChartTitle, dynamicStyles.statLabel]}>Clock-In Status</Text>
              <AnimatedPieChart data={statusPieData} size={180} loading={loading} />
              <View style={styles.pieChartLegend}>
                {statusPieData.map((item, index) => (
                  <View key={index} style={styles.pieChartLegendItem}>
                    <View style={[styles.pieChartLegendColor, { backgroundColor: item.color }]} />
                    <Text style={[styles.pieChartLegendText, dynamicStyles.statLabel]}>
                      {item.label}: {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            {/* Total Staff Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('staff');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.statIcon}>👥</Text>
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.totalStaff}</Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Total Staff</Text>
              </View>
            </TouchableOpacity>

            {/* Clock-Ins Today Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('notAccountable');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.statIcon}>⏰</Text>
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.clockInsToday}</Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Clock-Ins Today</Text>
              </View>
            </TouchableOpacity>
            
            {/* Currently In Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('staff');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.statIcon}>✅</Text>
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.currentlyIn}</Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Currently In</Text>
              </View>
            </TouchableOpacity>
            
            {/* Late Arrivals Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('notAccountable');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={styles.statIcon}>⚠️</Text>
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue, { color: stats.lateArrivals > 0 ? '#ED3438' : theme.success }]}>
                    {stats.lateArrivals}
                  </Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Late Arrivals</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle, { marginTop: 24 }]}>
            Quick Actions
          </Text>
          <View style={styles.statsGrid}>
            {/* Leave Applications Quick Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('leaveApplications');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.statIcon}>📝</Text>
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue]}>{pendingLeaveCount}</Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Pending Leave Applications</Text>
              </View>
            </TouchableOpacity>

            {/* Attendance Corrections Quick Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('attendanceCorrections');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={styles.statIcon}>⏰</Text>
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue]}>{pendingCorrectionsCount}</Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Pending Corrections</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Second row of Quick Actions */}
          <View style={[styles.statsGrid, { marginTop: 12 }]}>
            {/* Reports Quick Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('reports');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.statIcon}>📄</Text>
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue]}>{reportsGeneratedCount}</Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Official Reports</Text>
              </View>
            </TouchableOpacity>

            {/* Devices Quick Action */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActiveView('devices');
                setSidebarCollapsed(true);
              }}
              style={{ width: '48%' }}
            >
              <View style={[styles.statCard, dynamicStyles.statCard]}>
                <View style={styles.statCardTop}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#F3E5F5' }]}>
                    <MaterialIcons name="smartphone" size={24} color="#7e57c2" />
                  </View>
                  <Text style={[styles.statValue, dynamicStyles.statValue]}>
                    {devices.filter(d => d.status === 'pending').length}
                  </Text>
                </View>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Pending Devices</Text>
              </View>
            </TouchableOpacity>
          </View>

          {stats.lateArrivalsList && stats.lateArrivalsList.length > 0 && (
            <View style={[styles.lateListContainer, dynamicStyles.lateListContainer]}>
              <Text style={[styles.lateListTitle, dynamicStyles.lateListTitle]}>Late Arrivals Today</Text>
              {stats.lateArrivalsList.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.lateItem, dynamicStyles.lateItem]}
                  onPress={() => handleViewDayDetails(item.staffId || item.staffName, new Date().toISOString().split('T')[0])}
                  activeOpacity={0.7}
                >
                  <View style={styles.lateItemContent}>
                    <Text style={[styles.lateItemName, dynamicStyles.lateItemName]}>{item.staffName}</Text>
                    <Text style={[styles.lateItemTime, dynamicStyles.lateItemTime]}>{item.time}</Text>
                  </View>
                  <Text style={[styles.lateItemArrow, dynamicStyles.lateItemArrow]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const handleStaffClick = async (member) => {
    setSelectedStaff(member);
    setShowTimesheetView(false);
    setShowStaffDetails(true);
    setStaffDetails(null);
    setStaffDetailsLoading(true);

    try {
      // Start with the basic staff record we already have
      const fullDetails = { ...member };

      // For interns, enrich with their own dashboard + applications so this view
      // shows everything that exists in the intern dashboard
      if (member.role === 'Intern') {
        try {
          const [dashboardRes, leaveRes, correctionsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/staff/intern/dashboard`, {
              params: { internId: member._id, period: 'monthly' },
            }),
            axios.get(`${API_BASE_URL}/staff/intern/leave-applications`, {
              params: { internId: member._id },
            }),
            axios.get(`${API_BASE_URL}/staff/intern/attendance-corrections`, {
              params: { internId: member._id },
            }),
          ]);

          if (dashboardRes.data?.success) {
            fullDetails.attendanceSummary = dashboardRes.data.stats || null;
            fullDetails.recentAttendance =
              Array.isArray(dashboardRes.data.attendance) ? dashboardRes.data.attendance : [];
          }

          if (leaveRes.data?.success) {
            fullDetails.leaveApplications = Array.isArray(leaveRes.data.applications)
              ? leaveRes.data.applications
              : [];
          }

          if (correctionsRes.data?.success) {
            fullDetails.attendanceCorrections = Array.isArray(correctionsRes.data.corrections)
              ? correctionsRes.data.corrections
              : [];
          }
        } catch (detailErr) {
          console.error('Error loading intern dashboard data for staff profile:', detailErr);
        }
      }

      setStaffDetails(fullDetails);
      setStipendAmountInput(
        fullDetails.stipendAmount !== null && fullDetails.stipendAmount !== undefined
          ? String(fullDetails.stipendAmount)
          : ''
      );
      setWorkingHoursInput({
        workingDaysPerWeek:
          fullDetails.expectedWorkingDaysPerWeek !== null && fullDetails.expectedWorkingDaysPerWeek !== undefined
            ? String(fullDetails.expectedWorkingDaysPerWeek)
            : '',
        workingDaysPerMonth:
          fullDetails.expectedWorkingDaysPerMonth !== null && fullDetails.expectedWorkingDaysPerMonth !== undefined
            ? String(fullDetails.expectedWorkingDaysPerMonth)
            : '',
        hoursPerDay:
          fullDetails.expectedHoursPerDay !== null && fullDetails.expectedHoursPerDay !== undefined
            ? String(fullDetails.expectedHoursPerDay)
            : '',
        weeklyHours:
          fullDetails.expectedWeeklyHours !== null && fullDetails.expectedWeeklyHours !== undefined
            ? String(fullDetails.expectedWeeklyHours)
            : '',
        monthlyHours:
          fullDetails.expectedMonthlyHours !== null && fullDetails.expectedMonthlyHours !== undefined
            ? String(fullDetails.expectedMonthlyHours)
            : '',
      });
    } catch (error) {
      console.error('Error preparing staff details:', error);
      // Fallback so at least basic info still shows
      setStaffDetails(member);
      setStipendAmountInput(
        member.stipendAmount !== null && member.stipendAmount !== undefined
          ? String(member.stipendAmount)
          : ''
      );
      setWorkingHoursInput({
        workingDaysPerWeek:
          member.expectedWorkingDaysPerWeek !== null && member.expectedWorkingDaysPerWeek !== undefined
            ? String(member.expectedWorkingDaysPerWeek)
            : '',
        workingDaysPerMonth:
          member.expectedWorkingDaysPerMonth !== null && member.expectedWorkingDaysPerMonth !== undefined
            ? String(member.expectedWorkingDaysPerMonth)
            : '',
        hoursPerDay:
          member.expectedHoursPerDay !== null && member.expectedHoursPerDay !== undefined
            ? String(member.expectedHoursPerDay)
            : '',
        weeklyHours:
          member.expectedWeeklyHours !== null && member.expectedWeeklyHours !== undefined
            ? String(member.expectedWeeklyHours)
            : '',
        monthlyHours:
          member.expectedMonthlyHours !== null && member.expectedMonthlyHours !== undefined
            ? String(member.expectedMonthlyHours)
            : '',
      });
      Alert.alert('Error', 'Failed to load full staff profile. Showing basic details only.');
    } finally {
      setStaffDetailsLoading(false);
    }
  };

  const handleSaveStipend = async () => {
    const staffId = staffDetails?._id || staffDetails?.id || selectedStaff?._id;
    if (!staffId) {
      Alert.alert('Error', 'Staff record not available.');
      return;
    }

    const rawAmount = stipendAmountInput.trim();
    let stipendAmount = null;
    if (rawAmount !== '') {
      const parsedAmount = Number(rawAmount);
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        Alert.alert('Error', 'Enter a valid non-negative stipend amount.');
        return;
      }
      stipendAmount = parsedAmount;
    }

    try {
      setSavingStipend(true);
      const response = await axios.put(
        `${API_BASE_URL}/staff/admin/staff/${staffId}/stipend`,
        { stipendAmount },
        { params: isHostCompany ? { hostCompanyId } : {} }
      );

      if (response.data?.success) {
        const updatedAmount = response.data.stipendAmount ?? null;
        setStaffDetails(prev => (prev ? { ...prev, stipendAmount: updatedAmount } : prev));
        setStaff(prev => prev.map(member =>
          member._id === staffId ? { ...member, stipendAmount: updatedAmount } : member
        ));
        setStipendAmountInput(updatedAmount !== null && updatedAmount !== undefined ? String(updatedAmount) : '');
        Alert.alert('Success', updatedAmount === null ? 'Stipend cleared.' : 'Stipend updated successfully.');
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to update stipend.');
      }
    } catch (error) {
      console.error('Error updating stipend:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update stipend.');
    } finally {
      setSavingStipend(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    const staffId = staffDetails?._id || staffDetails?.id || selectedStaff?._id;
    if (!staffId) {
      Alert.alert('Error', 'Staff record not available.');
      return;
    }

    const parseOptionalNumber = (value, label) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      const parsedValue = Number(value);
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw new Error(`${label} must be a non-negative number.`);
      }
      return parsedValue;
    };

    let payload;
    try {
      payload = {
        expectedWorkingDaysPerWeek: parseOptionalNumber(workingHoursInput.workingDaysPerWeek, 'Working days per week'),
        expectedWorkingDaysPerMonth: parseOptionalNumber(workingHoursInput.workingDaysPerMonth, 'Working days per month'),
        expectedHoursPerDay: parseOptionalNumber(workingHoursInput.hoursPerDay, 'Hours per day'),
        expectedWeeklyHours: parseOptionalNumber(workingHoursInput.weeklyHours, 'Weekly hours'),
        expectedMonthlyHours: parseOptionalNumber(workingHoursInput.monthlyHours, 'Monthly hours'),
      };
    } catch (error) {
      Alert.alert('Error', error.message || 'Enter valid working hours values.');
      return;
    }

    try {
      setSavingWorkingHours(true);
      const response = await axios.put(
        `${API_BASE_URL}/staff/admin/staff/${staffId}/working-hours`,
        payload,
        { params: isHostCompany ? { hostCompanyId } : {} }
      );

      if (response.data?.success) {
        const updated = response.data.workingHours || {};
        setStaffDetails(prev => (prev ? { ...prev, ...updated } : prev));
        setStaff(prev => prev.map(member =>
          member._id === staffId ? { ...member, ...updated } : member
        ));
        setWorkingHoursInput({
          workingDaysPerWeek:
            updated.expectedWorkingDaysPerWeek !== null && updated.expectedWorkingDaysPerWeek !== undefined
              ? String(updated.expectedWorkingDaysPerWeek)
              : '',
          workingDaysPerMonth:
            updated.expectedWorkingDaysPerMonth !== null && updated.expectedWorkingDaysPerMonth !== undefined
              ? String(updated.expectedWorkingDaysPerMonth)
              : '',
          hoursPerDay:
            updated.expectedHoursPerDay !== null && updated.expectedHoursPerDay !== undefined
              ? String(updated.expectedHoursPerDay)
              : '',
          weeklyHours:
            updated.expectedWeeklyHours !== null && updated.expectedWeeklyHours !== undefined
              ? String(updated.expectedWeeklyHours)
              : '',
          monthlyHours:
            updated.expectedMonthlyHours !== null && updated.expectedMonthlyHours !== undefined
              ? String(updated.expectedMonthlyHours)
              : '',
        });
        Alert.alert('Success', 'Working hours updated successfully.');
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to update working hours.');
      }
    } catch (error) {
      console.error('Error updating working hours:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update working hours.');
    } finally {
      setSavingWorkingHours(false);
    }
  };

  const handleViewTimesheet = async (period) => {
    setTimesheetPeriod(period);
    setShowTimesheetView(true);
    await loadStaffTimesheet(selectedStaff._id, period);
  };

  const handleBackToList = () => {
    setShowStaffDetails(false);
    setShowTimesheetView(false);
    setSelectedStaff(null);
    setStaffDetails(null);
    setStaffTimesheet([]);
    setStipendAmountInput('');
    setWorkingHoursInput({
      workingDaysPerWeek: '',
      workingDaysPerMonth: '',
      hoursPerDay: '',
      weeklyHours: '',
      monthlyHours: '',
    });
  };

  const handleBackToDetails = () => {
    setShowTimesheetView(false);
    setStaffTimesheet([]);
  };

  // Helper function for correction type labels - must be defined before renderStaffDetails
  // Using a const arrow function assigned to a variable that's accessible everywhere
  const getCorrectionTypeLabel = (type) => {
    if (!type) return 'Other';
    const typeStr = String(type);
    switch (typeStr) {
      case 'missing_clock_in':
        return 'Missing Clock-In';
      case 'missing_clock_out':
        return 'Missing Clock-Out';
      case 'wrong_time':
        return 'Wrong Time';
      case 'missing_break':
        return 'Missing Break';
      default:
        return typeStr.replace(/_/g, ' ') || 'Other';
    }
  };

  // Safe wrapper function that always works - uses global function as fallback
  const safeGetCorrectionTypeLabel = (type) => {
    try {
      // Try component-level function first
      if (typeof getCorrectionTypeLabel === 'function') {
        return safeGetCorrectionTypeLabel(type);
      }
      // Fallback to global function
      if (typeof getCorrectionTypeLabelGlobal === 'function') {
        return getCorrectionTypeLabelGlobal(type);
      }
    } catch (e) {
      // Fallback if function not accessible
    }
    // Final fallback implementation
    if (!type) return 'Other';
    const typeStr = String(type);
    switch (typeStr) {
      case 'missing_clock_in': return 'Missing Clock-In';
      case 'missing_clock_out': return 'Missing Clock-Out';
      case 'wrong_time': return 'Wrong Time';
      case 'missing_break': return 'Missing Break';
      default: return typeStr.replace(/_/g, ' ') || 'Other';
    }
  };

  const exportTimesheetPDF = async () => {
    if (!selectedStaff || !staffTimesheet) return;
    
    try {
      setExportingPDF(true);
      
      const periodLabel = timesheetPeriod === 'today' ? 'Daily' : 
                         timesheetPeriod === 'weekly' ? 'Weekly' : 'Monthly';

      // Calculate stats matching the UI
      const completeDays = staffTimesheet.filter(e => (e.timeOut || e.clockOutTime) && (e.timeIn || e.clockInTime)).length;
      const incompleteDays = staffTimesheet.filter(e => !e.timeOut && !e.clockOutTime).length;
      const attendanceRate = staffTimesheet.length > 0 ? Math.round((completeDays / staffTimesheet.length) * 100) : 0;

      const formatTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      };

      const formatDateOnly = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      };
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                padding: 30px;
                color: #1f2937;
                font-size: 12px;
                position: relative;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3166AE;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #3166AE;
                margin: 0;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: 1px;
              }
              .header p.subtitle {
                margin: 4px 0 0 0;
                font-size: 11px;
                color: #4b5563;
                font-style: italic;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .header p.system {
                margin: 4px 0 0 0;
                font-size: 11px;
                color: #6b7280;
                letter-spacing: 0.5px;
              }
              .header h2 {
                color: #111827;
                margin: 10px 0 0 0;
                font-size: 18px;
                font-weight: 700;
              }
              .header h3 {
                color: #6b7280;
                margin: 4px 0 0 0;
                font-size: 14px;
                font-weight: 400;
              }
              .info-section {
                margin-bottom: 20px;
                background: #f9fafb;
                padding: 15px;
                border-radius: 8px;
              }
              .info-section p {
                margin: 6px 0;
                font-size: 12px;
              }
              .info-section strong {
                color: #374151;
              }
              .summary-section {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                margin-bottom: 25px;
              }
              .summary-card {
                flex: 1;
                min-width: 120px;
                background: #f0f9ff;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                border-left: 4px solid #3166AE;
              }
              .summary-card .value {
                font-size: 24px;
                font-weight: 700;
                color: #3166AE;
                margin-bottom: 4px;
              }
              .summary-card .label {
                font-size: 11px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 11px;
              }
              th {
                background-color: #3166AE;
                color: white;
                font-weight: 700;
                padding: 12px 8px;
                text-align: left;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              td {
                border: 1px solid #e5e7eb;
                padding: 10px 8px;
                text-align: left;
              }
              tr:nth-child(even) {
                background-color: #f9fafb;
              }
              .status-complete {
                color: #059669;
                font-weight: 600;
              }
              .status-incomplete {
                color: #dc2626;
                font-weight: 600;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                font-size: 10px;
                color: #9ca3af;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>INTERNSHIP SUCCESS</h1>
              <p class="subtitle">Professional Recruitment, Placement, Management</p>
              <p class="system">Clock-In / Clock-Out System</p>
              <h2>Attendance Timesheet</h2>
              <h3>${periodLabel} Report</h3>
            </div>
            
            <div class="info-section">
              <p><strong>Name:</strong> ${selectedStaff.name} ${selectedStaff.surname || ''}</p>
              <p><strong>Department:</strong> ${selectedStaff.department || 'N/A'}</p>
              <p><strong>Company:</strong> ${selectedStaff.hostCompany?.companyName || selectedStaff.hostCompany?.name || 'N/A'}</p>
              <p><strong>Period:</strong> ${periodLabel}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}</p>
            </div>
            
            <div class="summary-section">
              <div class="summary-card">
                <div class="value">${staffTimesheet.length}</div>
                <div class="label">Days Recorded</div>
              </div>
              <div class="summary-card">
                <div class="value">${completeDays}</div>
                <div class="label">Complete Days</div>
              </div>
              <div class="summary-card">
                <div class="value">${incompleteDays}</div>
                <div class="label">Incomplete</div>
              </div>
              <div class="summary-card">
                <div class="value">${attendanceRate}%</div>
                <div class="label">Attendance Rate</div>
              </div>
            </div>
            
            ${staffTimesheet.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${staffTimesheet.map(record => `
                    <tr>
                      <td>${formatDateOnly(record.date || record.clockInTime)}</td>
                      <td>${record.timeIn || (record.clockInTime ? formatTime(record.clockInTime) : '-')}</td>
                      <td>${record.timeOut || (record.clockOutTime ? formatTime(record.clockOutTime) : '-')}</td>
                      <td>${record.hoursWorkedFormatted || '0h 0m'}</td>
                      <td class="${record.timeOut || record.clockOutTime ? 'status-complete' : 'status-incomplete'}">
                        ${record.timeOut || record.clockOutTime ? 'Complete' : 'Incomplete'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="text-align: center; padding: 30px; color: #9ca3af;">No timesheet data available for this period</p>'}
            
            <div class="footer">
              <p>Generated by Internship Success Clock-In/Clock-Out System</p>
              <p>© ${new Date().getFullYear()} Internship Success. All rights reserved.</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Timesheet - ${selectedStaff.name} ${selectedStaff.surname || ''}`,
        });
      } else {
        Alert.alert('Success', `Timesheet saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error exporting timesheet PDF:', error);
      Alert.alert('Error', 'Failed to export timesheet PDF.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Render staff list
  const renderStaffList = () => {
    return (
      <View style={styles.content}>
        {/* Official Header */}
        <View style={{
          backgroundColor: theme.primary,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 20,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: theme.primaryDark,
        }}>
          <Text style={{
            fontSize: 22,
            fontWeight: '800',
            color: '#fff',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Staff Registry
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#fff',
            opacity: 0.9,
            letterSpacing: 0.5,
          }}>
            Official Personnel Directory
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 20,
          paddingHorizontal: 4,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: theme.primary,
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: theme.primary }}>
              {staff.length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Total Staff
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: '#16a34a',
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#16a34a' }}>
              {staff.filter(s => s.role === 'Intern').length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Interns
            </Text>
          </View>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {staff.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No staff members found</Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
              borderRadius: 12,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border,
            }}>
              {/* Table Header */}
              <View style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}>
                  REGISTERED PERSONNEL
                </Text>
              </View>

              {/* Column Headers */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: theme.primary,
              }}>
                <Text style={{ flex: 2.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Name
                </Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Role
                </Text>
                <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Status
                </Text>
                <Text style={{ flex: 1.3, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Location
                </Text>
              </View>

              {/* Staff List Items */}
              {staff.map((member, index) => (
                <TouchableOpacity
                  key={member._id}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    backgroundColor: index % 2 === 0 
                      ? (isDarkMode ? '#1e293b' : '#fff')
                      : (isDarkMode ? '#243447' : '#f8fafc'),
                    borderBottomWidth: index < staff.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                    alignItems: 'center',
                  }}
                  onPress={() => handleStaffClick(member)}
                  activeOpacity={0.6}
                >
                  {/* Name Column with Avatar */}
                  <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                      <Text style={{
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: '700',
                      }}>
                        {getInitials(member.name, member.surname)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: theme.text,
                        marginBottom: 3,
                      }}>
                        {member.name} {member.surname || ''}
                      </Text>
                    </View>
                  </View>

                  {/* Role Column */}
                  <View style={{ flex: 1.5 }}>
                    <View style={{
                      backgroundColor: member.role === 'Intern' ? '#16a34a20' : theme.primary + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignSelf: 'flex-start',
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: member.role === 'Intern' ? '#16a34a' : theme.primary,
                        textTransform: 'uppercase',
                      }}>
                        {member.role || 'Staff'}
                      </Text>
                    </View>
                  </View>

                  {/* Status Column */}
                  <View style={{ flex: 1.2, justifyContent: 'center' }}>
                    <View style={{
                      backgroundColor: member.isActive ? '#16a34a20' : '#dc262620',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignSelf: 'flex-start',
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: member.isActive ? '#16a34a' : '#dc2626',
                        textTransform: 'uppercase',
                      }}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  {/* Location Column */}
                  <Text style={{
                    flex: 1.3,
                    fontSize: 12,
                    color: theme.textSecondary,
                  }}>
                    {member.location || '—'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render staff details
  const renderStaffDetails = () => {
    if (staffDetailsLoading && !staffDetails) {
      return (
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, dynamicStyles.loadingText]}>
              Loading staff profile...
            </Text>
          </View>
        </View>
      );
    }

    if (!staffDetails) return null;

    const formatAttendanceDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatAttendanceTime = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    const formatStipendAmount = (amount) => {
      if (amount === null || amount === undefined || amount === '') return 'Not set';
      const numeric = Number(amount);
      if (Number.isNaN(numeric)) return String(amount);
      return `R ${numeric.toFixed(2)}`;
    };

    const formatWorkingHoursValue = (value) => {
      if (value === null || value === undefined || value === '') return 'Not set';
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return String(value);
      if (Number.isInteger(numeric)) return String(numeric);
      return numeric.toFixed(2);
    };

    return (
      <View style={styles.content}>
        <ScrollView>
          <View style={[styles.staffDetailsCard, dynamicStyles.staffCard, styles.officialCard]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToList}
            >
              <Text style={styles.backButtonText}>← Back to List</Text>
            </TouchableOpacity>

            <View style={[styles.officialRibbon, { backgroundColor: theme.primary }]}>
              <View>
                <Text style={styles.officialRibbonText}>Official Staff Record</Text>
                <Text style={styles.officialRibbonSubText}>Verified Personnel Profile</Text>
              </View>
              <Text style={styles.officialRibbonBadge}>Secure</Text>
            </View>

            <View style={styles.staffDetailsHeader}>
              <View style={styles.staffDetailsAvatar}>
                <Text style={styles.staffAvatarLarge}>
                  {getInitials(staffDetails.name, staffDetails.surname)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.staffDetailsName, dynamicStyles.staffName]}>
                  {staffDetails.name} {staffDetails.surname || ''}
                </Text>
                <Text style={[styles.staffDetailsRole, dynamicStyles.staffDetails]}>
                  {staffDetails.role || 'Staff'}
                </Text>
              </View>
            </View>

            {/* Collapsible identity / placement block */}
            <View style={[styles.staffDetailsInfo, styles.collapsibleCard]}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setShowStaffInfoExpanded((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                  Identity & Placement
                </Text>
                <Text style={styles.collapsibleArrow}>
                  {showStaffInfoExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showStaffInfoExpanded && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>ID Number:</Text>
                    <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                      {staffDetails.idNumber || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Email:</Text>
                    <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                      {staffDetails.email || staffDetails.emailAddress || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Phone:</Text>
                    <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                      {staffDetails.phoneNumber || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Location:</Text>
                    <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                      {staffDetails.location || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Department:</Text>
                    <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                      {formatDepartmentLabel(staffDetails.department, staffDetails.departmentName)}
                    </Text>
                  </View>
                  {staffDetails.mentorName && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Mentor:</Text>
                      <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                        {staffDetails.mentorName}
                      </Text>
                    </View>
                  )}
                  {staffDetails.hostCompany && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Company:</Text>
                      <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                        {staffDetails.hostCompany.name ||
                          staffDetails.hostCompany.companyName ||
                          'N/A'}
                      </Text>
                    </View>
                  )}
                  {staffDetails.hostCompanyId && !staffDetails.hostCompany && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Company ID:</Text>
                      <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                        {staffDetails.hostCompanyId}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={[styles.staffDetailsInfo, styles.officialCard, { marginTop: 16, padding: 0, overflow: 'hidden' }]}>
              <View style={[styles.officialRibbon, { backgroundColor: theme.primary }]}>
                <View>
                  <Text style={styles.officialRibbonText}>Stipend Details</Text>
                  <Text style={styles.officialRibbonSubText}>Assign or update stipend amount</Text>
                </View>
              </View>
              <View style={{ padding: 16 }}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Current Stipend:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                    {formatStipendAmount(staffDetails.stipendAmount)}
                  </Text>
                </View>
                <Text style={[styles.detailLabel, dynamicStyles.statLabel, { marginTop: 8 }]}>Stipend Amount</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={stipendAmountInput}
                  onChangeText={setStipendAmountInput}
                  placeholder="Enter stipend amount"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.modalSaveButton, dynamicStyles.modalSaveButton, { marginTop: 12 }]}
                  onPress={handleSaveStipend}
                  disabled={savingStipend}
                >
                  {savingStipend ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Save Stipend</Text>
                  )}
                </TouchableOpacity>
                <Text style={[styles.helperText, dynamicStyles.helperText, { marginTop: 8 }]}>
                  Leave blank to clear the stipend amount.
                </Text>
              </View>
            </View>

            <View style={[styles.staffDetailsInfo, styles.officialCard, { marginTop: 16, padding: 0, overflow: 'hidden' }]}>
              <View style={[styles.officialRibbon, { backgroundColor: theme.primary }]}>
                <View>
                  <Text style={styles.officialRibbonText}>Working Hours</Text>
                  <Text style={styles.officialRibbonSubText}>Assign expected daily, weekly, and monthly hours</Text>
                </View>
              </View>
              <View style={{ padding: 16 }}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Working Days per Week:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                    {formatWorkingHoursValue(staffDetails.expectedWorkingDaysPerWeek)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Working Days per Month:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                    {formatWorkingHoursValue(staffDetails.expectedWorkingDaysPerMonth)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Hours per Day:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                    {formatWorkingHoursValue(staffDetails.expectedHoursPerDay)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Weekly Hours:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                    {formatWorkingHoursValue(staffDetails.expectedWeeklyHours)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Monthly Hours:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                    {formatWorkingHoursValue(staffDetails.expectedMonthlyHours)}
                  </Text>
                </View>

                <Text style={[styles.detailLabel, dynamicStyles.statLabel, { marginTop: 8 }]}>Working Days per Week</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={workingHoursInput.workingDaysPerWeek}
                  onChangeText={(value) => setWorkingHoursInput(prev => ({ ...prev, workingDaysPerWeek: value }))}
                  placeholder="Enter working days per week"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  keyboardType="numeric"
                />

                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Working Days per Month</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={workingHoursInput.workingDaysPerMonth}
                  onChangeText={(value) => setWorkingHoursInput(prev => ({ ...prev, workingDaysPerMonth: value }))}
                  placeholder="Enter working days per month"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  keyboardType="numeric"
                />

                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Hours per Day</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={workingHoursInput.hoursPerDay}
                  onChangeText={(value) => setWorkingHoursInput(prev => ({ ...prev, hoursPerDay: value }))}
                  placeholder="Enter hours per day"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  keyboardType="numeric"
                />

                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Weekly Hours</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={workingHoursInput.weeklyHours}
                  onChangeText={(value) => setWorkingHoursInput(prev => ({ ...prev, weeklyHours: value }))}
                  placeholder="Enter weekly hours"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  keyboardType="numeric"
                />

                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Monthly Hours</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={workingHoursInput.monthlyHours}
                  onChangeText={(value) => setWorkingHoursInput(prev => ({ ...prev, monthlyHours: value }))}
                  placeholder="Enter monthly hours"
                  placeholderTextColor={theme.textTertiary || '#9ca3af'}
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={[styles.modalSaveButton, dynamicStyles.modalSaveButton, { marginTop: 12 }]}
                  onPress={handleSaveWorkingHours}
                  disabled={savingWorkingHours}
                >
                  {savingWorkingHours ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Save Working Hours</Text>
                  )}
                </TouchableOpacity>
                <Text style={[styles.helperText, dynamicStyles.helperText, { marginTop: 8 }]}>
                  Leave blank to clear assigned working hours. Earnings are based on actual attendance.
                </Text>
              </View>
            </View>

            {/* High-level performance overview (official-style stat cards) */}
            {(staffDetails.attendanceSummary ||
              staffDetails.leaveApplications ||
              staffDetails.attendanceCorrections) && (
              <View style={[styles.staffDetailsInfo, styles.officialCard, { marginTop: 16, padding: 0, overflow: 'hidden' }]}>
                <View style={[styles.officialRibbon, { backgroundColor: theme.primary }]}>
                  <View>
                    <Text style={styles.officialRibbonText}>Performance Overview</Text>
                    <Text style={styles.officialRibbonSubText}>Key Performance Indicators</Text>
                  </View>
                </View>
                <View style={{ padding: 16 }}>
                  <View style={styles.performanceGrid}>
                    {staffDetails.attendanceSummary && (
                      <>
                        <View style={[styles.performanceCard, { borderLeftColor: theme.primary }]}>
                          <Text style={styles.performanceLabel}>Hours Worked</Text>
                          <Text style={[styles.performanceValue, { color: theme.primary }]}>
                            {staffDetails.attendanceSummary.totalHours || '0.0'}
                          </Text>
                          <Text style={styles.performanceUnit}>hours</Text>
                        </View>
                        <View style={[styles.performanceCard, { borderLeftColor: '#16a34a' }]}>
                          <Text style={styles.performanceLabel}>Days Present</Text>
                          <Text style={[styles.performanceValue, { color: '#16a34a' }]}>
                            {staffDetails.attendanceSummary.daysPresent || '0'}
                          </Text>
                          <Text style={styles.performanceUnit}>days</Text>
                        </View>
                        <View style={[styles.performanceCard, { borderLeftColor: '#eab308' }]}>
                          <Text style={styles.performanceLabel}>Attendance Rate</Text>
                          <Text style={[styles.performanceValue, { color: '#eab308' }]}>
                            {(staffDetails.attendanceSummary.attendanceRate || '0') + '%'}
                          </Text>
                          <Text style={styles.performanceUnit}>compliance</Text>
                        </View>
                      </>
                    )}

                    <View style={[styles.performanceCard, { borderLeftColor: '#3b82f6' }]}>
                      <Text style={styles.performanceLabel}>Leave Applications</Text>
                      <Text style={[styles.performanceValue, { color: '#3b82f6' }]}>
                        {Array.isArray(staffDetails.leaveApplications)
                          ? staffDetails.leaveApplications.length
                          : 0}
                      </Text>
                      <Text style={styles.performanceUnit}>requests</Text>
                    </View>

                    <View style={[styles.performanceCard, { borderLeftColor: '#dc2626' }]}>
                      <Text style={styles.performanceLabel}>Corrections</Text>
                      <Text style={[styles.performanceValue, { color: '#dc2626' }]}>
                        {Array.isArray(staffDetails.attendanceCorrections)
                          ? staffDetails.attendanceCorrections.length
                          : 0}
                      </Text>
                      <Text style={styles.performanceUnit}>pending</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Recent attendance detail, similar to intern dashboard */}
            {staffDetails.recentAttendance && staffDetails.recentAttendance.length > 0 && (
              <View style={[styles.staffDetailsInfo, styles.collapsibleCard, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={styles.collapsibleHeader}
                  onPress={() => setShowRecentAttendanceExpanded((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                    Recent Attendance ({staffDetails.recentAttendance.length})
                  </Text>
                  <Text style={styles.collapsibleArrow}>
                    {showRecentAttendanceExpanded ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {showRecentAttendanceExpanded && (
                  <View style={{ marginTop: 12 }}>
                    {staffDetails.recentAttendance.slice(0, 10).map((record, idx) => (
                      <View key={idx} style={[styles.officialAttendanceRow, idx < staffDetails.recentAttendance.slice(0, 10).length - 1 && { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }]}>
                        <View style={{ flex: 1.5 }}>
                          <Text style={styles.officialAttendanceDate}>
                            {formatAttendanceDate(record.date)}
                          </Text>
                          <Text style={styles.officialAttendanceDay}>
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </Text>
                        </View>
                        <View style={{ flex: 2, flexDirection: 'row', gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.officialAttendanceLabel}>Clock-In</Text>
                            <Text style={styles.officialAttendanceTime}>
                              {formatAttendanceTime(record.clockIn)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.officialAttendanceLabel}>Clock-Out</Text>
                            <Text style={styles.officialAttendanceTime}>
                              {formatAttendanceTime(record.clockOut)}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={styles.officialAttendanceLabel}>Hours</Text>
                          <Text style={[styles.officialAttendanceHours, { color: theme.primary }]}>
                            {record.hoursWorked || '0.0'}h
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Leave applications tied to this intern */}
            {staffDetails.leaveApplications && staffDetails.leaveApplications.length > 0 && (
              <View style={[styles.staffDetailsInfo, styles.collapsibleCard, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={styles.collapsibleHeader}
                  onPress={() => setShowLeaveApplicationsExpanded((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                    Leave Applications ({staffDetails.leaveApplications.length})
                  </Text>
                  <Text style={styles.collapsibleArrow}>
                    {showLeaveApplicationsExpanded ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {showLeaveApplicationsExpanded && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 12, opacity: 0.8, marginBottom: 12, paddingHorizontal: 4 }]}>
                      Tap any record below to view the official leave document and export the PDF.
                    </Text>
                    {staffDetails.leaveApplications.map((app, appIdx) => {
                      if (!app) return null;
                      return (
                        <View
                          key={app._id || appIdx}
                          style={{
                            marginBottom: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3,
                          }}
                        >
                          {/* Header Ribbon */}
                          <View style={{
                            backgroundColor: theme.primary,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }} numberOfLines={1}>
                                {app.leaveType || 'Leave'} Leave
                              </Text>
                              <Text style={{
                                color: '#e5edfb',
                                fontSize: 11,
                                marginTop: 2,
                              }}>
                                {app.numberOfDays || 0} {app.numberOfDays === 1 ? 'day' : 'days'}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: app.status === 'approved' ? '#16a34a' + '30' : 
                                                 app.status === 'rejected' ? '#dc2626' + '30' : '#eab308' + '30',
                                borderColor: app.status === 'approved' ? '#16a34a' : 
                                            app.status === 'rejected' ? '#dc2626' : '#eab308',
                                borderWidth: 1,
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                              }}
                            >
                              <Text style={{
                                color: app.status === 'approved' ? '#16a34a' : 
                                       app.status === 'rejected' ? '#dc2626' : '#eab308',
                                fontSize: 10,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                              }}>
                                {(app.status || 'pending').toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          {/* Content Area */}
                          <View style={{ padding: 16 }}>
                            {/* Leave Type */}
                            <View style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#e5e7eb',
                            }}>
                              <Text style={{
                                fontSize: 12,
                                color: '#6b7280',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                flex: 1,
                              }}>Leave Type</Text>
                              <Text style={{
                                fontSize: 14,
                                color: theme.text || '#111827',
                                fontWeight: '600',
                                flex: 1,
                                textAlign: 'right',
                              }}>
                                {app.leaveType || 'N/A'}
                              </Text>
                            </View>

                            {/* Number of Days */}
                            <View style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#e5e7eb',
                            }}>
                              <Text style={{
                                fontSize: 12,
                                color: '#6b7280',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                flex: 1,
                              }}>Number of Days</Text>
                              <Text style={{
                                fontSize: 14,
                                color: theme.text || '#111827',
                                fontWeight: '600',
                                flex: 1,
                                textAlign: 'right',
                              }}>
                                {app.numberOfDays || 0} {app.numberOfDays === 1 ? 'day' : 'days'}
                              </Text>
                            </View>

                            {/* Start Date */}
                            <View style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#e5e7eb',
                            }}>
                              <Text style={{
                                fontSize: 12,
                                color: '#6b7280',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                flex: 1,
                              }}>Start Date</Text>
                              <Text style={{
                                fontSize: 14,
                                color: theme.text || '#111827',
                                fontWeight: '600',
                                flex: 1,
                                textAlign: 'right',
                              }}>
                                {app.startDate ? new Date(app.startDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }) : 'N/A'}
                              </Text>
                            </View>

                            {/* End Date */}
                            <View style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#e5e7eb',
                            }}>
                              <Text style={{
                                fontSize: 12,
                                color: '#6b7280',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                flex: 1,
                              }}>End Date</Text>
                              <Text style={{
                                fontSize: 14,
                                color: theme.text || '#111827',
                                fontWeight: '600',
                                flex: 1,
                                textAlign: 'right',
                              }}>
                                {app.endDate ? new Date(app.endDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }) : 'N/A'}
                              </Text>
                            </View>

                            {/* Status */}
                            <View style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#e5e7eb',
                            }}>
                              <Text style={{
                                fontSize: 12,
                                color: '#6b7280',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                flex: 1,
                              }}>Status</Text>
                              <View
                                style={{
                                  backgroundColor: app.status === 'approved' ? '#16a34a' + '20' : 
                                                   app.status === 'rejected' ? '#dc2626' + '20' : '#eab308' + '20',
                                  borderColor: app.status === 'approved' ? '#16a34a' : 
                                              app.status === 'rejected' ? '#dc2626' : '#eab308',
                                  borderWidth: 1,
                                  borderRadius: 12,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                }}
                              >
                                <Text style={{
                                  color: app.status === 'approved' ? '#16a34a' : 
                                         app.status === 'rejected' ? '#dc2626' : '#eab308',
                                  fontSize: 11,
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                }}>
                                  {(app.status || 'pending').toUpperCase()}
                                </Text>
                              </View>
                            </View>

                            {/* Reason */}
                            {app.reason && (
                              <View style={{
                                paddingVertical: 10,
                                borderBottomWidth: 1,
                                borderBottomColor: '#e5e7eb',
                              }}>
                                <Text style={{
                                  fontSize: 12,
                                  color: '#6b7280',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                  marginBottom: 6,
                                }}>Reason</Text>
                                <Text style={{
                                  fontSize: 14,
                                  color: theme.text || '#111827',
                                  lineHeight: 20,
                                  textAlign: 'left',
                                }}>
                                  {app.reason}
                                </Text>
                              </View>
                            )}

                            {/* Submitted Date */}
                            {app.createdAt && (
                              <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: 10,
                                marginTop: 4,
                              }}>
                                <Text style={{
                                  fontSize: 11,
                                  color: '#9ca3af',
                                  fontWeight: '600',
                                  textTransform: 'uppercase',
                                }}>Submitted</Text>
                                <Text style={{
                                  fontSize: 12,
                                  color: '#9ca3af',
                                  fontWeight: '500',
                                }}>
                                  {new Date(app.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Attendance corrections overview */}
            {staffDetails.attendanceCorrections &&
              staffDetails.attendanceCorrections.length > 0 && (
                <View style={[styles.staffDetailsInfo, styles.collapsibleCard, { marginTop: 16 }]}>
                  <TouchableOpacity
                    style={styles.collapsibleHeader}
                    onPress={() => setShowAttendanceCorrectionsExpanded((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                      Attendance Corrections ({staffDetails.attendanceCorrections.length})
                    </Text>
                    <Text style={styles.collapsibleArrow}>
                      {showAttendanceCorrectionsExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {showAttendanceCorrectionsExpanded && (
                    <View style={{ marginTop: 12 }}>
                      {staffDetails.attendanceCorrections.map((corr, idx) => (
                        <TouchableOpacity
                          key={corr._id || idx}
                          style={[styles.officialCard, { marginBottom: 12, padding: 0, overflow: 'visible' }]}
                          onPress={() => {
                            setSelectedCorrection(corr);
                            setShowCorrectionModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.officialRibbon, { 
                            backgroundColor: corr.status === 'approved' ? '#16a34a' : 
                                            corr.status === 'rejected' ? '#dc2626' : theme.primary,
                            paddingVertical: 8 
                          }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.officialRibbonText} numberOfLines={1}>
                                {safeGetCorrectionTypeLabel(corr.correctionType) || 'Attendance Correction'}
                              </Text>
                              <Text style={styles.officialRibbonSubText}>
                                {corr.date
                                  ? new Date(corr.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : 'N/A'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.statusChip,
                                {
                                  backgroundColor: '#ffffff30',
                                  borderColor: '#ffffff70',
                                },
                              ]}
                            >
                              <Text style={[styles.statusText, { color: '#fff' }]}>
                                {corr.status ? corr.status.toUpperCase() : 'PENDING'}
                              </Text>
                            </View>
                          </View>
                          <View style={{ padding: 14, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }}>
                            <View style={[styles.officialRow, { minHeight: 36, marginBottom: 8 }]}>
                              <Text style={[styles.officialLabel, { flex: 0, minWidth: 110, fontWeight: '600' }]}>Correction Type:</Text>
                              <Text style={[styles.officialValue, { flex: 1, fontWeight: '500' }]}>
                                {safeGetCorrectionTypeLabel(corr.correctionType) || 'Attendance Correction'}
                              </Text>
                            </View>
                            <View style={[styles.officialRow, { minHeight: 36, marginBottom: 8 }]}>
                              <Text style={[styles.officialLabel, { flex: 0, minWidth: 110, fontWeight: '600' }]}>Date:</Text>
                              <Text style={[styles.officialValue, { flex: 1, fontWeight: '500' }]}>
                                {corr.date
                                  ? new Date(corr.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : 'N/A'}
                              </Text>
                            </View>
                            <View style={[styles.officialRow, { minHeight: 36, marginBottom: 8 }]}>
                              <Text style={[styles.officialLabel, { flex: 0, minWidth: 110, fontWeight: '600' }]}>Status:</Text>
                              <View
                                style={[
                                  styles.statusChip,
                                  {
                                    backgroundColor: corr.status === 'approved' ? '#16a34a' + '20' : 
                                                     corr.status === 'rejected' ? '#dc2626' + '20' : '#eab308' + '20',
                                    borderColor: corr.status === 'approved' ? '#16a34a' : 
                                                corr.status === 'rejected' ? '#dc2626' : '#eab308',
                                    alignSelf: 'flex-start',
                                  },
                                ]}
                              >
                                <Text style={[styles.statusText, { 
                                  color: corr.status === 'approved' ? '#16a34a' : 
                                         corr.status === 'rejected' ? '#dc2626' : '#eab308',
                                  fontSize: 11,
                                }]}>
                                  {corr.status ? corr.status.toUpperCase() : 'PENDING'}
                                </Text>
                              </View>
                            </View>
                            {corr.requestedChange?.description && (
                              <View style={[styles.officialRow, { alignItems: 'flex-start', minHeight: 50, marginBottom: 8 }]}>
                                <Text style={[styles.officialLabel, { flex: 0, minWidth: 110, marginTop: 4, fontWeight: '600' }]}>Description:</Text>
                                <Text style={[styles.officialValue, { flex: 1, fontSize: 13, flexWrap: 'wrap', textAlign: 'left', lineHeight: 20 }]}>
                                  {corr.requestedChange.description}
                                </Text>
                              </View>
                            )}
                            <View style={[styles.officialRow, { minHeight: 32 }]}>
                              <Text style={[styles.officialLabel, { flex: 0, minWidth: 110, fontWeight: '600', fontSize: 12, opacity: 0.7 }]}>Submitted:</Text>
                              <Text style={[styles.officialValue, { flex: 1, fontSize: 12, opacity: 0.7 }]}>
                                {corr.createdAt
                                  ? new Date(corr.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : 'N/A'}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

            <TouchableOpacity
              style={[styles.viewTimesheetButton, dynamicStyles.exportButton]}
              onPress={() => setShowTimesheetView(true)}
            >
              <Text style={styles.viewTimesheetButtonText}>View Timesheet</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render timesheet view
  const renderTimesheetView = () => {
    const periodLabel = timesheetPeriod === 'today' ? 'Daily' : 
                       timesheetPeriod === 'weekly' ? 'Weekly' : 'Monthly';

    const formatTime = (dateString) => {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    const formatDateOnly = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    // Calculate stats from timesheet data
    const completeDays = staffTimesheet.filter(e => (e.timeOut || e.clockOutTime) && (e.timeIn || e.clockInTime)).length;
    const incompleteDays = staffTimesheet.filter(e => !e.timeOut && !e.clockOutTime).length;

    return (
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.timesheetTopHeader, dynamicStyles.header]}>
          <TouchableOpacity
            onPress={handleBackToDetails}
            style={[styles.timesheetBackButton, dynamicStyles.backButton]}
          >
            <Text style={[styles.timesheetBackButtonText, dynamicStyles.backButtonText]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.timesheetHeaderTitle, dynamicStyles.headerTitle]}>
            {selectedStaff?.name} {selectedStaff?.surname || ''}
          </Text>
          <TouchableOpacity
            onPress={exportTimesheetPDF}
            style={[styles.timesheetExportBtn, { backgroundColor: '#3166AE' }]}
            disabled={exportingPDF || staffTimesheet.length === 0}
          >
            {exportingPDF ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.timesheetExportBtnText}>Export</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.timesheetPeriodSelector}>
          <TouchableOpacity
            style={[
              styles.timesheetPeriodBtn,
              timesheetPeriod === 'today' && [styles.timesheetPeriodBtnActive, { backgroundColor: '#3166AE' }],
            ]}
            onPress={() => handleViewTimesheet('today')}
          >
            <Text
              style={[
                styles.timesheetPeriodBtnText,
                timesheetPeriod === 'today' && styles.timesheetPeriodBtnTextActive,
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timesheetPeriodBtn,
              timesheetPeriod === 'weekly' && [styles.timesheetPeriodBtnActive, { backgroundColor: '#3166AE' }],
            ]}
            onPress={() => handleViewTimesheet('weekly')}
          >
            <Text
              style={[
                styles.timesheetPeriodBtnText,
                timesheetPeriod === 'weekly' && styles.timesheetPeriodBtnTextActive,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timesheetPeriodBtn,
              timesheetPeriod === 'monthly' && [styles.timesheetPeriodBtnActive, { backgroundColor: '#3166AE' }],
            ]}
            onPress={() => handleViewTimesheet('monthly')}
          >
            <Text
              style={[
                styles.timesheetPeriodBtnText,
                timesheetPeriod === 'monthly' && styles.timesheetPeriodBtnTextActive,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.timesheetScrollView}
          contentContainerStyle={styles.timesheetScrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loadingData ? (
            <View style={styles.timesheetLoadingContainer}>
              <ActivityIndicator size="large" color="#3166AE" />
              <Text style={[styles.timesheetLoadingText, dynamicStyles.textSecondary]}>Loading...</Text>
            </View>
          ) : (
            <>
              {/* Statistics Cards */}
              <View style={styles.timesheetStatsContainer}>
                <View style={[styles.timesheetStatCard, dynamicStyles.card]}>
                  <Text style={styles.timesheetStatIcon}>⏰</Text>
                  <Text style={[styles.timesheetStatValue, dynamicStyles.text]}>
                    {staffTimesheet.length}
                  </Text>
                  <Text style={[styles.timesheetStatLabel, dynamicStyles.textSecondary]}>Days Recorded</Text>
                </View>
                <View style={[styles.timesheetStatCard, dynamicStyles.card]}>
                  <Text style={styles.timesheetStatIcon}>✅</Text>
                  <Text style={[styles.timesheetStatValue, dynamicStyles.text]}>
                    {completeDays}
                  </Text>
                  <Text style={[styles.timesheetStatLabel, dynamicStyles.textSecondary]}>Days Present</Text>
                </View>
                <View style={[styles.timesheetStatCard, dynamicStyles.card]}>
                  <Text style={styles.timesheetStatIcon}>❌</Text>
                  <Text style={[styles.timesheetStatValue, dynamicStyles.text]}>
                    {incompleteDays}
                  </Text>
                  <Text style={[styles.timesheetStatLabel, dynamicStyles.textSecondary]}>Days Absent</Text>
                </View>
                <View style={[styles.timesheetStatCard, dynamicStyles.card]}>
                  <Text style={styles.timesheetStatIcon}>📊</Text>
                  <Text style={[styles.timesheetStatValue, dynamicStyles.text]}>
                    {staffTimesheet.length > 0 ? Math.round((completeDays / staffTimesheet.length) * 100) : 0}%
                  </Text>
                  <Text style={[styles.timesheetStatLabel, dynamicStyles.textSecondary]}>Attendance Rate</Text>
                </View>
              </View>

              {/* Detailed Statistics */}
              <View style={[styles.timesheetDetailedStatsCard, dynamicStyles.card]}>
                <Text style={[styles.timesheetSectionTitle, dynamicStyles.text]}>Detailed Statistics</Text>
                <View style={styles.timesheetDetailedStatsRow}>
                  <Text style={[styles.timesheetDetailedStatLabel, dynamicStyles.textSecondary]}>
                    Clock-In Records:
                  </Text>
                  <Text style={[styles.timesheetDetailedStatValue, dynamicStyles.text]}>
                    {staffTimesheet.filter(e => e.timeIn || e.clockInTime).length}
                  </Text>
                </View>
                <View style={styles.timesheetDetailedStatsRow}>
                  <Text style={[styles.timesheetDetailedStatLabel, dynamicStyles.textSecondary]}>
                    Clock-Out Records:
                  </Text>
                  <Text style={[styles.timesheetDetailedStatValue, dynamicStyles.text]}>
                    {staffTimesheet.filter(e => e.timeOut || e.clockOutTime).length}
                  </Text>
                </View>
                <View style={styles.timesheetDetailedStatsRow}>
                  <Text style={[styles.timesheetDetailedStatLabel, dynamicStyles.textSecondary]}>
                    Incomplete Days:
                  </Text>
                  <Text style={[styles.timesheetDetailedStatValue, dynamicStyles.text]}>
                    {incompleteDays}
                  </Text>
                </View>
                <View style={styles.timesheetDetailedStatsRow}>
                  <Text style={[styles.timesheetDetailedStatLabel, dynamicStyles.textSecondary]}>
                    Position:
                  </Text>
                  <Text style={[styles.timesheetDetailedStatValue, dynamicStyles.text]}>
                    {selectedStaff?.role || 'Staff'}
                  </Text>
                </View>
              </View>

              {/* Timesheet Table */}
              <View style={[styles.timesheetTableCard, dynamicStyles.card]}>
                <Text style={[styles.timesheetTableTitle, dynamicStyles.text]}>
                  Timesheet Records ({staffTimesheet.length})
                </Text>

                {/* Table Header */}
                <View style={[styles.timesheetTableHeaderRow, { borderBottomColor: '#3166AE' }]}>
                  <Text style={[styles.timesheetTableHeaderText, { flex: 1.2 }]}>Date</Text>
                  <Text style={[styles.timesheetTableHeaderText, { flex: 1 }]}>In</Text>
                  <Text style={[styles.timesheetTableHeaderText, { flex: 1 }]}>Out</Text>
                  <Text style={[styles.timesheetTableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Hours</Text>
                </View>

                {staffTimesheet.length === 0 ? (
                  <Text style={[styles.timesheetEmptyText, dynamicStyles.textSecondary]}>
                    No timesheet records found for this period.
                  </Text>
                ) : (
                  staffTimesheet.map((record, index) => (
                    <View
                      key={index}
                      style={[
                        styles.timesheetTableRow,
                        { borderBottomColor: isDarkMode ? '#444' : '#f3f4f6' },
                        !record.timeOut && !record.clockOutTime ? styles.timesheetIncompleteRow : null,
                      ]}
                    >
                      <View style={{ flex: 1.2 }}>
                        <Text style={[styles.timesheetTableDate, dynamicStyles.text]}>
                          {new Date(record.date || record.clockInTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                        <Text style={[styles.timesheetTableDay, dynamicStyles.textSecondary]}>
                          {new Date(record.date || record.clockInTime).toLocaleDateString('en-US', {
                            weekday: 'short',
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.timesheetTableCell,
                          { flex: 1 },
                          !record.timeIn && !record.clockInTime && styles.timesheetMissingValue,
                        ]}
                      >
                        {record.timeIn ||
                          (record.clockInTime
                            ? new Date(record.clockInTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '-')}
                      </Text>
                      <Text
                        style={[
                          styles.timesheetTableCell,
                          { flex: 1 },
                          !record.timeOut && !record.clockOutTime && styles.timesheetMissingValue,
                        ]}
                      >
                        {record.timeOut ||
                          (record.clockOutTime
                            ? new Date(record.clockOutTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '-')}
                      </Text>
                      <Text style={[styles.timesheetHoursCell, { flex: 0.8, color: '#3166AE' }]}>
                        {record.hoursWorkedFormatted || '0h 0m'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderStaff = () => {
    if (showTimesheetView) {
      return renderTimesheetView();
    } else if (showStaffDetails) {
      return renderStaffDetails();
    } else {
      return renderStaffList();
    }
  };

  // Report generation state
  const [reportFilters, setReportFilters] = useState({
    period: 'daily', // 'daily', 'weekly', 'monthly', 'custom'
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    staffType: 'all', // 'all', 'individual', 'group'
    selectedStaff: [],
    location: 'all',
    role: 'all',
    // Intern reports filters
    statusFilter: 'all',
    severityFilter: 'all'
  });
  const [availableStaff, setAvailableStaff] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(['Intern', 'Staff', 'Other']);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);

  // Load available staff and locations for filters
  useEffect(() => {
    if (activeView === 'reports') {
      loadReportFilters();
    }
  }, [activeView]);

  const loadReportFilters = async () => {
    try {
      const params = isHostCompany ? { hostCompanyId } : {};
      const response = await axios.get(`${API_BASE_URL}/staff/list`, { params });
      if (response.data.success) {
        const staff = response.data.staff;
        setAvailableStaff(staff);
        
        // Extract unique locations
        const locations = [...new Set(staff.map(s => s.location || 'Unknown').filter(Boolean))];
        setAvailableLocations(locations.sort());
      }
    } catch (error) {
      console.error('Error loading report filters:', error);
    }
  };

  const generateReport = async () => {
    try {
      setGeneratingReport(true);

      // Build query parameters
      const params = {
        period: reportFilters.period === 'custom' ? undefined : reportFilters.period,
        startDate: reportFilters.period === 'custom' ? reportFilters.startDate : undefined,
        endDate: reportFilters.period === 'custom' ? reportFilters.endDate : undefined,
        staffIds: reportFilters.staffType === 'all' 
          ? 'all' 
          : reportFilters.selectedStaff.length > 0 
            ? reportFilters.selectedStaff.join(',')
            : 'all',
        location: reportFilters.location,
        role: reportFilters.role,
        ...(isHostCompany && { hostCompanyId })
      };

      // Fetch report data
      console.log('📊 Generating report with params:', params);
      console.log('📊 Request URL:', `${API_BASE_URL}/staff/admin/reports/data`);
      
      const response = await axios.get(`${API_BASE_URL}/staff/admin/reports/data`, { params });

      console.log('📊 Report data received:', response.data);

      if (!response.data.success) {
        throw new Error('Failed to fetch report data');
      }

      const { data, summary } = response.data;

      // Generate PDF
      const html = generateReportHTML(data, summary, reportFilters);
      const { uri } = await Print.printToFileAsync({ html });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        const fileName = `ClockIn_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Clock-In Report - ${summary.dateRange.start.split('T')[0]} to ${summary.dateRange.end.split('T')[0]}`
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate report. Please try again.';
      Alert.alert('Error', `Failed to generate report: ${errorMessage}\n\nPlease ensure the backend server is running and restarted.`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const generateReportHTML = (data, summary, filters) => {
    const periodLabel = filters.period === 'daily' ? 'Daily' : 
                       filters.period === 'weekly' ? 'Weekly' : 
                       filters.period === 'monthly' ? 'Monthly' : 'Custom';
    const dateRange = summary.dateRange;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${getWatermarkCSS()}
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
              position: relative;
            }
            .summary {
              margin-bottom: 30px;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 8px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .summary-label {
              font-weight: bold;
              color: #555;
            }
            .summary-value {
              color: #333;
            }
            .staff-section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .staff-header {
              background-color: #3166AE;
              color: white;
              padding: 12px;
              border-radius: 4px 4px 0 0;
              margin-bottom: 0;
            }
            .staff-info {
              background-color: #f9f9f9;
              padding: 12px;
              border: 1px solid #ddd;
              border-top: none;
            }
            .info-row {
              display: flex;
              margin-bottom: 6px;
            }
            .info-label {
              font-weight: bold;
              width: 120px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #3166AE;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .no-data {
              text-align: center;
              padding: 20px;
              color: #999;
              font-style: italic;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #999;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          ${getWatermarkHTML()}
          ${getPDFHeaderHTML('Clock-In Attendance Report', `${periodLabel} Report - ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} to ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)}

          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">Total Staff:</span>
              <span class="summary-value">${summary.totalStaff}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Clock Logs:</span>
              <span class="summary-value">${summary.totalLogs}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Location Filter:</span>
              <span class="summary-value">${summary.filters.location === 'all' ? 'All Locations' : summary.filters.location}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Role Filter:</span>
              <span class="summary-value">${summary.filters.role === 'all' ? 'All Roles' : summary.filters.role}</span>
            </div>
          </div>

          ${data.length > 0 ? data.map(item => `
            <div class="staff-section">
              <div class="staff-header">
                <strong>${item.staff.name} ${item.staff.surname || ''}</strong>
              </div>
              <div class="staff-info">
                <div class="info-row">
                  <span class="info-label">ID Number:</span>
                  <span>${item.staff.idNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span>${item.staff.phoneNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Role:</span>
                  <span>${item.staff.role || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Location:</span>
                  <span>${item.staff.location || 'N/A'}</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Start Break</th>
                    <th>End Break</th>
                    <th>Time Out</th>
                  </tr>
                </thead>
                <tbody>
                  ${item.timesheet.length > 0 ? item.timesheet.map(entry => `
                    <tr style="${entry.extraHours ? 'background-color: #fee2e2;' : ''}">
                      <td>
                        ${new Date(entry.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                        ${entry.extraHours ? `<br><span style="color: #dc2626; font-size: 10px; font-weight: 600;">${entry.extraHours}</span>` : ''}
                      </td>
                      <td>${entry.timeIn || '-'}</td>
                      <td>${entry.startLunch || '-'}</td>
                      <td>${entry.endLunch || '-'}</td>
                      <td>${entry.timeOut || '-'}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" class="no-data">No timesheet data available</td></tr>'}
                </tbody>
              </table>
            </div>
          `).join('') : '<div class="no-data">No data available for the selected filters</div>'}

          <div class="footer">
            Generated on ${new Date().toLocaleString()} | Clock-In System
          </div>
        </body>
      </html>
    `;
  };

  const renderReports = () => {
    // ADMIN VIEW: Reviews reports submitted by Host Companies
    if (isAdmin && !isHostCompany) {
      return (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.dashboardContainer}>
            {/* Header */}
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Intern Reports Management</Text>
            <Text style={[styles.sectionSubtitle, dynamicStyles.sectionSubtitle]}>
              Review and acknowledge reports submitted by Host Companies
            </Text>

            {/* Filters */}
            <View style={[styles.filterCard, dynamicStyles.filterCard]}>
              <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Filter by Status</Text>
              <View style={styles.filterOptions}>
                {['all', 'Submitted', 'Reviewed', 'Actioned'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      dynamicStyles.filterOption,
                      reportFilters.statusFilter === status && [styles.filterOptionSelected, dynamicStyles.filterOptionSelected]
                    ]}
                    onPress={() => setReportFilters({ ...reportFilters, statusFilter: status })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      dynamicStyles.filterOptionText,
                      reportFilters.statusFilter === status && styles.filterOptionTextSelected
                    ]}>
                      {status === 'all' ? 'All' : status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Severity Filter */}
            <View style={[styles.filterCard, dynamicStyles.filterCard]}>
              <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Filter by Severity</Text>
              <View style={styles.filterOptions}>
                {['all', 'Low', 'Medium', 'High'].map(severity => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.filterOption,
                      dynamicStyles.filterOption,
                      reportFilters.severityFilter === severity && [styles.filterOptionSelected, dynamicStyles.filterOptionSelected]
                    ]}
                    onPress={() => setReportFilters({ ...reportFilters, severityFilter: severity })}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      dynamicStyles.filterOptionText,
                      reportFilters.severityFilter === severity && styles.filterOptionTextSelected
                    ]}>
                      {severity === 'all' ? 'All' : severity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reports List */}
            {loadingReports ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>Loading reports...</Text>
              </View>
            ) : previousReports && previousReports.length > 0 ? (
              <View style={styles.reportsList}>
                {renderReportsTable(previousReports)}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyIcon, dynamicStyles.emptyIcon]}>📭</Text>
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No reports found</Text>
                <Text style={[styles.emptySubText, dynamicStyles.emptySubText]}>Host Companies will submit reports here</Text>
              </View>
            )}
          </View>
        </ScrollView>
      );
    }

    // HOST COMPANY VIEW: Submits reports about interns
    else if (isHostCompany) {
      return (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.dashboardContainer}>
            {/* Header */}
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Intern Reports</Text>
            <Text style={[styles.sectionSubtitle, dynamicStyles.sectionSubtitle]}>
              Submit and review formal reports about interns assigned to your company
            </Text>

            {/* Step 1: Select Intern */}
            <View style={[styles.filterCard, dynamicStyles.filterCard]}>
              <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Step 1: Select an Intern *</Text>
              <TouchableOpacity
                style={[styles.staffPickerButton, dynamicStyles.staffPickerButton]}
                onPress={() => {
                  if (availableInterns.length === 0) {
                    Alert.alert('No Interns', 'No interns found for your company.');
                    return;
                  }
                  Alert.alert(
                    'Select Intern',
                    '',
                    availableInterns.map(intern => ({
                      text: `${intern.name} ${intern.surname || ''}`,
                      onPress: () => setSelectedIntern(intern)
                    })).concat([{ text: 'Cancel', style: 'cancel' }]),
                    { cancelable: true }
                  );
                }}
              >
                <Text style={[styles.staffPickerButtonText, dynamicStyles.staffPickerButtonText]}>
                  {selectedIntern?.name ? `${selectedIntern.name} ${selectedIntern.surname || ''}` : 'Select Intern'}
                </Text>
              </TouchableOpacity>
              {loadingReports && availableInterns.length === 0 && (
                <View style={{ marginTop: 8, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.emptyText, dynamicStyles.emptyText, { marginTop: 8, fontSize: 12 }]}>Loading interns...</Text>
                </View>
              )}
            </View>

            {/* Step 2: Intern Context */}
            {selectedIntern && (
              <View style={[styles.internContextCard, dynamicStyles.internContextCard]}>
                <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Step 2: Intern Context</Text>
                <View style={styles.contextGrid}>
                  <View style={styles.contextItem}>
                    <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Name</Text>
                    <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                      {selectedIntern.name} {selectedIntern.surname || ''}
                    </Text>
                  </View>
                  <View style={styles.contextItem}>
                    <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>ID</Text>
                    <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                      {selectedIntern.idNumber || selectedIntern._id}
                    </Text>
                  </View>
                  <View style={styles.contextItem}>
                    <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Department</Text>
                    <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                      {selectedIntern.department || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Step 3: Previous Reports */}
            {selectedIntern && (
              <View style={[styles.filterCard, dynamicStyles.filterCard]}>
                <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Step 3: Previous Reports</Text>
                {loadingReports ? (
                  <View style={styles.emptyContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : previousReports && previousReports.length > 0 ? (
                  <View style={styles.reportsList}>
                    {renderReportsTable(previousReports)}
                  </View>
                ) : (
                  <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No previous reports for this intern</Text>
                )}
              </View>
            )}

            {/* Submit New Report Button */}
            {selectedIntern && (
              <TouchableOpacity
                style={[styles.generateReportButton, dynamicStyles.generateReportButton]}
                onPress={() => setShowReportModal(true)}
              >
                <Text style={styles.reportIcon}>📝</Text>
                <Text style={styles.generateReportButtonText}>Submit New Report</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      );
    }

    // Fallback
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, dynamicStyles.emptyText]}>Reports feature not available</Text>
      </View>
    );
  };

  const renderReportsTable = (reports = []) => {
    if (!reports || reports.length === 0) return null;

    return (
      <ScrollView horizontal contentContainerStyle={styles.tableContainer}>
        <View>
          {/* Header with export button */}
          <View style={[styles.tableRow, styles.tableHeader, { alignItems: 'center' }]}>
            <Text style={[styles.tableColIndex, styles.tableHeaderText]}>#</Text>
            <Text style={[styles.tableColTitle, styles.tableHeaderText]}>Title</Text>
            <Text style={[styles.tableColType, styles.tableHeaderText]}>Type</Text>
            <Text style={[styles.tableColCompany, styles.tableHeaderText]}>Company</Text>
            <Text style={[styles.tableColSubmitted, styles.tableHeaderText]}>Submitted</Text>
            <Text style={[styles.tableColStatus, styles.tableHeaderText]}>Status</Text>
            <Text style={[styles.tableColSeverity, styles.tableHeaderText]}>Severity</Text>
            <TouchableOpacity onPress={() => exportReportsListPDF(reports)} style={{ marginLeft: 12 }}>
              <Text style={[styles.tableHeaderText, { color: theme.primary }]}>Export PDF</Text>
            </TouchableOpacity>
          </View>

          {/* Rows */}
          {reports.map((report, idx) => (
            <TouchableOpacity
              key={report._id}
              style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
              onPress={() => loadReportDetail(report._id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tableColIndex, styles.tableCellText]}>{idx + 1}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.tableColTitle, styles.tableCellText]}>{report.title}</Text>
              <Text style={[styles.tableColType, styles.tableCellText]}>{report.reportType || '—'}</Text>
              <Text style={[styles.tableColCompany, styles.tableCellText]}>{report.hostCompanyId?.name || report.hostCompanyId?.companyName || 'Unknown'}</Text>
              <Text style={[styles.tableColSubmitted, styles.tableCellText]}>{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}</Text>
              <Text style={[styles.tableColStatus, styles.tableCellText]}>{report.status || '—'}</Text>
              <Text style={[styles.tableColSeverity, styles.tableCellText]}>{report.severity || '—'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderStatusUpdateModal = () => {
    if (!showStatusUpdateModal || !selectedReport) return null;

    const handleSaveStatusUpdate = async () => {
      try {
        const headers = await getDeviceHeaders();
        const payload = {
          userRole: 'ADMIN',
          status: reportStatusUpdate.status,
          adminNotes: reportStatusUpdate.adminNotes || null,
          reviewedByUserId: userInfo?.id || null
        };
        const response = await axios.patch(`${API_BASE_URL}/intern-reports/${selectedReport._id}`, payload, { headers });
        if (response.data && response.data.success) {
          // Update local state
          const updated = response.data.report || response.data;
          setSelectedReport(prev => ({ ...(prev || {}), ...updated }));
          // Update list cache if present
          setPreviousReports(prevList => prevList.map(r => (r._id === updated._id ? updated : r)));
          setShowStatusUpdateModal(false);
          Alert.alert('Success', 'Report status updated successfully');
        } else {
          throw new Error('Update failed');
        }
      } catch (error) {
        console.error('Error updating report status:', error);
        Alert.alert('Error', 'Failed to update report status.');
      }
    };

    return (
      <Modal visible={showStatusUpdateModal} transparent animationType="slide" onRequestClose={() => setShowStatusUpdateModal(false)}>
        <SafeAreaView style={[styles.container, dynamicStyles.container]}>
          <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
            <TouchableOpacity onPress={() => setShowStatusUpdateModal(false)}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Update Status</Text>
            <TouchableOpacity onPress={handleSaveStatusUpdate}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Status</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              {['Submitted', 'Reviewed', 'Actioned'].map(s => (
                <TouchableOpacity key={s} onPress={() => setReportStatusUpdate({ ...reportStatusUpdate, status: s })} style={{ padding: 8, borderRadius: 8, backgroundColor: reportStatusUpdate.status === s ? theme.primary : theme.surface }}>
                  <Text style={{ color: reportStatusUpdate.status === s ? '#fff' : theme.text }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Admin Notes</Text>
            <TextInput value={reportStatusUpdate.adminNotes} onChangeText={(t) => setReportStatusUpdate({ ...reportStatusUpdate, adminNotes: t })} placeholder="Notes (optional)" multiline style={{ minHeight: 100, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginTop: 8, backgroundColor: theme.inputBackground, color: theme.text }} />
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderReportDetailModal = () => {
    if (!selectedReport || !showReportDetailModal) return null;

    const statusColor = selectedReport.status === 'Submitted' ? '#e3f2fd' : selectedReport.status === 'Reviewed' ? '#f3e5f5' : '#e8f5e9';
    const statusTextColor = selectedReport.status === 'Submitted' ? '#1565c0' : selectedReport.status === 'Reviewed' ? '#6a1b9a' : '#2e7d32';
    const severityColor = selectedReport.severity === 'High' ? '#ffebee' : selectedReport.severity === 'Medium' ? '#fff3e0' : '#e8f5e9';
    const severityTextColor = selectedReport.severity === 'High' ? '#c62828' : selectedReport.severity === 'Medium' ? '#f57c00' : '#2e7d32';

    return (
      <Modal
        visible={showReportDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportDetailModal(false)}
      >
        <SafeAreaView style={[styles.container, dynamicStyles.container]}>
          <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
            <TouchableOpacity onPress={() => setShowReportDetailModal(false)}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>✕ Close</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => {
                  setReportStatusUpdate({
                    status: selectedReport.status || 'Reviewed',
                    adminNotes: selectedReport.adminNotes || ''
                  });
                  setShowStatusUpdateModal(true);
                }}
                style={{ paddingHorizontal: 12 }}
              >
                <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Update Status</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => exportReportPDF(selectedReport)} style={{ paddingHorizontal: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>Export PDF</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            <View style={styles.dashboardContainer}>
              {/* Report Header */}
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>{selectedReport.title}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <View style={[styles.badge, { backgroundColor: statusColor }]}>
                    <Text style={[styles.badgeText, { color: statusTextColor }]}>{selectedReport.status}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: severityColor }]}>
                    <Text style={[styles.badgeText, { color: severityTextColor }]}>{selectedReport.severity} Severity</Text>
                  </View>
                </View>
              </View>

              {/* Intern & Company Info */}
              <View style={[styles.filterCard, dynamicStyles.filterCard]}>
                <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Intern Information</Text>
                <View style={styles.contextGrid}>
                  <View style={styles.contextItem}>
                    <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Name</Text>
                    <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                      {selectedReport.internId?.name || selectedReport.internName || 'N/A'} {selectedReport.internId?.surname || ''}
                    </Text>
                  </View>
                  <View style={styles.contextItem}>
                    <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>ID Number</Text>
                    <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                      {selectedReport.internId?.idNumber || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.contextItem}>
                    <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Department</Text>
                    <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                      {selectedReport.internId?.department || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Host Company Info */}
              <View style={[styles.filterCard, dynamicStyles.filterCard]}>
                <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Host Company</Text>
                <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                  {selectedReport.hostCompanyId?.name || selectedReport.hostCompanyId?.companyName || 'N/A'}
                </Text>
              </View>

              {/* Report Details */}
              <View style={[styles.filterCard, dynamicStyles.filterCard]}>
                <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Report Details</Text>
                
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Report Type</Text>
                  <Text style={[styles.contextValue, dynamicStyles.contextValue]}>{selectedReport.reportType || 'N/A'}</Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Incident Date</Text>
                  <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                    {selectedReport.incidentDate ? new Date(selectedReport.incidentDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.contextLabel, dynamicStyles.contextLabel]}>Submitted</Text>
                  <Text style={[styles.contextValue, dynamicStyles.contextValue]}>
                    {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : 'N/A'}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={[styles.filterCard, dynamicStyles.filterCard]}>
                <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Description</Text>
                <View style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                  <Text style={[styles.contextValue, dynamicStyles.contextValue, { lineHeight: 20 }]}>
                    {selectedReport.description || 'No description provided'}
                  </Text>
                </View>
              </View>

              {/* Supporting Notes */}
              {selectedReport.supportingNotes && (
                <View style={[styles.filterCard, dynamicStyles.filterCard]}>
                  <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Supporting Notes</Text>
                  <View style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#999' }}>
                    <Text style={[styles.contextValue, dynamicStyles.contextValue, { lineHeight: 20 }]}>
                      {selectedReport.supportingNotes}
                    </Text>
                  </View>
                </View>
              )}

              {/* Admin Notes */}
              {selectedReport.adminNotes && (
                <View style={[styles.filterCard, dynamicStyles.filterCard]}>
                  <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Admin Notes</Text>
                  <View style={{ backgroundColor: '#fff3e0', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#f57c00' }}>
                    <Text style={[{ color: '#e65100', fontSize: 14, lineHeight: 20 }]}>
                      {selectedReport.adminNotes}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Business types constant (available at component level, not inside render functions)
  const businessTypes = ['Pty Ltd', 'LLC', 'Sole Proprietor', 'NGO', 'Partnership', 'Corporation', 'Manufacturing', 'Other'];

  // Host Company management state
  const [hostCompanies, setHostCompanies] = useState([]);
  const [showHostCompanyModal, setShowHostCompanyModal] = useState(false);
  const [editingHostCompany, setEditingHostCompany] = useState(null);
  const [hostCompanyName, setHostCompanyName] = useState('');
  const [hostCompanyCompanyName, setHostCompanyCompanyName] = useState('');
  const [hostCompanyRegistrationNumber, setHostCompanyRegistrationNumber] = useState('');
  const [hostCompanyOperatingHours, setHostCompanyOperatingHours] = useState('');
  const [hostCompanyEmail, setHostCompanyEmail] = useState('');
  const [hostCompanyBusinessType, setHostCompanyBusinessType] = useState('');
  const [hostCompanyIndustry, setHostCompanyIndustry] = useState('');
  const [hostCompanyUsername, setHostCompanyUsername] = useState('');
  const [hostCompanyPassword, setHostCompanyPassword] = useState('');
  // ⏰ DEFAULT WORKING HOURS: For host company
  const [hostCompanyDefaultClockInTime, setHostCompanyDefaultClockInTime] = useState('');
  const [hostCompanyDefaultClockOutTime, setHostCompanyDefaultClockOutTime] = useState('');
  const [hostCompanyDefaultBreakStartTime, setHostCompanyDefaultBreakStartTime] = useState('');
  const [hostCompanyDefaultBreakEndTime, setHostCompanyDefaultBreakEndTime] = useState('');
  const [hostCompanyMentorName, setHostCompanyMentorName] = useState('');
  const [showHostCompanyInfo, setShowHostCompanyInfo] = useState(false);
  const [savingHostCompany, setSavingHostCompany] = useState(false);

  useEffect(() => {
    if (activeView === 'hostCompanies') {
      loadHostCompanies();
    } else if (activeView === 'leaveApplications') {
      loadLeaveApplications();
    } else if (activeView === 'attendanceCorrections') {
      loadAttendanceCorrections();
    }
  }, [activeView, leaveApplicationStatusFilter, correctionsStatusFilter]);

  const loadHostCompanies = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/staff/admin/host-companies`);
      if (response.data.success) {
        const companies = response.data.companies;
        // Load department and intern counts for each company
        const companiesWithCounts = await Promise.all(
          companies.map(async (company) => {
            try {
              // Get departments for this company
              const deptResponse = await axios.get(`${API_BASE_URL}/staff/admin/departments/all`, {
                params: { hostCompanyId: company._id }
              });
              const departmentCount = deptResponse.data.success ? deptResponse.data.departments.length : 0;
              
              // Get interns for this company (full data) - ONLY count staff with role === 'Intern'
              const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
                params: { hostCompanyId: company._id, fullData: true }
              });
              const internCount = internsResponse.data.success 
                ? internsResponse.data.staff.filter(staff => staff.role === 'Intern').length 
                : 0;
              
              return {
                ...company,
                departmentCount,
                internCount
              };
            } catch (error) {
              return {
                ...company,
                departmentCount: 0,
                internCount: 0
              };
            }
          })
        );
        setHostCompanies(companiesWithCounts);
      }
    } catch (error) {
      console.error('Error loading host companies:', error);
      Alert.alert('Error', 'Failed to load host companies');
    }
  };

  const handleSaveHostCompany = async () => {
    if (!hostCompanyName.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    
    if (!hostCompanyCompanyName.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }

    if (!editingHostCompany) {
      // Creating new - username and password required
      if (!hostCompanyUsername.trim()) {
        Alert.alert('Error', 'Username is required');
        return;
      }
      
      if (!hostCompanyPassword || hostCompanyPassword.length < 6) {
        Alert.alert('Error', 'Password is required and must be at least 6 characters');
        return;
      }
    }

    try {
      setSavingHostCompany(true);
      if (editingHostCompany) {
        // Update existing
        const updateData = {
          name: hostCompanyName.trim(),
          companyName: hostCompanyCompanyName.trim(),
          registrationNumber: hostCompanyRegistrationNumber.trim() || undefined,
          operatingHours: hostCompanyOperatingHours.trim() || undefined,
          emailAddress: hostCompanyEmail.trim() || undefined,
          businessType: hostCompanyBusinessType || undefined,
          industry: hostCompanyIndustry.trim() || undefined,
          mentorName: hostCompanyMentorName.trim() || undefined,
          isActive: editingHostCompany.isActive
        };
        
        // Only update username if provided
        if (hostCompanyUsername.trim()) {
          updateData.username = hostCompanyUsername.trim();
        }
        
        // Only update password if provided (for security, don't require it on edit)
        if (hostCompanyPassword && hostCompanyPassword.length >= 6) {
          updateData.password = hostCompanyPassword;
        }
        
        // ⏰ DEFAULT WORKING HOURS: Update if provided
        if (hostCompanyDefaultClockInTime.trim()) {
          updateData.defaultClockInTime = hostCompanyDefaultClockInTime.trim();
        } else {
          updateData.defaultClockInTime = undefined; // Allow clearing
        }
        if (hostCompanyDefaultClockOutTime.trim()) {
          updateData.defaultClockOutTime = hostCompanyDefaultClockOutTime.trim();
        } else {
          updateData.defaultClockOutTime = undefined; // Allow clearing
        }
        if (hostCompanyDefaultBreakStartTime.trim()) {
          updateData.defaultBreakStartTime = hostCompanyDefaultBreakStartTime.trim();
        } else {
          updateData.defaultBreakStartTime = undefined; // Allow clearing
        }
        if (hostCompanyDefaultBreakEndTime.trim()) {
          updateData.defaultBreakEndTime = hostCompanyDefaultBreakEndTime.trim();
        } else {
          updateData.defaultBreakEndTime = undefined; // Allow clearing
        }
        
        const response = await axios.put(`${API_BASE_URL}/staff/admin/host-companies/${editingHostCompany._id}`, updateData);
        Alert.alert('✅ Updated Successfully', 'Host company details have been updated.');
        
        // If we're in the details view, update the selected company with new data
        if (activeView === 'hostCompanyDetails' && selectedHostCompany && selectedHostCompany._id === editingHostCompany._id) {
          // Refresh the company data to show updated info
          const updatedCompany = response.data.company || {
            ...selectedHostCompany,
            ...updateData,
            _id: editingHostCompany._id
          };
          setSelectedHostCompany(updatedCompany);
          // Reload details to refresh all data
          loadHostCompanyDetails(editingHostCompany._id);
        }
      } else {
        // Create new - only include fields that have values
        const createData = {
          name: hostCompanyName.trim(),
          companyName: hostCompanyCompanyName.trim(),
          username: hostCompanyUsername.trim(),
          password: hostCompanyPassword
        };
        
        // Only add optional fields if they have values
        if (hostCompanyRegistrationNumber.trim()) {
          createData.registrationNumber = hostCompanyRegistrationNumber.trim();
        }
        if (hostCompanyOperatingHours.trim()) {
          createData.operatingHours = hostCompanyOperatingHours.trim();
        }
        if (hostCompanyEmail.trim()) {
          createData.emailAddress = hostCompanyEmail.trim();
        }
        if (hostCompanyBusinessType) {
          createData.businessType = hostCompanyBusinessType;
        }
        if (hostCompanyIndustry.trim()) {
          createData.industry = hostCompanyIndustry.trim();
        }
        if (hostCompanyMentorName.trim()) {
          createData.mentorName = hostCompanyMentorName.trim();
        }
        // ⏰ DEFAULT WORKING HOURS: Add if provided
        if (hostCompanyDefaultClockInTime.trim()) {
          createData.defaultClockInTime = hostCompanyDefaultClockInTime.trim();
        }
        if (hostCompanyDefaultClockOutTime.trim()) {
          createData.defaultClockOutTime = hostCompanyDefaultClockOutTime.trim();
        }
        if (hostCompanyDefaultBreakStartTime.trim()) {
          createData.defaultBreakStartTime = hostCompanyDefaultBreakStartTime.trim();
        }
        if (hostCompanyDefaultBreakEndTime.trim()) {
          createData.defaultBreakEndTime = hostCompanyDefaultBreakEndTime.trim();
        }
        
        console.log('📤 Creating host company with data:', { ...createData, password: '***' });
        await axios.post(`${API_BASE_URL}/staff/admin/host-companies`, createData);
        Alert.alert('Success', 'Host company created successfully');
      }
      setShowHostCompanyModal(false);
      setEditingHostCompany(null);
      resetHostCompanyForm();
      loadHostCompanies();
    } catch (error) {
      console.error('Error saving host company:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save host company');
    } finally {
      setSavingHostCompany(false);
    }
  };

  const resetHostCompanyForm = () => {
    setHostCompanyName('');
    setHostCompanyCompanyName('');
    setHostCompanyRegistrationNumber('');
    setHostCompanyOperatingHours('');
    setHostCompanyEmail('');
    setHostCompanyBusinessType('');
    setHostCompanyIndustry('');
    setHostCompanyUsername('');
    setHostCompanyPassword('');
    setHostCompanyMentorName('');
    // ⏰ Reset default working hours
    setHostCompanyDefaultClockInTime('');
    setHostCompanyDefaultClockOutTime('');
    setHostCompanyDefaultBreakStartTime('');
    setHostCompanyDefaultBreakEndTime('');
  };

  const handleEditHostCompany = (company) => {
    setEditingHostCompany(company);
    setHostCompanyName(company.name);
    setHostCompanyCompanyName(company.companyName || '');
    setHostCompanyRegistrationNumber(company.registrationNumber || '');
    setHostCompanyOperatingHours(company.operatingHours || '');
    setHostCompanyEmail(company.emailAddress || '');
    setHostCompanyBusinessType(company.businessType || '');
    setHostCompanyIndustry(company.industry || '');
    setHostCompanyUsername(company.username || '');
    setHostCompanyPassword(''); // Don't populate password for security
    setHostCompanyMentorName(company.mentorName || '');
    // ⏰ DEFAULT WORKING HOURS: Populate if available
    setHostCompanyDefaultClockInTime(company.defaultClockInTime || '');
    setHostCompanyDefaultClockOutTime(company.defaultClockOutTime || '');
    setHostCompanyDefaultBreakStartTime(company.defaultBreakStartTime || '');
    setHostCompanyDefaultBreakEndTime(company.defaultBreakEndTime || '');
    setShowHostCompanyModal(true);
  };

  const handleDeleteHostCompany = async (company) => {
    // First, show warning about what will be deleted
    const departmentCount = company.departmentCount || 0;
    const internCount = company.internCount || 0;
    
    const hasRelatedData = departmentCount > 0 || internCount > 0;
    
    const warningMessage = hasRelatedData
      ? `⚠️ WARNING: This will permanently delete:\n\n` +
        `• Host Company: "${company.companyName || company.name}"\n` +
        `• ${departmentCount} Department(s)\n` +
        `• ${internCount} Staff/Intern(s)\n` +
        `• All related attendance records\n` +
        `• All leave applications\n` +
        `• All attendance corrections\n\n` +
        `This action CANNOT be undone!`
      : `Are you sure you want to delete "${company.companyName || company.name}"?\n\nThis action cannot be undone.`;
    
    Alert.alert(
      '🗑️ Delete Host Company',
      warningMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: hasRelatedData ? 'Delete Everything' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use cascade=true if there's related data
              const url = hasRelatedData
                ? `${API_BASE_URL}/staff/admin/host-companies/${company._id}?cascade=true`
                : `${API_BASE_URL}/staff/admin/host-companies/${company._id}`;
              
              const response = await axios.delete(url);
              
              if (response.data.success) {
                // Show success with details of what was deleted
                const deleted = response.data.deleted;
                let successMessage = `Host company "${company.companyName || company.name}" deleted successfully.`;
                
                if (deleted) {
                  successMessage = `Successfully deleted:\n\n` +
                    `✓ Company: ${deleted.company}\n` +
                    `✓ ${deleted.departments} Department(s)\n` +
                    `✓ ${deleted.staff} Staff/Intern(s)\n` +
                    `✓ ${deleted.leaveApplications} Leave Application(s)\n` +
                    `✓ ${deleted.attendanceCorrections} Attendance Correction(s)`;
                }
                
                Alert.alert('✅ Deleted Successfully', successMessage);
                
                // Navigate back to host companies list
                setActiveView('hostCompanies');
                setSelectedHostCompany(null);
                setHostCompanyDepartments([]);
                setHostCompanyInterns([]);
                loadHostCompanies();
              }
            } catch (error) {
              console.error('Error deleting host company:', error);
              
              // Check if cascade is required
              if (error.response?.data?.requiresCascade) {
                const counts = error.response.data.counts;
                Alert.alert(
                  'Cannot Delete',
                  `This company has ${counts.departments} department(s) and ${counts.staff} staff/intern(s).\n\n` +
                  `Please try again - the system will ask for confirmation to delete all related data.`
                );
              } else {
                Alert.alert('Error', error.response?.data?.error || 'Failed to delete host company');
              }
            }
          }
        }
      ]
    );
  };

  // Attendance Corrections functions
  const loadAttendanceCorrections = async () => {
    try {
      const params = {
        reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
      };
      if (hostCompanyId) {
        params.hostCompanyId = hostCompanyId;
      }
      if (correctionsStatusFilter !== 'all') {
        params.status = correctionsStatusFilter;
      }

      const response = await axios.get(`${API_BASE_URL}/staff/admin/attendance-corrections`, { params });
      if (response.data.success) {
        const corrections = response.data.corrections || [];
        setAttendanceCorrections(corrections);

        // Keep pending corrections count in sync
        const pending = corrections.filter(c => c.status === 'pending').length;
        setPendingCorrectionsCount(pending);
      }
    } catch (error) {
      console.error('Error loading attendance corrections:', error);
      Alert.alert('Error', 'Failed to load attendance corrections');
    }
  };

  const handleApproveRejectCorrection = async (correctionId, action, reason = '') => {
    if (action === 'reject' && !reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/staff/admin/attendance-corrections/${correctionId}`, {
        action,
        rejectionReason: action === 'reject' ? reason.trim() : undefined,
        reviewedBy: userInfo.id,
        reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
        reviewerHostCompanyId: hostCompanyId,
      });

      if (response.data.success) {
        Alert.alert('Success', response.data.message);
        loadAttendanceCorrections();
      }
    } catch (error) {
      console.error('Error processing correction:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to process correction');
    }
  };

  // Reports functions
  const loadReportsData = async () => {
    if (isAdmin && !isHostCompany) {
      // Load all reports for admin
      try {
        setLoadingReports(true);
        const headers = await getDeviceHeaders();
        const response = await axios.get(`${API_BASE_URL}/intern-reports`, {
          params: {
            internId: null,
            hostCompanyId: null,
            userRole: 'ADMIN',
            limit: 100,
            skip: 0
          },
          headers
        });

        if (response.data.success) {
          let reports = response.data.reports || [];
          
          // Apply filters if any
          if (reportFilters.statusFilter && reportFilters.statusFilter !== 'all') {
            reports = reports.filter(r => r.status === reportFilters.statusFilter);
          }
          if (reportFilters.severityFilter && reportFilters.severityFilter !== 'all') {
            reports = reports.filter(r => r.severity === reportFilters.severityFilter);
          }

          setPreviousReports(reports);
        }
      } catch (error) {
        console.error('Error loading intern reports:', error);
        setPreviousReports([]);
      } finally {
        setLoadingReports(false);
      }
    } else if (isHostCompany) {
      // Load interns list for host company
      try {
        setLoadingReports(true);
        const headers = await getDeviceHeaders();
        const response = await axios.get(`${API_BASE_URL}/staff/list`, {
          params: {
            hostCompanyId: hostCompanyId,
            role: 'Intern'
          },
          headers
        });

        if (response.data.success) {
          const internsList = response.data.staff || [];
          // Store interns globally, but don't display until one is selected
          setSelectedIntern(null);
          setPreviousReports([]);
        }
      } catch (error) {
        console.error('Error loading interns:', error);
        setPreviousReports([]);
      } finally {
        setLoadingReports(false);
      }
    }
  };

  // Load reports for selected intern (host company)
  const loadInternReports = async (internId) => {
    if (!isHostCompany || !hostCompanyId) return;

    try {
      setLoadingReports(true);
      const headers = await getDeviceHeaders();
      const response = await axios.get(`${API_BASE_URL}/intern-reports`, {
        params: {
          internId: internId,
          hostCompanyId: hostCompanyId,
          userRole: 'HOST_COMPANY',
          limit: 100,
          skip: 0
        },
        headers
      });

      if (response.data.success) {
        setPreviousReports(response.data.reports || []);
      }
    } catch (error) {
      console.error('Error loading intern reports:', error);
      setPreviousReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // Load available interns for host company
  const loadAvailableInterns = async () => {
    if (!isHostCompany || !hostCompanyId) return;

    try {
      setLoadingReports(true);
      const headers = await getDeviceHeaders();
      const response = await axios.get(`${API_BASE_URL}/staff/list`, {
        params: {
          hostCompanyId: hostCompanyId,
          role: 'Intern'
        },
        headers
      });

      if (response.data.success) {
        const internsList = response.data.staff || [];
        setAvailableInterns(internsList);
      }
    } catch (error) {
      console.error('Error loading interns:', error);
      setAvailableInterns([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // Fetch detailed report information
  const loadReportDetail = async (reportId) => {
    try {
      const headers = await getDeviceHeaders();
      const userRole = isAdmin ? 'ADMIN' : 'HOST_COMPANY';
      const response = await axios.get(`${API_BASE_URL}/intern-reports/${reportId}`, {
        params: {
          userRole: userRole,
          ...(isHostCompany && { hostCompanyId: hostCompanyId }),
          ...(isAdmin && { userId: userInfo.id })
        },
        headers
      });

      if (response.data.success) {
        setSelectedReport(response.data.report || response.data);
        setShowReportDetailModal(true);
      }
    } catch (error) {
      console.error('Error loading report details:', error);
      Alert.alert('Error', 'Failed to load report details');
    }
  };

  // Leave Applications functions
  const loadLeaveApplications = async () => {
    try {
      const params = {
        reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
      };
      if (hostCompanyId) {
        params.hostCompanyId = hostCompanyId;
      }
      if (leaveApplicationStatusFilter !== 'all') {
        params.status = leaveApplicationStatusFilter;
      }

      const response = await axios.get(`${API_BASE_URL}/staff/admin/leave-applications`, { params });
      if (response.data.success) {
        const apps = response.data.applications || [];
        setLeaveApplications(apps);

        // Keep pending leave count in sync while viewing this screen
        const pending = apps.filter(a => a.status === 'pending').length;
        setPendingLeaveCount(pending);
      }
    } catch (error) {
      console.error('Error loading leave applications:', error);
      Alert.alert('Error', 'Failed to load leave applications');
    }
  };

  const handleApproveRejectApplication = async (applicationId, action) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingApplication(true);
      const response = await axios.put(`${API_BASE_URL}/staff/admin/leave-applications/${applicationId}`, {
        action,
        rejectionReason: action === 'reject' ? rejectionReason.trim() : undefined,
        reviewedBy: userInfo.id,
        reviewerRole: isHostCompany ? 'hostCompany' : 'admin',
        reviewerHostCompanyId: hostCompanyId,
      });

      if (response.data.success) {
        Alert.alert('Success', response.data.message);
        setShowLeaveApplicationModal(false);
        setRejectionReason('');
        setSelectedLeaveApplication(null);
        loadLeaveApplications();
      }
    } catch (error) {
      console.error('Error processing application:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to process application');
    } finally {
      setProcessingApplication(false);
    }
  };

  // Devices functions
  const loadDevices = async () => {
    try {
      setLoadingData(true);
      const params = isHostCompany && hostCompanyId ? { hostCompanyId } : {};
      const response = await axios.get(`${API_BASE_URL}/staff/admin/devices`, { params });
      
      if (response.data.success) {
        const devicesList = response.data.devices || [];
        setDevices(devicesList);
        applyDeviceFilters(devicesList);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      Alert.alert('Error', 'Failed to load devices');
    } finally {
      setLoadingData(false);
    }
  };

  const applyDeviceFilters = (devicesList) => {
    let filtered = [...devicesList];

    // Filter by status
    if (deviceStatusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === deviceStatusFilter);
    }

    // Filter by search term
    if (deviceSearchTerm.trim()) {
      const term = deviceSearchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        (d.staffName && d.staffName.toLowerCase().includes(term)) ||
        (d.staffEmail && d.staffEmail.toLowerCase().includes(term)) ||
        (d.deviceModel && d.deviceModel.toLowerCase().includes(term)) ||
        (d.fingerprint && d.fingerprint.toLowerCase().includes(term))
      );
    }

    // Sort
    if (deviceSortOrder === 'newest') {
      filtered.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
    } else if (deviceSortOrder === 'oldest') {
      filtered.sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));
    } else if (deviceSortOrder === 'name') {
      filtered.sort((a, b) => (a.staffName || '').localeCompare(b.staffName || ''));
    }

    setFilteredDevices(filtered);
  };

  const handleDeviceAction = async (action) => {
    if (!selectedDevice) return;

    try {
      setProcessingDevice(true);
      const response = await axios.patch(
        `${API_BASE_URL}/staff/admin/devices/${selectedDevice._id}`,
        { action }
      );

      if (response.data.success) {
        Alert.alert('Success', `Device ${action}d successfully`);
        setShowDeviceConfirm(false);
        setShowDeviceDetails(false);
        setSelectedDevice(null);
        setDeviceAction(null);
        await loadDevices();
      }
    } catch (error) {
      console.error('Error processing device:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to process device');
    } finally {
      setProcessingDevice(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'trusted':
        return '#4caf50';
      case 'revoked':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const exportLeaveApplicationPDF = async (application) => {
    if (!application) return;
    const intern = application.internId || {};
    const departmentLabel = formatDepartmentLabel(
      application.departmentName || application.department,
      intern.department || intern.departmentName
    );
    const hostCompanyName =
      application.hostCompanyName ||
      application.hostCompanyId?.companyName ||
      application.hostCompanyId?.name ||
      'N/A';

    const status = application.status || 'pending';
    const statusColor =
      status === 'approved' ? '#16a34a' : status === 'rejected' ? '#dc2626' : '#eab308';

    try {
      setExportingLeavePDF(true);
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              ${getWatermarkCSS()}
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px; color: #1f2937; }
              .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 12px; background: #f9fafb; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { font-weight: 700; color: #374151; }
              .value { color: #111827; text-align: right; }
              .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; border: 1px solid ${statusColor}; color: ${statusColor}; background-color: ${statusColor}20; }
            </style>
          </head>
          <body>
            ${getWatermarkHTML()}
            ${getPDFHeaderHTML('Leave Application', 'Official copy')}
            <div class="card">
              <div class="row"><span class="label">Applicant</span><span class="value">${intern.name || application.internName || 'N/A'} ${intern.surname || ''}</span></div>
              <div class="row"><span class="label">Department</span><span class="value">${departmentLabel}</span></div>
              <div class="row"><span class="label">Host Company</span><span class="value">${hostCompanyName}</span></div>
              <div class="row"><span class="label">Leave Type</span><span class="value">${application.leaveType}</span></div>
              <div class="row"><span class="label">Dates</span><span class="value">${new Date(application.startDate).toLocaleDateString()} - ${new Date(application.endDate).toLocaleDateString()}</span></div>
              <div class="row"><span class="label">Days</span><span class="value">${application.numberOfDays}</span></div>
              <div class="row"><span class="label">Status</span><span class="pill">${status.toUpperCase()}</span></div>
            </div>
            <div class="card">
              <div class="label" style="margin-bottom:6px;">Reason</div>
              <div class="value" style="text-align:left; white-space:pre-line;">${application.reason || 'No reason provided'}</div>
            </div>
            <div class="card" style="background:#fff;">
              <div class="row"><span class="label">Submitted</span><span class="value">${new Date(application.createdAt).toLocaleString()}</span></div>
              ${application.reviewedAt ? `<div class="row"><span class="label">Reviewed</span><span class="value">${new Date(application.reviewedAt).toLocaleString()}</span></div>` : ''}
              ${application.rejectionReason ? `<div class="row"><span class="label">Rejection Reason</span><span class="value">${application.rejectionReason}</span></div>` : ''}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Leave Application PDF',
        });
      } else {
        Alert.alert('PDF generated', uri);
      }
    } catch (error) {
      console.error('Error exporting leave PDF:', error);
      Alert.alert('Error', 'Failed to export leave application');
    } finally {
      setExportingLeavePDF(false);
    }
  };

  const openSupportingDocument = async (doc) => {
    if (!doc || !doc.fileUrl) return;

    try {
      const url = doc.fileUrl;
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Attachment', 'This attachment link cannot be opened on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Attachment', 'Failed to open attachment.');
    }
  };

  const handleDeleteLeaveApplication = async (appId) => {
    Alert.alert(
      'Delete Leave Application',
      'Are you sure you want to delete this leave application? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/staff/admin/leave-applications/${appId}`);
              Alert.alert('Success', 'Leave application deleted successfully');
              await loadLeaveApplications();
              setShowLeaveApplicationModal(false);
              setSelectedLeaveApplication(null);
            } catch (error) {
              console.error('Error deleting leave application:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete leave application');
            }
          }
        }
      ]
    );
  };

  // Attendance Corrections View
  const renderAttendanceCorrections = () => {
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'approved':
          return '#16a34a';
        case 'rejected':
          return '#dc2626';
        default:
          return '#eab308';
      }
    };

    return (
      <View style={styles.content}>
        {/* Official Header */}
        <View style={{
          backgroundColor: theme.primary,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 20,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: theme.primaryDark,
        }}>
          <Text style={{
            fontSize: 22,
            fontWeight: '800',
            color: '#fff',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Attendance Corrections
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#fff',
            opacity: 0.9,
            letterSpacing: 0.5,
          }}>
            Official Correction Applications Registry
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 20,
          paddingHorizontal: 4,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: '#eab308',
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#eab308' }}>
              {attendanceCorrections.filter(c => c.status === 'pending').length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Pending
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: '#16a34a',
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#16a34a' }}>
              {attendanceCorrections.filter(c => c.status === 'approved').length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Approved
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: '#dc2626',
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#dc2626' }}>
              {attendanceCorrections.filter(c => c.status === 'rejected').length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Rejected
            </Text>
          </View>
        </View>

        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusFilterChip,
                    { borderColor: correctionsStatusFilter === status ? theme.primary : theme.border },
                    correctionsStatusFilter === status && { backgroundColor: theme.primary + '20' },
                  ]}
                  onPress={() => setCorrectionsStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.statusFilterChipText,
                      { color: correctionsStatusFilter === status ? theme.primary : theme.text },
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAttendanceCorrections} />}>
          {attendanceCorrections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No attendance corrections found</Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
              borderRadius: 12,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border,
            }}>
              {/* Table Header */}
              <View style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}>
                  CORRECTION APPLICATIONS
                </Text>
              </View>

              {/* Column Headers */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: theme.primary,
              }}>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Staff Member
                </Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Type
                </Text>
                <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Date
                </Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Company
                </Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
                  Status
                </Text>
              </View>

              {/* Correction Items */}
              {attendanceCorrections.map((corr, index) => {
                const intern = corr.internId || {};
                const statusColor = getStatusColor(corr.status);
                const hostCompanyName =
                  corr.hostCompanyName ||
                  corr.hostCompanyId?.companyName ||
                  corr.hostCompanyId?.name;
                return (
                  <TouchableOpacity
                    key={corr._id}
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      backgroundColor: index % 2 === 0 
                        ? (isDarkMode ? '#1e293b' : '#fff')
                        : (isDarkMode ? '#243447' : '#f8fafc'),
                      borderBottomWidth: index < attendanceCorrections.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                      setSelectedCorrection(corr);
                      setShowCorrectionModal(true);
                    }}
                    activeOpacity={0.6}
                  >
                    {/* Staff Member Column */}
                    <View style={{ flex: 2 }}>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: theme.text,
                        marginBottom: 3,
                      }}>
                        {intern.name || corr.internName} {intern.surname || ''}
                      </Text>
                      {!corr.canReview && (
                        <Text style={{
                          fontSize: 10,
                          color: theme.textTertiary,
                          fontStyle: 'italic',
                        }}>
                          View-only
                        </Text>
                      )}
                    </View>

                    {/* Type Column */}
                    <Text style={{
                      flex: 1.5,
                      fontSize: 12,
                      color: theme.textSecondary,
                    }}>
                      {safeGetCorrectionTypeLabel(corr.correctionType)}
                    </Text>

                    {/* Requested Time Column */}
                    <Text style={{
                      flex: 1.2,
                      fontSize: 11,
                      color: theme.textSecondary,
                      fontFamily: 'monospace',
                    }} numberOfLines={1}>
                      {corr.requestedChange?.time || corr.requestedChange?.clockTime || formatDate(corr.date)}
                    </Text>

                    {/* Reason Column */}
                    <Text style={{
                      flex: 1.5,
                      fontSize: 11,
                      color: theme.textSecondary,
                    }} numberOfLines={1}>
                      {corr.requestedChange?.description || '—'}
                    </Text>

                    {/* Status Column */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        backgroundColor: statusColor + '20',
                        borderWidth: 1,
                        borderColor: statusColor,
                      }}>
                        <Text style={{
                          fontSize: 9,
                          fontWeight: '700',
                          color: statusColor,
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                        }}>
                          {corr.status?.toUpperCase() || 'PENDING'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Correction Detail Modal */}
        <Modal
          visible={showCorrectionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowCorrectionModal(false);
            setCorrectionRejectionReason('');
            setSelectedCorrection(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.modalContent, styles.officialCard, { maxHeight: '90%', padding: 0, overflow: 'hidden' }]}>
              <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
                {selectedCorrection && (
                  <>
                    <View style={[styles.modalHeader, { 
                      backgroundColor: theme.primary, 
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                    }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalTitle, { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }]}>
                          Attendance Correction
                        </Text>
                        <Text style={{ color: '#e5edfb', fontSize: 12, marginTop: 4 }}>
                          Official Correction Request
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                          onPress={async () => {
                            if (!selectedCorrection) return;
                            if (exportingPDF) return;
                            try {
                              setExportingPDF(true);
                              const intern = selectedCorrection.internId || {};
                              const hostCompanyName =
                                selectedCorrection.hostCompanyName ||
                                selectedCorrection.hostCompanyId?.companyName ||
                                selectedCorrection.hostCompanyId?.name ||
                                intern.hostCompanyName ||
                                'N/A';
                              const departmentLabel = formatDepartmentLabel(
                                selectedCorrection.departmentName || selectedCorrection.department,
                                intern.department || intern.departmentName
                              ) || 'N/A';
                              const contact = intern.email || intern.emailAddress || intern.phoneNumber || 'N/A';
                              const location = intern.location || 'N/A';
                              const formatDate = (dateStr) => {
                                if (!dateStr) return 'N/A';
                                const date = new Date(dateStr);
                                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                              };
                              const getStatusColor = (status) => {
                                switch (status) {
                                  case 'approved': return '#16a34a';
                                  case 'rejected': return '#dc2626';
                                  default: return '#eab308';
                                }
                              };
                              const watermarkHTML = getWatermarkHTML();
                              const html = `
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <meta charset="UTF-8">
                                    <style>
                                      ${getWatermarkCSS()}
                                      body {
                                        font-family: 'Times New Roman', serif;
                                        margin: 0;
                                        padding: 40px;
                                        background: #ffffff;
                                        color: #1a1a1a;
                                      }
                                      .header {
                                        border: 3px solid #1e3a8a;
                                        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                                        color: white;
                                        padding: 25px;
                                        text-align: center;
                                        margin-bottom: 30px;
                                        border-radius: 8px;
                                      }
                                      .header h1 {
                                        margin: 0;
                                        font-size: 24px;
                                        font-weight: bold;
                                        letter-spacing: 2px;
                                        text-transform: uppercase;
                                      }
                                      .header p {
                                        margin: 8px 0 0 0;
                                        font-size: 14px;
                                        opacity: 0.95;
                                      }
                                      .section {
                                        margin-bottom: 25px;
                                        border: 2px solid #e5e7eb;
                                        border-radius: 6px;
                                        overflow: hidden;
                                      }
                                      .section-header {
                                        background: #1e3a8a;
                                        color: white;
                                        padding: 12px 18px;
                                        font-weight: bold;
                                        font-size: 16px;
                                        text-transform: uppercase;
                                        letter-spacing: 1px;
                                      }
                                      .section-content {
                                        padding: 18px;
                                        background: #f9fafb;
                                      }
                                      .row {
                                        display: flex;
                                        justify-content: space-between;
                                        padding: 10px 0;
                                        border-bottom: 1px solid #e5e7eb;
                                      }
                                      .row:last-child {
                                        border-bottom: none;
                                      }
                                      .label {
                                        font-weight: bold;
                                        color: #374151;
                                        width: 40%;
                                      }
                                      .value {
                                        color: #1a1a1a;
                                        width: 60%;
                                        text-align: right;
                                      }
                                      .status-badge {
                                        display: inline-block;
                                        padding: 6px 12px;
                                        border-radius: 4px;
                                        font-weight: bold;
                                        font-size: 12px;
                                        text-transform: uppercase;
                                      }
                                      .footer {
                                        margin-top: 40px;
                                        padding-top: 20px;
                                        border-top: 2px solid #1e3a8a;
                                        text-align: center;
                                        color: #6b7280;
                                        font-size: 12px;
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    ${watermarkHTML}
                                    <div class="header">
                                      <h1>Attendance Correction Request</h1>
                                      <p>Official Government Document</p>
                                    </div>
                                    <div class="section">
                                      <div class="section-header">Staff Information</div>
                                      <div class="section-content">
                                        <div class="row">
                                          <span class="label">Staff Name:</span>
                                          <span class="value">${intern.name || selectedCorrection.internName || 'N/A'} ${intern.surname || ''}</span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Host Company:</span>
                                          <span class="value">${hostCompanyName}</span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Department:</span>
                                          <span class="value">${departmentLabel}</span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Location:</span>
                                          <span class="value">${location}</span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Contact:</span>
                                          <span class="value">${contact}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div class="section">
                                      <div class="section-header">Correction Details</div>
                                      <div class="section-content">
                                        <div class="row">
                                          <span class="label">Correction Type:</span>
                                          <span class="value">${safeGetCorrectionTypeLabel(selectedCorrection.correctionType)}</span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Date:</span>
                                          <span class="value">${formatDate(selectedCorrection.date)}</span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Status:</span>
                                          <span class="value">
                                            <span class="status-badge" style="background: ${getStatusColor(selectedCorrection.status)}20; color: ${getStatusColor(selectedCorrection.status)}; border: 1px solid ${getStatusColor(selectedCorrection.status)};">
                                              ${(selectedCorrection.status || 'pending').toUpperCase()}
                                            </span>
                                          </span>
                                        </div>
                                        <div class="row" style="flex-direction: column; align-items: flex-start;">
                                          <span class="label" style="width: 100%; margin-bottom: 8px;">Description:</span>
                                          <span class="value" style="width: 100%; text-align: left; padding-left: 20px;">
                                            ${selectedCorrection.requestedChange?.description || 'No description provided'}
                                          </span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Submitted:</span>
                                          <span class="value">${formatDate(selectedCorrection.createdAt)}</span>
                                        </div>
                                        <div class="row">
                                          <span class="label">Reviewed:</span>
                                          <span class="value">${selectedCorrection.reviewedAt ? formatDate(selectedCorrection.reviewedAt) : 'Not reviewed'}</span>
                                        </div>
                                        ${selectedCorrection.rejectionReason ? `
                                        <div class="row" style="flex-direction: column; align-items: flex-start;">
                                          <span class="label" style="width: 100%; margin-bottom: 8px; color: #dc2626;">Rejection Reason:</span>
                                          <span class="value" style="width: 100%; text-align: left; padding-left: 20px; color: #dc2626;">
                                            ${selectedCorrection.rejectionReason}
                                          </span>
                                        </div>
                                        ` : ''}
                                      </div>
                                    </div>
                                    <div class="footer">
                                      <p>This is an official document generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                      <p>Document ID: ${selectedCorrection._id || 'N/A'}</p>
                                    </div>
                                  </body>
                                </html>
                              `;
                              const { uri } = await Print.printToFileAsync({ html });
                              if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(uri, {
                                  mimeType: 'application/pdf',
                                  dialogTitle: 'Attendance Correction PDF',
                                });
                              } else {
                                Alert.alert('PDF generated', uri);
                              }
                            } catch (error) {
                              console.error('Error exporting correction PDF:', error);
                              Alert.alert('Error', 'Failed to export attendance correction');
                            } finally {
                              setExportingPDF(false);
                            }
                          }}
                          style={{ padding: 8 }}
                          disabled={exportingPDF}
                        >
                          {exportingPDF ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setShowCorrectionModal(false);
                            setCorrectionRejectionReason('');
                            setSelectedCorrection(null);
                          }}
                          style={{ padding: 4 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '600' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.modalBody, { padding: 20 }]}>
                      {(() => {
                        const formatDate = (dateStr) => {
                          if (!dateStr) return 'N/A';
                          const date = new Date(dateStr);
                          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                        };
                        const getStatusColor = (status) => {
                          switch (status) {
                            case 'approved':
                              return '#16a34a';
                            case 'rejected':
                              return '#dc2626';
                            default:
                              return '#eab308';
                          }
                        };
                        const intern = selectedCorrection.internId || {};
                        const hostCompanyName =
                          selectedCorrection.hostCompanyName ||
                          selectedCorrection.hostCompanyId?.companyName ||
                          selectedCorrection.hostCompanyId?.name ||
                          intern.hostCompanyName ||
                          'N/A';
                        const departmentLabel = formatDepartmentLabel(
                          selectedCorrection.departmentName || selectedCorrection.department,
                          intern.department || intern.departmentName
                        ) || 'N/A';
                        const contact = intern.email || intern.emailAddress || intern.phoneNumber || 'N/A';
                        const location = intern.location || 'N/A';
                        const viewed = selectedCorrection.reviewedAt
                          ? formatDate(selectedCorrection.reviewedAt)
                          : 'Not reviewed';
                        return (
                          <>
                            <View style={[styles.officialCard, { marginBottom: 16, padding: 0, overflow: 'hidden' }]}>
                              <View style={[styles.officialRibbon, { backgroundColor: isDarkMode ? '#243447' : '#e2e8f0', paddingVertical: 10 }]}>
                                <Text style={[styles.officialRibbonText, { color: theme.text }]}>Staff Information</Text>
                              </View>
                              <View style={{ padding: 14 }}>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Staff Name</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>
                                    {intern.name || selectedCorrection.internName || 'N/A'} {intern.surname || ''}
                                  </Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Host Company</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>{hostCompanyName}</Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Department</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>{departmentLabel}</Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Location</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>{location}</Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Contact</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>{contact}</Text>
                                </View>
                              </View>
                            </View>

                            <View style={[styles.officialCard, { marginBottom: 16, padding: 0, overflow: 'hidden' }]}>
                              <View style={[styles.officialRibbon, { backgroundColor: theme.primary, paddingVertical: 10 }]}>
                                <Text style={styles.officialRibbonText}>Correction Details</Text>
                              </View>
                              <View style={{ padding: 14 }}>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Correction Type</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>
                                    {safeGetCorrectionTypeLabel(selectedCorrection.correctionType)}
                                  </Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Date</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>
                                    {formatDate(selectedCorrection.date)}
                                  </Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, alignItems: 'center', flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Status</Text>
                                  <View
                                    style={[
                                      styles.statusChip,
                                      {
                                        backgroundColor: getStatusColor(selectedCorrection.status) + '20',
                                        borderColor: getStatusColor(selectedCorrection.status),
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.statusText, { color: getStatusColor(selectedCorrection.status) }]}>
                                      {selectedCorrection.status?.toUpperCase() || 'PENDING'}
                                    </Text>
                                  </View>
                                </View>
                                <View style={[styles.officialRow, { alignItems: 'flex-start', minHeight: 40, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120, marginTop: 4 }]}>Description</Text>
                                  <Text style={[styles.officialValue, { flex: 1, textAlign: 'left', flexWrap: 'wrap' }]}>
                                    {selectedCorrection.requestedChange?.description || 'No description provided'}
                                  </Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Submitted</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>
                                    {formatDate(selectedCorrection.createdAt)}
                                  </Text>
                                </View>
                                <View style={[styles.officialRow, { minHeight: 32, flexWrap: 'wrap' }]}>
                                  <Text style={[styles.officialLabel, { flex: 0, minWidth: 120 }]}>Reviewed</Text>
                                  <Text style={[styles.officialValue, { flex: 1, flexWrap: 'wrap' }]}>{viewed}</Text>
                                </View>
                                {selectedCorrection.rejectionReason && (
                                  <View style={[styles.officialRow, { alignItems: 'flex-start', minHeight: 40, flexWrap: 'wrap' }]}>
                                    <Text style={[styles.officialLabel, { color: '#dc2626', flex: 0, minWidth: 120, marginTop: 4 }]}>Rejection Reason</Text>
                                    <Text style={[styles.officialValue, { color: '#dc2626', flex: 1, textAlign: 'left', flexWrap: 'wrap' }]}>
                                      {selectedCorrection.rejectionReason}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </>
                        );
                      })()}

                      {/* Action buttons for pending corrections - only if user can review */}
                      {selectedCorrection.status === 'pending' && selectedCorrection.canReview && (
                        <View style={{ marginTop: 20 }}>
                          <Text style={[styles.detailLabel, dynamicStyles.statLabel, { marginBottom: 8 }]}>
                            Rejection Reason (required for rejection):
                          </Text>
                          <TextInput
                            style={[styles.input, dynamicStyles.input, { marginBottom: 16 }]}
                            placeholder="Enter reason for rejection..."
                            placeholderTextColor={theme.textSecondary}
                            value={correctionRejectionReason}
                            onChangeText={setCorrectionRejectionReason}
                            multiline
                          />
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: '#16a34a', flex: 1 }]}
                              onPress={async () => {
                                setProcessingCorrection(true);
                                await handleApproveRejectCorrection(selectedCorrection._id, 'approve');
                                setProcessingCorrection(false);
                                setShowCorrectionModal(false);
                                setSelectedCorrection(null);
                                setCorrectionRejectionReason('');
                              }}
                              disabled={processingCorrection}
                            >
                              {processingCorrection ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text style={styles.actionButtonText}>Approve</Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: '#dc2626', flex: 1 }]}
                              onPress={async () => {
                                if (!correctionRejectionReason.trim()) {
                                  Alert.alert('Error', 'Please provide a reason for rejection');
                                  return;
                                }
                                setProcessingCorrection(true);
                                await handleApproveRejectCorrection(selectedCorrection._id, 'reject', correctionRejectionReason);
                                setProcessingCorrection(false);
                                setShowCorrectionModal(false);
                                setSelectedCorrection(null);
                                setCorrectionRejectionReason('');
                              }}
                              disabled={processingCorrection}
                            >
                              {processingCorrection ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text style={styles.actionButtonText}>Reject</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* View-only message for non-reviewable corrections */}
                      {selectedCorrection.status === 'pending' && !selectedCorrection.canReview && (
                        <View style={{ marginTop: 20, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
                          <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 13 }}>
                            View only - This correction can only be approved/rejected by the host company that registered this intern.
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderLeaveApplications = () => {
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'approved':
          return '#16a34a';
        case 'rejected':
          return '#dc2626';
        default:
          return '#eab308';
      }
    };

    return (
      <View style={styles.content}>
        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusFilterChip,
                    { borderColor: leaveApplicationStatusFilter === status ? theme.primary : theme.border },
                    leaveApplicationStatusFilter === status && { backgroundColor: theme.primary + '20' },
                  ]}
                  onPress={() => setLeaveApplicationStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.statusFilterChipText,
                      { color: leaveApplicationStatusFilter === status ? theme.primary : theme.text },
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLeaveApplications} />}>
          {leaveApplications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No leave applications found</Text>
            </View>
          ) : (
            leaveApplications.map((app) => {
              const intern = app.internId || {};
              const departmentLabel = formatDepartmentLabel(
                app.departmentName || app.department,
                intern.department || intern.departmentName
              );
              const statusColor = getStatusColor(app.status);
              const hostCompanyName =
                app.hostCompanyName ||
                app.hostCompanyId?.companyName ||
                app.hostCompanyId?.name;
              return (
                <TouchableOpacity
                  key={app._id}
                  style={[styles.staffCard, dynamicStyles.staffCard, styles.officialCard, { marginBottom: 12 }]}
                  onPress={() => {
                    setSelectedLeaveApplication(app);
                    setShowLeaveApplicationModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.officialRibbon, { backgroundColor: theme.primary, justifyContent: 'space-between' }]}>
                    <View>
                      <Text style={styles.officialRibbonText}>Leave Application</Text>
                      <Text style={styles.officialRibbonSubText}>Reference: {app._id?.slice(-6) || 'Request'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={[
                          styles.statusChip,
                          { backgroundColor: '#ffffff30', borderColor: '#ffffff70' },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: '#fff' }]}>{(app.status || 'PENDING').toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteLeaveApplication(app._id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={{ fontSize: 18, color: '#fff' }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.staffName, dynamicStyles.staffName]}>
                        {intern.name || app.internName} {intern.surname || ''}
                      </Text>
                      {!app.canReview && (
                        <TouchableOpacity onPress={() => Alert.alert('Info', 'View-only: approvals are limited to the registering admin or the owning host company.')}>
                          <Text style={styles.infoIconSmall}>i</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.officialRow}>
                      <Text style={styles.officialLabel}>Leave Type</Text>
                      <Text style={styles.officialValue}>
                        {app.leaveType} • {app.numberOfDays} {app.numberOfDays === 1 ? 'day' : 'days'}
                      </Text>
                    </View>

                    <View style={styles.officialRow}>
                      <Text style={styles.officialLabel}>Dates</Text>
                      <Text style={styles.officialValue}>
                        {formatDate(app.startDate)} - {formatDate(app.endDate)}
                      </Text>
                    </View>

                    {departmentLabel && (
                      <View style={styles.officialRow}>
                        <Text style={styles.officialLabel}>Department</Text>
                        <Text style={styles.officialValue}>{departmentLabel}</Text>
                      </View>
                    )}

                    {hostCompanyName && (
                      <View style={styles.officialRow}>
                        <Text style={styles.officialLabel}>Host Company</Text>
                        <Text style={styles.officialValue}>{hostCompanyName}</Text>
                      </View>
                    )}

                    {(intern.email || intern.emailAddress || intern.phoneNumber) && (
                      <View style={styles.officialRow}>
                        <Text style={styles.officialLabel}>Contact</Text>
                        <Text style={styles.officialValue}>
                          {intern.email || intern.emailAddress || intern.phoneNumber}
                        </Text>
                      </View>
                    )}

                    {app.supportingDocuments && app.supportingDocuments.length > 0 && (
                      <View style={styles.officialRow}>
                        <Text style={styles.officialLabel}>Attachments</Text>
                        <Text style={styles.officialValue}>{app.supportingDocuments.length} file(s)</Text>
                      </View>
                    )}

                    <View style={styles.officialRow}>
                      <Text style={styles.officialLabel}>Submitted</Text>
                      <Text style={styles.officialValue}>{formatDate(app.createdAt)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Application Detail Modal */}
        <Modal
          visible={showLeaveApplicationModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowLeaveApplicationModal(false);
            setRejectionReason('');
            setSelectedLeaveApplication(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.modalContent, styles.officialCard, { maxHeight: '90%' }]}>
              <ScrollView>
                {selectedLeaveApplication && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Leave Application Details</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowLeaveApplicationModal(false);
                          setRejectionReason('');
                          setSelectedLeaveApplication(null);
                        }}
                      >
                        <Text style={styles.modalCloseButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.officialRibbon, { backgroundColor: theme.primary, marginBottom: 10 }]}>
                      <View>
                        <Text style={styles.officialRibbonText}>Official Leave Review</Text>
                        <Text style={styles.officialRibbonSubText}>Government Form Presentation</Text>
                      </View>
                      <Text style={styles.officialRibbonBadge}>Review</Text>
                    </View>

                    <View style={styles.applicationDetails}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Intern Name:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>
                          {(selectedLeaveApplication.internId?.name || selectedLeaveApplication.internName) +
                            ' ' +
                            (selectedLeaveApplication.internId?.surname || '')}
                        </Text>
                      </View>
                      {(() => {
                        const intern = selectedLeaveApplication.internId || {};
                        const hostCompanyName =
                          selectedLeaveApplication.hostCompanyName ||
                          selectedLeaveApplication.hostCompanyId?.companyName ||
                          selectedLeaveApplication.hostCompanyId?.name ||
                          intern.hostCompanyName;
                        const contact = intern.email || intern.emailAddress || intern.phoneNumber || 'N/A';
                        const location = intern.location || 'N/A';
                        return (
                          <>
                            {hostCompanyName && (
                              <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Host Company:</Text>
                                <Text style={[styles.detailValue, dynamicStyles.text]}>{hostCompanyName}</Text>
                              </View>
                            )}
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Contact:</Text>
                              <Text style={[styles.detailValue, dynamicStyles.text]}>{contact}</Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Location:</Text>
                              <Text style={[styles.detailValue, dynamicStyles.text]}>{location}</Text>
                            </View>
                          </>
                        );
                      })()}
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Department:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>
                          {formatDepartmentLabel(
                            selectedLeaveApplication.departmentName || selectedLeaveApplication.department,
                            selectedLeaveApplication.internId?.department || selectedLeaveApplication.internId?.departmentName
                          )}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Host Company:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>
                          {selectedLeaveApplication.hostCompanyName ||
                            selectedLeaveApplication.hostCompanyId?.companyName ||
                            selectedLeaveApplication.hostCompanyId?.name ||
                            'N/A'}
                        </Text>
                      </View>
                      {(selectedLeaveApplication.internId?.email ||
                        selectedLeaveApplication.internId?.emailAddress ||
                        selectedLeaveApplication.internEmail) && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Email:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.text]}>
                            {selectedLeaveApplication.internId?.email ||
                              selectedLeaveApplication.internId?.emailAddress ||
                              selectedLeaveApplication.internEmail}
                          </Text>
                        </View>
                      )}
                      {selectedLeaveApplication.internId?.phoneNumber && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Phone:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.text]}>
                            {selectedLeaveApplication.internId.phoneNumber}
                          </Text>
                        </View>
                      )}
                      {(selectedLeaveApplication.internId?.location ||
                        selectedLeaveApplication.location ||
                        selectedLeaveApplication.internLocation) && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Location:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.text]}>
                            {selectedLeaveApplication.internId?.location ||
                              selectedLeaveApplication.location ||
                              selectedLeaveApplication.internLocation ||
                              'N/A'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Leave Type:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>{selectedLeaveApplication.leaveType}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Start Date:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>
                          {formatDate(selectedLeaveApplication.startDate)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>End Date:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>
                          {formatDate(selectedLeaveApplication.endDate)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Number of Days:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>
                          {selectedLeaveApplication.numberOfDays}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Reason:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.text]}>{selectedLeaveApplication.reason}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Status:</Text>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: getStatusColor(selectedLeaveApplication.status) + '20',
                              borderColor: getStatusColor(selectedLeaveApplication.status),
                            },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: getStatusColor(selectedLeaveApplication.status) }]}>
                            {selectedLeaveApplication.status?.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {selectedLeaveApplication.rejectionReason && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Rejection Reason:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.text, { color: '#dc2626' }]}>
                            {selectedLeaveApplication.rejectionReason}
                          </Text>
                        </View>
                      )}

                      {selectedLeaveApplication.reviewedAt && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Reviewed At:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.text]}>
                            {formatDate(selectedLeaveApplication.reviewedAt)}
                          </Text>
                        </View>
                      )}
                      {selectedLeaveApplication.supportingDocuments && selectedLeaveApplication.supportingDocuments.length > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, dynamicStyles.textSecondary]}>Attachments:</Text>
                          <View style={{ flex: 2 }}>
                            {selectedLeaveApplication.supportingDocuments.map((doc, idx) => (
                              <TouchableOpacity key={idx} onPress={() => openSupportingDocument(doc)}>
                                <Text style={[styles.detailValue, dynamicStyles.text, { textDecorationLine: 'underline' }]}>
                                  {doc.fileName || 'Document'} (tap to open)
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>

                    {!selectedLeaveApplication.canReview && (
                      <Text style={[styles.emptyText, dynamicStyles.emptyText, { marginVertical: 8 }]}>
                        View only: approvals are limited to the registering admin or the owning host company.
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[styles.exportPDFButton, dynamicStyles.exportButton, { marginTop: 4 }]}
                      onPress={() => exportLeaveApplicationPDF(selectedLeaveApplication)}
                      disabled={exportingLeavePDF}
                    >
                      {exportingLeavePDF ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.exportPDFButtonText}>Export PDF</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.exportPDFButton, { marginTop: 4, backgroundColor: '#dc2626' }]}
                      onPress={() => handleDeleteLeaveApplication(selectedLeaveApplication._id)}
                    >
                      <Text style={styles.exportPDFButtonText}>Delete Application</Text>
                    </TouchableOpacity>

                    {selectedLeaveApplication.status === 'pending' && (
                      <View style={styles.applicationActions}>
                        <TextInput
                          style={[
                            styles.textArea,
                            dynamicStyles.textInput,
                            { marginBottom: 12, minHeight: 80, textAlignVertical: 'top' },
                          ]}
                          placeholder="Rejection reason (required if rejecting)"
                          placeholderTextColor={theme?.textTertiary || '#718096'}
                          value={rejectionReason}
                          onChangeText={setRejectionReason}
                          multiline
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { flex: 1, backgroundColor: '#16a34a' },
                              processingApplication && styles.actionButtonDisabled,
                              !selectedLeaveApplication.canReview && styles.actionButtonDisabled,
                            ]}
                            onPress={() => handleApproveRejectApplication(selectedLeaveApplication._id, 'approve')}
                            disabled={processingApplication || !selectedLeaveApplication.canReview}
                          >
                            <Text style={styles.actionButtonText}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { flex: 1, backgroundColor: '#dc2626' },
                              processingApplication && styles.actionButtonDisabled,
                              !selectedLeaveApplication.canReview && styles.actionButtonDisabled,
                            ]}
                            onPress={() => handleApproveRejectApplication(selectedLeaveApplication._id, 'reject')}
                            disabled={processingApplication || !selectedLeaveApplication.canReview}
                          >
                            <Text style={styles.actionButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ==================== DEVICES VIEW ====================
  const renderDevices = () => {
    return (
      <View style={styles.content}>
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Filters Section */}
          <View style={[styles.filtersSection, dynamicStyles.cardBg]}>
            {/* Search */}
            <TextInput
              style={[styles.filterInput, dynamicStyles.input]}
              placeholder="Search by name, email, model..."
              placeholderTextColor={isDarkMode ? '#999' : '#666'}
              value={deviceSearchTerm}
              onChangeText={setDeviceSearchTerm}
            />

            {/* Status Filter */}
            <View style={styles.filterButtonsRow}>
              {['all', 'pending', 'trusted', 'revoked'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    deviceStatusFilter === status && styles.filterButtonActive,
                    deviceStatusFilter === status && { backgroundColor: status === 'pending' ? '#ff9800' : status === 'trusted' ? '#4caf50' : '#f44336' }
                  ]}
                  onPress={() => setDeviceStatusFilter(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    deviceStatusFilter === status && { color: '#fff' }
                  ]}>
                    {status === 'all' ? 'All' : getStatusLabel(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Options */}
            <View style={styles.filterButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  deviceSortOrder === 'newest' && { borderBottomWidth: 2, borderBottomColor: '#3166AE' }
                ]}
                onPress={() => setDeviceSortOrder('newest')}
              >
                <Text style={[styles.sortButtonText, deviceSortOrder === 'newest' && { color: '#3166AE', fontWeight: 'bold' }]}>
                  Newest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  deviceSortOrder === 'oldest' && { borderBottomWidth: 2, borderBottomColor: '#3166AE' }
                ]}
                onPress={() => setDeviceSortOrder('oldest')}
              >
                <Text style={[styles.sortButtonText, deviceSortOrder === 'oldest' && { color: '#3166AE', fontWeight: 'bold' }]}>
                  Oldest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  deviceSortOrder === 'name' && { borderBottomWidth: 2, borderBottomColor: '#3166AE' }
                ]}
                onPress={() => setDeviceSortOrder('name')}
              >
                <Text style={[styles.sortButtonText, deviceSortOrder === 'name' && { color: '#3166AE', fontWeight: 'bold' }]}>
                  Name
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Devices List */}
          {loadingData ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#3166AE" />
            </View>
          ) : filteredDevices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="phonelink-off" size={64} color={isDarkMode ? '#666' : '#ccc'} />
              <Text style={[styles.emptyText, dynamicStyles.text]}>No devices found</Text>
            </View>
          ) : (
            <View style={styles.devicesListContainer}>
              {filteredDevices.map((device) => (
                <TouchableOpacity
                  key={device._id}
                  style={[styles.deviceCard, dynamicStyles.cardBg]}
                  onPress={() => {
                    setSelectedDevice(device);
                    setShowDeviceDetails(true);
                  }}
                >
                  <View style={styles.deviceCardHeader}>
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, dynamicStyles.text]} numberOfLines={1}>
                        {device.staffName || 'Unknown Staff'}
                      </Text>
                      <Text style={[styles.deviceEmail, dynamicStyles.secondaryText]} numberOfLines={1}>
                        {device.staffEmail || 'N/A'}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(device.status) }
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {getStatusLabel(device.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.deviceModel, dynamicStyles.secondaryText]} numberOfLines={1}>
                    {device.deviceInfo?.modelName || 'Unknown Model'}
                  </Text>

                  <Text style={[styles.deviceDate, dynamicStyles.secondaryText]} numberOfLines={1}>
                    Registered: {new Date(device.registeredAt).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Device Details Modal */}
        <Modal
          visible={showDeviceDetails}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeviceDetails(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.cardBg]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, dynamicStyles.text]}>Device Details</Text>
                <TouchableOpacity onPress={() => setShowDeviceDetails(false)}>
                  <MaterialIcons name="close" size={24} color={isDarkMode ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>

              {selectedDevice && (
                <ScrollView style={styles.modalBody}>
                  <View style={[styles.detailRow, { borderBottomColor: isDarkMode ? '#444' : '#eee' }]}>
                    <Text style={[styles.detailLabel, dynamicStyles.secondaryText]}>Staff Name</Text>
                    <Text style={[styles.detailValue, dynamicStyles.text]}>{selectedDevice.staffName}</Text>
                  </View>

                  <View style={[styles.detailRow, { borderBottomColor: isDarkMode ? '#444' : '#eee' }]}>
                    <Text style={[styles.detailLabel, dynamicStyles.secondaryText]}>Email</Text>
                    <Text style={[styles.detailValue, dynamicStyles.text]}>{selectedDevice.staffEmail}</Text>
                  </View>

                  <View style={[styles.detailRow, { borderBottomColor: isDarkMode ? '#444' : '#eee' }]}>
                    <Text style={[styles.detailLabel, dynamicStyles.secondaryText]}>Device Model</Text>
                    <Text style={[styles.detailValue, dynamicStyles.text]}>{selectedDevice.deviceInfo?.modelName || 'Unknown'}</Text>
                  </View>

                  <View style={[styles.detailRow, { borderBottomColor: isDarkMode ? '#444' : '#eee' }]}>
                    <Text style={[styles.detailLabel, dynamicStyles.secondaryText]}>Platform</Text>
                    <Text style={[styles.detailValue, dynamicStyles.text]}>{selectedDevice.deviceInfo?.platform || 'Unknown'}</Text>
                  </View>

                  <View style={[styles.detailRow, { borderBottomColor: isDarkMode ? '#444' : '#eee' }]}>
                    <Text style={[styles.detailLabel, dynamicStyles.secondaryText]}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedDevice.status) }]}>
                      <Text style={styles.statusBadgeText}>{getStatusLabel(selectedDevice.status)}</Text>
                    </View>
                  </View>

                  <View style={[styles.detailRow, { borderBottomColor: isDarkMode ? '#444' : '#eee' }]}>
                    <Text style={[styles.detailLabel, dynamicStyles.secondaryText]}>Registered</Text>
                    <Text style={[styles.detailValue, dynamicStyles.text]}>
                      {new Date(selectedDevice.registeredAt).toLocaleString()}
                    </Text>
                  </View>

                  <View style={[styles.detailRow, { borderBottomColor: isDarkMode ? '#444' : '#eee' }]}>
                    <Text style={[styles.detailLabel, dynamicStyles.secondaryText]}>Fingerprint</Text>
                    <Text style={[styles.detailValue, dynamicStyles.text, { fontSize: 11 }]}>
                      {selectedDevice.fingerprint?.substring(0, 32)}...
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsContainer}>
                    {selectedDevice.status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
                          onPress={() => {
                            setDeviceAction('approve');
                            setShowDeviceConfirm(true);
                          }}
                          disabled={processingDevice}
                        >
                          <MaterialIcons name="check-circle" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#f44336' }]}
                          onPress={() => {
                            setDeviceAction('reject');
                            setShowDeviceConfirm(true);
                          }}
                          disabled={processingDevice}
                        >
                          <MaterialIcons name="cancel" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {selectedDevice.status === 'trusted' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#ff9800' }]}
                        onPress={() => {
                          setDeviceAction('revoke');
                          setShowDeviceConfirm(true);
                        }}
                        disabled={processingDevice}
                      >
                        <MaterialIcons name="block" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          visible={showDeviceConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeviceConfirm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.confirmModalContent, dynamicStyles.cardBg]}>
              <MaterialIcons
                name={deviceAction === 'approve' ? 'check-circle' : deviceAction === 'reject' ? 'cancel' : 'block'}
                size={48}
                color={deviceAction === 'approve' ? '#4caf50' : '#f44336'}
                style={styles.confirmIcon}
              />

              <Text style={[styles.confirmTitle, dynamicStyles.text]}>
                {deviceAction === 'approve' ? 'Approve Device?' : deviceAction === 'reject' ? 'Reject Device?' : 'Revoke Device?'}
              </Text>

              <Text style={[styles.confirmMessage, dynamicStyles.secondaryText]}>
                {deviceAction === 'approve' 
                  ? 'This device will be approved and can be used for clock-in/out.'
                  : deviceAction === 'reject'
                  ? 'This device will be rejected and cannot be used.'
                  : 'This device will be revoked and can no longer be used.'
                }
              </Text>

              <View style={styles.confirmButtonsContainer}>
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: '#e0e0e0' }]}
                  onPress={() => setShowDeviceConfirm(false)}
                  disabled={processingDevice}
                >
                  <Text style={{ color: '#000', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    {
                      backgroundColor: deviceAction === 'approve' ? '#4caf50' : '#f44336'
                    }
                  ]}
                  onPress={() => handleDeviceAction(deviceAction)}
                  disabled={processingDevice}
                >
                  {processingDevice ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600' }}>
                      {deviceAction === 'approve' ? 'Approve' : deviceAction === 'reject' ? 'Reject' : 'Revoke'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ==================== HOST COMPANY DETAILS VIEW ====================
  // Professional full-page view for host company details (government/official style)
  const renderHostCompanyDetails = () => {
    if (!selectedHostCompany) {
      return (
        <View style={styles.content}>
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No company selected</Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.content} 
        refreshControl={
          <RefreshControl 
            refreshing={loadingHostCompanyDetails} 
            onRefresh={() => loadHostCompanyDetails(selectedHostCompany._id)} 
          />
        }
      >
        {/* Back Navigation Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: 4,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          marginBottom: 20
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: theme.primary + '10',
              borderRadius: 8,
              marginRight: 16
            }}
            onPress={() => {
              setActiveView('hostCompanies');
              setSelectedHostCompany(null);
              setHostCompanyDepartments([]);
              setHostCompanyInterns([]);
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 8 }}>←</Text>
            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>Back to Companies</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle, { flex: 1, marginBottom: 0 }]}>
            Company Profile
          </Text>
          <TouchableOpacity
            style={styles.exportIconButton}
            onPress={async () => {
              if (selectedHostCompany) {
                await exportHostCompanyPDF(selectedHostCompany);
              }
            }}
            disabled={exportingHostCompany}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {exportingHostCompany ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={styles.exportIconSmall}>📄</Text>
            )}
          </TouchableOpacity>
        </View>

        {loadingHostCompanyDetails ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading company details...</Text>
          </View>
        ) : (
          <>
            {/* ===== COMPANY INFORMATION SECTION ===== */}
            <View style={{
              backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
              borderRadius: 12,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border
            }}>
              {/* Section Header */}
              <View style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                paddingHorizontal: 20
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                  🏢 COMPANY INFORMATION
                </Text>
              </View>

              {/* Company Info Table */}
              <View style={{ padding: 0 }}>
                {/* Row 1: Company Name */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Company Name
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
                      {selectedHostCompany.companyName || selectedHostCompany.name || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Row 2: Display Name */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Display Name
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 14, color: theme.text }}>
                      {selectedHostCompany.name || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Row 3: Registration Number */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Registration No.
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'monospace' }}>
                      {selectedHostCompany.registrationNumber || 'Not provided'}
                    </Text>
                  </View>
                </View>

                {/* Row 4: Business Type */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Business Type
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 14, color: theme.text }}>
                      {selectedHostCompany.businessType || 'Not specified'}
                    </Text>
                  </View>
                </View>

                {/* Row 5: Industry */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Industry
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 14, color: theme.text }}>
                      {selectedHostCompany.industry || 'Not specified'}
                    </Text>
                  </View>
                </View>

                {/* Row 6: Email */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Email Address
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 14, color: theme.primary }}>
                      {selectedHostCompany.emailAddress || 'Not provided'}
                    </Text>
                  </View>
                </View>

                {/* Row 7: Operating Hours */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Operating Hours
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 14, color: theme.text }}>
                      {selectedHostCompany.operatingHours || 'Not specified'}
                    </Text>
                  </View>
                </View>

                {/* Row 8: Username */}
                <View style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Login Username
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 14, color: theme.text, fontFamily: 'monospace' }}>
                      {selectedHostCompany.username || 'Not set'}
                    </Text>
                  </View>
                </View>

                {/* Row 9: Status */}
                <View style={{
                  flexDirection: 'row'
                }}>
                  <View style={{
                    width: 140,
                    backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Account Status
                    </Text>
                  </View>
                  <View style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <View style={{
                      alignSelf: 'flex-start',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: selectedHostCompany.isActive ? '#16a34a20' : '#dc262620'
                    }}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: selectedHostCompany.isActive ? '#16a34a' : '#dc2626',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        {selectedHostCompany.isActive ? '● ACTIVE' : '● INACTIVE'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== DEFAULT WORKING HOURS SECTION ===== */}
            {(selectedHostCompany.defaultClockInTime || selectedHostCompany.defaultClockOutTime || 
              selectedHostCompany.defaultBreakStartTime || selectedHostCompany.defaultBreakEndTime) && (
              <View style={{
                backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
                borderRadius: 12,
                marginBottom: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.border
              }}>
                {/* Section Header */}
                <View style={{
                  backgroundColor: '#0891b2',
                  paddingVertical: 14,
                  paddingHorizontal: 20
                }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                    ⏰ DEFAULT WORKING HOURS
                  </Text>
                </View>

                {/* Working Hours Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <View style={{
                    width: '50%',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderRightWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
                      Clock-In Time
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                      {selectedHostCompany.defaultClockInTime || '--:--'}
                    </Text>
                  </View>
                  <View style={{
                    width: '50%',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
                      Clock-Out Time
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                      {selectedHostCompany.defaultClockOutTime || '--:--'}
                    </Text>
                  </View>
                  <View style={{
                    width: '50%',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRightWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
                      Break Start
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                      {selectedHostCompany.defaultBreakStartTime || '--:--'}
                    </Text>
                  </View>
                  <View style={{
                    width: '50%',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
                      Break End
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
                      {selectedHostCompany.defaultBreakEndTime || '--:--'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ===== STATISTICS SUMMARY ===== */}
            <View style={{
              flexDirection: 'row',
              gap: 16,
              marginBottom: 24
            }}>
              <View style={{
                flex: 1,
                backgroundColor: isDarkMode ? '#1a2332' : '#fff',
                borderRadius: 12,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center'
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#3b82f620',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12
                }}>
                  <Text style={{ fontSize: 24 }}>📋</Text>
                </View>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#3b82f6', marginBottom: 4 }}>
                  {hostCompanyDepartments.length}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Departments
                </Text>
              </View>
              <View style={{
                flex: 1,
                backgroundColor: isDarkMode ? '#1a2332' : '#fff',
                borderRadius: 12,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center'
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#16a34a20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12
                }}>
                  <Text style={{ fontSize: 24 }}>👥</Text>
                </View>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#16a34a', marginBottom: 4 }}>
                  {hostCompanyInterns.length}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Staff/Interns
                </Text>
              </View>
            </View>

            {/* ===== DEPARTMENTS TABLE ===== */}
            <View style={{
              backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
              borderRadius: 12,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border
            }}>
              {/* Section Header */}
              <View style={{
                backgroundColor: '#6366f1',
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                  📋 DEPARTMENTS
                </Text>
                <View style={{
                  backgroundColor: '#fff',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{ color: '#6366f1', fontSize: 12, fontWeight: '700' }}>
                    {hostCompanyDepartments.length}
                  </Text>
                </View>
              </View>

              {/* Table Header */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                paddingVertical: 12,
                paddingHorizontal: 16
              }}>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  Department Name
                </Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'center' }}>
                  Code
                </Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'center' }}>
                  Interns
                </Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'center' }}>
                  Status
                </Text>
              </View>

              {/* Table Body */}
              {hostCompanyDepartments.length === 0 ? (
                <View style={{
                  paddingVertical: 40,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                }}>
                  <Text style={{ fontSize: 14, color: theme.textSecondary, fontStyle: 'italic' }}>
                    No departments registered
                  </Text>
                </View>
              ) : (
                hostCompanyDepartments.map((dept, index) => (
                  <TouchableOpacity
                    key={dept._id}
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: index % 2 === 0 
                        ? (isDarkMode ? '#1e293b' : '#fff')
                        : (isDarkMode ? '#243447' : '#f8fafc'),
                      borderBottomWidth: index < hostCompanyDepartments.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      setSelectedDepartment(dept);
                      setShowDepartmentDetails(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 2 }}>
                        {dept.name}
                      </Text>
                      {dept.location && (
                        <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                          📍 {dept.location}
                        </Text>
                      )}
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, textAlign: 'center', fontFamily: 'monospace' }}>
                      {dept.departmentCode || '-'}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.primary, textAlign: 'center' }}>
                      {dept.internCount || 0}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        backgroundColor: dept.isActive ? '#16a34a20' : '#dc262620'
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: dept.isActive ? '#16a34a' : '#dc2626',
                          textTransform: 'uppercase'
                        }}>
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* ===== STAFF/INTERNS TABLE ===== */}
            <View style={{
              backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
              borderRadius: 12,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border
            }}>
              {/* Section Header */}
              <View style={{
                backgroundColor: '#16a34a',
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>
                  👥 STAFF / INTERNS
                </Text>
                <View style={{
                  backgroundColor: '#fff',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '700' }}>
                    {hostCompanyInterns.length}
                  </Text>
                </View>
              </View>

              {/* Table Header */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                paddingVertical: 12,
                paddingHorizontal: 16
              }}>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  Name
                </Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  ID Number
                </Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' }}>
                  Department
                </Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'center' }}>
                  Role
                </Text>
                <Text style={{ flex: 0.8, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', textAlign: 'center' }}>
                  Status
                </Text>
              </View>

              {/* Table Body */}
              {hostCompanyInterns.length === 0 ? (
                <View style={{
                  paddingVertical: 40,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff'
                }}>
                  <Text style={{ fontSize: 14, color: theme.textSecondary, fontStyle: 'italic' }}>
                    No staff/interns registered
                  </Text>
                </View>
              ) : (
                hostCompanyInterns.map((intern, index) => (
                  <View
                    key={intern._id}
                    style={{
                      flexDirection: 'row',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: index % 2 === 0 
                        ? (isDarkMode ? '#1e293b' : '#fff')
                        : (isDarkMode ? '#243447' : '#f8fafc'),
                      borderBottomWidth: index < hostCompanyInterns.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                      alignItems: 'center'
                    }}
                  >
                    <View style={{ flex: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                        {intern.name} {intern.surname || ''}
                      </Text>
                      {intern.phoneNumber && (
                        <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                          📞 {intern.phoneNumber}
                        </Text>
                      )}
                    </View>
                    <Text style={{ flex: 1.5, fontSize: 12, color: theme.textSecondary, fontFamily: 'monospace' }}>
                      {intern.idNumber || '-'}
                    </Text>
                    <Text style={{ flex: 1.5, fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>
                      {intern.department || '-'}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 4,
                        backgroundColor: theme.primary + '15'
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: theme.primary }}>
                          {intern.role || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flex: 0.8, alignItems: 'center' }}>
                      <View style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: intern.isActive ? '#16a34a' : '#dc2626'
                      }} />
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* ===== QUICK ACTIONS ===== */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 30
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8
                }}
                onPress={() => handleEditHostCompany(selectedHostCompany)}
              >
                <Text style={{ fontSize: 16 }}>✏️</Text>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Edit Company</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#dc2626',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8
                }}
                onPress={() => {
                  handleDeleteHostCompany(selectedHostCompany);
                }}
              >
                <Text style={{ fontSize: 16 }}>🗑️</Text>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Delete Company</Text>
              </TouchableOpacity>
            </View>

            {/* Footer Note */}
            <View style={{
              paddingVertical: 16,
              paddingHorizontal: 20,
              backgroundColor: isDarkMode ? '#1a233280' : '#f1f5f9',
              borderRadius: 8,
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 }}>
                This profile contains confidential business information. Handle with care and in accordance with data protection policies.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  const renderHostCompanies = () => {
    
    return (
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadHostCompanies} />}
      >
        {/* ===== PAGE HEADER ===== */}
        <View style={{
          paddingVertical: 20,
          paddingHorizontal: 4,
          borderBottomWidth: 2,
          borderBottomColor: theme.primary,
          marginBottom: 20
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ 
                fontSize: 24, 
                fontWeight: '800', 
                color: theme.text,
                letterSpacing: 0.5,
                marginBottom: 4
              }}>
                🏢 HOST COMPANY REGISTRY
              </Text>
              <Text style={{ 
                fontSize: 13, 
                color: theme.textSecondary,
                letterSpacing: 0.3
              }}>
                Registered Organizations & Business Entities
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.exportIconButton}
                onPress={exportAllHostCompaniesPDF}
                disabled={exportingAllHostCompanies}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {exportingAllHostCompanies ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={styles.exportIconSmall}>📊</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6
                }}
                onPress={() => {
                  setEditingHostCompany(null);
                  resetHostCompanyForm();
                  setShowHostCompanyModal(true);
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>+</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Register New</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ===== SUMMARY STATS ===== */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 20
        }}>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 10,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary }}>
              {hostCompanies.length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Total Companies
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 10,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#16a34a' }}>
              {hostCompanies.filter(c => c.isActive).length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Active
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 10,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#6366f1' }}>
              {hostCompanies.reduce((sum, c) => sum + (c.internCount || 0), 0)}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Total Staff
            </Text>
          </View>
        </View>

        {/* ===== HOST COMPANIES TABLE ===== */}
        <View style={{
          backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
          borderRadius: 12,
          marginBottom: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border
        }}>
          {/* Table Header */}
          <View style={{
            backgroundColor: theme.primary,
            paddingVertical: 14,
            paddingHorizontal: 16
          }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}>
              REGISTERED HOST COMPANIES
            </Text>
          </View>

          {/* Column Headers */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border
          }}>
            <Text style={{ flex: 2.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Company Name
            </Text>
            <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Registration No.
            </Text>
            <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
              Industry
            </Text>
            <Text style={{ flex: 0.8, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
              Depts
            </Text>
            <Text style={{ flex: 0.8, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
              Staff
            </Text>
            <Text style={{ flex: 0.8, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
              Status
            </Text>
          </View>

          {/* Table Body */}
          {hostCompanies.length === 0 ? (
            <View style={{
              paddingVertical: 60,
              paddingHorizontal: 20,
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#1e293b' : '#fff'
            }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>🏢</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 }}>
                No Host Companies Registered
              </Text>
              <Text style={{ fontSize: 13, color: theme.textTertiary, textAlign: 'center' }}>
                Click "Register New" to add a host company to the system
              </Text>
            </View>
          ) : (
            hostCompanies.map((company, index) => (
              <TouchableOpacity
                key={company._id}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  backgroundColor: index % 2 === 0 
                    ? (isDarkMode ? '#1e293b' : '#fff')
                    : (isDarkMode ? '#243447' : '#f8fafc'),
                  borderBottomWidth: index < hostCompanies.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                  alignItems: 'center'
                }}
                onPress={() => handleViewHostCompanyDetails(company)}
                activeOpacity={0.6}
              >
                {/* Company Name Column */}
                <View style={{ flex: 2.5 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 3 }}>
                    {company.companyName || company.name}
                  </Text>
                  {company.companyName && company.name !== company.companyName && (
                    <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>
                      {company.name}
                    </Text>
                  )}
                  {company.emailAddress && (
                    <Text style={{ fontSize: 10, color: theme.primary }} numberOfLines={1}>
                      ✉️ {company.emailAddress}
                    </Text>
                  )}
                </View>

                {/* Registration Number Column */}
                <Text style={{ 
                  flex: 1.5, 
                  fontSize: 12, 
                  color: theme.textSecondary, 
                  fontFamily: 'monospace'
                }}>
                  {company.registrationNumber || '—'}
                </Text>

                {/* Industry Column */}
                <Text style={{ 
                  flex: 1.2, 
                  fontSize: 11, 
                  color: theme.textSecondary,
                  textAlign: 'center'
                }} numberOfLines={1}>
                  {company.industry || '—'}
                </Text>

                {/* Departments Count Column */}
                <View style={{ flex: 0.8, alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: '#6366f120',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    minWidth: 32
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366f1', textAlign: 'center' }}>
                      {company.departmentCount || 0}
                    </Text>
                  </View>
                </View>

                {/* Staff Count Column */}
                <View style={{ flex: 0.8, alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: '#16a34a20',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    minWidth: 32
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a', textAlign: 'center' }}>
                      {company.internCount || 0}
                    </Text>
                  </View>
                </View>

                {/* Status Column */}
                <View style={{ flex: 0.8, alignItems: 'center' }}>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                    backgroundColor: company.isActive ? '#16a34a20' : '#dc262620'
                  }}>
                    <Text style={{
                      fontSize: 9,
                      fontWeight: '700',
                      color: company.isActive ? '#16a34a' : '#dc2626',
                      textTransform: 'uppercase',
                      letterSpacing: 0.3
                    }}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ===== FOOTER NOTE ===== */}
        <View style={{
          paddingVertical: 16,
          paddingHorizontal: 20,
          backgroundColor: isDarkMode ? '#1a233280' : '#f1f5f9',
          borderRadius: 8,
          marginBottom: 20
        }}>
          <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 }}>
            Select a company from the list above to view full details, departments, staff members, and management options.
          </Text>
        </View>
      </ScrollView>
    );
  };

  // Department management state
  const [departments, setDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showDepartmentInfo, setShowDepartmentInfo] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [departmentDescription, setDepartmentDescription] = useState('');
  const [departmentLocation, setDepartmentLocation] = useState('');
  const [departmentCustomAddress, setDepartmentCustomAddress] = useState('');
  const [useDepartmentCustomAddress, setUseDepartmentCustomAddress] = useState(false);
  const [showDepartmentLocationDropdown, setShowDepartmentLocationDropdown] = useState(false);
  const [departmentLocationSearchQuery, setDepartmentLocationSearchQuery] = useState('');
  const [departmentLocations, setDepartmentLocations] = useState([]);
  const [filteredDepartmentLocations, setFilteredDepartmentLocations] = useState([]);
  const [departmentMentorName, setDepartmentMentorName] = useState('');
  const [savingDepartment, setSavingDepartment] = useState(false);

  useEffect(() => {
    if (activeView === 'departments') {
      loadDepartments();
      loadDepartmentLocations();
    }
  }, [activeView]);

  const loadDepartmentLocations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/locations/all`);
      if (response.data && response.data.locations) {
        setDepartmentLocations(response.data.locations);
        setFilteredDepartmentLocations(response.data.locations);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch locations for department form:', error.message);
    }
  };

  useEffect(() => {
    if (showDepartmentLocationDropdown && departmentLocationSearchQuery) {
      const filtered = departmentLocations.filter(loc =>
        loc.name.toLowerCase().includes(departmentLocationSearchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(departmentLocationSearchQuery.toLowerCase())
      );
      setFilteredDepartmentLocations(filtered);
    } else {
      setFilteredDepartmentLocations(departmentLocations);
    }
  }, [departmentLocationSearchQuery, departmentLocations, showDepartmentLocationDropdown]);

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
                const interns = internsResponse.data.staff.filter(staff => staff.role === 'Intern');
                const internCount = interns.length;
                
                // If we found interns, log it
                if (internCount > 0) {
                  console.log(`✅ Department "${dept.name}": ${internCount} interns found`);
                } else {
                  // Even if backend found none, that's ok - just log for debugging
                  console.log(`⚠️ Department "${dept.name}": ${internCount} interns found`);
                }
                
                return {
                  ...dept,
                  internCount
                };
              } else {
                console.warn(`⚠️ No response from staff API for department "${dept.name}"`);
                return { ...dept, internCount: 0 };
              }
            } catch (error) {
              console.error(`❌ Error loading interns for department "${dept.name}":`, error.message);
              return { ...dept, internCount: 0 };
            }
          })
        );
        setDepartments(departmentsWithCounts);
      }
    } catch (error) {
      console.error('❌ Error loading departments:', error.message);
      Alert.alert('Error', 'Failed to load departments');
    }
  };
  
  const loadDepartmentInterns = async (departmentName) => {
    try {
      setLoadingDepartmentInterns(true);
      // Fetch full staff data by department
      const params = { 
        department: departmentName,
        fullData: true, // Request full data
        ...(isHostCompany && { hostCompanyId })
      };
      const response = await axios.get(`${API_BASE_URL}/staff/admin/staff`, { params });
      if (response.data.success) {
        setDepartmentInterns(response.data.staff);
      }
    } catch (error) {
      console.error('Error loading department interns:', error);
      Alert.alert('Error', 'Failed to load interns');
    } finally {
      setLoadingDepartmentInterns(false);
    }
  };
  
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
  
  const handleViewDepartmentInterns = async (dept) => {
    setSelectedDepartment(dept);
    setShowDepartmentInterns(true);
    await loadDepartmentInterns(dept.name);
  };
  
  const handleViewDepartmentDetails = async (dept) => {
    setSelectedDepartment(dept);
    setShowDepartmentDetails(true);
    // Load interns for this department to display in the modal
    await loadDepartmentInterns(dept.name);
  };
  
  const handleViewHostCompanyDetails = async (company) => {
    setSelectedHostCompany(company);
    setActiveView('hostCompanyDetails');
    await loadHostCompanyDetails(company._id);
  };

  const handleSaveDepartment = async () => {
    if (!departmentName.trim()) {
      Alert.alert('Error', 'Department name is required');
      return;
    }
    
    if (!companyName.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    
    if (!useDepartmentCustomAddress && !departmentLocation) {
      Alert.alert('Error', 'Please select a location from the dropdown or enter a custom address');
      return;
    }
    
    if (useDepartmentCustomAddress && !departmentCustomAddress.trim()) {
      Alert.alert('Error', 'Please enter a custom address');
      return;
    }

    // CRITICAL: Host company users can ONLY create/edit departments for their own company
    if (isHostCompany && editingDepartment && editingDepartment.hostCompanyId !== hostCompanyId) {
      Alert.alert('Error', 'You can only edit departments belonging to your company');
      return;
    }

    try {
      setSavingDepartment(true);
      if (editingDepartment) {
        // Update existing
        const updateData = {
          name: departmentName.trim(),
          departmentCode: departmentCode.trim() || undefined,
          companyName: companyName.trim(),
          description: departmentDescription.trim(),
          mentorName: departmentMentorName.trim() || undefined,
          location: useDepartmentCustomAddress ? undefined : departmentLocation,
          customAddress: useDepartmentCustomAddress ? departmentCustomAddress.trim() : undefined,
          isActive: editingDepartment.isActive
        };
        
        // CRITICAL: Host company users cannot change hostCompanyId
        if (isHostCompany) {
          // Ensure hostCompanyId matches (security check)
          if (editingDepartment.hostCompanyId !== hostCompanyId) {
            throw new Error('You can only edit departments belonging to your company');
          }
        }
        
        await axios.put(`${API_BASE_URL}/staff/admin/departments/${editingDepartment._id}`, updateData);
        Alert.alert('Success', 'Department updated successfully');
      } else {
        // Create new
        const createData = {
          name: departmentName.trim(),
          departmentCode: departmentCode.trim() || undefined,
          companyName: companyName.trim(),
          description: departmentDescription.trim(),
          mentorName: departmentMentorName.trim() || undefined,
          location: useDepartmentCustomAddress ? undefined : departmentLocation,
          customAddress: useDepartmentCustomAddress ? departmentCustomAddress.trim() : undefined,
          // CRITICAL: Auto-set hostCompanyId for host company users
          ...(isHostCompany && { hostCompanyId })
        };
        
        await axios.post(`${API_BASE_URL}/staff/admin/departments`, createData);
        Alert.alert('Success', 'Department created successfully');
      }
      setShowDepartmentModal(false);
      setEditingDepartment(null);
      setDepartmentName('');
      setDepartmentCode('');
      setCompanyName('');
      setDepartmentDescription('');
      setDepartmentMentorName('');
      setDepartmentLocation('');
      setDepartmentCustomAddress('');
      setUseDepartmentCustomAddress(false);
      loadDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save department');
    } finally {
      setSavingDepartment(false);
    }
  };

  const handleEditDepartment = (dept) => {
    // CRITICAL: Host company users can ONLY edit their own company's departments
    if (isHostCompany && dept.hostCompanyId !== hostCompanyId) {
      Alert.alert('Error', 'You can only edit departments belonging to your company');
      return;
    }
    
    setEditingDepartment(dept);
    setDepartmentName(dept.name);
    setDepartmentCode(dept.departmentCode || '');
    // Auto-fill company name (read-only for host company users)
    setCompanyName(isHostCompany ? (userInfo.companyName || userInfo.name || '') : (dept.companyName || ''));
    setDepartmentDescription(dept.description || '');
    setDepartmentMentorName(dept.mentorName || '');
    // Check if location is a custom address (has locationAddress but not in predefined list)
    const isCustom = dept.locationAddress && !departmentLocations.find(l => l.key === dept.location);
    if (isCustom) {
      setUseDepartmentCustomAddress(true);
      setDepartmentCustomAddress(dept.location || '');
      setDepartmentLocation('');
    } else {
      setUseDepartmentCustomAddress(false);
      setDepartmentLocation(dept.location || '');
      setDepartmentCustomAddress('');
    }
    setShowDepartmentModal(true);
  };

  const handleDeleteDepartment = async (dept) => {
    // CRITICAL: Host company users can ONLY delete their own company's departments
    if (isHostCompany && dept.hostCompanyId !== hostCompanyId) {
      Alert.alert('Error', 'You can only delete departments belonging to your company');
      return;
    }
    
    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${dept.name}"? This will only work if no staff members are assigned to this department.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Pass hostCompanyId in query params for backend validation
              const params = isHostCompany ? { hostCompanyId } : {};
              await axios.delete(`${API_BASE_URL}/staff/admin/departments/${dept._id}`, { params });
              Alert.alert('Success', 'Department deleted successfully');
              loadDepartments();
            } catch (error) {
              console.error('Error deleting department:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete department');
            }
          }
        }
      ]
    );
  };

  const renderDepartments = () => {
    return (
      <View style={styles.content}>
        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Department Management</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.exportIconButton}
                onPress={exportAllDepartmentsPDF}
                disabled={exportingAllDepartments}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {exportingAllDepartments ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={styles.exportIconSmall}>📊</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDepartmentInfo(true)}
                style={styles.infoIconButton}
              >
                <Text style={styles.infoIconRed}>ℹ️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.addButton, dynamicStyles.addButton]}
            onPress={() => {
              setEditingDepartment(null);
              setDepartmentName('');
              setDepartmentCode('');
              // Auto-fill company name for host company users
              setCompanyName(isHostCompany ? (userInfo.companyName || userInfo.name || '') : '');
              setDepartmentDescription('');
              setDepartmentLocation('');
              setDepartmentCustomAddress('');
              setUseDepartmentCustomAddress(false);
              setShowDepartmentModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Add Department</Text>
          </TouchableOpacity>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDepartments} />}>
          {departments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No departments found</Text>
              <Text style={[styles.emptyText, dynamicStyles.emptyText, { fontSize: 14, marginTop: 8 }]}>
                Click "Add Department" to create one
              </Text>
            </View>
          ) : (
            departments.map((dept) => (
              <TouchableOpacity
                key={dept._id}
                style={[styles.staffCard, dynamicStyles.staffCard, styles.officialCard]}
                onPress={() => handleViewDepartmentDetails(dept)}
                activeOpacity={0.7}
              >
                <View style={[styles.officialRibbon, { backgroundColor: theme.primary }]}>
                  <View>
                    <Text style={styles.officialRibbonText}>Department Record</Text>
                    <Text style={styles.officialRibbonSubText}>Reference: {dept.departmentCode || 'N/A'}</Text>
                  </View>
                  <Text style={styles.officialRibbonBadge}>{dept.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
                <View style={styles.staffHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={[styles.staffName, dynamicStyles.staffName]}>
                        {dept.name}
                        {dept.departmentCode && (
                          <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { marginLeft: 8 }]}>
                            ({dept.departmentCode})
                          </Text>
                        )}
                      </Text>
                      <View style={[styles.internCountBadge, { backgroundColor: theme.primary + '15' }]}>
                        <Text style={[styles.internCountText, { color: theme.primary }]}>
                          {dept.internCount || 0} {dept.internCount === 1 ? 'Intern' : 'Interns'}
                        </Text>
                      </View>
                    </View>
                    {dept.companyName && (
                      <Text style={[styles.staffDetails, dynamicStyles.staffDetails]}>
                        Company: {dept.companyName}
                      </Text>
                    )}
                    {dept.location && (
                      <Text style={[styles.staffDetails, dynamicStyles.staffDetails]}>
                        Location: {dept.location}
                      </Text>
                    )}
                    {dept.description && (
                      <Text style={[styles.staffDetails, dynamicStyles.staffDetails]}>{dept.description}</Text>
                    )}
                    <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { marginTop: 4 }]}>
                      Status: {dept.isActive ? 'Active' : 'Inactive'}
                    </Text>
                    <Text style={[styles.clickHint, dynamicStyles.clickHint, { marginTop: 8 }]}>
                      Tap to view interns →
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.exportIconButton}
                      onPress={async (e) => {
                        e.stopPropagation();
                        await exportDepartmentPDF(dept);
                      }}
                      disabled={exportingDepartment}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {exportingDepartment ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Text style={styles.exportIconSmall}>📄</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, dynamicStyles.editButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditDepartment(dept);
                      }}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteButton, dynamicStyles.deleteButton]}
                      onPress={async (e) => {
                        e.stopPropagation();
                        try {
                          // Pass hostCompanyId in query params for backend validation
                          const params = isHostCompany ? { hostCompanyId } : {};
                          await axios.delete(`${API_BASE_URL}/staff/admin/departments/${dept._id}`, { params });
                          Alert.alert('Success', 'Department deleted successfully');
                          loadDepartments();
                        } catch (error) {
                          console.error('Error deleting department:', error);
                          Alert.alert('Error', error.response?.data?.error || 'Failed to delete department');
                        }
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Department Modal */}
        <Modal
          visible={showDepartmentModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowDepartmentModal(false);
            setEditingDepartment(null);
            setDepartmentName('');
            setDepartmentDescription('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.modalContent, styles.officialCard]}>
              <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
                <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                  {editingDepartment ? 'Edit Department' : 'Add Department'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDepartmentModal(false);
                    setEditingDepartment(null);
                    setDepartmentName('');
                    setDepartmentCode('');
                    setCompanyName('');
                    setDepartmentDescription('');
                    setDepartmentLocation('');
                    setDepartmentCustomAddress('');
                    setUseDepartmentCustomAddress(false);
                  }}
                >
                  <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.officialRibbon, { backgroundColor: theme.primary, marginBottom: 10 }]}>
                <View>
                  <Text style={styles.officialRibbonText}>Official Department Form</Text>
                  <Text style={styles.officialRibbonSubText}>Please capture accurate details</Text>
                </View>
                <Text style={styles.officialRibbonBadge}>{editingDepartment ? 'Update' : 'New'}</Text>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Info Tooltip */}
                <View style={styles.infoTooltipContainer}>
                  <TouchableOpacity
                    onPress={() => setShowDepartmentInfo(true)}
                    style={styles.infoIconContainer}
                  >
                    <Text style={styles.infoIconRed}>ℹ️</Text>
                  </TouchableOpacity>
                  <Text style={[styles.infoTooltipText, dynamicStyles.infoTooltipText]}>
                    Why add departments? During staff registration, the system needs to know which department each staff member belongs to for accurate clock-in/break reports and operational tracking.
                  </Text>
                </View>

                <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Department Name *</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={departmentName}
                  onChangeText={setDepartmentName}
                  placeholder="Enter department name"
                  placeholderTextColor={theme.textTertiary}
                />

                <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Department Code</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={departmentCode}
                  onChangeText={setDepartmentCode}
                  placeholder="Enter department code (optional)"
                  placeholderTextColor={theme.textTertiary}
                />

                <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Company Name *</Text>
                {isHostCompany ? (
                  // Host company users see their company name (read-only)
                  <View style={[styles.modalInput, dynamicStyles.modalInput, styles.modalInputDisabled, dynamicStyles.modalInputDisabled]}>
                    <Text style={[dynamicStyles.modalInput, { color: theme.text }]}>
                      {userInfo.companyName || userInfo.name || 'Your Company'}
                    </Text>
                    <Text style={[styles.hint, dynamicStyles.hint, { marginTop: 4, fontSize: 12 }]}>
                      (Your Company - Cannot be changed)
                    </Text>
                  </View>
                ) : (
                  // Admin can enter any company name
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Enter company name"
                    placeholderTextColor={theme.textTertiary}
                  />
                )}

                <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Description</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                  value={departmentDescription}
                  onChangeText={setDepartmentDescription}
                  placeholder="Enter description (optional)"
                  placeholderTextColor={theme.textTertiary}
                  multiline
                />

                <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Mentor Name</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.modalInput]}
                  value={departmentMentorName}
                  onChangeText={setDepartmentMentorName}
                  placeholder="Enter mentor name for this department (optional)"
                  placeholderTextColor={theme.textTertiary}
                />

                <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Department Location *</Text>
                
                {/* Location Type Dropdown - Compact */}
                <View style={styles.locationTypeContainer}>
                  <Text style={[styles.locationTypeLabel, dynamicStyles.modalLabel]}>Location Type:</Text>
                  <TouchableOpacity
                    style={[styles.locationTypeDropdown, dynamicStyles.dropdownButton]}
                    onPress={() => {
                      // Toggle between predefined and custom
                      setUseDepartmentCustomAddress(!useDepartmentCustomAddress);
                      if (!useDepartmentCustomAddress) {
                        setDepartmentLocation('');
                      } else {
                        setDepartmentCustomAddress('');
                      }
                    }}
                  >
                    <Text style={[styles.locationTypeText, dynamicStyles.dropdownButtonText]}>
                      {useDepartmentCustomAddress ? 'Custom Address' : 'Select from List'}
                    </Text>
                    <Text style={[styles.dropdownArrow, dynamicStyles.dropdownArrow]}>▼</Text>
                  </TouchableOpacity>
                </View>

                {!useDepartmentCustomAddress ? (
                  <TouchableOpacity
                    style={[styles.dropdownButton, dynamicStyles.dropdownButton]}
                    onPress={() => setShowDepartmentLocationDropdown(true)}
                  >
                    <Text style={[
                      styles.dropdownButtonText,
                      dynamicStyles.dropdownButtonText,
                      !departmentLocation && styles.dropdownButtonPlaceholder
                    ]}>
                      {departmentLocation 
                        ? departmentLocations.find(l => l.key === departmentLocation)?.name || departmentLocation
                        : 'Select Location *'}
                    </Text>
                    <Text style={[styles.dropdownArrow, dynamicStyles.dropdownArrow]}>▼</Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    value={departmentCustomAddress}
                    onChangeText={setDepartmentCustomAddress}
                    placeholder="Enter custom address (will be geocoded to coordinates)"
                    placeholderTextColor={theme.textTertiary}
                  />
                )}

                {/* Location Dropdown Modal */}
                <Modal
                  visible={showDepartmentLocationDropdown}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setShowDepartmentLocationDropdown(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, dynamicStyles.modalContent, { maxHeight: '80%' }]}>
                      <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
                        <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Location</Text>
                        <TouchableOpacity onPress={() => setShowDepartmentLocationDropdown(false)}>
                          <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.modalInput, dynamicStyles.modalInput, { margin: 16 }]}
                        placeholder="Search locations..."
                        placeholderTextColor={theme.textTertiary}
                        value={departmentLocationSearchQuery}
                        onChangeText={setDepartmentLocationSearchQuery}
                      />
                      <ScrollView style={styles.dropdownList}>
                        {filteredDepartmentLocations.length === 0 ? (
                          <View style={styles.dropdownItem}>
                            <Text style={[styles.dropdownItemText, dynamicStyles.dropdownItemText]}>
                              No locations found
                            </Text>
                          </View>
                        ) : (
                          filteredDepartmentLocations.map((loc) => (
                            <TouchableOpacity
                              key={loc.key}
                              style={[
                                styles.dropdownItem,
                                dynamicStyles.dropdownItem,
                                departmentLocation === loc.key && [styles.dropdownItemSelected, dynamicStyles.dropdownItemSelected],
                              ]}
                              onPress={() => {
                                setDepartmentLocation(loc.key);
                                setShowDepartmentLocationDropdown(false);
                                setDepartmentLocationSearchQuery('');
                              }}
                            >
                              <View style={styles.dropdownItemContent}>
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    dynamicStyles.dropdownItemText,
                                    departmentLocation === loc.key && [styles.dropdownItemTextSelected, dynamicStyles.dropdownItemTextSelected],
                                  ]}
                                >
                                  {loc.name}
                                </Text>
                                <Text
                                  style={[
                                    styles.dropdownItemAddress,
                                    dynamicStyles.dropdownItemAddress,
                                    departmentLocation === loc.key && [styles.dropdownItemAddressSelected, dynamicStyles.dropdownItemAddressSelected],
                                  ]}
                                >
                                  {loc.address}
                                </Text>
                              </View>
                              {departmentLocation === loc.key && (
                                <Text style={[styles.checkmark, dynamicStyles.checkmark]}>✓</Text>
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>

                {editingDepartment && (
                  <View style={styles.toggleContainer}>
                    <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Status</Text>
                    <View style={styles.toggleButtons}>
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          editingDepartment.isActive && styles.toggleButtonActive
                        ]}
                        onPress={() => setEditingDepartment({ ...editingDepartment, isActive: true })}
                      >
                        <Text style={[
                          styles.toggleButtonText,
                          editingDepartment.isActive && styles.toggleButtonTextActive
                        ]}>
                          Active
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          !editingDepartment.isActive && styles.toggleButtonActive
                        ]}
                        onPress={() => setEditingDepartment({ ...editingDepartment, isActive: false })}
                      >
                        <Text style={[
                          styles.toggleButtonText,
                          !editingDepartment.isActive && styles.toggleButtonTextActive
                        ]}>
                          Inactive
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalSaveButton, dynamicStyles.modalSaveButton]}
                  onPress={handleSaveDepartment}
                  disabled={savingDepartment || !departmentName.trim() || !companyName.trim() || (!departmentLocation && !departmentCustomAddress.trim())}
                >
                  {savingDepartment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>
                      {editingDepartment ? 'Update Department' : 'Create Department'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Department Info Modal */}
        <Modal
          visible={showDepartmentInfo}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDepartmentInfo(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.modalContent, { maxWidth: '90%' }]}>
              <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.infoIconRed}>ℹ️</Text>
                  <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Why Add Departments?</Text>
                </View>
                <TouchableOpacity onPress={() => setShowDepartmentInfo(false)}>
                  <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <Text style={[styles.infoText, dynamicStyles.infoText, { lineHeight: 24, marginBottom: 16 }]}>
                  Departments are essential for accurate staff management and reporting in the clock-in system.
                </Text>
                <Text style={[styles.infoText, dynamicStyles.infoText, { lineHeight: 24, marginBottom: 12, fontWeight: '600' }]}>
                  Key Benefits:
                </Text>
                <View style={styles.benefitList}>
                  <Text style={[styles.benefitItem, dynamicStyles.infoText]}>
                    • <Text style={{ fontWeight: '600' }}>Accurate Reporting:</Text> Generate clock-in, break, and attendance reports filtered by department
                  </Text>
                  <Text style={[styles.benefitItem, dynamicStyles.infoText]}>
                    • <Text style={{ fontWeight: '600' }}>Staff Organization:</Text> During registration, staff must select their department for proper categorization
                  </Text>
                  <Text style={[styles.benefitItem, dynamicStyles.infoText]}>
                    • <Text style={{ fontWeight: '600' }}>Operational Tracking:</Text> Monitor attendance patterns and clock-in behavior by department
                  </Text>
                  <Text style={[styles.benefitItem, dynamicStyles.infoText]}>
                    • <Text style={{ fontWeight: '600' }}>Location Management:</Text> Each department has a location for GPS validation and location-based reporting
                  </Text>
                </View>
                <Text style={[styles.infoText, dynamicStyles.infoText, { lineHeight: 24, marginTop: 16, fontStyle: 'italic', opacity: 0.8 }]}>
                  Note: Staff members must be assigned to a department during registration for the system to function properly.
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
                onPress={() => setShowDepartmentInfo(false)}
              >
                <Text style={[styles.modalCloseText, dynamicStyles.modalCloseText]}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderSettings = () => {
    return (
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.dashboardContainer}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Settings</Text>
          <View style={[styles.infoCard, dynamicStyles.infoCard]}>
            <Text style={[styles.infoText, dynamicStyles.infoText]}>
              Settings feature coming soon. Configure system preferences here.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderNotAccountable = () => {
    // Filter only late clock-ins (not early ones) - based on host company assigned time
    const lateOnlyItems = notAccountable.filter(item => {
      // Only include items that have clockInTime and expectedClockIn (late clock-ins)
      if (item.clockInTime && item.expectedClockIn) {
        // Parse times to compare
        const actualTime = item.clockInTime;
        const expectedTime = item.expectedClockIn;
        
        // Convert to minutes for comparison
        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          const parts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (!parts) return null;
          let hours = parseInt(parts[1]);
          const minutes = parseInt(parts[2]);
          const ampm = parts[3].toUpperCase();
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };
        
        const actualMinutes = parseTime(actualTime);
        const expectedMinutes = parseTime(expectedTime);
        
        // Only include if actual time is LATER than expected (late arrival)
        if (actualMinutes && expectedMinutes) {
          return actualMinutes > expectedMinutes;
        }
      }
      // Include items with other reasons (no clock-in, etc.)
      return !item.clockInTime || !item.expectedClockIn;
    });

    // Group items by person and count violations
    const groupedByPerson = lateOnlyItems.reduce((acc, item) => {
      const key = item.staffId || item.staffName;
      if (!acc[key]) {
        acc[key] = {
          staffId: item.staffId,
          staffName: item.staffName,
          items: [],
          violations: []
        };
      }
      acc[key].items.push(item);
      
      // Collect violations (only late clock-ins)
      if (item.clockInTime && item.expectedClockIn) {
        acc[key].violations.push({
          type: 'LATE CLOCK-IN',
          actual: item.clockInTime,
          expected: item.expectedClockIn
        });
      }
      
      return acc;
    }, {});

    const groupedList = Object.values(groupedByPerson);

    return (
      <View style={styles.content}>
        {/* Official Header */}
        <View style={{
          backgroundColor: theme.primary,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 20,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: theme.primaryDark,
        }}>
          <Text style={{
            fontSize: 22,
            fontWeight: '800',
            color: '#fff',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Not Accountable Staff & Interns
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#fff',
            opacity: 0.9,
            letterSpacing: 0.5,
          }}>
            Late Clock-In Violations & Accountability Issues
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={{
          flexDirection: 'row',
          gap: 12,
          marginBottom: 20,
          paddingHorizontal: 4,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: '#dc2626',
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#dc2626' }}>
              {groupedList.length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Violations
            </Text>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: isDarkMode ? '#1a2332' : '#fff',
            borderRadius: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: '#eab308',
          }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#eab308' }}>
              {lateOnlyItems.filter(item => item.clockInTime && item.expectedClockIn).length}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', marginTop: 4 }}>
              Late Clock-Ins
            </Text>
          </View>
        </View>

        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <TextInput
            style={[styles.dateInput, dynamicStyles.dateInput]}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {groupedList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>All staff are accountable</Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
              borderRadius: 12,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border,
            }}>
              {/* Table Header */}
              <View style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}>
                  LATE ARRIVAL VIOLATIONS
                </Text>
              </View>

              {/* Column Headers */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: isDarkMode ? '#243447' : '#e2e8f0',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: theme.primary,
              }}>
                <Text style={{ flex: 2.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Staff Member
                </Text>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Violation Details
                </Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Expected Time
                </Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Actual Time
                </Text>
              </View>

              {/* Violation Items */}
              {groupedList.map((person, index) => (
                <TouchableOpacity
                  key={person.staffId || person.staffName || index}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    backgroundColor: index % 2 === 0 
                      ? (isDarkMode ? '#1e293b' : '#fff')
                      : (isDarkMode ? '#243447' : '#f8fafc'),
                    borderBottomWidth: index < groupedList.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                    alignItems: 'center',
                  }}
                  onPress={() => handleViewDayDetails(person.staffId || person.staffName, selectedDate)}
                  activeOpacity={0.6}
                >
                  {/* Staff Name Column */}
                  <View style={{ flex: 2.5 }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: theme.text,
                      marginBottom: 3,
                    }}>
                      {person.staffName}
                    </Text>
                    {person.violations.length > 0 && (
                      <Text style={{
                        fontSize: 10,
                        color: '#dc2626',
                        fontWeight: '600',
                      }}>
                        {person.violations.length} {person.violations.length === 1 ? 'violation' : 'violations'}
                      </Text>
                    )}
                  </View>

                  {/* Violation Details Column */}
                  <View style={{ flex: 2 }}>
                    {person.violations.length > 0 ? (
                      person.violations.map((violation, vIndex) => (
                        <Text key={vIndex} style={{
                          fontSize: 11,
                          color: '#dc2626',
                          fontWeight: '600',
                          marginBottom: 4,
                        }}>
                          {violation.type}
                        </Text>
                      ))
                    ) : (
                      <Text style={{
                        fontSize: 11,
                        color: theme.textSecondary,
                        fontStyle: 'italic',
                      }}>
                        {person.items[0]?.reason || 'No clock-in recorded'}
                      </Text>
                    )}
                  </View>

                  {/* Expected Time Column */}
                  <Text style={{
                    flex: 1.5,
                    fontSize: 11,
                    color: theme.textSecondary,
                    fontFamily: 'monospace',
                  }}>
                    {person.violations[0]?.expected || person.items[0]?.expectedClockIn || '—'}
                  </Text>

                  {/* Actual Time Column */}
                  <Text style={{
                    flex: 1.5,
                    fontSize: 11,
                    color: '#dc2626',
                    fontFamily: 'monospace',
                    fontWeight: '600',
                  }}>
                    {person.violations[0]?.actual || person.items[0]?.clockInTime || '—'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={styles.menuButton}
        >
          <Text style={[styles.menuIcon, dynamicStyles.menuIcon]}>
            {sidebarCollapsed ? '☰' : '✕'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]} numberOfLines={1}>
          Internship Success Clock-In Management System
        </Text>
        <View style={styles.headerRight}>
          {/* Export Dashboard Button */}
          <TouchableOpacity
            onPress={async () => {
              try {
                const result = await generateDashboardPDF({
                  totalStaff: stats.totalStaff || 0,
                  clockInsToday: stats.clockInsToday || 0,
                  currentlyIn: stats.currentlyIn || 0,
                  lateArrivals: stats.lateArrivals || 0,
                  pendingLeaveCount: pendingLeaveCount || 0,
                  pendingCorrectionsCount: pendingCorrectionsCount || 0,
                  reportsGeneratedCount: reportsGeneratedCount || 0,
                  lateArrivalsList: stats.lateArrivalsList || [],
                }, userInfo.name || 'Admin');
                
                if (result.success) {
                  Alert.alert('✅ Success', 'Dashboard exported as PDF successfully!');
                } else {
                  Alert.alert('❌ Error', 'Failed to export dashboard: ' + result.error);
                }
              } catch (error) {
                console.error('Error exporting dashboard:', error);
                Alert.alert('Error', 'Failed to export dashboard');
              }
            }}
            style={styles.exportButton}
          >
            <Text style={styles.exportIcon}>📄</Text>
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            onPress={() => {
              // Open Recents view when bell is tapped
              setActiveView('recents');
              setSidebarCollapsed(true);
            }}
            style={styles.notificationButton}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {(pendingLeaveCount + pendingCorrectionsCount) > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {pendingLeaveCount + pendingCorrectionsCount > 99 ? '99+' : pendingLeaveCount + pendingCorrectionsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Avatar with Dropdown */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              onPress={() => setShowAvatarDropdown(!showAvatarDropdown)}
              style={styles.avatarButton}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(userInfo.name || userInfo.fullName || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* Dropdown Menu */}
            {showAvatarDropdown && (
              <View style={[styles.avatarDropdown, dynamicStyles.avatarDropdown]}>
                <View style={styles.avatarDropdownHeader}>
                  <Text style={[styles.avatarDropdownName, dynamicStyles.avatarDropdownName]}>
                    {userInfo.name || userInfo.fullName || 'Admin'}
                  </Text>
                  <Text style={[styles.avatarDropdownEmail, dynamicStyles.avatarDropdownEmail]}>
                    {userInfo.email || userInfo.emailAddress || 'admin@system.com'}
                  </Text>
                </View>
                <View style={styles.avatarDropdownDivider} />
                <TouchableOpacity
                  style={styles.avatarDropdownItem}
                  onPress={() => {
                    setShowAvatarDropdown(false);
                    navigation.goBack();
                  }}
                >
                  <Text style={styles.avatarDropdownIcon}>🚪</Text>
                  <Text style={[styles.avatarDropdownItemText, dynamicStyles.avatarDropdownItemText]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {/* Overlay to close dropdown when clicking outside */}
      {showAvatarDropdown && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarDropdown(false)}
        />
      )}

      <View style={styles.mainContent}>
        {/* Sidebar */}
        {!sidebarCollapsed && (
          <View style={[styles.sidebar, dynamicStyles.sidebar]}>
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'dashboard' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('dashboard');
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="dashboard" 
                size={20} 
                color={activeView === 'dashboard' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'dashboard' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'staff' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('staff');
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="people" 
                size={20} 
                color={activeView === 'staff' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'staff' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                View Staff
              </Text>
            </TouchableOpacity>

            {/* Register Staff - Available for all users */}
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem
              ]}
              onPress={() => {
                navigation.navigate('RegisterStaff', { userInfo });
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="person-add" 
                size={20} 
                color={theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText
              ]}>
                Register Staff
              </Text>
            </TouchableOpacity>

            {/* Recents - Recent activities / notifications */}
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'recents' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('recents');
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons
                name="history"
                size={20}
                color={activeView === 'recents' ? '#fff' : theme.text}
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'recents' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Recents
              </Text>
              {unreadCount > 0 && (
                <View style={{ marginLeft: 'auto', backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'notAccountable' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('notAccountable');
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="warning" 
                size={20} 
                color={activeView === 'notAccountable' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'notAccountable' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Not Accountable
              </Text>
            </TouchableOpacity>

            {/* Departments - Available for both admin and host company users */}
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'departments' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('departments');
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="business" 
                size={20} 
                color={activeView === 'departments' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'departments' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Departments
              </Text>
            </TouchableOpacity>

            {/* Leave Applications - Available for both admin and host company users */}
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'leaveApplications' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('leaveApplications');
                setLeaveNotificationViewed(true);
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="event-note" 
                size={20} 
                color={activeView === 'leaveApplications' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'leaveApplications' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Leave Applications
              </Text>
              {pendingLeaveCount > 0 && !leaveNotificationViewed && (
                <View style={{ marginLeft: 'auto', backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>NEW</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Attendance Corrections - Available for both admin and host company users */}
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'attendanceCorrections' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('attendanceCorrections');
                setCorrectionsNotificationViewed(true);
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="schedule" 
                size={20} 
                color={activeView === 'attendanceCorrections' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'attendanceCorrections' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Attendance Corrections
              </Text>
              {pendingCorrectionsCount > 0 && !correctionsNotificationViewed && (
                <View style={{ marginLeft: 'auto', backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>NEW</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Reports - Available for both admin and host company users */}
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'reports' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('reports');
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="bar-chart" 
                size={20} 
                color={activeView === 'reports' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'reports' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Reports
              </Text>
            </TouchableOpacity>

            {/* Devices - Available for both admin and host company users */}
            <TouchableOpacity
              style={[
                styles.sidebarItem,
                dynamicStyles.sidebarItem,
                activeView === 'devices' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
              ]}
              onPress={() => {
                setActiveView('devices');
                setSidebarCollapsed(true);
              }}
            >
              <MaterialIcons 
                name="smartphone" 
                size={20} 
                color={activeView === 'devices' ? '#fff' : theme.text} 
                style={{ marginRight: 12 }}
              />
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'devices' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                Devices
              </Text>
              {devices.filter(d => d.status === 'pending').length > 0 && (
                <View style={{ marginLeft: 'auto', backgroundColor: '#FF9800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {devices.filter(d => d.status === 'pending').length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Admin-only menu items */}
            {isAdmin && (
              <>
                <TouchableOpacity
                  style={[
                    styles.sidebarItem,
                    dynamicStyles.sidebarItem,
                    activeView === 'hostCompanies' && [styles.sidebarItemActive, dynamicStyles.sidebarItemActive]
                  ]}
                  onPress={() => {
                    setActiveView('hostCompanies');
                    setSidebarCollapsed(true);
                  }}
                >
                  <MaterialIcons 
                    name="apartment" 
                    size={20} 
                    color={activeView === 'hostCompanies' ? '#fff' : theme.text} 
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[
                    styles.sidebarItemText,
                    dynamicStyles.sidebarItemText,
                    activeView === 'hostCompanies' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
                  ]}>
                    Host Companies
                  </Text>
                </TouchableOpacity>

              </>
            )}
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading...</Text>
            </View>
          ) : (
            <>
              {activeView === 'dashboard' && renderDashboard()}
              {activeView === 'staff' && renderStaff()}
              {activeView === 'notAccountable' && renderNotAccountable()}
              {activeView === 'hostCompanies' && renderHostCompanies()}
              {activeView === 'hostCompanyDetails' && renderHostCompanyDetails()}
              {activeView === 'departments' && renderDepartments()}
              {activeView === 'leaveApplications' && renderLeaveApplications()}
              {activeView === 'attendanceCorrections' && renderAttendanceCorrections()}
              {activeView === 'reports' && renderReports()}
              {activeView === 'recents' && <Recents navigation={navigation} route={{ params: { userInfo } }} onBack={() => setActiveView('dashboard')} />}
              {activeView === 'devices' && renderDevices()}
            </>
          )}
        </View>
      </View>

      {/* Host Company Modal - Root level so it works from any view */}
      <Modal
        visible={showHostCompanyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowHostCompanyModal(false);
          setEditingHostCompany(null);
          resetHostCompanyForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                {editingHostCompany ? 'Edit Host Company' : 'Add Host Company'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowHostCompanyModal(false);
                  setEditingHostCompany(null);
                  resetHostCompanyForm();
                }}
              >
                <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Info Tooltip */}
              <View style={styles.infoTooltipContainer}>
                <TouchableOpacity
                  onPress={() => setShowHostCompanyInfo(true)}
                  style={styles.infoIconContainer}
                >
                  <Text style={styles.infoIconRed}>ℹ️</Text>
                </TouchableOpacity>
                <Text style={[styles.infoTooltipText, dynamicStyles.infoTooltipText]}>
                  Why create a host company profile? The host company HR/Admin will use the username and password you create here to login to this system and monitor their staff/interns. This creates their login credentials.
                </Text>
              </View>

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Name *</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyName}
                onChangeText={setHostCompanyName}
                placeholder="Enter company name"
                placeholderTextColor={theme.textTertiary}
              />

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Company Name *</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyCompanyName}
                onChangeText={setHostCompanyCompanyName}
                placeholder="Enter full company name"
                placeholderTextColor={theme.textTertiary}
              />

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Registration Number / Company Number</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyRegistrationNumber}
                onChangeText={setHostCompanyRegistrationNumber}
                placeholder="Enter registration/company number (optional)"
                placeholderTextColor={theme.textTertiary}
              />

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Operating Hours</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyOperatingHours}
                onChangeText={setHostCompanyOperatingHours}
                placeholder="e.g., Mon-Fri: 8:00 AM - 5:00 PM (optional)"
                placeholderTextColor={theme.textTertiary}
              />

              {/* ⏰ DEFAULT WORKING HOURS: For host company (weekdays only) */}
              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>
                Default Working Hours (Optional) ⏰
              </Text>
              <Text style={[styles.helperText, dynamicStyles.helperText, { marginBottom: 8 }]}>
                These will be used as default for staff who don't have individual hours assigned. Format: HH:MM (24-hour, e.g., "07:30").
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helperText, dynamicStyles.helperText, { marginBottom: 4, fontSize: 12 }]}>Clock In</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    placeholder="07:30"
                    value={hostCompanyDefaultClockInTime}
                    onChangeText={setHostCompanyDefaultClockInTime}
                    placeholderTextColor={theme.textTertiary}
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helperText, dynamicStyles.helperText, { marginBottom: 4, fontSize: 12 }]}>Clock Out</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    placeholder="16:30"
                    value={hostCompanyDefaultClockOutTime}
                    onChangeText={setHostCompanyDefaultClockOutTime}
                    placeholderTextColor={theme.textTertiary}
                    maxLength={5}
                  />
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helperText, dynamicStyles.helperText, { marginBottom: 4, fontSize: 12 }]}>Break Start</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    placeholder="13:00"
                    value={hostCompanyDefaultBreakStartTime}
                    onChangeText={setHostCompanyDefaultBreakStartTime}
                    placeholderTextColor={theme.textTertiary}
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helperText, dynamicStyles.helperText, { marginBottom: 4, fontSize: 12 }]}>Break End</Text>
                  <TextInput
                    style={[styles.modalInput, dynamicStyles.modalInput]}
                    placeholder="14:00"
                    value={hostCompanyDefaultBreakEndTime}
                    onChangeText={setHostCompanyDefaultBreakEndTime}
                    placeholderTextColor={theme.textTertiary}
                    maxLength={5}
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Email Address</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyEmail}
                onChangeText={setHostCompanyEmail}
                placeholder="Enter email address (optional)"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Type of Business</Text>
              <TouchableOpacity
                style={[styles.dropdownButton, dynamicStyles.dropdownButton]}
                onPress={() => {
                  Alert.alert(
                    'Select Business Type',
                    '',
                    businessTypes.map(type => ({
                      text: type,
                      onPress: () => setHostCompanyBusinessType(type)
                    })).concat([{ text: 'Cancel', style: 'cancel' }])
                  );
                }}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  dynamicStyles.dropdownButtonText,
                  !hostCompanyBusinessType && styles.dropdownButtonPlaceholder
                ]}>
                  {hostCompanyBusinessType || 'Select business type (optional)'}
                </Text>
                <Text style={[styles.dropdownArrow, dynamicStyles.dropdownArrow]}>▼</Text>
              </TouchableOpacity>

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Industry / Sector</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyIndustry}
                onChangeText={setHostCompanyIndustry}
                placeholder="e.g., Construction, IT, Manufacturing (optional)"
                placeholderTextColor={theme.textTertiary}
              />

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Mentor Name</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyMentorName}
                onChangeText={setHostCompanyMentorName}
                placeholder="Enter mentor name for staff/interns (optional)"
                placeholderTextColor={theme.textTertiary}
              />

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Username *</Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyUsername}
                onChangeText={setHostCompanyUsername}
                placeholder="Enter username for host company login"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                editable={!editingHostCompany} // Username cannot be changed after creation
              />
              {editingHostCompany && (
                <Text style={[styles.helperText, dynamicStyles.helperText]}>
                  Username cannot be changed after creation
                </Text>
              )}

              <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>
                Password {editingHostCompany ? '(leave blank to keep current)' : '*'}
              </Text>
              <TextInput
                style={[styles.modalInput, dynamicStyles.modalInput]}
                value={hostCompanyPassword}
                onChangeText={setHostCompanyPassword}
                placeholder={editingHostCompany ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
              />
              {!editingHostCompany && (
                <Text style={[styles.helperText, dynamicStyles.helperText]}>
                  Minimum 6 characters. This will be used by the host company HR/Admin to login.
                </Text>
              )}

              {editingHostCompany && (
                <View style={styles.toggleContainer}>
                  <Text style={[styles.modalLabel, dynamicStyles.modalLabel]}>Status</Text>
                  <View style={styles.toggleButtons}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        editingHostCompany.isActive && styles.toggleButtonActive
                      ]}
                      onPress={() => setEditingHostCompany({ ...editingHostCompany, isActive: true })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        editingHostCompany.isActive && styles.toggleButtonTextActive
                      ]}>
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        !editingHostCompany.isActive && styles.toggleButtonActive
                      ]}
                      onPress={() => setEditingHostCompany({ ...editingHostCompany, isActive: false })}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        !editingHostCompany.isActive && styles.toggleButtonTextActive
                      ]}>
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalSaveButton, dynamicStyles.modalSaveButton]}
                onPress={handleSaveHostCompany}
                disabled={
                  savingHostCompany || 
                  !hostCompanyName.trim() || 
                  !hostCompanyCompanyName.trim() ||
                  (!editingHostCompany && (!hostCompanyUsername.trim() || !hostCompanyPassword || hostCompanyPassword.length < 6))
                }
              >
                {savingHostCompany ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>
                    {editingHostCompany ? 'Update Host Company' : 'Create Host Company'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Host Company Info Modal */}
      <Modal
        visible={showHostCompanyInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHostCompanyInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent, { maxWidth: '90%', maxHeight: '70%' }]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>About Host Company Profiles</Text>
              <TouchableOpacity onPress={() => setShowHostCompanyInfo(false)}>
                <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.infoModalText, dynamicStyles.infoModalText]}>
                <Text style={{ fontWeight: 'bold' }}>Why create a host company profile?</Text>
                {'\n\n'}
                When you create a host company profile, you are setting up login credentials for the host company's HR/Admin team. They will use the username and password you create here to:
                {'\n\n'}
                • Login to the system at their end
                {'\n'}
                • Monitor their staff and interns
                {'\n'}
                • View clock-in/out reports for their company
                {'\n'}
                • Manage their departments and staff
                {'\n\n'}
                <Text style={{ fontWeight: 'bold' }}>Important:</Text>
                {'\n'}
                • Username and password are required when creating a new host company
                {'\n'}
                • Username cannot be changed after creation
                {'\n'}
                • Password can be updated later if needed
                {'\n'}
                • Share these credentials securely with the host company HR/Admin
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowHostCompanyInfo(false)}
            >
              <Text style={[styles.modalCloseText, dynamicStyles.modalCloseText]}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Year</Text>
            
            <ScrollView style={styles.monthPicker}>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.monthOption,
                      dynamicStyles.monthOption,
                      selectedYear === year && [styles.monthOptionSelected, dynamicStyles.monthOptionSelected]
                    ]}
                    onPress={() => {
                      setSelectedYear(year);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.monthOptionText,
                      dynamicStyles.monthOptionText,
                      selectedYear === year && [styles.monthOptionTextSelected, dynamicStyles.monthOptionTextSelected]
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowYearPicker(false)}
            >
              <Text style={[styles.modalCloseText, dynamicStyles.modalCloseText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Day Details Modal - Government Style */}
      <Modal
        visible={showDayDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDayDetails(false);
          setSelectedDayDetails(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dayDetailsModal, dynamicStyles.modalContent, { maxHeight: '90%' }]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <View style={{
                flex: 1,
                borderBottomWidth: 2,
                borderBottomColor: theme.primary,
                paddingBottom: 12,
              }}>
                <Text style={[styles.modalTitle, dynamicStyles.modalTitle, {
                  fontSize: 20,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }]}>
                  Attendance Details
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  marginTop: 4,
                  letterSpacing: 0.3,
                }}>
                  Official Record
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowDayDetails(false);
                  setSelectedDayDetails(null);
                }}
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDayDetails ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading details...</Text>
              </View>
            ) : selectedDayDetails ? (
              <ScrollView style={styles.dayDetailsContent}>
                {/* Staff Information Section */}
                <View style={{
                  backgroundColor: isDarkMode ? '#1a2332' : '#f8fafc',
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: theme.primary,
                }}>
                  <Text style={[styles.dayDetailsStaffName, dynamicStyles.dayDetailsStaffName, {
                    fontSize: 18,
                    fontWeight: '800',
                    marginBottom: 8,
                  }]}>
                    {selectedDayDetails.staff?.name}
                  </Text>
                  {selectedDayDetails.staff?.mentorName && (
                    <Text style={[styles.dayDetailsDate, dynamicStyles.dayDetailsDate, {
                      fontSize: 12,
                      color: theme.textSecondary,
                      marginBottom: 8,
                    }]}>
                      Mentor: {selectedDayDetails.staff.mentorName}
                    </Text>
                  )}
                  <Text style={[styles.dayDetailsDate, dynamicStyles.dayDetailsDate, {
                    fontSize: 14,
                    color: theme.textSecondary,
                    fontFamily: 'monospace',
                  }]}>
                    {new Date(selectedDayDetails.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>

                {/* Summary Section - Government Table Style */}
                <View style={{
                  backgroundColor: isDarkMode ? '#1a2332' : '#fff',
                  borderRadius: 8,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                  }}>
                    <Text style={{
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}>
                      Attendance Summary
                    </Text>
                  </View>
                  <View style={styles.summaryGrid}>
                    <View style={[styles.summaryItem, dynamicStyles.summaryItem, {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      borderRightWidth: 1,
                      borderRightColor: theme.border,
                    }]}>
                      <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Clock-In</Text>
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue, {
                        fontFamily: 'monospace',
                        fontSize: 16,
                      }]}>
                        {selectedDayDetails.summary?.clockIn
                          ? new Date(selectedDayDetails.summary.clockIn.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Not recorded'}
                      </Text>
                    </View>
                    <View style={[styles.summaryItem, dynamicStyles.summaryItem, {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }]}>
                      <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Start Break</Text>
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue, {
                        fontFamily: 'monospace',
                        fontSize: 16,
                      }]}>
                        {selectedDayDetails.summary?.startBreak
                          ? new Date(selectedDayDetails.summary.startBreak.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Not recorded'}
                      </Text>
                    </View>
                    <View style={[styles.summaryItem, dynamicStyles.summaryItem, {
                      borderRightWidth: 1,
                      borderRightColor: theme.border,
                    }]}>
                      <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>End Break</Text>
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue, {
                        fontFamily: 'monospace',
                        fontSize: 16,
                      }]}>
                        {selectedDayDetails.summary?.endBreak
                          ? new Date(selectedDayDetails.summary.endBreak.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Not recorded'}
                      </Text>
                    </View>
                    <View style={[styles.summaryItem, dynamicStyles.summaryItem]}>
                      <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Clock-Out</Text>
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue, {
                        fontFamily: 'monospace',
                        fontSize: 16,
                      }]}>
                        {selectedDayDetails.summary?.clockOut
                          ? new Date(selectedDayDetails.summary.clockOut.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Not recorded'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Extra Hours Section */}
                {selectedDayDetails.extraHours && (
                  <View style={{
                    backgroundColor: '#dc262615',
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: '#dc2626',
                    borderWidth: 1,
                    borderColor: '#dc262630',
                  }}>
                    <Text style={{
                      color: '#dc2626',
                      fontSize: 13,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}>
                      Notice
                    </Text>
                    <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' }}>
                      {selectedDayDetails.extraHours}
                    </Text>
                  </View>
                )}

                {/* All Logs Section - Government Table Style */}
                {selectedDayDetails.logs && selectedDayDetails.logs.length > 0 && (
                  <View style={{
                    backgroundColor: isDarkMode ? '#1a2332' : '#fff',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      backgroundColor: theme.primary,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                    }}>
                      <Text style={{
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: '700',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}>
                        Complete Log History
                      </Text>
                    </View>
                    {selectedDayDetails.logs.map((log, index) => (
                      <View key={index} style={{
                        flexDirection: 'row',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        backgroundColor: index % 2 === 0 
                          ? (isDarkMode ? '#1e293b' : '#fff')
                          : (isDarkMode ? '#243447' : '#f8fafc'),
                        borderBottomWidth: index < selectedDayDetails.logs.length - 1 ? 1 : 0,
                        borderBottomColor: theme.border,
                      }}>
                        <View style={{ flex: 1.5 }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: theme.text,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                          }}>
                            {log.clockType === 'in' ? 'Clock-In' :
                             log.clockType === 'break_start' ? 'Start Break' :
                             log.clockType === 'break_end' ? 'End Break' :
                             'Clock-Out'}
                          </Text>
                        </View>
                        <View style={{ flex: 1.5 }}>
                          <Text style={{
                            fontSize: 12,
                            color: theme.textSecondary,
                            fontFamily: 'monospace',
                          }}>
                            {log.time}
                          </Text>
                          <Text style={{
                            fontSize: 10,
                            color: theme.textTertiary,
                            marginTop: 2,
                          }}>
                            {log.dateTime}
                          </Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text style={{
                            fontSize: 11,
                            color: theme.primary,
                            fontWeight: '600',
                          }}>
                            {log.confidence}%
                          </Text>
                          <Text style={{
                            fontSize: 9,
                            color: theme.textTertiary,
                            marginTop: 2,
                          }}>
                            Confidence
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Department Details Modal */}
      <Modal
        visible={showDepartmentDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDepartmentDetails(false);
          setSelectedDepartment(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent, styles.officialCard, { maxHeight: '90%' }]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                {selectedDepartment?.name || 'Department'} - Full Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDepartmentDetails(false);
                  setSelectedDepartment(null);
                }}
              >
                <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.officialRibbon, { backgroundColor: theme.primary, marginBottom: 10 }]}>
              <View>
                <Text style={styles.officialRibbonText}>Department Dossier</Text>
                <Text style={styles.officialRibbonSubText}>Official Reference Summary</Text>
              </View>
              <Text style={styles.officialRibbonBadge}>Details</Text>
            </View>

            {selectedDepartment && (
              <ScrollView style={styles.modalBody}>
                <View style={[styles.detailCard, { padding: 16 }]}>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, dynamicStyles.modalLabel]}>Basic Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Name:</Text>
                      <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.name || 'N/A'}</Text>
                    </View>
                    {selectedDepartment.departmentCode && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Department Code:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.departmentCode}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Company Name:</Text>
                      <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.companyName || 'N/A'}</Text>
                    </View>
                    {selectedDepartment.description && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Description:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.description}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Status:</Text>
                      <Text style={[styles.detailValue, dynamicStyles.staffDetails, { color: selectedDepartment.isActive ? '#16a34a' : '#dc2626' }]}>
                        {selectedDepartment.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, dynamicStyles.modalLabel]}>Location Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Location:</Text>
                      <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.location || 'N/A'}</Text>
                    </View>
                    {selectedDepartment.locationAddress && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Address:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.locationAddress}</Text>
                      </View>
                    )}
                    {selectedDepartment.locationLatitude && selectedDepartment.locationLongitude && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Latitude:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.locationLatitude.toFixed(6)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Longitude:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.locationLongitude.toFixed(6)}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, dynamicStyles.modalLabel]}>Metadata</Text>
                    {selectedDepartment.hostCompanyId && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Host Company ID:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{selectedDepartment.hostCompanyId}</Text>
                      </View>
                    )}
                    {selectedDepartment.createdAt && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Created At:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>
                          {new Date(selectedDepartment.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    )}
                    {selectedDepartment.updatedAt && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Last Updated:</Text>
                        <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>
                          {new Date(selectedDepartment.updatedAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Interns in this Department */}
                  <View style={[styles.detailSection, { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.borderColor }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={[styles.detailLabel, dynamicStyles.modalLabel]}>
                        👥 Interns/Staff ({departmentInterns.length})
                      </Text>
                      {loadingDepartmentInterns && <ActivityIndicator size="small" color={theme.primary} />}
                    </View>
                    
                    {loadingDepartmentInterns ? (
                      <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>Loading staff members...</Text>
                    ) : departmentInterns.length === 0 ? (
                      <Text style={[styles.detailValue, dynamicStyles.staffDetails, { fontStyle: 'italic', opacity: 0.7 }]}>
                        No interns/staff assigned to this department
                      </Text>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {departmentInterns.map((intern) => (
                          <View key={intern._id} style={[styles.internListItem, { padding: 12, backgroundColor: theme.cardBackground, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: theme.primary }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.detailValue, dynamicStyles.staffDetails, { fontWeight: '600', marginBottom: 4 }]}>
                                  {intern.name} {intern.surname}
                                </Text>
                                <Text style={[styles.detailKey, dynamicStyles.staffDetails, { fontSize: 12 }]}>
                                  {intern.role} • ID: {intern.idNumber}
                                </Text>
                                {intern.phoneNumber && (
                                  <Text style={[styles.detailKey, dynamicStyles.staffDetails, { fontSize: 12, marginTop: 4 }]}>
                                    📱 {intern.phoneNumber}
                                  </Text>
                                )}
                              </View>
                              <View style={{ paddingLeft: 8 }}>
                                <Text style={[{ fontSize: 20 }, intern.isActive ? { color: '#16a34a' } : { color: '#dc2626' }]}>
                                  {intern.isActive ? '✅' : '❌'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Department Interns Modal */}
      <Modal
        visible={showDepartmentInterns}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDepartmentInterns(false);
          setSelectedDepartment(null);
          setDepartmentInterns([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent, styles.officialCard, { maxHeight: '85%' }]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                {selectedDepartment?.name || 'Department'} - Interns
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.exportIconButton}
                  onPress={async () => {
                    if (selectedDepartment) {
                      await exportDepartmentPDF(selectedDepartment);
                    }
                  }}
                  disabled={exportingDepartment}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {exportingDepartment ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={styles.exportIconSmall}>📄</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowDepartmentInterns(false);
                    setSelectedDepartment(null);
                    setDepartmentInterns([]);
                  }}
                >
                  <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.officialRibbon, { backgroundColor: theme.primary, marginBottom: 10 }]}>
              <View>
                <Text style={styles.officialRibbonText}>Department Intern List</Text>
                <Text style={styles.officialRibbonSubText}>Authorised Personnel Register</Text>
              </View>
              <Text style={styles.officialRibbonBadge}>Official</Text>
            </View>

            {loadingDepartmentInterns ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading interns...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalBody}>
                {departmentInterns.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                      No interns found in this department
                    </Text>
                  </View>
                ) : (
                  departmentInterns.map((intern) => (
                    <View key={intern._id} style={[styles.detailCard, dynamicStyles.staffCard, { marginBottom: 16, padding: 16 }]}>
                      <Text style={[styles.detailSectionTitle, dynamicStyles.staffName, { marginBottom: 12 }]}>
                        {intern.name} {intern.surname}
                      </Text>
                      
                      <View style={styles.detailSection}>
                        <Text style={[styles.detailLabel, dynamicStyles.modalLabel]}>Personal Information</Text>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>ID Number:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.idNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Phone Number:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.phoneNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Role:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.role || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Department:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.department || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Status:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails, { color: intern.isActive ? '#16a34a' : '#dc2626' }]}>
                            {intern.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={[styles.detailLabel, dynamicStyles.modalLabel]}>Location Information</Text>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Location:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.location || 'N/A'}</Text>
                        </View>
                        {intern.locationAddress && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Address:</Text>
                            <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.locationAddress}</Text>
                          </View>
                        )}
                        {intern.locationLatitude && intern.locationLongitude && (
                          <>
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Latitude:</Text>
                              <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.locationLatitude.toFixed(6)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Longitude:</Text>
                              <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.locationLongitude.toFixed(6)}</Text>
                            </View>
                          </>
                        )}
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={[styles.detailLabel, dynamicStyles.modalLabel]}>Registration Information</Text>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Host Company ID:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>{intern.hostCompanyId || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, dynamicStyles.staffDetails]}>Created At:</Text>
                          <Text style={[styles.detailValue, dynamicStyles.staffDetails]}>
                            {intern.createdAt ? new Date(intern.createdAt).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Host Company Details Modal - DEPRECATED: Now using full-page view (renderHostCompanyDetails) */}
      {/* Keeping modal state for backward compatibility but it's no longer displayed */}

      {/* Month/Year Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Month & Year</Text>
            
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[styles.yearButton, dynamicStyles.yearButton]}
                onPress={() => setShowYearPicker(true)}
              >
                <Text style={[styles.yearButtonText, dynamicStyles.yearButtonText]}>
                  Year: {selectedYear} ▼
                </Text>
              </TouchableOpacity>
              
              <ScrollView style={styles.monthPicker}>
                {monthNames.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.monthOption,
                      dynamicStyles.monthOption,
                      selectedMonth === index + 1 && [styles.monthOptionSelected, dynamicStyles.monthOptionSelected]
                    ]}
                    onPress={() => {
                      setSelectedMonth(index + 1);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.monthOptionText,
                      dynamicStyles.monthOptionText,
                      selectedMonth === index + 1 && [styles.monthOptionTextSelected, dynamicStyles.monthOptionTextSelected]
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowMonthPicker(false)}
            >
              <Text style={[styles.modalCloseText, dynamicStyles.modalCloseText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {renderReportDetailModal()}
      {renderStatusUpdateModal()}
    </SafeAreaView>
  );
}

// Dynamic styles based on theme
const getDynamicStyles = (theme) => StyleSheet.create({
  container: { backgroundColor: theme.background },
  header: { backgroundColor: theme.card, borderBottomColor: theme.border },
  headerTitle: { color: theme.primary },
  menuIcon: { color: theme.primary },
  logoutText: { color: theme.primary },
  sidebar: { backgroundColor: theme.card, borderRightColor: theme.border },
  sidebarItem: { backgroundColor: theme.surface },
  sidebarItemActive: { backgroundColor: theme.primary },
  sidebarItemText: { color: theme.text },
  sidebarItemTextActive: { color: '#fff' },
  sectionTitle: { color: theme.primary },
  statCard: { backgroundColor: theme.card, shadowColor: theme.shadow },
  statValue: { color: theme.primary },
  statLabel: { color: theme.textSecondary },
  lateListContainer: { backgroundColor: theme.card, borderColor: theme.border },
  lateListTitle: { color: theme.text },
  lateItem: { borderBottomColor: theme.border },
  lateItemName: { color: theme.text },
  lateItemTime: { color: theme.textSecondary },
  filterContainer: { backgroundColor: theme.card, borderBottomColor: theme.border },
  monthButton: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
  monthButtonText: { color: theme.text },
  staffCard: { backgroundColor: theme.card, shadowColor: theme.shadow },
  staffName: { color: theme.text },
  staffDetails: { color: theme.textSecondary },
  exportButton: { backgroundColor: theme.primary },
  timesheetHeader: { backgroundColor: theme.surface, borderBottomColor: theme.border },
  timesheetHeaderText: { color: theme.text },
  timesheetRow: { borderBottomColor: theme.border },
  timesheetCell: { color: theme.text },
  noTimesheetText: { color: theme.textTertiary },
  notAccountableCard: { backgroundColor: theme.card, shadowColor: theme.shadow },
  notAccountableName: { color: theme.text },
  notAccountableReason: { color: theme.textSecondary },
  notAccountableTime: { color: theme.textTertiary },
  notAccountableDetails: { color: theme.textTertiary },
  notAccountableArrow: { color: theme.textTertiary },
  lateItemArrow: { color: theme.textTertiary },
  infoCard: { backgroundColor: theme.card, borderColor: theme.border },
  infoText: { color: theme.text },
  modalHeader: { borderBottomColor: theme.border },
  closeButtonText: { color: theme.text },
  dayDetailsStaffInfo: { borderBottomColor: theme.border },
  dayDetailsStaffName: { color: theme.text },
  dayDetailsDate: { color: theme.textSecondary },
  dayDetailsSummary: { backgroundColor: theme.surface },
  dayDetailsSectionTitle: { color: theme.primary },
  summaryItem: { backgroundColor: theme.card, borderColor: theme.border },
  summaryLabel: { color: theme.textTertiary },
  summaryValue: { color: theme.text },
  dayDetailsLogs: { backgroundColor: theme.surface },
  logItem: { backgroundColor: theme.card, borderColor: theme.border },
  logType: { color: theme.primary },
  logTime: { color: theme.text },
  logDateTime: { color: theme.textSecondary },
  logConfidence: { color: theme.textTertiary },
  emptyText: { color: theme.textTertiary },
  loadingText: { color: theme.textSecondary },
  dateInput: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText },
  filterCard: { backgroundColor: theme.card, borderColor: theme.border },
  filterLabel: { color: theme.text },
  filterOption: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
  filterOptionSelected: { backgroundColor: theme.primary },
  filterOptionText: { color: theme.text },
  filterOptionTextSelected: { color: '#fff' },
  dateRangeContainer: { flexDirection: 'row', alignItems: 'center' },
  dateRangeSeparator: { color: theme.textSecondary, marginHorizontal: 10 },
  staffPickerButton: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
  staffPickerButtonText: { color: theme.text },
  generateReportButton: { backgroundColor: theme.primary },
  staffPickerItem: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
  staffPickerItemSelected: { backgroundColor: theme.primary },
  staffPickerItemText: { color: theme.text },
  staffPickerItemTextSelected: { color: '#fff' },
  modalOverlay: { backgroundColor: theme.overlay },
  modalContent: { backgroundColor: theme.card, shadowColor: theme.shadow },
  modalTitle: { color: theme.primary },
  modalInputDisabled: { backgroundColor: theme.inputBackground, opacity: 0.7 },
  yearButton: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
  yearButtonText: { color: theme.text },
  monthOption: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
  monthOptionSelected: { backgroundColor: theme.primary },
  monthOptionText: { color: theme.text },
  monthOptionTextSelected: { color: '#fff' },
  modalCloseButton: { backgroundColor: theme.primary },
  modalCloseText: { color: '#fff' },
  addButton: { backgroundColor: theme.primary },
  editButton: { backgroundColor: '#3b82f6' },
  deleteButton: { backgroundColor: '#ED3438' },
  modalLabel: { color: theme.text },
  modalInput: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText },
  toggleButton: { borderColor: theme.inputBorder },
  toggleButtonActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  toggleButtonText: { color: theme.text },
  toggleButtonTextActive: { color: '#fff' },
  modalSaveButton: { backgroundColor: theme.primary },
  dropdownButton: { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
  dropdownButtonText: { color: theme.text },
  dropdownButtonPlaceholder: { color: theme.textTertiary },
  dropdownArrow: { color: theme.textSecondary },
  dropdownItem: { borderBottomColor: theme.border },
  dropdownItemSelected: { backgroundColor: theme.surface },
  dropdownItemText: { color: theme.text },
  dropdownItemTextSelected: { color: theme.primary },
  dropdownItemAddress: { color: theme.textSecondary },
  dropdownItemAddressSelected: { color: theme.primary },
  checkmark: { color: theme.primary },
  infoTooltipContainer: { backgroundColor: '#f0f9ff', borderLeftColor: '#3b82f6' },
  infoTooltipText: { color: '#1e40af' },
  benefitList: { marginLeft: 8 },
  benefitItem: { color: theme.text },
  infoText: { color: theme.text },
  clickHint: { color: theme.textTertiary },
  avatarDropdown: { backgroundColor: theme.card, shadowColor: theme.shadow },
  avatarDropdownName: { color: theme.text },
  avatarDropdownEmail: { color: theme.textSecondary },
  avatarDropdownItemText: { color: theme.text },
  pieChartTotal: { color: theme.primary },
  pieChartLabel: { color: theme.textSecondary },
  pieChartEmptyText: { color: theme.textTertiary },
  // Report dynamic styles
  reportCard: { backgroundColor: theme.card, borderColor: theme.border },
  reportTitle: { color: theme.text },
  reportInternName: { color: theme.textSecondary },
  reportType: { color: theme.textSecondary },
  reportCompany: { color: theme.textSecondary },
  reportDate: { color: theme.textTertiary },
  internContextCard: { backgroundColor: theme.card, borderColor: theme.border },
  contextLabel: { color: theme.textSecondary },
  contextValue: { color: theme.text },
  sectionSubtitle: { color: theme.textSecondary },
  filterLabel: { color: theme.text },
  emptyText: { color: theme.textTertiary },
  emptySubText: { color: theme.textTertiary },
  emptyIcon: { color: theme.text },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
    marginHorizontal: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    position: 'relative',
    padding: 8,
    marginRight: 8,
  },
  exportIcon: {
    fontSize: 24,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarButton: {
    width: 40,
    height: 40,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3166AE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 250,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  avatarDropdownHeader: {
    padding: 16,
  },
  avatarDropdownName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  avatarDropdownEmail: {
    fontSize: 12,
    color: '#666',
  },
  avatarDropdownDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  avatarDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatarDropdownIcon: {
    fontSize: 20,
  },
  avatarDropdownItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  pieChartsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  pieChartCard: {
    flex: 1,
    minWidth: '48%',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  pieChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  pieChartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  pieChartBaseCircle: {
    position: 'absolute',
  },
  pieChartSegmentsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pieChartSegmentWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChartSegment: {
    position: 'absolute',
  },
  pieChartCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -((150 - 40) / 2) }, { translateY: -((150 - 40) / 2) }],
  },
  pieChartTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3166AE',
  },
  pieChartLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pieChartEmptyText: {
    fontSize: 14,
    color: '#999',
  },
  pieChartLegend: {
    marginTop: 16,
    width: '100%',
  },
  pieChartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  pieChartLegendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  /* Table styles for reports list */
  tableContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableHeader: {
    backgroundColor: '#f5f7fa',
    borderBottomWidth: 2,
    borderBottomColor: '#3166AE',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 900,
  },
  tableRowEven: {
    backgroundColor: '#fff',
  },
  tableRowOdd: {
    backgroundColor: '#fbfcfd',
  },
  /* column widths to keep alignment */
  tableColIndex: { width: 40, paddingHorizontal: 8 },
  tableColTitle: { width: 240, paddingHorizontal: 8 },
  tableColType: { width: 110, paddingHorizontal: 8 },
  tableColCompany: { width: 180, paddingHorizontal: 8 },
  tableColSubmitted: { width: 130, paddingHorizontal: 8 },
  tableColStatus: { width: 110, paddingHorizontal: 8 },
  tableColSeverity: { width: 110, paddingHorizontal: 8 },
  tableHeaderText: {
    fontWeight: '700',
    color: '#222',
    fontSize: 12,
  },
  tableCellText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '400',
  },
  pieChartLegendText: {
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 200,
    maxWidth: '50%',
    borderRightWidth: 1,
    paddingTop: 20,
  },
  sidebarItem: {
    padding: 16,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarItemActive: {
    // Active state handled by dynamic styles
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sidebarItemTextActive: {
    color: '#fff',
  },
  contentArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  dashboardContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '100%',
    minWidth: 140,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
    textAlign: 'right',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
  lateListContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  lateListTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  lateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lateItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  lateItemTime: {
    fontSize: 14,
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  monthButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  staffCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  staffListItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3166AE20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  staffAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3166AE',
  },
  staffListContent: {
    flex: 1,
  },
  staffListArrow: {
    fontSize: 24,
    color: '#9ca3af',
    marginLeft: 12,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  staffDetails: {
    fontSize: 14,
  },
  infoIconSmall: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#3166AE',
    marginRight: 6,
  },
  staffDetailsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  staffDetailsHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  staffDetailsAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3166AE55',
  },
  staffAvatarLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  staffDetailsName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  staffDetailsRole: {
    fontSize: 16,
    opacity: 0.7,
  },
  staffDetailsInfo: {
    marginBottom: 20,
  },
  collapsibleCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  collapsibleArrow: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewTimesheetButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  viewTimesheetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  timesheetViewCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timesheetPeriodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  exportPDFButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  exportPDFButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timesheetContainer: {
    marginTop: 12,
  },
  timesheetHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  timesheetHeaderText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timesheetRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  timesheetCell: {
    flex: 1,
    fontSize: 11,
  },
  noTimesheetText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  notAccountableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  notAccountableName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  notAccountableReason: {
    fontSize: 13,
    marginBottom: 4,
  },
  notAccountableTime: {
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  dateInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 12,
    padding: 24,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#d4dbe7',
    backgroundColor: '#fdfefe',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'left',
    letterSpacing: 0.3,
  },
  pickerContainer: {
    flex: 1,
  },
  yearButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthPicker: {
    maxHeight: 300,
  },
  monthOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  monthOptionSelected: {
    // Selected state handled by dynamic styles
  },
  monthOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  monthOptionTextSelected: {
    color: '#fff',
  },
  modalCloseButton: {
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // New styles for responsive design and new features
  lateItemContent: {
    flex: 1,
  },
  lateItemArrow: {
    fontSize: 24,
    color: '#999',
    marginLeft: 8,
  },
  exportButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  exportIcon: {
    fontSize: 20,
  },
  exportIconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  exportIconSmall: {
    fontSize: 16,
  },
  notAccountableCardContent: {
    flex: 1,
  },
  notAccountableDetails: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  timeDetails: {
    marginTop: 8,
  },
  notAccountableArrow: {
    fontSize: 24,
    color: '#999',
    marginLeft: 8,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  dayDetailsModal: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d4dbe7',
    backgroundColor: '#fdfefe',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#d9e3f0',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  dayDetailsContent: {
    padding: 20,
  },
  dayDetailsStaffInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  dayDetailsStaffName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  dayDetailsDate: {
    fontSize: 16,
    opacity: 0.7,
  },
  dayDetailsSummary: {
    marginBottom: 20,
  },
  dayDetailsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayDetailsLogs: {
    marginTop: 20,
  },
  logItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  logType: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  logTime: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  logDateTime: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  logConfidence: {
    fontSize: 12,
    opacity: 0.6,
  },
  internCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  internCountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clickHint: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  officialCard: {
    borderWidth: 1,
    borderColor: '#d4dbe7',
    backgroundColor: '#fdfefe',
    borderRadius: 12,
    overflow: 'hidden',
  },
  officialRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d9e3f0',
  },
  officialRibbonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  officialRibbonSubText: {
    color: '#e5edfb',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  officialRibbonBadge: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff80',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  officialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  officialLabel: {
    fontSize: 12,
    color: '#4b5563',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontWeight: '700',
    flex: 1,
  },
  officialValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  performanceCard: {
    width: '48%',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  performanceUnit: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  officialAttendanceRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  officialAttendanceDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  officialAttendanceDay: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  officialAttendanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  officialAttendanceTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'monospace',
  },
  officialAttendanceHours: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusFilterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applicationDetails: {
    marginTop: 16,
  },
  applicationActions: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#718096',
    fontWeight: '600',
  },
  detailCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: '#6b7280',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailKey: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  // Department management styles
  addButton: {
    backgroundColor: '#3166AE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ED3438',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInputDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.7,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  toggleContainer: {
    marginTop: 12,
  },
  toggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3166AE',
    borderColor: '#3166AE',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  modalSaveButton: {
    backgroundColor: '#3166AE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Department form additional styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownButtonPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dropdownItemTextSelected: {
    color: '#3166AE',
  },
  dropdownItemAddress: {
    fontSize: 13,
    color: '#666',
  },
  dropdownItemAddressSelected: {
    color: '#3b82f6',
  },
  checkmark: {
    fontSize: 20,
    color: '#3166AE',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoIconRed: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#3b82f6',
  },
  helperText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 6,
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  infoModalText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 10,
  },
  infoTooltipContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  infoTooltipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#1e40af',
    fontWeight: '400',
  },
  benefitList: {
    marginLeft: 8,
  },
  benefitItem: {
    marginBottom: 10,
    lineHeight: 20,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  locationTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 100,
  },
  locationTypeDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationTypeText: {
    fontSize: 14,
    color: '#333',
  },
  // Report generation styles
  filterCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#3166AE',
    borderColor: '#3166AE',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateRangeSeparator: {
    marginHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
  staffPickerButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  staffPickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  generateReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3166AE',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  reportIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  generateReportButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  staffPickerList: {
    maxHeight: 400,
  },
  staffPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  staffPickerItemSelected: {
    backgroundColor: '#3166AE',
    borderColor: '#3166AE',
  },
  staffPickerItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  staffPickerItemTextSelected: {
    color: '#fff',
  },
  checkmark: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Reports styles
  reportsList: {
    marginTop: 16,
  },
  reportCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  reportCardContent: {
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportTitleSection: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  reportInternName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  reportBadgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetails: {
    marginBottom: 12,
  },
  reportType: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  reportCompany: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  reportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  internContextCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  contextGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  contextItem: {
    flex: 1,
    marginRight: 12,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  contextValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: '#999',
  },
  // Device styles
  filtersSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  filterButtonActive: {
    borderWidth: 0,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  devicesListContainer: {
    gap: 12,
  },
  deviceCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  deviceEmail: {
    fontSize: 13,
    marginBottom: 4,
  },
  deviceModel: {
    fontSize: 13,
    marginBottom: 6,
  },
  deviceDate: {
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ff9800',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  // Professional Timesheet Styles (InternAttendance style)
  timesheetTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timesheetBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  timesheetBackButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  timesheetHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timesheetExportBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  timesheetExportBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timesheetPeriodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  timesheetPeriodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timesheetPeriodBtnActive: {
    backgroundColor: '#3166AE',
    borderColor: '#3166AE',
  },
  timesheetPeriodBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  timesheetPeriodBtnTextActive: {
    color: '#ffffff',
  },
  timesheetScrollView: {
    flex: 1,
  },
  timesheetScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  timesheetLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  timesheetLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  timesheetStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  timesheetStatCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timesheetStatIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  timesheetStatValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111827',
  },
  timesheetStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  timesheetDetailedStatsCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timesheetSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    color: '#111827',
  },
  timesheetDetailedStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timesheetDetailedStatLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  timesheetDetailedStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  timesheetTableCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  timesheetTableTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    color: '#111827',
  },
  timesheetTableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 2,
    marginBottom: 4,
  },
  timesheetTableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  timesheetTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  timesheetIncompleteRow: {
    backgroundColor: '#fef2f2',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  timesheetTableDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  timesheetTableDay: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  timesheetTableCell: {
    fontSize: 12,
    color: '#374151',
  },
  timesheetHoursCell: {
    fontWeight: '700',
    textAlign: 'right',
  },
  timesheetMissingValue: {
    color: '#dc2626',
    fontStyle: 'italic',
  },
  timesheetEmptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
