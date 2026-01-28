const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const overrideDevMode = process.env.FORCE_DESKTOP_PROD === 'true';
const useDevServer = !overrideDevMode && isDev;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'app-icon.ico'),
    titleBarStyle: 'default',
    show: true, // Show immediately
    autoHideMenuBar: true, // Hide menu bar for cleaner look
  });

  // Load the app
  if (useDevServer) {
    // Set up console logging before loading
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levelNames = ['', 'INFO', 'WARNING', 'ERROR'];
      console.log(`[React ${levelNames[level] || 'LOG'}]`, message);
    });

    // Open DevTools after a short delay to ensure page is loading
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 2000);
    // Load the URL directly - wait-on already confirmed server is ready
    console.log('🚀 Loading React app from http://localhost:3000...');
    mainWindow.loadURL('http://localhost:3000');

    // Listen for page load events
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Page finished loading successfully');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('❌ Page failed to load:', errorCode, errorDescription);
      console.error('Failed URL:', validatedURL);

      // Show error page
      if (errorCode === -105 || errorCode === -106) {
        const errorHtml = `
          <html>
            <head><title>Connection Error</title></head>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h1 style="color: #ef4444;">⚠️ Cannot Connect to React Dev Server</h1>
              <p>Error Code: ${errorCode}</p>
              <p>Description: ${errorDescription}</p>
              <p>Please check that React dev server is running on port 3000</p>
            </body>
          </html>
        `;
        mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  // Focus on window immediately
  mainWindow.focus();
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for secure communication
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

