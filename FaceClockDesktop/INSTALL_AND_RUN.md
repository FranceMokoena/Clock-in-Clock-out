# Installation and Running Instructions

## Step 1: Install Dependencies

Open PowerShell or Command Prompt in the `FaceClockDesktop` folder and run:

```bash
npm install
```

This will install all required packages including:
- Electron
- React and React Scripts
- All other dependencies

## Step 2: Configure API URL

Make sure your `.env` file contains:
```env
REACT_APP_API_URL=http://localhost:5000/api
BROWSER=none
```

The `BROWSER=none` prevents the React dev server from opening a browser window.

## Step 3: Start the Desktop App

### Option A: Using the Batch File (Easiest)
Double-click `START_DESKTOP.bat`

### Option B: Using Command Line
```bash
npm run dev
```

## What Happens

1. ✅ React dev server starts on `http://localhost:3000` (NO browser opens)
2. ✅ Electron waits for React server to be ready
3. ✅ **Desktop application window opens FIRST**
4. ✅ Desktop app loads and you can login

## Important

- **Desktop app opens FIRST** - No browser window will open
- **Only one instance** - If you try to open another, it will focus the existing window
- **Backend must be running** - Make sure your FaceClockBackend server is running on port 5000

## Troubleshooting

### "concurrently is not recognized"
Run `npm install` first to install all dependencies.

### Desktop app shows "Waiting for React dev server"
- Wait a few seconds for React to start
- Check that port 3000 is not in use
- Look at the terminal for any React errors

### Can't login
- Verify backend is running: `http://localhost:5000`
- Check your `.env` file has the correct API URL
- Ensure you're using Admin or Host Company credentials

