# Quick Start - ONNX Migration

## Current Status

The ONNX models (SCRFD + ArcFace) are not available as direct downloads from GitHub. They need to be converted from PyTorch/MXNet format.

## Immediate Solution: Use Legacy Implementation

Since ONNX models aren't readily available, you can use the legacy face-api.js implementation:

### Option 1: Disable ONNX (Use face-api.js CPU backend)

Add to your `.env` file:
```
USE_ONNX=false
```

Then the server will use face-api.js with CPU backend (no native bindings needed).

### Option 2: Fix TensorFlow.js Native Bindings

If you want to use face-api.js with native acceleration:

1. Install Visual C++ Redistributables:
   - Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
   - Install and restart

2. Or rebuild TensorFlow.js:
   ```bash
   npm rebuild @tensorflow/tfjs-node --build-addon-from-source
   ```

## Getting ONNX Models (For Future)

When you're ready to use ONNX:

1. **Option A: Use Hugging Face** (easiest)
   - Visit: https://huggingface.co/models?search=scrfd+onnx
   - Visit: https://huggingface.co/models?search=arcface+onnx
   - Download models to `models/onnx/`

2. **Option B: Convert from PyTorch**
   - Install InsightFace Python package
   - Convert models using their tools
   - See ALTERNATIVE_MODEL_SOURCES.md

3. **Option C: Use Alternative ONNX Models**
   - Check ONNX Model Zoo
   - Use different face detection/recognition models

## Current Recommendation

**For now, use Option 1** (set `USE_ONNX=false`) to get your server running immediately. The face-api.js CPU backend works fine and doesn't require native bindings.

Once you have ONNX models, remove `USE_ONNX=false` and the server will automatically use ONNX.

