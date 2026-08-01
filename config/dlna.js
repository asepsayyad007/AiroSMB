import path from 'path';
import os from 'os';

/**
 * DLNA & UPnP AV Media Server Configuration
 */
const dlnaConfig = {
  friendlyName: 'AiroSMB Media Server',
  serverName: 'AiroSMB Plex & Media Engine',
  manufacturer: 'AiroShare',
  manufacturerUrl: 'http://localhost:3000',
  modelName: 'AiroSMB',
  modelDescription: 'High Performance PC Home Media & File Sharing Server',
  modelNumber: '1.0.0',
  serialNumber: 'AIROSMB-2026-001',
  uuid: 'uuid:airosmb-mediaserver-1000-8000-000000000001',
  
  port: process.env.PORT || 3000,
  ssdpPort: 1900,
  multicastAddress: '239.255.255.250',

  enableSsdp: true,
  enableDlna: true,
  enableLogging: true,

  mediaRoot: 'C:\\Users\\aseps\\Downloads',
  
  // Supported MIME types map for DLNA ProtocolInfo
  mimeProtocolInfoMap: {
    '.mp4': 'video/mp4:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mkv': 'video/x-matroska:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.avi': 'video/x-msvideo:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mov': 'video/quicktime:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.mp3': 'audio/mpeg:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.flac': 'audio/flac:DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
    '.jpg': 'image/jpeg:DLNA.ORG_PN=JPEG_LRG;DLNA.ORG_CI=1',
    '.jpeg': 'image/jpeg:DLNA.ORG_PN=JPEG_LRG;DLNA.ORG_CI=1',
    '.png': 'image/png:DLNA.ORG_PN=PNG_LRG;DLNA.ORG_CI=1'
  }
};

export default dlnaConfig;
