# 🔧 Fix Render Build Error

## ❌ Current Error
```
Unknown command: "build"
```

## ✅ Solution

Render is trying to run `npm build` but your package.json doesn't have a build script.

### Fix in Render Dashboard:

1. Go to your Render service dashboard
2. Click **"Settings"** tab (or "Edit" button)
3. Find **"Build Command"** field
4. Change it from `npm build` to:
   ```
   npm install
   ```
5. Make sure **"Start Command"** is:
   ```
   npm start
   ```
6. Click **"Save Changes"**
7. Render will automatically redeploy

## 📋 Correct Settings

| Field | Correct Value |
|-------|---------------|
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Root Directory** | `FaceClockBackend` |

## ⚡ Quick Fix Steps

1. Open Render Dashboard
2. Go to your service
3. Click "Settings" or "Edit"
4. Update Build Command: `npm install`
5. Save
6. Wait for redeploy (2-3 minutes)

## ✅ After Fix

Once fixed, the build should:
1. ✅ Run `npm install` (installs dependencies)
2. ✅ Run `npm start` (starts server)
3. ✅ Show "Live" status

## 🎯 Why This Happened

- Render defaulted to `npm build` or `yarn`
- Your project uses `npm install` + `npm start`
- No build step needed (Node.js runs directly)

---

**After fixing, your service should deploy successfully!** 🚀


