import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['logo.png', 'logo.ico', 'icon-ios.png'],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: 'ParkiUpar',
        short_name: 'ParkiUpar',
        description: 'Software de gestión de parqueaderos',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-ios.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'pdf';
          if (id.includes('leaflet')) return 'maps';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('date-fns')) return 'dates';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms';
          return 'vendor';
        },
      },
    },
  },
});
