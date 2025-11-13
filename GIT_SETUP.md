# Git Setup Guide

This guide will help you push the Face Clock System to GitHub safely.

## ⚠️ Important Security Notes

**NEVER commit the following files:**
- `.env` files (contains MongoDB credentials and encryption keys)
- `node_modules/` (dependencies, too large)
- `.env.local` or any environment files with actual credentials
- Face recognition models (`models/face-api/`)

## ✅ Pre-Push Checklist

Before pushing to GitHub:

- [ ] `.env` file is in `.gitignore` (already done)
- [ ] All `.env` files are ignored
- [ ] `node_modules/` is ignored
- [ ] No sensitive credentials in code
- [ ] `.env.example` files exist for reference

## 🚀 Git Commands

### Initial Setup (if starting fresh)

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Face Clock System"

# Add remote repository
git remote add origin https://github.com/yourusername/face-clock-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Normal Workflow

```bash
# Check status
git status

# Add files
git add .

# Commit with message
git commit -m "Your commit message here"

# Push to GitHub
git push origin main
```

## 📁 Files That WILL Be Committed

✅ Safe to commit:
- Source code files (`.js`, `.jsx`, `.json`)
- Configuration files (`package.json`, `app.json`)
- Documentation (`.md` files)
- `.gitignore` files
- `.env.example` files

## 🔒 Files That Will NOT Be Committed

❌ Ignored by `.gitignore`:
- `.env` (environment variables with credentials)
- `node_modules/` (dependencies)
- `.expo/` (Expo build files)
- Build outputs (`dist/`, `build/`)
- Log files (`*.log`)
- OS files (`.DS_Store`, `Thumbs.db`)
- IDE files (`.vscode/`, `.idea/`)
- Face recognition models (`models/face-api/`)

## 🔍 Verify Before Pushing

Check what will be committed:

```bash
git status
git diff --cached  # See what's staged
```

## 🛡️ Verify .env is Ignored

Check that `.env` is properly ignored:

```bash
git check-ignore -v .env
```

Should output: `.gitignore:2:.env` or similar.

## 📝 After Pushing

1. **Set up Render deployment**:
   - Add environment variables in Render dashboard
   - Use values from your `.env` file

2. **Update frontend API config**:
   - Edit `FaceClockApp/config/api.js`
   - Replace with your Render URL

3. **Documentation**:
   - README.md is already updated
   - Deployment guide is in `FaceClockBackend/DEPLOYMENT.md`

## ⚠️ If You Accidentally Committed .env

If you already committed `.env` by mistake:

```bash
# Remove from git history (be careful!)
git rm --cached FaceClockBackend/.env
git commit -m "Remove .env file from git"

# If already pushed, you may need to:
# 1. Change your MongoDB password
# 2. Generate a new encryption key
# 3. Update Render environment variables
```

## 🔐 Security Best Practices

1. **Never commit credentials**
2. **Use `.env.example`** as a template
3. **Set environment variables** in Render dashboard (not in code)
4. **Rotate credentials** if accidentally exposed
5. **Review commits** before pushing

## 📦 Repository Structure

Your repository should look like:

```
face-clock-system/
├── .gitignore              # Root gitignore
├── README.md               # Project documentation
├── FaceClockApp/          # Frontend
│   ├── .gitignore
│   ├── package.json
│   ├── screens/
│   ├── config/
│   └── ...
├── FaceClockBackend/      # Backend
│   ├── .gitignore
│   ├── .env.example       # Template for env vars
│   ├── package.json
│   ├── server.js
│   └── ...
└── ...
```

## ✅ Ready to Push!

Your `.gitignore` files are configured. You're safe to push to GitHub!

**Remember**: Environment variables must be set in Render dashboard, not committed to git.

