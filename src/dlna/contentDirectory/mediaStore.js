import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import dlnaConfig from '../../../config/dlna.js';

class MediaStore {
  constructor() {
    this.rootPath = dlnaConfig.mediaRoot;
    this.containers = new Map();
    this.items = new Map();
    this.lastScanTime = null;
    this.isScanning = false;

    this.initContainers();
  }

  initContainers() {
    // 0: Root Container
    this.containers.set('0', {
      id: '0',
      parentId: '-1',
      title: 'Root',
      upnpClass: 'object.container.storageFolder',
      childCount: 5,
      childrenIds: ['0/movies', '0/tvshows', '0/videos', '0/music', '0/photos']
    });

    this.containers.set('0/movies', {
      id: '0/movies',
      parentId: '0',
      title: 'Movies',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    this.containers.set('0/tvshows', {
      id: '0/tvshows',
      parentId: '0',
      title: 'TV Shows',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    this.containers.set('0/videos', {
      id: '0/videos',
      parentId: '0',
      title: 'Videos',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    this.containers.set('0/music', {
      id: '0/music',
      parentId: '0',
      title: 'Music',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    this.containers.set('0/photos', {
      id: '0/photos',
      parentId: '0',
      title: 'Photos',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });
  }

  /**
   * Scan media directory once and populate in-memory cache
   */
  async scanMedia(targetDirectory = this.rootPath) {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      this.rootPath = targetDirectory || this.rootPath;
      if (!fs.existsSync(this.rootPath)) {
        console.warn(`[DLNA MediaStore] Directory does not exist: ${this.rootPath}`);
        this.isScanning = false;
        return;
      }

      this.initContainers();
      this.items.clear();

      const getFilesRecursively = (dir) => {
        let results = [];
        try {
          const list = fs.readdirSync(dir, { withFileTypes: true });
          for (const item of list) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
              results = results.concat(getFilesRecursively(fullPath));
            } else if (item.isFile()) {
              results.push({ name: item.name, fullPath });
            }
          }
        } catch (e) {}
        return results;
      };

      const fileEntries = getFilesRecursively(this.rootPath);

      let moviesCount = 0;
      let tvShowsCount = 0;
      let videosCount = 0;
      let musicCount = 0;
      let photosCount = 0;

      for (const entry of fileEntries) {
        const fullPath = entry.fullPath;
        const ext = path.extname(entry.name).toLowerCase();
        const mimeType = mime.lookup(entry.name) || 'application/octet-stream';
        let stat = null;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          continue;
        }

        const itemId = Buffer.from(fullPath).toString('hex');
        const protocolInfo = dlnaConfig.mimeProtocolInfoMap[ext] || `http-get:*:${mimeType}:*`;

        let containerId = null;
        let upnpClass = 'object.item';

        // Determine UPnP Class & Container
        if (['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.m4v', '.ts'].includes(ext)) {
          upnpClass = 'object.item.videoItem.movie';
          // Simple heuristic for Movies vs TV Shows vs Videos
          if (/s\d{1,2}e\d{1,2}/i.test(entry.name)) {
            containerId = '0/tvshows';
            tvShowsCount++;
          } else if (stat.size > 200 * 1024 * 1024) {
            containerId = '0/movies';
            moviesCount++;
          } else {
            containerId = '0/videos';
            videosCount++;
          }
        } else if (['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma'].includes(ext)) {
          upnpClass = 'object.item.audioItem.musicTrack';
          containerId = '0/music';
          musicCount++;
        } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext)) {
          upnpClass = 'object.item.imageItem.photo';
          containerId = '0/photos';
          photosCount++;
        }

        if (containerId) {
          const itemObj = {
            id: itemId,
            parentId: containerId,
            title: entry.name,
            fullPath,
            sizeBytes: stat.size,
            modifiedTime: stat.mtime,
            mimeType,
            ext,
            upnpClass,
            protocolInfo
          };

          this.items.set(itemId, itemObj);
          this.containers.get(containerId).childrenIds.push(itemId);
        }
      }

      // Update container counts
      this.containers.get('0/movies').childCount = moviesCount;
      this.containers.get('0/tvshows').childCount = tvShowsCount;
      this.containers.get('0/videos').childCount = videosCount;
      this.containers.get('0/music').childCount = musicCount;
      this.containers.get('0/photos').childCount = photosCount;

      this.lastScanTime = new Date();
      console.log(`[DLNA MediaStore] Scan complete. Items loaded: Movies (${moviesCount}), TV Shows (${tvShowsCount}), Videos (${videosCount}), Music (${musicCount}), Photos (${photosCount})`);
    } catch (err) {
      console.error('[DLNA MediaStore Scan Error]', err);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Get item or container by ID
   */
  getObject(id) {
    if (this.containers.has(id)) {
      return { isContainer: true, data: this.containers.get(id) };
    }
    if (this.items.has(id)) {
      return { isContainer: false, data: this.items.get(id) };
    }
    return null;
  }

  /**
   * Get children of container
   */
  getChildren(containerId, startingIndex = 0, requestedCount = 0) {
    const container = this.containers.get(containerId);
    if (!container) return [];

    let children = [];
    if (containerId === '0') {
      // Return sub-containers
      children = container.childrenIds.map(id => this.containers.get(id)).filter(Boolean);
    } else {
      // Return items
      children = container.childrenIds.map(id => this.items.get(id)).filter(Boolean);
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
