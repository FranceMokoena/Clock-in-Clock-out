/**
 * Face Detection Configuration
 * 
 * This file allows you to switch between different face detection models:
 * - SSD MobileNet v1: More accurate, slower (300-800ms)
 * - TinyFaceDetector: Faster, slightly less accurate (100-200ms)
 * 
 * For bank-level speed, use TinyFaceDetector.
 * For maximum accuracy, use SSD MobileNet v1.
 */

const faceapi = require('face-api.js');

// Configuration
const USE_FAST_DETECTION = process.env.USE_FAST_DETECTION === 'true' || false;

/**
 * Get face detection options based on configuration
 * @param {Object} options - Detection options
 * @returns {Object} Face detection options
 */
function getDetectionOptions(options = {}) {
  if (USE_FAST_DETECTION) {
    // Use TinyFaceDetector for speed (3-4x faster)
    return new faceapi.TinyFaceDetectorOptions({
      inputSize: 320, // 320, 416, 512, or 608 (smaller = faster)
      scoreThreshold: options.minConfidence || 0.3
    });
  } else {
    // Use SSD MobileNet v1 for accuracy
    return new faceapi.SsdMobilenetv1Options({
      minConfidence: options.minConfidence || 0.3
    });
  }
}

/**
 * Load the appropriate detection model
 * @param {string} modelsPath - Path to models directory
 */
async function loadDetectionModel(modelsPath) {
  if (USE_FAST_DETECTION) {
    // Load TinyFaceDetector (faster, smaller model)
    console.log('🚀 Using TinyFaceDetector (FAST MODE)');
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
  } else {
    // Load SSD MobileNet v1 (more accurate)
    console.log('🎯 Using SSD MobileNet v1 (ACCURACY MODE)');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  }
}

/**
 * Load detection model from URI (CDN)
 * @param {string} baseUrl - Base URL for models
 */
async function loadDetectionModelFromUri(baseUrl) {
  if (USE_FAST_DETECTION) {
    console.log('🚀 Loading TinyFaceDetector from CDN (FAST MODE)...');
    await faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl);
  } else {
    console.log('🎯 Loading SSD MobileNet v1 from CDN (ACCURACY MODE)...');
    await faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl);
  }
}

/**
 * Detect faces using configured model
 * @param {Image} img - Image to detect faces in
 * @param {Object} options - Detection options
 * @returns {Promise} Face detection promise
 */
function detectFaces(img, options = {}) {
  const detectionOptions = getDetectionOptions(options);
  
  if (USE_FAST_DETECTION) {
    return faceapi
      .detectAllFaces(img, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();
  } else {
    return faceapi
      .detectAllFaces(img, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();
  }
}

module.exports = {
  getDetectionOptions,
  loadDetectionModel,
  loadDetectionModelFromUri,
  detectFaces,
  USE_FAST_DETECTION
};

