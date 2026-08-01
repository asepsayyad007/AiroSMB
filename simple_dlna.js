import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import cors from 'cors';
import mediaStore from './src/dlna/contentDirectory/mediaStore.js';
import ssdpServer from './src/dlna/ssdp/ssdpServer.js';
import dlnaRouter from './src/dlna/index.js';
import getDeviceIcon from './src/dlna/device/icons.js';
import handleMediaStream from './src/dlna/utils/streamHandler.js';

// --- Default Media Directory ---
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

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: ['text/xml', 'application/xml'] }));

// Mount DLNA UPnP Router
app.use('/dlna', dlnaRouter);

// UPnP Device Icons
app.get('/icon-:size.png', (req, res) => {
  const size = parseInt(req.params.size, 10);
  res.setHeader('Content-Type', 'image/png');
  res.send(getDeviceIcon(size));
});

// Stream Endpoint
app.get('/api/files/stream', handleMediaStream);

// --- Start Server ---
const PORT = await findFreePort(PREFERRED_PORT);
if (PORT !== PREFERRED_PORT) {
  console.warn(`\n⚠️  Port ${PREFERRED_PORT} is busy — using port ${PORT} instead.`);
}

const primaryIp = getPrimaryIp();

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('\n==================================================');
  console.log(`⚡ AiroSMB High-Performance Gigabit DLNA Media Server`);
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

// --- Graceful Process Shutdown ---
function shutdown() {
  console.log('\n[AiroSMB] Shutting down DLNA server...');
  ssdpServer.stop();
  server.close(() => {
    console.log('[AiroSMB] HTTP Server closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
