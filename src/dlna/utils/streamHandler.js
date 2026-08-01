import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import clientTracker from '../../utils/clientTracker.js';

// High-performance streaming buffer: 1 MB chunks to saturate Gigabit LAN
const STREAM_HIGH_WATER_MARK = 1024 * 1024;

/**
 * Production Media Stream Handler for HTTP 206 & 200 responses
 */
export function handleMediaStream(req, res) {
  try {
    const filePath = req.query.path ? decodeURIComponent(req.query.path) : null;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return res.status(400).send('Path is not a file');
    }

    const fileSize = stat.size;
    const range = req.headers.range;
    const contentType = mime.lookup(filePath) || 'video/mp4';
    const fileName = path.basename(filePath);

    // Track active client
    const userAgent = req.headers['user-agent'] || 'Media Player';
    clientTracker.logActivity({
      ip: req.ip || req.socket?.remoteAddress,
      device: userAgent.includes('VLC') ? 'VLC Media Player' : userAgent,
      protocol: 'DLNA / HTTP Stream',
      activity: `Streaming "${fileName}"`
    });

    console.log(`[DLNA Stream] ${req.ip} -> Playing "${fileName}" (${range ? 'Range: ' + range : 'Full Play'})`);

    // Optimize TCP socket for zero latency & high throughput
    if (req.socket) {
      req.socket.setNoDelay(true);
      req.socket.setKeepAlive(true, 15000);
    }

    const dlnaHeaders = {
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=60, max=10000',
      'transferMode.dlna.org': 'Streaming',
      'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
      'Cache-Control': 'public, max-age=31536000'
    };

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        return res.status(416).send(`Requested range not satisfiable: ${start} >= ${fileSize}`);
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        ...dlnaHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize
      });

      const stream = fs.createReadStream(filePath, {
        start,
        end,
        highWaterMark: STREAM_HIGH_WATER_MARK
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        ...dlnaHeaders,
        'Content-Length': fileSize
      });

      const stream = fs.createReadStream(filePath, {
        highWaterMark: STREAM_HIGH_WATER_MARK
      });
      stream.pipe(res);
    }
  } catch (err) {
    console.error('[Stream Error]', err.message);
    if (!res.headersSent) {
      res.status(500).send('Error streaming media file');
    }
  }
}

export default handleMediaStream;
