# Desktop App Setup Instructions

## Quick Start

### Option 1: Using the Startup Script (Windows)

1. **Double-click** `START_DESKTOP.bat` 
   - This will automatically install dependencies if needed
   - Then start the desktop application

### Option 2: Manual Start

1. **Install Dependencies** (first time only):
   ```bash
   cd FaceClockDesktop
   npm install
   ```

2. **Start the Desktop App**:
   ```bash
   npm run dev
   ```

## Important Notes

✅ **The desktop app will open FIRST** - The Electron window will appear before any web browser  
✅ **No browser will open** - The React dev server is configured to not open a browser  
✅ **Single instance** - Only one instance of the desktop app can run at a time  

## What Happens When You Run `npm run dev`

1. React development server starts on `http://localhost:3000` (no browser opens)
2. Electron waits for the React server to be ready
3. Electron desktop window opens and loads the app
4. Desktop app is now running!

## Configuration

Your `.env` file should contain:
```env
REACT_APP_API_URL=http://localhost:5000/api
BROWSER=none
```

The `BROWSER=none` setting prevents the React dev server from opening a browser window.

## Troubleshooting

### Desktop app doesn't open
- Make sure port 3000 is not in use by another application
- Check that React dev server started successfully
- Wait a few seconds for the server to initialize

### Can't connect to backend
- Verify your backend is running on `http://localhost:5000`
- Check the API URL in your `.env` file
- Ensure CORS is enabled on the backend

### Port already in use
- Close any other applications using port 3000
- Or change the React dev server port in `package.json`

