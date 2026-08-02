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
  mimeProtocolInfoMap: {
    '.mp4': 'http-get:*:video/mp4:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mkv': 'http-get:*:video/x-matroska:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.avi': 'http-get:*:video/x-msvideo:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mov': 'http-get:*:video/quicktime:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mp3': 'http-get:*:audio/mpeg:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.flac': 'http-get:*:audio/flac:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.jpg': 'http-get:*:image/jpeg:DLNA.ORG_PN=JPEG_LRG;DLNA.ORG_CI=1',
    '.jpeg': 'http-get:*:image/jpeg:DLNA.ORG_PN=JPEG_LRG;DLNA.ORG_CI=1',
    '.png': 'http-get:*:image/png:DLNA.ORG_PN=PNG_LRG;DLNA.ORG_CI=1'
  }
};

export default dlnaConfig;
