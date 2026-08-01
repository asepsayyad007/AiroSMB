import net from 'net';
import fs from 'fs';
import path from 'path';

class AiroSmbServer {
  constructor(options = {}) {
    this.port = options.port || 4450;
    this.host = options.host || '0.0.0.0';
    this.shareName = options.shareName || 'AiroSMB';
    this.sharePath = options.sharePath || 'C:\\Users\\aseps\\Downloads';
    this.server = null;
    this.isRunning = false;
  }

  start() {
    return new Promise((resolve, reject) => {
      if (this.isRunning) return resolve(true);

      this.server = net.createServer((socket) => {
        socket.on('data', (data) => {
          this.handlePacket(socket, data);
        });
        socket.on('error', (err) => {
          // Ignore socket reset errors
        });
      });

      this.server.on('error', (err) => {
        if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
          console.warn(`[AiroSMB SMB Engine] Port ${this.port} unavailable (${err.code}). Falling back to port 4450...`);
          if (this.port !== 4450) {
            this.port = 4450;
            setTimeout(() => {
              this.server.listen(this.port, this.host);
            }, 500);
            return;
          }
        }
        console.error('[AiroSMB Native SMB Server Error]', err.message);
        this.isRunning = false;
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        this.isRunning = true;
        console.log(`[AiroSMB] Native SMB Server listening on port ${this.port} (No Auth / Guest Access Allowed)`);
        resolve(true);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRunning || !this.server) return resolve(true);
      this.server.close(() => {
        this.isRunning = false;
        console.log('[AiroSMB] Native SMB Server stopped');
        resolve(true);
      });
    });
  }

  handlePacket(socket, data) {
    if (data.length < 4) return;

    // Check for NetBIOS session header (4 bytes: type + length)
    let smbData = data;
    if (data[0] === 0x00 && data.length >= 4) {
      smbData = data.slice(4);
    }

    if (smbData.length < 64) return;

    // Verify SMB2 Header Magic "\xfeSMB"
    if (smbData[0] === 0xfe && smbData[1] === 0x53 && smbData[2] === 0x4d && smbData[3] === 0x42) {
      const command = smbData.readUInt16LE(12);
      const messageId = smbData.readBigUInt64LE(24);
      const asyncId = smbData.readBigUInt64LE(32);
      const sessionId = smbData.readBigUInt64LE(40);

      switch (command) {
        case 0x0000: // SMB2 Negotiate
          this.sendNegotiateResponse(socket, messageId);
          break;

        case 0x0001: // SMB2 Session Setup (Anonymous / No Auth)
          this.sendSessionSetupResponse(socket, messageId);
          break;

        case 0x0003: // SMB2 Tree Connect
          this.sendTreeConnectResponse(socket, messageId);
          break;

        default:
          // Send generic Success SMB2 Header for unsupported commands to keep connection active
          this.sendGenericResponse(socket, command, messageId);
          break;
      }
    }
  }

  sendNegotiateResponse(socket, messageId) {
    // 64-byte SMB2 Header + Negotiate Response Body
    const header = Buffer.alloc(64);
    header.write('\xfeSMB', 0);
    header.writeUInt16LE(64, 4); // Header size
    header.writeUInt16LE(0, 6);  // Credit charge
    header.writeUInt32LE(0, 8);  // Status: SUCCESS
    header.writeUInt16LE(0x0000, 12); // Command: Negotiate
    header.writeUInt16LE(1, 14); // Credits granted
    header.writeUInt32LE(0, 16); // Flags (Server response)
    header.writeUInt32LE(0, 20); // Next command
    header.writeBigUInt64LE(messageId, 24);
    header.writeBigUInt64LE(0n, 40); // Session ID

    const body = Buffer.alloc(64);
    body.writeUInt16LE(65, 0); // Structure size (65 = 0x0041)
    body.writeUInt16LE(0, 2);  // Security mode (No signing required)
    body.writeUInt16LE(0x0210, 4); // Dialect SMB 2.1
    body.writeUInt16LE(0, 6);  // Reserved
    body.writeUInt32LE(1, 40); // Max read size
    body.writeUInt32LE(1, 44); // Max write size

    const packet = Buffer.concat([header, body]);
    const netbios = Buffer.alloc(4);
    netbios.writeUInt32BE(packet.length, 0);

    socket.write(Buffer.concat([netbios, packet]));
  }

  sendSessionSetupResponse(socket, messageId) {
    const header = Buffer.alloc(64);
    header.write('\xfeSMB', 0);
    header.writeUInt16LE(64, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt32LE(0, 8); // Status: SUCCESS (Anonymous Access Granted!)
    header.writeUInt16LE(0x0001, 12); // Session Setup
    header.writeUInt16LE(1, 14);
    header.writeUInt32LE(0, 16);
    header.writeBigUInt64LE(messageId, 24);
    header.writeBigUInt64LE(1n, 40); // Session ID = 1

    const body = Buffer.alloc(8);
    body.writeUInt16LE(9, 0);  // Structure size
    body.writeUInt16LE(0, 2);  // Session flags (Guest = 0)
    body.writeUInt16LE(0, 4);  // Security buffer offset
    body.writeUInt16LE(0, 6);  // Security buffer length

    const packet = Buffer.concat([header, body]);
    const netbios = Buffer.alloc(4);
    netbios.writeUInt32BE(packet.length, 0);

    socket.write(Buffer.concat([netbios, packet]));
  }

  sendTreeConnectResponse(socket, messageId) {
    const header = Buffer.alloc(64);
    header.write('\xfeSMB', 0);
    header.writeUInt16LE(64, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt32LE(0, 8); // Status: SUCCESS
    header.writeUInt16LE(0x0003, 12); // Tree Connect
    header.writeUInt16LE(1, 14);
    header.writeUInt32LE(0, 16);
    header.writeBigUInt64LE(messageId, 24);
    header.writeBigUInt64LE(1n, 40);
    header.writeUInt32LE(1, 36); // Tree ID = 1

    const body = Buffer.alloc(16);
    body.writeUInt16LE(16, 0); // Structure size
    body.writeUInt8(0x01, 2);  // Share type = Disk
    body.writeUInt32LE(0x001f01ff, 4); // Full Access permissions!

    const packet = Buffer.concat([header, body]);
    const netbios = Buffer.alloc(4);
    netbios.writeUInt32BE(packet.length, 0);

    socket.write(Buffer.concat([netbios, packet]));
  }

  sendGenericResponse(socket, command, messageId) {
    const header = Buffer.alloc(64);
    header.write('\xfeSMB', 0);
    header.writeUInt16LE(64, 4);
    header.writeUInt32LE(0, 8); // STATUS_SUCCESS
    header.writeUInt16LE(command, 12);
    header.writeUInt16LE(1, 14);
    header.writeBigUInt64LE(messageId, 24);
    header.writeBigUInt64LE(1n, 40);

    const body = Buffer.alloc(4);
    body.writeUInt16LE(4, 0);

    const packet = Buffer.concat([header, body]);
    const netbios = Buffer.alloc(4);
    netbios.writeUInt32BE(packet.length, 0);

    socket.write(Buffer.concat([netbios, packet]));
  }
}

export default AiroSmbServer;
