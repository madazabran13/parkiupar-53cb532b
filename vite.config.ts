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
          // Solo splitear paquetes que NO comparten ciclo con la UI (Radix/Floating-UI):
          // grandes, autocontenidos y cargados perezosamente.
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'pdf';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('leaflet')) return 'maps';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('date-fns')) return 'dates';
          if (id.includes('@supabase')) return 'supabase';
          // Todo lo demás (react, react-dom, scheduler, react-is, react-router,
          // @tanstack/react-query, @radix-ui/*, @floating-ui/*, react-remove-scroll,
          // react-style-singleton, use-sync-external-store, lucide-react, hookform, zod)
          // queda en un único `vendor` para evitar ciclos cross-chunk que dejan
          // React.forwardRef como `undefined` durante la evaluación.
          return 'vendor';
        },
      },
    },
  },
});
