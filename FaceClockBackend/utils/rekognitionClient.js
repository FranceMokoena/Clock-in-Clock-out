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

function isConfigured() {
  return Boolean(AWS_REGION);
}

let rekognitionClient;
let s3Client;

function getRekognitionClient() {
  if (!rekognitionClient) {
    rekognitionClient = new RekognitionClient({ region: AWS_REGION });
  }
  return rekognitionClient;
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({ region: AWS_REGION });
  }
  return s3Client;
}

/**
 * Ensure the global Rekognition collection exists (idempotent)
 */
async function ensureCollection() {
  const client = getRekognitionClient();

  try {
    const listRes = await client.send(new ListCollectionsCommand({}));
    const exists =
      Array.isArray(listRes.CollectionIds) &&
      listRes.CollectionIds.includes(COLLECTION_ID);
    if (exists) {
      return COLLECTION_ID;
    }
  } catch (err) {
    console.warn(
      '[Rekognition] ListCollections failed, will still try to create collection:',
      err.message
    );
  }

  try {
    await client.send(
      new CreateCollectionCommand({ CollectionId: COLLECTION_ID })
    );
  } catch (err) {
    if (err.name !== 'ResourceAlreadyExistsException') {
      console.warn(
        '[Rekognition] CreateCollection failed:',
        err.message
      );
      throw err;
    }
  }

  return COLLECTION_ID;
}

/**
 * Index multiple face images for a staff member.
 * Uses staffId as ExternalImageId for later lookup.
 */
async function indexFacesForStaff(collectionId, staffId, imageBuffers) {
  const client = getRekognitionClient();
  const faceIds = [];

  for (let i = 0; i < imageBuffers.length; i++) {
    const buf = imageBuffers[i];
    if (!buf || !Buffer.isBuffer(buf)) continue;

    try {
      const res = await client.send(
        new IndexFacesCommand({
          CollectionId: collectionId,
          Image: { Bytes: buf },
          ExternalImageId: staffId,
          DetectionAttributes: ['DEFAULT'],
        })
      );

      if (Array.isArray(res.FaceRecords)) {
        res.FaceRecords.forEach(record => {
          if (record.Face && record.Face.FaceId) {
            faceIds.push(record.Face.FaceId);
          }
        });
      }
    } catch (err) {
      console.warn(
        `[Rekognition] IndexFaces failed for staff ${staffId}, image ${i + 1}:`,
        err.message
      );
    }
  }

  return faceIds;
}

/**
 * Search for the best matching face in the collection from an image buffer.
 */
async function searchFaceByImage(
  collectionId,
  imageBuffer,
  threshold = 85,
  maxFaces = 1
) {
  const client = getRekognitionClient();

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('searchFaceByImage requires a valid image buffer');
  }

  const res = await client.send(
    new SearchFacesByImageCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBuffer },
      FaceMatchThreshold: threshold,
      MaxFaces: maxFaces,
    })
  );

  const matches = Array.isArray(res.FaceMatches) ? res.FaceMatches : [];
  if (!matches[0] || !matches[0].Face) {
    return null;
  }

  const face = matches[0].Face;
  return {
    faceId: face.FaceId,
    similarity: matches[0].Similarity,
    externalImageId: face.ExternalImageId || null,
  };
}

/**
 * Run Rekognition DetectFaces for analysis / quality.
 * Returns a compact, app-friendly summary of the primary face.
 */
async function detectFaceAttributes(imageBuffer) {
  const client = getRekognitionClient();

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('detectFaceAttributes requires a valid image buffer');
  }

  const res = await client.send(
    new DetectFacesCommand({
      Image: { Bytes: imageBuffer },
      Attributes: ['ALL'],
    })
  );

  const faces = Array.isArray(res.FaceDetails) ? res.FaceDetails : [];
  if (faces.length === 0) {
    return { faceCount: 0 };
  }

  // Use the highest-confidence face as primary
  const primary = faces.reduce((best, f) =>
    !best || (f.Confidence || 0) > (best.Confidence || 0) ? f : best,
    null
  );

  const box = primary.BoundingBox || {};
  const quality = primary.Quality || {};
  const pose = primary.Pose || {};

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
      },
      pose: {
        roll: pose.Roll ?? null,
        yaw: pose.Yaw ?? null,
        pitch: pose.Pitch ?? null,
      },
      // Simple flags the backend can use for extra checks
      hasLandmarks: Array.isArray(primary.Landmarks) && primary.Landmarks.length > 0,
      // Age range / other attributes available if you want to surface later
    },
  };
}

/**
 * Upload a photo to S3 (optional helper).
 */
async function uploadToS3(key, buffer, contentType = 'image/jpeg') {
  if (!S3_BUCKET) {
    console.warn(
      '[Rekognition] S3_BUCKET not set – skipping S3 upload'
    );
    return null;
  }

  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return { bucket: S3_BUCKET, key };
}

module.exports = {
  isConfigured,
  ensureCollection,
  indexFacesForStaff,
  searchFaceByImage,
  detectFaceAttributes,
  uploadToS3,
};


