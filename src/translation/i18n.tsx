import { format as formatDate, formatDistance, formatRelative, isDate } from 'date-fns';
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

const locales = { enGB, de };
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


