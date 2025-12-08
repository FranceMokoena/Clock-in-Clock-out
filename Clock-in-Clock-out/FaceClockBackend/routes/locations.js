// Locations API Routes
// Provides access to South African locations dataset for frontend

const express = require('express');
const router = express.Router();
const { getAllLocations, searchLocations, getAllProvinces } = require('../config/locations');

// Get all locations
router.get('/all', (req, res) => {
  try {
    const locations = getAllLocations();
    res.json({
      success: true,
      locations: locations,
      count: locations.length
    });
  } catch (error) {
    console.error('❌ Error getting locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve locations'
    });
  }
});

// Search locations
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        locations: getAllLocations(),
        count: getAllLocations().length
      });
    }
    
    const results = searchLocations(q.trim());
    res.json({
      success: true,
      locations: results,
      count: results.length,
      query: q.trim()
    });
  } catch (error) {
    console.error('❌ Error searching locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search locations'
    });
  }
});

// Get all provinces
router.get('/provinces', (req, res) => {
  try {
    const provinces = getAllProvinces();
    res.json({
      success: true,
      provinces: provinces,
      count: provinces.length
    });
  } catch (error) {
    console.error('❌ Error getting provinces:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve provinces'
    });
  }
});

module.exports = router;

