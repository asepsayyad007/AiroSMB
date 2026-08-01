import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import dlnaConfig from '../../../config/dlna.js';

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

    this.initContainers();
  }

  initContainers() {
    this.containers.clear();

    // 0: Master Root Container
    this.containers.set('0', {
      id: '0',
      parentId: '-1',
      title: 'AiroSMB Media Share',
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

    if (['1', '0/1', 'v', 'video', 'videos', 'movie', 'movies', '0/video', '0/videos', '0/movies', '0/all'].includes(lower)) {
      return '0/all';
    }

    if (['2', '0/2', 'a', 'audio', 'music', '0/audio', '0/music'].includes(lower)) {
      return '0/music';
    }

    if (['3', '0/3', 'p', 'photo', 'photos', 'image', 'images', '0/photo', '0/photos'].includes(lower)) {
      return '0/photos';
    }

    if (this.containers.has(id)) return id;
    return id;
  }

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

            const itemObj = {
              id: itemId,
              parentId: parentContainerId,
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

            this.containers.get('0/all').childrenIds.push(itemId);

            if (isVideo) {
              if (!this.containers.get('0/videos').childrenIds.includes(itemId)) {
                this.containers.get('0/videos').childrenIds.push(itemId);
              }
              if (!this.containers.get('0/movies').childrenIds.includes(itemId)) {
                this.containers.get('0/movies').childrenIds.push(itemId);
              }
              if (/s\d{1,2}e\d{1,2}/i.test(entry.name) || /season/i.test(entry.name)) {
                this.containers.get('0/tvshows').childrenIds.push(itemId);
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

      scanDir(this.rootPath, '0/all');

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
