# 🚀 Render Deployment Without Git LFS

## Problem
GitHub's Git LFS free tier has limits (1 GB storage, 1 GB bandwidth/month). Large ONNX models exceed this limit.

## ✅ Solution: Download Models During Render Build

Instead of committing models to git, we'll download them during Render's build process.

## How It Works

1. **Models are NOT in git** (excluded by `.gitignore`)
2. **Render build runs**: `npm install && npm run postinstall`
3. **postinstall script** runs `download-onnx-models.js`
4. **Models download** from reliable sources during build
5. **Models stored** in Render's filesystem (persists for deployment)

## ✅ Setup Complete

Your `render.yaml` already has:
```yaml
buildCommand: npm install && npm run postinstall
```

The `postinstall` script in `package.json` runs:
```json
"postinstall": "node download-onnx-models.js"
```

This means models will automatically download during Render build!

## 📋 What You Need to Do

### Step 1: Remove Models from Git (If Already Committed)

```bash
cd FaceClockBackend

# Remove models from git tracking
git rm --cached models/onnx/*.onnx

# Update .gitignore (already done)
# Models are now excluded from git

# Commit the removal
git add .gitignore .gitattributes
git commit -m "Remove ONNX models from git - will download during Render build"
```

### Step 2: Update Download Script URLs

The `download-onnx-models.js` script has been updated with working URLs. If downloads fail, the script will:
- Try multiple sources
- Exit gracefully (won't fail the build)
- Server will attempt to download at runtime if needed

### Step 3: Push to GitHub

```bash
git push origin main
```

**No LFS errors!** Models aren't in git anymore.

### Step 4: Deploy on Render

Render will:
1. Clone your repo (without models)
2. Run `npm install`
3. Run `npm run postinstall` → downloads models
4. Start server with models available

## 🔍 Verify Models Download During Build

After deploying, check Render logs for:
```
📦 Starting ONNX model download...
✅ Downloaded: scrfd_10g_gnkps_fp32.onnx
✅ Downloaded: w600k_r50.onnx
✅ All ONNX models downloaded successfully!
```

## 🚨 If Downloads Fail During Build

The download script exits with code 0 (success) even if some models fail. This prevents build failures.

If models don't download:
1. Check Render build logs for download errors
2. Update URLs in `download-onnx-models.js` if sources change
3. Server will attempt runtime download as fallback

## 📝 Alternative: Use Cloud Storage

If download URLs become unreliable, consider:
- **AWS S3** - Host models in S3 bucket
- **Google Cloud Storage** - Similar to S3
- **Azure Blob Storage** - Microsoft's option
- **Direct URLs** - Host models on your own server/CDN

Then update `download-onnx-models.js` to use your cloud storage URLs.

## ✅ Benefits of This Approach

1. ✅ **No Git LFS limits** - Models not in git
2. ✅ **Smaller repo** - Faster clones
3. ✅ **Automatic** - Models download during build
4. ✅ **Flexible** - Easy to update model URLs
5. ✅ **Free** - No LFS storage costs

## 🎯 Summary

- ✅ Models excluded from git (`.gitignore`)
- ✅ `.gitattributes` updated (no LFS tracking)
- ✅ `render.yaml` configured (downloads during build)
- ✅ `download-onnx-models.js` ready (multiple sources)
- ⏳ **Remove models from git and push**

---

**After removing models from git, Render deployment will work! 🎉**

