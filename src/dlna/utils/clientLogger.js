/**
 * Client Detection and Access Logging Utility
 */

class ClientLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
  }

  /**
   * Detect client device/player from User-Agent string
   * @param {string} userAgent 
   * @returns {string} Friendly client device name
   */
  detectDevice(userAgent = '') {
    const ua = userAgent.toLowerCase();
    if (ua.includes('vlc')) return 'VLC Media Player';
    if (ua.includes('kodi')) return 'Kodi';
    if (ua.includes('wmplayer') || ua.includes('windows-media-player')) return 'Windows Media Player';
    if (ua.includes('samsung') || ua.includes('tizen')) return 'Samsung Smart TV';
    if (ua.includes('lg') || ua.includes('webos')) return 'LG Smart TV';
    if (ua.includes('androidtv') || ua.includes('android')) return 'Android TV / Mobile';
    if (ua.includes('xbox')) return 'Xbox';
    if (ua.includes('playstation')) return 'PlayStation';
    if (ua.includes('plex')) return 'Plex Media Player';
    if (ua.includes('curl')) return 'cURL Diagnostic Tool';
    return 'Generic UPnP/DLNA Client';
  }

  /**
   * Log incoming request details
   * @param {Object} req Express request object
   * @param {string} action Description of action (e.g. 'Browse', 'Stream')
   */
  logRequest(req, action = 'DLNA Access') {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const device = this.detectDevice(userAgent);

    const logEntry = {
      id: Date.now() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      ip: clientIp.replace('::ffff:', ''),
      userAgent,
      device,
      action,
      path: req.originalUrl || req.url
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    console.log(`[DLNA Client Log] ${logEntry.timestamp} | ${logEntry.device} (${logEntry.ip}) -> ${action}`);
    return logEntry;
  }

  /**
   * Get all recorded client access logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Get unique connected clients summary
   */
  getConnectedClients() {
    const uniqueMap = new Map();
    for (const log of this.logs) {
      if (!uniqueMap.has(log.ip)) {
        uniqueMap.set(log.ip, {
          ip: log.ip,
          device: log.device,
          lastSeen: log.timestamp,
          lastAction: log.action
        });
      }
    }
    return Array.from(uniqueMap.values());
  }
}

export const clientLogger = new ClientLogger();
export default clientLogger;
