/**
 * Pure Node.js lightweight media metadata prober.
 * Reads binary file headers to extract duration, resolution and bitrate.
 * No external dependencies. Gracefully returns nulls on failure.
 */

import fs from 'fs';
import path from 'path';

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

// --- MP4 / M4V / MOV / 3GP: Read mvhd for duration, tkhd for resolution, stts/mdhd for fps ---
function probeMP4(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const searchSize = Math.min(stat.size, 1 * 1024 * 1024); // search first 1MB
    const buf = readSlice(filePath, 0, searchSize);
    if (!buf) return {};

    let duration = null;
    let width = 0;
    let height = 0;
    let fps = null;

    function parseBoxes(buf) {
      let i = 0;
      while (i + 8 <= buf.length) {
        let boxSize = buf.readUInt32BE(i);
        const boxType = buf.slice(i + 4, i + 8).toString('ascii');
        
        if (boxSize === 1 && i + 16 <= buf.length) {
           boxSize = Number(buf.readBigUInt64BE(i + 8));
        }
        if (boxSize < 8 || i + boxSize > buf.length) {
          // If unaligned or malformed size, attempt linear scan for tkhd / mvhd
          break;
        }

        if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(boxType)) {
           const innerBuf = buf.slice(i + 8, i + boxSize);
           parseBoxes(innerBuf);
        } else if (boxType === 'mvhd') {
           const version = buf[i + 8];
           if (version === 1 && i + 40 <= buf.length) {
             const timescale = buf.readUInt32BE(i + 20);
             const durationTicks = buf.readUInt32BE(i + 24) * 0x100000000 + buf.readUInt32BE(i + 28);
             if (timescale > 0) duration = durationTicks / timescale;
           } else if (version === 0 && i + 28 <= buf.length) {
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
           if (w > width && h > height && w < 32768 && h < 32768) {
              width = w;
              height = h;
           }
        }
        i += boxSize;
      }
    }

    parseBoxes(buf);

    function findMP4FPS(buf) {
      if (!buf) return null;
      let mdhdTimescale = null;
      let mdhdIdx = 0;
      while ((mdhdIdx = buf.indexOf('mdhd', mdhdIdx)) !== -1) {
        if (mdhdIdx + 24 <= buf.length) {
          const version = buf[mdhdIdx + 4];
          const ts = version === 1 ? buf.readUInt32BE(mdhdIdx + 20) : buf.readUInt32BE(mdhdIdx + 16);
          if (ts > 100 && ts < 1000000) {
            mdhdTimescale = ts;
            break;
          }
        }
        mdhdIdx += 4;
      }

      let sttsIdx = 0;
      while ((sttsIdx = buf.indexOf('stts', sttsIdx)) !== -1) {
        if (sttsIdx + 20 <= buf.length) {
          const sampleDelta = buf.readUInt32BE(sttsIdx + 16);
          if (sampleDelta > 0 && mdhdTimescale) {
            const rawFps = mdhdTimescale / sampleDelta;
            if (rawFps >= 10 && rawFps <= 240) return Math.round(rawFps);
          }
        }
        sttsIdx += 4;
      }
      return null;
    }

    fps = findMP4FPS(buf);

    // Fallback: If moov atom is at the end of the MP4 file (non-faststart)
    if (stat.size > searchSize) {
      const tailSize = Math.min(stat.size, 4 * 1024 * 1024);
      const tailBuf = readSlice(filePath, stat.size - tailSize, tailSize);
      if (tailBuf) {
        if (!width || !height) {
          let idx = 0;
          while (idx < tailBuf.length - 16) {
            if (tailBuf.slice(idx, idx + 4).toString('ascii') === 'tkhd') {
               const version = tailBuf[idx + 4];
               let w = 0, h = 0;
               if (version === 1 && idx + 100 <= tailBuf.length) {
                 w = tailBuf.readUInt32BE(idx + 92) >> 16;
                 h = tailBuf.readUInt32BE(idx + 96) >> 16;
               } else if (version === 0 && idx + 88 <= tailBuf.length) {
                 w = tailBuf.readUInt32BE(idx + 80) >> 16;
                 h = tailBuf.readUInt32BE(idx + 84) >> 16;
               }
               if (w > width && h > height && w < 32768 && h < 32768) {
                 width = w;
                 height = h;
               }
            }
            idx++;
          }
        }
        if (!fps) fps = findMP4FPS(tailBuf);
      }
    }

    return { duration: formatDuration(duration), width: width || null, height: height || null, fps: fps || null };
  } catch {}
  return {};
}

