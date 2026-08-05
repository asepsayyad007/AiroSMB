/**
 * Keyless Movie & Media Poster Fetcher
 * Fetches high-quality artwork from iTunes Search API and TVMaze API.
 * 100% FREE, ZERO API KEY REQUIRED, ZERO REGISTRATION.
 * No external npm dependencies — uses Node built-in https/http modules.
 */

import https from 'https';
import http from 'http';
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
 * Generate a safe file hash from a media title
 */
function getTitleHash(title) {
  return crypto.createHash('md5').update(title.toLowerCase().trim()).digest('hex');
}

/**
 * Remove resolution tags, codecs, release groups, dots, and underscores
 * from a filename to get a clean search title.
 */
export function cleanMediaName(filename) {
  if (!filename) return { title: '', year: null, quality: null };

  // Strip query parameters or URL artifacts if passed
  let name = filename.replace(/[&?].*$/, '').trim();

  // Strip file extension
  name = name.replace(/\.[^.]+$/, '');

  // Extract year if present (4-digit, 1900–2099)
  const yearMatch = name.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : null;

  // Detect quality tag from filename
  let quality = null;
  if (/\b(4320p|8k)\b/i.test(name)) {
    quality = '8K';
  } else if (/\b(2160p|4k|uhd|ds4k)\b/i.test(name)) {
    quality = '4K';
  } else if (/\b(1440p|2k|qhd|wqhd)\b/i.test(name)) {
    quality = '2K';
  } else if (/\b(1080p|fhd|fullhd|1080i)\b/i.test(name)) {
    quality = 'FHD';
  } else if (/\b(720p|hd|720i)\b/i.test(name)) {
    quality = 'HD';
  } else if (/\b(480p|576p|360p|240p|sd|dvd)\b/i.test(name)) {
    quality = 'SD';
  }

  // Remove resolution, quality, source, audio, codec, website release group tags
  name = name.replace(/\b(1080p|720p|480p|2160p|4320p|1440p|8k|4k|2k|uhd|hdr|sdr|bluray|blu-ray|bdrip|brrip|webrip|web-dl|webdl|dvdrip|hdtv|hq|hd|x264|x265|h264|h265|hevc|avc|xvid|divx|ac3|aac|dts|ddp5\.1|ddp|esub|sub|hindi|english|telugu|tamil|punjabi|malayalam|kannada|bengali|marathi|dual|multi|audio|extended|theatrical|remastered|criterion|proper|remux|amzn|nf|hmax|hdhub4u|yts|yify|rarbg|1337x|mkv|mp4|avi|tv)\b.*/i, '');

  // If year was found, truncate at the year index
  if (year) {
    const yearIdx = name.indexOf(year);
    if (yearIdx > 0) {
      name = name.substring(0, yearIdx);
    }
  }

  // Replace dots, underscores, hyphens with spaces and strip bracketed content
  name = name
    .replace(/[._\-]/g, ' ')
    .replace(/[\[(].*?[\])]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: name || filename.replace(/\.[^.]+$/, ''), year, quality };
}

/**
 * Perform an HTTPS GET and return response body as a string.
 * Supports follow redirects (up to 3).
 */
function httpsGet(urlStr, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) return reject(new Error('Too many redirects'));

    const parsed = new URL(urlStr);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

/**
 * Download an image from a URL to a local destination file.
 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return reject(new Error(`Failed image download: HTTP ${res.statusCode}`));
      }

      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });

    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlink(destPath, () => {});
      reject(err);
    });

    req.setTimeout(12000, () => {
      req.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlink(destPath, () => {});
      reject(new Error('Image download timeout'));
    });
  });
}

/**
 * 1. Search iTunes Store API (Keyless, broad search without strict entity filter)
 */
async function searchITunes(query) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=5`;
    const { statusCode, body } = await httpsGet(url);
    if (statusCode !== 200) return null;

    const json = JSON.parse(body);
    if (!json.results || json.results.length === 0) return null;

    // Prefer feature-movie or track matching query
    let match = json.results.find(r =>
      r.kind === 'feature-movie' ||
      (r.trackName && r.trackName.toLowerCase().includes(query.toLowerCase()))
    );

    if (!match) match = json.results[0];

    const rawArtwork = match.artworkUrl100 || match.artworkUrl60;
    if (!rawArtwork) return null;

    // Upscale artwork to 600x600 high resolution poster
    const highResArtwork = rawArtwork.replace(/\/\d+x\d+bb\./, '/600x600bb.');

    return {
      title: match.trackName || match.collectionName || query,
      year: match.releaseDate ? match.releaseDate.slice(0, 4) : null,
      artworkUrl: highResArtwork,
      source: 'iTunes'
    };
  } catch {
    return null;
  }
}

/**
 * 2. Search TVMaze API (TV Shows & Series) — Keyless
 */
async function searchTVMaze(query) {
  try {
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}`;
    const { statusCode, body } = await httpsGet(url);
    if (statusCode !== 200) return null;

    const show = JSON.parse(body);
    if (!show || !show.image) return null;

    const artworkUrl = show.image.original || show.image.medium;
    if (!artworkUrl) return null;

    return {
      title: show.name || query,
      year: show.premiered ? show.premiered.slice(0, 4) : null,
      artworkUrl: artworkUrl,
      source: 'TVMaze'
    };
  } catch {
    return null;
  }
}

/**
 * Check if thumbnail is already cached on disk for a filename
 */
export function getCachedPosterPath(titleHash) {
  const dest = path.join(CACHE_DIR, `${titleHash}.jpg`);
  return fs.existsSync(dest) ? dest : null;
}

/**
 * Main keyless poster fetcher:
 * 1. Checks local disk cache
 * 2. Tries iTunes Movie search
 * 3. Tries TVMaze TV show search
 * 4. Tries iTunes Music/All media search
 * Downloads and caches the poster if found.
 */
export async function fetchPoster(filename) {
  const cleaned = cleanMediaName(filename);
  const searchTitle = cleaned.title || filename;
  const hash = getTitleHash(searchTitle);
  const cachedPath = getCachedPosterPath(hash);

  if (cachedPath) {
    return { titleHash: hash, cached: true };
  }

  ensureCacheDir();

  // Try iTunes Search first
  let match = await searchITunes(searchTitle);

  // If no iTunes match, try TVMaze show search
  if (!match) {
    match = await searchTVMaze(searchTitle);
  }

  if (!match || !match.artworkUrl) return null;

  const destPath = path.join(CACHE_DIR, `${hash}.jpg`);

  try {
    await downloadImage(match.artworkUrl, destPath);
    return {
      titleHash: hash,
      title: match.title,
      year: match.year,
      source: match.source,
      cached: true
    };
  } catch {
    return null;
  }
}

export default fetchPoster;
