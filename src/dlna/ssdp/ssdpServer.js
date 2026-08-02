import dgram from 'dgram';
import os from 'os';
import dlnaConfig from '../../../config/dlna.js';

/**
 * Ultra-Fast Production SSDP Server
 * Optimizations:
 *  - Multicast binding per real LAN interface (Ethernet, Wi-Fi)
 *  - Immediate burst notifications on startup & rejoin (3x spaced 150ms apart)
 *  - Low-latency M-SEARCH responses (instant response for fast device discovery)
 *  - 5-second re-announce cycle for seamless TV & VLC auto-discovery
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

      this.socket.bind(this.ssdpPort, '0.0.0.0', () => {
        try {
          this.socket.setMulticastLoopback(true);
          this.socket.setMulticastTTL(4);

          const lanInterfaces = this.getLanInterfaces();
          let joined = 0;
          for (const iface of lanInterfaces) {
            try {
              this.socket.addMembership(this.multicastAddress, iface.address);
              console.log(`[DLNA SSDP] Fast multicast active on ${iface.name} (${iface.address})`);
              joined++;
            } catch (e) {
              console.warn(`[DLNA SSDP] Could not join multicast on ${iface.name}: ${e.message}`);
            }
          }

          if (joined === 0) {
            try {
              this.socket.addMembership(this.multicastAddress);
              console.log('[DLNA SSDP] Fast multicast active on default interface');
            } catch (e) {
              console.warn('[DLNA SSDP] Default multicast join failed:', e.message);
            }
          }

          this.isRunning = true;
          console.log(`[DLNA SSDP Server] High-speed active on UDP ${this.multicastAddress}:${this.ssdpPort}`);
          console.log(`[DLNA SSDP Server] LOCATION -> http://${this.primaryIp}:${this.port}/dlna/description.xml`);

          // INSTANT BURST DISCOVERY: Send 3 notification bursts immediately
          this.sendNotifyBurst();

          // Continuous fast re-announce every 5 seconds for new devices joining Wi-Fi
          this.intervalId = setInterval(() => {
            this.sendNotify('ssdp:alive');
          }, 5000);

        } catch (err) {
          console.warn('[DLNA SSDP Bind Error]', err.message);
        }
      });
    } catch (err) {
      console.error('[DLNA SSDP Start Error]', err);
    }
  }

  sendNotifyBurst() {
    let count = 0;
    const burstTimer = setInterval(() => {
      this.sendNotify('ssdp:alive');
      count++;
      if (count >= 3) clearInterval(burstTimer);
    }, 150);
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
        `SERVER: Windows/10 UPnP/1.0 AiroShare/1.0\r\n` +
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

    const stMatch = msg.match(/^ST:\s*(.+)$/im);
    const st = stMatch ? stMatch[1].replace(/\r/g, '').trim() : 'ssdp:all';

    // ULTRA FAST M-SEARCH RESPONSE: Cap delay to max 50ms so clients see us instantly
    const delay = Math.floor(Math.random() * 50);

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
            `SERVER: Windows/10 UPnP/1.0 AiroShare/1.0\r\n` +
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
  }
}

export const ssdpServer = new SsdpServer();
export default ssdpServer;
