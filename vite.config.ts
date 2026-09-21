import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Tenload, Marathon de Paris 2027',
        short_name: 'Tenload',
        description:
          "Plan marathon adaptatif piloté par un indice de charge du tendon d'Achille",
        lang: 'fr',
        dir: 'ltr',
        theme_color: '#F6F6F4',
        background_color: '#F6F6F4',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Le service worker est généré par le plugin : on ne peut pas y écrire,
        // mais on peut y greffer un fichier. C'est là que vivent les
        // gestionnaires `push` et `notificationclick`, voir public/push-sw.js.
        importScripts: ['/push-sw.js'],
        // L'app doit s'ouvrir hors ligne : le plan des 35 semaines est statique,
        // seules les saisies ont besoin du réseau (et sont mises en file d'attente).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Les polices embarquent un sous-ensemble vietnamien que le français
        // n'appelle jamais. Le latin étendu, lui, reste : c'est lui qui porte
        // le « œ » de « cœur » et d'« œil ».
        globIgnores: ['**/*vietnamese*'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173, host: true },
  build: { target: 'es2020', sourcemap: true },
})
