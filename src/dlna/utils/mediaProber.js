/**
 * Pure Node.js lightweight media metadata prober.
 * Reads binary file headers to extract duration, resolution and bitrate.
 * No external dependencies. Gracefully returns nulls on failure.
 */

import fs from 'fs';

// Safely read a slice of a file as a Buffer
function readSlice(filePath, offset, length) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buf, 0, length, offset);
    fs.closeSync(fd);
    return buf.slice(0, bytesRead);
  } catch {
    return null;
  }
}

// Format seconds -> "HH:MM:SS.mmm"
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// --- MP4 / M4V / MOV: Read mvhd for duration, tkhd for resolution ---
function probeMP4(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const searchSize = Math.min(stat.size, 1 * 1024 * 1024); // search first 1MB
    const buf = readSlice(filePath, 0, searchSize);
    if (!buf) return {};

    let duration = null;
    let width = 0;
    let height = 0;

    function walk(buf, start, end) {
      let i = start;
      while (i + 8 <= end) {
        let boxSize = buf.readUInt32BE(i);
        const boxType = buf.slice(i + 4, i + 8).toString('ascii');
        
        if (boxSize === 1 && i + 16 <= end) {
           boxSize = Number(buf.readBigUInt64BE(i + 8));
        }
        if (boxSize < 8 || i + boxSize > end) break;

        if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(boxType)) {
           walk(buf, i + 8, i + boxSize);
        } else if (boxType === 'mvhd') {
           const version = buf[i + 8];
           if (version === 1 && i + 40 < buf.length) {
             const timescale = buf.readUInt32BE(i + 20);
             const durationTicks = buf.readUInt32BE(i + 24) * 0x100000000 + buf.readUInt32BE(i + 28);
             if (timescale > 0) duration = durationTicks / timescale;
           } else if (version === 0 && i + 28 < buf.length) {
             const timescale = buf.readUInt32BE(i + 16);
             const durationTicks = buf.readUInt32BE(i + 20);
             if (timescale > 0) duration = durationTicks / timescale;
           }
        } else if (boxType === 'tkhd') {
           const version = buf[i + 8];
           let w = 0, h = 0;
           if (version === 1 && i + 104 <= buf.length) {
              w = buf.readUInt32BE(i + 96) >> 16;
              h = buf.readUInt32BE(i + 100) >> 16;
           } else if (version === 0 && i + 92 <= buf.length) {
              w = buf.readUInt32BE(i + 84) >> 16;
              h = buf.readUInt32BE(i + 88) >> 16;
           }
           if (w > width && h > height) {
              width = w;
              height = h;
           }
        }
        i += boxSize;
      }
    }

    walk(buf, 0, buf.length);
    return { duration: formatDuration(duration), width: width || null, height: height || null };
  } catch {}
  return {};
}

// --- MKV / WebM: Find Duration EBML element ---
function readVarInt(buf, offset) {
  if (offset >= buf.length) return { value: 0, bytesRead: 1 };
  const firstByte = buf[offset];
  if (firstByte === 0) return { value: 0, bytesRead: 8 };
  let mask = 0x80;
  let width = 1;
  while ((firstByte & mask) === 0 && width <= 8) {
    mask >>= 1;
    width++;
  }
  let value = firstByte & (mask - 1);
  for (let i = 1; i < width && (offset + i) < buf.length; i++) {
    value = (value * 256) + buf[offset + i];
  }
  return { value, bytesRead: width };
}

function probeMKV(filePath) {
  try {
    const buf = readSlice(filePath, 0, 512 * 1024);
    if (!buf) return {};

    let i = 0;
    let duration = null;
    let width = 0;
    let height = 0;
    
    while (i < buf.length - 10) {
      // Duration element ID 0x4489
      if (buf[i] === 0x44 && buf[i + 1] === 0x89) {
        const sizeVint = readVarInt(buf, i + 2);
        const dataOffset = i + 2 + sizeVint.bytesRead;
        const size = sizeVint.value;
        if (size === 4 && dataOffset + 4 <= buf.length) {
          const ms = buf.readFloatBE(dataOffset);
          duration = ms / 1000;
        } else if (size === 8 && dataOffset + 8 <= buf.length) {
          const ms = buf.readDoubleBE(dataOffset);
          duration = ms / 1000;
        }
        i += 2 + sizeVint.bytesRead + size;
        continue;
      } else if (buf[i] === 0xB0) { // PixelWidth
        const sizeVint = readVarInt(buf, i + 1);
        const dataOffset = i + 1 + sizeVint.bytesRead;
        const size = sizeVint.value;
        if (size <= 2 && dataOffset + size <= buf.length) {
          const val = size === 1 ? buf[dataOffset] : buf.readUInt16BE(dataOffset);
          if (val > width) width = val;
        }
        i += 1 + sizeVint.bytesRead + size;
        continue;
      } else if (buf[i] === 0xBA) { // PixelHeight
        const sizeVint = readVarInt(buf, i + 1);
        const dataOffset = i + 1 + sizeVint.bytesRead;
        const size = sizeVint.value;
        if (size <= 2 && dataOffset + size <= buf.length) {
          const val = size === 1 ? buf[dataOffset] : buf.readUInt16BE(dataOffset);
          if (val > height) height = val;
        }
        i += 1 + sizeVint.bytesRead + size;
        continue;
      }
      i++;
    }
    return { duration: formatDuration(duration), width: width || null, height: height || null };
  } catch {}
  return {};
}

