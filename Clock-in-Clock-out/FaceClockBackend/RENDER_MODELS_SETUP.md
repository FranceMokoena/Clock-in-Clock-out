# Render Deployment - Face Recognition Models Setup

## How Models Are Loaded on Render

The system uses a **two-tier approach** for loading face recognition models:

### 1. **Automatic Download During Build** (Primary)
- The `postinstall` script runs automatically after `npm install`
- Downloads models from GitHub to `models/face-api/` directory
- Models are stored in Render's filesystem (persists during deployment)

### 2. **CDN Fallback** (Secondary)
- If download fails, models load from CDN at runtime
- Multiple CDN sources tried in order:
  1. jsdelivr CDN (most reliable)
  2. unpkg CDN
  3. GitHub Raw (primary)
  4. GitHub Raw (alternative)

## Current Status

✅ **Your setup is correct!** The models will:
1. Try to download during `npm install` (postinstall script)
2. If download fails, automatically use CDN (which is working as shown in your local test)

## Verification

After deploying to Render, check the build logs for:
```
📦 Starting model download...
✅ All models downloaded successfully!
```

Or if download fails (which is OK):
```
⚠️ Models download failed, will try CDN during runtime
```

Then check runtime logs for:
```
✅ Face recognition models loaded successfully from jsdelivr CDN
```

## Why Models Are in .gitignore

The `models/face-api/` directory is in `.gitignore` because:
- Model files are large (~10-20 MB total)
- They're downloaded automatically during deployment
- CDN fallback ensures they're always available

## Manual Model Download (If Needed)

If you want to commit models to git (not recommended due to size):

1. Remove from `.gitignore`:
   ```bash
   # Comment out or remove this line:
   # models/face-api/
   ```

2. Download models locally:
   ```bash
   npm run download-models
   ```

3. Commit models:
   ```bash
   git add models/face-api/
   git commit -m "Add face recognition models"
   git push
   ```

**Note:** This will increase your repository size significantly.

## Recommended Approach

✅ **Keep current setup** - Models download automatically on Render via postinstall script, with CDN fallback. This is the most efficient approach.

