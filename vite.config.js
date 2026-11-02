import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function pathFromPublicUrl(publicUrl) {
  try {
    if (!publicUrl) return '/';
    const u = new URL(publicUrl);
    // leere oder "/" -> root
    return u.pathname && u.pathname !== '/' ? (u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`) : '/';
  } catch {
    // falls nur ein Pfad übergeben wurde (z. B. "/foo/")
    return publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`;
  }
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const APP_NAME = env.VITE_WEBSITE_NAME ?? 'App';
  const SHORT_NAME = env.VITE_SHORT_NAME ?? APP_NAME;
  const THEME_COLOR = env.VITE_THEME_COLOR ?? '#0b5fff';
  const BG_COLOR = env.VITE_BG_COLOR ?? '#ffffff';
  const PUBLIC_URL = env.VITE_PUBLIC_URL; // z.B. https://munich-roundnet.web.app/  oder https://host/app/
  const BASE_PATH = pathFromPublicUrl(PUBLIC_URL); // leitet base/scope/start_url ab
  const START_URL = env.VITE_START_URL ?? BASE_PATH; // überschreibbar
  const SCOPE = env.VITE_SCOPE ?? BASE_PATH; // überschreibbar
  const ICON_PREFIX = env.VITE_ICON_PREFIX ?? '/icons'; // z.B. /icons/roundnet-karlsruhe oder /icons/munich-roundnet
  const ENABLE_PWA_DEV = env.VITE_PWA_DEV === 'true'; // SW im Dev aktiv? meist false
  const IS_ANALYZE = mode === 'analyze';

  return {
    base: BASE_PATH,
    envDir: './environments',
    plugins: [
      // e2e code coverage (playwright.yml sets E2E_COVERAGE=true); never active in normal dev/prod.
      process.env.E2E_COVERAGE === 'true' &&
        // ESM-only package and the config is bundled as CJS → load it lazily.
        (await import('vite-plugin-istanbul')).default({
          include: 'src/**/*',
          exclude: ['node_modules', 'src/**/*.test.*', 'src/types/**'],
          extension: ['.ts', '.tsx'],
          requireEnv: false,
          forceBuildInstrument: false,
        }),
      react(),
      tailwindcss(),
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: "roundnet-karlsruhe",
        project: "roundnet-karlsruhe",
      }),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'service-worker.ts',
        registerType: 'autoUpdate',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
          maximumFileSizeToCacheInBytes: 3000000
        },
        devOptions: {
          enabled: ENABLE_PWA_DEV,
          type: 'module',
        },
        manifest: {
          name: APP_NAME,
          short_name: SHORT_NAME,
          start_url: START_URL,
          scope: SCOPE,
          display: 'standalone',
          background_color: BG_COLOR,
          theme_color: THEME_COLOR,
          icons: [
            { src: `${ICON_PREFIX}/favicon.ico`, sizes: '48x48', type: 'image/x-icon' },
            {
              src: `${ICON_PREFIX}/android-chrome-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: `${ICON_PREFIX}/android-chrome-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          ...(env.VITE_MANIFEST_CANONICAL_URL
            ? { related_applications: [{ platform: 'webapp', url: env.VITE_MANIFEST_CANONICAL_URL }] }
            : {}),
        },
        includeAssets: ['**/*'],
      }),
      IS_ANALYZE && visualizer({ open: true, gzipSize: true }),
    ].filter(Boolean),
    build: {
      target: 'es2020',
      sourcemap: false,
      outDir: 'build', // CRA's default build output
      rollupOptions: {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/tests/setupTests.ts',
      include: ['src/**/*.test.{ts,tsx}'],
    },
    server: {
      port: 5173,
      strictPort: false,
    },
    preview: { port: 4173 },
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
