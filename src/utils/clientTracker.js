/**
 * Real-time Active Client Tracker for AiroSMB
 * Tracks DLNA, HTTP, SMB, and FTP connected devices
 */

class ClientTracker {
  constructor() {
    this.clients = new Map(); // Key: client IP
  }

  /**
   * Log or update a client connection/activity
   */
  logActivity({ ip, device = 'Generic Client', protocol = 'HTTP', activity = 'Active' }) {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return;

    // Clean IP address if formatted like ::ffff:192.168.1.19
    const cleanIp = ip.replace(/^.*:/, '');

    const existing = this.clients.get(cleanIp) || {
      ip: cleanIp,
      device,
      protocol,
      firstSeen: new Date(),
      requestsCount: 0
    };

    existing.lastSeen = new Date();
    existing.protocol = protocol;
    if (device && device !== 'Generic Client') existing.device = device;
    existing.activity = activity;
    existing.requestsCount += 1;

    this.clients.set(cleanIp, existing);
  }

  /**
   * Get array of all connected clients sorted by last seen (most recent first)
   */
  getActiveClients() {
    const now = Date.now();
    const result = [];

    for (const [ip, client] of this.clients.entries()) {
      const secondsAgo = Math.floor((now - new Date(client.lastSeen).getTime()) / 1000);
      
      // Consider active if seen within the last 15 minutes
      const isOnline = secondsAgo < 900;

      result.push({
        ...client,
        secondsAgo,
        isOnline
      });
    }

    return result.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  }

  /**
   * Clear all tracked clients
   */
  clear() {
    this.clients.clear();
  }
}

const clientTracker = new ClientTracker();
export default clientTracker;
