// Allowed locations for clock-in/clock-out
// Each location has a name, address, and coordinates (latitude, longitude)
// Staff can only clock-in/out at their assigned location

const ALLOWED_LOCATIONS = {
  'SHELL_HOUSE_MBOMBELA': {
    name: '1st Floor, Shell House',
    address: 'Ferreira St, Mbombela. 1200',
    latitude: -25.320163183253243,
    longitude: 31.04449850623618,
    radius: 100 // meters - allowed radius from location center
  },
  'WHITE_RIVER_MAJOJOS': {
    name: 'White River, Majojos Residence',
    address: 'White River, Majojos Residence',
    latitude: -25.3204201,
    longitude: 31.0440858,
    radius: 100 // meters - allowed radius from location center
  }
};

// Get location by key
function getLocation(key) {
  return ALLOWED_LOCATIONS[key];
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
function isLocationValid(userLat, userLon, assignedLocationKey) {
  const location = getLocation(assignedLocationKey);
  if (!location) {
    return { valid: false, error: 'Invalid location assigned to staff member' };
  }

  const distance = calculateDistance(
    userLat,
    userLon,
    location.latitude,
    location.longitude
  );

  if (distance > location.radius) {
    return {
      valid: false,
      error: `You are ${Math.round(distance)}m away from your assigned location (${location.name}). You must be within ${location.radius}m to clock in/out.`,
      distance: Math.round(distance),
      requiredRadius: location.radius
    };
  }

  return {
    valid: true,
    distance: Math.round(distance),
    locationName: location.name
  };
}

module.exports = {
  ALLOWED_LOCATIONS,
  getLocation,
  getAllLocations,
  calculateDistance,
  isLocationValid
};

