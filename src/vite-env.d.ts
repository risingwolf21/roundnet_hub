/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const APP_VERSION: string;

interface ViteTypeOptions {
  // By adding this line, you can make the type of importMetaEnv strict
  // to disallow unknown keys.
  strictimportMetaEnv: unknown;
}

interface importMetaEnv {
  readonly VITE_ENV: string;
  readonly VITE_GIT_COMMIT: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_PUBLIC_URL: string;
  readonly VITE_PAYPAL_ME_LINK: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly VITE_OPENWEATHER_API_KEY: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_PAYPAL_ME_LINK: string;
  readonly VITE_WEBSITE_PATH: string;
  readonly VITE_WEBSITE_NAME: string;
}

interface importMeta {
  readonly env: importMetaEnv;
}
