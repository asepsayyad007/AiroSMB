import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import dlnaConfig from '../../../config/dlna.js';

/**
 * Robust UPnP / DLNA MediaStore
 * Fixes VLC & Smart TV empty directory issue:
 *  1. Maps all standard UPnP container IDs ('0', '1', '0/1', 'video', 'movies', etc.)
 *  2. Provides an "All Videos" container containing ALL video files regardless of size
 *  3. Builds real physical directory tree navigation ("Folders & Files")
 *  4. Supports all video/audio/image extensions with rich DLNA protocolInfo
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

    // 0/all: All Videos & Media (Flat view of everything)
    this.containers.set('0/all', {
      id: '0/all',
      parentId: '0',
      title: '📁 All Videos & Media',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/movies: Movies Container
    this.containers.set('0/movies', {
      id: '0/movies',
      parentId: '0',
      title: '🎬 Movies',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/videos: Videos Container
    this.containers.set('0/videos', {
      id: '0/videos',
      parentId: '0',
      title: '📹 Videos',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/tvshows: TV Shows Container
    this.containers.set('0/tvshows', {
      id: '0/tvshows',
      parentId: '0',
      title: '📺 TV Shows',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/music: Music Container
    this.containers.set('0/music', {
      id: '0/music',
      parentId: '0',
      title: '🎵 Music',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });

    // 0/photos: Photos Container
    this.containers.set('0/photos', {
      id: '0/photos',
      parentId: '0',
      title: '🖼️ Photos',
      upnpClass: 'object.container.storageFolder',
      childCount: 0,
      childrenIds: []
    });
  }

  /**
   * Resolve container ID aliases (VLC & TVs use various UPnP spec container IDs)
   */
  resolveContainerId(id) {
    if (!id || id === '0' || id === 'root' || id === '-1') return '0';
    const lower = String(id).toLowerCase().trim();

    // Standard UPnP Video Container Aliases -> Map to '0/all' or '0/movies'
    if (['1', '0/1', 'v', 'video', 'videos', 'movie', 'movies', '0/video', '0/videos', '0/movies', '0/all'].includes(lower)) {
      return '0/all';
    }

    // Standard UPnP Audio Container Aliases
    if (['2', '0/2', 'a', 'audio', 'music', '0/audio', '0/music'].includes(lower)) {
      return '0/music';
    }

    // Standard UPnP Image Container Aliases
    if (['3', '0/3', 'p', 'photo', 'photos', 'image', 'images', '0/photo', '0/photos'].includes(lower)) {
      return '0/photos';
    }

    if (this.containers.has(id)) return id;
    return id;
  }

  /**
   * Scan media directory and build flat + hierarchical media stores
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

      const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.m4v', '.ts', '.wmv', '.3gp', '.mpg', '.mpeg', '.m2ts', '.vob', '.ogv'];
      const audioExts = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma', '.opus', '.alac'];
      const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];

      // Recursive file traversal
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
            // Create container for subfolder
            const folderContainerId = `dir:${Buffer.from(fullPath).toString('hex')}`;
            if (!this.containers.has(folderContainerId)) {
              const folderContainer = {
                id: folderContainerId,
                parentId: parentContainerId,
                title: `📁 ${entry.name}`,
                upnpClass: 'object.container.storageFolder',
                childCount: 0,
                childrenIds: []
              };
              this.containers.set(folderContainerId, folderContainer);

              // Add folder container to parent's children list
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

            // Add to Master "All Videos & Media" Container (0/all)
            this.containers.get('0/all').childrenIds.push(itemId);

            // Categorize into Movies/Videos/TV Shows
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

            // Also add to subfolder container if inside a subfolder
            if (parentContainerId !== '0/all' && this.containers.has(parentContainerId)) {
              this.containers.get(parentContainerId).childrenIds.push(itemId);
            }
          }
        }
      };

      scanDir(this.rootPath, '0/all');

      // Update child counts
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

  /**
   * Get item or container by ID
   */
  getObject(rawId) {
    if (!rawId) return { isContainer: true, data: this.containers.get('0') };

    // 1. Direct item lookup
    if (this.items.has(rawId)) {
      return { isContainer: false, data: this.items.get(rawId) };
    }

    // 2. Direct container lookup
    if (this.containers.has(rawId)) {
      return { isContainer: true, data: this.containers.get(rawId) };
    }

    // 3. Resolve container ID aliases
    const resolvedId = this.resolveContainerId(rawId);
    if (this.containers.has(resolvedId)) {
      return { isContainer: true, data: this.containers.get(resolvedId) };
    }

    return null;
  }

  /**
   * Get children of container
   */
  getChildren(rawContainerId, startingIndex = 0, requestedCount = 0) {
    const containerId = this.resolveContainerId(rawContainerId);
    const container = this.containers.get(containerId);
    if (!container) return [];

    let children = [];
    if (containerId === '0') {
      // Return top-level category containers
      children = container.childrenIds.map(id => this.containers.get(id)).filter(Boolean);
    } else {
      // Return items or sub-containers
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
