# Internship Success Clock-in/Clock-out System

## Quick Start

### Local Development
1. Install dependencies: `npm install`
2. Start Expo: `npm start`
3. Update IP in `config/api.js` if needed (for physical devices)

### Production Deployment
- **Backend API**: `https://clock-in-clock-out-oyia.onrender.com/api`
- **API Config**: Automatically uses production URL in production builds

## EAS Over-the-Air Updates

✅ **Updates are ENABLED** - Users receive updates automatically!

### Push an Update
```bash
# 1. Update version in app.json
# 2. Publish update
eas update --branch production --message "Update description"
```

## Building APK

```bash
# Production build
eas build --platform android --profile production

# Preview build
eas build --platform android --profile preview
```

## App Icon

### Current Configuration
- **File**: `assets/APP -ICON.png`
- **Location**: `FaceClockApp/assets/APP -ICON.png`
- **Size**: Must be 1024x1024 pixels (square)
- **Format**: PNG with transparency support
- **Usage**: Used for both iOS and Android app icons

### Requirements
- ✅ **Dimensions**: Exactly 1024x1024 pixels (square)
- ✅ **Format**: PNG
- ✅ **Background**: Transparent or solid color
- ✅ **File Size**: Optimized (recommended < 500KB)

### Verification
To verify your icon meets requirements:
1. Open `assets/APP -ICON.png` in an image editor
2. Check dimensions: Should be 1024x1024 pixels
3. Ensure it's square (width = height)
4. Save as PNG format

### Updating the Icon
1. Create or edit your icon (1024x1024 PNG)
2. Replace `assets/APP -ICON.png` with your new icon
3. Rebuild the app: `eas build --platform android --profile production`

### Icon Usage
- **iOS**: Used as app icon and in App Store
- **Android**: Used as adaptive icon foreground
- **Splash Screen**: Also used as splash screen image

## File Cleanup

Unnecessary files have been cleaned up. To clean again:
```bash
node cleanup-unnecessary-files.js
```

## Configuration

- **API URL**: `config/api.js`
- **Local IP**: Update `PHYSICAL_DEVICE_IP` in `config/api.js` for local development
- **Production**: Automatically uses Render URL in production builds