// --- MKV / WebM: Find Duration, Resolution & FPS EBML elements ---
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
    const stat = fs.statSync(filePath);
    const searchSize = Math.min(stat.size, 2 * 1024 * 1024); // search first 2MB
    const buf = readSlice(filePath, 0, searchSize);
    if (!buf) return {};

    let i = 0;
    let duration = null;
    let width = 0;
    let height = 0;
    let fps = null;
    
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
        if (size > 0 && size <= 4 && dataOffset + size <= buf.length) {
          let val = 0;
          for (let k = 0; k < size; k++) val = (val * 256) + buf[dataOffset + k];
          if (val > width && val < 65536) width = val;
        }
        i += 1 + sizeVint.bytesRead + size;
        continue;
      } else if (buf[i] === 0xBA) { // PixelHeight
        const sizeVint = readVarInt(buf, i + 1);
        const dataOffset = i + 1 + sizeVint.bytesRead;
        const size = sizeVint.value;
        if (size > 0 && size <= 4 && dataOffset + size <= buf.length) {
          let val = 0;
          for (let k = 0; k < size; k++) val = (val * 256) + buf[dataOffset + k];
          if (val > height && val < 65536) height = val;
        }
        i += 1 + sizeVint.bytesRead + size;
        continue;
      } else if (buf[i] === 0x23 && buf[i + 1] === 0xe3 && buf[i + 2] === 0x83) { // DefaultDuration
        let vIntSize = 1;
        let firstByte = buf[i + 3];
        let mask = 0x80;
        while ((firstByte & mask) === 0 && vIntSize <= 8) {
          mask >>= 1;
          vIntSize++;
        }
        let dataLen = firstByte & (mask - 1);
        for (let k = 1; k < vIntSize && (i + 3 + k) < buf.length; k++) {
          dataLen = (dataLen * 256) + buf[i + 3 + k];
        }
        const dataOffset = i + 3 + vIntSize;
        if (dataLen > 0 && dataLen <= 8 && dataOffset + dataLen <= buf.length) {
          let ns = 0;
          for (let k = 0; k < dataLen; k++) ns = (ns * 256) + buf[dataOffset + k];
          if (ns > 0) {
            const rawFps = 1000000000 / ns;
            if (rawFps >= 10 && rawFps <= 240) fps = Math.round(rawFps);
          }
        }
        i += 3 + vIntSize + dataLen;
        continue;
      }
      i++;
    }
    return { duration: formatDuration(duration), width: width || null, height: height || null, fps: fps || null };
  } catch {}
  return {};
}

// --- AVI / DIVX: Read avih header chunk ---
function probeAVI(filePath) {
  try {
    const buf = readSlice(filePath, 0, 1 * 1024 * 1024);
    if (!buf || buf.length < 56) return {};
    if (buf.slice(0, 4).toString('ascii') !== 'RIFF') return {};
    if (buf.slice(8, 12).toString('ascii') !== 'AVI ') return {};

    const idx = buf.indexOf('avih');
    if (idx !== -1 && idx + 44 <= buf.length) {
      const microSec = buf.readUInt32LE(idx + 8);
      const totalFrames = buf.readUInt32LE(idx + 24);
      const width = buf.readUInt32LE(idx + 40);
      const height = buf.readUInt32LE(idx + 44);
      const durationSec = microSec > 0 && totalFrames > 0 ? (microSec * totalFrames) / 1000000 : null;
      let fps = microSec > 0 ? Math.round(1000000 / microSec) : null;
      if (fps && (fps < 10 || fps > 240)) fps = null;

      return {
        duration: formatDuration(durationSec),
        width: (width > 0 && width < 32768) ? width : null,
        height: (height > 0 && height < 32768) ? height : null,
        fps
      };
    }
  } catch {}
  return {};
}

// --- WMV / ASF: Read Stream Properties for video width/height ---
function probeWMV(filePath) {
  try {
    const buf = readSlice(filePath, 0, 512 * 1024);
    if (!buf || buf.length < 80) return {};
    // ASF Header Object GUID: 30 26 B2 75 8E 66 CF 11 A6 D9 00 AA 00 62 CE 6C
    if (buf[0] !== 0x30 || buf[1] !== 0x26 || buf[2] !== 0xb2 || buf[3] !== 0x75) return {};

    // Look for Video Stream Properties GUID: 16 11 64 F8 DA 79 D2 11 B9 61 00 C0 4F 72 C2 38
    for (let i = 0; i < buf.length - 80; i++) {
      if (
        buf[i] === 0x16 && buf[i + 1] === 0x11 && buf[i + 2] === 0x64 && buf[i + 3] === 0xf8 &&
        buf[i + 4] === 0xda && buf[i + 5] === 0x79 && buf[i + 6] === 0xd2 && buf[i + 7] === 0x11
      ) {
        // Stream Properties object found
        const width = buf.readUInt32LE(i + 72);
        const height = buf.readUInt32LE(i + 76);
        if (width > 0 && height > 0 && width < 32768 && height < 32768) {
          return { width, height };
        }
      }
    }
  } catch {}
  return {};
}

