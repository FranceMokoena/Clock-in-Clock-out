// Location validation utilities for clock-in/clock-out
// Staff can ONLY clock-in/out when they are at their assigned location (within 100m radius)
// Radius is set to 100m for strict enforcement across ALL locations
// During registration, users choose their location from dropdown OR enter custom address
// Coordinates are geocoded and stored in the database
// During clock-in, the app validates they are at that exact location using stored coordinates

// Import South African locations dataset
const { 
  SOUTH_AFRICAN_LOCATIONS, 
  getLocation: getSALocation,
  searchLocations,
  getAllLocations: getAllSALocations
} = require('./saLocations');

// Default validation radius (in meters)
const DEFAULT_RADIUS = 100; // meters - strict radius for all locations
const TOWN_LEVEL_RADIUS = 100; // kept for compatibility, but same strict radius

// Legacy allowed locations (for backward compatibility)
const ALLOWED_LOCATIONS = {
  'FERREIRA_STREET_MBOMBELA': {
    name: '20 Ferreira Street, Mbombela',
    address: '20 Ferreira Street, Mbombela 1240',
    latitude: -25.475297,
    longitude: 30.982345,
    radius: DEFAULT_RADIUS // Strict radius
  },
  'WHITE_RIVER': {
    name: 'White River',
    address: 'White River, Mpumalanga',
    latitude: -25.3318,
    longitude: 31.0117,
    radius: TOWN_LEVEL_RADIUS // Strict radius
  }
};

// Get location by key (checks both SA locations and legacy locations)
function getLocation(key) {
  // First check SA locations
  const saLocation = getSALocation(key);
  if (saLocation) {
    return {
      ...saLocation,
      radius: DEFAULT_RADIUS
    };
  }
  
  // Then check legacy locations
  const keyMapping = {
    'SHELL_HOUSE_MBOMBELA': 'FERREIRA_STREET_MBOMBELA',
    'WHITE_RIVER_MAJOJOS': 'WHITE_RIVER'
  };
  
  const actualKey = keyMapping[key] || key;
  return ALLOWED_LOCATIONS[actualKey];
}

// Get all locations as array for dropdown (SA locations + legacy)
function getAllLocations() {
  // Get all SA locations
  const saLocations = getAllSALocations().map(loc => ({
    key: loc.key,
    name: loc.name,
    address: loc.address,
    fullName: `${loc.name} - ${loc.address}`,
    province: loc.province,
    latitude: loc.latitude,
    longitude: loc.longitude
  }));
  
  // Also include legacy locations for backward compatibility
  const legacyLocations = Object.entries(ALLOWED_LOCATIONS).map(([key, value]) => ({
    key,
    name: value.name,
    address: value.address,
    fullName: `${value.name} - ${value.address}`,
    latitude: value.latitude,
    longitude: value.longitude
  }));
  
  // Merge and deduplicate (prefer SA locations over legacy)
  const locationMap = new Map();
  legacyLocations.forEach(loc => {
    if (!locationMap.has(loc.key)) {
      locationMap.set(loc.key, loc);
    }
  });
  saLocations.forEach(loc => {
    locationMap.set(loc.key, loc);
  });
  
  return Array.from(locationMap.values()).sort((a, b) => a.name.localeCompare(b.name));
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
// UPDATED: Now uses stored coordinates from staff record (more accurate than config lookup)
// UPDATED: Strict radius applied to all locations (100m)
function isLocationValid(userLat, userLon, staffLocationLat, staffLocationLon, staffLocationName, radius = null, staffLocationAddress = null) {
  // Validate input coordinates
  if (typeof userLat !== 'number' || typeof userLon !== 'number' || isNaN(userLat) || isNaN(userLon)) {
    return { 
      valid: false, 
      error: 'Invalid GPS coordinates. Please ensure GPS is enabled and try again.',
      distance: null,
      requiredRadius: null
    };
  }
  
  // Validate staff location coordinates
  if (typeof staffLocationLat !== 'number' || typeof staffLocationLon !== 'number' || 
      isNaN(staffLocationLat) || isNaN(staffLocationLon)) {
    return { 
      valid: false, 
      error: 'Invalid location coordinates for staff member. Please contact administrator to update location.',
      distance: null,
      requiredRadius: null
    };
  }

  // Strict radius for all locations
  let effectiveRadius = radius;
  if (effectiveRadius === null || effectiveRadius === undefined) {
    effectiveRadius = DEFAULT_RADIUS;
  }

  // Calculate distance using Haversine formula (accurate for Earth's surface)
  const distance = calculateDistance(
    userLat,
    userLon,
    staffLocationLat,
    staffLocationLon
  );

  // STRICT VALIDATION: User must be within the allowed radius
  if (distance > effectiveRadius) {
    let errorMessage = `You are ${Math.round(distance)}m away from your assigned location "${staffLocationName || 'unknown location'}". `;
    errorMessage += `You must be within ${effectiveRadius}m to clock in/out. `;
    errorMessage += `Please go to your assigned location to clock in/out.`;
    
    return {
      valid: false,
      error: errorMessage,
      distance: Math.round(distance),
      requiredRadius: effectiveRadius,
      assignedLocation: staffLocationName || 'Unknown location',
      userCoordinates: { lat: userLat, lon: userLon },
      locationCoordinates: { lat: staffLocationLat, lon: staffLocationLon },
    };
  }

  // Location is valid - user is within allowed radius
  return {
    valid: true,
    distance: Math.round(distance),
    locationName: staffLocationName || 'Unknown location',
    requiredRadius: effectiveRadius
  };
}

// Legacy function for backward compatibility (uses location key lookup)
function isLocationValidByKey(userLat, userLon, assignedLocationKey) {
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

  // Use stored coordinates from location
  return isLocationValid(
    userLat, 
    userLon, 
    location.latitude, 
    location.longitude, 
    location.name, 
    location.radius || DEFAULT_RADIUS
  );
}

module.exports = {
  ALLOWED_LOCATIONS,
  getLocation,
  getAllLocations,
  searchLocations,
  calculateDistance,
  isLocationValid,
  isLocationValidByKey, // Legacy function for backward compatibility
  DEFAULT_RADIUS,
  TOWN_LEVEL_RADIUS
};

