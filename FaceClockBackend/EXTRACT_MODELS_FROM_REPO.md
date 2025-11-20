# Extracting Models from InsightFace Repository

## Where to Find Models in the InsightFace Repo

Based on the [InsightFace GitHub repository](https://github.com/deepinsight/insightface), here's where to find the models:

### Option 1: Model Zoo (Most Likely Location)

The models are typically in:
```
insightface/model_zoo/
```

This folder contains:
- Detection models (SCRFD, RetinaFace)
- Recognition models (ArcFace variants)
- Alignment models

### Option 2: Python Package Models

Models might also be in:
```
insightface/python-package/insightface/model_zoo/
```

### Option 3: Detection and Recognition Folders

- **Detection models**: `insightface/detection/`
- **Recognition models**: `insightface/recognition/`

## Important: Models Are NOT Directly ONNX

⚠️ **Critical**: InsightFace provides models in **PyTorch (.pth)** or **MXNet (.params)** format, **NOT directly as ONNX**.

You have two options:

### Option A: Convert Models to ONNX (Recommended)

1. **Install InsightFace Python package:**
   ```bash
   pip install insightface onnxruntime
   ```

2. **Use InsightFace's conversion tools:**
   ```python
   import insightface
   import onnxruntime
   
   # InsightFace can export models to ONNX
   # Check the python-package for conversion scripts
   ```

3. **Or use the model_zoo with conversion:**
   - Models in `model_zoo/` can be loaded and converted
   - Look for conversion scripts in `python-package/`

### Option B: Use Pre-converted ONNX Models

Check if InsightFace has pre-converted ONNX models in:
- `insightface/model_zoo/onnx/` (if exists)
- Or download from Hugging Face (easier)

## What You Need

For your project, you need:

1. **SCRFD Detection Model** (for face detection):
   - Look for: `scrfd_500m_bnkps.onnx` or `scrfd_500m_bnkps.pth`
   - Location: `model_zoo/detection/` or `detection/`

2. **ArcFace Recognition Model** (for 512-d embeddings):
   - Look for: `w600k_r50.onnx` or `glint360k_r50.onnx` or `.pth` versions
   - Location: `model_zoo/recognition/` or `recognition/`

## Step-by-Step: Extract and Convert

### Step 1: Find the Models

Navigate to your downloaded InsightFace folder and check:

```bash
# Check model_zoo
ls insightface/model_zoo/

# Check for ONNX folder
ls insightface/model_zoo/onnx/  # if exists

# Check detection folder
ls insightface/detection/

# Check recognition folder  
ls insightface/recognition/
```

### Step 2: Copy to Your Project

Once you find the models (or convert them):

1. **Create ONNX models directory:**
   ```bash
   mkdir -p FaceClockBackend/models/onnx
   ```

2. **Copy the models:**
   ```bash
   # If you found .onnx files:
   cp insightface/model_zoo/onnx/scrfd_500m_bnkps.onnx FaceClockBackend/models/onnx/
   cp insightface/model_zoo/onnx/w600k_r50.onnx FaceClockBackend/models/onnx/
   
   # Or if you have .pth files, convert them first (see conversion below)
   ```

### Step 3: Convert PyTorch to ONNX (If Needed)

If you only have `.pth` files, convert them:

```python
# convert_to_onnx.py
import torch
import onnx
from insightface import get_model

# Load SCRFD model
detector = get_model('scrfd_500m_bnkps')
detector.prepare(ctx_id=0)

# Convert to ONNX (example - adjust based on actual model structure)
# This is a simplified example - actual conversion may vary
torch.onnx.export(
    detector.model,
    torch.randn(1, 3, 640, 640),  # dummy input
    'scrfd_500m_bnkps.onnx',
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}}
)

# Similar for ArcFace recognition model
```

## Quick Check: What Format Are Your Models?

Run this in your InsightFace folder:

```bash
# Find all model files
find . -name "*.onnx" -o -name "*.pth" -o -name "*.params" | head -20

# Check model_zoo specifically
ls -la model_zoo/
```

## Recommended: Use Hugging Face Instead

Since conversion can be complex, I recommend:

1. **Use Hugging Face pre-converted models:**
   - Visit: https://huggingface.co/models?search=scrfd+onnx
   - Visit: https://huggingface.co/models?search=arcface+onnx
   - Download directly as ONNX

2. **Or use InsightFace Python package:**
   ```python
   import insightface
   app = insightface.app.FaceAnalysis()
   # Models will be auto-downloaded and can be exported
   ```

## Next Steps

1. Check what's in your downloaded InsightFace folder
2. Look for `.onnx` files first
3. If only `.pth` or `.params`, you'll need to convert
4. Or use Hugging Face for pre-converted ONNX models

Let me know what you find in your InsightFace folder!

