import type {Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import pkg from './package.json' with {type: 'json'};

function seoPlugin(appUrl: string, indexableRoutes: string[]): Plugin {
  // appUrl already includes the base path (e.g. https://example.com/tmp/dwa/).
  // Routes like '/about' are absolute from the origin, so we strip the leading
  // slash and resolve them relative to appUrl to preserve the base path.
  const resolve = (route: string) => new URL(route.replace(/^\//, ''), appUrl).href;
  const pathname = (route: string) => new URL(route.replace(/^\//, ''), appUrl).pathname;

  return {
    name: 'seo-files',
    generateBundle() {
      const basePath = new URL(appUrl).pathname;
      const robotsLines = [
        'User-agent: *',
        `Allow: ${basePath}`,
        ...indexableRoutes.map(r => `Allow: ${pathname(r)}`),
        `Sitemap: ${new URL('sitemap.xml', appUrl).href}`,
      ];
      this.emitFile({type: 'asset', fileName: 'robots.txt', source: robotsLines.join('\n') + '\n'});

      const now = new Date().toISOString().split('T')[0];
      const urlEntries = [appUrl, ...indexableRoutes.map(resolve)]
        .map(loc => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`)
        .join('\n');
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
      this.emitFile({type: 'asset', fileName: 'sitemap.xml', source: sitemap});
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH ?? '/';
  const appUrl = env.VITE_APP_URL ?? `http://localhost:5174${base}`;
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
    },
    plugins: [
      seoPlugin(appUrl, ['/about', '/privacy']),
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
            {src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
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