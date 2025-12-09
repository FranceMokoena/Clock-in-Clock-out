/**
 * 🏦 BANK-GRADE Phase 3: Device Information for Fingerprinting
 * Generates device information headers for device fingerprinting
 * Used for multi-signal fusion and device quality tracking
 */

import { Dimensions, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';

let cachedDeviceIdPromise = null;

async function getStableDeviceId() {
  if (cachedDeviceIdPromise) {
    return cachedDeviceIdPromise;
  }

  cachedDeviceIdPromise = (async () => {
    let identifier = null;

    try {
      if (Platform.OS === 'android' && Application.androidId) {
        identifier = Application.androidId;
      } else if (Platform.OS === 'ios' && Application.getIosIdForVendorAsync) {
        identifier = await Application.getIosIdForVendorAsync();
      }
    } catch (error) {
      console.warn('⚠️ Unable to fetch platform device identifier:', error?.message || error);
    }

    if (!identifier) {
      identifier = `${Application.applicationId || 'faceclock-app'}-${Device.osBuildId || Device.osInternalBuildId || Date.now()}`;
    }

    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, identifier);
  })();

  return cachedDeviceIdPromise;
}

function safeLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
}

function safeTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function getDeviceType() {
  if (Device.deviceType) {
    return Device.deviceType;
  }
  if (Device.getDeviceTypeAsync) {
    try {
      return await Device.getDeviceTypeAsync();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Get device information headers for fingerprinting
 * Returns headers that match backend's DEVICE_FINGERPRINT_FIELDS
 */
export async function getDeviceHeaders() {
  const platform = Platform.OS;
  const language = safeLocale();
  const timezone = safeTimezone();
  const screen = Dimensions.get('window');
  const deviceType = await getDeviceType();
  const deviceId = await getStableDeviceId();

  const deviceInfo = {
    platform,
    brand: Device.brand || null,
    manufacturer: Device.manufacturer || null,
    modelName: Device.modelName || Device.modelId || null,
    designName: Device.designName || null,
    osVersion: Device.osVersion || `${Platform.Version}`,
    osBuildId: Device.osBuildId || null,
    osInternalBuildId: Device.osInternalBuildId || null,
    deviceYearClass: Device.deviceYearClass || null,
    isDevice: Device.isDevice ? 'true' : 'false',
    totalMemory: Device.totalMemory || null,
    deviceType: deviceType || null,
    language,
    timezone,
    screenWidth: Math.round(screen?.width || 0),
    screenHeight: Math.round(screen?.height || 0),
    screenScale: screen?.scale || 1,
    appVersion: Application.nativeApplicationVersion || Application.applicationVersion || '1.0.0',
    buildNumber: Application.nativeBuildVersion || '1',
    deviceId,
  };

  const sortedKeys = Object.keys(deviceInfo).sort();
  const deviceInfoString = sortedKeys.map(key => `${key}:${deviceInfo[key] ?? ''}`).join('|');
  const deviceHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, deviceInfoString);

  const userAgent = `FaceClockApp/${deviceInfo.appVersion} (${platform}; ${Device.modelName || Device.modelId || Platform.Version})`;

  return {
    userAgent,
    platform,
    language,
    timezone,
    deviceId,
    deviceInfo: JSON.stringify(deviceInfo),
    deviceHash,
  };
}

/**
 * Get device information as a string (for logging)
 */
export async function getDeviceInfoString() {
  const headers = await getDeviceHeaders();
  return `${headers.platform} (${headers.language}, ${headers.timezone})`;
}

