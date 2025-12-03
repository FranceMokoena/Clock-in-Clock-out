#!/bin/bash
# Script to commit ONNX models to git for Render deployment

echo "🔍 Checking for ONNX model files..."

cd "$(dirname "$0")"

# Check if models directory exists
if [ ! -d "models/onnx" ]; then
    echo "❌ Error: models/onnx directory not found"
    exit 1
fi

# Check for required models
REQUIRED_MODELS=("scrfd_10g_gnkps_fp32.onnx" "scrfd_500m_bnkps.onnx" "w600k_r50.onnx")
FOUND_MODELS=()

for model in "${REQUIRED_MODELS[@]}"; do
    if [ -f "models/onnx/$model" ]; then
        echo "✅ Found: $model"
        FOUND_MODELS+=("models/onnx/$model")
    else
        echo "⚠️  Missing: $model"
    fi
done

if [ ${#FOUND_MODELS[@]} -eq 0 ]; then
    echo "❌ No required models found!"
    echo "💡 Run: npm run download-models"
    exit 1
fi

echo ""
echo "📦 Adding models to git..."

# Force add models (gitignore will be overridden)
for model in "${FOUND_MODELS[@]}"; do
    git add -f "$model"
    echo "   ✅ Added: $model"
done

echo ""
echo "📝 Committing..."
git commit -m "Add ONNX models for Render deployment" || {
    echo "⚠️  Nothing to commit (models may already be committed)"
}

echo ""
echo "✅ Done! Now push to GitHub:"
echo "   git push"
echo ""
echo "🌐 After pushing, Render will automatically redeploy with models included."

