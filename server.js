import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import mime from 'mime-types';
import QRCode from 'qrcode';
import AiroFtpServer from './ftpServer.js';

// DLNA Module Imports
import dlnaRouter from './src/dlna/index.js';
import mediaStore from './src/dlna/contentDirectory/mediaStore.js';
import ssdpServer from './src/dlna/ssdp/ssdpServer.js';
import getDeviceIcon from './src/dlna/device/icons.js';
import clientTracker from './src/utils/clientTracker.js';

const app = express();
const PORT = process.env.PORT || 3000;
let ftpPort = process.env.FTP_PORT || 2121;

// Service Toggles State (3 Active Services)
const servicesState = {
  http: true,
  ftp: true,
  dlna: true
};

// Set up default initial directory (Default: C:\Users\<user>\Downloads)
const defaultDownloadsDir = path.join(os.homedir(), 'Downloads');
let rootDirectory = fs.existsSync(defaultDownloadsDir) ? defaultDownloadsDir : os.homedir();

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
const distPath = path.join(process.cwd(), 'dist');
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
    const { service, enable } = req.body;
    if (!['http', 'ftp', 'dlna'].includes(service)) {
      return res.status(400).json({ error: 'Invalid service name' });
    }

    servicesState[service] = !!enable;

    if (service === 'ftp') {
      if (enable) {
        if (!ftpServerInstance || !ftpServerInstance.isRunning) {
          ftpServerInstance = new AiroFtpServer({ port: ftpPort, rootPath: rootDirectory });
          await ftpServerInstance.start();
        }
      } else {
        if (ftpServerInstance) await ftpServerInstance.stop();
      }
    }

    if (service === 'dlna') {
      if (enable) {
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
      enabled: servicesState[service]
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
    const hostNameStr = os.hostname();
    const mdnsHost = `Airoshare-${hostNameStr}.local`;
    const localDomainUrl = `http://${mdnsHost}:${PORT}`;
    const serverUrl = `http://${primaryIp}:${PORT}`;

    const qrDataUrl = await QRCode.toDataURL(localDomainUrl, { margin: 1, width: 300 });

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
      localDomainUrl,
      platform: os.platform(),
      rootDirectory,
      ips,
      primaryIp,
      port: PORT,
      serverUrl,
      qrDataUrl,
      storage: storageInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Change / Update Root Directory
app.post('/api/network/set-root', async (req, res) => {
  const { newPath } = req.body;
  if (newPath && fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    rootDirectory = path.resolve(newPath);
    await mediaStore.scanMedia(rootDirectory);
    console.log(`[AiroShare] Root directory updated to: ${rootDirectory}`);
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

          files.push({
            name: item.name,
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
        // Ignore unreadable individual files/folders
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

// API: Stream File with HTTP 206 Partial Content (Gigabit & DLNA Optimized)
app.get('/api/files/stream', handleMediaStream);

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

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n==================================================`);
  console.log(`AiroShare Home Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].address : '127.0.0.1';

  ips.forEach(ip => {
    console.log(`LAN Network stream: http://${ip.address}:${PORT}`);
  });

  try {
    await mediaStore.scanMedia(rootDirectory);
    ssdpServer.start(primaryIp, PORT);
    console.log(`UPnP DLNA AV Server Active at http://${primaryIp}:${PORT}/dlna/description.xml`);
  } catch (err) {
    console.warn('[DLNA Startup Notice]', err.message);
  }

  console.log(`==================================================\n`);
});
