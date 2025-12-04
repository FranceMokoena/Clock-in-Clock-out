# Memory Optimization Guide: Solving 512MB Memory Limit Issues

## 🚨 THE PROBLEM

**Error**: `Ran out of memory (used over 512MB) while running your code.`

Your service is hitting the **512MB memory limit** on Render.com (or similar hosting platforms). This is a common issue with ML/AI applications that process images and load large models.

---

## 🔍 WHY IS THIS HAPPENING?

### **Root Causes Identified:**

#### 1. **ONNX Models Loaded in Memory** (~200-250MB)
- **SCRFD Detection Model**: ~50-100MB
- **ArcFace Recognition Model**: ~166MB (w600k_r50.onnx)
- **Total**: ~200-250MB just for models

**Location**: `FaceClockBackend/utils/faceRecognitionONNX.js` (lines 452-596)

#### 2. **Staff Cache Holding All Embeddings** (~50-200MB)
- Each staff member has **512-d embeddings** (5 images × 512 floats = ~10KB per staff)
- With 100 staff members: ~1MB embeddings
- With 1000 staff members: ~10MB embeddings
- **Plus**: Full staff objects cached in memory

**Location**: `FaceClockBackend/utils/staffCache.js`

#### 3. **Image Buffers During Processing** (~10-50MB per request)
- **Multer memory storage**: Uploaded images stored in memory
- **Multiple buffers**: Original + processed + cropped + resized
- **Registration**: 5 images × ~2-5MB each = 10-25MB
- **Clock-in**: 1 image × ~2-5MB = 2-5MB
- **Sharp processing**: Creates intermediate buffers

**Location**: `FaceClockBackend/routes/staff.js` (multer memory storage)

#### 4. **No Buffer Cleanup**
- Buffers not explicitly freed after processing
- Node.js garbage collection may not run immediately
- Memory accumulates during concurrent requests

#### 5. **Concurrent Requests**
- Multiple requests = multiple image buffers in memory simultaneously
- Each request loads models (if not already loaded)
- Memory usage multiplies

---

## 💡 HOW OTHER COMPANIES SOLVE THIS

### **1. Netflix / Amazon / Google (Large Scale)**

**Strategy**: **Microservices + Model Serving**
- **Separate model service**: Models run on dedicated GPU instances
- **API gateway**: Lightweight API servers call model service
- **Result**: API servers use <100MB, models on separate infrastructure

**Example Architecture**:
```
[API Server] → [Model Service] → [Database]
   (50MB)         (2GB GPU)         (MongoDB)
```

### **2. Startups / Mid-Size Companies**

**Strategy**: **Memory Optimization + Caching**
- **Model quantization**: Use smaller models (INT8 vs FP32)
- **Lazy loading**: Load models only when needed
- **Model sharing**: Single model instance across requests
- **Buffer pooling**: Reuse buffers instead of creating new ones
- **Streaming**: Process images in chunks, not full buffers

### **3. Render.com / Railway / Fly.io (Platform Solutions)**

