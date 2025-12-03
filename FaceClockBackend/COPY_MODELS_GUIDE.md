# Guide: Copying Models from InsightFace Repository

## Where to Find Models in InsightFace Repo

Based on the [InsightFace repository structure](https://github.com/deepinsight/insightface), check these locations:

### Primary Location: `model_zoo/`

The models are most likely in:
```
insightface/model_zoo/
```

This folder typically contains:
- Detection models (SCRFD, RetinaFace)
- Recognition models (ArcFace variants)
- Alignment models

### Alternative Locations:

1. **Python Package Models:**
   ```
   insightface/python-package/insightface/model_zoo/
   ```

2. **Detection Folder:**
   ```
   insightface/detection/
   ```

3. **Recognition Folder:**
   ```
   insightface/recognition/
   ```

## ⚠️ Important: Models Are NOT Directly ONNX

**Critical**: InsightFace provides models in **PyTorch (.pth)** or **MXNet (.params)** format, **NOT directly as ONNX files**.

You'll need to either:
1. Find pre-converted ONNX models (rare in the repo)
2. Convert PyTorch/MXNet models to ONNX
3. Use InsightFace Python package to auto-download and convert

## Step-by-Step Instructions

### Step 1: Check What You Have

Navigate to your downloaded InsightFace folder and run:

```bash
# Windows PowerShell
Get-ChildItem -Recurse -Filter "*.onnx" | Select-Object FullName
Get-ChildItem -Recurse -Filter "*.pth" | Select-Object FullName
Get-ChildItem -Recurse -Filter "*.params" | Select-Object FullName

# Or check model_zoo specifically
ls model_zoo/
```

### Step 2: Look for These Specific Models

You need:

1. **SCRFD Detection Model:**
   - Look for: `scrfd_500m_bnkps.onnx` OR `scrfd_500m_bnkps.pth`
   - Check: `model_zoo/detection/` or `detection/`

2. **ArcFace Recognition Model:**
   - Look for: `w600k_r50.onnx` OR `glint360k_r50.onnx` OR `.pth` versions
   - Check: `model_zoo/recognition/` or `recognition/`

### Step 3: Copy Models to Your Project

Once you find the models:

#### If you found `.onnx` files (rare but possible):

```bash
# Create the directory
mkdir FaceClockBackend\models\onnx

# Copy SCRFD model
copy "insightface\model_zoo\detection\scrfd_500m_bnkps.onnx" "FaceClockBackend\models\onnx\"

# Copy ArcFace model
copy "insightface\model_zoo\recognition\w600k_r50.onnx" "FaceClockBackend\models\onnx\"
```

#### If you only have `.pth` files (most likely):

You'll need to convert them. See conversion section below.

## Option A: Use InsightFace Python Package (Easiest)

Instead of manually copying, use InsightFace's Python package which handles everything:

```bash
# Install InsightFace
pip install insightface onnxruntime

# Create a conversion script
```

Create `convert_models.py`:

```python
import insightface
import onnxruntime
import os

# InsightFace will auto-download models and can export to ONNX
app = insightface.app.FaceAnalysis(name='buffalo_l')  # or 'buffalo_s', 'buffalo_m'
app.prepare(ctx_id=0, det_size=(640, 640))

# The models are now loaded - you can access them
# Check InsightFace documentation for ONNX export methods
```

## Option B: Manual Conversion from PyTorch

If you have `.pth` files, create `convert_to_onnx.py`:

```python
import torch
import torch.onnx
from insightface import get_model

# Load SCRFD model
detector = get_model('scrfd_500m_bnkps')
detector.prepare(ctx_id=0)

# Convert to ONNX
# Note: This is a simplified example - actual conversion may vary
dummy_input = torch.randn(1, 3, 640, 640)
torch.onnx.export(
    detector.model,
    dummy_input,
    'scrfd_500m_bnkps.onnx',
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}}
)
```

## Option C: Use Pre-converted Models from Hugging Face (Recommended)

Since conversion can be complex, I recommend downloading pre-converted ONNX models:

1. **SCRFD Model:**
   - Visit: https://huggingface.co/deepinsight/scrfd-500m
   - Download: `scrfd_500m_bnkps.onnx`
   - Save to: `FaceClockBackend/models/onnx/`

2. **ArcFace Model:**
   - Visit: https://huggingface.co/deepinsight/arcface-r50
   - Download: `w600k_r50.onnx`
   - Save to: `FaceClockBackend/models/onnx/`

## Quick Check Script

Create `check_models.js` to verify what you have:

```javascript
const fs = require('fs');
const path = require('path');

const insightfacePath = process.argv[2] || './insightface'; // Path to your InsightFace folder

function findModels(dir, extensions = ['.onnx', '.pth', '.params']) {
  const results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results.push(...findModels(fullPath, extensions));
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

console.log('Searching for models in:', insightfacePath);
const models = findModels(insightfacePath);
console.log('\nFound models:');
models.forEach(m => console.log('  -', m));
```

Run: `node check_models.js path/to/insightface`

## Recommended Approach

**For fastest setup, use Hugging Face pre-converted models:**

1. Download from Hugging Face (links above)
2. Place in `FaceClockBackend/models/onnx/`
3. Done! No conversion needed.

**If you want to use the repo models:**

1. Check `model_zoo/` folder
2. Look for `.pth` or `.params` files
3. Convert using InsightFace Python tools
4. Or use the Python package which handles it automatically

## Next Steps

1. Check your InsightFace folder structure
2. Look for `model_zoo/` directory
3. Report back what file formats you find (.onnx, .pth, .params)
4. I'll help you with the next steps based on what you have!

