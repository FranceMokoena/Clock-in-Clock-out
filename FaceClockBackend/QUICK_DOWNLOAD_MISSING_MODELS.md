# ⚡ Quick Download - Missing Models

## ✅ You Already Have:
- ✅ `scrfd_10g_gnkps_fp32.onnx` (15.52 MB) - **This is the preferred detection model!**
- ✅ `w600k_r50.onnx` (166.31 MB) - **This is the primary recognition model!**

## ❌ You're Missing:
- ❌ `scrfd_500m_bnkps.onnx` - Fallback detection model (optional, but recommended)
- ❌ `glint360k_r50.onnx` - Alternative recognition model (optional)

## 🎯 Good News!

**You have the ESSENTIAL models!** The missing ones are optional fallbacks:
- `scrfd_10g_gnkps_fp32.onnx` is BETTER than `scrfd_500m_bnkps.onnx` (more accurate)
- `w600k_r50.onnx` is the PRIMARY recognition model

## 📥 Download Missing Models (Optional)

### Option 1: Direct Browser Download

Since GitHub releases URLs are returning 404, try these alternative sources:

#### **scrfd_500m_bnkps.onnx** (Optional Fallback)
1. **Visit InsightFace GitHub**: https://github.com/deepinsight/insightface
2. **Check Releases**: https://github.com/deepinsight/insightface/releases
3. **Look for "buffalo_l" model package** - download and extract
4. **Or use InsightFace Python** (see below)

#### **glint360k_r50.onnx** (Optional Alternative)
1. Same as above - check InsightFace releases
2. Or download from model zoo if available

### Option 2: Use InsightFace Python Package (Most Reliable)

```bash
# Install Python if you don't have it
# Then install InsightFace
pip install insightface onnxruntime

# Run Python script to download models
python -c "
import insightface
import os
import shutil

# Initialize InsightFace (will auto-download models)
app = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])

# Models are downloaded to ~/.insightface/models/buffalo_l/
# Copy them to your project
import os
home = os.path.expanduser('~')
source_dir = os.path.join(home, '.insightface', 'models', 'buffalo_l')
target_dir = 'models/onnx'

if os.path.exists(source_dir):
    for file in os.listdir(source_dir):
        if file.endswith('.onnx'):
            src = os.path.join(source_dir, file)
            dst = os.path.join(target_dir, file)
            shutil.copy2(src, dst)
            print(f'Copied: {file}')
else:
    print('Models directory not found. Check:', source_dir)
"
```

### Option 3: Manual Download from Working Sources

Try these direct links (may require authentication or may not work):

**scrfd_500m_bnkps.onnx:**
- Try: https://huggingface.co/deepinsight/scrfd-500m (may need account)
- Or search: https://huggingface.co/models?search=scrfd

**glint360k_r50.onnx:**
- Try: https://huggingface.co/deepinsight/glint360k-r50 (may need account)
- Or search: https://huggingface.co/models?search=glint360k

## ✅ Your App Will Work!

**You don't need the missing models to run your app!**

Your current setup:
- ✅ Detection: `scrfd_10g_gnkps_fp32.onnx` (BETTER than 500m version)
- ✅ Recognition: `w600k_r50.onnx` (PRIMARY model)

The missing models are just **fallbacks/alternatives**. Your server should start fine with what you have!

## 🧪 Test Your Setup

```bash
cd FaceClockBackend
npm start
```

You should see:
```
✅ SCRFD detection model loaded
✅ ArcFace recognition model loaded
✅ All ONNX models loaded successfully
```

If you see this, **you're good to go!** The missing models are optional.

## 📝 Summary

- ✅ **You have the essential models**
- ⚠️ Missing models are optional fallbacks
- 🚀 **Your app should work fine with current models**
- 📥 Download missing ones only if you want fallback options

---

**Try starting your server - it should work! 🎉**

