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

// Generate 64x64 AiroShare Sunset Icon PNG
const pngBuffer = createPng(64, 64, (x, y, w, h) => {
  const nx = x / w;
  const ny = y / h;

  // Squircle rounded rectangle check (radius ~24%)
  const cx = Math.abs(nx - 0.5) * 2;
  const cy = Math.abs(ny - 0.5) * 2;
  const squircle = Math.pow(cx, 4) + Math.pow(cy, 4);
  
  if (squircle > 0.85) {
    return [0, 0, 0, 0]; // Transparent padding
  }

  // Sunset Gradient (#FF5D0B at top -> #E02A24 at bottom)
  let r = Math.round(255 - ny * 30);
  let g = Math.round(93 - ny * 50);
  let b = Math.round(11 - ny * 5);
  let a = 255;

  // Draw PC Monitor Frame inside (center box)
  const isMonitorFrame = (nx >= 0.25 && nx <= 0.75 && ny >= 0.28 && ny <= 0.56);
  const isMonitorBezel = isMonitorFrame && (nx < 0.28 || nx > 0.72 || ny < 0.31 || ny > 0.53);
  const isStand = (nx >= 0.48 && nx <= 0.52 && ny >= 0.56 && ny <= 0.65) || (nx >= 0.41 && nx <= 0.59 && ny >= 0.63 && ny <= 0.66);

  if (isMonitorBezel || isStand) {
    return [255, 255, 255, 255]; // White monitor border & stand
  }
  
  if (isMonitorFrame) {
    // Screen gradient
    r = Math.round(200 - ny * 100);
    g = Math.round(40 - ny * 20);
    b = Math.round(20 - ny * 10);
  }

  // Draw Share Nodes (White dots & lines)
  const node1 = (Math.hypot(nx - 0.43, ny - 0.42) < 0.05);
  const node2 = (Math.hypot(nx - 0.57, ny - 0.35) < 0.05);
  const node3 = (Math.hypot(nx - 0.57, ny - 0.49) < 0.05);
  
  if (node1 || node2 || node3) {
    return [255, 255, 255, 255];
  }

  return [r, g, b, a];
});

fs.writeFileSync('c:/Users/aseps/Downloads/Projects/AiroSMB/scratch/icon.png', pngBuffer);
console.log('Base64 PNG length:', pngBuffer.toString('base64').length);
console.log('Base64 PNG:', pngBuffer.toString('base64'));
