import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import mime from 'mime-types';
import QRCode from 'qrcode';
import AiroSmbServer from './smbServer.js';
import AiroFtpServer from './ftpServer.js';

// DLNA Module Imports
import dlnaRouter from './src/dlna/index.js';
import mediaStore from './src/dlna/contentDirectory/mediaStore.js';
import ssdpServer from './src/dlna/ssdp/ssdpServer.js';
import getDeviceIcon from './src/dlna/device/icons.js';

const app = express();
const PORT = process.env.PORT || 3000;
let smbPort = process.env.SMB_PORT || 4450;
let ftpPort = process.env.FTP_PORT || 2121;

// Service Toggles State
const servicesState = {
  http: true,
  smb: true,
  ftp: true,
  dlna: true
};

// Initialize Native Node.js SMB Server instance
let smbServerInstance = new AiroSmbServer({
  port: smbPort,
  shareName: 'AiroSMB',
  sharePath: 'C:\\Users\\aseps\\Downloads'
});

smbServerInstance.start().catch((err) => {
  console.warn('[AiroSMB Native SMB Server Notice]', err.message);
});

// Initialize Native Node.js FTP Server instance
let ftpServerInstance = new AiroFtpServer({
  port: ftpPort,
  rootPath: 'C:\\Users\\aseps\\Downloads'
});

ftpServerInstance.start().catch((err) => {
  console.warn('[AiroSMB Native FTP Server Notice]', err.message);
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

// Set up default initial directory (User specified C:\Users\aseps\Downloads)
let rootDirectory = 'C:\\Users\\aseps\\Downloads';
if (!fs.existsSync(rootDirectory)) {
  rootDirectory = path.join(os.homedir(), 'Downloads');
}
if (!fs.existsSync(rootDirectory)) {
  rootDirectory = os.homedir();
}

console.log(`[AiroSMB] Root Shared Directory initialized to: ${rootDirectory}`);

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = req.query.path ? decodeURIComponent(req.query.path) : rootDirectory;
    // Security check to ensure targetDir exists
    if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
      cb(null, targetDir);
    } else {
      cb(null, rootDirectory);
    }
  },
  filename: (req, file, cb) => {
    // Preserve original filename
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Helper: Get local network IPv4 addresses (filtering out virtual & link-local IPs)
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    // Skip virtual host adapters
    if (lowerName.includes('virtual') || lowerName.includes('vbox') || lowerName.includes('vmnet') || lowerName.includes('wsl') || lowerName.includes('pseudo') || lowerName.includes('loopback')) {
      continue;
    }

    for (const net of interfaces[name]) {
      // Filter for IPv4, non-internal, and non-APIPA (169.254.x.x)
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        addresses.push({
          interface: name,
          address: net.address
        });
      }
    }
  }

  // Sort so physical Wi-Fi/Ethernet adapters and standard subnets (192.168.1.x / 192.168.0.x / 10.x) come first
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

