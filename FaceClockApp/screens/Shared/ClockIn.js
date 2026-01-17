import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config/api';
import { useTheme } from '../../context/ThemeContext';
import { FaceDetectionFeedback, analyzeFrame, resetFrameAnalysis } from '../../utils/faceDetectionFeedback';
import { ProfessionalFeedback } from '../../components/ProfessionalFeedback';
import { getDeviceHeaders } from '../../utils/deviceInfo';
// Backend pre-validation: uses backend models for real-time feedback

/**
 * Preview validation: send a frame to the backend for real analysis.
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

/**
 * 🏦 BANK-GRADE: Convert error messages to user-friendly toast messages
 * Professional, helpful, and non-technical - like bank apps
 */
function getFriendlyToastMessage(errorMessage, errorType = 'general') {
  if (!errorMessage) return null;
  
  const message = errorMessage.toLowerCase();
  
  // Location errors
  if (message.includes('location') || message.includes('gps') || message.includes('coordinates')) {
    if (message.includes('permission')) {
      return '📍 Please enable location access in settings';
    }
    // 🏦 BANK-GRADE: Preserve personalized messages (they already contain staff name and details)
    if (message.includes('hey ') || message.includes('unpermitted location') || message.includes('assigned location')) {
      // Return the original message if it's already personalized
      return errorMessage;
    }
    if (message.includes('away from') || message.includes('distance')) {
      return '📍 You must be at your assigned location to clock in';
    }
    return '📍 Location unavailable. Please enable GPS';
  }
  
  // Network errors
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    if (message.includes('timeout')) {
      return '⏱️ Processing is taking longer. Please wait or try again';
    }
    return '📡 Connection issue. Please check your internet';
  }
  
  // Face recognition errors
  if (message.includes('not recognized') || message.includes('no match') || message.includes('not found')) {
    return '👤 Face not recognized. Please ensure you are registered';
  }
  
  if (message.includes('similarity') || message.includes('confidence') || message.includes('threshold')) {
    return '📸 Recognition quality too low. Try better lighting and face camera directly';
  }
  
  // Quality errors
  if (message.includes('blur') || message.includes('blurry')) {
    return '📸 Image is blurry. Hold still and ensure camera is focused';
  }
  
  if (message.includes('brightness') || message.includes('dark') || message.includes('bright')) {
    return '💡 Adjust lighting - move to a well-lit area';
  }
  
  if (message.includes('too small') || message.includes('move closer')) {
    return '📏 Move closer to the camera';
  }
  
  if (message.includes('too large') || message.includes('move further')) {
    return '📏 Move slightly farther away';
  }
  
  if (message.includes('multiple faces') || message.includes('more than one')) {
    return '👥 Only one person should be in the frame';
  }
  
  if (message.includes('liveness') || message.includes('photo')) {
    return '📸 Please use a live camera, not a photo';
  }
  
  // Generic fallback - make it friendly
  if (message.length > 100) {
    // Long message - extract key point
    if (message.includes('ensure') || message.includes('please')) {
      const sentences = errorMessage.split('\n').filter(s => s.trim());
      return sentences[0] || 'Please try again';
    }
  }
  
  return errorMessage.length > 60 ? 'Please try again' : errorMessage;
}

/**
 * 🎯 FRIENDLY MESSAGE GENERATOR: Convert backend feedback to user-friendly messages with icons
 * Displays clear, actionable instructions on screen (not buttons)
 */
function getFriendlyMessage(backendFeedback, metadata, issues = []) {
  const feedback = (backendFeedback || '').toLowerCase();
  const hasFace = metadata?.faceCount > 0;
  
  // No face detected
  if (!hasFace || feedback.includes('position your face') || feedback.includes('no face')) {
    return {
      icon: '👤',
      message: 'Position your face in the circle',
      subMessage: 'Make sure your face is clearly visible',
      color: '#fbbf24', // Yellow/amber
    };
  }
  
  // Multiple faces
  if (metadata?.faceCount > 1 || feedback.includes('multiple faces')) {
    return {
      icon: '👥',
      message: 'Only one person allowed',
      subMessage: 'Please ensure only you are in the frame',
      color: '#ED3438', // Red
    };
  }
  
  // Face too far / too small
  if (feedback.includes('move closer') || feedback.includes('too small') || metadata?.distance === 'far' || metadata?.size === 'too_small') {
    return {
      icon: '📏',
      message: 'Move closer to the camera',
      subMessage: 'Your face needs to be closer for better recognition',
      color: '#f59e0b', // Orange
    };
  }
  
  // Face too close / too large
  if (feedback.includes('move further') || feedback.includes('too large') || feedback.includes('farther away') || metadata?.distance === 'too_close' || metadata?.size === 'too_large') {
    return {
      icon: '📏',
      message: 'Move slightly farther away',
      subMessage: 'Step back a little for optimal positioning',
      color: '#f59e0b', // Orange
    };
  }
  
  // Angle issues - look straight
  if (feedback.includes('look straight') || feedback.includes('angle') || feedback.includes('straight into') || issues.includes('angle_too_tilted')) {
    return {
      icon: '👀',
      message: 'Look straight into the camera',
      subMessage: 'Face the camera directly for best results',
      color: '#f59e0b', // Orange
    };
  }
  
  // Eyes closed / not looking
  if (feedback.includes('open your eyes') || feedback.includes('eyes') || issues.includes('eyes_closed')) {
    return {
      icon: '👁️',
      message: 'Open your eyes and look at the camera',
      subMessage: 'Keep your eyes open and focused on the camera',
      color: '#f59e0b', // Orange
    };
  }
  
  // Lighting issues
  if (feedback.includes('lighting') || feedback.includes('brightness') || feedback.includes('too dark') || feedback.includes('too bright')) {
    return {
      icon: '💡',
      message: 'Adjust lighting',
      subMessage: 'Move to better lighting - not too dark or too bright',
      color: '#f59e0b', // Orange
    };
  }
  
  // Blur / hold still
  if (feedback.includes('blur') || feedback.includes('hold still') || feedback.includes('too blurry')) {
    return {
      icon: '📸',
      message: 'Hold still',
      subMessage: 'Keep your face steady for clear capture',
      color: '#f59e0b', // Orange
    };
  }
  
  // Almost ready
  if (feedback.includes('almost ready') || feedback.includes('almost')) {
    return {
      icon: '⏳',
      message: 'Almost ready!',
      subMessage: 'Hold still and maintain good position',
      color: '#86efac', // Light green
    };
  }
  
  // Ready to capture
  if (feedback.includes('ready') || feedback.includes('perfect')) {
    return {
      icon: '✅',
      message: 'Perfect! Ready to clock in',
      subMessage: 'Hold still - capturing in a moment...',
      color: '#4ade80', // Green
    };
  }
  
  // Default / good position
  if (hasFace) {
    return {
      icon: '👍',
      message: 'Good position!',
      subMessage: 'Keep adjusting for best quality',
      color: '#86efac', // Light green
    };
  }
  
  // Fallback
  return {
    icon: '👤',
    message: backendFeedback || 'Position your face in the circle',
    subMessage: 'Follow the instructions above',
    color: '#fbbf24', // Yellow
  };
}

/**
 * 🎯 ENTERPRISE QUALITY GATE: Validate ALL attributes before auto-capture
 * Ensures user is properly positioned, with good lighting, correct angle, etc.
 * Only allows capture when ALL requirements are met
 * 
 * ⚠️ CRITICAL: This function MUST return isReady: false if ANY gate fails
 * Auto-capture is COMPLETELY DISABLED until ALL gates pass
 */
