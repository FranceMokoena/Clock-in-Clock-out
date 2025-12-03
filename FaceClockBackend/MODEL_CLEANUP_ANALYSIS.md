# Model Files Cleanup Analysis

## Summary
This document identifies which model files are **REQUIRED** for your app and which can be **SAFELY REMOVED**.

---

## ✅ REQUIRED FILES (DO NOT DELETE)

### ONNX Models (Primary - Currently Used)
Your app uses ONNX Runtime by default (`USE_ONNX=true` or not set).

**Location:** `FaceClockBackend/models/onnx/`

1. **Face Detection Model:**
   - `scrfd_500m_bnkps.onnx` ✅ **REQUIRED**
   - Used by: `utils/faceRecognitionONNX.js` (line 67)

2. **Face Recognition Model:**
   - `w600k_r50.onnx` ✅ **REQUIRED** (primary)
   - `glint360k_r50.onnx` ✅ **OPTIONAL** (fallback if w600k_r50.onnx not found)
   - Used by: `utils/faceRecognitionONNX.js` (lines 87, 90)

### Legacy face-api.js Models (Fallback - Only if USE_ONNX=false)
**Location:** `FaceClockBackend/models/face-api/`

These are only needed if you set `USE_ONNX=false` in your `.env` file.

1. **Detection Models:**
   - `ssd_mobilenetv1_model-weights_manifest.json` ✅
   - `ssd_mobilenetv1_model-shard1` ✅
   - `ssd_mobilenetv1_model-shard2` ✅
   - `tiny_face_detector_model-weights_manifest.json` ✅
   - `tiny_face_detector_model-shard1` ✅

2. **Landmark Model:**
   - `face_landmark_68_model-weights_manifest.json` ✅
   - `face_landmark_68_model-shard1` ✅

3. **Recognition Model:**
   - `face_recognition_model-weights_manifest.json` ✅
   - `face_recognition_model-shard1` ✅
   - `face_recognition_model-shard2` ✅

4. **Optional Models (not required but may be used):**
   - `mtcnn_model-weights_manifest.json` (optional)
   - `mtcnn_model-shard1` (optional)
   - `age_gender_model-weights_manifest.json` (optional)
   - `age_gender_model-shard1` (optional)
   - `face_expression_model-weights_manifest.json` (optional)
   - `face_expression_model-shard1` (optional)

---

## ❌ FILES TO REMOVE (Not Used by Your App)

### 1. Python Training/Evaluation Code (All can be removed)
**Location:** `FaceClockBackend/models/onnx/detection/` and `recognition/`

These are source code files for training models, not runtime models:
- **Entire `detection/` folder** - Contains:
  - `scrfd/` - Python training code
  - `retinaface/` - Python training code
  - `retinaface_anticov/` - Python training code
  - `blazeface_paddle/` - Python training code
  - `_datasets_/` - Dataset documentation

- **Entire `recognition/` folder** - Contains:
  - `arcface_mxnet/` - Python training code
  - `arcface_oneflow/` - Python training code
  - `arcface_paddle/` - Python training code
  - `arcface_torch/` - Python training code
  - `idmmd/` - Python training code
  - `partial_fc/` - Python training code
  - `subcenter_arcface/` - Python training code
  - `vpl/` - Python training code
  - `_evaluation_/` - Evaluation scripts
  - `_tools_/` - Tools and utilities
  - `_datasets_/` - Dataset documentation

### 2. Unused ONNX Model Files
**Location:** `FaceClockBackend/models/onnx/`

- `1k3d68.onnx` ❌ (not referenced in code)
- `2d106det.onnx` ❌ (not referenced in code)
- `det_10g.onnx` ❌ (not referenced in code)
- `genderage.onnx` ❌ (not referenced in code)

### 3. PaddlePaddle Model Files
**Location:** `FaceClockBackend/models/onnx/`

- `mobileface_v1.0_infer/` folder ❌ (entire folder)
  - `inference.pdiparams`
  - `inference.pdiparams.info`
  - `inference.pdmodel`

- `MobileFaceNet_128_v1.0_pretrained/` folder ❌ (entire folder)
  - `MobileFaceNet_128_v1.0_pretrained/MobileFaceNet_128_v1.0_pretrained.pdparams`
  - `MobileFaceNet_128_v1.0_pretrained/rank_0_softmax_weight_mom.pkl`
  - `MobileFaceNet_128_v1.0_pretrained/rank_0_softmax_weight.pkl`
- `MobileFaceNet_128_v1.0_pretrained.pdparams` ❌ (root level)

### 4. MXNet Model Files
**Location:** `FaceClockBackend/models/onnx/`

