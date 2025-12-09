// API Configuration
// For physical devices: Set EXPO_PUBLIC_API_URL to your computer's IP (e.g., http://192.168.1.104:5000/api)
// For Android emulator: Uses 10.0.2.2 automatically
// For production: Uses Render backend automatically

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PRODUCTION_URL = 'https://clock-in-clock-out-oyia.onrender.com/api';

// ⚠️ UPDATE THIS IP when you change networks!
// Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
const PHYSICAL_DEVICE_IP = '192.168.88.41'; // Current IP address

const getHostFromUri = (uri) => {
  if (!uri || typeof uri !== 'string') {
    return null;
  }
  try {
    // Ensure the URI has a protocol so URL can parse it
    const normalized = uri.includes('://') ? uri : `http://${uri}`;
    const { hostname } = new URL(normalized);
    return hostname;
  } catch (error) {
    return null;
  }
};

const deriveDevServerHost = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants?.manifest?.hostUri,
    Constants?.manifest?.debuggerHost,
    Constants?.manifest2?.extra?.expoClient?.hostUri,
    NativeModules?.SourceCode?.scriptURL
  ];

  for (const candidate of candidates) {
    const host = getHostFromUri(candidate);
    if (host) {
      return host;
    }
  }
  return null;
};

const devServerHost = deriveDevServerHost();

const resolveLocalHost = () => {
  if (!__DEV__) {
    return PHYSICAL_DEVICE_IP;
  }

  if (devServerHost === 'localhost' || devServerHost === '127.0.0.1') {
    // Metro served from same machine; Android emulator needs 10.0.2.2
    return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  }

  return devServerHost || PHYSICAL_DEVICE_IP;
};

const LOCAL_HOST = resolveLocalHost();
const DEFAULT_LOCAL_URL = `http://${LOCAL_HOST}:5000/api`;

// Check for custom local IP (for physical devices)
// Set this in your .env or app.json: EXPO_PUBLIC_API_URL=http://192.168.1.104:5000/api
const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()?.replace(/\s+/g, ''); // Remove all spaces
const envMode = process.env.EXPO_PUBLIC_API_ENV?.toLowerCase();
const forceProduction = envMode === 'production';

let API_BASE_URL;
if (envUrl) {
  API_BASE_URL = envUrl;
} else if (__DEV__ && !forceProduction) {
  API_BASE_URL = DEFAULT_LOCAL_URL;
} else {
  API_BASE_URL = DEFAULT_PRODUCTION_URL;
}

console.log('🌐 API Base URL:', API_BASE_URL);
if (__DEV__) {
  console.log('🧭 Dev host detection:', {
    devServerHost,
    localHost: LOCAL_HOST,
    platform: Platform.OS,
  });
}
if (__DEV__ && !envUrl && Platform.OS === 'android') {
  console.log('💡 Tip: For physical Android devices, set EXPO_PUBLIC_API_URL=http://YOUR_IP:5000/api');
  console.log('   Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)');
}

export default API_BASE_URL;