// API: Get Status of All Server Engines & Toggles
app.get('/api/services/status', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';

  res.json({
    http: {
      enabled: servicesState.http,
      port: PORT,
      url: `http://${primaryIp}:${PORT}`
    },
    smb: {
      enabled: servicesState.smb && smbServerInstance && smbServerInstance.isRunning,
      port: smbPort,
      url: `smb://${primaryIp}:${smbPort}/AiroSMB`
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

// API: Toggle any server service ON or OFF live
app.post('/api/services/toggle', async (req, res) => {
  try {
    const { service, enable } = req.body;
    if (!['http', 'smb', 'ftp', 'dlna'].includes(service)) {
      return res.status(400).json({ error: 'Invalid service name' });
    }

    servicesState[service] = !!enable;

    if (service === 'smb') {
      if (enable) {
        if (!smbServerInstance || !smbServerInstance.isRunning) {
          smbServerInstance = new AiroSmbServer({ port: smbPort, shareName: 'AiroSMB', sharePath: rootDirectory });
          await smbServerInstance.start();
        }
      } else {
        if (smbServerInstance) await smbServerInstance.stop();
      }
    }

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
      serverName: 'AiroSMB Plex & Media Engine',
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

// API: UPnP / DLNA Device Description XML fallback alias for Smart TVs
app.get('/dlna/device.xml', (req, res) => {
  res.redirect('/dlna/description.xml');
});

// API: Get SMB Server Status & Info
app.get('/api/smb/status', (req, res) => {
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';

  res.json({
    isRunning: smbServerInstance ? smbServerInstance.isRunning : false,
    port: smbPort,
    shareName: 'AiroSMB',
    sharePath: rootDirectory,
    anonymousAuth: true,
    vlcSmbPath: `smb://${primaryIp}:${smbPort}/AiroSMB`,
    vlcStandardSmbPath: `smb://${primaryIp}/AiroSMB`
  });
});

// API: Update SMB Server Config (Change Custom Port & Toggle)
app.post('/api/smb/config', async (req, res) => {
  try {
    const { newPort, enable } = req.body;
    
    if (newPort && !isNaN(newPort)) {
      smbPort = parseInt(newPort, 10);
    }

    if (smbServerInstance) {
      await smbServerInstance.stop();
    }

    if (enable !== false) {
      smbServerInstance = new AiroSmbServer({
        port: smbPort,
        shareName: 'AiroSMB',
        sharePath: rootDirectory
      });
      await smbServerInstance.start();
    }

    const ips = getLocalIpAddresses();
    const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';

    res.json({
      success: true,
      isRunning: smbServerInstance ? smbServerInstance.isRunning : false,
      port: smbPort,
      vlcSmbPath: `smb://${primaryIp}:${smbPort}/AiroSMB`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get Network Info & Storage Stats
app.get('/api/network/info', async (req, res) => {
  try {
    const ips = getLocalIpAddresses();
    const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';
    const serverUrl = `http://${primaryIp}:${PORT}`;
    const smbPath = `\\\\${os.hostname()}\\AiroSMB`;

    // Generate pairing QR code URL
    const qrDataUrl = await QRCode.toDataURL(serverUrl, { margin: 1, width: 300 });

    // Storage info (Node 19.6+ supports statfsSync)
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
      hostname: os.hostname(),
      platform: os.platform(),
      rootDirectory,
      ips,
      primaryIp,
      port: PORT,
      serverUrl,
      smbPath,
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
    console.log(`[AiroSMB] Root directory updated to: ${rootDirectory}`);
    return res.json({ success: true, rootDirectory });
  }
  res.status(400).json({ error: 'Invalid directory path provided' });
});

// API: Browse Directory & Files
app.get('/api/files/browse', (req, res) => {
  try {
    let targetPath = req.query.path ? decodeURIComponent(req.query.path) : rootDirectory;
    
    // Safety fallback
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
        
        // Skip hidden/system files if desired
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
        // Ignore unreadable individual files/folders (permission issues)
      }
    }

    // Sort: folders first, then files alphabetically
    directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    // Compute parent directory path if not at root filesystem drive
    const parentPath = path.dirname(targetPath) !== targetPath ? path.dirname(targetPath) : null;

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

// API: Stream File with HTTP 206 Partial Content (Essential for VLC & HTML5 Video Seeking)
app.get('/api/files/stream', (req, res) => {
  try {
    const filePath = req.query.path ? decodeURIComponent(req.query.path) : null;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const contentType = mime.lookup(filePath) || 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('[Stream Error]', error);
    res.status(500).send('Error streaming media file');
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

// API: Root level M3U Playlist shortcut for password-free VLC streaming
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
    let m3uContent = '#EXTM3U\n# EXTM3U Playlist generated by AiroSMB Home Server\n\n';

    let count = 0;
    for (const item of items) {
      if (item.isFile()) {
        const fullPath = path.join(targetPath, item.name);
        const mimeType = mime.lookup(item.name) || '';
        const category = getFileCategory(mimeType, item.name);

        if (category === 'video' || category === 'audio') {
          count++;
          const streamUrl = `${baseUrl}/api/files/stream?path=${encodeURIComponent(fullPath)}`;
          m3uContent += `#EXTINF:-1,${item.name}\n${streamUrl}\n\n`;
        }
      }
    }

    const folderName = path.basename(targetPath) || 'AiroSMB_Playlist';
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
    res.send('AiroSMB Server is running. Frontend dev server is available at http://localhost:5173');
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 AiroSMB Home Server running on port ${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  const primaryIp = ips.length > 0 ? ips[0].address : '127.0.0.1';

  ips.forEach(ip => {
    console.log(`📱 LAN Network stream: http://${ip.address}:${PORT}`);
  });

  // Start DLNA SSDP Discovery Server & Scan Media Store
  try {
    await mediaStore.scanMedia(rootDirectory);
    ssdpServer.start(primaryIp, PORT);
    console.log(`📡 UPnP DLNA AV Server Active at http://${primaryIp}:${PORT}/dlna/description.xml`);
  } catch (err) {
    console.warn('[DLNA Startup Notice]', err.message);
  }

  console.log(`==================================================\n`);
});
