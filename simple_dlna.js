import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import mediaStore from './src/dlna/contentDirectory/mediaStore.js';
import ssdpServer from './src/dlna/ssdp/ssdpServer.js';
import dlnaRouter from './src/dlna/index.js';
import mime from 'mime-types';

const args = process.argv.slice(2);
const mediaDir = args[0] ? path.resolve(args[0]) : 'C:\\Users\\aseps\\Downloads';
const PORT = parseInt(args[1], 10) || 3000;

if (!fs.existsSync(mediaDir)) {
  console.error(`❌ Media directory does not exist: ${mediaDir}`);
  process.exit(1);
}

const app = express();
app.use(express.json());

// Mount DLNA UPnP Router
app.use('/dlna', dlnaRouter);

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
        return res.status(416).send(`Requested range not satisfiable: ${start} >= ${fileSize}`);
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[Stream Error]', err.message);
    res.status(500).send('Error streaming media file');
  }
});

// Helper: Detect Primary LAN IPv4 Address
function getPrimaryIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const lower = name.toLowerCase();
    if (lower.includes('virtual') || lower.includes('vbox') || lower.includes('vmnet') || lower.includes('wsl')) continue;
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

app.listen(PORT, '0.0.0.0', async () => {
  const primaryIp = getPrimaryIp();
  console.log('\n==================================================');
  console.log(`📡 Simple Standalone DLNA / UPnP Media Server Active`);
  console.log(`📂 Sharing Directory: ${mediaDir}`);
  console.log(`🌐 Server Base URL:   http://${primaryIp}:${PORT}`);
  console.log(`📄 Device XML URL:    http://${primaryIp}:${PORT}/dlna/description.xml`);
  console.log(`📊 DLNA Dashboard:    http://${primaryIp}:${PORT}/dlna/presentation`);
  console.log('==================================================\n');

  await mediaStore.scanMedia(mediaDir);
  ssdpServer.start(primaryIp, PORT);
});
