const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// Prevent Windows file lock conflicts on Chromium disk & GPU cache
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let mainWindow = null;
let serverProcess = null;
let tray = null;
let isQuitting = false;
let backendPort = 9900;

// 1. Start backend Express server inside a child process
function startServer(port) {
  const serverPath = path.join(__dirname, 'server.js');
  console.log(`[AiroShare Electron] Launching Express server child process: ${serverPath}`);
  
  serverProcess = fork(serverPath, [], {
    env: { 
      ...process.env, 
      PORT: port.toString(),
      NODE_ENV: app.isPackaged ? 'production' : 'development',
      APP_PATH: app.getAppPath(),
      USER_DATA_PATH: app.getPath('userData')
    },
    silent: false // pipes stdout/stderr to Electron console
  });

  serverProcess.on('message', (msg) => {
    if (msg && msg.type === 'PORT_INITIALIZED' && msg.port) {
      console.log(`[AiroShare Electron] Active server port confirmed: ${msg.port}`);
      backendPort = msg.port;
    }
  });

  serverProcess.on('error', (err) => {
    console.error('[AiroShare Backend Error]', err);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`[AiroShare Backend Exit] Code: ${code}, Signal: ${signal}`);
  });
}

// 2. Initialize System Tray Icon
function createTray() {
  const iconPath = path.join(__dirname, 'public', 'AiroShare.png');
  
  // Create default tray icon
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open AiroShare', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Exit AiroShare', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('AiroShare Media & File Server');
  tray.setContextMenu(contextMenu);

  // Show window on double click
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Helper to find a free TCP port dynamically starting from a preferred port
function findFreePort(startPort) {
  const net = require('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

// Helper to wait for a port to be listening before executing a callback
function waitForPort(port, host, callback) {
  const net = require('net');
  const socket = new net.Socket();
  socket.setTimeout(400);
  
  socket.connect(port, host, () => {
    socket.destroy();
    callback();
  });
  
  const retry = () => {
    socket.destroy();
    setTimeout(() => waitForPort(port, host, callback), 500);
  };
  
  socket.on('error', retry);
  socket.on('timeout', retry);
}

// Helper to wait for Express server HTTP API to be 200 OK ready before loading dashboard
function waitForExpressReady(getPortFn, callback) {
  const http = require('http');
  const startTime = Date.now();
  let done = false;

  const check = () => {
    if (done) return;
    const currentPort = typeof getPortFn === 'function' ? getPortFn() : getPortFn;
    const req = http.get(`http://127.0.0.1:${currentPort}/api/network/info`, (res) => {
      if (done) return;
      if (res.statusCode === 200) {
        done = true;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1000 - elapsed);
        setTimeout(() => callback(currentPort), remaining);
      } else {
        setTimeout(check, 250);
      }
    });
    req.on('error', () => {
      if (!done) setTimeout(check, 250);
    });
    req.setTimeout(400, () => {
      req.destroy();
      if (!done) setTimeout(check, 250);
    });
  };

  check();
}

// 3. Create Main Application Window
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AiroShare - High Performance Media Server',
    icon: path.join(__dirname, 'public', 'AiroShare.png'),
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove default File / Edit / View / Window / Help menu bar
  mainWindow.removeMenu();

  // Forward browser console logs and errors directly to terminal output
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Browser Window] ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron Window Load Error] Code ${errorCode}: ${errorDescription} for ${validatedURL}`);
  });

  // Load loading screen immediately to show visual progress while server boots
  const loadingPath = app.isPackaged 
    ? path.join(__dirname, 'dist', 'loading.html')
    : path.join(__dirname, 'public', 'loading.html');
  mainWindow.loadFile(loadingPath);

  const getActivePort = () => backendPort || port;
  console.log(`[AiroShare Electron] Waiting for local Express server on port ${getActivePort()} to boot...`);
  
  waitForExpressReady(getActivePort, (activePort) => {
    console.log(`[AiroShare Electron] Express server started. Loading dashboard: http://localhost:${activePort}`);
    if (mainWindow) mainWindow.loadURL(`http://localhost:${activePort}`);
  });

  // Handle window close interception (Minimize to Tray)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Notify user via tray balloon (optional, first time only)
      if (tray && process.platform === 'win32') {
        tray.displayBalloon({
          title: 'AiroShare Active',
          content: 'AiroShare is still running in the background from your system tray.',
          iconType: 'info'
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 4. App Lifecycle Events
app.whenReady().then(async () => {
  // Set Application User Model ID for correct taskbar grouping and Windows notification titles
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.airoshare.app');
  }
  
  // Find a free TCP port starting from 9900 to avoid common local port conflicts
  backendPort = await findFreePort(9900);
  console.log(`[AiroShare Electron] Using dynamically allocated port: ${backendPort}`);
  
  startServer(backendPort);
  
  // Wait a moment for server socket to bind before loading window
  setTimeout(() => {
    createTray();
    createWindow(backendPort);
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(backendPort);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray, do not quit
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess) {
    console.log('[AiroShare Electron] Killing backend Express child process...');
    serverProcess.kill('SIGTERM');
  }
});

// 5. IPC Request Handlers (Bridge to Native OS Features)

// Native Directory Picker Dialogue
ipcMain.handle('dialog:selectFolder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Shared Directory - AiroShare'
  });
  return result.canceled ? null : result.filePaths[0];
});

// Launch on Boot Registry Setting
ipcMain.handle('settings:getAutostart', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('settings:setAutostart', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: process.execPath,
    args: ['--minimized']
  });
  return app.getLoginItemSettings().openAtLogin;
});
