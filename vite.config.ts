import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// The Cloudflare plugin runs worker/index.ts alongside the React app in dev,
// so /api/* hits the real proxy locally, same as in production.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
