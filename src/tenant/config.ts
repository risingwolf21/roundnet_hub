import RoundnetKarlsruheLogo from '../images/Karlsruher_Kojoten_Logo.svg';
import RoundnetMunichLogo from '../images/Roundnet_Munich_Logo.png';

export type TenantId = 'roundnet-karlsruhe' | 'munich-roundnet';

export type TenantConfig = {
  id: TenantId;
  logo: string;
  icon: string;
  defaultMapLocation: { latitude: number; longitude: number };
};

const TENANTS: Record<TenantId, TenantConfig> = {
  'roundnet-karlsruhe': {
    id: 'roundnet-karlsruhe',
    logo: RoundnetKarlsruheLogo,
    icon: '🐺',
    defaultMapLocation: { latitude: 49.0069, longitude: 8.4037 },
  },
  'munich-roundnet': {
    id: 'munich-roundnet',
    logo: RoundnetMunichLogo,
    icon: '🏐',
    defaultMapLocation: { latitude: 48.1351, longitude: 11.582 },
  },
};

export const TENANT: TenantConfig =
  TENANTS[import.meta.env.VITE_WEBSITE_PATH as TenantId] ?? TENANTS['roundnet-karlsruhe'];

// Provider of both apps (Impressum / privacy policy). Leave the email empty until the support address exists.
export const LEGAL = {
  operator: 'Karl Wolf',
  street: 'Stolzingstraße 21',
  city: '81927 München',
  country: 'Deutschland',
  email: '',
};
