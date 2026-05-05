import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH ?? '/';
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        base,
        manifest: {
          name: 'DWA-App (M 590)',
          short_name: 'M 590',
          description: 'Beregnungsbedarfsermittlung nach DWA-M 590',
          theme_color: '#019aa3',
          background_color: '#015a62',
          display: 'standalone',
          start_url: base,
          icons: [
            {src: 'icon-192.png', sizes: '192x192', type: 'image/png'},
            {src: 'icon-512.png', sizes: '512x512', type: 'image/png'},
            {src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,wasm,json}'],
          globIgnores: ['data/**'],
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router', 'zustand'],
            'vendor-map': ['leaflet', 'react-leaflet', 'proj4'],
            'vendor-pdf': ['@react-pdf/renderer'],
          },
        },
      },
    },
  };
});