function validateCaptureQuality(detectionResult, userEngagement = {}) {
  // Gate 1: Face must be detected
  if (!detectionResult || !detectionResult.hasFace) {
    return {
      isReady: false,
      reason: 'Position your face in the circle',
      failedGate: 'no_face',
    };
  }

  const metadata = detectionResult.metadata || {};
  const quality = detectionResult.quality || 0;

  // Gate 2: Only ONE face (no multiple people) - STRICT
  if (metadata.faceCount > 1) {
    return {
      isReady: false,
      reason: 'Multiple faces detected. Please ensure only you are in frame',
      failedGate: 'multiple_faces',
    };
  }

  // Gate 3: Face size must be optimal (not too small or too large) - STRICT
  if (metadata.size === 'too_small' || metadata.distance === 'far') {
    return {
      isReady: false,
      reason: 'Please move closer to the camera',
      failedGate: 'too_far',
    };
  }
  
  if (metadata.size === 'too_large' || metadata.distance === 'too_close') {
    return {
      isReady: false,
      reason: 'Please move slightly farther away',
      failedGate: 'too_close',
    };
  }

  // Gate 4: Face angle must be frontal (not tilted or turned) - STRICT (10° max)
  const angle = metadata.angle || 0;
  const headEulerAngleY = Math.abs(metadata.headEulerAngleY || 0);
  const headEulerAngleX = Math.abs(metadata.headEulerAngleX || 0);
  const headEulerAngleZ = Math.abs(metadata.headEulerAngleZ || 0);
  
  // Total angle deviation must be < 10° (stricter than before)
  const totalAngleDeviation = headEulerAngleY + headEulerAngleX + headEulerAngleZ;
  if (totalAngleDeviation > 10 || Math.abs(angle) > 10) {
    return {
      isReady: false,
      reason: 'Look straight into the camera',
      failedGate: 'angle',
    };
  }

  // Gate 5: Quality must be VERY high (minimum 85% for auto-capture) - STRICTER
  // Higher threshold ensures best results
  if (quality < 85) {
    if (quality < 50) {
      return {
        isReady: false,
        reason: 'Move to better lighting',
        failedGate: 'lighting',
      };
    } else if (quality < 70) {
      return {
        isReady: false,
        reason: 'Good position! Adjust lighting for better quality',
        failedGate: 'lighting',
      };
    } else if (quality < 85) {
      return {
        isReady: false,
        reason: 'Almost ready! Hold still and ensure good lighting',
        failedGate: 'quality',
      };
    }
  }

  // Gate 6: Eyes should be open (liveness check) - STRICT
  const leftEyeOpen = metadata.leftEyeOpenProbability ?? 1.0;
  const rightEyeOpen = metadata.rightEyeOpenProbability ?? 1.0;
  const avgEyeOpen = (leftEyeOpen + rightEyeOpen) / 2;
  
  // Eyes must be at least 70% open (stricter than 50%)
  if (avgEyeOpen < 0.7) {
    return {
      isReady: false,
      reason: 'Please open your eyes and look at the camera',
      failedGate: 'eyes_closed',
    };
  }

  // Gate 7: User engagement - user must be actively positioning (responsive)
  // Check if user has been trying to position for at least 2 seconds
  const engagementTime = userEngagement.startTime ? (Date.now() - userEngagement.startTime) / 1000 : 0;
  if (engagementTime < 2) {
    return {
      isReady: false,
      reason: 'Position your face in the circle',
      failedGate: 'engagement',
    };
  }

  // Gate 8: Stability check - quality must be consistent (not fluctuating)
  // If quality is jumping around, user is still moving
  if (userEngagement.qualityHistory && userEngagement.qualityHistory.length >= 3) {
    const recentQualities = userEngagement.qualityHistory.slice(-3);
    const qualityVariance = Math.max(...recentQualities) - Math.min(...recentQualities);
    if (qualityVariance > 15) {
      return {
        isReady: false,
        reason: 'Hold still...',
        failedGate: 'unstable',
      };
    }
  }

  // ALL GATES PASSED! Ready to capture
  return {
    isReady: true,
    reason: 'Perfect! Ready to capture ✓',
    failedGate: null,
  };
}

