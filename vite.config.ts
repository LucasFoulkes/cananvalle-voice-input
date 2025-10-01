import path from "path"
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        // Allow precaching larger files like the Vosk bundle (~5.8 MB)
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Precache typical assets plus audio clips
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,mp3,wav,ogg}'
        ],
        // Do not precache large model archives; we will runtime-cache them
        globIgnores: ['**/models/**'],
        runtimeCaching: [
          {
            urlPattern: /^\/audio\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^\/models\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vosk-models',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    })
  ],
})
