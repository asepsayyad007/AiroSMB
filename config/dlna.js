import path from 'path';
import os from 'os';

/**
 * DLNA & UPnP AV Media Server Configuration
 */
const dlnaConfig = {
  friendlyName: 'AiroShare Media Server',
  serverName: 'AiroShare Media Engine',
  manufacturer: 'AiroShare',
  manufacturerUrl: 'http://localhost:9900',
  modelName: 'AiroShare',
  modelDescription: 'High Performance PC Home Media & File Sharing Server',
  modelNumber: '1.3.2',
  serialNumber: 'AIROSHARE-2026-001',
  uuid: 'uuid:airoshare-mediaserver-1000-8000-000000000001',
  
  port: process.env.PORT || 9900,
  ssdpPort: 1900,
  multicastAddress: '239.255.255.250',

  enableSsdp: true,
  enableDlna: true,
  enableLogging: true,

  mediaRoot: path.join(os.homedir(), 'Videos'),
  
  // Supported MIME types map for UPnP protocolInfo
  // DLNA.ORG_OP=11 = byte-range (01) + time-seek (10) both enabled -> smooth scrubbing in VLC/Kodi/TVs
  // DLNA.ORG_FLAGS=01700000... = sender paced + DM-PR-TF (DLNA streaming flags)
  mimeProtocolInfoMap: {
    // Video
    '.mp4':  'http-get:*:video/mp4:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.m4v':  'http-get:*:video/mp4:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mkv':  'http-get:*:video/x-matroska:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.avi':  'http-get:*:video/x-msvideo:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mov':  'http-get:*:video/quicktime:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.wmv':  'http-get:*:video/x-ms-wmv:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.webm': 'http-get:*:video/webm:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.ts':   'http-get:*:video/mp2t:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.m2ts': 'http-get:*:video/mp2t:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mpg':  'http-get:*:video/mpeg:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mpeg': 'http-get:*:video/mpeg:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.flv':  'http-get:*:video/x-flv:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.3gp':  'http-get:*:video/3gpp:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.vob':  'http-get:*:video/dvd:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.ogv':  'http-get:*:video/ogg:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    // Audio
    '.mp3':  'http-get:*:audio/mpeg:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.flac': 'http-get:*:audio/flac:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.wav':  'http-get:*:audio/wav:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.aac':  'http-get:*:audio/aac:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.m4a':  'http-get:*:audio/mp4:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.ogg':  'http-get:*:audio/ogg:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.opus': 'http-get:*:audio/ogg;codecs=opus:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.wma':  'http-get:*:audio/x-ms-wma:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.alac': 'http-get:*:audio/mp4:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mka':  'http-get:*:audio/x-matroska:DLNA.ORG_OP=11;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    // Image
    '.jpg':  'http-get:*:image/jpeg:DLNA.ORG_PN=JPEG_LRG;DLNA.ORG_CI=1',
    '.jpeg': 'http-get:*:image/jpeg:DLNA.ORG_PN=JPEG_LRG;DLNA.ORG_CI=1',
    '.png':  'http-get:*:image/png:DLNA.ORG_PN=PNG_LRG;DLNA.ORG_CI=1',
    '.webp': 'http-get:*:image/webp:DLNA.ORG_CI=1',
    '.gif':  'http-get:*:image/gif:DLNA.ORG_CI=1',
    '.bmp':  'http-get:*:image/bmp:DLNA.ORG_CI=1',
    '.tiff': 'http-get:*:image/tiff:DLNA.ORG_CI=1'
  }
};

export default dlnaConfig;
