# 🔧 Fix: Model Download During Render Build

## Problem
Models are not downloading during Render build, causing server to fail or use fallback methods.

## ✅ Solution Applied

### 1. Updated Download URLs
- Added GitHub raw content URLs (more reliable than releases)
- Multiple fallback sources for each model
- Better error handling

### 2. Python Fallback Script
Created `download-models-python.py` that uses InsightFace library to download models.
This runs if Node.js download fails.

### 3. Updated postinstall Script
Now tries:
1. Node.js download script (primary)
2. Python script with InsightFace (fallback)
3. Graceful failure (server handles at runtime)

## 🚀 How It Works Now

### During Render Build:
```bash
npm install
# Runs postinstall script:
# 1. Try: node download-onnx-models.js
# 2. If fails: python3 download-models-python.py
# 3. If both fail: Continue (server will handle)
```

### Required Models:
- ✅ `scrfd_10g_gnkps_fp32.onnx` - Detection (required)
- ✅ `w600k_r50.onnx` - Recognition (required)

### Optional Models:
- ⚠️ `scrfd_500m_bnkps.onnx` - Fallback detection
- ⚠️ `glint360k_r50.onnx` - Alternative recognition

## 📋 Next Steps

1. **Commit and push changes:**
   ```bash
   git add download-onnx-models.js download-models-python.py package.json render.yaml
   git commit -m "Fix model download with Python fallback"
   git push
   ```

2. **Render will automatically:**
   - Run `npm install`
   - Try Node.js download
   - Try Python download if Node.js fails
   - Start server (even if downloads fail)

3. **Check Render build logs** for:
   ```
   ✅ Downloaded: scrfd_10g_gnkps_fp32.onnx
   ✅ Downloaded: w600k_r50.onnx
   ✅ All required model files verified successfully!
   ```

## 🔍 If Downloads Still Fail

The server will:
- Start successfully (won't crash)
- Attempt to download models at runtime
- Use fallback methods if needed

Check server logs for model loading status.

## 🐍 Python Requirements

If Python fallback is used, Render needs Python 3 with:
- `insightface` package
- `onnxruntime` package

These will be auto-installed by the script if missing.

---

**After pushing, Render will try both download methods! 🎉**

