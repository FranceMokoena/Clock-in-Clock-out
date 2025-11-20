# ONNX Runtime Migration Guide

## Overview

Migrating from face-api.js (TensorFlow.js) to ONNX Runtime with SCRFD + ArcFace models.

## Benefits

✅ **No native binding errors** - Pure JavaScript/ONNX Runtime
✅ **Faster inference** - Optimized ONNX models
✅ **512-d embeddings** - More accurate than 128-d (face-api.js)
✅ **Research-backed thresholds** - 35-40% similarity (vs 75% for face-api.js)
✅ **Works on Node 18, 20, 22** - Future-proof
✅ **GPU support** - Optional GPU acceleration via ONNX Runtime

## Models Required

1. **SCRFD** (face detection) - `scrfd_500m_bnkps.onnx`
2. **ArcFace** (face recognition) - `w600k_r50.onnx` or `glint360k_r50.onnx`

## Migration Steps

1. ✅ Update package.json (remove TensorFlow.js, keep onnxruntime-node)
2. ✅ Create ONNX model download script
3. ✅ Rewrite faceRecognition.js to use ONNX Runtime
4. ✅ Update thresholds to 35-40%
5. ✅ Test and verify

## Model Sources

- InsightFace models: https://github.com/deepinsight/insightface
- ONNX model zoo: https://github.com/onnx/models
- Pre-converted models: Various GitHub repositories

## API Compatibility

The migration maintains the same API:
- `loadModels()` - Loads ONNX models
- `generateEmbedding(imageBuffer)` - Returns 512-d embedding
- `findMatchingStaff(embeddingData, staffList)` - Matches with 35-40% threshold

## Breaking Changes

⚠️ **Important**: Existing embeddings (128-d from face-api.js) will NOT work with new system (512-d).

**Solution**: Re-register all staff members after migration.

