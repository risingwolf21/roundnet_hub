import type { CapacitorConfig } from '@capacitor/cli';
import karlsruhe from './tenants/karlsruhe/tenant.json';
import munich from './tenants/munich/tenant.json';

const TENANTS = { karlsruhe, munich } as const;
type NativeTenant = keyof typeof TENANTS;

// One native project per store app. Pick it explicitly so a command never touches the wrong app: CAP_TENANT=karlsruhe cap sync
const key = process.env.CAP_TENANT as NativeTenant | undefined;
if (!key || !(key in TENANTS)) {
  throw new Error(`Set CAP_TENANT to one of: ${Object.keys(TENANTS).join(', ')}`);
}
const tenant = TENANTS[key];

const config: CapacitorConfig = {
  appId: tenant.appId,
  appName: tenant.appName,
  webDir: `build-native/${key}`,
  ios: {
    path: `native/${key}/ios`,
    contentInset: 'never',
  },
  android: {
    path: `native/${key}/android`,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: tenant.themeColor,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
