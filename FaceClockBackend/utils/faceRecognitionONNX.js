/**
 * ONNX Runtime-based Face Recognition
 * 
 * Uses:
 * - SCRFD for face detection (fast, accurate)
 * - ArcFace for face recognition (512-d embeddings, research-backed)
 * 
 * Research-backed thresholds: 35-40% similarity for ArcFace
 */

const ort = require('onnxruntime-node');
const { loadImage } = require('canvas');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

let detectionModel = null;
let recognitionModel = null;
let modelsLoaded = false;
let modelsLoadError = null;
let modelsPromise = null;

// Mutex for ensuring thread-safe inference (ONNX Runtime sessions are not thread-safe)
let detectionInferenceQueue = Promise.resolve();
let recognitionInferenceQueue = Promise.resolve();

// Configuration - Research-backed thresholds for ArcFace
const CONFIG = {
  // Recognition thresholds - RESEARCH-BACKED for ArcFace (512-d embeddings)
  MIN_SIMILARITY_THRESHOLD: 0.38,  // 38% - Research-backed base threshold for ArcFace
  HIGH_CONFIDENCE_THRESHOLD: 0.50,  // 50% - High confidence match
  VERY_HIGH_CONFIDENCE_THRESHOLD: 0.65, // 65% - Very high confidence
  
  // Minimum similarity requirements
  ABSOLUTE_MINIMUM_SIMILARITY: 0.35, // 35% - absolute minimum (research-backed)
  MIN_SIMILARITY_GAP: 0.03, // 3% - minimum gap between top match and second match
  
  // Face detection settings
  MIN_FACE_SIZE: 50,  // Minimum face size in pixels
  MAX_FACE_SIZE: 2000, // Maximum face size in pixels
  MIN_DETECTION_SCORE: 0.5, // Minimum detection confidence
  
  // Face quality requirements
  MIN_FACE_QUALITY: 0.5, // 50% - minimum face quality
  MAX_FACE_ANGLE: 30, // Maximum face angle in degrees
  
  // Image preprocessing requirements
  MIN_IMAGE_WIDTH: 400, // Minimum image width
  MAX_IMAGE_WIDTH: 1920, // Maximum image width
  TARGET_SIZE: 112, // Target size for ArcFace input (112x112)
};

/**
 * Load ONNX models (SCRFD + ArcFace)
 */
