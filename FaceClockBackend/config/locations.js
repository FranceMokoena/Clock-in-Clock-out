// Allowed locations for clock-in/clock-out
// ⚠️ CRITICAL: ONLY TWO LOCATIONS ARE ALLOWED BY THE APP ⚠️
// Each location has a name, address, and coordinates (latitude, longitude)
// Staff can ONLY clock-in/out when they are at their assigned location (within 200m radius)
// Radius is set to 200m to account for GPS inaccuracy (typical GPS accuracy is 5-10m, but can be up to 50m in urban areas)
// During registration, users choose their location from the dropdown
// During clock-in, the app validates they are at that exact location using HIGHEST GPS accuracy

const ALLOWED_LOCATIONS = {
  'FERREIRA_STREET_MBOMBELA': {
    name: '20 Ferreira Street, Mbombela',
    address: '20 Ferreira Street, Mbombela 1240',
    latitude: -25.475297, // Updated to match actual location coordinates
    longitude: 30.982345, // Updated to match actual location coordinates
    radius: 200 // meters - allows for GPS inaccuracy and building area
  },
  'WHITE_RIVER': {
    name: 'White River',
    address: 'White River, Mpumalanga',
    latitude: -25.3318,
    longitude: 31.0117,
    radius: 200 // meters - increased to account for GPS inaccuracy (was 100m)
  }
};

// Get location by key
// Includes backward compatibility for old location keys
function getLocation(key) {
  // Backward compatibility: map old keys to new keys
  const keyMapping = {
    'SHELL_HOUSE_MBOMBELA': 'FERREIRA_STREET_MBOMBELA',
    'WHITE_RIVER_MAJOJOS': 'WHITE_RIVER'
  };
  
  // If key exists in mapping, use the new key
  const actualKey = keyMapping[key] || key;
  return ALLOWED_LOCATIONS[actualKey];
}

// Get all locations as array for dropdown
function getAllLocations() {
  return Object.entries(ALLOWED_LOCATIONS).map(([key, value]) => ({
    key,
    name: value.name,
    address: value.address,
    fullName: `${value.name} - ${value.address}`
  }));
}

// Calculate distance between two coordinates (Haversine formula)
// Returns distance in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if user's location is within allowed radius of their assigned location
// CRITICAL: This function ensures users can ONLY clock in at their assigned location
function isLocationValid(userLat, userLon, assignedLocationKey) {
  // Validate input coordinates
  if (typeof userLat !== 'number' || typeof userLon !== 'number' || isNaN(userLat) || isNaN(userLon)) {
    return { 
      valid: false, 
      error: 'Invalid GPS coordinates. Please ensure GPS is enabled and try again.',
      distance: null,
      requiredRadius: null
    };
  }
  
  // Validate location key exists
  if (!assignedLocationKey || typeof assignedLocationKey !== 'string') {
    return { 
      valid: false, 
      error: 'Invalid location assigned to staff member. Please contact administrator.',
      distance: null,
      requiredRadius: null
    };
  }
  
  // Get location data
  const location = getLocation(assignedLocationKey);
  if (!location) {
    return { 
      valid: false, 
      error: `Invalid location assigned: "${assignedLocationKey}". Please contact administrator.`,
      distance: null,
      requiredRadius: null
    };
  }

  // Calculate distance using Haversine formula (accurate for Earth's surface)
  const distance = calculateDistance(
    userLat,
    userLon,
    location.latitude,
    location.longitude
  );

  // STRICT VALIDATION: User must be within the allowed radius
  // Note: Radius is set to 200m to account for GPS inaccuracy (typical GPS accuracy is 5-10m, but can be up to 50m in urban areas)
  if (distance > location.radius) {
    return {
      valid: false,
      error: `You are ${Math.round(distance)}m away from your assigned location (${location.name}). You must be within ${location.radius}m to clock in/out.\n\nYour current coordinates: ${userLat.toFixed(6)}, ${userLon.toFixed(6)}\nLocation coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      distance: Math.round(distance),
      requiredRadius: location.radius,
      assignedLocation: location.name,
      userCoordinates: { lat: userLat, lon: userLon },
      locationCoordinates: { lat: location.latitude, lon: location.longitude }
    };
  }

  // Location is valid - user is within allowed radius
  return {
    valid: true,
    distance: Math.round(distance),
    locationName: location.name,
    requiredRadius: location.radius
  };
}

module.exports = {
  ALLOWED_LOCATIONS,
  getLocation,
  getAllLocations,
  calculateDistance,
  isLocationValid
};

