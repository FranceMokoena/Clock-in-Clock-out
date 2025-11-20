# Quick Guide: Copying Models from InsightFace model_zoo

## Step-by-Step Instructions

### Step 1: Download from model_zoo

1. Go to: **https://github.com/deepinsight/insightface/tree/master/model_zoo**
2. Look for model packages (buffalo_l, buffalo_s, buffalo_m)
3. Download the **buffalo_l** package (recommended - best accuracy)
   - Click on the package folder
   - Look for a ZIP download or individual model files

### Step 2: Extract the Package

1. Extract the downloaded ZIP file
2. Inside, you'll find ONNX model files

### Step 3: Identify the Models You Need

You need these two models:

1. **Detection Model** (SCRFD):
   - Look for files like: `det_500m.onnx`, `scrfd_500m_bnkps.onnx`, or similar
   - This is for face detection

2. **Recognition Model** (ArcFace):
   - Look for files like: `w600k_r50.onnx`, `glint360k_r50.onnx`, or similar
   - This is for face recognition (512-d embeddings)

### Step 4: Copy to Your Project

```bash
# Windows PowerShell
# Navigate to your project
cd C:\Clock-in\FaceClockBackend

# Create models directory (if it doesn't exist)
mkdir -p models\onnx

# Copy detection model (adjust filename based on what you found)
copy "path\to\buffalo_l\det_500m.onnx" "models\onnx\scrfd_500m_bnkps.onnx"

# Copy recognition model (adjust filename based on what you found)
copy "path\to\buffalo_l\w600k_r50.onnx" "models\onnx\w600k_r50.onnx"
```

### Step 5: Verify

Check that the files are in place:

```bash
dir models\onnx
```

You should see:
- `scrfd_500m_bnkps.onnx` (or the detection model you copied)
- `w600k_r50.onnx` (or the recognition model you copied)

### Step 6: Update Code if Filenames Differ

If the model filenames in the package are different from what the code expects, you have two options:

**Option A: Rename the files** to match what the code expects:
- Detection: `scrfd_500m_bnkps.onnx`
- Recognition: `w600k_r50.onnx` or `glint360k_r50.onnx`

**Option B: Update the code** to use the actual filenames you have.

## What If Filenames Are Different?

If the extracted models have different names, check `utils/faceRecognitionONNX.js`:

```javascript
// Line ~67: Detection model path
const detectionModelPath = path.join(modelsPath, 'scrfd_500m_bnkps.onnx');

// Line ~87: Recognition model path  
const recognitionModelPath = path.join(modelsPath, 'w600k_r50.onnx');
```

You can either:
1. Rename your files to match these names, OR
2. Update these paths in the code to match your actual filenames

## Quick Check Script

After copying, verify the models are correct:

```bash
# Check file sizes (should be several MB each)
dir models\onnx

# Try starting the server
npm start
```

The server should load the models and you'll see:
```
✅ SCRFD detection model loaded
✅ ArcFace recognition model loaded
✅ All ONNX models loaded successfully
```

## Troubleshooting

**Problem**: "Detection model not found"
- **Solution**: Check the filename matches what's in the code, or update the code

**Problem**: "Recognition model not found"  
- **Solution**: The code also checks for `glint360k_r50.onnx` as alternative, or update the code

**Problem**: Models are in a subfolder
- **Solution**: Copy from the subfolder, or update the path in the code

## Next Steps After Copying

1. ✅ Models copied to `models/onnx/`
2. ✅ Start server: `npm start`
3. ✅ Test registration and clock-in
4. ⚠️ **Important**: Re-register all staff (old 128-d embeddings won't work with new 512-d)

## Need Help?

If you're not sure which files to copy:
1. List all files in the extracted package
2. Look for `.onnx` files
3. The largest files are usually the models
4. Detection model is typically smaller (10-50MB)
5. Recognition model is typically larger (50-200MB)

