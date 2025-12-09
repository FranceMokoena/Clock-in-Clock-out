# ⚠️ IMPORTANT: Restore cappp.jpg File

## File Missing
The file `assets/cappp.jpg` was accidentally deleted and needs to be restored.

## Where It's Used
- **MainMenu.js** - Graduation cap logo display
- **AdminDashboard.js** - Header logo in PDF exports

## How to Restore

### Option 1: From Backup
1. Check if you have a backup of the file
2. Copy `cappp.jpg` to `FaceClockApp/assets/cappp.jpg`

### Option 2: From Another Device/Computer
1. If you have the file on another device, copy it to:
   ```
   FaceClockApp/assets/cappp.jpg
   ```

### Option 3: Re-create the Image
1. Create or find a graduation cap image
2. Save it as `cappp.jpg` in the `assets` folder
3. Recommended size: 120x120 pixels or larger (square format)

### Option 4: Use Git (if file was ever committed)
```bash
# Check all commits for the file
git log --all --full-history -- "**/cappp.jpg"

# If found, restore from specific commit
git checkout <commit-hash> -- FaceClockApp/assets/cappp.jpg
```

## Temporary Solution
The code has been updated with a fallback that uses `APP -ICON.png` if `cappp.jpg` is missing. The app will work, but the graduation cap logo won't display correctly until you restore the file.

## After Restoring
1. Place the file at: `FaceClockApp/assets/cappp.jpg`
2. Restart your Expo development server
3. The app will automatically use the restored file

## File Requirements
- **Format**: JPG or JPEG
- **Size**: Any size (will be resized to 120x120 in the app)
- **Content**: Graduation cap image for the logo

