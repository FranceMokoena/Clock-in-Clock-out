// Geocoding Utility
// Converts location names/addresses to GPS coordinates
// Uses OpenStreetMap/Nominatim API (free, no API key required)
// Falls back gracefully if geocoding fails

const axios = require('axios');
const { recordSystemEvent } = require('./monitoring');

// Cache for geocoding results to avoid repeated API calls
const geocodeCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// OpenStreetMap Nominatim API endpoint
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Geocode a location/address to GPS coordinates
 * @param {string} location - Location name or address
 * @param {string} country - Country code (default: 'South Africa')
 * @returns {Promise<{latitude: number, longitude: number, address: string, confidence: number}>}
 */
async function geocodeLocation(location, country = 'South Africa') {
  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    throw new Error('Location is required for geocoding');
  }

  const locationQuery = location.trim();
  
  // Check cache first
  const cacheKey = `${locationQuery}_${country}`.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`✅ Using cached geocode result for: ${locationQuery}`);
    return cached.result;
  }

  try {
    console.log(`🌍 Geocoding location: "${locationQuery}" (${country})...`);
    
    // Build query URL for Nominatim
    const searchQuery = `${locationQuery}, ${country}`;
    const url = `${NOMINATIM_BASE_URL}?` + new URLSearchParams({
      q: searchQuery,
      format: 'json',
      limit: 1, // Only need top result
      addressdetails: 1,
      countrycodes: 'za', // South Africa country code
      bounded: 1, // Prefer results within South Africa
      // Viewbox for South Africa (approximate bounds)
      viewbox: '16.4699,-34.8192,32.8308,-22.1265',
      // Accept-Language header (required by Nominatim)
    });

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'FaceClockApp/1.0', // Nominatim requires User-Agent
        'Accept-Language': 'en'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error(`No results found for location: ${locationQuery}`);
    }

    const result = response.data[0];
    
    // Extract coordinates
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates returned from geocoding service');
    }

    // Build formatted address
    const address = result.display_name || locationQuery;
    
    // Calculate confidence based on result importance (0-1 scale, higher is better)
    const importance = parseFloat(result.importance || 0);
    const confidence = Math.min(1, Math.max(0, importance / 0.9)); // Normalize to 0-1

    const geocodeResult = {
      latitude,
      longitude,
      address,
      confidence,
      source: 'nominatim'
    };

    // Cache the result
    geocodeCache.set(cacheKey, {
      result: geocodeResult,
      timestamp: Date.now()
    });

    console.log(`✅ Geocoded "${locationQuery}" to: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    recordSystemEvent({
      type: 'GEOCODE_SUCCESS',
      severity: 'info',
      message: `Geocoded location "${locationQuery}"`,
      metadata: {
        location: locationQuery,
        country,
        confidence,
        source: 'nominatim',
      },
    });

    return geocodeResult;

  } catch (error) {
    console.error(`❌ Geocoding error for "${locationQuery}":`, error.message);

    recordSystemEvent({
      type: 'GEOCODE_FAILURE',
      severity: 'warning',
      message: `Geocoding failed for "${locationQuery}"`,
      metadata: {
        location: locationQuery,
        country,
        error: error?.message || String(error),
      },
    });
    
    // If it's a network error or timeout, provide helpful error message
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Geocoding timeout: Unable to geocode location "${locationQuery}". Please check your internet connection and try again.`);
    }
    
    if (error.response) {
      // API returned an error response
      throw new Error(`Geocoding failed: ${error.response.status} - ${error.message}`);
    }
    
    // Generic error
    throw new Error(`Failed to geocode location "${locationQuery}": ${error.message}`);
  }
}

/**
 * Geocode with multiple attempts and fallbacks
 * @param {string} location - Location name or address
 * @param {string} country - Country code
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<{latitude: number, longitude: number, address: string, confidence: number}>}
 */
async function geocodeLocationWithRetry(location, country = 'South Africa', maxRetries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await geocodeLocation(location, country);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`⚠️ Geocoding attempt ${attempt} failed, retrying...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // All attempts failed
  throw lastError;
}

/**
 * Batch geocode multiple locations
 * @param {string[]} locations - Array of location names/addresses
 * @param {string} country - Country code
 * @returns {Promise<Array<{location: string, result: object, error: string|null}>>}
 */
async function batchGeocode(locations, country = 'South Africa') {
  const results = [];
  
  for (const location of locations) {
    try {
      const result = await geocodeLocation(location, country);
      results.push({
        location,
        result,
        error: null
      });
      
      // Small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({
        location,
        result: null,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Clear geocoding cache
 */
function clearGeocodeCache() {
  geocodeCache.clear();
  console.log('🗑️ Geocoding cache cleared');
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: geocodeCache.size,
    entries: Array.from(geocodeCache.keys())
  };
}

module.exports = {
  geocodeLocation,
  geocodeLocationWithRetry,
  batchGeocode,
  clearGeocodeCache,
  getCacheStats
};

