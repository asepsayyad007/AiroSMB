import dgram from 'dgram';
import os from 'os';
import dlnaConfig from '../../../config/dlna.js';

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
      });

      this.socket.bind(this.ssdpPort, () => {
        try {
          this.socket.addMembership(this.multicastAddress);
          this.socket.setMulticastTTL(4);
          this.isRunning = true;
          console.log(`[DLNA SSDP Server] Bound to ${this.multicastAddress}:${this.ssdpPort}`);

          // Broadcast NOTIFY ssdp:alive immediately and periodically
          this.sendNotify('ssdp:alive');
          this.intervalId = setInterval(() => {
            this.sendNotify('ssdp:alive');
          }, 20000);
        } catch (err) {
          console.warn('[DLNA SSDP Membership Warning]', err.message);
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
      try {
        this.socket.close();
      } catch (e) {}
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
      this.socket.send(buf, 0, buf.length, this.ssdpPort, this.multicastAddress);
    }
  }

  handleMessage(msgBuffer, rinfo) {
    const msg = msgBuffer.toString();
    if (!msg.startsWith('M-SEARCH')) return;

    const location = `http://${this.primaryIp}:${this.port}/dlna/description.xml`;
    const targets = this.getUsnTargets();

    // Check requested Search Target (ST)
    const stMatch = msg.match(/ST:\s*(.+)/i);
    const st = stMatch ? stMatch[1].trim() : 'ssdp:all';

    for (const item of targets) {
      if (st === 'ssdp:all' || st === item.nt || st === 'upnp:rootdevice') {
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
        this.socket.send(buf, 0, buf.length, rinfo.port, rinfo.address);
      }
    }
  }
}

export const ssdpServer = new SsdpServer();
export default ssdpServer;
