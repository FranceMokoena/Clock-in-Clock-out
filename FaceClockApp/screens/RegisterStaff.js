import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  ScrollView,
  Modal,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { useTheme } from '../context/ThemeContext';
import { getDeviceHeaders } from '../utils/deviceInfo';
import { analyzeFrame, FaceDetectionFeedback, resetFrameAnalysis } from '../utils/faceDetectionFeedback';
import { ProfessionalFeedback } from '../components/ProfessionalFeedback';

/**
 * Professional Bank-Grade Feedback: Minimal, clean, enterprise-style messages
 */
function getFriendlyMessage(backendFeedback, metadata, issues = []) {
  const feedback = (backendFeedback || '').toLowerCase();
  const hasFace = metadata?.faceCount > 0;
  
  // No face detected
  if (!hasFace || feedback.includes('position your face') || feedback.includes('no face')) {
    return {
      message: 'Position face in frame',
      status: 'warning',
      color: '#f59e0b',
    };
  }
  
  // Multiple faces
  if (metadata?.faceCount > 1 || feedback.includes('multiple faces')) {
    return {
      message: 'Single person only',
      status: 'error',
      color: '#dc2626',
    };
  }
  
  // Face too far / too small
  if (feedback.includes('move closer') || feedback.includes('too small') || metadata?.distance === 'far' || metadata?.size === 'too_small') {
    return {
      message: 'Move closer',
      status: 'warning',
      color: '#f59e0b',
    };
  }
  
  // Face too close / too large
  if (feedback.includes('move further') || feedback.includes('too large') || feedback.includes('farther away') || metadata?.distance === 'too_close' || metadata?.size === 'too_large') {
    return {
      message: 'Move back slightly',
      status: 'warning',
      color: '#f59e0b',
    };
  }
  
  // Angle issues - look straight
  if (feedback.includes('look straight') || feedback.includes('angle') || feedback.includes('straight into') || issues.includes('angle_too_tilted')) {
    return {
      message: 'Face camera directly',
      status: 'warning',
      color: '#f59e0b',
    };
  }
  
  // Eyes closed / not looking
  if (feedback.includes('open your eyes') || feedback.includes('eyes') || issues.includes('eyes_closed')) {
    return {
      message: 'Eyes open, look forward',
      status: 'warning',
      color: '#f59e0b',
    };
  }
  
  // Lighting issues
  if (feedback.includes('lighting') || feedback.includes('brightness') || feedback.includes('too dark') || feedback.includes('too bright')) {
    return {
      message: 'Adjust lighting',
      status: 'warning',
      color: '#f59e0b',
    };
  }
  
  // Blur / hold still
  if (feedback.includes('blur') || feedback.includes('hold still') || feedback.includes('too blurry')) {
    return {
      message: 'Hold still',
      status: 'warning',
      color: '#f59e0b',
    };
  }
  
  // Ready to capture
  if (feedback.includes('ready') || feedback.includes('perfect')) {
    return {
      message: 'Ready to capture',
      status: 'success',
      color: '#16a34a',
    };
  }
  
  // Almost ready
  if (feedback.includes('almost ready') || feedback.includes('almost')) {
    return {
      message: 'Almost ready',
      status: 'info',
      color: '#3b82f6',
    };
  }
  
  // Default / good position
  if (hasFace) {
    return {
      message: 'Positioning...',
      status: 'info',
      color: '#6b7280',
    };
  }
  
  // Fallback
  return {
    message: 'Position face in frame',
    status: 'warning',
    color: '#f59e0b',
  };
}

/**
 * Preview validation: Send a frame to the backend for real analysis.
 * The backend performs secure face detection and quality checks and
 * returns clear guidance for the user.
 */
async function validatePreviewWithBackend(imageUri) {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'preview.jpg',
    });

    // 🏦 BANK-GRADE Phase 3 & 4: Include device headers for fingerprinting
    const deviceHeaders = await getDeviceHeaders();
    
    const response = await fetch(`${API_BASE_URL}/staff/validate-preview`, {
      method: 'POST',
      body: formData,
      headers: {
        // 🏦 BANK-GRADE: Device fingerprinting headers
        'x-device-useragent': deviceHeaders.userAgent,
        'x-device-platform': deviceHeaders.platform,
        'x-device-language': deviceHeaders.language,
        'x-device-timezone': deviceHeaders.timezone,
        'x-device-id': deviceHeaders.deviceId,
        'x-device-info': deviceHeaders.deviceInfo,
        'x-device-hash': deviceHeaders.deviceHash,
      },
      // Don't set Content-Type header - let fetch set it with boundary
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Convert backend response to frontend format
    return {
      hasFace: (result.metadata?.faceCount || 0) > 0,
      quality: result.quality || 0,
      metadata: {
        faceCount: result.metadata?.faceCount || 0,
        angle: result.metadata?.angle || 0,
        size: result.metadata?.size || 'none',
        distance: result.metadata?.distance || 'unknown',
        faceSize: result.metadata?.faceSize,
      },
      ready: result.ready || false,
      feedback: result.feedback || 'Position your face in the circle',
      issues: result.issues || [],
    };
  } catch (error) {
    console.warn('⚠️ Preview validation error:', error.message);
    // Fallback: assume no face if validation fails
    return {
      hasFace: false,
      quality: 0,
      metadata: {
        faceCount: 0,
        angle: 0,
        size: 'none',
        distance: 'unknown',
      },
      ready: false,
      feedback: 'Unable to analyze. Please try again.',
      issues: ['validation_error'],
    };
  }
}