async function loadModels() {
  if (modelsLoaded) {
    return;
  }

  if (modelsPromise) {
    return modelsPromise;
  }

  const modelsPath = path.join(__dirname, '../models/onnx');
  modelsPromise = (async () => {
    modelsLoadError = null;

    try {
      // Load SCRFD detection model
      // Try 10G model first (better accuracy), fallback to 500M
      let detectionModelPath = path.join(modelsPath, 'scrfd_10g_gnkps_fp32.onnx');
      if (!fs.existsSync(detectionModelPath)) {
        // Fallback to 500M model
        detectionModelPath = path.join(modelsPath, 'scrfd_500m_bnkps.onnx');
        if (!fs.existsSync(detectionModelPath)) {
          const errorMsg = `\n❌ Detection model not found.\n\n` +
            `Expected one of:\n` +
            `  - scrfd_10g_gnkps_fp32.onnx (preferred)\n` +
            `  - scrfd_500m_bnkps.onnx (fallback)\n\n` +
            `💡 Solutions:\n` +
            `   1. Place detection model in: ${modelsPath}\n` +
            `   2. Or set USE_ONNX=false to use legacy face-api.js\n`;
          throw new Error(errorMsg);
        }
      }

      console.log('📦 Loading SCRFD face detection model...');
      detectionModel = await ort.InferenceSession.create(detectionModelPath, {
        executionProviders: ['cpu'], // Use 'cuda' for GPU if available
      });
      // Log input/output names for debugging
      console.log('   📋 Detection model inputs:', JSON.stringify(detectionModel.inputNames));
      console.log('   📋 Detection model outputs:', JSON.stringify(detectionModel.outputNames));
      console.log('✅ SCRFD detection model loaded');

      // Load ArcFace recognition model
      const recognitionModelPath = path.join(modelsPath, 'w600k_r50.onnx');
      if (!fs.existsSync(recognitionModelPath)) {
        // Try alternative model
        const altPath = path.join(modelsPath, 'glint360k_r50.onnx');
        if (fs.existsSync(altPath)) {
          console.log('📦 Loading ArcFace recognition model (glint360k)...');
          recognitionModel = await ort.InferenceSession.create(altPath, {
            executionProviders: ['cpu'],
          });
          console.log('   Recognition model inputs:', recognitionModel.inputNames);
          console.log('   Recognition model outputs:', recognitionModel.outputNames);
        } else {
          const errorMsg = `\n❌ Recognition model not found.\n\n` +
            `Expected one of:\n` +
            `  - ${recognitionModelPath}\n` +
            `  - ${altPath}\n\n` +
            `💡 Solutions:\n` +
            `   1. Run: npm run download-models\n` +
            `   2. If download fails, see ALTERNATIVE_MODEL_SOURCES.md\n` +
            `   3. Download models manually from:\n` +
            `      - Hugging Face: https://huggingface.co/models?search=arcface+onnx\n` +
            `      - Place in: ${modelsPath}\n` +
            `   4. Or set USE_ONNX=false to use legacy face-api.js\n`;
          throw new Error(errorMsg);
        }
      } else {
        console.log('📦 Loading ArcFace recognition model (w600k)...');
        recognitionModel = await ort.InferenceSession.create(recognitionModelPath, {
          executionProviders: ['cpu'],
        });
        console.log('   ✅ Recognition model loaded');
        console.log('   📋 Input names:', JSON.stringify(recognitionModel.inputNames));
        console.log('   📋 Output names:', JSON.stringify(recognitionModel.outputNames));
        console.log('   📋 Input metadata:', JSON.stringify(recognitionModel.inputMetadata));
      }
      console.log('✅ ArcFace recognition model loaded');

      modelsLoaded = true;
      console.log('✅ All ONNX models loaded successfully');
      return;
    } catch (error) {
      modelsLoadError = error;
      modelsLoaded = false;
      console.error('❌ Error loading ONNX models:', error.message);
      throw error;
    }
  })();

  try {
    await modelsPromise;
  } catch (error) {
    modelsLoadError = error;
    modelsLoaded = false;
    throw error;
  } finally {
    modelsPromise = null;
  }
}

/**
 * Preprocess image for SCRFD detection
 */
async function preprocessForDetection(imageBuffer) {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  // Resize if too large (max 640px for SCRFD)
  let processedImage = image;
  if (metadata.width > 640 || metadata.height > 640) {
    processedImage = image.resize(640, 640, { fit: 'inside' });
  }

  // Convert to RGB and get raw buffer
  const rgbBuffer = await processedImage
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Normalize to [0, 1] and convert to Float32Array
  const pixels = new Float32Array(rgbBuffer.data.length);
  for (let i = 0; i < rgbBuffer.data.length; i += 4) {
    pixels[i] = rgbBuffer.data[i] / 255.0;     // R
    pixels[i + 1] = rgbBuffer.data[i + 1] / 255.0; // G
    pixels[i + 2] = rgbBuffer.data[i + 2] / 255.0; // B
    // Skip alpha
  }

  // Reshape to [1, 3, H, W] for ONNX
  const height = rgbBuffer.info.height;
  const width = rgbBuffer.info.width;
  const reshaped = new Float32Array(1 * 3 * height * width);
  
  // Convert HWC to CHW format
  for (let c = 0; c < 3; c++) {
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        const srcIdx = (h * width + w) * 4 + c;
        const dstIdx = c * height * width + h * width + w;
        reshaped[dstIdx] = pixels[srcIdx];
      }
    }
  }

  return {
    tensor: new ort.Tensor('float32', reshaped, [1, 3, height, width]),
    width,
    height,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
  };
}

/**
 * Detect faces using SCRFD
 */
