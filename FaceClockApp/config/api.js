// api.js
// Environment-aware API configuration
// Automatically detects local development vs production

import { Platform } from 'react-native';

// Check if we're in development mode
// __DEV__ is a global variable set by React Native/Expo
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

// Get API URL from environment variable or use defaults
const getApiUrl = () => {
  // In development mode, ALWAYS force local backend (ignore production URL)
  if (isDevelopment) {
    // Check if environment variable is set to production URL - override it in dev
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && envUrl.includes('clock-in-app.duckdns.org')) {
      console.log('⚠️ Overriding production URL in development mode');
      console.log('📌 Original EXPO_PUBLIC_API_URL:', envUrl);
    }

    // If a valid local URL is provided in env, use it
    if (envUrl && (envUrl.includes('localhost') || envUrl.includes('10.0.2.2') || envUrl.includes('192.168.') || envUrl.includes('127.0.0.1'))) {
      console.log('📌 Using local URL from environment:', envUrl);
      return envUrl;
    }

    // Force local backend for development - ALWAYS use local, never production
    // For Android emulator, use: http://10.0.2.2:5000/api
    // For iOS simulator: http://localhost:5000/api
    // For physical device (Expo Go): Use your computer's IP from the QR code
    // For multi-device testing: Set EXPO_PUBLIC_BACKEND_IP env variable (e.g., 192.168.x.x)
    const backendIp =
      process.env.EXPO_PUBLIC_BACKEND_IP ||
      (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
    const localUrl = `http://${backendIp}:5000/api`;
    console.log('📌 Development mode - FORCING local backend:', localUrl);
    console.log('💡 To change backend IP, set EXPO_PUBLIC_BACKEND_IP environment variable');
    return localUrl;
  }

  // Production mode: use environment variable or default production URL
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  return 'https://clock-in-app.duckdns.org/api';
};

const API_BASE_URL = getApiUrl();

// Log the API URL being used
if (isDevelopment) {
  console.log('🔧 DEVELOPMENT MODE');
  console.log('🌐 Local API Base URL:', API_BASE_URL);
  console.log('📱 Platform detected:', Platform.OS);
} else {
  console.log('🚀 PRODUCTION MODE');
  console.log('🌐 Production API Base URL:', API_BASE_URL);
  console.log('📱 Platform detected:', Platform.OS);
}

// Helper to add platform header to axios config
export const getAxiosConfig = () => {
  return {
    headers: {
      'expo-platform': Platform.OS,
      'platform': Platform.OS,
      'Content-Type': 'application/json'
    }
  };
};

export default API_BASE_URL;
