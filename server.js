import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import mime from 'mime-types';
import QRCode from 'qrcode';
import net from 'net';
import AiroFtpServer from './ftpServer.js';
import { execSync } from 'child_process';

// DLNA Module Imports
import dlnaRouter from './src/dlna/index.js';
import mediaStore from './src/dlna/contentDirectory/mediaStore.js';
import ssdpServer from './src/dlna/ssdp/ssdpServer.js';
import getDeviceIcon from './src/dlna/device/icons.js';
import clientTracker from './src/utils/clientTracker.js';

// --- Helper: Find a free TCP port dynamically ---
function findFreePort(start) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, '0.0.0.0', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(findFreePort(start + 1)));
  });
}

const app = express();
const PREFERRED_PORT = parseInt(process.env.PORT || '9900', 10);
const PORT = await findFreePort(PREFERRED_PORT);

const PREFERRED_FTP_PORT = parseInt(process.env.FTP_PORT || '2121', 10);
const ftpPort = await findFreePort(PREFERRED_FTP_PORT);

const APP_PATH = process.env.APP_PATH || process.cwd();

const pkg = JSON.parse(fs.readFileSync(path.join(APP_PATH, 'package.json'), 'utf8'));
const VERSION = pkg.version;

try {
  fs.writeFileSync(
    path.join(APP_PATH, 'config', 'port.json'), 
    JSON.stringify({ port: PORT }, null, 2), 
    'utf8'
  );
} catch (err) {
  // Ignore
}

// Service Toggles State (3 Active Services)
const servicesState = {
  http: true,
  ftp: true,
  dlna: true
};

// Persistent Config File Path for Shared Directory
const rootConfigFile = path.join(APP_PATH, 'config', 'root.json');
let rootDirectory = null;

try {
  if (fs.existsSync(rootConfigFile)) {
    const savedConf = JSON.parse(fs.readFileSync(rootConfigFile, 'utf8'));
    if (savedConf.rootDirectory && fs.existsSync(savedConf.rootDirectory)) {
      rootDirectory = savedConf.rootDirectory;
    }
  }
} catch (err) {
  // Fallback to default
}

if (!rootDirectory) {
  const defaultVideosDir = path.join(os.homedir(), 'Videos');
  rootDirectory = fs.existsSync(defaultVideosDir) ? defaultVideosDir : os.homedir();
}

if (!fs.existsSync(rootDirectory)) {
  try {
    fs.mkdirSync(rootDirectory, { recursive: true });
  } catch (e) {
    rootDirectory = os.homedir();
  }
}

console.log(`[AiroShare] Root Shared Directory initialized to: ${rootDirectory}`);

// Initialize Native Node.js FTP Server instance
let ftpServerInstance = new AiroFtpServer({
  port: ftpPort,
  rootPath: rootDirectory
});

ftpServerInstance.start().catch((err) => {
  console.warn('[AiroShare Native FTP Server Notice]', err.message);
});

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// Mount DLNA Module Router & Icon Routes
app.use('/dlna', dlnaRouter);
app.get('/icon-:size.png', (req, res) => {
  const size = parseInt(req.params.size, 10);
  res.setHeader('Content-Type', 'image/png');
  res.send(getDeviceIcon(size));
});