export default function RegisterStaff({ navigation, route }) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Get user info from route params (if logged in as host company)
  const userInfo = route?.params?.userInfo || null;
  const isAdmin = !userInfo || userInfo.type === 'admin';
  const isHostCompany = userInfo && userInfo.type === 'hostCompany';
  const userHostCompanyId = isHostCompany ? userInfo.id : null;
  
  // Form state
  const [showForm, setShowForm] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Staff');
  const [hostCompany, setHostCompany] = useState(userHostCompanyId || ''); // Auto-set for host company users
  const [showHostCompanyDropdown, setShowHostCompanyDropdown] = useState(false);
  const [hostCompanies, setHostCompanies] = useState([]); // Will be fetched from backend
  const [department, setDepartment] = useState(''); // Selected department
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [departments, setDepartments] = useState([]); // Will be fetched from backend
  const [filteredDepartments, setFilteredDepartments] = useState([]); // Filtered by company
  // Mentor removed: field and related state cleaned up
  const [location, setLocation] = useState(''); // Predefined location key
  const [customAddress, setCustomAddress] = useState(''); // Custom address input
  const [useCustomAddress, setUseCustomAddress] = useState(false); // Toggle between dropdown and custom
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locations, setLocations] = useState([]); // Will be fetched from backend
  const [filteredLocations, setFilteredLocations] = useState([]); // Filtered for search
  // ⏰ WORKING HOURS: Optional working hours assignment
  const [clockInTime, setClockInTime] = useState(''); // Format: "HH:MM" (e.g., "07:30")
  const [clockOutTime, setClockOutTime] = useState(''); // Format: "HH:MM" (e.g., "16:30")
  const [breakStartTime, setBreakStartTime] = useState(''); // Format: "HH:MM" (e.g., "13:00")
  const [breakEndTime, setBreakEndTime] = useState(''); // Format: "HH:MM" (e.g., "14:00")
  
  // ⏰ EXTRA HOURS: Optional extra hours availability
  const [hasExtraHours, setHasExtraHours] = useState(false);
  const [extraHoursStartTime, setExtraHoursStartTime] = useState(''); // Format: "HH:MM"
  const [extraHoursEndTime, setExtraHoursEndTime] = useState(''); // Format: "HH:MM"
  
  // Time picker modals
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState(null); // 'clockIn', 'clockOut', 'breakStart', 'breakEnd', 'extraHoursStart', 'extraHoursEnd'
  const [timePickerHour, setTimePickerHour] = useState(8);
  const [timePickerMinute, setTimePickerMinute] = useState(0);
  
  // Camera and capture state – capture 5 images for higher accuracy
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureStep, setCaptureStep] = useState(1); // 1, 2, 3, 4, or 5
  const [image1Uri, setImage1Uri] = useState(null);
  const [image2Uri, setImage2Uri] = useState(null);
  const [image3Uri, setImage3Uri] = useState(null);
  const [image4Uri, setImage4Uri] = useState(null);
  const [image5Uri, setImage5Uri] = useState(null);
  const [idImageUri, setIdImageUri] = useState(null); // 🏦 BANK-GRADE Phase 5: ID document image
  const [loadingMessage, setLoadingMessage] = useState(''); // Friendly loading messages
  const [latestBackendResult, setLatestBackendResult] = useState(null); // Real backend validation result
  const [faceFeedback, setFaceFeedback] = useState('Position your face in the circle'); // Face capture feedback
  const [liveStatusMessage, setLiveStatusMessage] = useState('Position your face in the circle');
  const [liveQualityScore, setLiveQualityScore] = useState(0);
  const [liveFaceBox, setLiveFaceBox] = useState(null);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Show success modal
  const [registrationResult, setRegistrationResult] = useState(null); // Registration success data
  
  // Professional message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState({ title: '', message: '', type: 'info' }); // 'info', 'warning', 'error', 'success'
  
  const cameraRef = useRef(null);
  const liveFeedbackRef = useRef(new FaceDetectionFeedback());
  const lastToastMessageRef = useRef(''); // Prevent toast spam
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Get dynamic window dimensions
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  // Calculate circular frame dimensions
  const getCircleDimensions = () => {
    let circleSize;
    if (isLandscape) {
      circleSize = Math.min(width * 0.55, height * 0.65);
    } else {
      circleSize = Math.min(width * 0.75, height * 0.5);
    }
    return { 
      width: circleSize, 
      height: circleSize, 
      borderRadius: circleSize / 2 
    };
  };
  
  const circleDimensions = getCircleDimensions();
  const mirroredPreview = captureStep !== 6;

  // Fetch host companies, departments and locations from backend on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch companies if admin (host company users can't select other companies)
      if (isAdmin) {
        try {
          // Fetch host companies
          const companiesResponse = await axios.get(`${API_BASE_URL}/staff/admin/host-companies`);
          if (companiesResponse.data && companiesResponse.data.success) {
            // Filter only active companies
            const activeCompanies = companiesResponse.data.companies.filter(c => c.isActive);
            setHostCompanies(activeCompanies);
            console.log(`✅ Loaded ${activeCompanies.length} active host companies from backend`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch host companies from backend:', error.message);
        }
      } else if (isHostCompany && userHostCompanyId) {
        // For host company users, set their company info
        // NOTE: userInfo.name is the mentor name, userInfo.companyName is the company name
        setHostCompanies([{
          _id: userHostCompanyId,
          name: userInfo.name, // This is mentor name (for backend compatibility)
          companyName: userInfo.companyName // This is the actual company name (for display)
        }]);
        setHostCompany(userHostCompanyId); // Auto-select their company
      }
      
      try {
        // Fetch all departments
        const deptResponse = await axios.get(`${API_BASE_URL}/staff/admin/departments/all`);
        if (deptResponse.data && deptResponse.data.success) {
          const allDepartments = deptResponse.data.departments || [];
          setDepartments(allDepartments);
          setFilteredDepartments(allDepartments);
          console.log(`✅ Loaded ${allDepartments.length} departments from backend`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch departments from backend:', error.message);
      }
      
      // Mentors removed from registration form — skipping mentor fetch

      try {
        // Fetch all locations from backend
        const response = await axios.get(`${API_BASE_URL}/locations/all`);
        if (response.data && response.data.success && response.data.locations) {
          setLocations(response.data.locations);
          setFilteredLocations(response.data.locations);
          console.log(`✅ Loaded ${response.data.locations.length} locations from backend`);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch locations from backend, using fallback list:', error.message);
        // Fallback to basic locations if API fails
        const fallbackLocations = [
          { key: 'MBOMBELA', name: 'Mbombela (Nelspruit)', address: 'Mbombela, Mpumalanga' },
          { key: 'WHITE_RIVER', name: 'White River', address: 'White River, Mpumalanga' },
          { key: 'JOHANNESBURG', name: 'Johannesburg', address: 'Johannesburg, Gauteng' },
          { key: 'CAPE_TOWN', name: 'Cape Town', address: 'Cape Town, Western Cape' },
          { key: 'DURBAN', name: 'Durban', address: 'Durban, KwaZulu-Natal' },
        ];
        setLocations(fallbackLocations);
        setFilteredLocations(fallbackLocations);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    liveFeedbackRef.current.reset();
    resetFrameAnalysis();
    setLiveFaceBox(null);
    setLiveQualityScore(0);
    setLiveStatusMessage('Position your face in the circle');
  }, [showCamera]);
  
  // Filter departments by selected company
  useEffect(() => {
    if (!hostCompany) {
      // If no company selected, show no departments
      setFilteredDepartments([]);
      setDepartment(''); // Clear selected department
    } else {
      // Filter departments that belong to the selected company
      const filtered = departments.filter(dept => {
        // Check if department has hostCompanyId that matches selected company
        const deptCompanyId = dept.hostCompanyId ? dept.hostCompanyId.toString() : null;
        const selectedCompanyId = hostCompany.toString();
        return deptCompanyId === selectedCompanyId;
      });
      setFilteredDepartments(filtered);
      // Clear selected department if it doesn't belong to the new company
      if (department) {
        const currentDept = departments.find(d => d._id === department);
        if (currentDept && currentDept.hostCompanyId?.toString() !== selectedCompanyId) {
          setDepartment('');
        }
      }
    }
  }, [departments, hostCompany]);

  // Mentors removed: no dynamic mentor fetching on hostCompany/department changes

  // Mentors removed: no department mentor name fetch required

  // Filter locations based on search query
  useEffect(() => {
    if (!locationSearchQuery || locationSearchQuery.trim().length === 0) {
      setFilteredLocations(locations);
    } else {
      const query = locationSearchQuery.toLowerCase().trim();
      const filtered = locations.filter(loc => 
        loc.name.toLowerCase().includes(query) ||
        loc.address.toLowerCase().includes(query) ||
        (loc.province && loc.province.toLowerCase().includes(query))
      );
      setFilteredLocations(filtered);
    }
  }, [locationSearchQuery, locations]);

  // Show professional message modal
  const showProfessionalMessage = (title, message, type = 'info') => {
    setMessageModalData({ title, message, type });
    setShowMessageModal(true);
  };

  // Robust South African ID Number validation (YYMMDDGSSSCAZ format)
  const validateIDNumber = (id) => {
    // Remove any spaces or dashes
    const cleaned = id.replace(/[\s\-]/g, '');
    
    // Must be exactly 13 digits
    if (!/^\d{13}$/.test(cleaned)) {
      return { 
        valid: false, 
        error: 'Invalid ID Number Format',
        details: 'South African ID numbers must contain exactly 13 digits. Please check and try again.'
      };
    }
    
    // Extract components (YYMMDDGSSSCAZ)
    const year = parseInt(cleaned.substring(0, 2));
    const month = parseInt(cleaned.substring(2, 4));
    const day = parseInt(cleaned.substring(4, 6));
    const gender = parseInt(cleaned.substring(6, 7));
    const sequence = parseInt(cleaned.substring(7, 10));
    const citizenship = parseInt(cleaned.substring(10, 11));
    const checksum = parseInt(cleaned.substring(12, 13));
    
    // Validate month (01-12)
    if (month < 1 || month > 12) {
      return { 
        valid: false, 
        error: 'Invalid Birth Month',
        details: `The month in your ID number (${cleaned.substring(2, 4)}) is invalid. Month must be between 01 and 12.`
      };
    }
    
    // Validate day (01-31)
    if (day < 1 || day > 31) {
      return { 
        valid: false, 
        error: 'Invalid Birth Day',
        details: `The day in your ID number (${cleaned.substring(4, 6)}) is invalid. Day must be between 01 and 31.`
      };
    }
    
    // Validate date exists (check for impossible dates like Feb 30, Apr 31, etc.)
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return { 
        valid: false, 
        error: 'Invalid Birth Date',
        details: `The date ${day}/${month} is invalid. ${monthNames[month - 1]} only has ${daysInMonth[month - 1]} days.`
      };
    }
    
    // Additional validation: Check for Feb 29 in non-leap years (simplified - assumes 00, 04, 08, etc. are leap years)
    if (month === 2 && day === 29) {
      const isLeapYear = (year % 4 === 0);
      if (!isLeapYear) {
        return { 
          valid: false, 
          error: 'Invalid Birth Date',
          details: `February 29 is only valid in leap years. Please verify your birth date.`
        };
      }
    }
    
    // Validate gender digit (0-9, but should be reasonable)
    if (gender < 0 || gender > 9) {
      return { 
        valid: false, 
        error: 'Invalid ID Number Format',
        details: 'The gender digit in your ID number is invalid. Please check and try again.'
      };
    }
    
    // Validate sequence number (000-999)
    if (sequence < 0 || sequence > 999) {
      return { 
        valid: false, 
        error: 'Invalid ID Number Format',
        details: 'The sequence number in your ID number is invalid. Please check and try again.'
      };
    }
    
    // Validate citizenship (0 = SA citizen, 1 = permanent resident)
    if (citizenship !== 0 && citizenship !== 1) {
      return { 
        valid: false, 
        error: 'Invalid ID Number Format',
        details: 'The citizenship digit in your ID number is invalid. It must be 0 (SA citizen) or 1 (permanent resident).'
      };
    }
    
    // Validate checksum using Luhn algorithm variant for SA ID
    // SA ID uses a modified Luhn algorithm
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      let digit = parseInt(cleaned[i]);
      if (i % 2 === 0) {
        // Even positions (0-indexed): multiply by 1
        sum += digit;
      } else {
        // Odd positions: multiply by 2, then sum digits if > 9
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
        sum += digit;
      }
    }
    
    const calculatedChecksum = (10 - (sum % 10)) % 10;
    if (calculatedChecksum !== checksum) {
      return { 
        valid: false, 
        error: 'Invalid ID Number Checksum',
        details: 'The checksum digit in your ID number is incorrect. This ID number does not pass validation. Please verify the number and try again.'
      };
    }
    
    // Additional validation: Check if date is not in the future
    const currentYear = new Date().getFullYear() % 100;
    const fullYear = year <= currentYear ? 2000 + year : 1900 + year;
    const birthDate = new Date(fullYear, month - 1, day);
    const today = new Date();
    
    if (birthDate > today) {
      return { 
        valid: false, 
        error: 'Invalid Birth Date',
        details: 'The birth date in your ID number appears to be in the future. Please verify and try again.'
      };
    }
    
    // Check if person is too old (reasonable limit: 150 years)
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age > 150) {
      return { 
        valid: false, 
        error: 'Invalid Birth Date',
        details: 'The birth date in your ID number indicates an age over 150 years, which is not valid. Please verify and try again.'
      };
    }
    
    return { valid: true };
  };

  // Validate phone number (basic validation)
  const validatePhoneNumber = (phone) => {
    // Remove spaces and common characters
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Should be 10 digits (South African format) or 11 digits (with country code)
    if (!/^(\+?27|0)?[1-9]\d{8}$/.test(cleaned)) {
      return { valid: false, error: 'Please enter a valid phone number' };
    }
    return { valid: true };
  };

  // Handle form submission
  const handleFormSubmit = () => {
    // Validate all fields - show professional modals
    if (!name.trim()) {
      showProfessionalMessage(
        'Name Required',
        'Please enter your first name to continue with registration.',
        'warning'
      );
      return;
    }
    
    if (!surname.trim()) {
      showProfessionalMessage(
        'Surname Required',
        'Please enter your surname to continue with registration.',
        'warning'
      );
      return;
    }
    
    const idValidation = validateIDNumber(idNumber.trim());
    if (!idValidation.valid) {
      showProfessionalMessage(
        idValidation.error || 'Invalid ID Number',
        idValidation.details || 'Please check your ID number and try again.',
        'error'
      );
      return;
    }
    
    const phoneValidation = validatePhoneNumber(phoneNumber.trim());
    if (!phoneValidation.valid) {
      showProfessionalMessage(
        phoneValidation.error || 'Invalid Phone Number',
        phoneValidation.details || 'Please check your phone number and try again.',
        'error'
      );
      return;
    }
    
    // Validate password for Staff and Intern roles
    if (role === 'Staff' || role === 'Intern') {
      if (!password.trim()) {
        showProfessionalMessage(
          'Password Required',
          'Password is required for Staff and Intern roles. Please enter a password (minimum 6 characters).',
          'warning'
        );
        return;
      }
      if (password.trim().length < 6) {
        showProfessionalMessage(
          'Password Too Short',
          'Password must be at least 6 characters long. Please enter a stronger password.',
          'error'
        );
        return;
      }
      if (password.trim().length > 128) {
        showProfessionalMessage(
          'Password Too Long',
          'Password must be less than 128 characters. Please enter a shorter password.',
          'error'
        );
        return;
      }
    }
    if (!phoneValidation.valid) {
      showProfessionalMessage(
        'Invalid Phone Number',
        'Please enter a valid South African phone number (10 digits, starting with 0, or 11 digits with country code +27).',
        'warning'
      );
      return;
    }
    
    if (!role) {
      showProfessionalMessage(
        'Role Required',
        'Please select your role (Intern, Staff, or Other) to continue.',
        'warning'
      );
      return;
    }
    
    // Host company is required (auto-set for host company users, must select for admin)
    if (!hostCompany) {
      showProfessionalMessage(
        'Company Required',
        'Please select a company to continue with registration.',
        'warning'
      );
      return;
    }
    
    // CRITICAL: Host company users can ONLY register staff for their own company
    if (isHostCompany && hostCompany !== userHostCompanyId) {
      showProfessionalMessage(
        'Company Selection Error',
        'You can only register staff members for your own company. Please contact an administrator if you need to register staff for another company.',
        'error'
      );
      return;
    }
    
    if (!department) {
      showProfessionalMessage(
        'Department Required',
        'Please select a department to continue with registration.',
        'warning'
      );
      return;
    }
    
    // Validate location OR custom address
    if (!useCustomAddress && !location) {
      showProfessionalMessage(
        'Location Required',
        'Please select a location from the list or enter a custom address to continue.',
        'warning'
      );
      return;
    }
    
    if (useCustomAddress && !customAddress.trim()) {
      showProfessionalMessage(
        'Address Required',
        'Please enter a complete address to continue with registration.',
        'warning'
      );
      return;
    }
    
    // Request camera permission if not granted
    if (!permission?.granted) {
      requestPermission().then((result) => {
        if (result.granted) {
          setShowForm(false);
          setShowCamera(true);
          setCaptureStep(1);
        } else {
          showProfessionalMessage(
            'Camera Permission Required',
            'Camera access is required to capture your photo for registration. Please enable camera permissions in your device settings and try again.',
            'error'
          );
        }
      });
    } else {
      setShowForm(false);
      setShowCamera(true);
      setCaptureStep(1);
    }
  };

  // Ref to store latest capturePhoto function for auto-capture
  const capturePhotoRef = useRef(null);

  const handleLiveDetection = (detection) => {
    if (!detection) {
      setLiveFaceBox(null);
      setLiveQualityScore(0);
      setLiveStatusMessage('Position your face in the circle');
      return;
    }

    try {
      const feedback = liveFeedbackRef.current.update(
        detection,
        detection.hasFace,
        detection.quality,
        detection.metadata
      );
      if (feedback?.message) {
        setLiveStatusMessage(feedback.message);
      }
      setLiveQualityScore(detection.quality || 0);
    } catch (err) {
      console.warn('⚠️ Live feedback error:', err?.message || err);
    }

    const normalizedBox = getNormalizedBox(detection.metadata);
    if (normalizedBox) {
      setLiveFaceBox(normalizedBox);
    } else {
      setLiveFaceBox(null);
    }
  };

  // Capture photo
  const capturePhoto = async () => {
    if (capturing || loading || !cameraRef.current) return;

    setCapturing(true);
    
    // Animate button press
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      if (cameraRef.current) {
        // ENTERPRISE: Check for multiple faces BEFORE capture
        // Capture a quick preview frame to check for multiple faces
        try {
          const previewFrame = await cameraRef.current.takePictureAsync({
            quality: 0.3, // Low quality for fast processing
            base64: false,
            skipProcessing: true,
          });
          
          // Check for multiple faces using face detection
          const detectionResult = await analyzeFrame(previewFrame.uri);
          
          // ENTERPRISE: Reject if multiple faces detected
          if (detectionResult.metadata?.faceCount > 1) {
            showProfessionalMessage(
              'Multiple Faces Detected',
              'Only one person should be in the frame. Please ensure you are alone when capturing your photo.',
              'warning'
            );
            setCapturing(false);
            
            // Clean up preview frame
            try {
              await FileSystem.deleteAsync(previewFrame.uri, { idempotent: true });
            } catch (e) {}
            
            return; // Don't proceed with capture
          }
          
          // Clean up preview frame
          try {
            await FileSystem.deleteAsync(previewFrame.uri, { idempotent: true });
          } catch (e) {}
        } catch (detectionError) {
          // If face detection fails, warn but allow capture (backend will validate)
          console.warn('⚠️ Could not check for multiple faces before capture:', detectionError.message);
          // Continue with capture - backend will validate
        }
        
        // Capture photo
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        // Resize image to backend‑optimized quality (higher resolution improves accuracy)
        console.log('📐 Preparing image for secure face registration (high quality resize)...');
        const resizedPhoto = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.9, format: SaveFormat.JPEG }
        );
        console.log(`✅ Registration image prepared: ${resizedPhoto.width}x${resizedPhoto.height}`);

        // Store image based on capture step – 5 clear photos from different angles
        if (captureStep === 6) {
          // 🏦 BANK-GRADE Phase 5: ID document capture
          setIdImageUri(resizedPhoto.uri);
          setShowCamera(false);
          setShowForm(true);
          showProfessionalMessage(
            'ID Document Captured',
            'Your ID document has been captured successfully. You can now proceed with registration.',
            'success'
          );
        } else if (captureStep === 1) {
          setImage1Uri(resizedPhoto.uri);
          setCaptureStep(2);
          setFaceFeedback('Great! Capture from a slightly different angle (2/5)');
        } else if (captureStep === 2) {
          setImage2Uri(resizedPhoto.uri);
          setCaptureStep(3);
          setFaceFeedback('Excellent! One more with different lighting (3/5)');
        } else if (captureStep === 3) {
          setImage3Uri(resizedPhoto.uri);
          setCaptureStep(4);
          setFaceFeedback('Almost done! Capture with a slight smile (4/5)');
        } else if (captureStep === 4) {
          setImage4Uri(resizedPhoto.uri);
          setCaptureStep(5);
          setFaceFeedback('Last one! Neutral expression (5/5)');
        } else if (captureStep === 5) {
          setImage5Uri(resizedPhoto.uri);
          // All images captured (3-5), proceed to registration
          await registerStaff();
        }
      }
      } catch (error) {
        console.error('Error capturing photo:', error);
        showProfessionalMessage(
          'Capture Error',
          'Unable to capture photo. Please check your camera permissions and try again.',
          'error'
        );
    } finally {
      setCapturing(false);
    }
  };

  // Register staff with EXACTLY 5 images (ENTERPRISE requirement for 100% accuracy)
  const registerStaff = async () => {
    // ENTERPRISE: Backend requires EXACTLY 5 images for maximum accuracy and ensemble matching
    const images = [image1Uri, image2Uri, image3Uri, image4Uri, image5Uri].filter(uri => uri !== null);
    
    if (images.length !== 5) {
      showProfessionalMessage(
        'Incomplete Photo Capture',
        `Please capture all 5 required images. Currently ${images.length}/5 images have been captured. All 5 images are required for maximum accuracy.`,
        'warning'
      );
      return;
    }

    setLoading(true);
    
    // Friendly loading messages that rotate
    const friendlyMessages = [
      'Be patient while we add you to our system',
      'This won\'t take long, just a moment...',
      'Thank you for your time',
      'Processing your registration...',
      'Almost done...',
    ];
    
    let messageIndex = 0;
    setLoadingMessage(friendlyMessages[0]);
    
    // Rotate friendly messages every 3 seconds
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % friendlyMessages.length;
      setLoadingMessage(friendlyMessages[messageIndex]);
    }, 3000);
    
    // Cleanup function to clear interval when done
    const cleanup = () => {
      clearInterval(messageInterval);
    };
    
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('surname', surname.trim());
      formData.append('idNumber', idNumber.trim());
      formData.append('phoneNumber', phoneNumber.trim());
      formData.append('role', role);
      // Add password for Staff and Intern roles
      if (role === 'Staff' || role === 'Intern') {
        formData.append('password', password.trim());
      }
      if (hostCompany) {
        formData.append('hostCompanyId', hostCompany);
      }
      if (department) {
        formData.append('department', department);
      }
      // Mentor removed: no mentor fields appended to formData
      if (useCustomAddress) {
        formData.append('customAddress', customAddress.trim());
        // Don't send location if using custom address
      } else {
        formData.append('location', location);
      }
      
      // ⏰ WORKING HOURS: Add working hours if provided (optional)
      if (clockInTime && clockInTime.trim()) {
        formData.append('clockInTime', clockInTime.trim());
      }
      if (clockOutTime && clockOutTime.trim()) {
        formData.append('clockOutTime', clockOutTime.trim());
      }
      if (breakStartTime && breakStartTime.trim()) {
        formData.append('breakStartTime', breakStartTime.trim());
      }
      if (breakEndTime && breakEndTime.trim()) {
        formData.append('breakEndTime', breakEndTime.trim());
      }
      
      // ⏰ EXTRA HOURS: Add extra hours if enabled (optional)
      if (hasExtraHours) {
        if (extraHoursStartTime && extraHoursStartTime.trim()) {
          formData.append('extraHoursStartTime', extraHoursStartTime.trim());
        }
        if (extraHoursEndTime && extraHoursEndTime.trim()) {
          formData.append('extraHoursEndTime', extraHoursEndTime.trim());
        }
      }
      
      // Send 5 images for higher accuracy during face registration
      if (image1Uri) formData.append('image1', { uri: image1Uri, type: 'image/jpeg', name: 'photo1.jpg' });
      if (image2Uri) formData.append('image2', { uri: image2Uri, type: 'image/jpeg', name: 'photo2.jpg' });
      if (image3Uri) formData.append('image3', { uri: image3Uri, type: 'image/jpeg', name: 'photo3.jpg' });
      if (image4Uri) formData.append('image4', { uri: image4Uri, type: 'image/jpeg', name: 'photo4.jpg' });
      if (image5Uri) formData.append('image5', { uri: image5Uri, type: 'image/jpeg', name: 'photo5.jpg' });
      
      // 🏦 BANK-GRADE Phase 5: Add ID document image (REQUIRED for bank-grade accuracy)
      if (!idImageUri) {
        showProfessionalMessage(
          'ID Document Required',
          'Please capture a photo of your ID document. This is REQUIRED for registration as it serves as the stable anchor template for accurate face matching and bank-grade security.',
          'error'
        );
        return;
      }
      formData.append('idImage', { uri: idImageUri, type: 'image/jpeg', name: 'id_document.jpg' });
      console.log('🆔 ID document image included in registration (REQUIRED)');

      console.log(`📸 Sending ${images.length} images for secure face registration...`);
      console.log('⏱️ Request timeout set to 180 seconds to allow for secure processing.');
      
      // CRITICAL: Use fetch instead of axios for file uploads in React Native
      // axios sometimes doesn't properly encode FormData files in React Native
      // fetch handles React Native FormData correctly
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minute timeout
      
      let response;
      let responseData;
      
      // 🏦 BANK-GRADE Phase 3 & 4: Include device headers for fingerprinting and quality tracking
      const deviceHeaders = await getDeviceHeaders();
      
      try {
        response = await fetch(`${API_BASE_URL}/staff/register`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: {
            // 🏦 BANK-GRADE: Device fingerprinting headers
            'x-device-useragent': deviceHeaders.userAgent,
            'x-device-platform': deviceHeaders.platform,
            'x-device-language': deviceHeaders.language,
            'x-device-timezone': deviceHeaders.timezone,
            'x-device-id': deviceHeaders.deviceId,
            'x-device-info': deviceHeaders.deviceInfo,
            'x-device-hash': deviceHeaders.deviceHash,
          },
          // Don't set Content-Type - fetch will set it automatically with boundary
        });
        
        clearTimeout(timeoutId);
        
        // Parse response
        responseData = await response.json();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Re-throw with axios-like structure for error handling
        if (fetchError.name === 'AbortError') {
          const timeoutError = new Error('Request timeout');
          timeoutError.response = { status: 408, data: { error: 'Request timeout after 4 minutes' } };
          throw timeoutError;
        }
        // Network or other fetch errors
        const networkError = new Error(fetchError.message || 'Network error');
        networkError.response = { status: 0, data: { error: 'Network error - unable to connect to server' } };
        throw networkError;
      }
      
      // Create axios-like response object for compatibility
      const axiosLikeResponse = {
        status: response.status,
        data: responseData,
        statusText: response.statusText,
      };

      if (axiosLikeResponse.status >= 200 && axiosLikeResponse.status < 300) {
        cleanup(); // Clear interval on success
        if (axiosLikeResponse.data.success) {
          // 🏦 BANK-GRADE: Show success modal (EXACTLY like ClockIn.js)
          const resultData = {
            message: `${name.trim()} ${surname.trim()} registered successfully!`,
            staffName: `${name.trim()} ${surname.trim()}`,
            date: new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            time: new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            }),
            dateTime: new Date().toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            confidence: axiosLikeResponse.data.confidence || axiosLikeResponse.data.quality?.average || null,
          };
          
          setRegistrationResult(resultData);
          setShowSuccessModal(true);
        } else {
          throw new Error(axiosLikeResponse.data.error || axiosLikeResponse.data.message || 'Registration failed');
        }
      } else {
        throw new Error(`Server error: ${axiosLikeResponse.status} - ${axiosLikeResponse.data?.error || axiosLikeResponse.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      cleanup(); // Clear interval on error
      setLoadingMessage('');
      
      console.error('Error registering staff:', error);
      
      // Handle fetch errors differently than axios errors
      let errorResponse = null;
      if (error.response) {
        // Axios-like error (from our wrapper)
        errorResponse = error.response;
      } else if (error.name === 'AbortError') {
        // Timeout error
        errorResponse = { status: 408, data: { error: 'Request timeout' } };
      } else {
        // Try to parse error as JSON if it's a Response object
        try {
          if (error.json) {
            const errorData = await error.json();
            errorResponse = { status: error.status || 500, data: errorData };
          }
        } catch (e) {
          // Not a Response object, use error message
        }
      }
      
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        response: errorResponse?.data,
        status: errorResponse?.status,
      });
      
      let errorMessage = 'Failed to register staff member.';
      let failedImage = null; // 'image1', 'image2', or null
      
      // ENTERPRISE: Determine which image failed from error message (EXACTLY 5 images required)
      if (errorResponse?.data?.error) {
        const errorText = errorResponse.data.error.toLowerCase();
        
        // 🏦 BANK-GRADE: User-friendly error messages (non-technical, helpful)
        if (errorText.includes('liveness') || errorText.includes('photo') || errorText.includes('non-live')) {
          errorMessage = 'Please use a live camera, not photos';
        } else if (errorText.includes('too blurry') || errorText.includes('blur')) {
          errorMessage = 'Image is blurry. Hold still and ensure camera is focused';
        } else if (errorText.includes('brightness')) {
          errorMessage = 'Adjust lighting - move to a well-lit area';
        } else if (errorText.includes('too small') && errorText.includes('face')) {
          errorMessage = 'Move closer to the camera';
        } else if (errorText.includes('too large') && errorText.includes('face')) {
          errorMessage = 'Move slightly farther away';
        } else if (errorText.includes('image too small') || errorText.includes('minimum.*width')) {
          errorMessage = 'Camera quality too low. Please use a better camera';
        } else if (errorText.includes('facial features')) {
          errorMessage = 'Face features not clear. Face camera directly with good lighting';
        } else if (errorText.includes('multiple') || errorText.includes('only one') || errorText.includes('faces detected')) {
          errorMessage = 'Only one person should be in each image';
        } else if (errorText.includes('exactly 5') || errorText.includes('all 5 required')) {
          errorMessage = 'Please capture all 5 images';
          failedImage = 'insufficient';
        } else if (errorText.includes('first image') || errorText.includes('image 1') || errorText.includes('image1')) {
          failedImage = 'image1';
          errorMessage = 'Image 1 failed. Please retry';
        } else if (errorText.includes('second image') || errorText.includes('image 2') || errorText.includes('image2')) {
          failedImage = 'image2';
          errorMessage = 'Image 2 failed. Please retry';
        } else if (errorText.includes('third image') || errorText.includes('image 3') || errorText.includes('image3')) {
          failedImage = 'image3';
          errorMessage = 'Image 3 failed. Please retry';
        } else if (errorText.includes('fourth image') || errorText.includes('image 4') || errorText.includes('image4')) {
          failedImage = 'image4';
          errorMessage = 'Image 4 failed. Please retry';
        } else if (errorText.includes('fifth image') || errorText.includes('image 5') || errorText.includes('image5')) {
          failedImage = 'image5';
          errorMessage = 'Image 5 failed. Please retry';
        } else {
          errorMessage = errorResponse.data.error;
        }
      } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error' || error.message?.includes('Network Error')) {
        errorMessage = 'Connection issue. Please check your internet';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // ⚡ OPTIMIZED: Verify if registration actually succeeded before showing error
        console.log('⏱️ Request timed out - verifying if registration succeeded...');
        try {
          const verifyResponse = await axios.get(`${API_BASE_URL}/staff/verify-registration`, {
            params: { idNumber: idNumber.trim() },
            timeout: 10000, // 10 second timeout for verification
          });
          
          if (verifyResponse.data?.registered) {
            // Registration actually succeeded!
            showProfessionalMessage(
              'Registration Successful',
              'Your registration was completed successfully. You can now proceed to use the system.',
              'success'
            );
            // Reset all state
            setName('');
            setSurname('');
            setIdNumber('');
            setPhoneNumber('');
            setRole('Staff');
            setLocation('');
            setCustomAddress('');
            setUseCustomAddress(false);
            setImage1Uri(null);
            setImage2Uri(null);
            setImage3Uri(null);
            setImage4Uri(null);
            setImage5Uri(null);
            setCaptureStep(1);
            setShowCamera(false);
            setShowForm(true);
            navigation.navigate('MainMenu');
            return; // Exit early - success!
          }
        } catch (verifyError) {
          console.warn('⚠️ Could not verify registration status:', verifyError.message);
        }
        
        errorMessage = 'Processing is taking longer. Registration may have succeeded. Please check staff list';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Show appropriate retry options based on which image failed
      const alertButtons = [];
      const capturedCount = [image1Uri, image2Uri, image3Uri, image4Uri, image5Uri].filter(uri => uri !== null).length;
      
      if (failedImage === 'insufficient') {
        // Not enough images - continue capturing
        alertButtons.push(
          {
            text: 'Continue Capturing',
            style: 'default',
            onPress: () => {
              // Don't clear images, just continue from where we left off
              setFaceFeedback(`Continue capturing images (${capturedCount}/5). Aim for 5 clear photos in good lighting.`);
            }
          },
        );
      } else if (failedImage === 'image1') {
        // First image failed - retry from beginning
        alertButtons.push(
          {
            text: 'Retry All Photos',
            style: 'default',
            onPress: () => {
              setImage1Uri(null);
              setImage2Uri(null);
              setImage3Uri(null);
              setImage4Uri(null);
              setImage5Uri(null);
              setCaptureStep(1);
              setFaceFeedback('Please capture your face again (1/5). ENTERPRISE requires EXACTLY 5 images for 100% accuracy.');
            }
          },
          {
            text: 'Start Over',
            style: 'cancel',
            onPress: () => {
              setImage1Uri(null);
              setImage2Uri(null);
              setCaptureStep(1);
              setFaceFeedback('Position your face in the circle');
            }
          }
        );
      } else if (failedImage === 'image2' || failedImage === 'image3' || failedImage === 'image4' || failedImage === 'image5') {
        // Later image failed - retry from that step (keep previous images)
        const stepMap = { image2: 2, image3: 3, image4: 4, image5: 5 };
        const step = stepMap[failedImage] || 2;
        alertButtons.push(
          {
            text: `Retry Photo ${step}/5`,
            style: 'default',
            onPress: () => {
              if (failedImage === 'image2') setImage2Uri(null);
              if (failedImage === 'image3') setImage3Uri(null);
              if (failedImage === 'image4') setImage4Uri(null);
              if (failedImage === 'image5') setImage5Uri(null);
              setCaptureStep(step);
              setFaceFeedback(`Please capture your face again (${step}/5). ENTERPRISE requires EXACTLY 5 images for 100% accuracy.`);
            }
          },
          {
            text: 'Start Over',
            style: 'cancel',
            onPress: () => {
              setImage1Uri(null);
              setImage2Uri(null);
              setImage3Uri(null);
              setImage4Uri(null);
              setImage5Uri(null);
              setCaptureStep(1);
            }
          }
        );
      } else {
        // Unknown which image failed or other error - start over
        alertButtons.push(
          {
            text: 'Retry All',
            style: 'default',
            onPress: () => {
              setImage1Uri(null);
              setImage2Uri(null);
              setImage3Uri(null);
              setImage4Uri(null);
              setImage5Uri(null);
              setCaptureStep(1);
            }
          }
        );
      }

      // 🏦 BANK-GRADE: Show professional modal message
      showProfessionalMessage(
        'Registration Error',
        errorMessage,
        'error'
      );
      
      // Handle retry actions based on failed image
      if (failedImage === 'insufficient') {
        // Continue capturing
        setFaceFeedback(`Continue capturing images (${capturedCount}/5)`);
      } else if (failedImage === 'image1') {
        // Retry all
        setImage1Uri(null);
        setImage2Uri(null);
        setImage3Uri(null);
        setImage4Uri(null);
        setImage5Uri(null);
        setCaptureStep(1);
        setFaceFeedback('Please capture your face again (1/5)');
      } else if (failedImage && failedImage.startsWith('image')) {
        // Retry specific image
        const stepMap = { image2: 2, image3: 3, image4: 4, image5: 5 };
        const step = stepMap[failedImage] || 2;
        if (failedImage === 'image2') setImage2Uri(null);
        if (failedImage === 'image3') setImage3Uri(null);
        if (failedImage === 'image4') setImage4Uri(null);
        if (failedImage === 'image5') setImage5Uri(null);
        setCaptureStep(step);
        setFaceFeedback(`Please capture your face again (${step}/5)`);
      }
    } finally {
      cleanup(); // Clear interval in finally block
      setLoadingMessage('');
      setLoading(false);
      setCapturing(false);
    }
  };

  // Update ref with latest capturePhoto function
  useEffect(() => {
    capturePhotoRef.current = capturePhoto;
  }, [capturePhoto]);

  // 🏦 BANK-GRADE: Real-time backend validation for registration
  useEffect(() => {
    if (!showCamera || !permission?.granted || loading || capturing) {
      return;
    }

    // 🏦 BANK-GRADE Phase 5: Enable live monitoring for ID document capture (step 6)
    // ID documents need face detection and auto-capture when ready

    // Only validate if we haven't captured all required images yet
    if (captureStep === 6) {
      // ID document capture - check if already captured
      if (idImageUri) {
        return;
      }
    } else {
      // Selfie capture - check if all 5 images captured
      const allImagesCaptured = [image1Uri, image2Uri, image3Uri, image4Uri, image5Uri].every(uri => uri !== null);
      if (allImagesCaptured) {
        return;
      }
    }

    let frameInterval;
    let isProcessing = false;

    const processFrame = async () => {
      if (isProcessing || !cameraRef.current) return;
      
      let previewUri = null;
      try {
        isProcessing = true;
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.35, // Low quality for preview
          skipProcessing: true,
        });

        if (photo?.uri) {
          previewUri = photo.uri;

          try {
            const localDetection = await analyzeFrame(photo.uri);
            handleLiveDetection(localDetection);
          } catch (localDetectionError) {
            console.warn('⚠️ Local detection error:', localDetectionError?.message || localDetectionError);
          }

          const result = await validatePreviewWithBackend(photo.uri);
          setLatestBackendResult(result);
          
          // 🏦 ID DOCUMENT AUTO-CAPTURE: Auto-capture when face is detected and ready
          if (captureStep === 6 && result && result.ready && result.quality >= 60 && !capturing && !idImageUri) {
            // Face detected in ID document with sufficient quality - auto-capture
            console.log('🆔 ID document face detected and ready - Auto-capturing...');
            // Use setTimeout to prevent blocking the validation loop
            setTimeout(() => {
              if (!idImageUri && !capturing && captureStep === 6) {
                capturePhotoRef.current();
              }
            }, 100);
            return; // Exit early after scheduling auto-capture
          }
          
          // 🏦 REAL-TIME TOAST: Show live feedback based on backend validation
          if (result) {
            let toastMessage = '';
            const faceCount = result.metadata?.faceCount || 0;
            const quality = result.quality || 0;
            const issues = result.issues || [];
            
            // ID Document specific feedback
            if (captureStep === 6) {
              if (faceCount === 0) {
                toastMessage = '📄 Position ID card in frame';
              } else if (faceCount > 1) {
                toastMessage = '⚠️ Multiple faces - Show only ID photo';
              } else if (issues.length > 0) {
                if (issues.includes('no_face')) {
                  toastMessage = '📄 Face not detected in ID';
                } else if (issues.includes('too_far') || issues.includes('too_small')) {
                  toastMessage = '📏 Move ID closer';
                } else if (issues.includes('blur')) {
                  toastMessage = '📸 Hold ID still';
                } else if (issues.includes('lighting') || issues.includes('brightness')) {
                  toastMessage = '💡 Improve lighting';
                } else {
                  toastMessage = result.feedback || 'Adjust ID position';
                }
              } else if (quality >= 60) {
                toastMessage = '✅ Ready - Capturing...';
              } else if (quality > 0) {
                toastMessage = `📸 Quality: ${Math.round(quality)}% - Adjust position`;
              }
            } else {
              // Selfie capture feedback (existing logic)
              // Priority 1: Multiple faces
              if (faceCount > 1) {
                toastMessage = '⚠️ Multiple faces detected - Only one person allowed';
              }
              // Priority 2: No face
              else if (faceCount === 0) {
                toastMessage = ' ';
              }
              // Priority 3: Issues from backend - Use backend feedback directly (synchronized)
              else if (issues.length > 0) {
                // 🎯 ENHANCED: Use backend feedback message directly - it's already user-friendly and realistic
                const backendFeedback = result.feedback || '';
                if (backendFeedback && backendFeedback.trim().length > 0) {
                  toastMessage = backendFeedback;
                } else {
                  // Fallback to issue-based messages if backend feedback not available
                  if (issues.includes('multiple_faces')) {
                    toastMessage = 'Multiple faces detected. Please ensure only you are in frame';
                  } else if (issues.includes('no_face') || issues.includes('face_too_small')) {
                    toastMessage = 'Position your face in the circle';
                  } else if (issues.includes('too_far') || issues.includes('face_too_small')) {
                    toastMessage = 'Please move closer to the camera';
                  } else if (issues.includes('too_close') || issues.includes('face_too_large')) {
                    toastMessage = 'Please move slightly farther away';
                  } else if (issues.includes('angle') || issues.includes('angle_too_tilted')) {
                    toastMessage = 'Look straight into the camera';
                  } else if (issues.includes('lighting') || issues.includes('brightness')) {
                    toastMessage = 'Adjust lighting. Not too dark or too bright';
                  } else if (issues.includes('blur')) {
                    toastMessage = 'Image is too blurry. Hold still and ensure camera is focused';
                  } else if (issues.includes('detection_failed')) {
                    toastMessage = 'Face not centered properly. Look straight at the camera and center your face in the frame';
                  } else {
                    toastMessage = 'Adjust position for better quality';
                  }
                }
              }
              // Priority 4: Quality-based feedback - Real-time, responsive to user actions
              else if (quality > 0) {
                const isReady = result.ready || false;
                // 🎯 ENHANCED: Dynamic feedback based on actual quality and readiness
                if (isReady) {
                  // Ready state - show quality level
                  if (quality >= 85) {
                    toastMessage = '✅ Perfect! Ready to capture';
                  } else if (quality >= 75) {
                    toastMessage = '✅ Excellent! Ready to capture';
                  } else if (quality >= 70) {
                    toastMessage = '✅ Good! Ready to capture';
                  } else {
                    toastMessage = '✅ Ready! Hold still...';
                  }
                } else {
                  // Not ready - provide specific guidance
                  if (quality >= 85) {
                    toastMessage = '✅ Perfect quality! Hold still...';
                  } else if (quality >= 75) {
                    toastMessage = '👍 Excellent! Make final adjustments';
                  } else if (quality >= 70) {
                    toastMessage = '👍 Great quality! Hold still';
                  } else if (quality >= 60) {
                    toastMessage = '📸 Good quality - Keep adjusting';
                  } else if (quality >= 50) {
                    toastMessage = '📸 Improving... Keep adjusting';
                  } else {
                    toastMessage = `📸 Quality: ${Math.round(quality)}% - Improve lighting`;
                  }
                }
              }
            }
            
            // Show toast only if message changed (prevent spam)
            if (toastMessage && toastMessage !== lastToastMessageRef.current) {
              if (Platform.OS === 'android') {
                ToastAndroid.show(toastMessage, ToastAndroid.SHORT);
              }
              lastToastMessageRef.current = toastMessage;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Frame processing error:', error);
      } finally {
        if (previewUri) {
          try {
            await FileSystem.deleteAsync(previewUri, { idempotent: true });
          } catch (cleanupError) {
            console.warn('⚠️ Preview cleanup error:', cleanupError?.message || cleanupError);
          }
        }
        isProcessing = false;
      }
    };

    // Process frames every 300ms for ID capture (faster), 500ms for selfies
    const intervalTime = captureStep === 6 ? 300 : 500;
    frameInterval = setInterval(processFrame, intervalTime);

    return () => {
      if (frameInterval) {
        clearInterval(frameInterval);
      }
    };
  }, [showCamera, permission?.granted, loading, capturing, captureStep, image1Uri, image2Uri, image3Uri, image4Uri, image5Uri, idImageUri]);

  // Handle back button
  const handleBack = () => {
    if (showCamera) {
      // If in camera view, go back to form
      setShowCamera(false);
      setShowForm(true);
      setImage1Uri(null);
      setImage2Uri(null);
      setCaptureStep(1);
    } else {
      // If in form view, go back to main menu
      navigation.goBack();
    }
  };

  const dynamicStyles = getDynamicStyles(theme);
  const liveBoundingStyle = getFaceBoxStyle(liveFaceBox, cameraLayout, mirroredPreview);

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
          {showForm ? 'Register Staff' : (captureStep === 6 ? 'Capture ID Document' : `Capture Face ${captureStep}/5`)}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminLogin')}
          style={[styles.adminButton, dynamicStyles.adminButton]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.adminIcon, dynamicStyles.adminIcon]}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Form View */}
      {showForm && (
        <ScrollView 
          style={[styles.formScrollView, dynamicStyles.formScrollView]}
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formContainer, dynamicStyles.formContainer]}>
            <Text style={[styles.formTitle, dynamicStyles.formTitle]}>Staff Information</Text>
            <Text style={[styles.formSubtitle, dynamicStyles.formSubtitle]}>Please fill in all details before capturing face</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.label, dynamicStyles.label]}>Name</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter first name"
              placeholderTextColor={theme.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.label, dynamicStyles.label]}>Surname</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter surname"
              placeholderTextColor={theme.textTertiary}
              value={surname}
              onChangeText={setSurname}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.label, dynamicStyles.label]}>ID Number</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter 13-digit ID number"
              placeholderTextColor={theme.textTertiary}
              value={idNumber}
              onChangeText={(text) => {
                // Only allow digits, max 13
                const digitsOnly = text.replace(/\D/g, '').slice(0, 13);
                setIdNumber(digitsOnly);
              }}
              keyboardType="numeric"
              maxLength={13}
            />
            <Text style={[styles.hint, dynamicStyles.hint]}>Must be exactly 13 digits (YYMMDDGSSSCAZ format)</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.label, dynamicStyles.label]}>Phone Number</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter phone number"
              placeholderTextColor={theme.textTertiary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.label, dynamicStyles.label]}>Role</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            <View style={styles.roleContainer}>
              {['Intern', 'Staff', 'Other'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleButton,
                    dynamicStyles.roleButton,
                    role === r && [styles.roleButtonSelected, dynamicStyles.roleButtonSelected],
                  ]}
                  onPress={() => setRole(r)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      dynamicStyles.roleButtonText,
                      role === r && [styles.roleButtonTextSelected, dynamicStyles.roleButtonTextSelected],
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Password field - only show for Staff and Intern roles */}
            {(role === 'Staff' || role === 'Intern') && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                  <Text style={[styles.label, dynamicStyles.label]}>Password</Text>
                  <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
                </View>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder="Enter password (min. 6 characters)"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.hint, dynamicStyles.hint, { fontSize: 12, marginTop: -10, marginBottom: 8 }]}>
                  Password is required for Staff and Intern roles (minimum 6 characters)
                </Text>
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.label, dynamicStyles.label]}>Company</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            {isHostCompany ? (
              // Host company users see their company (read-only)
              <View style={[styles.dropdownButton, dynamicStyles.dropdownButton, styles.dropdownButtonDisabled]}>
                <Text style={[styles.dropdownButtonText, dynamicStyles.dropdownButtonText]}>
                  {userInfo.companyName || userInfo.name || 'Your Company'}
                </Text>
                <Text style={[styles.hint, dynamicStyles.hint, { marginLeft: 8, fontSize: 12 }]}>
                  (Your Company)
                </Text>
              </View>
            ) : (
              // Admin can select any company
              <TouchableOpacity
                style={[styles.dropdownButton, dynamicStyles.dropdownButton]}
                onPress={() => setShowHostCompanyDropdown(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  dynamicStyles.dropdownButtonText,
                  !hostCompany && styles.dropdownButtonPlaceholder
                ]}>
                  {hostCompany ? (() => {
                    const selectedCompany = hostCompanies.find(c => c._id === hostCompany);
                    // Display companyName (actual company name), not name (which is mentor name)
                    return selectedCompany?.companyName || selectedCompany?.name || hostCompany;
                  })() : 'Select Company *'}
                </Text>
                <Text style={[styles.dropdownArrow, dynamicStyles.dropdownArrow]}>▼</Text>
              </TouchableOpacity>
            )}

            {/* Host Company Dropdown Modal (Admin only) */}
            {isAdmin && (
            <Modal
              visible={showHostCompanyDropdown}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowHostCompanyDropdown(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12, width: '90%', maxHeight: '80%', padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2d3748' }}>Select Company</Text>
                    <TouchableOpacity onPress={() => setShowHostCompanyDropdown(false)}>
                      <Text style={{ fontSize: 24, color: '#718096' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
                    {hostCompanies.length === 0 ? (
                      <Text style={{ padding: 16, color: '#718096', textAlign: 'center' }}>No companies available</Text>
                    ) : (
                      hostCompanies.map((company) => (
                        <TouchableOpacity
                          key={company._id}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: '#e2e8f0',
                            backgroundColor: hostCompany === company._id ? '#eff6ff' : 'transparent',
                          }}
                          onPress={() => {
                            setHostCompany(company._id);
                            setShowHostCompanyDropdown(false);
                            setDepartment(''); // Reset department when company changes
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '600', color: hostCompany === company._id ? '#3166AE' : '#2d3748', marginBottom: 2 }}>
                            {company.companyName || company.name}
                          </Text>
                          {company.name && company.companyName && (
                            <Text style={{ fontSize: 12, color: '#718096' }}>
                              Mentor: {company.name}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.label, dynamicStyles.label]}>Department</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.dropdownButton, 
                dynamicStyles.dropdownButton,
                !hostCompany && styles.dropdownButtonDisabled
              ]}
              onPress={() => {
                if (hostCompany) {
                  setShowDepartmentDropdown(true);
                } else {
                  showProfessionalMessage(
                    'Company Required',
                    'Please select a company first before selecting a department.',
                    'warning'
                  );
                }
              }}
              disabled={!hostCompany}
            >
              <Text style={[
                styles.dropdownButtonText,
                dynamicStyles.dropdownButtonText,
                !department && styles.dropdownButtonPlaceholder
              ]}>
                {department ? filteredDepartments.find(d => d._id === department)?.name || department : 'Select Department *'}
              </Text>
              <Text style={[styles.dropdownArrow, dynamicStyles.dropdownArrow]}>▼</Text>
            </TouchableOpacity>

            {/* Department Dropdown Modal */}
            <Modal
              visible={showDepartmentDropdown}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDepartmentDropdown(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12, width: '90%', maxHeight: '80%', padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2d3748' }}>Select Department</Text>
                    <TouchableOpacity onPress={() => setShowDepartmentDropdown(false)}>
                      <Text style={{ fontSize: 24, color: '#718096' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
                    {filteredDepartments.length === 0 ? (
                      <Text style={{ padding: 16, color: '#718096', textAlign: 'center' }}>No departments available</Text>
                    ) : (
                      filteredDepartments.map((dept) => (
                        <TouchableOpacity
                          key={dept._id}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: '#e2e8f0',
                            backgroundColor: department === dept._id ? '#eff6ff' : 'transparent',
                          }}
                          onPress={() => {
                            setDepartment(dept._id);
                            setShowDepartmentDropdown(false);
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '600', color: department === dept._id ? '#3166AE' : '#2d3748', marginBottom: 2 }}>
                            {dept.name}
                          </Text>
                          {dept.description && (
                            <Text style={{ fontSize: 12, color: '#718096' }}>
                              {dept.description}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Mentor field removed per request */}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
              <Text style={[styles.label, dynamicStyles.label]}>Location</Text>
              <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600', marginLeft: 2 }}>*</Text>
            </View>
            
            {/* Toggle between dropdown and custom address */}
            <View style={styles.locationToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !useCustomAddress && styles.toggleButtonActive,
                ]}
                onPress={() => {
                  setUseCustomAddress(false);
                  setCustomAddress('');
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !useCustomAddress && styles.toggleButtonTextActive,
                ]}>
                  Select from List
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  useCustomAddress && styles.toggleButtonActive,
                ]}
                onPress={() => {
                  setUseCustomAddress(true);
                  setLocation('');
                }}
              >
                <Text style={[
                  styles.toggleButtonText,
                  useCustomAddress && styles.toggleButtonTextActive,
                ]}>
                  Custom Address
                </Text>
              </TouchableOpacity>
            </View>
            
            {!useCustomAddress ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    dynamicStyles.dropdown,
                    location && [styles.dropdownSelected, dynamicStyles.dropdownSelected],
                  ]}
                  onPress={() => setShowLocationDropdown(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      dynamicStyles.dropdownText,
                      !location && [styles.dropdownPlaceholder, dynamicStyles.dropdownPlaceholder],
                    ]}
                  >
                    {location
                      ? locations.find(loc => loc.key === location)?.name || 'Select location'
                      : 'Select location'}
                  </Text>
                  <Text style={[styles.dropdownArrow, dynamicStyles.dropdownArrow]}>▼</Text>
                </TouchableOpacity>
                {location && (
                  <Text style={[styles.dropdownSubtext, dynamicStyles.dropdownSubtext]}>
                    {locations.find(loc => loc.key === location)?.address}
                  </Text>
                )}
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder="Enter full address (e.g., 123 Main Street, Johannesburg, Gauteng)"
                  placeholderTextColor={theme.textTertiary}
                  value={customAddress}
                  onChangeText={setCustomAddress}
                  autoCapitalize="words"
                  autoCorrect={false}
                  multiline={true}
                  numberOfLines={2}
                />
                <Text style={[styles.hint, dynamicStyles.hint]}>
                  Enter a complete address in South Africa. The system will automatically find the coordinates.
                </Text>
              </>
            )}

            {/* Location Dropdown Modal */}
            <Modal
              visible={showLocationDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowLocationDropdown(false)}
            >
              <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => setShowLocationDropdown(false)}
                />
                <View style={[styles.dropdownModal, dynamicStyles.dropdownModal]}>
                  <View style={[styles.dropdownHeader, dynamicStyles.dropdownHeader]}>
                    <Text style={[styles.dropdownTitle, dynamicStyles.dropdownTitle]}>Select Location</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowLocationDropdown(false);
                        setLocationSearchQuery('');
                      }}
                      style={styles.closeButton}
                    >
                      <Text style={[styles.closeButtonText, dynamicStyles.closeButtonText]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Search input */}
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={[styles.searchInput, dynamicStyles.input]}
                      placeholder="Search locations..."
                      placeholderTextColor={theme.textTertiary}
                      value={locationSearchQuery}
                      onChangeText={setLocationSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <ScrollView style={styles.dropdownList}>
                    {filteredLocations.length === 0 ? (
                      <View style={styles.dropdownItem}>
                        <Text style={[styles.dropdownItemText, dynamicStyles.dropdownItemText]}>
                          No locations found
                        </Text>
                      </View>
                    ) : (
                      filteredLocations.map((loc) => (
                      <TouchableOpacity
                        key={loc.key}
                        style={[
                          styles.dropdownItem,
                          dynamicStyles.dropdownItem,
                          location === loc.key && [styles.dropdownItemSelected, dynamicStyles.dropdownItemSelected],
                        ]}
                        onPress={() => {
                          setLocation(loc.key);
                          setShowLocationDropdown(false);
                          setLocationSearchQuery('');
                        }}
                      >
                        <View style={styles.dropdownItemContent}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              dynamicStyles.dropdownItemText,
                              location === loc.key && [styles.dropdownItemTextSelected, dynamicStyles.dropdownItemTextSelected],
                            ]}
                          >
                            {loc.name}
                          </Text>
                          <Text
                            style={[
                              styles.dropdownItemAddress,
                              dynamicStyles.dropdownItemAddress,
                              location === loc.key && [styles.dropdownItemAddressSelected, dynamicStyles.dropdownItemAddressSelected],
                            ]}
                          >
                            {loc.address}
                          </Text>
                        </View>
                        {location === loc.key && (
                          <Text style={[styles.checkmark, dynamicStyles.checkmark]}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* ⏰ WORKING HOURS: Optional working hours assignment (weekdays only) */}
            <View style={{ marginTop: 24, marginBottom: 16 }}>
              <Text style={[styles.label, dynamicStyles.label]}>
                Working Hours ⏰
              </Text>
              <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 12, fontSize: 12 }]}>
                Assign specific working hours for this staff member. If not assigned, will use host company default hours. These times are LIFETIME and will be used to judge clock-ins, breaks, and clock-outs.
              </Text>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 2, fontSize: 11 }]}>Clock In</Text>
                  <TouchableOpacity
                    style={[styles.input, dynamicStyles.input, { justifyContent: 'center', paddingVertical: 6, minHeight: 32 }]}
                    onPress={() => {
                      const currentTime = clockInTime ? clockInTime.split(':') : ['08', '00'];
                      setTimePickerHour(parseInt(currentTime[0]) || 8);
                      setTimePickerMinute(parseInt(currentTime[1]) || 0);
                      setTimePickerType('clockIn');
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={{ fontSize: 14, color: clockInTime ? (dynamicStyles.input?.color || '#2d3748') : '#9ca3af' }}>
                      {clockInTime || 'Tap to set'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 2, fontSize: 11 }]}>Clock Out</Text>
                  <TouchableOpacity
                    style={[styles.input, dynamicStyles.input, { justifyContent: 'center', paddingVertical: 6, minHeight: 32 }]}
                    onPress={() => {
                      const currentTime = clockOutTime ? clockOutTime.split(':') : ['17', '00'];
                      setTimePickerHour(parseInt(currentTime[0]) || 17);
                      setTimePickerMinute(parseInt(currentTime[1]) || 0);
                      setTimePickerType('clockOut');
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={{ fontSize: 14, color: clockOutTime ? (dynamicStyles.input?.color || '#2d3748') : '#9ca3af' }}>
                      {clockOutTime || 'Tap to set'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 2, fontSize: 11 }]}>Break Start</Text>
                  <TouchableOpacity
                    style={[styles.input, dynamicStyles.input, { justifyContent: 'center', paddingVertical: 6, minHeight: 32 }]}
                    onPress={() => {
                      const currentTime = breakStartTime ? breakStartTime.split(':') : ['13', '00'];
                      setTimePickerHour(parseInt(currentTime[0]) || 13);
                      setTimePickerMinute(parseInt(currentTime[1]) || 0);
                      setTimePickerType('breakStart');
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={{ fontSize: 14, color: breakStartTime ? (dynamicStyles.input?.color || '#2d3748') : '#9ca3af' }}>
                      {breakStartTime || 'Tap to set'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 2, fontSize: 11 }]}>Break End</Text>
                  <TouchableOpacity
                    style={[styles.input, dynamicStyles.input, { justifyContent: 'center', paddingVertical: 6, minHeight: 32 }]}
                    onPress={() => {
                      const currentTime = breakEndTime ? breakEndTime.split(':') : ['14', '00'];
                      setTimePickerHour(parseInt(currentTime[0]) || 14);
                      setTimePickerMinute(parseInt(currentTime[1]) || 0);
                      setTimePickerType('breakEnd');
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={{ fontSize: 14, color: breakEndTime ? (dynamicStyles.input?.color || '#2d3748') : '#9ca3af' }}>
                      {breakEndTime || 'Tap to set'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ⏰ EXTRA HOURS: Optional extra hours availability */}
              <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: hasExtraHours ? 12 : 0 }}
                  onPress={() => setHasExtraHours(!hasExtraHours)}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: hasExtraHours ? '#3166AE' : '#cbd5e0',
                    backgroundColor: hasExtraHours ? '#3166AE' : 'transparent',
                    marginRight: 8,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {hasExtraHours && (
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                  <Text style={[styles.hint, dynamicStyles.hint, { fontSize: 12, fontWeight: '500' }]}>
                    Extra Hours Available
                  </Text>
                </TouchableOpacity>

                {hasExtraHours && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 2, fontSize: 11 }]}>Extra Hours Start</Text>
                      <TouchableOpacity
                        style={[styles.input, dynamicStyles.input, { justifyContent: 'center', paddingVertical: 6, minHeight: 32 }]}
                        onPress={() => {
                          const currentTime = extraHoursStartTime ? extraHoursStartTime.split(':') : ['18', '00'];
                          setTimePickerHour(parseInt(currentTime[0]) || 18);
                          setTimePickerMinute(parseInt(currentTime[1]) || 0);
                          setTimePickerType('extraHoursStart');
                          setShowTimePicker(true);
                        }}
                      >
                        <Text style={{ fontSize: 14, color: extraHoursStartTime ? (dynamicStyles.input?.color || '#2d3748') : '#9ca3af' }}>
                          {extraHoursStartTime || 'Tap to set'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 2, fontSize: 11 }]}>Extra Hours End</Text>
                      <TouchableOpacity
                        style={[styles.input, dynamicStyles.input, { justifyContent: 'center', paddingVertical: 6, minHeight: 32 }]}
                        onPress={() => {
                          const currentTime = extraHoursEndTime ? extraHoursEndTime.split(':') : ['20', '00'];
                          setTimePickerHour(parseInt(currentTime[0]) || 20);
                          setTimePickerMinute(parseInt(currentTime[1]) || 0);
                          setTimePickerType('extraHoursEnd');
                          setShowTimePicker(true);
                        }}
                      >
                        <Text style={{ fontSize: 14, color: extraHoursEndTime ? (dynamicStyles.input?.color || '#2d3748') : '#9ca3af' }}>
                          {extraHoursEndTime || 'Tap to set'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* 🏦 BANK-GRADE Phase 5: ID Document Upload (REQUIRED for bank-grade accuracy) */}
            <View style={{ marginTop: 24, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.label, dynamicStyles.label]}>
                  ID Document Photo (Required) 🆔
                </Text>
                <Text style={{ color: '#ED3438', fontSize: 16, marginLeft: 4 }}>*</Text>
              </View>
              <Text style={[styles.hint, dynamicStyles.hint, { marginBottom: 12 }]}>
                Capture a photo of your ID card, passport, or driver's license. This is REQUIRED as it serves as the stable anchor template for accurate face matching (bank-grade security).
              </Text>
              {idImageUri ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.hint, dynamicStyles.hint, { color: '#4ade80', flex: 1 }]}>
                    ✓ ID document captured (Required)
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIdImageUri(null);
                      setShowCamera(true);
                      setCaptureStep(6); // Step 6 = ID capture
                    }}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: '#ED3438', fontSize: 14, fontWeight: '600' }}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setShowCamera(true);
                    setCaptureStep(6); // Step 6 = ID capture
                  }}
                  style={[
                    styles.input,
                    dynamicStyles.input,
                    {
                      borderStyle: 'dashed',
                      borderWidth: 2,
                      borderColor: '#ED3438', // Red border to indicate required
                      padding: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.backgroundSecondary || '#f7fafc',
                    }
                  ]}
                >
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>🆔</Text>
                  <Text style={[styles.hint, dynamicStyles.hint, { textAlign: 'center', color: '#ED3438', fontWeight: '600' }]}>
                    ⚠️ Tap to capture ID document (Required)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                dynamicStyles.continueButton,
                (!name.trim() || !surname.trim() || !idNumber.trim() || !phoneNumber.trim() || !role || !hostCompany || !department || (!location && !customAddress.trim()) || ((role === 'Staff' || role === 'Intern') && !password.trim()) || ((role === 'Staff' || role === 'Intern') && password.trim().length < 6)) && [styles.continueButtonDisabled, dynamicStyles.continueButtonDisabled],
              ]}
              onPress={handleFormSubmit}
              disabled={!name.trim() || !surname.trim() || !idNumber.trim() || !phoneNumber.trim() || !role || !hostCompany || !department || (!location && !customAddress.trim()) || !idImageUri || ((role === 'Staff' || role === 'Intern') && (!password.trim() || password.trim().length < 6))}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue to Camera</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, width: '85%', maxWidth: 350, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2d3748' }}>
                {timePickerType === 'clockIn' ? 'Clock In Time' :
                 timePickerType === 'clockOut' ? 'Clock Out Time' :
                 timePickerType === 'breakStart' ? 'Break Start Time' :
                 timePickerType === 'breakEnd' ? 'Break End Time' :
                 timePickerType === 'extraHoursStart' ? 'Extra Hours Start Time' :
                 'Extra Hours End Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={{ fontSize: 24, color: '#718096' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              {/* Hour Picker */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#718096', marginBottom: 8 }}>Hour</Text>
                <ScrollView 
                  style={{ maxHeight: 200, width: '100%' }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: 'center' }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        padding: 12,
                        width: 60,
                        alignItems: 'center',
                        backgroundColor: timePickerHour === i ? '#eff6ff' : 'transparent',
                        borderRadius: 8,
                        marginVertical: 2,
                      }}
                      onPress={() => setTimePickerHour(i)}
                    >
                      <Text style={{
                        fontSize: 18,
                        fontWeight: timePickerHour === i ? 'bold' : 'normal',
                        color: timePickerHour === i ? '#3166AE' : '#2d3748',
                      }}>
                        {String(i).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <Text style={{ fontSize: 24, fontWeight: 'bold', marginHorizontal: 16, color: '#2d3748' }}>:</Text>
              
              {/* Minute Picker */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#718096', marginBottom: 8 }}>Minute</Text>
                <ScrollView 
                  style={{ maxHeight: 200, width: '100%' }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: 'center' }}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        padding: 12,
                        width: 60,
                        alignItems: 'center',
                        backgroundColor: timePickerMinute === i ? '#eff6ff' : 'transparent',
                        borderRadius: 8,
                        marginVertical: 2,
                      }}
                      onPress={() => setTimePickerMinute(i)}
                    >
                      <Text style={{
                        fontSize: 18,
                        fontWeight: timePickerMinute === i ? 'bold' : 'normal',
                        color: timePickerMinute === i ? '#3166AE' : '#2d3748',
                      }}>
                        {String(i).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#e2e8f0',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  if (timePickerType === 'clockIn') setClockInTime('');
                  else if (timePickerType === 'clockOut') setClockOutTime('');
                  else if (timePickerType === 'breakStart') setBreakStartTime('');
                  else if (timePickerType === 'breakEnd') setBreakEndTime('');
                  else if (timePickerType === 'extraHoursStart') setExtraHoursStartTime('');
                  else if (timePickerType === 'extraHoursEnd') setExtraHoursEndTime('');
                  setShowTimePicker(false);
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#4a5568' }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#3166AE',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => {
                  const timeStr = `${String(timePickerHour).padStart(2, '0')}:${String(timePickerMinute).padStart(2, '0')}`;
                  if (timePickerType === 'clockIn') setClockInTime(timeStr);
                  else if (timePickerType === 'clockOut') setClockOutTime(timeStr);
                  else if (timePickerType === 'breakStart') setBreakStartTime(timeStr);
                  else if (timePickerType === 'breakEnd') setBreakEndTime(timeStr);
                  else if (timePickerType === 'extraHoursStart') setExtraHoursStartTime(timeStr);
                  else if (timePickerType === 'extraHoursEnd') setExtraHoursEndTime(timeStr);
                  setShowTimePicker(false);
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Professional Message Modal */}
      <Modal
        visible={showMessageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.messageModalContent, dynamicStyles.messageModalContent]}>
            {/* Icon based on type */}
            <View style={[
              styles.messageIconContainer,
              messageModalData.type === 'error' && styles.messageIconError,
              messageModalData.type === 'warning' && styles.messageIconWarning,
              messageModalData.type === 'success' && styles.messageIconSuccess,
              messageModalData.type === 'info' && styles.messageIconInfo,
            ]}>
              <Text style={styles.messageIcon}>
                {messageModalData.type === 'error' ? '⚠️' :
                 messageModalData.type === 'warning' ? '⚠️' :
                 messageModalData.type === 'success' ? '✅' :
                 'ℹ️'}
              </Text>
            </View>
            
            <Text style={[styles.messageModalTitle, dynamicStyles.messageModalTitle]}>
              {messageModalData.title}
            </Text>
            
            <Text style={[styles.messageModalText, dynamicStyles.messageModalText]}>
              {messageModalData.message}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.messageModalButton,
                dynamicStyles.messageModalButton,
                messageModalData.type === 'error' && styles.messageModalButtonError,
                messageModalData.type === 'warning' && styles.messageModalButtonWarning,
                messageModalData.type === 'success' && styles.messageModalButtonSuccess,
                messageModalData.type === 'info' && styles.messageModalButtonInfo,
              ]}
              onPress={() => setShowMessageModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.messageModalButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Camera View */}
      {showCamera && permission.granted === true && (
        <>
          <View
            style={styles.cameraContainer}
            onLayout={(event) => setCameraLayout(event.nativeEvent.layout)}
          >
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={captureStep === 6 ? "back" : "front"} // 🏦 BANK-GRADE Phase 5: Use back camera for ID document
            />
            {/* 🏦 BANK-GRADE: Overlay positioned absolutely (CameraView doesn't support children) */}
            <View style={styles.overlay}>
              {liveBoundingStyle && (
                <View
                  style={[
                    styles.liveBoundingBox,
                    liveQualityScore >= 80
                      ? styles.liveBoundingBoxReady
                      : liveQualityScore >= 60
                      ? styles.liveBoundingBoxGood
                      : styles.liveBoundingBoxWarn,
                    {
                      width: liveBoundingStyle.width,
                      height: liveBoundingStyle.height,
                      left: liveBoundingStyle.left,
                      top: liveBoundingStyle.top,
                    },
                  ]}
                />
              )}
              <View
                style={[
                  styles.liveStatusPill,
                  liveQualityScore >= 80
                    ? styles.liveStatusPillReady
                    : liveQualityScore >= 60
                    ? styles.liveStatusPillGood
                    : styles.liveStatusPillWarn,
                ]}
              >
                <Text style={styles.liveStatusText} numberOfLines={1}>
                  {liveStatusMessage}
                </Text>
                <Text style={styles.liveStatusScore}>
                  {Math.max(0, Math.round(liveQualityScore))}%
                </Text>
              </View>
              {/* 🏦 BANK-GRADE Phase 5: Show face frame only for selfie capture, not ID document */}
              {captureStep !== 6 && (
                <View style={styles.faceFrameContainer}>
                  {/* Main circle frame */}
                  <View
                    style={[
                      styles.circleFrame,
                      {
                        width: circleDimensions.width,
                        height: circleDimensions.height,
                        borderRadius: circleDimensions.borderRadius,
                      },
                    ]}
                  />
                  
                  {/* Inner guide circle */}
                  <View
                    style={[
                      styles.innerGuide,
                      {
                        width: circleDimensions.width * 0.85,
                        height: circleDimensions.height * 0.85,
                        borderRadius: (circleDimensions.borderRadius * 0.85),
                      },
                    ]}
                  />
                  
                </View>
              )}
              
              {/* ID Document Capture Guide - Simplified */}
              {captureStep === 6 && (
                <View style={styles.idDocumentGuide}>
                  <Text style={styles.idDocumentSimpleText}>
                    Capture the photo of your face in the ID
                  </Text>
                  <View style={styles.idDocumentFrame}>
                    {/* Rectangle frame for ID document */}
                    <View style={styles.idDocumentBorder} />
                  </View>
                </View>
              )}

              {/* ENTERPRISE Progress: Show capture progress (ALL 5 images required) - Bottom of screen */}
              {!loading && !capturing && captureStep > 1 && captureStep !== 6 && (
                <View style={styles.progressContainer}>
                  <Text style={[styles.progressText, dynamicStyles.progressText]}>
                    {image1Uri && '✓ 1/5 '}
                    {image2Uri && '✓ 2/5 '}
                    {image3Uri && '✓ 3/5 '}
                    {image4Uri && '✓ 4/5 '}
                    {image5Uri && '✓ 5/5 '}
                    {captureStep <= 5 && `→ ${captureStep}/5`}
                    {captureStep > 5 && 'All 5 Required!'}
                  </Text>
                  {captureStep >= 3 && (
                    <Text style={[styles.progressHint, dynamicStyles.progressHint]}>
                      ENTERPRISE: {[image1Uri, image2Uri, image3Uri, image4Uri, image5Uri].filter(Boolean).length}/5 (ALL 5 REQUIRED for 100% accuracy)
                    </Text>
                  )}
                </View>
              )}
              
              {/* ID Document Capture Status */}
              {captureStep === 6 && !loading && !capturing && (
                <View style={styles.progressContainer}>
                  <Text style={[styles.progressText, dynamicStyles.progressText]}>
                    {idImageUri ? '✓ ID Document Captured' : '📄 Capture ID Document'}
                  </Text>
                  <Text style={[styles.progressHint, dynamicStyles.progressHint]}>
                    Use back camera to photograph your ID card or passport
                  </Text>
                </View>
              )}
            </View>
          </View>

        {/* Live feedback card just below the camera */}
        <View style={styles.professionalFeedbackContainer}>
          {latestBackendResult ? (
            <ProfessionalFeedback
              feedback={latestBackendResult.feedback || faceFeedback}
              metadata={latestBackendResult.metadata}
              quality={latestBackendResult.quality}
              isReady={latestBackendResult.isReady}
              issues={latestBackendResult.issues}
              theme={theme}
            />
          ) : (
            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>
                {liveStatusMessage || faceFeedback}
              </Text>
              <Text style={styles.instructionSubtext}>
                {faceFeedback}
              </Text>
            </View>
          )}
        </View>

          {/* Capture Button */}
          <View style={[styles.buttonContainer, dynamicStyles.buttonContainer]}>
            <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
              <TouchableOpacity
                style={[
                  styles.captureButton,
                  dynamicStyles.captureButton,
                  (loading || capturing) && [styles.captureButtonDisabled, dynamicStyles.captureButtonDisabled],
                ]}
                onPress={capturePhoto}
                disabled={!!(loading || capturing)}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <View style={styles.loadingTextContainer}>
                      <Text style={styles.captureButtonText}>Registering your face securely…</Text>
                      {loadingMessage && (
                        <Text style={styles.loadingSubtext}>{loadingMessage}</Text>
                      )}
                    </View>
                  </View>
                ) : capturing ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.captureButtonText}>Capturing...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>📸</Text>
                    <Text style={styles.captureButtonText}>
                      {/* 🏦 BANK-GRADE Phase 5: ID Document capture */}
                      {captureStep === 6 && (idImageUri ? 'Retry ID Document' : 'Capture ID Document')}
                      {captureStep === 1 && (image1Uri ? 'Retry Photo 1/5' : 'Capture Photo 1/5 (Front Face)')}
                      {captureStep === 2 && (image2Uri ? 'Retry Photo 2/5' : 'Capture Photo 2/5 (Left Turn)')}
                      {captureStep === 3 && (image3Uri ? 'Retry Photo 3/5' : 'Capture Photo 3/5 (Right Turn)')}
                      {captureStep === 4 && (image4Uri ? 'Retry Photo 4/5' : 'Capture Photo 4/5 (Upward Angle)')}
                      {captureStep === 5 && (image5Uri ? 'Retry Photo 5/5' : 'Capture Photo 5/5 (Downward Angle)')}
                      {captureStep > 5 && captureStep !== 6 && 'All 5 Photos Required'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </>
      )}

      {/* Camera Permission Request */}
      {showCamera && permission.granted === false && (
        <View style={[styles.permissionContainer, dynamicStyles.permissionContainer]}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={[styles.permissionTitle, dynamicStyles.permissionTitle]}>Camera Permission Required</Text>
          <Text style={[styles.permissionText, dynamicStyles.permissionText]}>
            We need access to your camera to register staff faces.
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, dynamicStyles.permissionButton]} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Modal - EXACTLY like ClockIn.js */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          // Reset and navigate after modal closes
          setTimeout(() => {
            setName('');
            setSurname('');
            setIdNumber('');
            setPhoneNumber('');
            setRole('Staff');
            setLocation('');
            setCustomAddress('');
            setUseCustomAddress(false);
            setImage1Uri(null);
            setImage2Uri(null);
            setImage3Uri(null);
            setImage4Uri(null);
            setImage5Uri(null);
            setCaptureStep(1);
            setShowCamera(false);
            setShowForm(true);
            setRegistrationResult(null);
            navigation.navigate('MainMenu');
          }, 300);
        }}
      >
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={[styles.resultTitle, dynamicStyles.resultTitle]}>
              Registration Success!
            </Text>
            <Text style={[styles.resultMessage, dynamicStyles.resultMessage]}>{registrationResult?.message}</Text>
            
            {/* Date and Time Display */}
            {(registrationResult?.date || registrationResult?.time || registrationResult?.dateTime) && (
              <View style={[styles.dateTimeContainer, dynamicStyles.dateTimeContainer]}>
                <View style={styles.dateTimeRow}>
                  <Text style={[styles.dateTimeLabel, dynamicStyles.dateTimeLabel]}>📅 Date:</Text>
                  <Text style={[styles.dateTimeValue, dynamicStyles.dateTimeValue]}>{registrationResult.date || 'N/A'}</Text>
                </View>
                <View style={styles.dateTimeRow}>
                  <Text style={[styles.dateTimeLabel, dynamicStyles.dateTimeLabel]}>🕐 Time:</Text>
                  <Text style={[styles.dateTimeValue, dynamicStyles.dateTimeValue]}>{registrationResult.time || 'N/A'}</Text>
                </View>
                {registrationResult.dateTime && (
                  <View style={[styles.dateTimeFullRow, dynamicStyles.dateTimeFullRow]}>
                    <Text style={[styles.dateTimeFullText, dynamicStyles.dateTimeFullText]}>{registrationResult.dateTime}</Text>
                  </View>
                )}
              </View>
            )}
            
            {registrationResult?.confidence && (
              <View style={[styles.confidenceContainer, dynamicStyles.confidenceContainer]}>
                <Text style={[styles.confidenceLabel, dynamicStyles.confidenceLabel]}>Confidence:</Text>
                <Text style={[styles.confidenceValue, dynamicStyles.confidenceValue]}>{registrationResult.confidence}%</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.modalButton, dynamicStyles.modalButton]}
              onPress={() => {
                setShowSuccessModal(false);
                // Reset and navigate after modal closes
                setTimeout(() => {
                  setName('');
                  setSurname('');
                  setIdNumber('');
                  setPhoneNumber('');
                  setRole('Staff');
                  setLocation('');
                  setCustomAddress('');
                  setUseCustomAddress(false);
                  setImage1Uri(null);
                  setImage2Uri(null);
                  setImage3Uri(null);
                  setImage4Uri(null);
                  setImage5Uri(null);
                  setCaptureStep(1);
                  setShowCamera(false);
                  setShowForm(true);
                  setRegistrationResult(null);
                  navigation.navigate('MainMenu');
                }, 300);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const clampValue = (value, min = 0, max = 1) => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const getNormalizedBox = (metadata) => {
  if (!metadata?.bounds?.normalized) return null;
  const { x, y, width, height } = metadata.bounds.normalized;
  return {
    x: clampValue(x),
    y: clampValue(y),
    width: clampValue(width),
    height: clampValue(height),
  };
};

const getFaceBoxStyle = (box, layout, mirrored = true) => {
  if (!box || layout.width === 0 || layout.height === 0) return null;
  const width = layout.width * clampValue(box.width);
  const height = layout.height * clampValue(box.height);
  const normalizedLeft = clampValue(box.x);
  let left = layout.width * normalizedLeft;
  if (mirrored) {
    left = layout.width - (left + width);
  }
  const top = layout.height * clampValue(box.y);
  return { width, height, left, top };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#3166AE',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3166AE',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  adminButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminIcon: {
    fontSize: 22,
  },
  formScrollView: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3166AE',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f7fafc',
    color: '#2d3748',
  },
  hint: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  roleButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
  },
  roleButtonSelected: {
    borderColor: '#3166AE',
    backgroundColor: '#eff6ff',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  roleButtonTextSelected: {
    color: '#3166AE',
  },
  dropdown: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f7fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownButton: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f7fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  dropdownSelected: {
    borderColor: '#3166AE',
    backgroundColor: '#eff6ff',
  },
  dropdownText: {
    fontSize: 14,
    color: '#2d3748',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#a0aec0',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 8,
  },
  dropdownSubtext: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
    marginTop: -4,
  },
  locationToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: '#3166AE',
    backgroundColor: '#eff6ff',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  toggleButtonTextActive: {
    color: '#3166AE',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f7fafc',
    color: '#2d3748',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3166AE',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#718096',
    fontWeight: '600',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    padding: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 2,
  },
  dropdownItemTextSelected: {
    color: '#3166AE',
  },
  dropdownItemAddress: {
    fontSize: 12,
    color: '#718096',
  },
  dropdownItemAddressSelected: {
    color: '#4a5568',
  },
  checkmark: {
    fontSize: 20,
    color: '#3166AE',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  continueButton: {
    backgroundColor: '#3166AE',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    elevation: 4,
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#cbd5e0',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  liveBoundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 24,
    zIndex: 2,
  },
  liveBoundingBoxReady: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  liveBoundingBoxGood: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  liveBoundingBoxWarn: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  liveStatusPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    zIndex: 3,
  },
  liveStatusPillReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  liveStatusPillGood: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
  },
  liveStatusPillWarn: {
    backgroundColor: 'rgba(249, 115, 22, 0.9)',
  },
  liveStatusText: {
    color: '#fff',
    fontWeight: '600',
    maxWidth: 180,
  },
  liveStatusScore: {
    color: '#fff',
    fontWeight: '700',
  },
  faceFrameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scanningCircle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  scanArc1: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 5,
    borderTopColor: '#00d4ff',
    borderRightColor: '#0099cc',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  scanArc2: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 5,
    borderTopColor: 'transparent',
    borderRightColor: '#00d4ff',
    borderBottomColor: '#0099cc',
    borderLeftColor: 'transparent',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  scanArc3: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 5,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00d4ff',
    borderLeftColor: '#0099cc',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  circleFrame: {
    borderWidth: 4,
    borderColor: '#3166AE',
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  innerGuide: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
    position: 'absolute',
    zIndex: 0,
  },
  instructionContainer: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 4,
  },
  instructionTextReady: {
    color: '#4ade80',
    fontWeight: '700',
  },
  instructionTextExcellent: {
    color: '#86efac',
    fontWeight: '600',
  },
  instructionTextGood: {
    color: '#fde047',
    fontWeight: '600',
  },
  instructionTextSearching: {
    color: '#fbbf24',
  },
  qualityIndicator: {
    width: '80%',
    marginTop: 8,
    alignItems: 'center',
  },
  qualityBar: {
    height: 4,
    backgroundColor: '#4ade80',
    borderRadius: 2,
    marginBottom: 4,
  },
  qualityBarExcellent: {
    backgroundColor: '#4ade80',
  },
  qualityBarGood: {
    backgroundColor: '#86efac',
  },
  qualityBarPoor: {
    backgroundColor: '#fbbf24',
  },
  qualityText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  readySubtext: {
    color: '#4ade80',
    fontWeight: '600',
    marginTop: 4,
  },
  professionalFeedbackContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  qualityIndicatorContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  progressHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
    fontStyle: 'italic',
  },
  loadingTextContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  captureButton: {
    backgroundColor: '#3166AE',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  captureButtonDisabled: {
    backgroundColor: '#cbd5e0',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonIcon: {
    fontSize: 20,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3166AE',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // 🏦 PROFESSIONAL FEEDBACK: Top of screen for visibility
  feedbackContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  feedbackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: '85%',
    maxWidth: '90%',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: 0.2,
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  qualityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  qualityText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Success Modal Styles (matching ClockIn.js)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 72,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  resultMessage: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    lineHeight: 26,
  },
  dateTimeContainer: {
    width: '100%',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeFullRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  dateTimeLabel: {
    fontSize: 15,
    color: '#3166AE',
    fontWeight: '600',
    flex: 1,
  },
  dateTimeValue: {
    fontSize: 15,
    color: '#2d3748',
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  dateTimeFullText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  confidenceValue: {
    fontSize: 16,
    color: '#3166AE',
    fontWeight: '700',
  },
  modalButton: {
    backgroundColor: '#3166AE',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#3166AE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// Dynamic styles based on theme
const getDynamicStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.card,
    borderBottomColor: theme.border,
  },
  headerBorder: {
    borderBottomColor: theme.border,
  },
  backButtonText: {
    color: theme.primary,
  },
  headerTitle: {
    color: theme.primary,
  },
  adminButton: {
    // No additional styling needed, uses base styles
  },
  adminIcon: {
    color: theme.primary,
  },
  formScrollView: {
    backgroundColor: theme.surface,
  },
  formContainer: {
    backgroundColor: theme.card,
  },
  formTitle: {
    color: theme.primary,
  },
  formSubtitle: {
    color: theme.textSecondary,
  },
  label: {
    color: theme.text,
  },
  hint: {
    color: theme.textTertiary,
  },
  input: {
    backgroundColor: theme.inputBackground,
    borderColor: theme.inputBorder,
    color: theme.inputText,
  },
  roleButton: {
    backgroundColor: theme.inputBackground,
    borderColor: theme.inputBorder,
  },
  roleButtonSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.mode === 'dark' ? '#3166AE' : '#eff6ff',
  },
  roleButtonText: {
    color: theme.textTertiary,
  },
  roleButtonTextSelected: {
    color: theme.primary,
  },
  dropdown: {
    backgroundColor: theme.inputBackground,
    borderColor: theme.inputBorder,
  },
  dropdownSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.mode === 'dark' ? '#3166AE' : '#eff6ff',
  },
  dropdownText: {
    color: theme.inputText,
  },
  dropdownPlaceholder: {
    color: theme.textTertiary,
  },
  dropdownArrow: {
    color: theme.textTertiary,
  },
  dropdownSubtext: {
    color: theme.textTertiary,
  },
  modalOverlay: {
    backgroundColor: theme.overlay,
  },
  dropdownModal: {
    backgroundColor: theme.card,
    shadowColor: theme.shadow,
  },
  dropdownHeader: {
    borderBottomColor: theme.border,
  },
  dropdownTitle: {
    color: theme.primary,
  },
  closeButtonText: {
    color: theme.textTertiary,
  },
  dropdownItem: {
    borderBottomColor: theme.surface,
  },
  dropdownItemSelected: {
    backgroundColor: theme.mode === 'dark' ? '#3166AE' : '#eff6ff',
  },
  dropdownItemText: {
    color: theme.text,
  },
  dropdownItemTextSelected: {
    color: theme.primary,
  },
  dropdownItemAddress: {
    color: theme.textTertiary,
  },
  dropdownItemAddressSelected: {
    color: theme.textSecondary,
  },
  checkmark: {
    color: theme.primary,
  },
  continueButton: {
    backgroundColor: theme.primary,
  },
  continueButtonDisabled: {
    backgroundColor: theme.buttonSecondary,
  },
  instructionContainer: {
    backgroundColor: theme.cameraOverlay,
  },
  instructionText: {
    color: theme.text,
  },
  instructionSubtext: {
    color: theme.textSecondary,
  },
  progressText: {
    color: theme.success,
  },
  progressHint: {
    color: theme.textTertiary,
  },
  buttonContainer: {
    backgroundColor: theme.card,
    borderTopColor: theme.border,
  },
  captureButton: {
    backgroundColor: theme.primary,
  },
  captureButtonDisabled: {
    backgroundColor: theme.buttonSecondary,
  },
  permissionContainer: {
    backgroundColor: theme.background,
  },
  permissionTitle: {
    color: theme.text,
  },
  permissionText: {
    color: theme.textSecondary,
  },
  permissionButton: {
    backgroundColor: theme.primary,
  },
  modalOverlay: {
    backgroundColor: theme.overlay,
  },
  modalContent: {
    backgroundColor: theme.card,
    shadowColor: theme.shadow,
  },
  resultTitle: {
    color: theme.text,
  },
  resultMessage: {
    color: theme.textSecondary,
  },
  dateTimeContainer: {
    backgroundColor: theme.mode === 'dark' ? '#3166AE' : '#eff6ff',
    borderColor: theme.mode === 'dark' ? '#3b82f6' : '#bfdbfe',
  },
  dateTimeLabel: {
    color: theme.mode === 'dark' ? '#ffffff' : '#3166AE',
  },
  dateTimeValue: {
    color: theme.text,
  },
  dateTimeFullRow: {
    borderTopColor: theme.mode === 'dark' ? '#3b82f6' : '#bfdbfe',
  },
  dateTimeFullText: {
    color: theme.textSecondary,
  },
  confidenceContainer: {
    backgroundColor: theme.surface,
  },
  confidenceLabel: {
    color: theme.textTertiary,
  },
  confidenceValue: {
    color: theme.primary,
  },
  modalButton: {
    backgroundColor: theme.primary,
  },
  messageModalContent: {
    backgroundColor: theme.card,
    shadowColor: theme.shadow,
  },
  messageModalTitle: {
    color: theme.text,
  },
  messageModalText: {
    color: theme.textSecondary,
  },
  messageModalButton: {
    backgroundColor: theme.primary,
  },
  messageModalButtonError: {
    backgroundColor: '#ED3438',
  },
  messageModalButtonWarning: {
    backgroundColor: '#f59e0b',
  },
  messageModalButtonSuccess: {
    backgroundColor: '#16a34a',
  },
  messageModalButtonInfo: {
    backgroundColor: '#3b82f6',
  },
  // 🏦 BANK-GRADE Phase 5: ID Document capture styles (Simplified)
  idDocumentGuide: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  idDocumentSimpleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  idDocumentFrame: {
    width: '80%',
    aspectRatio: 1.6, // ID card aspect ratio (width:height)
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idDocumentBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: '#4ade80',
    borderRadius: 8,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
});
