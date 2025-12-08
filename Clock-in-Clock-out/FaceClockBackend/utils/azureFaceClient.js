const axios = require('axios');

/**
 * Azure Face API client tailored for FaceClockBackend
 *
 * NOTE:
 * - All secrets stay on the backend (never expose to Expo app)
 * - This module is intentionally small and focused:
 *   - One person group per host company
 *   - Person + persisted faces per staff member
 *   - Detect + Identify for clock-in
 */

const AZURE_FACE_ENDPOINT = process.env.AZURE_FACE_ENDPOINT || '';
const AZURE_FACE_KEY = process.env.AZURE_FACE_KEY || '';
const PERSON_GROUP_PREFIX =
  process.env.AZURE_FACE_PERSON_GROUP_PREFIX || 'faceclock-company-';

function isConfigured() {
  return Boolean(AZURE_FACE_ENDPOINT && AZURE_FACE_KEY);
}

function getPersonGroupIdForHostCompany(hostCompanyId) {
  if (!hostCompanyId) {
    throw new Error('Host company ID is required to build Azure personGroupId');
  }
  return `${PERSON_GROUP_PREFIX}${hostCompanyId.toString()}`;
}

function getHttpClient() {
  if (!isConfigured()) {
    throw new Error(
      'Azure Face API is not configured. Please set AZURE_FACE_ENDPOINT and AZURE_FACE_KEY'
    );
  }

  return axios.create({
    baseURL: AZURE_FACE_ENDPOINT.replace(/\/+$/, '') + '/face/v1.0',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_FACE_KEY,
    },
    timeout: 15000,
  });
}

/**
 * Ensure person group exists for a host company (idempotent)
 */
async function ensurePersonGroup(hostCompanyId, displayName = '') {
  const personGroupId = getPersonGroupIdForHostCompany(hostCompanyId);

  if (!isConfigured()) {
    // Azure is optional – log and skip
    console.warn(
      '[AzureFace] Skipping ensurePersonGroup – Azure not configured (using ONNX only)'
    );
    return null;
  }

  const client = getHttpClient();

  try {
    // Try to get group first (avoid noisy errors)
    await client.get(`/persongroups/${encodeURIComponent(personGroupId)}`);
    return personGroupId;
  } catch (err) {
    // If not found, create it
    if (err.response && err.response.status === 404) {
      const body = {
        name: displayName || personGroupId,
        userData: 'FaceClock per-host-company person group',
      };
      await client.put(
        `/persongroups/${encodeURIComponent(personGroupId)}`,
        body
      );
      return personGroupId;
    }

    console.warn(
      '[AzureFace] Failed to verify existing person group:',
      err.message
    );
    throw err;
  }
}

/**
 * Create a Person for a staff member inside a given person group
 */
async function createPerson(personGroupId, staff) {
  if (!isConfigured()) {
    console.warn(
      '[AzureFace] Skipping createPerson – Azure not configured (using ONNX only)'
    );
    return null;
  }

  const client = getHttpClient();
  const body = {
    name: `${staff.name} ${staff.surname}`.trim(),
    userData: JSON.stringify({
      staffId: staff._id?.toString?.() || null,
      idNumber: staff.idNumber || null,
      hostCompanyId: staff.hostCompanyId?.toString?.() || null,
    }),
  };

  const res = await client.post(
    `/persongroups/${encodeURIComponent(personGroupId)}/persons`,
    body
  );
  return res.data && res.data.personId ? res.data.personId : null;
}

/**
 * Add a face image to a Person and get persistedFaceId
 */
async function addPersonFace(personGroupId, personId, imageBuffer) {
  if (!isConfigured()) {
    console.warn(
      '[AzureFace] Skipping addPersonFace – Azure not configured (using ONNX only)'
    );
    return null;
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('addPersonFace requires a valid image buffer');
  }

  const client = getHttpClient();

  const res = await client.post(
    `/persongroups/${encodeURIComponent(
      personGroupId
    )}/persons/${encodeURIComponent(personId)}/persistedFaces`,
    imageBuffer,
    {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    }
  );

  return res.data && res.data.persistedFaceId
    ? res.data.persistedFaceId
    : null;
}

/**
 * Trigger training for a person group (fire-and-forget)
 */
async function trainPersonGroup(personGroupId) {
  if (!isConfigured()) {
    console.warn(
      '[AzureFace] Skipping trainPersonGroup – Azure not configured (using ONNX only)'
    );
    return;
  }

  const client = getHttpClient();

  try {
    await client.post(
      `/persongroups/${encodeURIComponent(personGroupId)}/train`
    );
  } catch (err) {
    console.warn(
      '[AzureFace] Failed to start training person group:',
      err.message
    );
  }
}

/**
 * Detect faces in an image and return a single faceId + count
 */
async function detectFace(imageBuffer) {
  if (!isConfigured()) {
    console.warn(
      '[AzureFace] Skipping detectFace – Azure not configured (using ONNX only)'
    );
    return { faceId: null, faceCount: 0 };
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('detectFace requires a valid image buffer');
  }

  const client = getHttpClient();
  const params = {
    returnFaceId: true,
    recognitionModel: '4',
    returnRecognitionModel: false,
  };

  const res = await client.post('/detect', imageBuffer, {
    headers: { 'Content-Type': 'application/octet-stream' },
    params,
  });

  const faces = Array.isArray(res.data) ? res.data : [];
  return {
    faceId: faces[0]?.faceId || null,
    faceCount: faces.length,
  };
}

/**
 * Identify a detected face in a person group
 */
async function identifyFace(
  personGroupId,
  faceId,
  confidenceThreshold = 0.7
) {
  if (!isConfigured()) {
    console.warn(
      '[AzureFace] Skipping identifyFace – Azure not configured (using ONNX only)'
    );
    return null;
  }

  if (!faceId) {
    throw new Error('identifyFace requires a faceId');
  }

  const client = getHttpClient();
  const body = {
    personGroupId,
    faceIds: [faceId],
    maxNumOfCandidatesReturned: 1,
    confidenceThreshold,
  };

  const res = await client.post('/identify', body);
  const results = Array.isArray(res.data) ? res.data : [];
  if (!results[0] || !Array.isArray(results[0].candidates)) {
    return null;
  }

  const candidate = results[0].candidates[0];
  if (!candidate) {
    return null;
  }

  return {
    personId: candidate.personId,
    confidence: candidate.confidence,
  };
}

module.exports = {
  isConfigured,
  getPersonGroupIdForHostCompany,
  ensurePersonGroup,
  createPerson,
  addPersonFace,
  trainPersonGroup,
  detectFace,
  identifyFace,
};