async function detectFaces(imageBuffer) {
  await loadModels();

  // Validate detection model is loaded
  if (!detectionModel) {
    throw new Error('Detection model not loaded');
  }
  
  if (!detectionModel.inputNames || detectionModel.inputNames.length === 0) {
    throw new Error('Detection model has no input names');
  }
  
  // Ensure model session is valid (check if it's been disposed or corrupted)
  if (typeof detectionModel.run !== 'function') {
    throw new Error('Detection model session is invalid - run method not available');
  }

  console.log('   📥 Starting face detection...');
  const preprocessed = await preprocessForDetection(imageBuffer);
  console.log('   ✅ Preprocessing complete');
  
  // Validate preprocessing result
  if (!preprocessed) {
    throw new Error('Preprocessing failed - no result returned');
  }
  
  if (!preprocessed.tensor) {
    throw new Error('Preprocessing failed - no tensor generated');
  }
  
  // Validate tensor is a valid ONNX Tensor
  if (!(preprocessed.tensor instanceof ort.Tensor)) {
    console.error('   ❌ Tensor is not an ONNX Tensor instance');
    console.error('   📦 Tensor type:', typeof preprocessed.tensor);
    console.error('   📦 Tensor constructor:', preprocessed.tensor?.constructor?.name);
    throw new Error('Preprocessing failed - invalid tensor type');
  }
  
  const scaleX = preprocessed.originalWidth / preprocessed.width;
  const scaleY = preprocessed.originalHeight / preprocessed.height;

  // Run detection - use actual input name from model (should be 'blob' for SCRFD)
  const inputName = detectionModel.inputNames[0];
  
  // Validate input name exists and is a string
  if (!inputName || typeof inputName !== 'string' || inputName.trim().length === 0) {
    const errorMsg = `Invalid input name: "${inputName}" (type: ${typeof inputName}). Model inputs: ${JSON.stringify(detectionModel.inputNames)}`;
    console.error(`   ❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  // Log expected input name for debugging
  if (inputName !== 'blob') {
    console.warn(`   ⚠️ Warning: Expected input name 'blob', but got '${inputName}'. Using '${inputName}' anyway.`);
  }
  
  console.log(`   🔧 Detection using input name: "${inputName}"`);
  console.log(`   📋 Available input names: ${detectionModel.inputNames.join(', ')}`);
  console.log(`   📦 Tensor shape: [${preprocessed.tensor.dims.join(', ')}]`);
  console.log(`   📦 Tensor type: ${preprocessed.tensor.type}`);
  console.log(`   📦 Tensor data length: ${preprocessed.tensor.data.length}`);
  
  // Validate tensor has data
  if (!preprocessed.tensor.data || preprocessed.tensor.data.length === 0) {
    throw new Error('Preprocessing failed - tensor has no data');
  }
  
  // Create feeds object explicitly to ensure correct structure
  const feeds = {};
  feeds[inputName] = preprocessed.tensor;
  
  // Validate feeds object before running inference
  if (!feeds.hasOwnProperty(inputName)) {
    throw new Error(`Failed to create feeds object with input name "${inputName}"`);
  }
  
  if (!feeds[inputName] || !(feeds[inputName] instanceof ort.Tensor)) {
    throw new Error(`Invalid tensor in feeds object for input "${inputName}"`);
  }
  
  console.log(`   🚀 Running detection with input: "${inputName}"`);
  console.log(`   📦 Feeds object keys: ${Object.keys(feeds).join(', ')}`);
  console.log(`   📦 Feeds object values: ${Object.keys(feeds).map(k => typeof feeds[k]).join(', ')}`);
  console.log(`   📦 Feed value is Tensor: ${feeds[inputName] instanceof ort.Tensor}`);
  
  // Use mutex to ensure thread-safe inference (ONNX Runtime sessions are not thread-safe)
  let results;
  try {
    // Queue this inference to run after previous ones complete
    detectionInferenceQueue = detectionInferenceQueue.then(async () => {
      try {
        const inferenceResult = await detectionModel.run(feeds);
        console.log(`   ✅ Detection complete. Outputs: ${Object.keys(inferenceResult).join(', ')}`);
        return inferenceResult;
      } catch (inferenceError) {
        console.error(`   ❌ Detection failed with input name: "${inputName}"`);
        console.error(`   📋 Model expects inputs: ${detectionModel.inputNames.join(', ')}`);
        console.error(`   📦 Provided feeds keys: ${Object.keys(feeds).join(', ')}`);
        console.error(`   📦 Feed value type: ${typeof feeds[inputName]}`);
        console.error(`   📦 Feed value is Tensor: ${feeds[inputName] instanceof ort.Tensor}`);
        console.error(`   📦 Feed value shape: ${feeds[inputName]?.dims?.join(', ') || 'N/A'}`);
        console.error(`   ❌ Error details: ${inferenceError.message}`);
        console.error(`   ❌ Error stack: ${inferenceError.stack}`);
        throw inferenceError;
      }
    }).catch((error) => {
      // Ensure queue continues even if this inference fails
      throw error;
    });
    
    results = await detectionInferenceQueue;
  } catch (error) {
    console.error(`   ❌ Detection error: ${error.message}`);
    throw error;
  }

  // Parse SCRFD output (format: [batch, num_detections, 15])
  // Each detection: [x1, y1, x2, y2, score, landmarks...]
  const detections = [];
  
  // Get results - SCRFD outputs: box_8, score_8, lmk5pt_8, box_16, score_16, lmk5pt_16, box_32, score_32, lmk5pt_32
  // Use the highest resolution output (box_32, score_32) for best accuracy
  const boxOutput = results.box_32 || results.box_16 || results.box_8;
  const scoreOutput = results.score_32 || results.score_16 || results.score_8;
  
  if (!boxOutput || !scoreOutput) {
    console.error('   ❌ Invalid SCRFD output format');
    console.error(`   📋 Available outputs: ${Object.keys(results).join(', ')}`);
    throw new Error(`Invalid SCRFD output format. Available: ${Object.keys(results).join(', ')}`);
  }
  
  const scores = scoreOutput.data;
  const boxes = boxOutput.data;

  // Parse SCRFD output - format is [num_detections, 15] where each detection has:
  // [x1, y1, x2, y2, score, landmark_x1, landmark_y1, landmark_x2, landmark_y2, ...]
  // Use box_32 (highest resolution) for best accuracy
  const numDetections = Math.floor(boxes.length / 4); // Each box has 4 values (x1, y1, x2, y2)
  const numScores = scores.length;
  
  console.log(`   📊 Parsing ${numDetections} potential detections from SCRFD output`);
  
  // Parse detections - boxes are in format [x1, y1, x2, y2] per detection
  for (let i = 0; i < numDetections && i < numScores; i++) {
    const boxIdx = i * 4;
    const scoreIdx = i;
    
    const x1 = boxes[boxIdx] * scaleX;
    const y1 = boxes[boxIdx + 1] * scaleY;
    const x2 = boxes[boxIdx + 2] * scaleX;
    const y2 = boxes[boxIdx + 3] * scaleY;
    const score = scores[scoreIdx];
    
    if (score > CONFIG.MIN_DETECTION_SCORE) {
      detections.push({
        box: {
          x: Math.max(0, x1),
          y: Math.max(0, y1),
          width: Math.max(CONFIG.MIN_FACE_SIZE, x2 - x1),
          height: Math.max(CONFIG.MIN_FACE_SIZE, y2 - y1),
        },
        score: score,
      });
    }
  }
  
  console.log(`   ✅ Found ${detections.length} faces with score > ${CONFIG.MIN_DETECTION_SCORE}`);

  return detections;
}

/**
 * Preprocess face crop for ArcFace recognition
 */
async function preprocessForRecognition(imageBuffer, faceBox) {
  const image = sharp(imageBuffer);
  
  // Crop face region
  const crop = await image
    .extract({
      left: Math.max(0, Math.floor(faceBox.x)),
      top: Math.max(0, Math.floor(faceBox.y)),
      width: Math.min(faceBox.width, await image.metadata().then(m => m.width)),
      height: Math.min(faceBox.height, await image.metadata().then(m => m.height)),
    })
    .resize(CONFIG.TARGET_SIZE, CONFIG.TARGET_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Normalize: (pixel - 127.5) / 128.0 (ArcFace normalization)
  const pixels = new Float32Array(crop.data.length);
  for (let i = 0; i < crop.data.length; i += 4) {
    pixels[i] = (crop.data[i] - 127.5) / 128.0;     // R
    pixels[i + 1] = (crop.data[i + 1] - 127.5) / 128.0; // G
    pixels[i + 2] = (crop.data[i + 2] - 127.5) / 128.0; // B
  }

  // Reshape to [1, 3, 112, 112] for ONNX
  const reshaped = new Float32Array(1 * 3 * CONFIG.TARGET_SIZE * CONFIG.TARGET_SIZE);
  
  // Convert HWC to CHW
  for (let c = 0; c < 3; c++) {
    for (let h = 0; h < CONFIG.TARGET_SIZE; h++) {
      for (let w = 0; w < CONFIG.TARGET_SIZE; w++) {
        const srcIdx = (h * CONFIG.TARGET_SIZE + w) * 4 + c;
        const dstIdx = c * CONFIG.TARGET_SIZE * CONFIG.TARGET_SIZE + h * CONFIG.TARGET_SIZE + w;
        reshaped[dstIdx] = pixels[srcIdx];
      }
    }
  }

  return new ort.Tensor('float32', reshaped, [1, 3, CONFIG.TARGET_SIZE, CONFIG.TARGET_SIZE]);
}

/**
 * Generate 512-d face embedding using ArcFace
 */
async function generateEmbedding(imageBuffer) {
  const totalStartTime = Date.now();
  
  console.log('🧮 ====== STARTING EMBEDDING GENERATION ======');
  console.log(`   📦 Image buffer size: ${imageBuffer?.length || 0} bytes`);
  console.log(`   📦 Image buffer type: ${imageBuffer?.constructor?.name || typeof imageBuffer}`);
  
  try {
    console.log('   📥 Loading ONNX models...');
    await loadModels();
    console.log('   ✅ Models loaded successfully');
  } catch (err) {
    console.error('❌ ONNX models not loaded:', err?.message || err);
    throw new Error('ONNX models are not available. Please run: npm run download-models');
  }

  try {
    // Detect faces
    console.log('🔍 Detecting faces with SCRFD...');
    const detections = await detectFaces(imageBuffer);
    console.log(`   ✅ Face detection complete: ${detections.length} face(s) found`);
    
    if (!detections || detections.length === 0) {
      throw new Error('No face detected in image. Please ensure your face is visible and well-lit.');
    }

    // Use the largest/most confident face
    let bestDetection = detections[0];
    for (const detection of detections) {
      if (detection.score > bestDetection.score) {
        bestDetection = detection;
      }
    }

    console.log(`✅ Face detected - Confidence: ${(bestDetection.score * 100).toFixed(1)}%`);

    // Generate embedding
    console.log('🧮 Generating 512-d embedding with ArcFace...');
    const faceTensor = await preprocessForRecognition(imageBuffer, bestDetection.box);
    
    // Use actual input name from model (this model uses 'input.1', not 'blob')
    // Log for debugging
    if (!recognitionModel || !recognitionModel.inputNames || recognitionModel.inputNames.length === 0) {
      console.error('❌ Recognition model has no input names!');
      console.error('   Model:', recognitionModel ? 'loaded' : 'not loaded');
      console.error('   Input names:', recognitionModel?.inputNames);
      throw new Error('Recognition model input names not available');
    }
    
    const inputName = recognitionModel.inputNames[0];
    console.log(`   🔧 Using input name: "${inputName}"`);
    console.log(`   📋 All available inputs: ${recognitionModel.inputNames.join(', ')}`);
    console.log(`   📦 Tensor shape: [${faceTensor.dims.join(', ')}]`);
    console.log(`   📦 Tensor type: ${faceTensor.type}`);
    
    const feeds = { [inputName]: faceTensor };
    console.log(`   🚀 Running inference with input: "${inputName}"`);
    
    // Use mutex to ensure thread-safe inference (ONNX Runtime sessions are not thread-safe)
    recognitionInferenceQueue = recognitionInferenceQueue.then(async () => {
      try {
        const inferenceResult = await recognitionModel.run(feeds);
        console.log(`   ✅ Inference complete. Outputs: ${Object.keys(inferenceResult).join(', ')}`);
        return inferenceResult;
      } catch (inferenceError) {
        console.error(`   ❌ Recognition inference failed: ${inferenceError.message}`);
        console.error(`   ❌ Error stack: ${inferenceError.stack}`);
        throw inferenceError;
      }
    }).catch((error) => {
      // Ensure queue continues even if this inference fails
      throw error;
    });
    
    const results = await recognitionInferenceQueue;
    
    // Extract embedding (512-d vector)
    // Adjust output name based on your model
    const embedding = Array.from(results.output?.data || results.fc1?.data || Object.values(results)[0].data);
    
    if (!embedding || embedding.length !== 512) {
      throw new Error(`Invalid embedding size: ${embedding?.length || 0} (expected 512)`);
    }

    // Normalize embedding (L2 normalization for cosine similarity)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map(val => val / norm);

    const totalTime = Date.now() - totalStartTime;
    console.log(`✅ 512-d embedding generated in ${totalTime}ms`);

    return {
      embedding: normalizedEmbedding,
      quality: bestDetection.score,
      detectionScore: bestDetection.score,
      faceCount: detections.length,
    };
  } catch (error) {
    const errorMessage = error?.message || String(error) || 'Unknown error';
    console.error('❌ Error generating embedding:', errorMessage);
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}

/**
 * Cosine similarity for comparing embeddings
 */
function cosineSimilarity(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (norm1 * norm2);
}

/**
 * Find best matching staff with research-backed thresholds
 */
async function findMatchingStaff(embeddingData, staffList) {
  const matchingStartTime = Date.now();
  
  if (!embeddingData) {
    console.error('❌ findMatchingStaff: embeddingData is null or undefined');
    return null;
  }
  
  const embedding = embeddingData.embedding || embeddingData;
  const quality = embeddingData.quality || 1.0;
  
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    console.error('❌ findMatchingStaff: Invalid embedding');
    return null;
  }

  // Validate embedding is 512-d (ArcFace)
  if (embedding.length !== 512) {
    console.error(`❌ findMatchingStaff: Embedding size mismatch. Expected 512-d (ArcFace), got ${embedding.length}-d`);
    return null;
  }
  
  if (!staffList || !Array.isArray(staffList) || staffList.length === 0) {
    console.error('❌ findMatchingStaff: Invalid staff list');
    return null;
  }
  
  // Research-backed threshold: 35-40% for ArcFace
  let threshold = CONFIG.MIN_SIMILARITY_THRESHOLD; // 38%
  
  // Adjust based on quality
  if (quality < 0.6) {
    threshold = 0.40; // 40% for lower quality
  } else if (quality < 0.8) {
    threshold = 0.38; // 38% for medium quality
  } else {
    threshold = CONFIG.MIN_SIMILARITY_THRESHOLD; // 38% for high quality
  }
  
  threshold = Math.max(threshold, CONFIG.ABSOLUTE_MINIMUM_SIMILARITY); // Never below 35%
  
  console.log(`🔍 Matching with ArcFace - Threshold: ${(threshold * 100).toFixed(1)}% (quality: ${(quality * 100).toFixed(1)}%)`);
  
  let bestMatch = null;
  let bestSimilarity = 0;
  const candidates = [];
  
  console.log(`🔍 Comparing with ${staffList.length} registered staff members...`);
  
  for (const staff of staffList) {
    // Support multiple embeddings per person
    let staffEmbeddings = [];
    
    if (staff.faceEmbeddings && Array.isArray(staff.faceEmbeddings) && staff.faceEmbeddings.length > 0) {
      staffEmbeddings = staff.faceEmbeddings;
    } else {
      const singleEmbedding = staff.decryptedEmbedding || staff.faceEmbedding;
      if (singleEmbedding && Array.isArray(singleEmbedding) && singleEmbedding.length > 0) {
        staffEmbeddings = [singleEmbedding];
      }
    }
    
    if (staffEmbeddings.length === 0) {
      continue;
    }
    
    // Compare against all embeddings, use best match
    let bestStaffSimilarity = 0;
    
    for (let i = 0; i < staffEmbeddings.length; i++) {
      const staffEmbedding = staffEmbeddings[i];
      
      if (!staffEmbedding || !Array.isArray(staffEmbedding) || staffEmbedding.length === 0) {
        continue;
      }
      
      // Handle both 128-d (old) and 512-d (new) embeddings
      if (staffEmbedding.length === 128) {
        console.warn(`⚠️ ${staff.name}: Using old 128-d embedding (face-api.js). Please re-register for 512-d (ArcFace) accuracy.`);
        // Can still match, but less accurate
      } else if (staffEmbedding.length !== 512) {
        console.warn(`⚠️ ${staff.name}: Invalid embedding size: ${staffEmbedding.length} (expected 512)`);
        continue;
      }
      
      const similarity = cosineSimilarity(embedding, staffEmbedding);
      
      if (similarity > bestStaffSimilarity) {
        bestStaffSimilarity = similarity;
      }
    }
    
    const similarity = bestStaffSimilarity;
    const matchStatus = similarity >= threshold ? '✅ MATCH' : '❌ below threshold';
    console.log(`   ${staff.name}: ${(similarity * 100).toFixed(1)}% ${matchStatus}`);
    
    if (similarity >= threshold) {
      candidates.push({ staff, similarity });
      
      // Early exit on very high confidence
      if (similarity >= CONFIG.VERY_HIGH_CONFIDENCE_THRESHOLD) {
        console.log(`⚡ Early exit: Found very high confidence match (${(similarity * 100).toFixed(1)}%)`);
        bestMatch = { staff, similarity };
        bestSimilarity = similarity;
        break;
      }
    }
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { staff, similarity };
    }
  }
  
  console.log(`📊 Best match: ${bestMatch ? bestMatch.staff.name : 'None'} - ${(bestSimilarity * 100).toFixed(1)}%`);
  console.log(`📊 Candidates above threshold (${(threshold * 100).toFixed(1)}%): ${candidates.length}`);
  
  // Validate candidates
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topMatch = candidates[0];
    
    // Check similarity gap
    if (candidates.length > 1) {
      const secondMatch = candidates[1];
      const similarityGap = topMatch.similarity - secondMatch.similarity;
      
      if (similarityGap < CONFIG.MIN_SIMILARITY_GAP) {
        console.error(`❌ AMBIGUOUS MATCH - Rejected`);
        console.error(`   Top: ${topMatch.staff.name} - ${(topMatch.similarity * 100).toFixed(1)}%`);
        console.error(`   Second: ${secondMatch.staff.name} - ${(secondMatch.similarity * 100).toFixed(1)}%`);
        return null;
      }
    }
    
    if (topMatch.similarity < CONFIG.ABSOLUTE_MINIMUM_SIMILARITY) {
      console.error(`❌ Match rejected - below absolute minimum (35%)`);
      return null;
    }
    
    bestMatch = topMatch;
    bestSimilarity = topMatch.similarity;
  }
  
  if (!bestMatch || bestSimilarity < threshold) {
    console.error(`❌ NO MATCH FOUND`);
    console.error(`   Best similarity: ${(bestSimilarity * 100).toFixed(1)}%`);
    console.error(`   Required: ${(threshold * 100).toFixed(1)}%`);
    return null;
  }
  
  let confidenceLevel = 'Medium';
  if (bestSimilarity >= CONFIG.VERY_HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'Very High';
  } else if (bestSimilarity >= CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'High';
  }
  
  const matchingTime = Date.now() - matchingStartTime;
  console.log(`✅ Match found: ${bestMatch.staff.name} - Similarity: ${(bestSimilarity * 100).toFixed(1)}% (${confidenceLevel} confidence)`);
  console.log(`⚡ Matching time: ${matchingTime}ms`);
  
  return {
    staff: bestMatch.staff,
    similarity: bestSimilarity,
    confidenceLevel,
    quality
  };
}

module.exports = {
  loadModels,
  generateEmbedding,
  findMatchingStaff,
  cosineSimilarity
};

