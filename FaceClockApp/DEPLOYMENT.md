# Deployment Guide

## Production URL
- **Backend API**: `https://clock-in-clock-out-oyia.onrender.com/api`
- **Frontend**: Configured in `config/api.js`

## EAS Over-the-Air Updates

### Updates are ENABLED ✅
- **Status**: Enabled in `app.json`
- **Check Mode**: `ON_LOAD` (checks for updates when app loads)
- **Runtime Version**: Uses `appVersion` policy

### How to Push Updates

1. **Make your changes** to the code
2. **Update version** in `app.json`:
   ```json
   "version": "1.0.1"  // Increment this
   ```
3. **Publish update**:
   ```bash
   eas update --branch production --message "Your update message"
   ```
4. **Users will receive updates automatically** on next app launch

### Update Channels
- **production**: Production builds
- **preview**: Preview/test builds
- **development**: Development builds

## Building APK with EAS

### Production Build
```bash
eas build --platform android --profile production
```

### Preview Build
```bash
eas build --platform android --profile preview
```

### Build Optimization
- `.easignore` file excludes unnecessary files from builds
- Only relevant source files are included
- Documentation, APK files, and unused assets are excluded

## App Icon Requirements

### Current Icon
- **File**: `assets/APP -ICON.png`
- **Required Size**: 1024x1024 pixels (square)
- **Format**: PNG with transparency

### To Update Icon
1. Ensure icon is exactly 1024x1024 pixels
2. Save as `assets/APP -ICON.png`
3. Rebuild app: `eas build --platform android --profile production`

## Local Development

### Local API URL
- **Default**: `http://192.168.0.104:5000/api` (update IP in `config/api.js`)
- **Override**: Set `EXPO_PUBLIC_API_URL` environment variable

### Force Production API
Set environment variable:
```bash
EXPO_PUBLIC_API_ENV=production
```

## File Cleanup

Run cleanup script to remove unnecessary files:
```bash
node cleanup-unnecessary-files.js
```

This removes:
- Documentation files (*.md)
- Build artifacts (*.apk)
- Unused assets
- Example files
- Development scripts

## Build Size Optimization

### Excluded from Builds (via .easignore)
- All markdown documentation
- APK build artifacts
- Unused image assets
- Example configuration files
- Development scripts
- Test files

### Included in Builds
- Source code (`screens/`, `components/`, `utils/`, `config/`)
- Required assets (icon, splash screen)
- Dependencies (from `package.json`)