// --- FLV / F4V: Read AMF metadata ---
function probeFLV(filePath) {
  try {
    const buf = readSlice(filePath, 0, 256 * 1024);
    if (!buf || buf.length < 30) return {};
    if (buf.slice(0, 3).toString('ascii') !== 'FLV') return {};

    let width = 0;
    let height = 0;
    let fps = null;

    const wIdx = buf.indexOf('width');
    if (wIdx !== -1 && wIdx + 13 <= buf.length) {
      if (buf[wIdx + 5] === 0x00) { // AMF0 number (double)
        width = Math.round(buf.readDoubleBE(wIdx + 6));
      }
    }

    const hIdx = buf.indexOf('height');
    if (hIdx !== -1 && hIdx + 14 <= buf.length) {
      if (buf[hIdx + 6] === 0x00) { // AMF0 number (double)
        height = Math.round(buf.readDoubleBE(hIdx + 7));
      }
    }

    const fIdx = buf.indexOf('framerate');
    if (fIdx !== -1 && fIdx + 17 <= buf.length) {
      if (buf[fIdx + 9] === 0x00) {
        const rawFps = Math.round(buf.readDoubleBE(fIdx + 10));
        if (rawFps >= 10 && rawFps <= 240) fps = rawFps;
      }
    }

    if (width > 0 && height > 0 && width < 32768 && height < 32768) {
      return { width, height, fps };
    }
  } catch {}
  return {};
}

// --- MPEG / TS / M2TS / VOB: Read Sequence Header 0x000001B3 ---
function probeMPEG(filePath) {
  try {
    const buf = readSlice(filePath, 0, 1024 * 1024);
    if (!buf || buf.length < 12) return {};

    for (let i = 0; i < buf.length - 8; i++) {
      if (buf[i] === 0x00 && buf[i + 1] === 0x00 && buf[i + 2] === 0x01 && buf[i + 3] === 0xb3) {
        const width = (buf[i + 4] << 4) | (buf[i + 5] >> 4);
        const height = ((buf[i + 5] & 0x0f) << 8) | buf[i + 6];
        const frameRateCode = buf[i + 7] & 0x0f;
        const frameRates = [0, 23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
        let fps = frameRates[frameRateCode] ? Math.round(frameRates[frameRateCode]) : null;

        if (width > 0 && height > 0 && width < 32768 && height < 32768) {
          return { width, height, fps };
        }
      }
    }
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
 * Sniff binary magic header when extension is unlisted or ambiguous.
 */
function probeByMagicHeader(filePath) {
  try {
    const buf = readSlice(filePath, 0, 4096);
    if (!buf || buf.length < 8) return {};

    // MP4 / MOV / M4V: ftyp box at offset 4
    if (buf.slice(4, 8).toString('ascii') === 'ftyp' || buf.slice(4, 8).toString('ascii') === 'moov') {
      return probeMP4(filePath);
    }
    // MKV / WebM: EBML header 0x1A45DFA3
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
      return probeMKV(filePath);
    }
    // AVI
    if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'AVI ') {
      return probeAVI(filePath);
    }
    // WMV / ASF
    if (buf[0] === 0x30 && buf[1] === 0x26 && buf[2] === 0xb2 && buf[3] === 0x75) {
      return probeWMV(filePath);
    }
    // FLV
    if (buf.slice(0, 3).toString('ascii') === 'FLV') {
      return probeFLV(filePath);
    }
    // MPEG / TS sequence header
    if (buf.includes(Buffer.from([0x00, 0x00, 0x01, 0xb3]))) {
      return probeMPEG(filePath);
    }
  } catch {}
  return {};
}

/**
 * Probe a media file for metadata.
 * Returns { duration, width, height, fps, bitrate, sampleFrequency, nrAudioChannels } — all optional.
 */
export function probeMediaFile(filePath, ext) {
  const e = (ext || path.extname(filePath) || '').toLowerCase();
  try {
    let result = {};
    switch (e) {
      case '.mp4': case '.m4v': case '.mov': case '.m4a': case '.3gp': case '.3g2': case '.qt':
        result = probeMP4(filePath);
        break;
      case '.mkv': case '.webm': case '.mka':
        result = probeMKV(filePath);
        break;
      case '.avi': case '.divx':
        result = probeAVI(filePath);
        break;
      case '.wmv': case '.asf':
        result = probeWMV(filePath);
        break;
      case '.flv': case '.f4v':
        result = probeFLV(filePath);
        break;
      case '.ts': case '.m2ts': case '.mts': case '.mpg': case '.mpeg': case '.vob': case '.m2v':
        result = probeMPEG(filePath);
        break;
      case '.mp3':
        result = probeMP3(filePath);
        break;
      case '.flac':
        result = probeFLAC(filePath);
        break;
      case '.wav':
        result = probeWAV(filePath);
        break;
      default:
        result = {};
    }

    if (!result.width && !result.height && !result.duration) {
      const magicResult = probeByMagicHeader(filePath);
      return { ...result, ...magicResult };
    }
    return result;
  } catch {
    return {};
  }
}

export function getQualityFromResolution(width, height, fps) {
  if (!width || !height) return null;
  const max = Math.max(width, height);
  let q = null;
  if (max >= 7680) q = '8K';
  else if (max >= 3500) q = '4K';
  else if (max >= 2400) q = '2K';
  else if (max >= 1800) q = 'FHD';
  else if (max >= 1200) q = 'HD';
  else if (max > 0) q = 'SD';

  if (!q) return null;

  if (fps && fps >= 58) {
    const fpsRound = Math.round(fps);
    return `${q} ${fpsRound}FPS`;
  }
  return q;
}

export default probeMediaFile;

