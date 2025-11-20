# InsightFace Model Zoo Guide

## About model_zoo Folder

The [model_zoo folder](https://github.com/deepinsight/insightface/tree/master/model_zoo) in InsightFace contains pre-trained models. **Good news**: It includes **ONNX model packages** ready to use!

The model_zoo provides model packages like:
- `buffalo_l` - Comprehensive package (detection + recognition + alignment)
- `buffalo_s` - Smaller package
- `buffalo_m` - Medium package

These packages contain **pre-converted ONNX models** that you can use directly!

## What's in model_zoo?

The model_zoo contains **model packages** with ONNX files ready to use:

### Model Packages Available:

1. **buffalo_l** (Large - Recommended for accuracy)
   - Includes: Detection (SCRFD), Recognition (ArcFace), Alignment, Attributes
   - All models in **ONNX format** ✅
   - Best accuracy, larger file size

2. **buffalo_s** (Small)
   - Lighter version, faster inference
   - ONNX format ✅

3. **buffalo_m** (Medium)
   - Balanced between size and accuracy
   - ONNX format ✅

Each package contains:
- **Detection model** (SCRFD) - `.onnx` file
- **Recognition model** (ArcFace) - `.onnx` file  
- **Alignment model** - `.onnx` file
- **Attribute model** (optional) - `.onnx` file

## ✅ Great News: Model Zoo Has ONNX Models!

The model_zoo provides **pre-converted ONNX models** in model packages. You can download and use them directly!

## Better Solution: Use Pre-converted ONNX Models

Instead of downloading from model_zoo and converting, I recommend:

### Option 1: Hugging Face (Easiest - Recommended)

Hugging Face has pre-converted ONNX models ready to use:

1. **SCRFD Detection Model:**
   - URL: https://huggingface.co/deepinsight/scrfd-500m
   - Download: `scrfd_500m_bnkps.onnx`
   - Save to: `FaceClockBackend/models/onnx/`

2. **ArcFace Recognition Model:**
   - URL: https://huggingface.co/deepinsight/arcface-r50
   - Download: `w600k_r50.onnx`
   - Save to: `FaceClockBackend/models/onnx/`

### Option 2: Use InsightFace Python Package

The InsightFace Python package can auto-download and convert models:

```bash
pip install insightface onnxruntime
```

```python
import insightface

# This will auto-download models and you can export to ONNX
app = insightface.app.FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0)
```

### Option 3: Download from model_zoo and Convert

If you want to use model_zoo:

1. **Navigate to model_zoo in the repo:**
   - Go to: https://github.com/deepinsight/insightface/tree/master/model_zoo
   - Look for detection and recognition subfolders

2. **Download the models you need:**
   - SCRFD: Look for `scrfd_500m_bnkps.pth` or similar
   - ArcFace: Look for `w600k_r50.pth` or `glint360k_r50.pth`

3. **Convert to ONNX:**
   - Use InsightFace Python tools to convert
   - Or use PyTorch's `torch.onnx.export()`

## What You Should Download

For your project, you need these **ONNX models**:

1. ✅ `scrfd_500m_bnkps.onnx` - Face detection (SCRFD 500M)
2. ✅ `w600k_r50.onnx` OR `glint360k_r50.onnx` - Face recognition (ArcFace)

## How to Download from model_zoo

### Step 1: Navigate to model_zoo

Go to: https://github.com/deepinsight/insightface/tree/master/model_zoo

### Step 2: Download a Model Package

**Recommended: Download `buffalo_l` package**

The buffalo_l package includes:
- ✅ SCRFD detection model (ONNX)
- ✅ ArcFace recognition model (ONNX)
- ✅ Alignment model (ONNX)
- ✅ Attribute model (ONNX)

### Step 3: Extract the Models

1. Download the ZIP file for `buffalo_l` (or your chosen package)
2. Extract it
3. Inside, you'll find ONNX model files like:
   - `det_500m.onnx` or `scrfd_500m_bnkps.onnx` (detection)
   - `w600k_r50.onnx` or similar (recognition)
   - `2d106det.onnx` (alignment)
   - `genderage.onnx` (attributes)

### Step 4: Copy to Your Project

Copy the detection and recognition models to your project:

```bash
# Windows PowerShell
# Create directory
mkdir FaceClockBackend\models\onnx

# Copy detection model (name may vary - check the extracted files)
copy "buffalo_l\det_500m.onnx" "FaceClockBackend\models\onnx\scrfd_500m_bnkps.onnx"

# Copy recognition model (name may vary)
copy "buffalo_l\w600k_r50.onnx" "FaceClockBackend\models\onnx\w600k_r50.onnx"
```

**Note**: The exact filenames in the package may differ. Check what's in the extracted folder and copy accordingly.

## Quick Answer

**Should you download from model_zoo?**

- ✅ **YES!** The model_zoo has ONNX model packages ready to use
- ✅ Download `buffalo_l` package (or `buffalo_s`/`buffalo_m` for smaller size)
- ✅ Extract and copy the ONNX files to your project
- ✅ No conversion needed - they're already ONNX format!

## My Recommendation

**Download from model_zoo** - it's the official source with ONNX models:

1. Go to: https://github.com/deepinsight/insightface/tree/master/model_zoo
2. Download `buffalo_l` package (ZIP file)
3. Extract the ZIP
4. Find the ONNX model files inside
5. Copy detection and recognition models to: `FaceClockBackend/models/onnx/`
6. Done! ✅

**Alternative: Hugging Face** (if model_zoo download is slow):
- Visit: https://huggingface.co/deepinsight/scrfd-500m
- Visit: https://huggingface.co/deepinsight/arcface-r50

## Next Steps

1. **First, check what you have:**
   ```bash
   node check-insightface-models.js "path/to/insightface"
   ```

2. **Based on results:**
   - If `.onnx` files found → Copy them
   - If only `.pth`/`.params` → Use Hugging Face instead (easier)

3. **Or go straight to Hugging Face** (recommended for speed)

Let me know what the check script finds, and I'll help you with the next steps!

