# Troubleshooting Guide

## Error: "Must specify 'expo-platform' header or 'platform' query parameter"

This error occurs when Expo Metro bundler can't detect the platform. Here are solutions:

### Solution 1: Use Platform-Specific Commands

Instead of just `npm start`, use platform-specific commands:

**For Android:**
```bash
npm run start:android
# or
npm run android
```

**For iOS:**
```bash
npm run start:ios
# or
npm run ios
```

**For Web:**
```bash
npm run start:web
# or
npm run web
```

### Solution 2: Clear Cache and Restart

```bash
# Clear Expo cache
npm run clear

# Or manually
npx expo start --clear
```

### Solution 3: Use Expo Go App

1. Install **Expo Go** app on your phone:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Scan the QR code shown in the terminal
3. The app will open in Expo Go with proper platform detection

### Solution 4: Specify Platform in URL

If accessing via browser, add `?platform=web` to the URL:
```
http://localhost:8081/?platform=web
```

### Solution 5: Check Network Connection

Ensure your device/emulator can reach the Metro bundler:
- **Android Emulator**: Uses `10.0.2.2` for localhost
- **iOS Simulator**: Uses `localhost`
- **Physical Device**: Must be on same WiFi network

### Solution 6: Restart Metro with Platform Flag

```bash
# Stop current Metro server (Ctrl+C)
# Then restart with explicit platform:
npx expo start --android
# or
npx expo start --ios
# or
npx expo start --web
```

## Common Issues

### Issue: App won't load after scanning QR code

**Solutions:**
1. Check if backend is running on port 5000
2. Verify `.env.local` has correct API URL
3. Check firewall settings
4. Ensure phone and computer are on same network

### Issue: "Network request failed"

**Solutions:**
1. Verify backend server is running: `http://localhost:5000/api/health`
2. Check API URL in `.env.local`
3. For Android emulator, use `http://10.0.2.2:5000/api`
4. For physical device, use your computer's IP address

### Issue: Metro bundler keeps restarting

**Solutions:**
1. Check for syntax errors in code
2. Clear cache: `npm run clear`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
4. Check Node.js version (should be v18+)

### Issue: "Cannot find module"

**Solutions:**
1. Run `npm install` in FaceClockApp directory
2. Clear cache: `npm run clear`
3. Restart Metro bundler

## Still Having Issues?

1. **Check Expo CLI version:**
   ```bash
   npx expo --version
   ```

2. **Update Expo CLI:**
   ```bash
   npm install -g expo-cli@latest
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   # Should be v18 or higher
   ```

4. **Verify all dependencies:**
   ```bash
   cd FaceClockApp
   npm install
   ```

5. **Check backend is running:**
   ```bash
   cd FaceClockBackend
   npm run dev
   ```

