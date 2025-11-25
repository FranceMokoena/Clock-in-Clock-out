# 📥 ONNX Model Download Guide

## Required Models

You need these 4 ONNX models for face recognition:

1. **scrfd_10g_gnkps_fp32.onnx** - Face detection (preferred, better accuracy)
2. **scrfd_500m_bnkps.onnx** - Face detection (fallback, smaller)
3. **w600k_r50.onnx** - Face recognition (primary)
4. **glint360k_r50.onnx** - Face recognition (alternative, more accurate)

## 🚀 Quick Download (Recommended)

### Option 1: Use the Download Script

```bash
cd FaceClockBackend
npm run download-models
```

This will automatically download all models from reliable sources.

### Option 2: Manual Download Links

#### **scrfd_10g_gnkps_fp32.onnx** (Face Detection - Preferred)
- **Direct Download**: https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_10g_gnkps_fp32.onnx
- **Alternative**: Use InsightFace Python package (auto-downloads)
- **Size**: ~45-50 MB

#### **scrfd_500m_bnkps.onnx** (Face Detection - Fallback)
- **Direct Download**: https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_500m_bnkps.onnx
- **jsdelivr CDN**: https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/model_zoo/buffalo_l/scrfd_500m_bnkps.onnx
- **Size**: ~10-15 MB

#### **w600k_r50.onnx** (Face Recognition - Primary)
- **Direct Download**: https://github.com/deepinsight/insightface/releases/download/v0.7/w600k_r50.onnx
- **jsdelivr CDN**: https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/model_zoo/buffalo_l/w600k_r50.onnx
- **Size**: ~166 MB

#### **glint360k_r50.onnx** (Face Recognition - Alternative)
- **Direct Download**: https://github.com/deepinsight/insightface/releases/download/v0.7/glint360k_r50.onnx
- **jsdelivr CDN**: https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/model_zoo/buffalo_l/glint360k_r50.onnx
- **Size**: ~166 MB

## 📋 Manual Download Steps

### Step 1: Create Models Directory
```bash
cd FaceClockBackend
mkdir -p models/onnx
```

### Step 2: Download Each Model

**Windows PowerShell:**
```powershell
cd models/onnx

# Download scrfd_10g_gnkps_fp32.onnx
Invoke-WebRequest -Uri "https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_10g_gnkps_fp32.onnx" -OutFile "scrfd_10g_gnkps_fp32.onnx"

# Download scrfd_500m_bnkps.onnx
Invoke-WebRequest -Uri "https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_500m_bnkps.onnx" -OutFile "scrfd_500m_bnkps.onnx"

# Download w600k_r50.onnx
Invoke-WebRequest -Uri "https://github.com/deepinsight/insightface/releases/download/v0.7/w600k_r50.onnx" -OutFile "w600k_r50.onnx"

# Download glint360k_r50.onnx (optional, alternative to w600k)
Invoke-WebRequest -Uri "https://github.com/deepinsight/insightface/releases/download/v0.7/glint360k_r50.onnx" -OutFile "glint360k_r50.onnx"
```

**Linux/Mac:**
```bash
cd models/onnx

# Download scrfd_10g_gnkps_fp32.onnx
wget https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_10g_gnkps_fp32.onnx

# Download scrfd_500m_bnkps.onnx
wget https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_500m_bnkps.onnx

# Download w600k_r50.onnx
wget https://github.com/deepinsight/insightface/releases/download/v0.7/w600k_r50.onnx

# Download glint360k_r50.onnx (optional)
wget https://github.com/deepinsight/insightface/releases/download/v0.7/glint360k_r50.onnx
```

### Step 3: Verify Downloads

```bash
# Check file sizes (should be > 1 MB each)
ls -lh models/onnx/*.onnx

# Windows PowerShell
Get-ChildItem models/onnx/*.onnx | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

Expected sizes:
- scrfd_10g_gnkps_fp32.onnx: ~45-50 MB
- scrfd_500m_bnkps.onnx: ~10-15 MB
- w600k_r50.onnx: ~166 MB
- glint360k_r50.onnx: ~166 MB

## 🔄 Alternative: Using InsightFace Python Package

If direct downloads fail, use InsightFace Python package:

```bash
# Install Python and InsightFace
pip install insightface onnxruntime

# Python script to download models
python -c "
import insightface
app = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
# Models will be auto-downloaded to ~/.insightface/models/
# Then copy them to your models/onnx directory
"
```

Models will be downloaded to `~/.insightface/models/buffalo_l/` (Linux/Mac) or `C:\Users\YourName\.insightface\models\buffalo_l\` (Windows).

## 🌐 Alternative Sources

### Hugging Face (Requires Account)
1. Visit: https://huggingface.co/deepinsight/scrfd-500m
2. Visit: https://huggingface.co/deepinsight/arcface-r50
3. Download files manually (may require authentication)

### GitHub Releases
- **Main Releases**: https://github.com/deepinsight/insightface/releases
- Look for "buffalo_l" model package or individual ONNX files

### Model Zoo (Deprecated but may have mirrors)
- Check community mirrors or archives

## ✅ Verification

After downloading, verify models are in place:

```bash
cd FaceClockBackend
node -e "
const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, 'models', 'onnx');
const required = ['scrfd_10g_gnkps_fp32.onnx', 'scrfd_500m_bnkps.onnx', 'w600k_r50.onnx'];
required.forEach(m => {
  const p = path.join(modelsDir, m);
  if (fs.existsSync(p)) {
    const size = (fs.statSync(p).size / 1024 / 1024).toFixed(2);
    console.log('✅', m, '-', size, 'MB');
  } else {
    console.log('❌', m, '- MISSING');
  }
});
"
```

## 🚨 Troubleshooting

### Download Fails?
1. **Check internet connection**
2. **Try alternative URLs** (jsdelivr CDN links above)
3. **Use browser download** - Right-click links and "Save As"
4. **Check GitHub releases page** - https://github.com/deepinsight/insightface/releases

### File Size Too Small?
- Re-download the file (may have been corrupted)
- Check file size matches expected sizes above

### 404 Not Found?
- GitHub releases may have moved
- Try jsdelivr CDN links instead
- Use InsightFace Python package method

## 📝 After Download

Once models are downloaded:

1. **Verify they're in the right place**: `FaceClockBackend/models/onnx/`
2. **Test the server**: `npm start` (should load models successfully)
3. **Commit to git** (if using Git LFS): `git add models/onnx/*.onnx`

---

**Need help?** Check `ALTERNATIVE_MODEL_SOURCES.md` for more options.

