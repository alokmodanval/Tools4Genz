import { useTranslation } from 'react-i18next';

export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return {
    language: i18n.language,
    changeLanguage,
    languages,
  };
}
