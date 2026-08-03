/**
 * 100% Offline / Local Thumbnail Generator
 * Generates crisp, accurate video frame thumbnails using native OS shell APIs
 * and auto-detects local sidecar cover art (poster.jpg, cover.jpg, <filename>.jpg).
 *
 * NO INTERNET APIS — 100% OFFLINE, LOCAL & PRIVATE.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.resolve('./cache/thumbnails');

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Wipe all cached thumbnail files from disk to force a fresh re-extraction.
 */
export function clearThumbnailCache() {
  ensureCacheDir();
  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(CACHE_DIR, f));
      } catch (e) {}
    }
  } catch (e) {}
}

/**
 * Generate a unique, stable MD5 hash for a file path.
 */
export function getPathHash(filePath) {
  if (!filePath) return 'default';
  return crypto.createHash('md5').update(filePath.toLowerCase().trim()).digest('hex');
}

/**
 * Get the path to a cached thumbnail if it exists on disk.
 */
export function getCachedThumbnailPath(filePath) {
  if (!filePath) return null;
  const hash = getPathHash(filePath);

  // Check PNG cache (native frame)
  const pngPath = path.join(CACHE_DIR, `${hash}.png`);
  if (fs.existsSync(pngPath)) return pngPath;

  // Check JPEG cache (sidecar copy)
  const jpgPath = path.join(CACHE_DIR, `${hash}.jpg`);
  if (fs.existsSync(jpgPath)) return jpgPath;

  return null;
}

/**
 * Check for local sidecar image files in the same directory:
 * - <filename>.jpg / .png / .webp
 * - cover.jpg / poster.jpg / folder.jpg / thumb.jpg
 */
export function findLocalSidecarImage(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);

  // 1. Check exact sidecar matches: videoName.jpg, videoName.png, videoName.webp
  const sidecarExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  for (const sExt of sidecarExts) {
    const sidecarPath = path.join(dir, `${baseName}${sExt}`);
    if (fs.existsSync(sidecarPath)) return sidecarPath;
  }

  // 2. Check folder cover art: cover.jpg, poster.jpg, folder.jpg, thumb.jpg
  const folderImageNames = ['poster', 'cover', 'folder', 'thumb', 'fanart'];
  for (const fName of folderImageNames) {
    for (const sExt of sidecarExts) {
      const folderImagePath = path.join(dir, `${fName}${sExt}`);
      if (fs.existsSync(folderImagePath)) return folderImagePath;
    }
  }

  return null;
}

/**
 * Generate a local video frame thumbnail using Electron's nativeImage API
 * (or copy local sidecar cover art if found).
 * Returns the cached thumbnail path or null.
 */
export async function generateLocalThumbnail(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  ensureCacheDir();
  const hash = getPathHash(filePath);

  // 1. If already cached, return immediately
  const existingCache = getCachedThumbnailPath(filePath);
  if (existingCache) return existingCache;

  // 2. Check for local sidecar image (poster.jpg, <filename>.jpg)
  const sidecar = findLocalSidecarImage(filePath);
  if (sidecar) {
    const destJpg = path.join(CACHE_DIR, `${hash}.jpg`);
    try {
      fs.copyFileSync(sidecar, destJpg);
      return destJpg;
    } catch (e) {
      // Fall through to native generator if copy fails
    }
  }

  // 3. Native OS Video Frame Thumbnail Extraction via Electron
  try {
    let electronNativeImage = null;
    try {
      // Dynamic import of electron for Node compatibility
      const electron = await import('electron');
      electronNativeImage = electron.nativeImage || electron.default?.nativeImage;
    } catch (e) {
      // Not running inside Electron main process
    }

    if (electronNativeImage && typeof electronNativeImage.createThumbnailFromPath === 'function') {
      const img = await electronNativeImage.createThumbnailFromPath(filePath, { width: 384, height: 216 });
      if (img && !img.isEmpty()) {
        const pngBuf = img.toPNG();
        if (pngBuf && pngBuf.length > 0) {
          const destPng = path.join(CACHE_DIR, `${hash}.png`);
          fs.writeFileSync(destPng, pngBuf);
          return destPng;
        }
      }
    }
  } catch (err) {
    // Native thumbnail extraction failed (non-video file or unsupported format)
  }

  return null;
}

export default generateLocalThumbnail;