- `model-y1-test2/` folder ❌ (entire folder)
  - `log`
  - `model-0000.params`
  - `model-symbol.json`

- `rank_0_softmax_weight_mom.pkl` ❌ (root level)
- `rank_0_softmax_weight.pkl` ❌ (root level)

### 5. Python Utility Scripts (Not needed at runtime)
**Location:** `FaceClockBackend/models/onnx/`

- `fdensenet.py` ❌
- `fmnasnet.py` ❌
- `fmobilefacenet.py` ❌
- `fmobilenet.py` ❌
- `fresnet.py` ❌
- `gen_megaface.py` ❌
- `mask_renderer.py` ❌
- `memonger.py` ❌
- `memonger_v2.py` ❌
- `remove_noises.py` ❌
- `run.sh` ❌
- `symbol_utils.py` ❌
- `vargfacenet.py` ❌
- `face_align.h` ❌ (C++ header file, not used)

### 6. Empty/Unused Directories
- `buffalo_l/` folder ❌ (empty, not used)

### 7. Documentation Files (Optional - can keep for reference)
- `README.md` in `models/onnx/` (optional - can keep for reference)

---

## 📊 Size Impact Estimate

Removing the above files will likely free up **hundreds of MB to several GB** of disk space, as:
- Python training code: ~50-200 MB
- Unused model files: ~100-500 MB
- PaddlePaddle/MXNet models: ~50-200 MB
- Evaluation scripts: ~10-50 MB

**Total estimated space savings: 200 MB - 1 GB+**

---

## 🛠️ Cleanup Script

You can manually delete the folders/files listed above, or use this PowerShell script:

```powershell
# Navigate to models/onnx directory
cd FaceClockBackend\models\onnx

# Remove Python training code
Remove-Item -Recurse -Force detection
Remove-Item -Recurse -Force recognition

# Remove unused ONNX files
Remove-Item -Force 1k3d68.onnx
Remove-Item -Force 2d106det.onnx
Remove-Item -Force det_10g.onnx
Remove-Item -Force genderage.onnx

# Remove PaddlePaddle models
Remove-Item -Recurse -Force mobileface_v1.0_infer
Remove-Item -Recurse -Force MobileFaceNet_128_v1.0_pretrained
Remove-Item -Force MobileFaceNet_128_v1.0_pretrained.pdparams

# Remove MXNet models
Remove-Item -Recurse -Force model-y1-test2
Remove-Item -Force rank_0_softmax_weight_mom.pkl
Remove-Item -Force rank_0_softmax_weight.pkl

# Remove Python scripts
Remove-Item -Force fdensenet.py
Remove-Item -Force fmnasnet.py
Remove-Item -Force fmobilefacenet.py
Remove-Item -Force fmobilenet.py
Remove-Item -Force fresnet.py
Remove-Item -Force gen_megaface.py
Remove-Item -Force mask_renderer.py
Remove-Item -Force memonger.py
Remove-Item -Force memonger_v2.py
Remove-Item -Force remove_noises.py
Remove-Item -Force run.sh
Remove-Item -Force symbol_utils.py
Remove-Item -Force vargfacenet.py
Remove-Item -Force face_align.h

# Remove empty directories
Remove-Item -Recurse -Force buffalo_l
```

---

## ⚠️ Important Notes

1. **Backup First:** Before deleting, make sure you have a backup or can re-download models if needed.

2. **face-api.js Models:** If you're using ONNX (default), you can also remove the entire `models/face-api/` folder. However, keep it if you might need to fall back to face-api.js by setting `USE_ONNX=false`.

3. **Verification:** After cleanup, verify your app still works:
   ```bash
   npm start
   ```

4. **Re-downloading:** If you need to re-download ONNX models:
   ```bash
   npm run download-models
   ```

---

## ✅ Final Required Structure

After cleanup, your `models/` folder should look like:

```
models/
├── ClockLog.js
├── Staff.js
├── face-api/          (only if you use USE_ONNX=false)
│   └── [face-api model files]
└── onnx/
    ├── scrfd_500m_bnkps.onnx    ✅ REQUIRED
    ├── w600k_r50.onnx           ✅ REQUIRED
    └── glint360k_r50.onnx       ✅ OPTIONAL (fallback)
```

---

## 📝 Summary

**Keep:**
- ✅ `scrfd_500m_bnkps.onnx`
- ✅ `w600k_r50.onnx` (or `glint360k_r50.onnx`)
- ✅ `face-api/` folder (only if using legacy mode)

**Remove:**
- ❌ All Python training/evaluation code
- ❌ Unused ONNX files
- ❌ PaddlePaddle/MXNet model files
- ❌ Python utility scripts
- ❌ Empty directories

