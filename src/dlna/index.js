import express from 'express';
import dlnaConfig from '../../config/dlna.js';
import clientLogger from './utils/clientLogger.js';
import mediaStore from './contentDirectory/mediaStore.js';
import ssdpServer from './ssdp/ssdpServer.js';
import getDeviceIcon from './device/icons.js';
import { 
  getDeviceDescriptionXml, 
  getContentDirectoryScpdXml, 
  getConnectionManagerScpdXml, 
  getAvTransportScpdXml 
} from './device/description.js';

import parseSoapRequest from './soap/soapParser.js';
import contentDirectoryService from './contentDirectory/contentDirectoryService.js';
import connectionManagerService from './connectionManager/connectionManagerService.js';
import avTransportService from './avTransport/avTransportService.js';

const router = express.Router();

// Middleware: Raw Body Parser for SOAP XML POST requests & Client Logger
router.use(express.text({ type: ['text/xml', 'application/xml', 'text/plain'] }));

router.use((req, res, next) => {
  if (req.url.startsWith('/control/') || req.url.startsWith('/description.xml') || req.url.startsWith('/stream')) {
    clientLogger.logRequest(req, req.method + ' ' + req.path);
  }
  next();
});

// UPnP Device Description XML
router.get('/description.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/xml');
  res.send(getDeviceDescriptionXml(baseUrl));
});

// SCPD XML Endpoints
router.get('/scpd/contentDirectory.xml', (req, res) => {
  res.setHeader('Content-Type', 'text/xml');
  res.send(getContentDirectoryScpdXml());
});

router.get('/scpd/connectionManager.xml', (req, res) => {
  res.setHeader('Content-Type', 'text/xml');
  res.send(getConnectionManagerScpdXml());
});

router.get('/scpd/avTransport.xml', (req, res) => {
  res.setHeader('Content-Type', 'text/xml');
  res.send(getAvTransportScpdXml());
});

// SOAP Action Handlers
router.post('/control/contentDirectory', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const xmlBody = typeof req.body === 'string' ? req.body : '';
  const parsedArgs = parseSoapRequest(xmlBody);
  clientLogger.logRequest(req, `SOAP ContentDirectory:${parsedArgs.actionName || 'Action'}`);

  const responseSoap = await contentDirectoryService.handleAction(parsedArgs.actionName, parsedArgs, baseUrl);
  res.setHeader('Content-Type', 'text/xml; charset="utf-8"');
  res.send(responseSoap);
});

router.post('/control/connectionManager', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const xmlBody = typeof req.body === 'string' ? req.body : '';
  const parsedArgs = parseSoapRequest(xmlBody);

  const responseSoap = await connectionManagerService.handleAction(parsedArgs.actionName, parsedArgs, baseUrl);
  res.setHeader('Content-Type', 'text/xml; charset="utf-8"');
  res.send(responseSoap);
});

router.post('/control/avTransport', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const xmlBody = typeof req.body === 'string' ? req.body : '';
  const parsedArgs = parseSoapRequest(xmlBody);

  const responseSoap = await avTransportService.handleAction(parsedArgs.actionName, parsedArgs, baseUrl);
  res.setHeader('Content-Type', 'text/xml; charset="utf-8"');
  res.send(responseSoap);
});

// Device Icons
router.get('/icon-:size.png', (req, res) => {
  const size = parseInt(req.params.size, 10);
  res.setHeader('Content-Type', 'image/png');
  res.send(getDeviceIcon(size));
});

// DLNA Presentation Dashboard Page
router.get('/presentation', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const logs = clientLogger.getLogs();
  const clients = clientLogger.getConnectedClients();
  const mediaCount = mediaStore.getTotalMediaCount();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AiroSMB DLNA Media Server Presentation</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #f8fafc; margin: 0; padding: 32px; }
    .card { background: rgba(16,24,40,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    h1 { color: #00f2fe; margin-top: 0; }
    .badge { background: rgba(16,185,129,0.2); color: #10b981; padding: 4px 10px; border-radius: 99px; font-size: 0.8rem; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.88rem; }
    th { color: #94a3b8; }
    a { color: #00f2fe; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>📡 AiroSMB DLNA & UPnP AV Media Server</h1>
    <p><span class="badge">SSDP Discovery Active</span> <span class="badge">DLNA 1.5 Compliant</span></p>
    <p>Server Name: <strong>AiroSMB Plex & Media Engine</strong> | Friendly Name: <strong>${dlnaConfig.friendlyName}</strong></p>
    <p>Media Items Loaded: <strong>${mediaCount}</strong> | Server Base URL: <strong>${baseUrl}</strong></p>
  </div>

  <div class="card">
    <h2>📱 Connected Clients & Logs</h2>
    <table>
      <thead>
        <tr><th>Timestamp</th><th>Device / Player</th><th>IP Address</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${logs.slice(0, 15).map(log => `
          <tr>
            <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
            <td><strong>${log.device}</strong></td>
            <td>${log.ip}</td>
            <td>${log.action}</td>
          </tr>
        `).join('') || '<tr><td colspan="4">No client connections logged yet. Open VLC -> UPnP to connect!</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>🔗 DLNA Server Endpoints</h2>
    <ul>
      <li><a href="/dlna/description.xml" target="_blank">GET /dlna/description.xml</a> (UPnP Device XML)</li>
      <li><a href="/api/plex/feed" target="_blank">GET /api/plex/feed</a> (Plex & Kodi Feed API)</li>
      <li><a href="/playlist.m3u" target="_blank">GET /playlist.m3u</a> (VLC Live M3U Playlist)</li>
    </ul>
  </div>
</body>
</html>`;

  res.send(html);
});

export default router;
