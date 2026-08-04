import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import dlnaConfig from '../../../config/dlna.js';
import probeMediaFile, { getQualityFromResolution } from '../utils/mediaProber.js';
import { cleanMediaName } from '../utils/posterFetcher.js';
import chokidar from 'chokidar';

/**
 * Robust UPnP / DLNA MediaStore
 * Maps standard UPnP container IDs and provides flat + hierarchical directory trees
 */
class MediaStore {
  constructor() {
    this.rootPath = dlnaConfig.mediaRoot;
    this.containers = new Map();
    this.items = new Map();
    this.lastScanTime = null;
    this.isScanning = false;
    this.scanPending = false;
    this.systemUpdateId = 1;
    this.watcher = null;
    this.scanTimeout = null;

    this.initContainers();
  }

  initContainers() {
    this.containers.clear();

    // 0: Master Root Container
    this.containers.set('0', {
      id: '0',
      parentId: '-1',
      title: 'AiroShare Media Share',
      upnpClass: 'object.container.storageFolder',
      childCount: 6,
      childrenIds: ['0/all', '0/movies', '0/videos', '0/tvshows', '0/music', '0/photos']
    });

    // 0/all: All Videos & Media
    this.containers.set('0/all', {
      id: '0/all',
      parentId: '0',
      title: 'All Videos & Media',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/movies: Movies Container
    this.containers.set('0/movies', {
      id: '0/movies',
      parentId: '0',
      title: 'Movies',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/videos: Videos Container
    this.containers.set('0/videos', {
      id: '0/videos',
      parentId: '0',
      title: 'Videos',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/tvshows: TV Shows Container
    this.containers.set('0/tvshows', {
      id: '0/tvshows',
      parentId: '0',
      title: 'TV Shows',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/music: Music Container
    this.containers.set('0/music', {
      id: '0/music',
      parentId: '0',
      title: 'Music',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/photos: Photos Container
    this.containers.set('0/photos', {
      id: '0/photos',
      parentId: '0',
      title: 'Photos',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });
  }

  resolveContainerId(id) {
    if (!id || id === '0' || id === 'root' || id === '-1') return '0';
    const lower = String(id).toLowerCase().trim();

    if (['0/all', 'all'].includes(lower)) return '0/all';
    if (['0/movies', 'movies', 'movie'].includes(lower)) return '0/movies';
    if (['0/videos', 'videos', 'video', 'v', '1', '0/1'].includes(lower)) return '0/videos';
    if (['0/tvshows', 'tvshows', 'tvshow', 'tv'].includes(lower)) return '0/tvshows';
    if (['0/music', 'music', 'audio', 'a', '2', '0/2'].includes(lower)) return '0/music';
    if (['0/photos', 'photos', 'photo', 'images', 'image', 'p', '3', '0/3'].includes(lower)) return '0/photos';

    if (this.containers.has(id)) return id;
    return id;
  }

  startWatcher(targetDirectory = this.rootPath, dlnaConfig = null) {
    if (this.watcher) {
      this.watcher.close();
    }
    
    this.rootPath = targetDirectory;
    this.dlnaConfig = dlnaConfig || { useMaster: true };
    
    // Initial scan
    this.scanMedia();
    
    let watchPaths = [this.rootPath];
    if (!this.dlnaConfig.useMaster) {
      watchPaths = [
        this.dlnaConfig.videos,
        this.dlnaConfig.photos,
        this.dlnaConfig.music
      ].filter(p => p && fs.existsSync(p));
    }

    if (watchPaths.length === 0) return;

    console.log(`[DLNA MediaStore] Starting live directory watcher on:`, watchPaths);
    
    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true, // We already do an initial scan
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    const triggerRescan = (event, path) => {
      console.log(`[DLNA MediaStore] Detected ${event} at ${path}. Scheduling rebuild...`);
      if (this.scanTimeout) clearTimeout(this.scanTimeout);
      this.scanTimeout = setTimeout(() => {
        console.log(`[DLNA MediaStore] Rebuilding media store after changes...`);
        this.scanMedia(this.rootPath);
      }, 5000); // 5 second debounce
    };

    this.watcher
      .on('add', path => triggerRescan('file added', path))
      .on('change', path => triggerRescan('file changed', path))
      .on('unlink', path => triggerRescan('file removed', path))
      .on('unlinkDir', path => triggerRescan('directory removed', path))
      .on('error', error => console.error(`[DLNA MediaStore] Watcher error: ${error}`));
  }

  async scanMedia() {
    if (this.isScanning) {
      this.scanPending = true;
      return;
    }
    this.isScanning = true;
    this.scanPending = false;

    try {
      this.systemUpdateId++;
      this.initContainers();
      this.items.clear();

      const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.m4v', '.ts', '.wmv', '.3gp', '.mpg', '.mpeg', '.m2ts', '.vob', '.ogv'];
      const audioExts = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus', '.alac'];
      const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];

      const scanDir = (dirPath, parentContainerId = '0/all') => {
        let entries = [];
        try {
          entries = fs.readdirSync(dirPath, { withFileTypes: true });
        } catch (e) {
          return;
        }

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            const folderContainerId = `dir:${Buffer.from(fullPath).toString('hex')}`;
            if (!this.containers.has(folderContainerId)) {
              const folderContainer = {
                id: folderContainerId,
                parentId: parentContainerId,
                title: entry.name,
                upnpClass: 'object.container.storageFolder',
                childCount: 0,
                childrenIds: []
              };
              this.containers.set(folderContainerId, folderContainer);

              const parentCont = this.containers.get(parentContainerId);
              if (parentCont && !parentCont.childrenIds.includes(folderContainerId)) {
                parentCont.childrenIds.push(folderContainerId);
              }
            }
            scanDir(fullPath, folderContainerId);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            const isVideo = videoExts.includes(ext);
            const isAudio = audioExts.includes(ext);
            const isImage = imageExts.includes(ext);

            if (!isVideo && !isAudio && !isImage) continue;

            let stat = null;
            try {
              stat = fs.statSync(fullPath);
            } catch (e) {
              continue;
            }

            const itemId = `file:${Buffer.from(fullPath).toString('hex')}`;
            const mimeType = mime.lookup(entry.name) || (isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'image/jpeg');
            const protocolInfo = dlnaConfig.mimeProtocolInfoMap[ext] || `http-get:*:${mimeType}:*`;

            let upnpClass = 'object.item';
            if (isVideo) upnpClass = 'object.item.videoItem.movie';
            else if (isAudio) upnpClass = 'object.item.audioItem.musicTrack';
            else if (isImage) upnpClass = 'object.item.imageItem.photo';

            const cleaned = cleanMediaName(entry.name);
            let displayTitle = cleaned.title || entry.name;
            if (cleaned.year) displayTitle += ` (${cleaned.year})`;
            if (cleaned.quality) displayTitle += ` [${cleaned.quality}]`;

            const itemObj = {
              id: itemId,
              parentId: parentContainerId,
              title: entry.name,
              displayTitle,
              fullPath,
              sizeBytes: stat.size,
              modifiedTime: stat.mtime,
              mimeType,
              ext,
              upnpClass,
              protocolInfo,
              // Media metadata (populated from binary header probe, null if not extractable)
              duration: null,
              bitrate: null,
              sampleFrequency: null,
              nrAudioChannels: null,
              // Media poster metadata (populated keyless async after scan)
              posterHash: null,
              mediaTitle: cleaned.title || null,
              mediaYear: cleaned.year || null,
              mediaQuality: cleaned.quality || null
            };

            // Probe binary headers for media metadata (non-blocking, never throws)
            try {
              const meta = probeMediaFile(fullPath, ext);
              if (meta.duration) itemObj.duration = meta.duration;
              if (meta.bitrate) itemObj.bitrate = meta.bitrate;
              if (meta.sampleFrequency) itemObj.sampleFrequency = meta.sampleFrequency;
              if (meta.nrAudioChannels) itemObj.nrAudioChannels = meta.nrAudioChannels;
              
              if (!itemObj.mediaQuality && meta.width && meta.height) {
                 itemObj.mediaQuality = getQualityFromResolution(meta.width, meta.height);
                 if (itemObj.mediaQuality) displayTitle += ` [${itemObj.mediaQuality}]`;
              }
            } catch {
              // Ignore probe failures — metadata is optional
            }

            this.items.set(itemId, itemObj);

            this.containers.get('0/all').childrenIds.push(itemId);

            if (isVideo) {
              if (!this.containers.get('0/videos').childrenIds.includes(itemId)) {
                this.containers.get('0/videos').childrenIds.push(itemId);
              }

              // Check if file or parent folder indicates a TV series episode
              const tvPattern = /\b(s\d{1,2}(e\d{1,2})?|season\s*\d{1,2}|episode\s*\d{1,2}|ep?\d{1,2}|\d{1,2}x\d{2})\b/i;
              const isTvShow = tvPattern.test(entry.name) || tvPattern.test(dirPath);

              if (isTvShow) {
                itemObj.upnpClass = 'object.item.videoItem.musicVideoClip';
                
                // Find top level folder under 0/all
                let currentParentId = parentContainerId;
                let topLevelFolderId = null;
                while (currentParentId !== '0/all' && this.containers.has(currentParentId)) {
                  topLevelFolderId = currentParentId;
                  currentParentId = this.containers.get(currentParentId).parentId;
                }
                
                if (topLevelFolderId) {
                  if (!this.containers.get('0/tvshows').childrenIds.includes(topLevelFolderId)) {
                    this.containers.get('0/tvshows').childrenIds.push(topLevelFolderId);
                  }
                } else {
                  if (!this.containers.get('0/tvshows').childrenIds.includes(itemId)) {
                    this.containers.get('0/tvshows').childrenIds.push(itemId);
                  }
                }
              } else {
                if (!this.containers.get('0/movies').childrenIds.includes(itemId)) {
                  this.containers.get('0/movies').childrenIds.push(itemId);
                }
              }
            } else if (isAudio) {
              this.containers.get('0/music').childrenIds.push(itemId);
            } else if (isImage) {
              this.containers.get('0/photos').childrenIds.push(itemId);
            }

            if (parentContainerId !== '0/all' && this.containers.has(parentContainerId)) {
              this.containers.get(parentContainerId).childrenIds.push(itemId);
            }
          }
        }
      };

      if (this.dlnaConfig && !this.dlnaConfig.useMaster) {
        if (this.dlnaConfig.videos && fs.existsSync(this.dlnaConfig.videos)) scanDir(this.dlnaConfig.videos, '0/all');
        if (this.dlnaConfig.photos && fs.existsSync(this.dlnaConfig.photos)) scanDir(this.dlnaConfig.photos, '0/all');
        if (this.dlnaConfig.music && fs.existsSync(this.dlnaConfig.music)) scanDir(this.dlnaConfig.music, '0/all');
      } else {
        if (fs.existsSync(this.rootPath)) {
          scanDir(this.rootPath, '0/all');
        } else {
          console.warn(`[DLNA MediaStore] Master directory does not exist: ${this.rootPath}`);
        }
      }

      for (const [cId, container] of this.containers.entries()) {
        container.childCount = container.childrenIds.length;
      }

      const totalItems = this.items.size;
      const allCount = this.containers.get('0/all').childCount;
      const moviesCount = this.containers.get('0/movies').childCount;
      const videosCount = this.containers.get('0/videos').childCount;
      const musicCount = this.containers.get('0/music').childCount;
      const photosCount = this.containers.get('0/photos').childCount;

      this.lastScanTime = new Date();
      console.log(`[DLNA MediaStore] Scan complete. Total items loaded: ${totalItems} (All: ${allCount}, Movies: ${moviesCount}, Videos: ${videosCount}, Music: ${musicCount}, Photos: ${photosCount})`);
    } catch (err) {
      console.error('[DLNA MediaStore Scan Error]', err);
    } finally {
      this.isScanning = false;
      if (this.scanPending) {
        this.scanPending = false;
        this.scanMedia();
      }
    }
  }

  getObject(rawId) {
    if (!rawId) return { isContainer: true, data: this.containers.get('0') };

    if (this.items.has(rawId)) {
      return { isContainer: false, data: this.items.get(rawId) };
    }

    if (this.containers.has(rawId)) {
      return { isContainer: true, data: this.containers.get(rawId) };
    }

    const resolvedId = this.resolveContainerId(rawId);
    if (this.containers.has(resolvedId)) {
      return { isContainer: true, data: this.containers.get(resolvedId) };
    }

    return null;
  }

  getChildren(rawContainerId, startingIndex = 0, requestedCount = 0) {
    const containerId = this.resolveContainerId(rawContainerId);
    const container = this.containers.get(containerId);
    if (!container) return [];

    let children = [];
    if (containerId === '0') {
      children = container.childrenIds.map(id => this.containers.get(id)).filter(Boolean);
    } else {
      children = container.childrenIds.map(id => {
        if (this.containers.has(id)) return this.containers.get(id);
        if (this.items.has(id)) return this.items.get(id);
        return null;
      }).filter(Boolean);
    }

    const start = parseInt(startingIndex, 10) || 0;
    const limit = parseInt(requestedCount, 10);

    if (limit > 0) {
      return children.slice(start, start + limit);
    }
    return children.slice(start);
  }

  getTotalMediaCount() {
    return this.items.size;
  }
}

export const mediaStore = new MediaStore();
export default mediaStore;
