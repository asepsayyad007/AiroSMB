import FtpServer from 'ftp-srv';
import path from 'path';
import os from 'os';

class AiroFtpServer {
  constructor(options = {}) {
    this.port = options.port || 2121;
    this.host = options.host || '0.0.0.0';
    this.rootPath = options.rootPath || path.join(os.homedir(), 'Downloads');
    this.ftpServer = null;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return true;

    try {
      this.ftpServer = new FtpServer({
        url: `ftp://${this.host}:${this.port}`,
        anonymous: true,
        greeting: ['Welcome to AiroShare Home Server FTP Engine']
      });

      this.ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
        connection.on('error', (err) => {
          // Suppress non-critical FTP client directory read errors
        });
        // Grant full access to rootPath without password
        return resolve({ root: this.rootPath });
      });

      await this.ftpServer.listen();
      this.isRunning = true;
      console.log(`[AiroShare] Native FTP Server listening on port ${this.port} (Anonymous Auth Allowed)`);
      return true;
    } catch (err) {
      console.warn(`[AiroShare FTP Engine Warning] Port ${this.port} unavailable: ${err.message}`);
      this.isRunning = false;
      return false;
    }
  }

  async stop() {
    if (this.ftpServer && this.isRunning) {
      await this.ftpServer.close();
      this.isRunning = false;
      console.log('[AiroShare] Native FTP Server stopped');
    }
    return true;
  }
}

export default AiroFtpServer;
