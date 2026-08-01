import dgram from 'dgram';
import os from 'os';
import dlnaConfig from '../../../config/dlna.js';

/**
 * Production-grade SSDP Server
 * Fixes:
 *  - Bind to specific LAN interface IP, not 0.0.0.0 (required for Windows multicast)
 *  - Proper MX delay on M-SEARCH responses (UPnP spec compliance)
 *  - Robust ST header parsing (handles \r\n and case variations)
 *  - Delayed initial NOTIFY after socket is fully ready
 *  - Additional multicast interface binding for all LAN adapters
 */
class SsdpServer {
  constructor() {
    this.socket = null;
    this.primaryIp = '127.0.0.1';
    this.port = dlnaConfig.port;
    this.ssdpPort = dlnaConfig.ssdpPort;
    this.multicastAddress = dlnaConfig.multicastAddress;
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Get all real LAN IPv4 addresses (exclude loopback, virtual, APIPA)
   */
  getLanInterfaces() {
    const interfaces = os.networkInterfaces();
    const addrs = [];
    for (const name of Object.keys(interfaces)) {
      const lower = name.toLowerCase();
      if (
        lower.includes('virtual') ||
        lower.includes('vbox') ||
        lower.includes('vmnet') ||
        lower.includes('wsl') ||
        lower.includes('loopback')
      ) continue;
      for (const net of interfaces[name]) {
        if (
          net.family === 'IPv4' &&
          !net.internal &&
          !net.address.startsWith('169.254.')
        ) {
          addrs.push({ name, address: net.address });
        }
      }
    }
    return addrs;
  }

  start(primaryIp, port = dlnaConfig.port) {
    if (primaryIp) this.primaryIp = primaryIp;
    if (port) this.port = port;
    if (this.isRunning) return;

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo);
      });

      this.socket.on('error', (err) => {
        console.warn('[SSDP Server Error]', err.message);
        this.isRunning = false;
      });

      // KEY FIX: Bind to 0.0.0.0 so the socket can receive multicast,
      // but explicitly add multicast membership on each LAN interface IP.
      this.socket.bind(this.ssdpPort, '0.0.0.0', () => {
        try {
          this.socket.setMulticastLoopback(true); // allow same-machine VLC to receive broadcasts
          this.socket.setMulticastTTL(4);

          // Add multicast membership on each real LAN adapter
          const lanInterfaces = this.getLanInterfaces();
          let joined = 0;
          for (const iface of lanInterfaces) {
            try {
              this.socket.addMembership(this.multicastAddress, iface.address);
              console.log(`[DLNA SSDP] Joined multicast on ${iface.name} (${iface.address})`);
              joined++;
            } catch (e) {
              console.warn(`[DLNA SSDP] Could not join multicast on ${iface.name}: ${e.message}`);
            }
          }

          // Fallback: join on 0.0.0.0 if no specific interfaces worked
          if (joined === 0) {
            try {
              this.socket.addMembership(this.multicastAddress);
              console.log('[DLNA SSDP] Joined multicast on default interface');
            } catch (e) {
              console.warn('[DLNA SSDP] Default multicast join failed:', e.message);
            }
          }

          this.isRunning = true;
          console.log(`[DLNA SSDP Server] Active on UDP ${this.multicastAddress}:${this.ssdpPort}`);
          console.log(`[DLNA SSDP Server] LOCATION -> http://${this.primaryIp}:${this.port}/dlna/description.xml`);

          // KEY FIX: Delay first NOTIFY by 500ms to ensure socket is fully ready on Windows
          setTimeout(() => {
            this.sendNotify('ssdp:alive');
            this.intervalId = setInterval(() => {
              this.sendNotify('ssdp:alive');
            }, 15000); // re-announce every 15s (CACHE-CONTROL max-age=1800)
          }, 500);

        } catch (err) {
          console.warn('[DLNA SSDP Bind Error]', err.message);
        }
      });
    } catch (err) {
      console.error('[DLNA SSDP Start Error]', err);
    }
  }

  stop() {
    if (this.isRunning) {
      this.sendNotify('ssdp:byebye');
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.socket) {
      try { this.socket.close(); } catch (e) {}
      this.socket = null;
    }
    this.isRunning = false;
    console.log('[DLNA SSDP Server] Stopped');
  }

  getUsnTargets() {
    const uuid = dlnaConfig.uuid;
    return [
      { nt: 'upnp:rootdevice', usn: `${uuid}::upnp:rootdevice` },
      { nt: uuid, usn: uuid },
      { nt: 'urn:schemas-upnp-org:device:MediaServer:1', usn: `${uuid}::urn:schemas-upnp-org:device:MediaServer:1` },
      { nt: 'urn:schemas-upnp-org:service:ContentDirectory:1', usn: `${uuid}::urn:schemas-upnp-org:service:ContentDirectory:1` },
      { nt: 'urn:schemas-upnp-org:service:ConnectionManager:1', usn: `${uuid}::urn:schemas-upnp-org:service:ConnectionManager:1` },
      { nt: 'urn:schemas-upnp-org:service:AVTransport:1', usn: `${uuid}::urn:schemas-upnp-org:service:AVTransport:1` }
    ];
  }

  sendNotify(nts = 'ssdp:alive') {
    if (!this.socket || !this.isRunning) return;

    const location = `http://${this.primaryIp}:${this.port}/dlna/description.xml`;
    const targets = this.getUsnTargets();

    for (const item of targets) {
      const msg =
        `NOTIFY * HTTP/1.1\r\n` +
        `HOST: ${this.multicastAddress}:${this.ssdpPort}\r\n` +
        `CACHE-CONTROL: max-age=1800\r\n` +
        `LOCATION: ${location}\r\n` +
        `NT: ${item.nt}\r\n` +
        `NTS: ${nts}\r\n` +
        `SERVER: Windows/10 UPnP/1.0 AiroSMB/1.0\r\n` +
        `USN: ${item.usn}\r\n` +
        `\r\n`;

      const buf = Buffer.from(msg);
      this.socket.send(buf, 0, buf.length, this.ssdpPort, this.multicastAddress, (err) => {
        if (err) console.warn(`[SSDP NOTIFY send error]`, err.message);
      });
    }
  }

  handleMessage(msgBuffer, rinfo) {
    const msg = msgBuffer.toString();
    if (!msg.startsWith('M-SEARCH')) return;

    const location = `http://${this.primaryIp}:${this.port}/dlna/description.xml`;
    const targets = this.getUsnTargets();

    // KEY FIX: Robust ST header parsing - strip \r, \n, spaces
    const stMatch = msg.match(/^ST:\s*(.+)$/im);
    const st = stMatch ? stMatch[1].replace(/\r/g, '').trim() : 'ssdp:all';

    // KEY FIX: Parse MX header and apply a random delay within [0, MX] seconds
    const mxMatch = msg.match(/^MX:\s*(\d+)/im);
    const mx = mxMatch ? Math.min(parseInt(mxMatch[1], 10), 5) : 1;
    const delay = Math.random() * mx * 1000;

    setTimeout(() => {
      if (!this.socket || !this.isRunning) return;
      for (const item of targets) {
        const isMatch =
          st === 'ssdp:all' ||
          st === item.nt ||
          (st === 'upnp:rootdevice' && item.nt === 'upnp:rootdevice');

        if (isMatch) {
          const response =
            `HTTP/1.1 200 OK\r\n` +
            `CACHE-CONTROL: max-age=1800\r\n` +
            `DATE: ${new Date().toUTCString()}\r\n` +
            `EXT:\r\n` +
            `LOCATION: ${location}\r\n` +
            `SERVER: Windows/10 UPnP/1.0 AiroSMB/1.0\r\n` +
            `ST: ${item.nt}\r\n` +
            `USN: ${item.usn}\r\n` +
            `\r\n`;

          const buf = Buffer.from(response);
          this.socket.send(buf, 0, buf.length, rinfo.port, rinfo.address, (err) => {
            if (err) console.warn('[SSDP M-SEARCH reply error]', err.message);
          });
        }
      }
    }, delay);

    console.log(`[DLNA SSDP] M-SEARCH from ${rinfo.address}:${rinfo.port} ST="${st}" MX=${mx} -> responding in ${Math.round(delay)}ms`);
  }
}

export const ssdpServer = new SsdpServer();
export default ssdpServer;
