import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const basePath = process.env.VITE_BASE_PATH ?? '/'
// When building the stable (main) version, prevent its Service Worker from
// intercepting navigation requests destined for the /preview/ sub-deployment,
// so the preview SW can register and serve its own index.html correctly.
const isPreviewBuild = basePath.includes('/preview/')

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024, // 30 MiB — covers WASM + kokoro bundle
        navigateFallbackDenylist: isPreviewBuild ? [] : [/\/preview\//],
      },
      manifest: {
        name: '畫作鏡頭影片產生器',
        short_name: 'ArtFilm',
        description: '9:16 Video Studio — 快速為畫作建立電影感鏡頭路徑並輸出影片',
        theme_color: '#1d4ed8',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'kokoro-js']
  },
  build: {
    // Large dictionary/model helper chunks are loaded only when the user requests
    // Chinese conversion or local TTS generation, so they should not warn as part
    // of the initial app bundle budget.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
            return 'vendor-react'
          }
          if (id.includes('/node_modules/@radix-ui/')) {
            return 'vendor-radix'
          }
          if (id.includes('/node_modules/@xzdarcy/')) {
            return 'vendor-timeline'
          }
          if (id.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons'
          }
          if (id.includes('/node_modules/opencc-js/dist/esm/cn2t.js')) {
            return 'opencc-cn2t'
          }
          if (id.includes('/node_modules/opencc-js/dist/esm/t2cn.js')) {
            return 'opencc-t2cn'
          }
          if (id.includes('/node_modules/opencc-js/')) {
            return 'opencc'
          }
          if (id.includes('/node_modules/kokoro-js/')) {
            return 'tts-kokoro'
          }
          if (id.includes('/node_modules/onnxruntime-common/')) {
            return 'tts-onnx'
          }
          if (id.includes('/node_modules/phonemizer/')) {
            return 'tts-phonemizer'
          }
          if (id.includes('/node_modules/@huggingface/transformers/')) {
            return 'tts-transformers'
          }
          if (id.includes('/node_modules/onnxruntime-web/')) {
            return 'tts-onnx'
          }
          return 'vendor'
        }
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
})