**Strategy**: **Upgrade Plan + Optimization**
- **Upgrade memory**: 512MB → 1GB → 2GB (costs more)
- **Optimize code**: Reduce memory footprint
- **Use external services**: AWS Rekognition (you're already using this!)
- **CDN for models**: Store models on S3, download on-demand

### **4. Best Practices (Industry Standard)**

**Common Solutions**:
1. ✅ **Use AWS Rekognition** (you have this!) - Offloads ML to AWS
2. ✅ **Model quantization** - Reduce model size by 4x
3. ✅ **Streaming processing** - Don't load full images
4. ✅ **Memory limits** - Set Node.js `--max-old-space-size`
5. ✅ **Request queuing** - Limit concurrent requests
6. ✅ **Database pagination** - Don't load all staff at once

---

## 🛠️ SOLUTIONS (Priority Order)

### **PRIORITY 1: Immediate Fixes (Do These First)**

#### **Solution 1: Use AWS Rekognition as Primary (You Already Have It!)**

**Why**: AWS Rekognition runs on AWS infrastructure, not your server.

**Current State**: You're using Rekognition BUT also loading ONNX models.

**Fix**: Make Rekognition the PRIMARY matcher, ONNX as fallback only.

```javascript
// In routes/staff.js - Clock-in route
if (rekognition.isConfigured()) {
  // Use Rekognition FIRST (no local models needed)
  const match = await rekognition.searchFaceByImage(...);
  if (match) {
    return match; // Success! No ONNX needed
  }
}
// Only load ONNX if Rekognition fails
const embedding = await generateEmbedding(...); // This loads models
```

**Memory Saved**: ~200-250MB (no ONNX models needed if Rekognition works)

---

#### **Solution 2: Lazy Load Models (Only When Needed)**

**Current**: Models loaded on first request, stay in memory forever.

**Fix**: Load models only when Rekognition is NOT configured.

```javascript
// In faceRecognitionONNX.js
let modelsLoaded = false;
let detectionModel = null;
let recognitionModel = null;

async function loadModels() {
  // Only load if Rekognition is NOT configured
  if (rekognition.isConfigured()) {
    console.log('✅ Using AWS Rekognition - skipping ONNX model load');
    return; // Don't load models!
  }
  
  if (modelsLoaded) return;
  // ... existing load code
}
```

**Memory Saved**: ~200-250MB (if Rekognition is configured)

---

#### **Solution 3: Reduce Image Buffer Size**

**Current**: 10MB limit, full images stored in memory.

**Fix**: Resize images BEFORE processing.

```javascript
// In routes/staff.js - Before processing
const sharp = require('sharp');

// Resize image to max 1024x1024 BEFORE processing
const resizedBuffer = await sharp(req.file.buffer)
  .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .toBuffer();

// Use resizedBuffer instead of req.file.buffer
```

**Memory Saved**: ~50-70% per image (smaller images = less memory)

---

#### **Solution 4: Explicit Buffer Cleanup**

**Current**: Buffers stay in memory until GC runs.

**Fix**: Explicitly nullify buffers after use.

```javascript
// After processing image
let imageBuffer = req.file.buffer;
const result = await processImage(imageBuffer);
imageBuffer = null; // Explicitly free memory
req.file.buffer = null; // Free multer buffer
```

**Memory Saved**: ~10-20MB per request

---

### **PRIORITY 2: Medium-Term Optimizations**

#### **Solution 5: Optimize Staff Cache**

**Current**: All staff embeddings cached in memory.

**Fix**: Only cache essential data, paginate if needed.

```javascript
// In staffCache.js
async _loadFromDatabase() {
  // Only load active staff (you already do this)
  const allStaff = await Staff.find({ isActive: true });
  
  // OPTIMIZATION: Only cache first embedding, not all 5
  const staffWithEmbeddings = allStaff.map(staff => {
    return {
      ...staffObj,
      faceEmbeddings: [staffObj.faceEmbeddings[0]], // Only first embedding
      // Remove other fields not needed for matching
    };
  });
}
```

**Memory Saved**: ~50-80% of cache size

---

#### **Solution 6: Set Node.js Memory Limit**

**Current**: Node.js uses default heap (can grow beyond 512MB).

**Fix**: Set explicit memory limit to fail fast.

```javascript
// In server.js or package.json
// Set Node.js max heap size
process.env.NODE_OPTIONS = '--max-old-space-size=400'; // 400MB limit

// Or in package.json scripts:
"start": "node --max-old-space-size=400 server.js"
```

**Why**: Better error messages, prevents OOM kills

---

#### **Solution 7: Request Queuing (Limit Concurrency)**

**Current**: Multiple requests processed simultaneously.

**Fix**: Queue requests, process one at a time.

```javascript
// In routes/staff.js
const pLimit = require('p-limit');
const limit = pLimit(1); // Only 1 request at a time

router.post('/clock', upload.single('image'), async (req, res) => {
  await limit(async () => {
    // ... existing clock-in code
  });
});
```

**Memory Saved**: Prevents memory spikes from concurrent requests

---

### **PRIORITY 3: Long-Term Solutions**

#### **Solution 8: Upgrade Hosting Plan**

**Render.com Plans**:
- **Free**: 512MB RAM ❌ (current)
- **Starter**: $7/month - 512MB RAM ❌
- **Standard**: $25/month - 1GB RAM ✅
- **Pro**: $85/month - 2GB RAM ✅✅

**Recommendation**: Upgrade to **Standard ($25/month)** for 1GB RAM.

---

#### **Solution 9: Use Model Quantization**

**Current**: FP32 models (~166MB recognition model).

**Fix**: Convert to INT8 quantized models (4x smaller).

```bash
# Convert ONNX model to INT8 (requires ONNX Runtime tools)
onnxruntime-quantize w600k_r50.onnx w600k_r50_int8.onnx
```

**Memory Saved**: ~75% (166MB → ~40MB)

**Trade-off**: Slight accuracy loss (~1-2%)

---

#### **Solution 10: External Model Service**

**Architecture**: Separate service for models.

```
[API Server] → [Model Service API] → [Database]
   (100MB)         (Separate 2GB)        (MongoDB)
```

**Options**:
- **AWS Lambda**: Serverless model inference
- **AWS SageMaker**: Managed ML service
- **Custom service**: Separate Render service for models

---

## 📊 MEMORY BREAKDOWN (Current vs Optimized)

### **Current Memory Usage (Estimated)**

```
Base Node.js:              ~50MB
ONNX Models:              ~250MB  ⚠️
Staff Cache (100 staff):  ~10MB
Image Buffers (1 req):    ~10MB
Other (Express, etc):     ~20MB
─────────────────────────────────
TOTAL:                    ~340MB  (within 512MB limit)

But with concurrent requests:
+ 3 concurrent requests:  +30MB  = 370MB
+ Model loading overhead: +50MB  = 420MB
+ Memory fragmentation:   +50MB  = 470MB
─────────────────────────────────
TOTAL:                    ~470MB  (close to limit!)
```

### **Optimized Memory Usage (After Fixes)**

```
Base Node.js:              ~50MB
ONNX Models:              ~0MB    ✅ (Rekognition only)
Staff Cache (100 staff):  ~5MB    ✅ (optimized)
Image Buffers (1 req):    ~3MB    ✅ (resized)
Other (Express, etc):     ~20MB
─────────────────────────────────
TOTAL:                    ~78MB   ✅✅✅

With 3 concurrent requests:
+ 3 concurrent requests:  +9MB   = 87MB
+ Memory overhead:         +20MB  = 107MB
─────────────────────────────────
TOTAL:                    ~107MB  (well under 512MB!)
```

**Memory Reduction**: **~70%** (from 470MB → 107MB)

---

## 🎯 RECOMMENDED ACTION PLAN

### **Phase 1: Immediate (Do Today)**

1. ✅ **Make Rekognition primary** - Skip ONNX if Rekognition works
2. ✅ **Resize images** - Reduce buffer size before processing
3. ✅ **Explicit buffer cleanup** - Free memory after processing
4. ✅ **Set memory limit** - `--max-old-space-size=400`

**Expected Result**: Memory usage drops to ~150-200MB

---

### **Phase 2: This Week**

5. ✅ **Optimize staff cache** - Only cache essential data
6. ✅ **Request queuing** - Limit concurrent requests
7. ✅ **Monitor memory** - Add memory logging

**Expected Result**: Memory usage drops to ~100-150MB

---

### **Phase 3: Next Month**

8. ✅ **Upgrade hosting** - 1GB RAM plan ($25/month)
9. ✅ **Model quantization** - INT8 models (optional)
10. ✅ **External model service** - If still needed

**Expected Result**: Stable, scalable system

---

## 🔧 IMPLEMENTATION CODE

### **Fix 1: Skip ONNX if Rekognition Works**

```javascript
// In routes/staff.js - Clock-in route (around line 880)
if (rekognition.isConfigured()) {
  try {
    const collectionId = await rekognition.ensureCollection();
    const rekognitionMatch = await rekognition.searchFaceByImage(
      collectionId,
      req.file.buffer,
      85,
      1
    );

    if (rekognitionMatch && rekognitionMatch.externalImageId) {
      // ✅ Rekognition found match - skip ONNX entirely!
      const matchedStaffId = rekognitionMatch.externalImageId;
      const matchedStaff = await Staff.findById(matchedStaffId).lean();
      
      if (matchedStaff) {
        // Free buffer immediately
        req.file.buffer = null;
        
        // Return success - no ONNX needed!
        return res.json({
          success: true,
          staff: matchedStaff,
          similarity: rekognitionMatch.similarity / 100,
          method: 'rekognition'
        });
      }
    }
  } catch (awsErr) {
    console.warn('[Rekognition] Failed, falling back to ONNX:', awsErr.message);
  }
}

// Only load ONNX if Rekognition failed or not configured
// ... existing ONNX code
```

---

### **Fix 2: Resize Images Before Processing**

```javascript
// In routes/staff.js - Add at top
const sharp = require('sharp');

// Helper function to resize image
async function resizeImage(buffer, maxSize = 1024) {
  const metadata = await sharp(buffer).metadata();
  if (metadata.width <= maxSize && metadata.height <= maxSize) {
    return buffer; // Already small enough
  }
  
  return await sharp(buffer)
    .resize(maxSize, maxSize, { 
      fit: 'inside', 
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// In clock-in route (around line 730)
if (req.file) {
  // Resize BEFORE processing
  req.file.buffer = await resizeImage(req.file.buffer, 1024);
  console.log(`📦 Resized image: ${req.file.buffer.length} bytes`);
}
```

---

### **Fix 3: Explicit Buffer Cleanup**

```javascript
// In routes/staff.js - After processing
try {
  const result = await processImage(req.file.buffer);
  
  // Explicitly free memory
  req.file.buffer = null;
  if (req.file) {
    req.file.buffer = null;
  }
  
  return res.json(result);
} catch (error) {
  // Free buffer even on error
  req.file.buffer = null;
  throw error;
}
```

---

### **Fix 4: Set Memory Limit**

```json
// In package.json
{
  "scripts": {
    "start": "node --max-old-space-size=400 server.js"
  }
}
```

---

## 📈 MONITORING MEMORY USAGE

### **Add Memory Logging**

```javascript
// In server.js - Add memory monitoring
setInterval(() => {
  const used = process.memoryUsage();
  const mbUsed = Math.round(used.heapUsed / 1024 / 1024);
  const mbTotal = Math.round(used.heapTotal / 1024 / 1024);
  
  console.log(`💾 Memory: ${mbUsed}MB / ${mbTotal}MB (${Math.round(mbUsed/512*100)}% of 512MB limit)`);
  
  if (mbUsed > 450) {
    console.warn('⚠️ Memory usage high! Consider optimizing.');
  }
}, 30000); // Every 30 seconds
```

---

## ✅ SUCCESS METRICS

After implementing fixes, you should see:

- ✅ **Memory usage**: <200MB under normal load
- ✅ **No OOM errors**: Service stays under 512MB limit
- ✅ **Faster responses**: Smaller images = faster processing
- ✅ **Better reliability**: No memory-related crashes

---

## 🆘 IF STILL HAVING ISSUES

1. **Check Render.com logs** - Look for memory spikes
2. **Monitor concurrent requests** - Too many at once?
3. **Upgrade hosting** - 1GB RAM plan ($25/month)
4. **Use AWS Rekognition only** - Disable ONNX completely
5. **Contact support** - Render.com support can help

---

## 📚 REFERENCES

- **Node.js Memory Management**: https://nodejs.org/api/process.html#process_process_memoryusage
- **Render.com Memory Limits**: https://render.com/docs/memory-limits
- **AWS Rekognition Pricing**: https://aws.amazon.com/rekognition/pricing/
- **ONNX Runtime Memory**: https://onnxruntime.ai/docs/performance/memory-optimizer.html

---

**Last Updated**: December 2025
**Status**: Ready for Implementation