// --- MP3: Estimate duration from sync frame + file size ---
function probeMP3(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const buf = readSlice(filePath, 0, 16 * 1024);
    if (!buf) return {};

    let offset = 0;
    // Skip ID3v2 tag
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
      const id3Size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
      offset = 10 + id3Size;
    }

    while (offset < buf.length - 4) {
      if (buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0) {
        const header = buf.readUInt32BE(offset);
        const bitrateBits = (header >> 12) & 0xf;
        const sampleBits = (header >> 10) & 0x3;
        const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
        const sampleRates = [44100, 48000, 32000];
        const bitrate = bitrateTable[bitrateBits] * 1000;
        const sampleRate = sampleRates[sampleBits] || 44100;

        if (bitrate > 0) {
          const durationSec = (stat.size * 8) / bitrate;
          return {
            duration: formatDuration(durationSec),
            bitrate,
            sampleFrequency: sampleRate,
            nrAudioChannels: ((header >> 6) & 0x3) === 3 ? 1 : 2
          };
        }
        break;
      }
      offset++;
    }
  } catch {}
  return {};
}

// --- FLAC: Read STREAMINFO block ---
function probeFLAC(filePath) {
  try {
    const buf = readSlice(filePath, 0, 512);
    if (!buf || buf.slice(0, 4).toString() !== 'fLaC') return {};
    if (buf.length < 42) return {};

    const sampleRate = (buf[18] << 12) | (buf[19] << 4) | (buf[20] >> 4);
    const channels = ((buf[20] & 0x0e) >> 1) + 1;
    const totalSamples = (
      ((buf[21] & 0x0f) * Math.pow(2, 32)) +
      (buf[22] * Math.pow(2, 24)) +
      (buf[23] * Math.pow(2, 16)) +
      (buf[24] * Math.pow(2, 8)) +
      buf[25]
    );
    const durationSec = sampleRate > 0 ? totalSamples / sampleRate : 0;
    return {
      duration: formatDuration(durationSec),
      sampleFrequency: sampleRate,
      nrAudioChannels: channels
    };
  } catch {}
  return {};
}

// --- WAV: Read fmt chunk ---
function probeWAV(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const buf = readSlice(filePath, 0, 64);
    if (!buf || buf.slice(0, 4).toString() !== 'RIFF') return {};
    if (buf.slice(8, 12).toString() !== 'WAVE') return {};

    const numChannels = buf.readUInt16LE(22);
    const sampleRate = buf.readUInt32LE(24);
    const byteRate = buf.readUInt32LE(28);

    const durationSec = byteRate > 0 ? stat.size / byteRate : 0;
    return {
      duration: formatDuration(durationSec),
      sampleFrequency: sampleRate,
      nrAudioChannels: numChannels,
      bitrate: byteRate * 8
    };
  } catch {}
  return {};
}

/**
 * Probe a media file for metadata.
 * Returns { duration, bitrate, sampleFrequency, nrAudioChannels } — all optional.
 */
export function probeMediaFile(filePath, ext) {
  const e = (ext || '').toLowerCase();
  try {
    switch (e) {
      case '.mp4': case '.m4v': case '.mov': case '.m4a':
        return probeMP4(filePath);
      case '.mkv': case '.webm': case '.mka':
        return probeMKV(filePath);
      case '.mp3':
        return probeMP3(filePath);
      case '.flac':
        return probeFLAC(filePath);
      case '.wav':
        return probeWAV(filePath);
      default:
        return {};
    }
  } catch {
    return {};
  }
}
export function getQualityFromResolution(width, height) {
  if (!width || !height) return null;
  const max = Math.max(width, height);
  if (max >= 3840) return '4K';
  if (max >= 1920) return 'FHD';
  if (max >= 1280) return 'HD';
  if (max > 0) return 'SD';
  return null;
}

export default probeMediaFile;
