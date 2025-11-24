// Location validation utilities for clock-in/clock-out
// Staff can ONLY clock-in/out when they are at their assigned location (within 200m radius)
// Radius is set to 200m to account for GPS inaccuracy (typical GPS accuracy is 5-10m, but can be up to 50m in urban areas)
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
const DEFAULT_RADIUS = 200; // meters - allows for GPS inaccuracy and building area
const TOWN_LEVEL_RADIUS = 5000; // 5km - for town/city level locations (e.g., "White River")

// Legacy allowed locations (for backward compatibility)
const ALLOWED_LOCATIONS = {
  'FERREIRA_STREET_MBOMBELA': {
    name: '20 Ferreira Street, Mbombela',
    address: '20 Ferreira Street, Mbombela 1240',
    latitude: -25.475297,
    longitude: 30.982345,
    radius: DEFAULT_RADIUS // Specific address - use 200m
  },
  'WHITE_RIVER': {
    name: 'White River',
    address: 'White River, Mpumalanga',
    latitude: -25.3318,
    longitude: 31.0117,
    radius: TOWN_LEVEL_RADIUS // Town-level location - use 5km
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

// Determine if a location is town-level (city/town) vs specific address
// Town-level locations don't have street addresses, just city/town names
function isTownLevelLocation(locationName, locationAddress) {
  if (!locationName && !locationAddress) return false;
  
  const name = (locationName || '').toLowerCase();
  const address = (locationAddress || '').toLowerCase();
  
  // Check if it's a known town-level location key (from ALLOWED_LOCATIONS or SA locations)
  const townLevelKeys = ['WHITE_RIVER', 'MBOMBELA', 'NELSPRUIT', 'PRETORIA', 'JOHANNESBURG', 'CAPE_TOWN', 'DURBAN'];
  const locationKey = locationName?.toUpperCase().replace(/\s+/g, '_');
  if (townLevelKeys.includes(locationKey)) {
    return true;
  }
  
  // Also check if location name matches known town names (case-insensitive)
  const townNames = ['white river', 'mbombela', 'nelspruit', 'pretoria', 'johannesburg', 'cape town', 'durban'];
  if (townNames.includes(name)) {
    return true;
  }
  
  // Check location config to see if it's a town-level location
  try {
    const locationData = getLocation(locationKey || locationName);
    if (locationData) {
      // If location has a radius of TOWN_LEVEL_RADIUS, it's town-level
      if (locationData.radius === TOWN_LEVEL_RADIUS) {
        return true;
      }
      // If location name doesn't contain street address patterns, likely town-level
      const locationNameLower = (locationData.name || '').toLowerCase();
      const locationAddressLower = (locationData.address || '').toLowerCase();
      const hasStreetInName = /\d+\s+(street|road|avenue|drive|way|lane)/i.test(locationNameLower);
      const hasStreetInAddress = /\d+\s+(street|road|avenue|drive|way|lane)/i.test(locationAddressLower);
      if (!hasStreetInName && !hasStreetInAddress) {
        return true;
      }
    }
  } catch (e) {
    // If location lookup fails, continue with heuristic check
  }
  
  // Heuristic: If address doesn't contain street numbers or specific street names, it's likely town-level
  // Specific addresses usually have: street numbers (1-9999), "Street", "Road", "Avenue", etc.
  const hasStreetNumber = /\d+\s+(street|road|avenue|drive|way|lane|close|court|place|boulevard|circle)/i.test(address);
  const hasSpecificAddress = /\d+/.test(address) && (address.includes('street') || address.includes('road') || address.includes('avenue') || address.includes('drive'));
  
  // If no street number/address pattern, likely town-level
  return !hasStreetNumber && !hasSpecificAddress;
}

// Check if user's location is within allowed radius of their assigned location
// CRITICAL: This function ensures users can ONLY clock in at their assigned location
// UPDATED: Now uses stored coordinates from staff record (more accurate than config lookup)
// UPDATED: Automatically detects town-level locations and uses larger radius (5km vs 200m)
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

  // 🏦 INTELLIGENT RADIUS: Auto-detect town-level locations and use larger radius
  // If radius not provided, determine based on location type
  let effectiveRadius = radius;
  if (effectiveRadius === null || effectiveRadius === undefined) {
    if (isTownLevelLocation(staffLocationName, staffLocationAddress)) {
      effectiveRadius = TOWN_LEVEL_RADIUS; // 5km for towns/cities
      console.log(`📍 Town-level location detected: "${staffLocationName}" - Using ${effectiveRadius}m radius`);
    } else {
      effectiveRadius = DEFAULT_RADIUS; // 200m for specific addresses
      console.log(`📍 Specific address detected: "${staffLocationName}" - Using ${effectiveRadius}m radius`);
    }
  }

  // Calculate distance using Haversine formula (accurate for Earth's surface)
  const distance = calculateDistance(
    userLat,
    userLon,
    staffLocationLat,
    staffLocationLon
  );

  // STRICT VALIDATION: User must be within the allowed radius
  // Note: Radius is 200m for specific addresses, 5km for town-level locations
  if (distance > effectiveRadius) {
    const distanceKm = (distance / 1000).toFixed(1);
    const radiusKm = (effectiveRadius / 1000).toFixed(1);
    const isTownLevel = effectiveRadius === TOWN_LEVEL_RADIUS;
    
    let errorMessage = `You are ${distanceKm}km away from your assigned location "${staffLocationName || 'unknown location'}". `;
    if (isTownLevel) {
      errorMessage += `You must be within ${radiusKm}km (town-level location) to clock in/out. `;
    } else {
      errorMessage += `You must be within ${effectiveRadius}m (specific address) to clock in/out. `;
    }
    errorMessage += `Please go to your assigned location to clock in/out.`;
    
    return {
      valid: false,
      error: errorMessage,
      distance: Math.round(distance),
      requiredRadius: effectiveRadius,
      assignedLocation: staffLocationName || 'Unknown location',
      userCoordinates: { lat: userLat, lon: userLon },
      locationCoordinates: { lat: staffLocationLat, lon: staffLocationLon },
      distanceKm: parseFloat(distanceKm),
      radiusKm: parseFloat(radiusKm)
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

