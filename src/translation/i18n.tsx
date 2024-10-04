import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import {initReactI18next} from "react-i18next";
import {format as formatDate, isDate} from "date-fns";
import translationEN from './locales/translation.en_US.json'
import translationDE from './locales/translation.de_DE.json';

const resources = {
    en: {
        translation: translationEN
    },
    de: {
        translation: translationDE
    }
};

i18n
    .use(detector)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: "de",
        interpolation: {
            escapeValue: false, // react already safes from xss
            format: (value, format, lng) => {
                if (isDate(value) && format && lng) {
                    return formatDate(value, format);
                }
                return value;
            }
        }
    });

export default i18n;