const {
  RekognitionClient,
  CreateCollectionCommand,
  ListCollectionsCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DetectFacesCommand,
} = require('@aws-sdk/client-rekognition');
const {
  S3Client,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || '';
const COLLECTION_ID =
  process.env.REKOGNITION_COLLECTION_ID || 'faceclock-global';

// Configuration for retry logic and timeouts
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds
const REQUEST_TIMEOUT = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Credential validation state
let credentialsValidated = false;
let credentialsValid = false;
let lastValidationError = null;

/**
 * Enhanced credential detection - supports multiple sources:
 * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 2. AWS CLI profile (from ~/.aws/credentials)
 * 3. IAM role (for EC2/ECS/Lambda)
 * 4. Default credential provider chain
 */
function isConfigured() {
  // Check environment variables first (most explicit)
  const hasEnvCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );

  // Check for AWS profile (common in local development)
  const hasProfile = Boolean(process.env.AWS_PROFILE);

  // If we've validated credentials before, use cached result
  if (credentialsValidated) {
    return credentialsValid;
  }

  // Return true if we have any credential source
  return hasEnvCredentials || hasProfile || true; // Default provider chain will try to find credentials
}

/**
 * Get AWS credentials using the credential provider chain
 * This supports: env vars, AWS CLI profiles, IAM roles, etc.
 * AWS SDK v3 automatically uses the default credential provider chain if credentials are not explicitly provided
 */
function getCredentials() {
  // If explicit env vars are set, use them directly
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN, // Optional for temporary credentials
    };
  }

  // Otherwise, return undefined to let AWS SDK use default credential provider chain
  // This will automatically check:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. AWS credentials file (~/.aws/credentials)
  // 3. AWS config file (~/.aws/config)
  // 4. IAM role (for EC2/ECS/Lambda)
  // 5. Other credential sources
  return undefined;
}

/**
 * Validate AWS credentials by making a lightweight API call
 */
