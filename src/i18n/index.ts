import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en/translation.json';
import hiTranslation from './locales/hi/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      hi: {
        translation: hiTranslation,
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

if (typeof document !== 'undefined') {
  const syncDocumentLanguage = (language: string) => {
    document.documentElement.lang = language.startsWith('hi') ? 'hi' : 'en';
  };
  syncDocumentLanguage(i18n.language);
  i18n.on('languageChanged', syncDocumentLanguage);
}

export default i18n;
