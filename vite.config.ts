import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gatewayUrl = env.GATEWAY_URL || 'http://192.168.1.2:8080';

  return {
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: gatewayUrl,
          changeOrigin: true,
          secure: false,
        }
      },
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false, // Disable service worker in dev to avoid caching API requests
        },
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
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icon-ios.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});