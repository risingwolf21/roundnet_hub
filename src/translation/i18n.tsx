import { format as formatDate, formatDistance, formatRelative, isDate, Locale, setDefaultOptions } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import translationDE from './locales/translation.de.json';
import translationEN from './locales/translation.en.json';

const resources = {
  en: {
    translation: translationEN,
  },
  de: {
    translation: translationDE,
  },
};

const formatRelativeLocaleDE = {
  lastWeek: "'Letzten' cccc 'um' HH:mm",
  yesterday: "'gestern um' HH:mm",
  today: "'Heute um' HH:mm",
  tomorrow: "'morgen um' HH:mm 'Uhr'",
  nextWeek: "cccc, dd.MM 'um' HH:mm",
  other: "dd MMM yyyy 'um' HH:mm",
};

const formatRelativeLocaleEN = {
  lastWeek: "'Last' dddd 'at' HH:mm a",
  yesterday: "'Yesterday at' HH:mm a",
  today: "'Today at' HH:mm a",
  tomorrow: "'Tomorrow at' HH:mm a",
  nextWeek: "dddd 'at' HH:mm a",
  other: "dd MMM yyyy 'at' HH:mm a",
};

export const LOCALE_DE: Locale = {
  ...de,
  formatRelative: (token) => formatRelativeLocaleDE[token],
};

export const LOCALE_EN: Locale = {
  ...enGB,
  formatRelative: (token) => formatRelativeLocaleEN[token],
};

const locales = { en: LOCALE_EN, de: LOCALE_DE };
type Lang = keyof typeof locales;

// i18next 21+ ignores `interpolation.format` and uses its own formatter, which does not know date-fns patterns
// such as `{{date, dd.MM.yyyy HH:mm}}` or `{{date, ago}}` and would print the raw Date. Register our own.
const dateFormatter = {
  type: 'formatter' as const,
  init: () => undefined,
  format: (value: unknown, format: string | undefined, lng: string | undefined) => {
    if (!isDate(value) || !format) {
      return value as string;
    }
    const locale = lng && lng in locales ? locales[lng as Lang] : de;

    if (format === 'short') return formatDate(value, 'P', { locale });
    if (format === 'long') return formatDate(value, 'PPPP', { locale });
    if (format === 'relative') return formatRelative(value, new Date(), { locale });
    if (format === 'ago') return formatDistance(value, new Date(), { locale, addSuffix: true });

    return formatDate(value, format, { locale });
  },
};

i18n
  .use(LanguageDetector)
  .use(dateFormatter)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    // German unless the user picked English (profile switcher; remembered on the device and in user.language).
    fallbackLng: 'de',
    supportedLngs: ['de', 'en'],
    detection: { order: ['localStorage'], caches: ['localStorage'] },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

// Month/weekday names from date-fns and the <html lang> attribute follow the selected language.
const applyLanguage = (lng: string) => {
  const lang: Lang = lng === 'en' ? 'en' : 'de';
  setDefaultOptions({ locale: locales[lang] });
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
};
i18n.on('languageChanged', applyLanguage);
applyLanguage(i18n.language);
