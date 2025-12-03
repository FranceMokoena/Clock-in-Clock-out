# Alternative ONNX Model Sources

## Problem

The InsightFace GitHub releases may not have direct ONNX model downloads. Here are alternative ways to get the models:

## Option 1: Use Pre-converted Models from Hugging Face

Hugging Face often has pre-converted ONNX models:

1. **SCRFD Detection Model:**
   - Visit: https://huggingface.co/models?search=scrfd+onnx
   - Or: https://huggingface.co/deepinsight/scrfd-500m

2. **ArcFace Recognition Model:**
   - Visit: https://huggingface.co/models?search=arcface+onnx
   - Or: https://huggingface.co/deepinsight/arcface-r50

## Option 2: Convert Models Using InsightFace Python

If you have Python installed:

```bash
# Install InsightFace
pip install insightface onnxruntime

# Convert SCRFD model
python -c "
import insightface
app = insightface.app.FaceAnalysis()
# Models will be downloaded and can be converted
"

# Or use InsightFace's conversion tools
```

## Option 3: Use Alternative ONNX Models

### For Face Detection:
- **UltraFace**: https://github.com/onnx/models/tree/main/vision/body_analysis/ultraface
- **RetinaFace**: Pre-converted versions available

### For Face Recognition:
- **FaceNet ONNX**: Various pre-converted versions
- **MobileFaceNet**: Lighter alternative

## Option 4: Manual Download and Conversion

1. Download PyTorch/MXNet models from InsightFace
2. Use ONNX conversion tools:
   ```python
   import torch
   import onnx
   
   # Load PyTorch model
   model = torch.load('model.pth')
   
   # Convert to ONNX
   torch.onnx.export(model, dummy_input, 'model.onnx')
   ```

## Option 5: Use ONNX Model Zoo

Check the ONNX Model Zoo for pre-converted models:
- https://github.com/onnx/models

## Quick Fix: Use Working Model URLs

Update `download-onnx-models.js` with working URLs from:
- Hugging Face (most reliable)
- ONNX Model Zoo
- Community repositories

## Recommended: Use Hugging Face

Hugging Face is the most reliable source for pre-converted ONNX models. Update the download script to use Hugging Face URLs.

