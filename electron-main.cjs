const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
let tray = null;
let isQuitting = false;

// 1. Start backend Express server inside a child process
function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  console.log(`[AiroShare Electron] Launching Express server child process: ${serverPath}`);
  
  serverProcess = fork(serverPath, [], {
    env: { 
      ...process.env, 
      PORT: '3000',
      NODE_ENV: app.isPackaged ? 'production' : 'development'
    },
    silent: false // pipes stdout/stderr to Electron console
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

// 3. Create Main Application Window
function createWindow() {
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

  // Remove the default File / Edit / View / Window / Help menu bar
  mainWindow.removeMenu();

  const isDev = !app.isPackaged;

  if (isDev) {
    // Check if Vite dev server is running on 5173
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(300);
    socket.connect(5173, '127.0.0.1', () => {
      socket.destroy();
      console.log('[AiroShare Electron] Vite dev server detected. Loading dev dashboard: http://localhost:5173');
      if (mainWindow) mainWindow.loadURL('http://localhost:5173');
    });
    
    const fallbackToExpress = () => {
      socket.destroy();
      console.log('[AiroShare Electron] Vite dev server not detected. Waiting for Express server on port 3000 to boot...');
      waitForPort(3000, '127.0.0.1', () => {
        console.log('[AiroShare Electron] Express server started. Loading dashboard: http://localhost:3000');
        if (mainWindow) mainWindow.loadURL('http://localhost:3000');
      });
    };

    socket.on('error', fallbackToExpress);
    socket.on('timeout', fallbackToExpress);
  } else {
    console.log('[AiroShare Electron] Waiting for local Express server on port 3000 to boot...');
    waitForPort(3000, '127.0.0.1', () => {
      console.log('[AiroShare Electron] Express server started. Loading: http://localhost:3000');
      if (mainWindow) mainWindow.loadURL('http://localhost:3000');
    });
  }

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
app.whenReady().then(() => {
  // Set Application User Model ID for correct taskbar grouping and Windows notification titles
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.airoshare.app');
  }
  
  startServer();
  
  // Wait a moment for server socket to bind before loading window
  setTimeout(() => {
    createTray();
    createWindow();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