export default function ClockIn({ navigation, route }) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [locationError, setLocationError] = useState(null); // 🏦 Location validation error details
  const [showLocationError, setShowLocationError] = useState(false); // Show location error modal
  const [autoScanning, setAutoScanning] = useState(true);
  const [scanStatus, setScanStatus] = useState('');
  const [faceFeedback, setFaceFeedback] = useState('Position your face in the circle');
  const [liveStatusMessage, setLiveStatusMessage] = useState('Position your face in the circle');
  const [liveQualityScore, setLiveQualityScore] = useState(0);
  const [liveFaceBox, setLiveFaceBox] = useState(null);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });
  const [faceQuality, setFaceQuality] = useState(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [feedbackState, setFeedbackState] = useState('searching');
  const [lastMessage, setLastMessage] = useState(''); // Prevent message flooding
  const [latestBackendResult, setLatestBackendResult] = useState(null); // 🏦 Latest backend validation result (NO assumptions)
  const [consecutiveFramesCount, setConsecutiveFramesCount] = useState(0); // Track consecutive good frames for UI
  const [processingTimerActive, setProcessingTimerActive] = useState(false);
  const [processingTimerValue, setProcessingTimerValue] = useState('00:00');
  const cameraRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scanIntervalRef = useRef(null);
  const feedbackSystemRef = useRef(new FaceDetectionFeedback());
  const liveFeedbackRef = useRef(new FaceDetectionFeedback());
  const processingTimerRef = useRef(null);
  const processingTimerStartRef = useRef(null);
  const messageUpdateRef = useRef(Date.now()); // Throttle message updates
  const lastToastMessageRef = useRef(''); // Prevent toast spam
  const autoClockInTriggeredRef = useRef(false); // Prevent multiple auto clock-in triggers
  const locationReadyRef = useRef(false); // Track if location is ready
  const locationDataRef = useRef(null); // Store location data
  
  // Scanning animation values
  const scanRotation = useRef(new Animated.Value(0)).current;
  const scanOpacity = useRef(new Animated.Value(0.3)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  // Vertical scanning line animation (new)
  const scanLinePosition = useRef(new Animated.Value(0)).current;
  
  // Get dynamic window dimensions that update on rotation
  const { width, height } = useWindowDimensions();
  
  // Determine orientation based on dimensions
  const isLandscape = width > height;
  
  // Get clock type from route params, default to 'in' if not provided
  const initialClockType = route?.params?.clockType || 'in';
  
  // Calculate circular frame dimensions based on orientation
  const getCircleDimensions = () => {
    // For a perfect circle, width must equal height
    let circleSize;
    if (isLandscape) {
      // Landscape: maximize circle size, accounting for smaller buttons
      circleSize = Math.min(width * 0.6, height * 0.7);
    } else {
      // Portrait: use the smaller dimension to ensure circle fits
      circleSize = Math.min(width * 0.75, height * 0.5);
    }
    // Perfect circle: width === height === circleSize, borderRadius === circleSize / 2
    return { 
      width: circleSize, 
      height: circleSize, 
      borderRadius: circleSize / 2 
    };
  };
  
  const circleDimensions = getCircleDimensions();
  const handleLiveDetection = (detection) => {
    if (!detection) {
      setLiveFaceBox(null);
      setLiveQualityScore(0);
      setLiveStatusMessage('Position your face in the circle');
      return;
    }

    try {
      const liveFeedback = liveFeedbackRef.current.update(
        detection,
        detection.hasFace,
        detection.quality,
        detection.metadata
      );
      if (liveFeedback?.message) {
        setLiveStatusMessage(liveFeedback.message);
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

  const formatTimerValue = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const startProcessingTimer = () => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }
    processingTimerStartRef.current = Date.now();
    setProcessingTimerActive(true);
    setProcessingTimerValue('00:00');
    processingTimerRef.current = setInterval(() => {
      const start = processingTimerStartRef.current;
      if (!start) return;
      const elapsed = Date.now() - start;
      setProcessingTimerValue(formatTimerValue(elapsed));
    }, 200);
  };

  const stopProcessingTimer = () => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    processingTimerStartRef.current = null;
    setProcessingTimerActive(false);
  };

  // ⚡ REAL-TIME FRAME PROCESSING - Bank-style continuous analysis
  useEffect(() => {
    if (autoScanning && permission?.granted && !loading && !showResult && cameraRef.current) {
      // Reset feedback system for new session
      feedbackSystemRef.current.reset();
      liveFeedbackRef.current.reset();
      setLiveFaceBox(null);
      setLiveQualityScore(0);
      setLiveStatusMessage('Position your face in the circle');
      
      // Reset frame analysis state
      resetFrameAnalysis();
      
      // Reset auto clock-in trigger for new session
      autoClockInTriggeredRef.current = false;
      
      // Initialize with searching state
      const initialFeedback = feedbackSystemRef.current.update(null, false, 0);
      setFaceFeedback(initialFeedback.message);
      setFeedbackState(initialFeedback.state);
      setIsFaceDetected(false);
      setFaceQuality({ score: 0, isGood: false });
      
      let isProcessing = false; // Prevent overlapping frame processing
      let consecutiveGoodFrames = 0; // Track consecutive good quality frames
      // 🎯 ENTERPRISE: Require 5 consecutive frames with ALL quality gates passed
      // This ensures user is stable and properly positioned before capture
      const REQUIRED_GOOD_FRAMES = 5; // Need 5 consecutive perfect frames before auto-capture
      
      // 🎯 USER ENGAGEMENT TRACKING: Track user's positioning attempts
      const userEngagement = {
        startTime: Date.now(), // When user started positioning
        qualityHistory: [], // Track quality over time for stability check
        lastQuality: 0,
        adjustments: 0, // Count of quality improvements (user is trying)
      };
      
      // 🎬 ENHANCED VIDEO LIVENESS: Advanced temporal analysis for robust liveness detection
      const frameHistory = []; // Last 15 frames for better temporal analysis
      const MAX_FRAME_HISTORY = 15;
      let livenessScore = 0; // Track liveness confidence (0-100)
      let livenessFrames = 0; // Count frames with movement detected
      let blinkDetected = false; // Track if blinking detected (strong liveness indicator)
      let lastBlinkTime = 0; // Track when last blink was detected
      let qualityVariation = []; // Track quality variations (indicates live person adjusting)
      
      // Pre-fetch location in background (non-blocking) for automatic clock-in
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Highest,
              timeout: 10000,
              maximumAge: 5000,
            });
            locationDataRef.current = loc;
            locationReadyRef.current = true;
            console.log('📍 Location ready for auto clock-in');
          }
        } catch (err) {
          console.warn('⚠️ Location pre-fetch failed (will retry on clock-in):', err.message);
        }
      })();
      
      // ⚡ OPTIMIZED: Process frames every 500ms (2 FPS) - reduced CPU usage
      // ML Kit removed, using lightweight heuristics only
      const frameProcessingInterval = setInterval(async () => {
        // Skip if already processing or camera not ready
        if (isProcessing || !cameraRef.current || capturing || loading) {
          return;
        }
        
        let frameUri = null;
        try {
          isProcessing = true;
          
          // Capture frame silently (low quality for speed - 200x200px for fast validation)
          const frame = await cameraRef.current.takePictureAsync({
            quality: 0.2, // Very low quality for fast upload (preview only)
            base64: false,
            skipProcessing: true, // Skip processing for speed
          });
          frameUri = frame?.uri || null;

          if (frameUri) {
            try {
              const localDetection = await analyzeFrame(frameUri);
              handleLiveDetection(localDetection);
            } catch (localDetectionError) {
              console.warn('⚠️ Local detection error:', localDetectionError?.message || localDetectionError);
            }
          }

          // Send preview frame to backend for real analysis and quality checks
          const detectionResult = await validatePreviewWithBackend(frame.uri);
          
          // 🎬 ENHANCED VIDEO LIVENESS DETECTION: Multi-factor temporal analysis
          if (detectionResult.hasFace && detectionResult.metadata) {
            const currentFrame = {
              timestamp: Date.now(),
              angle: detectionResult.metadata.angle || 0,
              headEulerAngleY: detectionResult.metadata.headEulerAngleY || 0,
              headEulerAngleX: detectionResult.metadata.headEulerAngleX || 0,
              headEulerAngleZ: detectionResult.metadata.headEulerAngleZ || 0,
              faceSize: detectionResult.metadata.faceSize || 0,
              quality: detectionResult.quality || 0,
              leftEyeOpen: detectionResult.metadata.leftEyeOpenProbability ?? 1.0,
              rightEyeOpen: detectionResult.metadata.rightEyeOpenProbability ?? 1.0,
            };
            
            // Add to frame history
            frameHistory.push(currentFrame);
            if (frameHistory.length > MAX_FRAME_HISTORY) {
              frameHistory.shift(); // Keep only last 15 frames
            }
            
            // Track quality variations (live person naturally adjusts position)
            qualityVariation.push(currentFrame.quality);
            if (qualityVariation.length > 5) {
              qualityVariation.shift(); // Keep last 5 quality readings
            }
            
            // 🎬 MULTI-FACTOR LIVENESS ANALYSIS (requires at least 3 frames)
            if (frameHistory.length >= 3) {
              const recentFrames = frameHistory.slice(-3); // Last 3 frames
              let movementDetected = false;
              let microMovementDetected = false;
              
              // Factor 1: Head angle changes (natural head movement)
              for (let i = 1; i < recentFrames.length; i++) {
                const angleDiff = Math.abs(recentFrames[i].angle - recentFrames[i-1].angle);
                const headYDiff = Math.abs(recentFrames[i].headEulerAngleY - recentFrames[i-1].headEulerAngleY);
                const headXDiff = Math.abs(recentFrames[i].headEulerAngleX - recentFrames[i-1].headEulerAngleX);
                const headZDiff = Math.abs(recentFrames[i].headEulerAngleZ - recentFrames[i-1].headEulerAngleZ);
                
                // Natural movement: small angle changes (0.5-5 degrees) indicate live person
                if (angleDiff > 0.5 || headYDiff > 0.5 || headXDiff > 0.5 || headZDiff > 0.5) {
                  movementDetected = true;
                  // Micro-movements (very small changes) also count
                  if (angleDiff > 0.2 || headYDiff > 0.2 || headXDiff > 0.2) {
                    microMovementDetected = true;
                  }
                }
              }
              
              // Factor 2: Face size changes (natural distance adjustments - breathing, micro-movements)
              if (!movementDetected && recentFrames.length >= 2) {
                const sizeDiff = Math.abs(recentFrames[recentFrames.length - 1].faceSize - recentFrames[0].faceSize);
                if (sizeDiff > 3) { // Face size changed by more than 3px (natural movement)
                  movementDetected = true;
                }
              }
              
              // Factor 3: Blink detection (strongest liveness indicator)
              // Check if eyes closed and then opened (blink pattern)
              if (frameHistory.length >= 4) {
                const last4Frames = frameHistory.slice(-4);
                for (let i = 1; i < last4Frames.length; i++) {
                  const prevAvgEye = (last4Frames[i-1].leftEyeOpen + last4Frames[i-1].rightEyeOpen) / 2;
                  const currAvgEye = (last4Frames[i].leftEyeOpen + last4Frames[i].rightEyeOpen) / 2;
                  
                  // Blink detected: eyes were open, then closed (< 0.5), then open again
                  if (prevAvgEye > 0.7 && currAvgEye < 0.5) {
                    // Check if eyes opened again in next frame
                    if (i + 1 < last4Frames.length) {
                      const nextAvgEye = (last4Frames[i+1].leftEyeOpen + last4Frames[i+1].rightEyeOpen) / 2;
                      if (nextAvgEye > 0.7) {
                        blinkDetected = true;
                        lastBlinkTime = Date.now();
                        console.log('👁️ Blink detected - strong liveness indicator!');
                        break;
                      }
                    }
                  }
                }
              }
              
              // Factor 4: Quality variation (live person naturally adjusts position)
              let qualityVariationDetected = false;
              if (qualityVariation.length >= 3) {
                const qualityStdDev = Math.sqrt(
                  qualityVariation.reduce((acc, q, idx, arr) => {
                    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
                    return acc + Math.pow(q - mean, 2);
                  }, 0) / qualityVariation.length
                );
                // Natural quality variation (2-8%) indicates live person adjusting
                if (qualityStdDev > 2 && qualityStdDev < 8) {
                  qualityVariationDetected = true;
                }
              }
              
              // 🎬 ENHANCED LIVENESS SCORING: Multi-factor weighted calculation
              let livenessPoints = 0;
              
              // Movement detection (40% weight)
              if (movementDetected) {
                livenessPoints += 40;
                if (microMovementDetected) {
                  livenessPoints += 10; // Bonus for micro-movements
                }
              }
              
              // Blink detection (30% weight - strongest indicator)
              if (blinkDetected && (Date.now() - lastBlinkTime) < 5000) {
                livenessPoints += 30;
                // Reset blink flag after 5 seconds to allow new blink detection
                if ((Date.now() - lastBlinkTime) > 5000) {
                  blinkDetected = false;
                }
              }
              
              // Quality variation (20% weight)
              if (qualityVariationDetected) {
                livenessPoints += 20;
              }
              
              // Temporal consistency (10% weight - face present across multiple frames)
              if (frameHistory.length >= 5) {
                livenessPoints += 10;
              }
              
              // Update liveness score (smooth transition, not abrupt)
              const targetScore = Math.min(100, livenessPoints);
              if (targetScore > livenessScore) {
                // Increase quickly when liveness detected
                livenessScore = Math.min(100, livenessScore + 15);
              } else if (targetScore < livenessScore) {
                // Decrease slowly when no liveness (might be temporary)
                livenessScore = Math.max(0, livenessScore - 3);
              }
              
              // Track consecutive frames with liveness
              if (livenessScore >= 50) {
                livenessFrames++;
              } else {
                // Reset if score drops too low
                if (livenessScore < 30) {
                  livenessFrames = 0;
                }
              }
              
              console.log(`🎬 Liveness: ${Math.round(livenessScore)}% (frames: ${livenessFrames}, blink: ${blinkDetected}, movement: ${movementDetected})`);
            }
          } else {
            // No face detected - gradually reduce liveness (not instant reset)
            livenessScore = Math.max(0, livenessScore - 10);
            if (livenessScore < 30) {
              livenessFrames = 0;
              blinkDetected = false;
            }
          }
        
        // 🎬 AUTOMATIC CLOCK-IN: Check if all conditions are met
        // Conditions: 1) Backend says ready, 2) Liveness confirmed (video movement), 3) Quality high, 4) Location ready
        // ⏰ IMPORTANT: Clock-in time is recorded server-side when request arrives, so time is accurate (no reduction)
        const livenessConfirmed = livenessScore >= 60; // Require 60% liveness confidence (reduced from 70% for faster response)
        const qualityHigh = detectionResult.quality >= 80; // High quality required (reduced from 85% for faster response)
        const backendReady = isReady; // Backend validation passed
        const allConditionsMet = backendReady && livenessConfirmed && qualityHigh && locationReadyRef.current && !autoClockInTriggeredRef.current;
        
        if (allConditionsMet && consecutiveGoodFrames >= REQUIRED_GOOD_FRAMES) {
          // ALL CONDITIONS MET - AUTOMATIC CLOCK-IN!
          console.log('⚡⚡⚡ AUTOMATIC CLOCK-IN TRIGGERED! ⚡⚡⚡');
          console.log(`   ✅ Backend ready: ${backendReady}`);
          console.log(`   ✅ Liveness confirmed: ${Math.round(livenessScore)}% (video movement detected)`);
          console.log(`   ✅ Quality high: ${detectionResult.quality}%`);
          console.log(`   ✅ Location ready: ${locationReadyRef.current}`);
          console.log(`   ✅ Consecutive good frames: ${consecutiveGoodFrames}/${REQUIRED_GOOD_FRAMES}`);
          console.log(`   ⏰ Clock-in time will be recorded server-side when request arrives (accurate timestamp)`);
          
          autoClockInTriggeredRef.current = true; // Prevent multiple triggers
          clearInterval(frameProcessingInterval);
          setAutoScanning(false);
          setConsecutiveFramesCount(0);
          
          // Automatically clock in without button click
          // Time is recorded server-side, so no time reduction occurs
          await handleAutomaticClockIn(initialClockType, locationDataRef.current);
        }
          
          const now = Date.now();
          const shouldUpdate = (now - messageUpdateRef.current) > 500; // Update every 500ms max
          
          // 🎯 USER ENGAGEMENT: Track quality changes (responsive to user adjustments)
          const currentQuality = detectionResult.quality || 0;
          const previousQuality = userEngagement.lastQuality;
          
          // Track if quality improved (user is actively adjusting)
          if (currentQuality > previousQuality + 5) {
            // Quality improved significantly - user is actively adjusting
            userEngagement.adjustments++;
          }
          
          // Update last quality for next comparison
          userEngagement.lastQuality = currentQuality;
          
          // Track quality history for stability check (keep last 5 readings)
          userEngagement.qualityHistory.push(currentQuality);
          if (userEngagement.qualityHistory.length > 5) {
            userEngagement.qualityHistory.shift(); // Keep only last 5
          }
          
          // Use backend’s analysis: ready: true/false and specific feedback
          const isReady = detectionResult.ready === true;
          const backendFeedback = detectionResult.feedback || 'Position your face in the circle';
          
          // Update feedback system for UI state
          const feedback = feedbackSystemRef.current.update(
            detectionResult,
            detectionResult.hasFace,
            detectionResult.quality,
            detectionResult.metadata
          );
          
          // Use backend feedback (most specific and accurate)
          const displayMessage = backendFeedback;
          
          // 🏦 BANK-GRADE: Store latest backend result for professional feedback component
          // NO assumptions - only use actual backend validation data
          const backendResult = {
            feedback: backendFeedback,
            metadata: detectionResult.metadata || {},
            quality: detectionResult.quality || 0,
            isReady: isReady,
            issues: detectionResult.issues || [],
          };
          
          // Update UI (throttled to prevent flooding)
          if (shouldUpdate || displayMessage !== lastMessage) {
            setFaceFeedback(displayMessage);
            setLatestBackendResult(backendResult); // 🏦 Store for professional feedback component
            setLastMessage(displayMessage);
            messageUpdateRef.current = now;
          }
          
          // 🏦 BANK-GRADE: Update state based on ACTUAL backend validation
          // "ready" state only when backend says ready: true (NO assumptions)
          const finalState = isReady ? 'ready' : (detectionResult.hasFace ? 'good' : 'searching');
          setFeedbackState(finalState);
          setIsFaceDetected(detectionResult.hasFace);
          setFaceQuality({ 
            score: detectionResult.quality || 0, 
            isGood: isReady // Only "good" when backend says ready
          });
          
          // 🏦 BANK-GRADE: Store latest backend result
          // NO assumptions - only use actual backend validation data
          const finalBackendResult = {
            feedback: backendFeedback,
            metadata: detectionResult.metadata || {},
            quality: detectionResult.quality || 0,
            isReady: isReady,
            issues: detectionResult.issues || [],
          };
          
          setLatestBackendResult(finalBackendResult);
          
          // 🏦 REAL-TIME TOAST: Show live feedback based on backend validation
          let toastMessage = '';
          const faceCount = detectionResult.metadata?.faceCount || 0;
          const quality = detectionResult.quality || 0;
          const issues = detectionResult.issues || [];
          
          // Priority 1: Multiple faces
          if (faceCount > 1) {
            toastMessage = '⚠️ Multiple faces detected - Only one person allowed';
          }
          // Priority 2: No face
          else if (faceCount === 0) {
            toastMessage = '👤 Position your face in the circle';
          }
          // Priority 3: Issues from backend - Use backend feedback directly (synchronized)
          else if (issues.length > 0) {
            // Use backend feedback message directly - it's already user-friendly and realistic
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
            // 🎯 ENHANCED: Dynamic feedback based on actual quality and readiness
            if (isReady) {
              // Ready state - show quality level
              if (quality >= 85) {
                toastMessage = '✅ Perfect! Ready to clock in';
              } else if (quality >= 75) {
                toastMessage = '✅ Excellent! Ready to clock in';
              } else if (quality >= 70) {
                toastMessage = '✅ Good! Ready to clock in';
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
          
          // Show toast only if message changed (prevent spam)
          if (toastMessage && toastMessage !== lastToastMessageRef.current) {
            if (Platform.OS === 'android') {
              ToastAndroid.show(toastMessage, ToastAndroid.SHORT);
            }
            lastToastMessageRef.current = toastMessage;
          }
          
          // Auto-capture is only allowed when the backend marks the frame as ready
          if (isReady) {
            consecutiveGoodFrames++;
            setConsecutiveFramesCount(consecutiveGoodFrames); // Update UI state
            console.log(`✅ Quality check passed (${consecutiveGoodFrames}/${REQUIRED_GOOD_FRAMES}):`, {
              quality: detectionResult.quality,
              size: detectionResult.metadata?.size,
              distance: detectionResult.metadata?.distance,
              angle: detectionResult.metadata?.angle,
              faceCount: detectionResult.metadata?.faceCount,
            });
            
            if (consecutiveGoodFrames >= REQUIRED_GOOD_FRAMES) {
              // ALL quality gates passed consistently - auto-capture!
              clearInterval(frameProcessingInterval);
              setAutoScanning(false);
              setConsecutiveFramesCount(0); // Reset for next time
              console.log('⚡ Auto-capturing: All quality attributes satisfied!');
              await handleAutoCapture();
            }
            } else {
            // Reset counter if backend says NOT ready – trust backend judgment
            if (consecutiveGoodFrames > 0) {
              console.log(`⚠️ Backend validation failed: ${backendFeedback}`);
              console.log(`   Issues: ${detectionResult.issues?.join(', ') || 'unknown'}`);
            }
            consecutiveGoodFrames = 0; // RESET - must start over
            setConsecutiveFramesCount(0); // Reset UI state
            
            // Backend already provides specific feedback - use it
            // No need for additional frontend validation since backend is authoritative
          }
          
        } catch (error) {
          console.error('Frame processing error:', error);
          // Don't break the loop on errors
        } finally {
          isProcessing = false;
          if (frameUri) {
            try {
              await FileSystem.deleteAsync(frameUri, { idempotent: true });
            } catch (cleanupError) {
              console.warn('⚠️ Preview cleanup error:', cleanupError?.message || cleanupError);
            }
          }
        }
      }, 500); // ⚡ OPTIMIZED: Process every 500ms (2 FPS) - reduced CPU usage, ML Kit removed
      
      // Start scanning animation - rotating arcs
      const rotateAnimation = Animated.loop(
        Animated.timing(scanRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      
      // Pulsing opacity animation
      const opacityAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scanOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Subtle pulse scale animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Vertical scanning line animation (lightweight, smooth)
      const scanLineAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLinePosition, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLinePosition, {
            toValue: 0,
            duration: 0, // Instant reset
            useNativeDriver: true,
          }),
        ])
      );
      
      rotateAnimation.start();
      opacityAnimation.start();
      pulseAnimation.start();
      scanLineAnimation.start();
      
      return () => {
        clearInterval(frameProcessingInterval);
        rotateAnimation.stop();
        opacityAnimation.stop();
        pulseAnimation.stop();
        scanLineAnimation.stop();
        scanRotation.setValue(0);
        scanOpacity.setValue(0.3);
        pulseScale.setValue(1);
        scanLinePosition.setValue(0);
      };
    } else {
      // Stop animations when not scanning
      scanRotation.setValue(0);
      scanOpacity.setValue(0.3);
      pulseScale.setValue(1);
      scanLinePosition.setValue(0);
    }
    
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [autoScanning, permission?.granted, loading, showResult, capturing]);

  useEffect(() => {
    if (!autoScanning) {
      setLiveFaceBox(null);
      setLiveQualityScore(0);
    }
  }, [autoScanning]);

  useEffect(() => {
    return () => {
      stopProcessingTimer();
    };
  }, []);

  const handleAutoCapture = async () => {
    if (capturing || loading || !cameraRef.current || showResult) return;
    
    // Stop auto-scanning immediately when capturing
    setAutoScanning(false);
    
    // Clear any ongoing scan interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    await captureAndClock(initialClockType);
  };
  
  // 🎬 AUTOMATIC CLOCK-IN: Handle automatic clock-in without button click
  const handleAutomaticClockIn = async (clockType, locationData) => {
    if (capturing || loading || !cameraRef.current || showResult) return;
    
    setCapturing(true);
    setLoading(true);
    startProcessingTimer();
    
    // Show user feedback that automatic clock-in is happening
    if (Platform.OS === 'android') {
      ToastAndroid.show('🎬 Automatic clock-in detected! Verifying...', ToastAndroid.SHORT);
    }
    
    try {
      // Capture high-quality photo for clock-in
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      // Resize image to a backend‑optimized size for secure processing
      const resizedPhoto = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 900 } }],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      
      // Get location (use pre-fetched if available, otherwise get fresh)
      let location = locationData;
      if (!location || !location.coords) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('Location permission not granted');
          }
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            timeout: 15000,
            maximumAge: 5000,
          });
        } catch (locationError) {
          console.error('❌ Error getting location for auto clock-in:', locationError);
          if (Platform.OS === 'android') {
            ToastAndroid.show('📍 Location required for clock-in. Please enable GPS.', ToastAndroid.LONG);
          }
          setLoading(false);
          setCapturing(false);
          stopProcessingTimer();
          // Resume auto-scanning
          setAutoScanning(true);
          return;
        }
      }
      
      // Process clock-in automatically
      await processClock(resizedPhoto.uri, clockType, location);
    } catch (error) {
      console.error('❌ Error in automatic clock-in:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('⚠️ Automatic clock-in failed. Please try manually.', ToastAndroid.LONG);
      }
      setLoading(false);
      setCapturing(false);
    stopProcessingTimer();
      // Resume auto-scanning
      setAutoScanning(true);
    }
  };

  const captureAndClock = async (clockType) => {
    if (capturing || loading) return;

    setCapturing(true);
    startProcessingTimer();
    
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
        // Capture photo
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        // Resize image to a backend‑optimized size for secure processing
        console.log('📐 Preparing image for secure face verification (high quality resize)...');
        const resizedPhoto = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 900 } }],
          { compress: 0.9, format: SaveFormat.JPEG }
        );
        console.log(`✅ Clock image prepared: ${resizedPhoto.width}x${resizedPhoto.height}`);

        // Send resized image to backend - backend will validate face
        // Backend is already working perfectly (98%+ quality detection)
        await processClock(resizedPhoto.uri, clockType);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('📸 Unable to capture photo. Please try again.', ToastAndroid.LONG);
      }
      setCapturing(false);
      stopProcessingTimer();
    }
  };

  const processClock = async (imageUri, clockType, preFetchedLocation = null) => {
    setLoading(true);
    
    // OPTIMISTIC UI: Show loading state immediately
    // This makes the app feel faster even while processing
    
    try {
      // Get user's current location (use pre-fetched if available)
      let location = preFetchedLocation;
      
      if (!location || !location.coords) {
        try {
          // Check location permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            if (Platform.OS === 'android') {
              ToastAndroid.show('📍 Location access is required. Please enable in settings.', ToastAndroid.LONG);
            }
            setLoading(false);
            setCapturing(false);
            return;
          }
          
          // Get current location with HIGHEST accuracy for precise validation
          // Using Highest accuracy ensures we get the most precise GPS coordinates
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest, // Changed from Balanced to Highest for better accuracy
            timeout: 15000, // Increased timeout to 15 seconds to allow GPS to get better fix
            maximumAge: 5000, // Accept location if it's less than 5 seconds old
          });
          
          console.log('📍 Location obtained:', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
          });
          
          // Warn if GPS accuracy is poor
          if (location.coords.accuracy > 50) {
            console.warn(`⚠️ GPS accuracy is ${Math.round(location.coords.accuracy)}m - this may affect location validation`);
          }
        } catch (locationError) {
          console.error('❌ Error getting location:', locationError);
          if (Platform.OS === 'android') {
            ToastAndroid.show('📍 Unable to get location. Please enable GPS and try again.', ToastAndroid.LONG);
          }
          setLoading(false);
          setCapturing(false);
          return;
        }
      } else {
        console.log('📍 Using pre-fetched location:', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        });
      }
      
      if (!location || !location.coords) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('📍 Location not available. Please enable GPS.', ToastAndroid.LONG);
        }
        setLoading(false);
        setCapturing(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('type', clockType);
      formData.append('latitude', location.coords.latitude.toString());
      formData.append('longitude', location.coords.longitude.toString());
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      console.log('🔄 Sending secure clock request with location...');
      console.log('⏱️ Request timeout set to 120 seconds to allow for secure processing.');
      
      // Track request start time for progress feedback
      const requestStartTime = Date.now();
      
      // Show progress updates to user
      const progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - requestStartTime) / 1000);
        if (elapsed > 10 && elapsed % 10 === 0) {
          console.log(`⏳ Still processing... (${elapsed}s elapsed)`);
        }
      }, 1000);
      
      try {
        // 🏦 BANK-GRADE Phase 3 & 4: Include device headers for fingerprinting and quality tracking
        const deviceHeaders = await getDeviceHeaders();
        
        // ⚡ OPTIMIZED: Increased timeout to 120 seconds for better reliability
        // Face recognition can take 30-60 seconds, plus network latency
        const response = await axios.post(`${API_BASE_URL}/staff/clock`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            // 🏦 BANK-GRADE: Device fingerprinting headers
            'x-device-useragent': deviceHeaders.userAgent,
            'x-device-platform': deviceHeaders.platform,
            'x-device-language': deviceHeaders.language,
            'x-device-timezone': deviceHeaders.timezone,
            'x-device-id': deviceHeaders.deviceId,
            'x-device-info': deviceHeaders.deviceInfo,
            'x-device-hash': deviceHeaders.deviceHash,
          },
          timeout: 120000, // 120 seconds - ONNX processing (30-60s) + network latency
        });
        
        // Clear progress interval on success
        clearInterval(progressInterval);
        
        const requestTime = ((Date.now() - requestStartTime) / 1000).toFixed(1);
        console.log(`✅ Response received in ${requestTime}s`);

        console.log('✅ Response received:', {
          status: response.status,
          success: response.data?.success,
          message: response.data?.message,
          staffName: response.data?.staffName,
        });

        // Check if response has success flag
        if (response.data && response.data.success) {
          // Stop auto-scanning on success
          setAutoScanning(false);
          
          // Clear any scan intervals
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          
          const resultData = {
            message: response.data.message || `${response.data.staffName} clocked ${clockType}`,
            staffName: response.data.staffName,
            clockType: response.data.clockType,
            timestamp: response.data.timestamp,
            date: response.data.date,
            time: response.data.time,
            dateTime: response.data.dateTime || response.data.date + ' at ' + response.data.time,
            confidence: response.data.confidence,
            // ⏰ WORKING HOURS: Include time validation info
            timeValidation: response.data.timeValidation || null,
          };
          
          // ⏰ Show warning if clock time is outside assigned hours
          if (response.data.timeValidation && !response.data.timeValidation.isOnTime && response.data.timeValidation.warning) {
            if (Platform.OS === 'android') {
              ToastAndroid.show('⚠️ ' + response.data.timeValidation.warning, ToastAndroid.LONG);
            }
          }
          
          // Cache successful clock-in locally for offline access
          try {
            const cacheKey = `clock_${response.data.staffName}_${Date.now()}`;
            await AsyncStorage.setItem(cacheKey, JSON.stringify(resultData));
            // Keep only last 10 clock-ins in cache
            const keys = await AsyncStorage.getAllKeys();
            const clockKeys = keys.filter(k => k.startsWith('clock_')).sort();
            if (clockKeys.length > 10) {
              await AsyncStorage.multiRemove(clockKeys.slice(0, clockKeys.length - 10));
            }
          } catch (cacheError) {
            console.warn('⚠️ Failed to cache clock-in result:', cacheError);
          }
          
          setResult(resultData);
          setShowResult(true);
        } else {
          // Response received but no success flag
          console.warn('⚠️ Response received but success flag is false or missing:', response.data);
          const errorMessage = response.data?.error || 'Unable to complete clock-in. Please try again.';
          if (Platform.OS === 'android') {
            ToastAndroid.show('⚠️ ' + errorMessage, ToastAndroid.LONG);
          }
        }
      } catch (axiosError) {
        // Clear progress interval on error
        clearInterval(progressInterval);
        
        // 🚦 Handle device-approval modal directly from backend 403 response
        const data = axiosError?.response?.data;
        if (
          axiosError?.response?.status === 403 &&
          data?.requiresDeviceApproval &&
          (data.deviceMessage || data.error)
        ) {
          setLoading(false);
          setCapturing(false);
          setAutoScanning(false);
          // Show modal-friendly message
          if (Platform.OS === 'android') {
            ToastAndroid.show(data.deviceMessage || data.error, ToastAndroid.LONG);
          } else {
            Alert.alert('Device Pending Approval', data.deviceMessage || data.error);
          }
          // Optionally set a local modal state if you have one; keeping simple here
          return;
        }
        
        // Re-throw to be caught by outer catch
        throw axiosError;
      }
    } catch (error) {
      console.error('❌ Error clocking in/out:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      
      let errorMessage = 'Failed to process clock in/out.';
      let showRetry = false;
      
      // Handle timeout errors - backend might have succeeded but response didn't arrive in time
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // ⚡ OPTIMIZED: Verify if clock-in actually succeeded before showing error
        console.log('⏱️ Request timed out - verifying if clock-in succeeded...');
        errorMessage = 'Processing is taking longer than expected. Your clock-in may have been recorded. Please check your history.';
        showRetry = true;
      } else if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error' || error.message?.includes('Network Error')) {
        errorMessage = 'Unable to connect. Please check your internet connection and try again.';
        showRetry = true;
      } else if (error.response?.status === 403 && error.response?.data?.error) {
        // 🏦 BANK-GRADE: Location validation error (403 Forbidden)
        // Extract detailed information from backend response for personalized message
        const backendError = error.response.data.error;
        const details = error.response.data.details;
        
        // Check if this is a location validation error
        if (backendError.toLowerCase().includes('location') || 
            backendError.toLowerCase().includes('away from') ||
            backendError.toLowerCase().includes('distance') ||
            (details && (details.distance !== undefined || details.requiredRadius !== undefined))) {
          
          // 🏦 BANK-GRADE: Extract detailed information from backend response
          const staffName = error.response.data.staffName; // Staff name from backend
          const assignedLocation = error.response.data.assignedLocation; // Assigned location from backend
          
          // Extract location details from error message and details object
          let locationName = assignedLocation || null;
          let distance = null;
          let requiredRadius = null;
          
          // Try to extract location name from error message if not in response (format: "location \"LOCATION_NAME\"")
          if (!locationName) {
            const locationMatch = backendError.match(/location\s+"([^"]+)"/i) || 
                                 backendError.match(/location\s+([A-Z_]+)/i);
            if (locationMatch) {
              locationName = locationMatch[1];
            }
          }
          
          // Extract distance from error message (format: "X.Xkm" or "Xm")
          const distanceMatch = backendError.match(/([\d.]+)\s*(km|m)\s+away/i);
          if (distanceMatch) {
            distance = distanceMatch[1] + (distanceMatch[2] || 'm');
          } else if (details && details.distance) {
            // Use distance from details object
            const distMeters = details.distance;
            if (distMeters >= 1000) {
              distance = (distMeters / 1000).toFixed(1) + 'km';
            } else {
              distance = Math.round(distMeters) + 'm';
            }
          }
          
          // Extract required radius from error message or details
          if (details && details.requiredRadius) {
            const reqRadius = details.requiredRadius;
            if (reqRadius >= 1000) {
              requiredRadius = (reqRadius / 1000).toFixed(1) + 'km';
            } else {
              requiredRadius = Math.round(reqRadius) + 'm';
            }
          } else {
            const radiusMatch = backendError.match(/within\s+([\d.]+)\s*(km|m)/i);
            if (radiusMatch) {
              requiredRadius = radiusMatch[1] + (radiusMatch[2] || 'm');
            }
          }
          
          // 🏦 BANK-GRADE: Build simplified professional error message
          let personalizedMessage = '';
          if (staffName) {
            // Simple, professional message with staff name
            personalizedMessage = `${staffName.toUpperCase()}, YOUR CURRENT LOCATION IS DENIED, PLEASE PROCEED TO YOUR ASSIGNED LOCATION OR CONTACT YOUR ADMINISTRATOR FOR ASSISTANCE`;
          } else {
            // Generic message (fallback if staff name not available)
            personalizedMessage = `YOUR CURRENT LOCATION IS DENIED, PLEASE PROCEED TO YOUR ASSIGNED LOCATION OR CONTACT YOUR ADMINISTRATOR FOR ASSISTANCE`;
          }
          
          // 🏦 BANK-GRADE: Store location error details and show modal (not toast)
          setLocationError({
            message: personalizedMessage,
            staffName: staffName,
            assignedLocation: locationName,
            distance: distance,
            requiredRadius: requiredRadius,
            details: details
          });
          setShowLocationError(true);
          // Stop loading and capturing states
          setLoading(false);
          setCapturing(false);
          errorMessage = personalizedMessage; // Also set for fallback
        } else {
          // Other 403 errors (not location-related)
          errorMessage = backendError;
        }
      } else if (error.response?.data?.error) {
        const backendError = error.response.data.error.toLowerCase();
        
        // 🏦 BANK-GRADE: User-friendly error messages (non-technical, helpful)
        if (backendError.includes('liveness') || backendError.includes('photo') || backendError.includes('non-live')) {
          errorMessage = 'Please use a live camera, not a photo';
        } else if (backendError.includes('too blurry') || backendError.includes('blur')) {
          errorMessage = 'Image is blurry. Hold still and ensure camera is focused';
        } else if (backendError.includes('brightness') || backendError.includes('too dark') || backendError.includes('too bright')) {
          errorMessage = 'Adjust lighting - move to a well-lit area';
        } else if (backendError.includes('too small') && backendError.includes('face')) {
          errorMessage = 'Move closer to the camera';
        } else if (backendError.includes('too large') && backendError.includes('face')) {
          errorMessage = 'Move slightly farther away';
        } else if (backendError.includes('image too small') || backendError.includes('minimum.*width')) {
          errorMessage = 'Camera quality too low. Please use a better camera';
        } else if (backendError.includes('facial features')) {
          errorMessage = 'Face features not clear. Face camera directly with good lighting';
        } else if (backendError.includes('face') && (backendError.includes('detect') || backendError.includes('not found'))) {
          errorMessage = 'No face detected. Ensure your face is clearly visible';
        } else if (backendError.includes('face') && backendError.includes('quality')) {
          errorMessage = 'Image quality too low. Improve lighting and face camera directly';
        } else if (backendError.includes('multiple') || backendError.includes('more than one') || backendError.includes('only one')) {
          errorMessage = 'Only one person should be in the frame';
        } else if (backendError.includes('not recognized') || backendError.includes('not found') || backendError.includes('unknown') || backendError.includes('no match')) {
          errorMessage = 'Face not recognized. Please ensure you are registered';
        } else if (backendError.includes('confidence') || backendError.includes('match') || backendError.includes('similarity') || backendError.includes('threshold')) {
          errorMessage = 'Recognition quality too low. Try better lighting and face camera directly';
        } else {
          errorMessage = error.response.data.error;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Connection issue. Please check your internet';
      }

      // 🏦 BANK-GRADE: Show user-friendly toast message instead of alert
      // Skip toast for location errors (they have their own modal)
      if (!showLocationError) {
        const friendlyMessage = getFriendlyToastMessage(errorMessage);
        if (friendlyMessage && Platform.OS === 'android') {
          ToastAndroid.show(friendlyMessage, ToastAndroid.LONG);
        }
        
        // For retry cases, show additional guidance
        if (showRetry && Platform.OS === 'android') {
          setTimeout(() => {
            ToastAndroid.show('💡 Tip: Check your clock-in history or try again', ToastAndroid.SHORT);
          }, 2000);
        }
      }
    } finally {
      setLoading(false);
      setCapturing(false);
      stopProcessingTimer();
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setResult(null);
    // Reset auto clock-in trigger for next session
    autoClockInTriggeredRef.current = false;
    // Resume auto-scanning for next person after OK
    setAutoScanning(true);
  };

  // 🏦 BANK-GRADE: Close location error modal and navigate to main menu
  const closeLocationError = () => {
    setShowLocationError(false);
    setLocationError(null);
    // Reset auto clock-in trigger
    autoClockInTriggeredRef.current = false;
    // Navigate to main menu
    navigation.navigate('MainMenu');
  };

  if (!permission) {
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const dynamicStyles = getDynamicStyles(theme);
  const liveBoundingStyle = getFaceBoxStyle(liveFaceBox, cameraLayout, true);

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.backButtonText, dynamicStyles.backButtonText]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
          {initialClockType === 'in' ? 'Clock In' : 
           initialClockType === 'out' ? 'Clock Out' : 
           initialClockType === 'break_start' ? 'Start Tea Time' : 
           initialClockType === 'break_end' ? 'End Tea Time' :
           initialClockType === 'extra_shift_in' ? 'Extra Shift - Clock In' :
           initialClockType === 'extra_shift_out' ? 'Extra Shift - Clock Out' :
           initialClockType === 'lunch_start' ? 'Start Lunch' :
           initialClockType === 'lunch_end' ? 'End Lunch' :
           'Clock In / Out'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Camera View */}
      {permission.granted === true ? (
        <View
          style={styles.cameraContainer}
          onLayout={(event) => setCameraLayout(event.nativeEvent.layout)}
        >
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
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
              <View style={styles.faceFrameContainer}>
                {/* Outer scanning circle with animation - only when autoScanning */}
                {autoScanning && !loading && !capturing && (
                  <Animated.View
                    style={[
                      styles.scanningCircle,
                      {
                        width: circleDimensions.width + 10,
                        height: circleDimensions.height + 10,
                        borderRadius: (circleDimensions.borderRadius + 5),
                        transform: [
                          {
                            rotate: scanRotation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                          { scale: pulseScale },
                        ],
                        opacity: scanOpacity,
                      },
                    ]}
                  >
                    {/* Scanning arcs */}
                    <View style={styles.scanArc1} />
                    <View style={styles.scanArc2} />
                    <View style={styles.scanArc3} />
                  </Animated.View>
                )}
                
                {/* Main circle frame */}
                <Animated.View
                  style={[
                    styles.circleFrame,
                    {
                      width: circleDimensions.width,
                      height: circleDimensions.height,
                      borderRadius: circleDimensions.borderRadius,
                      transform: autoScanning && !loading && !capturing ? [{ scale: pulseScale }] : [],
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
                
                {/* Vertical scanning line animation - lightweight, smooth */}
                {autoScanning && !loading && !capturing && (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        width: circleDimensions.width * 0.9,
                        height: 3,
                        transform: [
                          {
                            translateY: scanLinePosition.interpolate({
                              inputRange: [0, 1],
                              outputRange: [
                                -circleDimensions.height / 2,
                                circleDimensions.height / 2,
                              ],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}
                
              {/* Professional, compact quality status – bank-style */}
              {autoScanning && !loading && !capturing && latestBackendResult && latestBackendResult.quality > 0 && (
                <View style={styles.qualityIndicatorContainer}>
                  <View style={styles.qualityScoreContainer}>
                    <Text style={styles.qualityScoreLabel}>Image quality</Text>
                    <View style={styles.qualityScoreBarContainer}>
                      <View
                        style={[
                          styles.qualityScoreBar,
                          {
                            width: `${Math.min(Math.max(latestBackendResult.quality, 0), 100)}%`,
                            backgroundColor:
                              latestBackendResult.quality >= 85
                                ? '#10b981'
                                : latestBackendResult.quality >= 70
                                ? '#3b82f6'
                                : latestBackendResult.quality >= 60
                                ? '#f59e0b'
                                : '#ED3438',
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.qualityScoreText,
                      {
                        color:
                          latestBackendResult.quality >= 85
                            ? '#10b981'
                            : latestBackendResult.quality >= 70
                            ? '#3b82f6'
                            : latestBackendResult.quality >= 60
                            ? '#f59e0b'
                            : '#ED3438',
                      },
                    ]}
                  >
                    {Math.round(latestBackendResult.quality)}%
                  </Text>
                </View>
              )}
              </View>
          </View>
        </View>
      ) : (
        <View style={[styles.permissionContainer, dynamicStyles.permissionContainer]}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={[styles.permissionTitle, dynamicStyles.permissionTitle]}>Camera Permission Required</Text>
          <Text style={[styles.permissionText, dynamicStyles.permissionText]}>
            We need access to your camera to recognize your face.
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, dynamicStyles.permissionButton]} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      {processingTimerActive && (
        <View style={[styles.processingTimerWrapper, dynamicStyles.processingTimerWrapper]}>
          <Text style={[styles.processingTimerLabel, dynamicStyles.processingTimerLabel]}>Processing</Text>
          <Text style={[styles.processingTimerValue, dynamicStyles.processingTimerValue]}>{processingTimerValue}</Text>
        </View>
      )}

      {/* Live feedback card - visible on all platforms */}
      {permission.granted === true && (
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
              <View style={styles.instructionHeader}>
                <Text style={styles.instructionIcon}>👤</Text>
                <Text style={styles.instructionText}>
                  {liveStatusMessage || faceFeedback}
                </Text>
              </View>
              <Text style={styles.instructionSubtext}>
                {faceFeedback}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action Button - Adaptive size based on orientation */}
      <View style={[
        styles.buttonContainer,
        dynamicStyles.buttonContainer,
        isLandscape && styles.buttonContainerLandscape
      ]}>
        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <TouchableOpacity
            style={[
              styles.clockButton,
              initialClockType === 'in' && styles.clockInButton,
              initialClockType === 'out' && styles.clockOutButton,
              (initialClockType === 'break_start' || initialClockType === 'break_end' || 
               initialClockType === 'lunch_start' || initialClockType === 'lunch_end') && styles.breakButton,
              (loading || capturing) && styles.buttonDisabled,
              isLandscape && styles.clockButtonLandscape,
            ]}
            onPress={() => {
              if (!autoScanning) {
                // If auto-scanning is stopped, restart it first
                setAutoScanning(true);
              }
              captureAndClock(initialClockType);
            }}
            disabled={!!(loading || capturing)}
            activeOpacity={0.8}
          >
            {loading || capturing ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[
                  styles.clockButtonText,
                  isLandscape && styles.clockButtonTextLandscape
                ]}>Verifying...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>
                  {initialClockType === 'in' ? '✓' : 
                   initialClockType === 'out' ? '✗' : 
                   initialClockType === 'break_start' ? '▶' : '■'}
                </Text>
                <Text style={[
                  styles.clockButtonText,
                  isLandscape && styles.clockButtonTextLandscape
                ]}>
              {initialClockType === 'in' ? 'Clock In' : 
               initialClockType === 'out' ? 'Clock Out' : 
               initialClockType === 'break_start' ? 'Start Tea Time' :
               initialClockType === 'break_end' ? 'End Tea Time' :
               initialClockType === 'extra_shift_in' ? 'Extra Shift In' :
               initialClockType === 'extra_shift_out' ? 'Extra Shift Out' :
               initialClockType === 'lunch_start' ? 'Start Lunch' :
               initialClockType === 'lunch_end' ? 'End Lunch' :
               'Clock'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Success Modal */}
      <Modal
        visible={!!showResult}
        transparent={true}
        animationType="fade"
        onRequestClose={closeResult}
      >
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✅</Text>
            </View>
            <Text style={[styles.resultTitle, dynamicStyles.resultTitle]}>
              {result?.clockType === 'in' ? 'Clock-In Success!' : 
               result?.clockType === 'out' ? 'Clock-Out Success!' : 
               result?.clockType === 'break_start' ? 'Tea Time Started!' : 
               result?.clockType === 'break_end' ? 'Tea Time Ended!' :
               result?.clockType === 'extra_shift_in' ? 'Extra Shift Started!' :
               result?.clockType === 'extra_shift_out' ? 'Extra Shift Ended!' :
               result?.clockType === 'lunch_start' ? 'Lunch Started!' :
               result?.clockType === 'lunch_end' ? 'Lunch Ended!' :
               'Success!'}
            </Text>
            <Text style={[styles.resultMessage, dynamicStyles.resultMessage]}>{result?.message}</Text>
            
            {/* Date and Time Display */}
            {(result?.date || result?.time || result?.dateTime) && (
              <View style={[styles.dateTimeContainer, dynamicStyles.dateTimeContainer]}>
                <View style={styles.dateTimeRow}>
                  <Text style={[styles.dateTimeLabel, dynamicStyles.dateTimeLabel]}>📅 Date:</Text>
                  <Text style={[styles.dateTimeValue, dynamicStyles.dateTimeValue]}>{result.date || 'N/A'}</Text>
                </View>
                <View style={styles.dateTimeRow}>
                  <Text style={[styles.dateTimeLabel, dynamicStyles.dateTimeLabel]}>🕐 Time:</Text>
                  <Text style={[styles.dateTimeValue, dynamicStyles.dateTimeValue]}>{result.time || 'N/A'}</Text>
                </View>
                {result.dateTime && (
                  <View style={[styles.dateTimeFullRow, dynamicStyles.dateTimeFullRow]}>
                    <Text style={[styles.dateTimeFullText, dynamicStyles.dateTimeFullText]}>{result.dateTime}</Text>
                  </View>
                )}
              </View>
            )}
            
            {result?.confidence && (
              <View style={[styles.confidenceContainer, dynamicStyles.confidenceContainer]}>
                <Text style={[styles.confidenceLabel, dynamicStyles.confidenceLabel]}>Confidence:</Text>
                <Text style={[styles.confidenceValue, dynamicStyles.confidenceValue]}>{result.confidence}%</Text>
              </View>
            )}
            
            {/* ⏰ WORKING HOURS: Show warning if clock time is outside assigned hours */}
            {result?.timeValidation && !result.timeValidation.isOnTime && result.timeValidation.warning && (
              <View style={styles.timeWarningContainer}>
                <Text style={styles.timeWarningIcon}>⚠️</Text>
                <Text style={styles.timeWarningText}>{result.timeValidation.warning}</Text>
                {result.timeValidation.expectedTime && (
                  <Text style={styles.timeWarningExpected}>
                    Expected: {result.timeValidation.expectedTime}
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.modalButton, dynamicStyles.modalButton]}
              onPress={closeResult}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🏦 BANK-GRADE: Location Validation Error Modal */}
      <Modal
        visible={showLocationError}
        transparent={true}
        animationType="fade"
        onRequestClose={closeLocationError}
      >
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, styles.locationErrorModalContent, dynamicStyles.modalContent]}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorIcon}>📍</Text>
            </View>
            <Text style={[styles.locationErrorTitle, dynamicStyles.resultTitle]}>
              Location Blocked!
            </Text>
            <Text style={[styles.locationErrorMessage, dynamicStyles.resultMessage]}>
              {(() => {
                const message = locationError?.message || 'YOUR CURRENT LOCATION IS DENIED, PLEASE PROCEED TO YOUR ASSIGNED LOCATION OR CONTACT YOUR ADMINISTRATOR FOR ASSISTANCE';
                const staffName = locationError?.staffName;
                
                // If staff name exists in message, highlight it with label color
                if (staffName && message.includes(staffName.toUpperCase())) {
                  const staffNameUpper = staffName.toUpperCase();
                  const parts = message.split(staffNameUpper);
                  return (
                    <>
                      {parts[0]}
                      <Text style={[styles.locationErrorStaffName, dynamicStyles.locationErrorLabel]}>
                        {staffNameUpper}
                      </Text>
                      {parts[1]}
                    </>
                  );
                }
                return message;
              })()}
            </Text>
            
            {/* Location Details */}
            {locationError && (
              <View style={[styles.locationErrorContainer, dynamicStyles.locationErrorContainer]}>
                {locationError.assignedLocation && (
                  <View style={styles.locationErrorRow}>
                    <Text style={[styles.locationErrorLabel, dynamicStyles.locationErrorLabel]}>Assigned Location:</Text>
                    <Text style={[styles.locationErrorValue, dynamicStyles.locationErrorValue]}>{locationError.assignedLocation}</Text>
                  </View>
                )}
                {locationError.distance && (
                  <View style={styles.locationErrorRow}>
                    <Text style={[styles.locationErrorLabel, dynamicStyles.locationErrorLabel]}>Distance from Location:</Text>
                    <Text style={[styles.locationErrorValue, dynamicStyles.locationErrorValue]}>{locationError.distance}</Text>
                  </View>
                )}
                {locationError.requiredRadius && (
                  <View style={styles.locationErrorRow}>
                    <Text style={[styles.locationErrorLabel, dynamicStyles.locationErrorLabel]}>Required Proximity:</Text>
                    <Text style={[styles.locationErrorValue, dynamicStyles.locationErrorValue]}>Within {locationError.requiredRadius}</Text>
                  </View>
                )}
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.modalButton, dynamicStyles.modalButton, styles.acknowledgeButton]}
              onPress={closeLocationError}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Acknowledge</Text>
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
    pointerEvents: 'box-none', // Allow touches to pass through to camera
    flex: 1,
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
    maxWidth: 200,
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
  // 🏦 BANK-GRADE: Professional feedback container
  professionalFeedbackContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  processingTimerWrapper: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
  },
  processingTimerLabel: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  processingTimerValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qualityIndicatorContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.9)', // subtle dark pill
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  qualityScoreContainer: {
    flexDirection: 'column',
    flex: 1,
    marginRight: 12,
  },
  qualityScoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  qualityScoreBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  qualityScoreBar: {
    height: '100%',
    borderRadius: 999,
  },
  qualityScoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  framesProgressContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  framesProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  framesProgressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  framesProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  autoClockInIndicator: {
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  autoClockInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
  },
  
  // Legacy styles (kept for backward compatibility, will be removed)
  instructionContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  instructionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  instructionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
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
    transition: 'width 0.3s ease',
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
  readyContainer: {
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  readyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  readyText: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressContainer: {
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 2,
  },
  scanLine: {
    position: 'absolute',
    backgroundColor: '#00d4ff',
    opacity: 0.8,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  buttonContainerLandscape: {
    padding: 10,
  },
  clockButton: {
    width: '100%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  clockButtonLandscape: {
    padding: 12,
  },
  clockInButton: {
    backgroundColor: '#3166AE',
  },
  clockOutButton: {
    backgroundColor: '#dc2626',
  },
  breakButton: {
    backgroundColor: '#f59e0b',
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e0',
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clockButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clockButtonTextLandscape: {
    fontSize: 13,
  },
  buttonIcon: {
    fontSize: 16,
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
  timeWarningContainer: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  timeWarningIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  timeWarningText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  timeWarningExpected: {
    fontSize: 12,
    color: '#78350f',
    textAlign: 'center',
    fontStyle: 'italic',
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
  // 🏦 BANK-GRADE: Location error modal styles (smaller, more compact)
  locationErrorModalContent: {
    width: '75%',
    maxWidth: 320,
    padding: 20,
    marginTop: 60, // Move back a bit from center
  },
  errorIconContainer: {
    marginBottom: 12,
  },
  errorIcon: {
    fontSize: 48,
  },
  locationErrorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  locationErrorMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  locationErrorStaffName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e', // Matches locationErrorLabel color
  },
  locationErrorContainer: {
    width: '100%',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  locationErrorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationErrorLabel: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    flex: 1,
  },
  locationErrorValue: {
    fontSize: 12,
    color: '#78350f',
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },
  acknowledgeButton: {
    backgroundColor: '#f59e0b', // Orange/amber color for acknowledgment
    paddingHorizontal: 40,
    paddingVertical: 12,
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
  backButtonText: {
    color: theme.primary,
  },
  headerTitle: {
    color: theme.primary,
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
  instructionContainer: {
    backgroundColor: theme.cameraOverlay,
  },
  instructionText: {
    color: theme.text,
  },
  instructionSubtext: {
    color: theme.textSecondary,
  },
  buttonContainer: {
    backgroundColor: theme.card,
    borderTopColor: theme.border,
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
  locationErrorContainer: {
    backgroundColor: theme.mode === 'dark' ? '#78350f' : '#fef3c7',
    borderColor: theme.mode === 'dark' ? '#f59e0b' : '#f59e0b',
  },
  locationErrorLabel: {
    color: theme.mode === 'dark' ? '#fde68a' : '#92400e',
  },
  locationErrorValue: {
    color: theme.mode === 'dark' ? '#ffffff' : '#78350f',
  },
  locationErrorStaffName: {
    color: theme.mode === 'dark' ? '#fde68a' : '#92400e', // Matches locationErrorLabel color
  },
  processingTimerWrapper: {
    backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.75)',
  },
  processingTimerLabel: {
    color: theme.mode === 'dark' ? '#fde047' : '#fbbf24',
  },
  processingTimerValue: {
    color: theme.text,
  },
});
