const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const overrideDevMode = process.env.FORCE_DESKTOP_PROD === 'true';
const useDevServer = !overrideDevMode && isDev;
const updateFeedUrl =
  process.env.DESKTOP_UPDATE_URL ||
  'https://clock-in-app.duckdns.org/desktop-updates';
let autoUpdaterConfigured = false;

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

function configureAutoUpdates() {
  if (autoUpdaterConfigured || useDevServer) {
    return;
  }

  console.info('Auto-update: using feed URL', updateFeedUrl);
  autoUpdaterConfigured = true;
  autoUpdater.autoDownload = true;
  autoUpdater.setFeedURL({ provider: 'generic', url: updateFeedUrl });

  autoUpdater.on('checking-for-update', () => {
    console.info('Auto-update: checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.info('Auto-update: update available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.info('Auto-update: no updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent || 0);
    console.info(`Auto-update: downloading (${percent}%)`);
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error);
  });

  autoUpdater.on('update-downloaded', async () => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Face-clock update ready',
      message: 'A new Face-clock Desktop version has been downloaded.',
      detail: 'Restart now to install the latest improvements.',
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdates();
}

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
      webSecurity: true,
    },
    icon: path.join(__dirname, 'assets', 'app-icon.ico'),
    title: 'Face-clock Desktop',
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
  configureAutoUpdates();

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