// Serve static frontend build if available
const distPath = path.join(APP_PATH, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Track Active Client Connections
app.use((req, res, next) => {
  if (!req.path.startsWith('/assets') && !req.path.startsWith('/api/clients')) {
    const userAgent = req.headers['user-agent'] || 'Generic Client';
    const clientIp = req.ip || req.socket?.remoteAddress || 'Unknown';
    clientTracker.logActivity({
      ip: clientIp,
      device: userAgent.includes('VLC') ? 'VLC Player' : (userAgent.includes('Mozilla') ? 'Web Browser' : userAgent),
      protocol: req.path.startsWith('/dlna') ? 'DLNA / UPnP' : (req.path.startsWith('/api/ftp') ? 'FTP' : 'HTTP API'),
      activity: `${req.method} ${req.path}`
    });
  }
  next();
});

// API: Get Active Connected Clients
app.get('/api/clients', (req, res) => {
  res.json({ clients: clientTracker.getActiveClients() });
});

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = req.query.path ? decodeURIComponent(req.query.path) : rootDirectory;
    if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
      cb(null, targetDir);
    } else {
      cb(null, rootDirectory);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Helper: Get local network IPv4 addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('virtual') || lowerName.includes('vbox') || lowerName.includes('vmnet') || lowerName.includes('wsl') || lowerName.includes('pseudo') || lowerName.includes('loopback')) {
      continue;
    }

    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        addresses.push({
          interface: name,
          address: net.address
        });
      }
    }
  }

  addresses.sort((a, b) => {
    const aIsWifiEth = /wi-fi|wifi|ethernet|lan/i.test(a.interface);
    const bIsWifiEth = /wi-fi|wifi|ethernet|lan/i.test(b.interface);
    if (aIsWifiEth && !bIsWifiEth) return -1;
    if (!aIsWifiEth && bIsWifiEth) return 1;

    const aStandard = /^192\.168\.[01]\./.test(a.address) || /^10\./.test(a.address);
    const bStandard = /^192\.168\.[01]\./.test(b.address) || /^10\./.test(b.address);
    if (aStandard && !bStandard) return -1;
    if (!aStandard && bStandard) return 1;

    return 0;
  });

  return addresses;
}

// Helper: Determine file category
function getFileCategory(mimeType, filename) {
  if (!mimeType) {
    const ext = path.extname(filename).toLowerCase();
    if (['.mkv', '.mp4', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v', '.ts', '.m3u8'].includes(ext)) return 'video';
    if (['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma'].includes(ext)) return 'audio';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) return 'image';
    if (['.pdf', '.docx', '.doc', '.txt', '.pptx', '.xlsx', '.epub'].includes(ext)) return 'document';
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.iso'].includes(ext)) return 'archive';
    return 'other';
  }
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar')) return 'archive';
  return 'other';
}

// API: Get Status of 3 Active Services
app.get('/api/services/status', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';

  res.json({
    http: {
      enabled: servicesState.http,
      port: PORT,
      url: `http://${primaryIp}:${PORT}`
    },
    ftp: {
      enabled: servicesState.ftp && ftpServerInstance && ftpServerInstance.isRunning,
      port: ftpPort,
      url: `ftp://${primaryIp}:${ftpPort}`
    },
    dlna: {
      enabled: servicesState.dlna && ssdpServer && ssdpServer.isRunning,
      location: `http://${primaryIp}:${PORT}/dlna/description.xml`,
      ssdpPort: 1900
    }
  });
});

