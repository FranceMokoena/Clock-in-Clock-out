import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

export default function AdminDashboard({ navigation, route }) {
  const { theme } = useTheme();
  // Get user info from route params (set during login)
  const userInfo = route?.params?.userInfo || { type: 'admin' };
  const isAdmin = userInfo.type === 'admin';
  const isHostCompany = userInfo.type === 'hostCompany';
  const hostCompanyId = isHostCompany ? userInfo.id : null;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'staff', 'notAccountable'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
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
  
  // Not accountable
  const [notAccountable, setNotAccountable] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // PDF export
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingDepartment, setExportingDepartment] = useState(false);
  const [exportingHostCompany, setExportingHostCompany] = useState(false);
  const [exportingAllDepartments, setExportingAllDepartments] = useState(false);
  const [exportingAllHostCompanies, setExportingAllHostCompanies] = useState(false);
  
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
          <h1 style="color: #3166AE; margin: 0; font-size: 28px; font-weight: 700;">${title}</h1>
          ${subtitle ? `<h2 style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px; font-weight: 400;">${subtitle}</h2>` : ''}
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
  
  // Host company details modal
  const [showHostCompanyDetails, setShowHostCompanyDetails] = useState(false);
  const [selectedHostCompany, setSelectedHostCompany] = useState(null);
  const [hostCompanyDepartments, setHostCompanyDepartments] = useState([]);
  const [hostCompanyInterns, setHostCompanyInterns] = useState([]);
  const [loadingHostCompanyDetails, setLoadingHostCompanyDetails] = useState(false);

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
  }, [activeView, selectedMonth, selectedYear, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeView === 'dashboard') {
        await loadStats();
      } else if (activeView === 'staff') {
        await loadStaff();
      } else if (activeView === 'notAccountable') {
        await loadNotAccountable();
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
      const response = await axios.get(`${API_BASE_URL}/staff/admin/staff`, { params });
      if (response.data.success) {
        // The admin/staff endpoint returns staff with all fields
        setStaff(response.data.staff);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      throw error;
    }
  };

  // Note: loadStaffDetails is no longer needed - we use staff list data directly
  // Keeping function for potential future use but it's not called anymore

  const loadStaffTimesheet = async (staffId, period) => {
    try {
      setLoading(true);
      const today = new Date();
      let response;

      if (period === 'today') {
        // Use day-details endpoint for today
        const date = today.toISOString().split('T')[0];
        response = await axios.get(`${API_BASE_URL}/staff/admin/staff/${staffId}/day-details`, {
          params: { date }
        });
        
        if (response.data.success) {
          // Convert day-details logs to timesheet format
          const logs = response.data.logs || [];
          const timesheetData = logs.map(log => ({
            date: date,
            clockInTime: log.clockType === 'in' ? log.timestamp : null,
            clockOutTime: log.clockType === 'out' ? log.timestamp : null,
            lunchStartTime: log.clockType === 'break_start' ? log.timestamp : null,
            lunchEndTime: log.clockType === 'break_end' ? log.timestamp : null,
            timeIn: log.clockType === 'in' ? log.time : null,
            timeOut: log.clockType === 'out' ? log.time : null,
            startLunch: log.clockType === 'break_start' ? log.time : null,
            endLunch: log.clockType === 'break_end' ? log.time : null,
          }));
          setStaffTimesheet(timesheetData);
        } else {
          setStaffTimesheet([]);
        }
      } else {
        // Use timesheet endpoint for weekly/monthly
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        
        response = await axios.get(`${API_BASE_URL}/staff/admin/staff/${staffId}/timesheet`, {
          params: { month, year }
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
      Alert.alert('Error', 'Failed to load timesheet data.');
      setStaffTimesheet([]);
    } finally {
      setLoading(false);
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const renderDashboard = () => {
    if (!stats) return null;

    return (
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.dashboardContainer}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Dashboard Overview</Text>
          
          <View style={styles.statsGrid}>
            {/* Total Staff Card */}
            <View style={[styles.statCard, dynamicStyles.statCard]}>
              <View style={styles.statCardTop}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.statIcon}>👥</Text>
                </View>
              <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.totalStaff}</Text>
              </View>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Total Staff</Text>
            </View>
            
            {/* Clock-Ins Today Card */}
            <View style={[styles.statCard, dynamicStyles.statCard]}>
              <View style={styles.statCardTop}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.statIcon}>⏰</Text>
                </View>
              <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.clockInsToday}</Text>
              </View>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Clock-Ins Today</Text>
            </View>
            
            {/* Currently In Card */}
            <View style={[styles.statCard, dynamicStyles.statCard]}>
              <View style={styles.statCardTop}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.statIcon}>✅</Text>
                </View>
              <Text style={[styles.statValue, dynamicStyles.statValue]}>{stats.currentlyIn}</Text>
              </View>
              <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Currently In</Text>
            </View>
            
            {/* Late Arrivals Card */}
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
    // Use the member data directly - no need for additional API call
    setStaffDetails(member);
    setShowStaffDetails(true);
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
  };

  const handleBackToDetails = () => {
    setShowTimesheetView(false);
    setStaffTimesheet([]);
  };

  const exportTimesheetPDF = async () => {
    if (!selectedStaff || !staffTimesheet) return;
    
    try {
      setExportingPDF(true);
      
      const periodLabel = timesheetPeriod === 'today' ? 'Today' : 
                         timesheetPeriod === 'weekly' ? 'Weekly' : 'Monthly';
      
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
            </style>
          </head>
          <body>
            ${getWatermarkHTML()}
            ${getPDFHeaderHTML(`${selectedStaff.name} - Timesheet`, `${periodLabel} Report`)}
            
            <div style="margin-bottom: 20px;">
              <p><strong>Name:</strong> ${selectedStaff.name} ${selectedStaff.surname || ''}</p>
              <p><strong>Role:</strong> ${selectedStaff.role || 'N/A'}</p>
              <p><strong>Location:</strong> ${selectedStaff.location || 'N/A'}</p>
              <p><strong>Period:</strong> ${periodLabel}</p>
            </div>
            
            ${staffTimesheet.length > 0 ? `
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
                  ${staffTimesheet.map(entry => `
                    <tr style="${entry.extraHours ? 'background-color: #fee2e2;' : ''}">
                      <td>
                        ${new Date(entry.date || entry.clockInTime).toLocaleDateString('en-US', { 
                          year: 'numeric', month: 'short', day: 'numeric' 
                        })}
                        ${entry.extraHours ? `<br><span style="color: #dc2626; font-size: 10px; font-weight: 600;">${entry.extraHours}</span>` : ''}
                      </td>
                      <td>${entry.timeIn || entry.clockInTime ? new Date(entry.clockInTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-'}</td>
                      <td>${entry.startLunch || entry.lunchStartTime ? new Date(entry.lunchStartTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-'}</td>
                      <td>${entry.endLunch || entry.lunchEndTime ? new Date(entry.lunchEndTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-'}</td>
                      <td>${entry.timeOut || entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="text-align: center; padding: 30px; color: #9ca3af;">No timesheet data available</p>'}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
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
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {staff.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No staff members found</Text>
            </View>
          ) : (
            staff.map((member) => (
              <TouchableOpacity
                key={member._id}
                style={[styles.staffListItem, dynamicStyles.staffCard]}
                onPress={() => handleStaffClick(member)}
                activeOpacity={0.7}
              >
                <View style={styles.staffListContent}>
                  <Text style={[styles.staffName, dynamicStyles.staffName]}>
                    {member.name} {member.surname || ''}
                  </Text>
                    <Text style={[styles.staffDetails, dynamicStyles.staffDetails]}>
                    {member.role || 'Staff'} • {member.location || 'N/A'}
                    </Text>
                  </View>
                <Text style={styles.staffListArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // Render staff details
  const renderStaffDetails = () => {
    if (!staffDetails) return null;

    return (
      <View style={styles.content}>
        <ScrollView>
          <View style={[styles.staffDetailsCard, dynamicStyles.staffCard]}>
                  <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToList}
            >
              <Text style={styles.backButtonText}>← Back to List</Text>
            </TouchableOpacity>

            <View style={styles.staffDetailsHeader}>
              <Text style={[styles.staffDetailsName, dynamicStyles.staffName]}>
                {staffDetails.name} {staffDetails.surname || ''}
              </Text>
              <Text style={[styles.staffDetailsRole, dynamicStyles.staffDetails]}>
                {staffDetails.role || 'Staff'}
              </Text>
            </View>

            <View style={styles.staffDetailsInfo}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>ID Number:</Text>
                <Text style={[styles.detailValue, dynamicStyles.statValue]}>{staffDetails.idNumber || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Phone:</Text>
                <Text style={[styles.detailValue, dynamicStyles.statValue]}>{staffDetails.phoneNumber || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Location:</Text>
                <Text style={[styles.detailValue, dynamicStyles.statValue]}>{staffDetails.location || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Department:</Text>
                <Text style={[styles.detailValue, dynamicStyles.statValue]}>{staffDetails.department || 'N/A'}</Text>
              </View>
              {staffDetails.hostCompany && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Company:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>
                    {staffDetails.hostCompany.name || staffDetails.hostCompany.companyName || 'N/A'}
                  </Text>
                </View>
              )}
              {staffDetails.hostCompanyId && !staffDetails.hostCompany && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, dynamicStyles.statLabel]}>Company ID:</Text>
                  <Text style={[styles.detailValue, dynamicStyles.statValue]}>{staffDetails.hostCompanyId}</Text>
                </View>
              )}
            </View>

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
    return (
      <View style={styles.content}>
        <ScrollView>
          <View style={[styles.timesheetViewCard, dynamicStyles.staffCard]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToDetails}
            >
              <Text style={styles.backButtonText}>← Back to Details</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
              Timesheet - {selectedStaff?.name} {selectedStaff?.surname || ''}
            </Text>

            <View style={styles.timesheetPeriodButtons}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  timesheetPeriod === 'today' && styles.periodButtonActive,
                  dynamicStyles.monthButton
                ]}
                onPress={() => handleViewTimesheet('today')}
              >
                <Text style={[
                  styles.periodButtonText,
                  timesheetPeriod === 'today' && styles.periodButtonTextActive,
                  dynamicStyles.monthButtonText
                ]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  timesheetPeriod === 'weekly' && styles.periodButtonActive,
                  dynamicStyles.monthButton
                ]}
                onPress={() => handleViewTimesheet('weekly')}
              >
                <Text style={[
                  styles.periodButtonText,
                  timesheetPeriod === 'weekly' && styles.periodButtonTextActive,
                  dynamicStyles.monthButtonText
                ]}>Weekly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  timesheetPeriod === 'monthly' && styles.periodButtonActive,
                  dynamicStyles.monthButton
                ]}
                onPress={() => handleViewTimesheet('monthly')}
              >
                <Text style={[
                  styles.periodButtonText,
                  timesheetPeriod === 'monthly' && styles.periodButtonTextActive,
                  dynamicStyles.monthButtonText
                ]}>Monthly</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.exportPDFButton, dynamicStyles.exportButton]}
              onPress={exportTimesheetPDF}
                    disabled={exportingPDF}
                  >
                    {exportingPDF ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                <Text style={styles.exportPDFButtonText}>📄 Export PDF</Text>
                    )}
                  </TouchableOpacity>

            {staffTimesheet.length > 0 ? (
                  <View style={styles.timesheetContainer}>
                    <View style={[styles.timesheetHeader, dynamicStyles.timesheetHeader]}>
                      <Text style={[styles.timesheetHeaderText, dynamicStyles.timesheetHeaderText]}>Date</Text>
                      <Text style={[styles.timesheetHeaderText, dynamicStyles.timesheetHeaderText]}>Time In</Text>
                      <Text style={[styles.timesheetHeaderText, dynamicStyles.timesheetHeaderText]}>Start Lunch</Text>
                      <Text style={[styles.timesheetHeaderText, dynamicStyles.timesheetHeaderText]}>End Lunch</Text>
                      <Text style={[styles.timesheetHeaderText, dynamicStyles.timesheetHeaderText]}>Time Out</Text>
                    </View>
                {staffTimesheet.map((entry, idx) => (
                      <View key={idx} style={[styles.timesheetRow, dynamicStyles.timesheetRow, entry.extraHours && { backgroundColor: '#dc262608' }]}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.timesheetCell, dynamicStyles.timesheetCell]}>
                            {new Date(entry.date || entry.clockInTime).toLocaleDateString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric' 
                            })}
                          </Text>
                          {entry.extraHours && (
                            <Text style={{ fontSize: 10, color: '#dc2626', marginTop: 4, fontWeight: '600', lineHeight: 14 }}>
                              {entry.extraHours}
                            </Text>
                          )}
                        </View>
                    <Text style={[styles.timesheetCell, dynamicStyles.timesheetCell, { flex: 0.8 }]}>
                      {entry.timeIn || (entry.clockInTime ? new Date(entry.clockInTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-')}
                    </Text>
                    <Text style={[styles.timesheetCell, dynamicStyles.timesheetCell, { flex: 0.8 }]}>
                      {entry.startLunch || (entry.lunchStartTime ? new Date(entry.lunchStartTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-')}
                    </Text>
                    <Text style={[styles.timesheetCell, dynamicStyles.timesheetCell, { flex: 0.8 }]}>
                      {entry.endLunch || (entry.lunchEndTime ? new Date(entry.lunchEndTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-')}
                    </Text>
                    <Text style={[styles.timesheetCell, dynamicStyles.timesheetCell, { flex: 0.8 }]}>
                      {entry.timeOut || (entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : '-')}
                    </Text>
                      </View>
                    ))}
                  </View>
                ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                  No timesheet data available for {timesheetPeriod === 'today' ? 'today' : 
                  timesheetPeriod === 'weekly' ? 'this week' : 'this month'}
                  </Text>
              </View>
          )}
          </View>
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
    role: 'all'
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
    return (
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.dashboardContainer}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Generate Reports</Text>
          
          {/* Period Selection */}
          <View style={[styles.filterCard, dynamicStyles.filterCard]}>
            <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Period</Text>
            <View style={styles.filterOptions}>
              {['daily', 'weekly', 'monthly', 'custom'].map(period => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.filterOption,
                    dynamicStyles.filterOption,
                    reportFilters.period === period && [styles.filterOptionSelected, dynamicStyles.filterOptionSelected]
                  ]}
                  onPress={() => setReportFilters({ ...reportFilters, period })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    dynamicStyles.filterOptionText,
                    reportFilters.period === period && styles.filterOptionTextSelected
                  ]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Date Range */}
          {reportFilters.period === 'custom' && (
            <View style={[styles.filterCard, dynamicStyles.filterCard]}>
              <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Date Range</Text>
              <View style={styles.dateRangeContainer}>
                <TextInput
                  style={[styles.dateInput, dynamicStyles.dateInput]}
                  value={reportFilters.startDate}
                  onChangeText={(text) => setReportFilters({ ...reportFilters, startDate: text })}
                  placeholder="Start Date (YYYY-MM-DD)"
                />
                <Text style={[styles.dateRangeSeparator, dynamicStyles.dateRangeSeparator]}>to</Text>
                <TextInput
                  style={[styles.dateInput, dynamicStyles.dateInput]}
                  value={reportFilters.endDate}
                  onChangeText={(text) => setReportFilters({ ...reportFilters, endDate: text })}
                  placeholder="End Date (YYYY-MM-DD)"
                />
              </View>
            </View>
          )}

          {/* Staff Selection */}
          <View style={[styles.filterCard, dynamicStyles.filterCard]}>
            <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Staff Selection</Text>
            <View style={styles.filterOptions}>
              {['all', 'individual', 'group'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterOption,
                    dynamicStyles.filterOption,
                    reportFilters.staffType === type && [styles.filterOptionSelected, dynamicStyles.filterOptionSelected]
                  ]}
                  onPress={() => setReportFilters({ ...reportFilters, staffType: type })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    dynamicStyles.filterOptionText,
                    reportFilters.staffType === type && styles.filterOptionTextSelected
                  ]}>
                    {type === 'all' ? 'All Staff' : type === 'individual' ? 'Individual' : 'Group'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {(reportFilters.staffType === 'individual' || reportFilters.staffType === 'group') && (
              <TouchableOpacity
                style={[styles.staffPickerButton, dynamicStyles.staffPickerButton]}
                onPress={() => setShowStaffPicker(true)}
              >
                <Text style={[styles.staffPickerButtonText, dynamicStyles.staffPickerButtonText]}>
                  {reportFilters.selectedStaff.length > 0 
                    ? `${reportFilters.selectedStaff.length} staff selected` 
                    : 'Select Staff'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location Filter */}
          <View style={[styles.filterCard, dynamicStyles.filterCard]}>
            <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Location</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
              {['all', ...availableLocations].map(location => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.filterOption,
                    dynamicStyles.filterOption,
                    reportFilters.location === location && [styles.filterOptionSelected, dynamicStyles.filterOptionSelected]
                  ]}
                  onPress={() => setReportFilters({ ...reportFilters, location })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    dynamicStyles.filterOptionText,
                    reportFilters.location === location && styles.filterOptionTextSelected
                  ]}>
                    {location === 'all' ? 'All Locations' : location}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Role Filter */}
          <View style={[styles.filterCard, dynamicStyles.filterCard]}>
            <Text style={[styles.filterLabel, dynamicStyles.filterLabel]}>Role</Text>
            <View style={styles.filterOptions}>
              {['all', ...availableRoles].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.filterOption,
                    dynamicStyles.filterOption,
                    reportFilters.role === role && [styles.filterOptionSelected, dynamicStyles.filterOptionSelected]
                  ]}
                  onPress={() => setReportFilters({ ...reportFilters, role })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    dynamicStyles.filterOptionText,
                    reportFilters.role === role && styles.filterOptionTextSelected
                  ]}>
                    {role === 'all' ? 'All Roles' : role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate Report Button */}
          <TouchableOpacity
            style={[styles.generateReportButton, dynamicStyles.generateReportButton]}
            onPress={generateReport}
            disabled={generatingReport}
          >
            {generatingReport ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.generateReportButtonText}>Generating Report...</Text>
              </>
            ) : (
              <>
                <Text style={styles.reportIcon}>📄</Text>
                <Text style={styles.generateReportButtonText}>Generate & Download Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Staff Picker Modal */}
        <Modal
          visible={showStaffPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStaffPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.modalContent]}>
              <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
                <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Staff</Text>
                <TouchableOpacity onPress={() => setShowStaffPicker(false)}>
                  <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.staffPickerList}>
                {availableStaff.map(staff => {
                  const isSelected = reportFilters.selectedStaff.includes(staff._id);
                  return (
                    <TouchableOpacity
                      key={staff._id}
                      style={[
                        styles.staffPickerItem,
                        dynamicStyles.staffPickerItem,
                        isSelected && [styles.staffPickerItemSelected, dynamicStyles.staffPickerItemSelected]
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          setReportFilters({
                            ...reportFilters,
                            selectedStaff: reportFilters.selectedStaff.filter(id => id !== staff._id)
                          });
                        } else {
                          setReportFilters({
                            ...reportFilters,
                            selectedStaff: [...reportFilters.selectedStaff, staff._id]
                          });
                        }
                      }}
                    >
                      <Text style={[
                        styles.staffPickerItemText,
                        dynamicStyles.staffPickerItemText,
                        isSelected && styles.staffPickerItemTextSelected
                      ]}>
                        {staff.name}
                      </Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
                onPress={() => setShowStaffPicker(false)}
              >
                <Text style={[styles.modalCloseText, dynamicStyles.modalCloseText]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

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
  const [showHostCompanyInfo, setShowHostCompanyInfo] = useState(false);
  const [savingHostCompany, setSavingHostCompany] = useState(false);

  useEffect(() => {
    if (activeView === 'hostCompanies') {
      loadHostCompanies();
    }
  }, [activeView]);

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
              
              // Get interns for this company (full data)
              const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
                params: { hostCompanyId: company._id, fullData: true }
              });
              const internCount = internsResponse.data.success ? internsResponse.data.staff.length : 0;
              
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
        
        await axios.put(`${API_BASE_URL}/staff/admin/host-companies/${editingHostCompany._id}`, updateData);
        Alert.alert('Success', 'Host company updated successfully');
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
    // ⏰ DEFAULT WORKING HOURS: Populate if available
    setHostCompanyDefaultClockInTime(company.defaultClockInTime || '');
    setHostCompanyDefaultClockOutTime(company.defaultClockOutTime || '');
    setHostCompanyDefaultBreakStartTime(company.defaultBreakStartTime || '');
    setHostCompanyDefaultBreakEndTime(company.defaultBreakEndTime || '');
    setShowHostCompanyModal(true);
  };

  const handleDeleteHostCompany = async (company) => {
    Alert.alert(
      'Delete Host Company',
      `Are you sure you want to delete "${company.name}"? This will only work if no departments are assigned to this company.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/staff/admin/host-companies/${company._id}`);
              Alert.alert('Success', 'Host company deleted successfully');
              loadHostCompanies();
            } catch (error) {
              console.error('Error deleting host company:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete host company');
            }
          }
        }
      ]
    );
  };

  const renderHostCompanies = () => {
    const businessTypes = ['Pty Ltd', 'LLC', 'Sole Proprietor', 'NGO', 'Partnership', 'Corporation', 'Other'];
    
    return (
      <View style={styles.content}>
        <View style={[styles.filterContainer, dynamicStyles.filterContainer]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Host Company Management</Text>
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
          </View>
          <TouchableOpacity
            style={[styles.addButton, dynamicStyles.addButton]}
            onPress={() => {
              setEditingHostCompany(null);
              resetHostCompanyForm();
              setShowHostCompanyModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Add Host Company</Text>
          </TouchableOpacity>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadHostCompanies} />}>
          {hostCompanies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No host companies found</Text>
              <Text style={[styles.emptyText, dynamicStyles.emptyText, { fontSize: 14, marginTop: 8 }]}>
                Click "Add Host Company" to create one
              </Text>
            </View>
          ) : (
            hostCompanies.map((company) => (
              <TouchableOpacity
                key={company._id}
                style={[styles.staffCard, dynamicStyles.staffCard]}
                onPress={() => handleViewHostCompanyDetails(company)}
                activeOpacity={0.7}
              >
                <View style={styles.staffHeader}>
                  <View style={{ flex: 1 }}>
                    {/* Company Name Section */}
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.staffName, dynamicStyles.staffName, { fontSize: 18, marginBottom: 4 }]}>
                        {company.name}
                      </Text>
                      {company.companyName && (
                        <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 14, opacity: 0.8 }]}>
                          {company.companyName}
                        </Text>
                      )}
                    </View>

                    {/* Stats Section */}
                    <View style={{ 
                      flexDirection: 'row', 
                      gap: 12, 
                      marginBottom: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      backgroundColor: theme.primary + '08',
                      borderRadius: 8
                    }}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.statValue, dynamicStyles.statValue, { fontSize: 24, fontWeight: 'bold' }]}>
                          {company.departmentCount || 0}
                        </Text>
                        <Text style={[styles.statLabel, dynamicStyles.statLabel, { fontSize: 12, marginTop: 4 }]}>
                          Departments
                        </Text>
                      </View>
                      <View style={{ width: 1, backgroundColor: theme.border, opacity: 0.3 }} />
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.statValue, dynamicStyles.statValue, { fontSize: 24, fontWeight: 'bold' }]}>
                          {company.internCount || 0}
                        </Text>
                        <Text style={[styles.statLabel, dynamicStyles.statLabel, { fontSize: 12, marginTop: 4 }]}>
                          Interns Available
                        </Text>
                      </View>
                    </View>

                    {/* Company Details Section */}
                    <View style={{ marginBottom: 8 }}>
                      {company.registrationNumber && (
                        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                          <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13, fontWeight: '500', minWidth: 100 }]}>
                            Registration:
                          </Text>
                          <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13, flex: 1 }]}>
                            {company.registrationNumber}
                          </Text>
                        </View>
                      )}
                      {company.industry && (
                        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                          <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13, fontWeight: '500', minWidth: 100 }]}>
                            Industry:
                          </Text>
                          <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13, flex: 1 }]}>
                            {company.industry}
                          </Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13, fontWeight: '500', minWidth: 100 }]}>
                          Status:
                        </Text>
                        <View style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                          backgroundColor: company.isActive ? '#16a34a15' : '#dc262615'
                        }}>
                          <Text style={[styles.staffDetails, { 
                            fontSize: 12, 
                            fontWeight: '600',
                            color: company.isActive ? '#16a34a' : '#dc2626'
                          }]}>
                            {company.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Hint */}
                    <Text style={[styles.clickHint, dynamicStyles.clickHint, { marginTop: 8, fontSize: 12 }]}>
                      Tap card to view departments and interns →
                    </Text>
                  </View>
                  
                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'column', gap: 8, alignItems: 'flex-end', justifyContent: 'flex-start', paddingLeft: 12 }}>
                    <TouchableOpacity
                      style={styles.exportIconButton}
                      onPress={async (e) => {
                        e.stopPropagation();
                        await exportHostCompanyPDF(company);
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
                    <TouchableOpacity
                      style={[styles.editButton, dynamicStyles.editButton, { minWidth: 70 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditHostCompany(company);
                      }}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteButton, dynamicStyles.deleteButton, { minWidth: 70 }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteHostCompany(company);
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

        {/* Host Company Modal */}
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
      </View>
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
      const response = await axios.get(`${API_BASE_URL}/staff/admin/departments/all`, { params });
      if (response.data.success) {
        const depts = response.data.departments;
        // Load intern counts for each department
        const departmentsWithCounts = await Promise.all(
          depts.map(async (dept) => {
            try {
              const internsResponse = await axios.get(`${API_BASE_URL}/staff/admin/staff`, {
                params: { department: dept.name, ...(isHostCompany && { hostCompanyId }) }
              });
              return {
                ...dept,
                internCount: internsResponse.data.success ? internsResponse.data.staff.length : 0
              };
            } catch (error) {
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
      
      // Load departments for this host company
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
      
      // Load all interns for this host company
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
  
  const handleViewDepartmentDetails = (dept) => {
    setSelectedDepartment(dept);
    setShowDepartmentDetails(true);
  };
  
  const handleViewHostCompanyDetails = async (company) => {
    setSelectedHostCompany(company);
    setShowHostCompanyDetails(true);
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
                style={[styles.staffCard, dynamicStyles.staffCard]}
                onPress={() => handleViewDepartmentDetails(dept)}
                activeOpacity={0.7}
              >
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
            <View style={[styles.modalContent, dynamicStyles.modalContent]}>
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
    // Group items by person and count violations
    const groupedByPerson = notAccountable.reduce((acc, item) => {
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
      
      // Collect violations (wrong time clock-ins/outs/breaks)
      if (item.clockInTime && item.expectedClockIn) {
        acc[key].violations.push({
          type: 'CLOCK-IN',
          actual: item.clockInTime,
          expected: item.expectedClockIn
        });
      }
      if (item.clockOutTime && item.expectedClockOut) {
        acc[key].violations.push({
          type: 'CLOCK-OUT',
          actual: item.clockOutTime,
          expected: item.expectedClockOut
        });
      }
      if (item.breakStartTime && item.expectedBreakStart) {
        acc[key].violations.push({
          type: 'STARTED BREAK',
          actual: item.breakStartTime,
          expected: item.expectedBreakStart
        });
      }
      if (item.breakEndTime && item.expectedBreakEnd) {
        acc[key].violations.push({
          type: 'ENDED BREAK',
          actual: item.breakEndTime,
          expected: item.expectedBreakEnd
        });
      }
      
      return acc;
    }, {});

    const groupedList = Object.values(groupedByPerson);

    return (
      <View style={styles.content}>
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
            groupedList.map((person, index) => (
              <TouchableOpacity
                key={person.staffId || person.staffName || index}
                style={[styles.notAccountableCard, dynamicStyles.notAccountableCard]}
                onPress={() => handleViewDayDetails(person.staffId || person.staffName, selectedDate)}
                activeOpacity={0.7}
              >
                <View style={styles.notAccountableCardContent}>
                  <Text style={[styles.notAccountableName, dynamicStyles.notAccountableName]}>
                    {person.staffName}
                  </Text>
                  
                  {/* Show violations in red */}
                  {person.violations.length > 0 && (
                    <View style={{ marginTop: 8, marginBottom: 8 }}>
                      {person.violations.map((violation, vIndex) => (
                        <Text key={vIndex} style={{ color: '#dc2626', fontSize: 13, fontWeight: '500', marginBottom: 4 }}>
                          {violation.type} AT WRONG TIME ({violation.actual}) EXPECTED ({violation.expected})
                        </Text>
                      ))}
                      <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                        ({person.violations.length} {person.violations.length === 1 ? 'time' : 'times'})
                      </Text>
                    </View>
                  )}
                  
                  {/* Show other reasons if no violations but has other issues */}
                  {person.violations.length === 0 && person.items[0]?.reason && (
                    <Text style={[styles.notAccountableReason, dynamicStyles.notAccountableReason]}>
                      {person.items[0].reason}
                    </Text>
                  )}
                  
                  {person.items[0]?.details && person.violations.length === 0 && (
                    <Text style={[styles.notAccountableDetails, dynamicStyles.notAccountableDetails]}>
                      {person.items[0].details}
                    </Text>
                  )}
                </View>
                <Text style={[styles.notAccountableArrow, dynamicStyles.notAccountableArrow]}>›</Text>
              </TouchableOpacity>
            ))
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
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
          {isAdmin ? 'Admin Dashboard' : `${userInfo.name || 'Company'} Dashboard`}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.logoutButton}
        >
          <Text style={[styles.logoutText, dynamicStyles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>

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
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'dashboard' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                📊 Dashboard
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
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'staff' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                👥 View Staff
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
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText
              ]}>
                ➕ Register Staff
              </Text>
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
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'notAccountable' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                ⚠️ Not Accountable
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
              <Text style={[
                styles.sidebarItemText,
                dynamicStyles.sidebarItemText,
                activeView === 'departments' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
              ]}>
                📋 Departments
              </Text>
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
                  <Text style={[
                    styles.sidebarItemText,
                    dynamicStyles.sidebarItemText,
                    activeView === 'hostCompanies' && [styles.sidebarItemTextActive, dynamicStyles.sidebarItemTextActive]
                  ]}>
                    🏢 Host Companies
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
              {activeView === 'departments' && renderDepartments()}
            </>
          )}
        </View>
      </View>

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

      {/* Day Details Modal */}
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
          <View style={[styles.dayDetailsModal, dynamicStyles.modalContent]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Day Details</Text>
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
                <View style={[styles.dayDetailsStaffInfo, dynamicStyles.dayDetailsStaffInfo]}>
                  <Text style={[styles.dayDetailsStaffName, dynamicStyles.dayDetailsStaffName]}>
                    {selectedDayDetails.staff?.name}
                  </Text>
                  <Text style={[styles.dayDetailsDate, dynamicStyles.dayDetailsDate]}>
                    {new Date(selectedDayDetails.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>

                <View style={[styles.dayDetailsSummary, dynamicStyles.dayDetailsSummary]}>
                  <Text style={[styles.dayDetailsSectionTitle, dynamicStyles.dayDetailsSectionTitle]}>Summary</Text>
                  <View style={styles.summaryGrid}>
                    <View style={[styles.summaryItem, dynamicStyles.summaryItem]}>
                      <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Clock-In</Text>
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
                        {selectedDayDetails.summary?.clockIn
                          ? new Date(selectedDayDetails.summary.clockIn.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Not recorded'}
                      </Text>
                    </View>
                    <View style={[styles.summaryItem, dynamicStyles.summaryItem]}>
                      <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>Start Break</Text>
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
                        {selectedDayDetails.summary?.startBreak
                          ? new Date(selectedDayDetails.summary.startBreak.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'Not recorded'}
                      </Text>
                    </View>
                    <View style={[styles.summaryItem, dynamicStyles.summaryItem]}>
                      <Text style={[styles.summaryLabel, dynamicStyles.summaryLabel]}>End Break</Text>
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
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
                      <Text style={[styles.summaryValue, dynamicStyles.summaryValue]}>
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
                    borderLeftWidth: 3,
                    borderLeftColor: '#dc2626'
                  }}>
                    <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' }}>
                      {selectedDayDetails.extraHours}
                    </Text>
                  </View>
                )}

                {selectedDayDetails.logs && selectedDayDetails.logs.length > 0 && (
                  <View style={[styles.dayDetailsLogs, dynamicStyles.dayDetailsLogs]}>
                    <Text style={[styles.dayDetailsSectionTitle, dynamicStyles.dayDetailsSectionTitle]}>All Logs</Text>
                    {selectedDayDetails.logs.map((log, index) => (
                      <View key={index} style={[styles.logItem, dynamicStyles.logItem]}>
                        <Text style={[styles.logType, dynamicStyles.logType]}>
                          {log.clockType === 'in' ? '🕐 Clock-In' :
                           log.clockType === 'break_start' ? '🍽️ Start Break' :
                           log.clockType === 'break_end' ? '🍽️ End Break' :
                           '🕐 Clock-Out'}
                        </Text>
                        <Text style={[styles.logTime, dynamicStyles.logTime]}>{log.time}</Text>
                        <Text style={[styles.logDateTime, dynamicStyles.logDateTime]}>{log.dateTime}</Text>
                        <Text style={[styles.logConfidence, dynamicStyles.logConfidence]}>
                          Confidence: {log.confidence}%
                        </Text>
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
          <View style={[styles.modalContent, dynamicStyles.modalContent, { maxHeight: '90%' }]}>
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
          <View style={[styles.modalContent, dynamicStyles.modalContent, { maxHeight: '85%' }]}>
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

      {/* Host Company Details Modal */}
      <Modal
        visible={showHostCompanyDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowHostCompanyDetails(false);
          setSelectedHostCompany(null);
          setHostCompanyDepartments([]);
          setHostCompanyInterns([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent, { maxHeight: '90%' }]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                {selectedHostCompany?.name || 'Host Company'} - Details
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
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
                <TouchableOpacity
                  onPress={() => {
                    setShowHostCompanyDetails(false);
                    setSelectedHostCompany(null);
                    setHostCompanyDepartments([]);
                    setHostCompanyInterns([]);
                  }}
                >
                  <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingHostCompanyDetails ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading details...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalBody}>
                {/* Company Summary Section */}
                {selectedHostCompany && (
                  <View style={{
                    backgroundColor: theme.primary + '08',
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 20
                  }}>
                    <Text style={[styles.modalLabel, dynamicStyles.modalLabel, { fontSize: 18, marginBottom: 8 }]}>
                      {selectedHostCompany.name}
                    </Text>
                    {selectedHostCompany.companyName && (
                      <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { marginBottom: 8 }]}>
                        {selectedHostCompany.companyName}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                      <View>
                        <Text style={[styles.statLabel, dynamicStyles.statLabel, { fontSize: 11 }]}>Departments</Text>
                        <Text style={[styles.statValue, dynamicStyles.statValue, { fontSize: 20, fontWeight: 'bold' }]}>
                          {hostCompanyDepartments.length}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.statLabel, dynamicStyles.statLabel, { fontSize: 11 }]}>Interns Available</Text>
                        <Text style={[styles.statValue, dynamicStyles.statValue, { fontSize: 20, fontWeight: 'bold' }]}>
                          {hostCompanyInterns.length}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Departments Section */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={[styles.modalLabel, dynamicStyles.modalLabel, { fontSize: 18, fontWeight: 'bold' }]}>
                      Departments
                    </Text>
                    <View style={{
                      backgroundColor: theme.primary + '15',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12
                    }}>
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>
                        {hostCompanyDepartments.length}
                      </Text>
                    </View>
                  </View>
                  {hostCompanyDepartments.length === 0 ? (
                    <View style={{
                      padding: 20,
                      backgroundColor: theme.background + '80',
                      borderRadius: 8,
                      alignItems: 'center'
                    }}>
                      <Text style={[styles.emptyText, dynamicStyles.emptyText, { fontSize: 14 }]}>
                        No departments found
                      </Text>
                    </View>
                  ) : (
                    hostCompanyDepartments.map((dept) => (
                      <TouchableOpacity
                        key={dept._id}
                        style={[styles.detailCard, dynamicStyles.staffCard, { 
                          marginBottom: 12, 
                          padding: 16,
                          borderLeftWidth: 3,
                          borderLeftColor: theme.primary
                        }]}
                        onPress={() => {
                          setShowHostCompanyDetails(false);
                          setSelectedDepartment(dept);
                          setShowDepartmentDetails(true);
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Department Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.detailSectionTitle, dynamicStyles.staffName, { fontSize: 16, marginBottom: 4 }]}>
                              {dept.name}
                            </Text>
                            {dept.departmentCode && (
                              <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 12, opacity: 0.7 }]}>
                                Code: {dept.departmentCode}
                              </Text>
                            )}
                          </View>
                          <View style={[styles.internCountBadge, { backgroundColor: theme.primary + '15', paddingHorizontal: 10, paddingVertical: 6 }]}>
                            <Text style={[styles.internCountText, { color: theme.primary, fontSize: 12, fontWeight: '600' }]}>
                              {dept.internCount || 0} {dept.internCount === 1 ? 'Intern' : 'Interns'}
                            </Text>
                          </View>
                        </View>

                        {/* Department Info - Compact */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                          {dept.description && (
                            <View style={{ flex: 1, minWidth: '100%' }}>
                              <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13 }]} numberOfLines={2}>
                                {dept.description}
                              </Text>
                            </View>
                          )}
                          {dept.location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '45%' }}>
                              <Text style={{ fontSize: 12, marginRight: 4 }}>📍</Text>
                              <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 12 }]} numberOfLines={1}>
                                {dept.location}
                              </Text>
                            </View>
                          )}
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4,
                              backgroundColor: dept.isActive ? '#16a34a15' : '#dc262615'
                            }}>
                              <Text style={{ 
                                fontSize: 11, 
                                fontWeight: '600',
                                color: dept.isActive ? '#16a34a' : '#dc2626'
                              }}>
                                {dept.isActive ? 'Active' : 'Inactive'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                {/* Interns Section */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={[styles.modalLabel, dynamicStyles.modalLabel, { fontSize: 18, fontWeight: 'bold' }]}>
                      Interns Available
                    </Text>
                    <View style={{
                      backgroundColor: theme.primary + '15',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12
                    }}>
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>
                        {hostCompanyInterns.length}
                      </Text>
                    </View>
                  </View>
                  {hostCompanyInterns.length === 0 ? (
                    <View style={{
                      padding: 20,
                      backgroundColor: theme.background + '80',
                      borderRadius: 8,
                      alignItems: 'center'
                    }}>
                      <Text style={[styles.emptyText, dynamicStyles.emptyText, { fontSize: 14 }]}>
                        No interns found
                      </Text>
                    </View>
                  ) : (
                    hostCompanyInterns.map((intern) => (
                      <View 
                        key={intern._id} 
                        style={[styles.detailCard, dynamicStyles.staffCard, { 
                          marginBottom: 12, 
                          padding: 16,
                          borderLeftWidth: 3,
                          borderLeftColor: intern.isActive ? '#16a34a' : '#dc2626'
                        }]}
                      >
                        {/* Intern Header */}
                        <View style={{ marginBottom: 12 }}>
                          <Text style={[styles.detailSectionTitle, dynamicStyles.staffName, { fontSize: 16, marginBottom: 4 }]}>
                            {intern.name} {intern.surname}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            {intern.role && (
                              <View style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 4,
                                backgroundColor: theme.primary + '15'
                              }}>
                                <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '500' }}>
                                  {intern.role}
                                </Text>
                              </View>
                            )}
                            {intern.department && (
                              <View style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 4,
                                backgroundColor: theme.background + '80'
                              }}>
                                <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 11 }]}>
                                  {intern.department}
                                </Text>
                              </View>
                            )}
                            <View style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4,
                              backgroundColor: intern.isActive ? '#16a34a15' : '#dc262615'
                            }}>
                              <Text style={{ 
                                fontSize: 11, 
                                fontWeight: '600',
                                color: intern.isActive ? '#16a34a' : '#dc2626'
                              }}>
                                {intern.isActive ? 'Active' : 'Inactive'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {/* Intern Info - Compact Grid */}
                        <View style={{ 
                          flexDirection: 'row', 
                          flexWrap: 'wrap', 
                          gap: 12 
                        }}>
                          {intern.idNumber && (
                            <View style={{ flex: 1, minWidth: '45%' }}>
                              <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 11, opacity: 0.7, marginBottom: 2 }]}>
                                ID Number
                              </Text>
                              <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13 }]}>
                                {intern.idNumber}
                              </Text>
                            </View>
                          )}
                          {intern.phoneNumber && (
                            <View style={{ flex: 1, minWidth: '45%' }}>
                              <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 11, opacity: 0.7, marginBottom: 2 }]}>
                                Phone
                              </Text>
                              <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13 }]}>
                                {intern.phoneNumber}
                              </Text>
                            </View>
                          )}
                          {intern.location && (
                            <View style={{ flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, marginRight: 4 }}>📍</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 11, opacity: 0.7, marginBottom: 2 }]}>
                                  Location
                                </Text>
                                <Text style={[styles.staffDetails, dynamicStyles.staffDetails, { fontSize: 13 }]} numberOfLines={1}>
                                  {intern.location}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
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
    width: '48%',
    minWidth: 140,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
    justifyContent: 'space-between',
    minHeight: 120,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
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
    fontSize: 14,
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
});

