import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { createLocalBackend } from './apps-script/local';

/**
 * Dev only: serves the real Apps Script backend from memory at /__api, so the
 * whole admin and volunteer flow works before a Google Sheet is connected.
 * Used when VITE_API_URL is not set. Admin password: "admin".
 */
function demoBackend(): Plugin {
  return {
    name: 'demo-backend',
    apply: 'serve',
    configureServer(server) {
      const backend = createLocalBackend();
      server.middlewares.use('/__api', (req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.end(backend.handle(body));
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), demoBackend()],
  server: {
    // The camera API only works on localhost or HTTPS, so expose the LAN host
    // over HTTPS-less localhost and let phones connect through a tunnel in dev.
    host: true,
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
