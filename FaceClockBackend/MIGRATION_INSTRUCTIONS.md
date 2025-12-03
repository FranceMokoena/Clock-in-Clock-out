# ONNX Runtime Migration Instructions

## ⚠️ Important: Breaking Change

**Existing 128-d embeddings (from face-api.js) will NOT work with 512-d ArcFace embeddings.**

**You MUST re-register all staff members after migration.**

## Migration Steps

### 1. Install Dependencies

```bash
cd FaceClockBackend
npm install
```

The `onnxruntime-node` package is already in your dependencies.

### 2. Download ONNX Models

```bash
npm run download-models
```

This will download:
- `scrfd_500m_bnkps.onnx` - Face detection (SCRFD)
- `w600k_r50.onnx` - Face recognition (ArcFace, 512-d embeddings)

### 3. Switch to ONNX Implementation

**Option A: Direct Switch (Recommended)**

Update `server.js` line 18:
```javascript
// OLD:
const faceRecognition = require('./utils/faceRecognition');

// NEW:
const faceRecognition = require('./utils/faceRecognitionONNX');
```

**Option B: Environment Variable Switch**

Add to `.env`:
```
USE_ONNX=true
```

Then update `server.js`:
```javascript
const useONNX = process.env.USE_ONNX === 'true';
const faceRecognition = useONNX 
  ? require('./utils/faceRecognitionONNX')
  : require('./utils/faceRecognition');
```

### 4. Re-register All Staff

⚠️ **CRITICAL**: After switching to ONNX, you must re-register all staff members because:
- Old embeddings are 128-d (face-api.js)
- New embeddings are 512-d (ArcFace)
- They are incompatible

### 5. Test the Migration

1. Start the server: `npm start`
2. Check logs for: `✅ All ONNX models loaded successfully`
3. Register a test staff member
4. Try clock-in/out
5. Verify embeddings are 512-d in database

## Verification

After migration, check:
- ✅ Models load: `✅ All ONNX models loaded successfully`
- ✅ Embeddings are 512-d: Check database `faceEmbeddings` array length
- ✅ Thresholds are 35-40%: Check logs during matching
- ✅ No TensorFlow.js errors: Should see no `@tensorflow` errors

## Rollback (If Needed)

If you need to rollback:
1. Change `server.js` back to `require('./utils/faceRecognition')`
2. Restart server
3. Old 128-d embeddings will work again

## Model Sources

If automatic download fails, manually download from:
- https://github.com/deepinsight/insightface/releases
- Place in `models/onnx/` directory

## Performance Notes

- **CPU**: ~50-100ms per face (detection + recognition)
- **GPU**: ~10-20ms per face (if CUDA available)
- **Memory**: ~200MB for models

## Troubleshooting

### Models Not Found
```
Error: Detection model not found
```
**Solution**: Run `npm run download-models`

### Wrong Embedding Size
```
Error: Embedding size mismatch. Expected 512-d, got 128-d
```
**Solution**: Re-register staff members (old embeddings incompatible)

### ONNX Runtime Errors
```
Error: Cannot find module 'onnxruntime-node'
```
**Solution**: Run `npm install onnxruntime-node`

## Benefits After Migration

✅ No more TensorFlow.js native binding errors
✅ Faster inference (optimized ONNX)
✅ More accurate (512-d vs 128-d embeddings)
✅ Research-backed thresholds (35-40% vs 75%)
✅ Works on Node 18, 20, 22
✅ Optional GPU support