async function validateCredentials() {
  if (credentialsValidated && credentialsValid) {
    return true;
  }

  const client = getRekognitionClient();
  
  try {
    // Make a lightweight call to validate credentials
    await client.send(new ListCollectionsCommand({}), {
      requestTimeout: 5000, // Short timeout for validation
    });
    
    credentialsValid = true;
    credentialsValidated = true;
    lastValidationError = null;
    console.log('✅ [Rekognition] Credentials validated successfully');
    return true;
  } catch (err) {
    credentialsValid = false;
    credentialsValidated = true;
    lastValidationError = err;
    
    // Don't log as error if it's just missing credentials (expected in some setups)
    if (err.name === 'UnrecognizedClientException' || 
        err.name === 'InvalidSignatureException' ||
        err.message?.includes('credentials')) {
      console.warn('⚠️ [Rekognition] Credentials not configured or invalid:', err.message);
    } else {
      console.warn('⚠️ [Rekognition] Credential validation failed:', err.message);
    }
    
    return false;
  }
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff(fn, operationName, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.name === 'ResourceNotFoundException' ||
          error.name === 'InvalidParameterException' ||
          error.name === 'InvalidImageFormatException' ||
          error.name === 'UnrecognizedClientException' ||
          error.name === 'InvalidSignatureException') {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, attempt),
        MAX_RETRY_DELAY
      );
      
      console.warn(
        `⚠️ [Rekognition] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
        error.message
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

let rekognitionClient;
let s3Client;

/**
 * Get or create Rekognition client with robust configuration
 */
function getRekognitionClient() {
  if (!rekognitionClient) {
    const credentials = getCredentials();
    
    // Build client config - only include credentials if explicitly provided
    const clientConfig = {
      region: AWS_REGION,
      maxAttempts: MAX_RETRIES + 1, // SDK's built-in retry
    };
    
    // Only set credentials if explicitly provided (otherwise SDK uses default chain)
    if (credentials) {
      clientConfig.credentials = credentials;
      console.log(`🌐 [Rekognition] Client initialized with explicit credentials for region: ${AWS_REGION}`);
    } else {
      console.log(`🌐 [Rekognition] Client initialized using default credential provider chain for region: ${AWS_REGION}`);
    }
    
    rekognitionClient = new RekognitionClient(clientConfig);
    
    // Validate credentials asynchronously (don't block initialization)
    validateCredentials().catch(() => {
      // Validation errors are already logged
    });
  }
  return rekognitionClient;
}

/**
 * Get or create S3 client with robust configuration
 */
function getS3Client() {
  if (!s3Client) {
    const credentials = getCredentials();
    
    // Build client config - only include credentials if explicitly provided
    const clientConfig = {
      region: AWS_REGION,
      maxAttempts: MAX_RETRIES + 1,
    };
    
    // Only set credentials if explicitly provided (otherwise SDK uses default chain)
    if (credentials) {
      clientConfig.credentials = credentials;
    }
    
    s3Client = new S3Client(clientConfig);
  }
  return s3Client;
}

/**
 * Ensure the global Rekognition collection exists (idempotent)
 * Enhanced with retry logic and better error handling
 */
async function ensureCollection() {
  // Validate credentials first
  const isValid = await validateCredentials();
  if (!isValid) {
    throw new Error(
      `AWS Rekognition credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables, or configure AWS CLI profile. Error: ${lastValidationError?.message || 'Unknown'}`
    );
  }

  const client = getRekognitionClient();

  // Check if collection exists with retry
  try {
    const listRes = await retryWithBackoff(
      () => client.send(new ListCollectionsCommand({})),
      'ListCollections'
    );
    
    const exists =
      Array.isArray(listRes.CollectionIds) &&
      listRes.CollectionIds.includes(COLLECTION_ID);
    
    if (exists) {
      console.log(`✅ [Rekognition] Collection "${COLLECTION_ID}" already exists`);
      return COLLECTION_ID;
    }
  } catch (err) {
    // If listing fails, we'll still try to create (might be permission issue)
    console.warn(
      '⚠️ [Rekognition] ListCollections failed, will still try to create collection:',
      err.message
    );
  }

  // Create collection with retry
  try {
    await retryWithBackoff(
      () => client.send(
        new CreateCollectionCommand({ CollectionId: COLLECTION_ID })
      ),
      'CreateCollection'
    );
    console.log(`✅ [Rekognition] Collection "${COLLECTION_ID}" created successfully`);
  } catch (err) {
    if (err.name !== 'ResourceAlreadyExistsException') {
      console.error(
        '❌ [Rekognition] CreateCollection failed:',
        err.message
      );
      throw err;
    }
    // Collection was created between our check and create call - that's fine
    console.log(`✅ [Rekognition] Collection "${COLLECTION_ID}" already exists (race condition)`);
  }

  return COLLECTION_ID;
}

/**
 * Index multiple face images for a staff member.
 * Uses staffId as ExternalImageId for later lookup.
 * Enhanced with retry logic and validation
 */
async function indexFacesForStaff(collectionId, staffId, imageBuffers) {
  if (!imageBuffers || !Array.isArray(imageBuffers) || imageBuffers.length === 0) {
    throw new Error('indexFacesForStaff requires a non-empty array of image buffers');
  }

  const client = getRekognitionClient();
  const faceIds = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < imageBuffers.length; i++) {
    const buf = imageBuffers[i];
    if (!buf || !Buffer.isBuffer(buf)) {
      console.warn(`⚠️ [Rekognition] Skipping invalid image buffer ${i + 1} for staff ${staffId}`);
      failureCount++;
      continue;
    }

    // Validate image buffer size (Rekognition has limits)
    if (buf.length > 15 * 1024 * 1024) { // 15MB limit
      console.warn(
        `⚠️ [Rekognition] Image ${i + 1} for staff ${staffId} exceeds 15MB limit (${(buf.length / 1024 / 1024).toFixed(2)}MB), skipping`
      );
      failureCount++;
      continue;
    }

    try {
      const res = await retryWithBackoff(
        () => client.send(
          new IndexFacesCommand({
            CollectionId: collectionId,
            Image: { Bytes: buf },
            ExternalImageId: staffId,
            DetectionAttributes: ['DEFAULT', 'ALL'], // Get all attributes for better quality
            MaxFaces: 1, // Only index one face per image
            QualityFilter: 'AUTO', // Automatically filter low-quality faces
          })
        ),
        `IndexFaces-${staffId}-${i + 1}`
      );

      if (Array.isArray(res.FaceRecords) && res.FaceRecords.length > 0) {
        res.FaceRecords.forEach(record => {
          if (record.Face && record.Face.FaceId) {
            faceIds.push(record.Face.FaceId);
            successCount++;
            console.log(
              `✅ [Rekognition] Indexed face ${record.Face.FaceId} for staff ${staffId} (image ${i + 1})`
            );
          }
        });
      } else {
        console.warn(
          `⚠️ [Rekognition] No faces detected in image ${i + 1} for staff ${staffId}`
        );
        failureCount++;
      }
    } catch (err) {
      failureCount++;
      console.error(
        `❌ [Rekognition] IndexFaces failed for staff ${staffId}, image ${i + 1}:`,
        err.message,
        err.name
      );
      
      // Don't throw - continue with other images
      // But log critical errors
      if (err.name === 'InvalidImageFormatException' ||
          err.name === 'ImageTooLargeException' ||
          err.name === 'InvalidParameterException') {
        console.error(`   → This image may be corrupted or in an unsupported format`);
      }
    }
  }

  console.log(
    `📊 [Rekognition] Indexing complete for staff ${staffId}: ${successCount} succeeded, ${failureCount} failed, ${faceIds.length} faces indexed`
  );

  return faceIds;
}

/**
 * Search for the best matching face in the collection from an image buffer.
 * Enhanced with retry logic, validation, and better accuracy settings
 */
async function searchFaceByImage(
  collectionId,
  imageBuffer,
  threshold = 85,
  maxFaces = 1
) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('searchFaceByImage requires a valid image buffer');
  }

  // Validate image buffer size
  if (imageBuffer.length > 15 * 1024 * 1024) {
    throw new Error(
      `Image buffer exceeds 15MB limit (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB)`
    );
  }

  // Ensure threshold is within valid range (0-100)
  const validThreshold = Math.max(0, Math.min(100, threshold));

  const client = getRekognitionClient();

  try {
    const res = await retryWithBackoff(
      () => client.send(
        new SearchFacesByImageCommand({
          CollectionId: collectionId,
          Image: { Bytes: imageBuffer },
          FaceMatchThreshold: validThreshold,
          MaxFaces: maxFaces,
          QualityFilter: 'AUTO', // Filter low-quality faces automatically
        })
      ),
      'SearchFacesByImage'
    );

    const matches = Array.isArray(res.FaceMatches) ? res.FaceMatches : [];
    
    if (!matches[0] || !matches[0].Face) {
      // Check if a face was detected but didn't match
      if (res.SearchedFaceBoundingBox) {
        console.log(
          `ℹ️ [Rekognition] Face detected but no match found above ${validThreshold}% threshold`
        );
      } else {
        console.log(`ℹ️ [Rekognition] No face detected in search image`);
      }
      return null;
    }

    const face = matches[0].Face;
    const similarity = matches[0].Similarity || 0;

    // Log match quality
    if (similarity >= 95) {
      console.log(
        `🎯 [Rekognition] Excellent match found: ${similarity.toFixed(2)}% similarity (${face.ExternalImageId || 'unknown'})`
      );
    } else if (similarity >= 85) {
      console.log(
        `✅ [Rekognition] Good match found: ${similarity.toFixed(2)}% similarity (${face.ExternalImageId || 'unknown'})`
      );
    } else {
      console.log(
        `⚠️ [Rekognition] Low-confidence match: ${similarity.toFixed(2)}% similarity (${face.ExternalImageId || 'unknown'})`
      );
    }

    return {
      faceId: face.FaceId,
      similarity: similarity,
      externalImageId: face.ExternalImageId || null,
      confidence: face.Confidence || null,
    };
  } catch (err) {
    // Provide helpful error messages
    if (err.name === 'InvalidImageFormatException') {
      throw new Error('Invalid image format. Supported formats: JPEG, PNG');
    } else if (err.name === 'ImageTooLargeException') {
      throw new Error('Image file is too large. Maximum size: 15MB');
    } else if (err.name === 'ResourceNotFoundException') {
      throw new Error(`Collection "${collectionId}" not found. Please ensure the collection exists.`);
    } else if (err.name === 'InvalidParameterException') {
      throw new Error(`Invalid parameter: ${err.message}`);
    }
    
    // Re-throw with context
    throw new Error(`Face search failed: ${err.message}`);
  }
}

/**
 * Run Rekognition DetectFaces for analysis / quality.
 * Returns a compact, app-friendly summary of the primary face.
 * Enhanced with retry logic and better quality metrics
 */
async function detectFaceAttributes(imageBuffer) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('detectFaceAttributes requires a valid image buffer');
  }

  // Validate image buffer size
  if (imageBuffer.length > 15 * 1024 * 1024) {
    throw new Error(
      `Image buffer exceeds 15MB limit (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB)`
    );
  }

  const client = getRekognitionClient();

  try {
    const res = await retryWithBackoff(
      () => client.send(
        new DetectFacesCommand({
          Image: { Bytes: imageBuffer },
          Attributes: ['ALL'], // Get all attributes for comprehensive analysis
        })
      ),
      'DetectFaces'
    );

    const faces = Array.isArray(res.FaceDetails) ? res.FaceDetails : [];
    
    if (faces.length === 0) {
      return { 
        faceCount: 0,
        message: 'No faces detected in image'
      };
    }

    // Use the highest-confidence face as primary
    const primary = faces.reduce((best, f) =>
      !best || (f.Confidence || 0) > (best.Confidence || 0) ? f : best,
      null
    );

    if (!primary) {
      return { faceCount: faces.length, message: 'No valid primary face found' };
    }

    const box = primary.BoundingBox || {};
    const quality = primary.Quality || {};
    const pose = primary.Pose || {};
    const emotions = primary.Emotions || [];
    const ageRange = primary.AgeRange || {};

    // Determine primary emotion
    const primaryEmotion = emotions.length > 0
      ? emotions.reduce((best, e) => 
          !best || (e.Confidence || 0) > (best.Confidence || 0) ? e : best,
          null
        )
      : null;

    // Quality assessment
    const qualityScore = calculateQualityScore(quality, pose);

    return {
      faceCount: faces.length,
      primaryFace: {
        confidence: primary.Confidence || 0,
        boundingBox: {
          left: box.Left || 0,
          top: box.Top || 0,
          width: box.Width || 0,
          height: box.Height || 0,
        },
        quality: {
          brightness: quality.Brightness ?? null,
          sharpness: quality.Sharpness ?? null,
          qualityScore: qualityScore, // Overall quality score (0-100)
        },
        pose: {
          roll: pose.Roll ?? null,
          yaw: pose.Yaw ?? null,
          pitch: pose.Pitch ?? null,
          isGoodPose: isGoodPose(pose), // Boolean flag for good pose
        },
        ageRange: {
          low: ageRange.Low ?? null,
          high: ageRange.High ?? null,
        },
        emotions: primaryEmotion ? {
          type: primaryEmotion.Type,
          confidence: primaryEmotion.Confidence,
        } : null,
        // Simple flags the backend can use for extra checks
        hasLandmarks: Array.isArray(primary.Landmarks) && primary.Landmarks.length > 0,
        eyesOpen: primary.EyesOpen?.Value ?? null,
        mouthOpen: primary.MouthOpen?.Value ?? null,
        smile: primary.Smile?.Value ?? null,
      },
    };
  } catch (err) {
    // Provide helpful error messages
    if (err.name === 'InvalidImageFormatException') {
      throw new Error('Invalid image format. Supported formats: JPEG, PNG');
    } else if (err.name === 'ImageTooLargeException') {
      throw new Error('Image file is too large. Maximum size: 15MB');
    }
    
    throw new Error(`Face detection failed: ${err.message}`);
  }
}

/**
 * Calculate overall quality score from brightness, sharpness, and pose
 */
function calculateQualityScore(quality, pose) {
  let score = 0;
  let factors = 0;

  // Brightness (0-100, optimal around 50-80)
  if (quality.Brightness !== null && quality.Brightness !== undefined) {
    const brightnessScore = quality.Brightness >= 50 && quality.Brightness <= 80
      ? 100
      : quality.Brightness < 50
        ? (quality.Brightness / 50) * 100
        : ((100 - quality.Brightness) / 20) * 100;
    score += Math.max(0, Math.min(100, brightnessScore));
    factors++;
  }

  // Sharpness (0-100, higher is better)
  if (quality.Sharpness !== null && quality.Sharpness !== undefined) {
    score += quality.Sharpness;
    factors++;
  }

  // Pose quality (penalize extreme angles)
  if (pose) {
    const roll = Math.abs(pose.Roll || 0);
    const yaw = Math.abs(pose.Yaw || 0);
    const pitch = Math.abs(pose.Pitch || 0);
    
    // Good pose: roll < 15°, yaw < 20°, pitch < 20°
    const rollScore = roll < 15 ? 100 : Math.max(0, 100 - (roll - 15) * 5);
    const yawScore = yaw < 20 ? 100 : Math.max(0, 100 - (yaw - 20) * 3);
    const pitchScore = pitch < 20 ? 100 : Math.max(0, 100 - (pitch - 20) * 3);
    
    const poseScore = (rollScore + yawScore + pitchScore) / 3;
    score += poseScore;
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : null;
}

/**
 * Check if pose is good for face recognition
 */
function isGoodPose(pose) {
  if (!pose) return null;
  
  const roll = Math.abs(pose.Roll || 0);
  const yaw = Math.abs(pose.Yaw || 0);
  const pitch = Math.abs(pose.Pitch || 0);
  
  // Good pose thresholds
  return roll < 15 && yaw < 20 && pitch < 20;
}

/**
 * Upload a photo to S3 (optional helper).
 * Enhanced with retry logic and validation
 */
async function uploadToS3(key, buffer, contentType = 'image/jpeg') {
  if (!S3_BUCKET) {
    console.warn(
      '⚠️ [Rekognition] S3_BUCKET not set – skipping S3 upload'
    );
    return null;
  }

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('uploadToS3 requires a valid buffer');
  }

  // Validate buffer size (S3 has a 5GB limit, but we'll use a practical limit)
  if (buffer.length > 100 * 1024 * 1024) { // 100MB practical limit
    throw new Error(
      `Buffer exceeds 100MB limit (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`
    );
  }

  const client = getS3Client();

  try {
    await retryWithBackoff(
      () => client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          // Add metadata for tracking
          Metadata: {
            uploadedAt: new Date().toISOString(),
            size: buffer.length.toString(),
          },
        })
      ),
      'S3Upload'
    );

    console.log(`✅ [S3] Uploaded to s3://${S3_BUCKET}/${key} (${(buffer.length / 1024).toFixed(2)}KB)`);
    return { bucket: S3_BUCKET, key };
  } catch (err) {
    console.error(`❌ [S3] Upload failed for ${key}:`, err.message);
    
    if (err.name === 'NoSuchBucket') {
      throw new Error(`S3 bucket "${S3_BUCKET}" does not exist`);
    } else if (err.name === 'AccessDenied') {
      throw new Error(`Access denied to S3 bucket "${S3_BUCKET}"`);
    }
    
    throw err;
  }
}

module.exports = {
  isConfigured,
  validateCredentials,
  ensureCollection,
  indexFacesForStaff,
  searchFaceByImage,
  detectFaceAttributes,
  uploadToS3,
  // Export constants for testing/debugging
  COLLECTION_ID,
  AWS_REGION,
};


