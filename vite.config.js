import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';

  return {
    plugins: [
      react(),
      VitePWA({
        // wir verwenden DEINEN SW
        srcDir: 'src',
        filename: 'service-worker.js',
        strategies: 'injectManifest',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}']
        },
        registerType: 'prompt', // zeigt Update-Prompt (siehe register)
        devOptions: {
          enabled: true, // SW auch im dev für Tests (kannst du auf false setzen)
          type: 'module'
        },
        manifest: {
          name: 'Deine App',
          short_name: 'App',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#0b5fff',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      }),
      isAnalyze && visualizer({ open: true, gzipSize: true })
    ].filter(Boolean),
    build: {
      target: 'es2020',
      sourcemap: true,
      outDir: 'build', // CRA's default build output
    },
    server: {
      port: 5173,
      strictPort: false
    },
    preview: { port: 4173 },
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  };
});