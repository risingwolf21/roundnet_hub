import { format as formatDate, formatDistance, formatRelative, isDate, Locale } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import translationDE from './locales/translation.de.json';
import translationEN from './locales/translation.en.json';

const resources = {
  enGB: {
    translation: translationEN,
  },
  de: {
    translation: translationDE,
  },
};

const formatRelativeLocaleDE = {
  lastWeek: "'Letzten' dddd 'um' HH:mm",
  yesterday: "'gestern um' HH:mm",
  today: "'Heute um' HH:mm",
  tomorrow: "'morgen um' HH:mm 'Uhr'",
  nextWeek: "dddd 'um' HH:mm",
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
  formatRelative: (token, _date, _baseDate, _options) => {
    return formatRelativeLocaleDE[token];
  },
};

export const LOCALE_EN: Locale = {
  ...enGB,
  formatRelative: (token, _date, _baseDate, _options) => {
    return formatRelativeLocaleEN[token];
  },
};

const locales = { enGB: LOCALE_EN, de: LOCALE_DE };
type Lang = keyof typeof locales;

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: 'de',
    interpolation: {
      escapeValue: false, // react already safes from xss
      format: (value, format, lng) => {
        if (!isDate(value) || !format) {
          return value;
        }
        let locale = de;
        if (Object.keys(locales).includes(lng ?? '')) {
          locale = locales[lng as Lang];
        }

        if (format === 'short') return formatDate(value, 'P', { locale });
        if (format === 'long') return formatDate(value, 'PPPP', { locale });
        if (format === 'relative') return formatRelative(value, new Date(), { locale });
        if (format === 'ago')
          return formatDistance(value, new Date(), {
            locale,
            addSuffix: true,
          });

        return formatDate(value, format, { locale });
      },
    },
  });
