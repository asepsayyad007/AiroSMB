import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  
  const rawRows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawRows[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawRows[pxOffset] = r;
      rawRows[pxOffset + 1] = g;
      rawRows[pxOffset + 2] = b;
      rawRows[pxOffset + 3] = a;
    }
  }
  
  const compressed = zlib.deflateSync(rawRows);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function getGradientColor(ny) {
  if (ny <= 0.3) {
    const t = ny / 0.3;
    return [255, Math.round(93 - t * 17), Math.round(11 + t * 26)];
  } else if (ny <= 0.65) {
    const t = (ny - 0.3) / 0.35;
    return [Math.round(255 - t * 31), Math.round(76 - t * 34), Math.round(37 - t * 1)];
  } else if (ny <= 0.9) {
    const t = (ny - 0.65) / 0.25;
    return [Math.round(224 - t * 66), Math.round(42 - t * 24), Math.round(36 - t * 5)];
  } else {
    const t = (ny - 0.9) / 0.1;
    return [Math.round(158 - t * 34), Math.round(18 - t * 10), Math.round(31 - t * 12)];
  }
}

// Generate 256x256 AiroShare Perfect Sunset Icon PNG (Thickened Elements)
const pngBuffer = createPng(256, 256, (x, y, w, h) => {
  const nx = x / w;
  const ny = y / h;

  // Squircle rounded rectangle check (radius ~24%)
  const cx = Math.abs(nx - 0.5) * 2;
  const cy = Math.abs(ny - 0.5) * 2;
  const squircle = Math.pow(cx, 4) + Math.pow(cy, 4);
  
  if (squircle > 0.85) {
    return [0, 0, 0, 0]; // Transparent padding
  }

  // Pure Sunset 5-stop Gradient
  const [gr, gg, gb] = getGradientColor(ny);
  let r = gr;
  let g = gg;
  let b = gb;
  let a = 255;

  // Draw PC Monitor Frame inside (center box matching AiroShare-Perfect.svg)
  // Bezel Box coordinates: x=170 to 830, y=200 to 570
  const isMonitorFrame = (nx >= 0.17 && nx <= 0.83 && ny >= 0.20 && ny <= 0.57);
  // Bezel thickness is 60 units out of 1000 (relative 0.06)
  const isMonitorBezel = isMonitorFrame && (nx < 0.23 || nx > 0.77 || ny < 0.26 || ny > 0.51);
  // PC Stand Neck: x=450 to 550, y=575 to 655
  const isStandNeck = (nx >= 0.45 && nx <= 0.55 && ny >= 0.575 && ny <= 0.655);
  // PC Stand Base Line: x=340 to 660, y=655, thickness=50 (relative 0.025 radius)
  const isStandBase = (nx >= 0.34 && nx <= 0.66 && Math.abs(ny - 0.655) < 0.025);

  if (isMonitorBezel || isStandNeck || isStandBase) {
    return [255, 255, 255, 255]; // White monitor border & stand elements
  }
  
  if (isMonitorFrame) {
    // Screen interior fill: blend monitorScreenGrad
    r = Math.round(255 - ny * 120);
    g = Math.round(75 - ny * 50);
    b = Math.round(43 - ny * 20);
  }

  // Draw Share Network Nodes & Connection Tracks (Ultra-Thickened)
  // Node 1: cx=410, cy=385, r=38 (relative 0.038)
  const isNode1 = (Math.hypot(nx - 0.41, ny - 0.385) < 0.038);
  // Node 2: cx=585, cy=300, r=38
  const isNode2 = (Math.hypot(nx - 0.585, ny - 0.30) < 0.038);
  // Node 3: cx=585, cy=470, r=38
  const isNode3 = (Math.hypot(nx - 0.585, ny - 0.470) < 0.038);

  // Connection Tracks (Stroke width 40, i.e., relative 0.020 radius)
  const isTrack1 = distToSegment(nx, ny, 0.41, 0.385, 0.585, 0.30) < 0.020;
  const isTrack2 = distToSegment(nx, ny, 0.41, 0.385, 0.585, 0.470) < 0.020;

  if (isNode1 || isNode2 || isNode3 || isTrack1 || isTrack2) {
    return [255, 255, 255, 255];
  }

  return [r, g, b, a];
});

fs.writeFileSync('c:/Users/aseps/Downloads/Projects/AiroSMB/public/AiroShare.png', pngBuffer);
console.log('High-res 256x256 icon generated at public/AiroShare.png');