// API: Toggle any server service ON or OFF live (http, ftp, dlna)
app.post('/api/services/toggle', async (req, res) => {
  try {
    const { service, enable, state } = req.body;
    if (!['http', 'ftp', 'dlna'].includes(service)) {
      return res.status(400).json({ error: 'Invalid service name' });
    }

    const targetEnable = enable !== undefined ? !!enable : (state !== undefined ? !!state : !servicesState[service]);
    servicesState[service] = targetEnable;

    if (service === 'ftp') {
      if (targetEnable) {
        if (!ftpServerInstance || !ftpServerInstance.isRunning) {
          ftpServerInstance = new AiroFtpServer({ port: ftpPort, rootPath: rootDirectory });
          await ftpServerInstance.start();
        }
      } else {
        if (ftpServerInstance) await ftpServerInstance.stop();
      }
    }

    if (service === 'dlna') {
      if (targetEnable) {
        const ips = getLocalIpAddresses();
        const primaryIp = ips.length > 0 ? ips[0].address : '127.0.0.1';
        ssdpServer.start(primaryIp, PORT);
      } else {
        ssdpServer.stop();
      }
    }

    res.json({
      success: true,
      service,
      enabled: servicesState[service],
      services: { ...servicesState }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get FTP Server Status & Info
app.get('/api/ftp/status', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';

  res.json({
    isRunning: ftpServerInstance ? ftpServerInstance.isRunning : false,
    port: ftpPort,
    rootPath: rootDirectory,
    anonymousAuth: true,
    vlcFtpUrl: `ftp://${primaryIp}:${ftpPort}`
  });
});

// API: Update FTP Server Config (Port & Toggle)
app.post('/api/ftp/config', async (req, res) => {
  try {
    const { newPort, enable } = req.body;
    if (newPort && !isNaN(newPort)) {
      ftpPort = parseInt(newPort, 10);
    }

    if (ftpServerInstance) {
      await ftpServerInstance.stop();
    }

    if (enable !== false) {
      ftpServerInstance = new AiroFtpServer({
        port: ftpPort,
        rootPath: rootDirectory
      });
      await ftpServerInstance.start();
    }

    const ips = getLocalIpAddresses();
    const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';

    res.json({
      success: true,
      isRunning: ftpServerInstance ? ftpServerInstance.isRunning : false,
      port: ftpPort,
      vlcFtpUrl: `ftp://${primaryIp}:${ftpPort}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Plex & Kodi Media Feed Generator
app.get('/api/plex/feed', (req, res) => {
  try {
    const targetPath = req.query.path ? decodeURIComponent(req.query.path) : rootDirectory;
    const ips = getLocalIpAddresses();
    const primaryIp = ips.length > 0 ? ips[0].address : req.hostname || 'localhost';
    const baseUrl = `http://${primaryIp}:${PORT}`;

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    const mediaItems = [];

    for (const item of items) {
      if (item.isFile()) {
        const fullPath = path.join(targetPath, item.name);
        const itemStat = fs.statSync(fullPath);
        const mimeType = mime.lookup(item.name) || '';
        const category = getFileCategory(mimeType, item.name);

        if (['video', 'audio', 'image'].includes(category)) {
          mediaItems.push({
            id: Buffer.from(fullPath).toString('base64'),
            title: item.name,
            sizeBytes: itemStat.size,
            sizeMb: (itemStat.size / (1024 * 1024)).toFixed(2),
            mimeType,
            category,
            modified: itemStat.mtime,
            streamUrl: `${baseUrl}/api/files/stream?path=${encodeURIComponent(fullPath)}`,
            vlcProtocolUrl: `vlc://${baseUrl}/api/files/stream?path=${encodeURIComponent(fullPath)}`
          });
        }
      }
    }

    res.json({
      serverName: 'AiroShare Media Engine',
      hostname: os.hostname(),
      primaryIp,
      port: PORT,
      rootDirectory: targetPath,
      totalMediaItems: mediaItems.length,
      items: mediaItems
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mobile Multi-File Share Landing Page (/share?files=base64_1,base64_2...)
app.get('/share', (req, res) => {
  const rawPaths = req.query.files ? req.query.files.split(',') : [];
  const files = [];

  for (const encodedPath of rawPaths) {
    try {
      const decodedPath = Buffer.from(encodedPath, 'base64').toString('utf8');
      if (fs.existsSync(decodedPath) && fs.statSync(decodedPath).isFile()) {
        const name = path.basename(decodedPath);
        const stat = fs.statSync(decodedPath);
        const mimeType = mime.lookup(name) || 'application/octet-stream';
        files.push({
          name,
          sizeMb: (stat.size / (1024 * 1024)).toFixed(1),
          mimeType,
          streamUrl: `/api/files/stream?path=${encodeURIComponent(decodedPath)}`,
          downloadUrl: `/api/files/download?path=${encodeURIComponent(decodedPath)}`
        });
      }
    } catch (e) {
      // Ignore invalid paths
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AiroShare - Shared Files from PC</title>
  <link rel="icon" type="image/svg+xml" href="/AiroShare.svg" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #0e090a; color: #fcfcfc; margin: 0; padding: 16px; }
    .card { background: #1b1013; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 16px; background: linear-gradient(135deg, #FF5D0B, #E02A24); color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.88rem; width: 100%; box-sizing: border-box; text-align: center; }
    .file-item { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
    .file-name { font-weight: 600; font-size: 0.92rem; word-break: break-all; }
    .file-meta { font-size: 0.78rem; color: #a6989a; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/AiroShare.svg" width="36" height="36" style="border-radius: 8px;" />
    <div>
      <h2 style="margin: 0; font-size: 1.1rem;">AiroShare PC Share</h2>
      <span style="font-size: 0.78rem; color: #a6989a;">${files.length} Shared File(s) from PC</span>
    </div>
  </div>

  ${files.length === 0 ? '<div class="card"><p style="color:#a6989a;">No shared files found or link expired.</p></div>' : ''}

  ${files.map(f => `
    <div class="card file-item">
      <div class="file-name">${f.name}</div>
      <div class="file-meta">Size: ${f.sizeMb} MB</div>
      <a href="${f.downloadUrl}" class="btn" download>Download File</a>
    </div>
  `).join('')}
</body>
</html>`;

  res.send(html);
});

// API: UPnP / DLNA Device Description XML fallback alias
app.get('/dlna/device.xml', (req, res) => {
  res.redirect('/dlna/description.xml');
});

// API: Get Network Info & Storage Stats
app.get('/api/network/info', async (req, res) => {
  try {
    const ips = getLocalIpAddresses();
    const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';
    const hostNameStr = os.hostname();
    const mdnsHost = `${hostNameStr.toLowerCase()}.local`;
    const activeNet = ips.length > 0 ? ips[0] : { interface: 'LAN', address: '127.0.0.1' };
    let connectionType = 'Ethernet';
    if (/wi-fi|wifi|wlan/i.test(activeNet.interface)) {
      connectionType = 'Wi-Fi';
    } else if (/ethernet|lan/i.test(activeNet.interface)) {
      connectionType = 'Ethernet';
    }

    const localDomainUrl = `http://${mdnsHost}:${PORT}`;
    const serverUrl = `http://${primaryIp}:${PORT}`;

    const qrDataUrl = await QRCode.toDataURL(serverUrl, { margin: 1, width: 300 });

    let storageInfo = { total: 0, free: 0, used: 0, percentUsed: 0 };
    try {
      if (fs.statfsSync) {
        const stats = fs.statfsSync(rootDirectory);
        const total = stats.bsize * stats.blocks;
        const free = stats.bsize * stats.bfree;
        const used = total - free;
        const percentUsed = Math.round((used / total) * 100);
        storageInfo = { total, free, used, percentUsed };
      }
    } catch (err) {
      console.warn('[Storage Check Warning]', err.message);
    }

    res.json({
      hostname: hostNameStr,
      mdnsHost,
      connectionType,
      activeInterface: activeNet.interface,
      localDomainUrl,
      platform: os.platform(),
      rootDirectory,
      ips,
      primaryIp,
      port: PORT,
      serverUrl,
      qrDataUrl,
      storage: storageInfo,
      version: VERSION
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get Shortcut Directories and Active Drives
app.get('/api/network/shortcut-directories', (req, res) => {
  try {
    const home = os.homedir();
    const shortcuts = [
      { name: 'Videos', path: path.join(home, 'Videos') },
      { name: 'Downloads', path: path.join(home, 'Downloads') },
      { name: 'Desktop', path: path.join(home, 'Desktop') },
      { name: 'Home Directory', path: home }
    ];

    // Filter shortcuts to only existing directories
    const existingShortcuts = shortcuts.filter(s => {
      try {
        return fs.existsSync(s.path) && fs.statSync(s.path).isDirectory();
      } catch {
        return false;
      }
    });

    const drives = [];
    if (os.platform() === 'win32') {
      try {
        const stdout = execSync('wmic logicaldisk get name').toString();
        const list = stdout
          .split('\r\r\n')
          .filter(val => /[A-Za-z]:/.test(val))
          .map(val => val.trim() + '\\');
        drives.push(...list);
      } catch {
        // Fallback
        ['C:\\', 'D:\\', 'E:\\', 'F:\\'].forEach(d => {
          try {
            fs.accessSync(d);
            drives.push(d);
          } catch {}
        });
      }
    } else {
      drives.push('/');
    }

    res.json({ shortcuts: existingShortcuts, drives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Change / Update Root Directory (Instantly Synchronized Across HTTP, DLNA & FTP)
app.post('/api/network/set-root', async (req, res) => {
  let { newPath } = req.body;
  if (!newPath) return res.status(400).json({ error: 'No path provided' });

  newPath = path.resolve(newPath.trim());
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    rootDirectory = newPath;

    // Save to persistent config so folder choice persists across app reboots
    try {
      fs.writeFileSync(rootConfigFile, JSON.stringify({ rootDirectory }, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Root Config Write Notice]', err.message);
    }

    // 1. Force DLNA MediaStore to rescan new root directory instantly
    mediaStore.isScanning = false;
    await mediaStore.scanMedia(rootDirectory);

    // 2. Restart FTP Server with new root directory instantly
    if (ftpServerInstance && servicesState.ftp) {
      try {
        await ftpServerInstance.stop();
        ftpServerInstance = new AiroFtpServer({ port: ftpPort, rootPath: rootDirectory });
        await ftpServerInstance.start();
        console.log(`[AiroShare FTP] Root directory updated & server restarted on port ${ftpPort}`);
      } catch (err) {
        console.warn('[AiroShare FTP Restart Notice]', err.message);
      }
    } else if (!ftpServerInstance && servicesState.ftp) {
      try {
        ftpServerInstance = new AiroFtpServer({ port: ftpPort, rootPath: rootDirectory });
        await ftpServerInstance.start();
      } catch (err) {
        console.warn('[AiroShare FTP Start Notice]', err.message);
      }
    }

    // 3. Re-announce DLNA SSDP location for instant network discovery refresh
    if (ssdpServer && servicesState.dlna) {
      try {
        const ips = getLocalIpAddresses();
        const primaryIp = ips.length > 0 ? ips[0].address : '127.0.0.1';
        if (ssdpServer.isRunning) {
          ssdpServer.notifyUpdate(primaryIp, PORT);
        } else {
          ssdpServer.start(primaryIp, PORT);
        }
      } catch (err) {
        console.warn('[DLNA SSDP Re-announce Notice]', err.message);
      }
    }

    console.log(`[AiroShare] Root directory updated & synchronized instantly: ${rootDirectory}`);
    return res.json({ success: true, rootDirectory });
  }
  res.status(400).json({ error: 'Invalid directory path provided' });
});



// API: Browse Directory & Files (Enforcing Strict Shared Root Boundary)
app.get('/api/files/browse', (req, res) => {
  try {
    let targetPath = req.query.path ? decodeURIComponent(req.query.path) : rootDirectory;
    
    // Resolve absolute path
    targetPath = path.resolve(targetPath);

    // Boundary Enforcement: Prevent browsing outside or above rootDirectory
    const relative = path.relative(rootDirectory, targetPath);
    if (relative.startsWith('..') || relative.startsWith('/') || relative.startsWith('\\')) {
      targetPath = rootDirectory;
    }

    if (!fs.existsSync(targetPath)) {
      targetPath = rootDirectory;
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Target path is not a directory' });
    }

    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    
    const directories = [];
    const files = [];

    for (const item of items) {
      try {
        const fullItemPath = path.join(targetPath, item.name);
        
        if (item.name.startsWith('$') || item.name === 'System Volume Information') continue;

        if (item.isDirectory()) {
          const itemStat = fs.statSync(fullItemPath);
          directories.push({
            name: item.name,
            path: fullItemPath,
            modified: itemStat.mtime
          });
        } else if (item.isFile()) {
          const itemStat = fs.statSync(fullItemPath);
          const mimeType = mime.lookup(item.name) || 'application/octet-stream';
          const category = getFileCategory(mimeType, item.name);
          const ext = path.extname(item.name).toLowerCase();

          const cleaned = cleanMediaName(item.name);
          let displayName = cleaned.title || item.name;
          if (cleaned.year) displayName += ` (${cleaned.year})`;

          files.push({
            name: item.name,
            displayName,
            quality: cleaned.quality || null,
            path: fullItemPath,
            size: itemStat.size,
            modified: itemStat.mtime,
            mimeType,
            category,
            ext,
            streamUrl: `/api/files/stream?path=${encodeURIComponent(fullItemPath)}`,
            downloadUrl: `/api/files/download?path=${encodeURIComponent(fullItemPath)}`
          });
        }
      } catch (e) {
        console.error('BROWSE ITEM ERROR:', item.name, e);
      }
    }

    directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // Compute parent directory ONLY if targetPath is strictly inside rootDirectory and NOT equal to rootDirectory
    let parentPath = null;
    if (targetPath !== rootDirectory) {
      const parent = path.dirname(targetPath);
      const parentRelative = path.relative(rootDirectory, parent);
      if (!parentRelative.startsWith('..')) {
        parentPath = parent;
      }
    }

    res.json({
      currentPath: targetPath,
      parentPath,
      rootDirectory,
      directories,
      files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

import handleMediaStream from './src/dlna/utils/streamHandler.js';
import generateLocalThumbnail, { getCachedThumbnailPath } from './src/dlna/utils/localThumbnailEngine.js';
import { cleanMediaName } from './src/dlna/utils/posterFetcher.js';

// API: Stream File with HTTP 206 Partial Content (Gigabit & DLNA Optimized)
app.get('/api/files/stream', handleMediaStream);

// API: Local Video Thumbnail — 100% offline native video frame thumbnail or local sidecar cover art
app.get('/api/thumbnail', async (req, res) => {
  try {
    let filePath = req.query.path ? decodeURIComponent(req.query.path) : null;
    const category = req.query.category || 'video';

    if (filePath) {
      // Strip any trailing query parameters or XML entity artifacts
      filePath = filePath.replace(/[&?].*$/, '').trim();

      // 1. Check existing cache
      let cachedPath = getCachedThumbnailPath(filePath);

      // 2. Generate on-demand if not cached yet
      if (!cachedPath) {
        cachedPath = await generateLocalThumbnail(filePath);
      }

      if (cachedPath && fs.existsSync(cachedPath)) {
        const ext = path.extname(cachedPath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(path.resolve(cachedPath));
      }
    }

    // Fallback: serve a minimal inline SVG icon based on media category
    const svgIcons = {
      video: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" rx="8" fill="#1a1f2e"/><polygon points="44,24 44,56 80,40" fill="#FF5D0B" opacity="0.85"/><text x="60" y="72" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui">VIDEO</text></svg>`,
      audio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" rx="8" fill="#1a1f2e"/><circle cx="60" cy="36" r="18" fill="none" stroke="#FF5D0B" stroke-width="3" opacity="0.85"/><circle cx="60" cy="36" r="6" fill="#FF5D0B" opacity="0.85"/><text x="60" y="72" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui">AUDIO</text></svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" rx="8" fill="#1a1f2e"/><rect x="24" y="20" width="72" height="40" rx="4" fill="none" stroke="#FF5D0B" stroke-width="2" opacity="0.85"/><circle cx="42" cy="33" r="5" fill="#FF5D0B" opacity="0.85"/><polygon points="24,56 56,36 80,52 96,40 96,60 24,60" fill="#FF5D0B" opacity="0.3"/><text x="60" y="74" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui">IMAGE</text></svg>`,
      default: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" rx="8" fill="#1a1f2e"/><rect x="36" y="18" width="48" height="44" rx="4" fill="none" stroke="#FF5D0B" stroke-width="2" opacity="0.85"/><line x1="44" y1="32" x2="76" y2="32" stroke="#64748b" stroke-width="1.5"/><line x1="44" y1="40" x2="76" y2="40" stroke="#64748b" stroke-width="1.5"/><line x1="44" y1="48" x2="64" y2="48" stroke="#64748b" stroke-width="1.5"/><text x="60" y="74" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui">FILE</text></svg>`
    };
    const svg = svgIcons[category] || svgIcons.default;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(svg);
  } catch (err) {
    res.status(500).send('Error serving thumbnail');
  }
});

// API: Force re-scan & re-generate local video thumbnails (POST)
app.post('/api/thumbnails/refresh', async (req, res) => {
  try {
    await mediaStore.refreshLocalThumbnails();
    res.json({ success: true, message: 'Local video thumbnail extraction complete' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Backwards compatibility alias for /api/posters/refresh
app.post('/api/posters/refresh', async (req, res) => {
  try {
    await mediaStore.refreshLocalThumbnails();
    res.json({ success: true, message: 'Local video thumbnail extraction complete' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Direct File Download
app.get('/api/files/download', (req, res) => {
  try {
    const filePath = req.query.path ? decodeURIComponent(req.query.path) : null;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    res.download(filePath);
  } catch (error) {
    res.status(500).send('Error downloading file');
  }
});

// API: File Upload
app.post('/api/files/upload', upload.array('files'), async (req, res) => {
  try {
    const targetDir = req.query.path ? decodeURIComponent(req.query.path) : rootDirectory;
    await mediaStore.scanMedia(targetDir);
    res.json({
      success: true,
      message: `Successfully uploaded ${req.files?.length || 0} file(s)`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Root level M3U Playlist shortcut
app.get('/playlist.m3u', (req, res) => {
  res.redirect('/api/vlc/playlist');
});

// API: Generate VLC M3U Playlist Endpoint
app.get('/api/vlc/playlist', (req, res) => {
  try {
    const targetPath = req.query.path ? decodeURIComponent(req.query.path) : rootDirectory;
    const ips = getLocalIpAddresses();
    const primaryIp = ips.length > 0 ? ips[0].address : req.hostname || 'localhost';
    const baseUrl = `http://${primaryIp}:${PORT}`;

    if (!fs.existsSync(targetPath)) {
      return res.status(404).send('Directory not found');
    }

    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    let m3uContent = '#EXTM3U\n# EXTM3U Playlist generated by AiroShare Home Server\n\n';

    for (const item of items) {
      if (item.isFile()) {
        const fullPath = path.join(targetPath, item.name);
        const mimeType = mime.lookup(item.name) || '';
        const category = getFileCategory(mimeType, item.name);

        if (category === 'video' || category === 'audio') {
          const streamUrl = `${baseUrl}/api/files/stream?path=${encodeURIComponent(fullPath)}`;
          m3uContent += `#EXTINF:-1,${item.name}\n${streamUrl}\n\n`;
        }
      }
    }

    const folderName = path.basename(targetPath) || 'AiroShare_Playlist';
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.m3u"`);
    res.send(m3uContent);
  } catch (error) {
    res.status(500).send('Error generating M3U playlist');
  }
});

// API: Dynamic QR Code Generator
app.get('/api/qrcode', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send('URL required');
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 400 });
    const img = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length
    });
    res.end(img);
  } catch (err) {
    res.status(500).send('Error generating QR code');
  }
});

// Catch-all route to serve SPA index.html
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.send('AiroShare Server is running. Frontend dev server is available at http://localhost:5173');
  }
});

function startListening(targetPort) {
  const instance = app.listen(targetPort, '0.0.0.0', async () => {
    if (process.send) {
      process.send({ type: 'PORT_INITIALIZED', port: targetPort });
    }
    try {
      fs.writeFileSync(
        path.join(APP_PATH, 'config', 'port.json'), 
        JSON.stringify({ port: targetPort }, null, 2), 
        'utf8'
      );
    } catch (e) {}

    console.log(`\n==================================================`);
    console.log(`AiroShare Home Server running on port ${targetPort}`);
    console.log(`Local access: http://localhost:${targetPort}`);
    const ips = getLocalIpAddresses();
    const primaryIp = ips.length > 0 ? ips[0].address : '127.0.0.1';

    ips.forEach(ip => {
      console.log(`LAN Network stream: http://${ip.address}:${targetPort}`);
    });
    console.log(`Hostname access:   http://${os.hostname().toLowerCase()}:${targetPort}`);
    console.log(`mDNS access:       http://${os.hostname().toLowerCase()}.local:${targetPort}`);

    try {
      await mediaStore.scanMedia(rootDirectory);
      ssdpServer.start(primaryIp, targetPort);
      console.log(`UPnP DLNA AV Server Active at http://${primaryIp}:${targetPort}/dlna/description.xml`);
    } catch (err) {
      console.warn('[DLNA Startup Notice]', err.message);
    }

    console.log(`==================================================\n`);
  });

  instance.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[AiroShare Port Notice] Port ${targetPort} busy, binding to alternate free port...`);
      const freePort = await findFreePort(targetPort + 1);
      startListening(freePort);
    } else {
      console.error('[AiroShare Server Error]', err);
    }
  });

  return instance;
}

startListening(PORT);
