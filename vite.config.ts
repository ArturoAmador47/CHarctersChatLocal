import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// When running inside Tauri dev, TAURI_DEV_HOST is set for mobile/remote targets.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],

  // Vite options tuned for Tauri development
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    host: host ?? false,
    hmr: host
      ? { protocol: 'ws', host, port: 5174 }
      : undefined
  },

  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  build: {
    // Match Tauri's minimum supported browser target
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_ENV_DEBUG
  }
});
