import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

let targetPort = '9900';
try {
  const portJsonPath = path.join(process.cwd(), 'config', 'port.json');
  if (fs.existsSync(portJsonPath)) {
    const data = JSON.parse(fs.readFileSync(portJsonPath, 'utf8'));
    if (data.port) targetPort = data.port.toString();
  }
} catch (err) {
  // Ignore
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Expose to local network
    proxy: {
      '/api': {
        target: `http://localhost:${targetPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
