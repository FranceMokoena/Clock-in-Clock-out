// API Configuration
// Force production API to EC2 unless EXPO_PUBLIC_API_URL is explicitly provided.
// This prevents accidental fallbacks to LAN/local during Metro dev.

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PRODUCTION_URL = 'http://100.31.103.225:5000/api';
const PHYSICAL_DEVICE_IP = '100.31.103.225';

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
let API_BASE_URL = envUrl || DEFAULT_PRODUCTION_URL;

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
