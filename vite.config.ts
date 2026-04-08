import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // The camera API only works on localhost or HTTPS, so expose the LAN host
    // over HTTPS-less localhost and let phones connect through a tunnel in dev.
    host: true,
  },
});
