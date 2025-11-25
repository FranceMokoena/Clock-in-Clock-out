#!/usr/bin/env python3
"""
Python script to download ONNX models using InsightFace
This is a fallback if Node.js download script fails
"""
import os
import sys
import shutil
from pathlib import Path

try:
    import insightface
    print("✅ InsightFace library found")
except ImportError:
    print("❌ InsightFace not installed. Installing...")
    os.system("pip install insightface onnxruntime")
    import insightface

def download_models():
    """Download ONNX models using InsightFace"""
    models_dir = Path(__file__).parent / "models" / "onnx"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Target directory: {models_dir}")
    print("📦 Downloading models using InsightFace...")
    
    try:
        # Initialize InsightFace app (will auto-download buffalo_l models)
        app = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'], name='buffalo_l')
        
        # Models are downloaded to ~/.insightface/models/buffalo_l/
        home = Path.home()
        insightface_dir = home / ".insightface" / "models" / "buffalo_l"
        
        if not insightface_dir.exists():
            print("⚠️  InsightFace models directory not found")
            print(f"   Expected: {insightface_dir}")
            return False
        
        print(f"📁 Found InsightFace models at: {insightface_dir}")
        
        # Copy required ONNX files
        required_files = [
            'scrfd_10g_gnkps_fp32.onnx',
            'scrfd_500m_bnkps.onnx',
            'w600k_r50.onnx',
            'glint360k_r50.onnx'
        ]
        
        copied = 0
        for filename in required_files:
            src = insightface_dir / filename
            dst = models_dir / filename
            
            if src.exists():
                shutil.copy2(src, dst)
                size_mb = src.stat().st_size / (1024 * 1024)
                print(f"✅ Copied: {filename} ({size_mb:.2f} MB)")
                copied += 1
            else:
                print(f"⚠️  Not found: {filename}")
        
        if copied > 0:
            print(f"\n✅ Successfully copied {copied} model file(s)")
            return True
        else:
            print("\n❌ No models were copied")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = download_models()
    sys.exit(0 if success else 1)

