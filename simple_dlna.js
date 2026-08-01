import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import mediaStore from './src/dlna/contentDirectory/mediaStore.js';
import ssdpServer from './src/dlna/ssdp/ssdpServer.js';
import dlnaRouter from './src/dlna/index.js';
import mime from 'mime-types';

// --- Default media directory ---
const defaultVideosDir = path.join(os.homedir(), 'Downloads', 'Video');
if (!fs.existsSync(defaultVideosDir)) {
  try { fs.mkdirSync(defaultVideosDir, { recursive: true }); } catch (e) {}
}

const args = process.argv.slice(2);
const mediaDir = args[0]
  ? path.resolve(args[0])
  : (fs.existsSync(defaultVideosDir) ? defaultVideosDir : path.join(os.homedir(), 'Downloads'));
const PREFERRED_PORT = parseInt(args[1], 10) || 3000;

if (!fs.existsSync(mediaDir)) {
  console.error(`❌ Media directory does not exist: ${mediaDir}`);
  process.exit(1);
}

// --- Helper: Detect Primary LAN IPv4 Address ---
function getPrimaryIp() {
  const interfaces = os.networkInterfaces();
  // Sort to prefer Wi-Fi/Ethernet adapters
  const names = Object.keys(interfaces).sort((a, b) => {
    const aIsPhysical = /wi-fi|wifi|ethernet|local area connection/i.test(a);
    const bIsPhysical = /wi-fi|wifi|ethernet|local area connection/i.test(b);
    return (bIsPhysical ? 1 : 0) - (aIsPhysical ? 1 : 0);
  });

  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower.includes('virtual') || lower.includes('vbox') || lower.includes('vmnet') || lower.includes('wsl') || lower.includes('loopback')) continue;
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// --- Helper: Find a free TCP port starting from preferred ---
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

import getDeviceIcon from './src/dlna/device/icons.js';
import cors from 'cors';

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ['text/xml', 'application/xml'] }));

// Mount DLNA UPnP Router
app.use('/dlna', dlnaRouter);

// UPnP Device Icons (required by the UPnP spec for device recognition)
app.get('/icon-:size.png', (req, res) => {
  const size = parseInt(req.params.size, 10);
  res.setHeader('Content-Type', 'image/png');
  res.send(getDeviceIcon(size));
});

// Media Streaming Endpoint with HTTP 206 Range seeking support
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
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return res.status(416).send(`Range not satisfiable`);
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[Stream Error]', err.message);
    res.status(500).send('Error streaming media file');
  }
});

// --- Start Server ---
const PORT = await findFreePort(PREFERRED_PORT);
if (PORT !== PREFERRED_PORT) {
  console.warn(`\n⚠️  Port ${PREFERRED_PORT} is busy — using port ${PORT} instead.`);
}

const primaryIp = getPrimaryIp();

app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n==================================================');
  console.log(`📡 AiroSMB Standalone DLNA / UPnP Media Server`);
  console.log(`📂 Sharing:    ${mediaDir}`);
  console.log(`🌐 LAN URL:    http://${primaryIp}:${PORT}`);
  console.log(`📄 Device XML: http://${primaryIp}:${PORT}/dlna/description.xml`);
  console.log(`📊 Dashboard:  http://${primaryIp}:${PORT}/dlna/presentation`);
  console.log('==================================================\n');

  // Scan media files
  await mediaStore.scanMedia(mediaDir);

  // Start SSDP broadcaster — use detected LAN IP
  ssdpServer.start(primaryIp, PORT);

  console.log('\n✅ DLNA server ready! Open VLC -> View -> Playlist -> Universal Plug\'n\'Play');
  console.log(`✅ Or open on your TV: http://${primaryIp}:${PORT}/dlna/presentation\n`);
});
