import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'intl-pluralrules';

import en from './locales/en.json';
import hi from './locales/hi.json';
import gu from './locales/gu.json';
import ta from './locales/ta.json';
import mr from './locales/mr.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import { normalizeLanguageCode, SUPPORTED_LANGUAGE_CODES } from './supportedLanguages';

const RESOURCES = {
  en: { translation: en },
  hi: { translation: hi },
  gu: { translation: gu },
  ta: { translation: ta },
  mr: { translation: mr },
  te: { translation: te },
  kn: { translation: kn },
};

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        return callback(normalizeLanguageCode(savedLanguage));
      }

      const deviceLanguage = Localization.getLocales()[0]?.languageCode;
      return callback(normalizeLanguageCode(deviceLanguage));
    } catch (error) {
      console.error('Error reading language', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem('user-language', normalizeLanguageCode(language));
    } catch (error) {
      console.error('Error saving language', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: RESOURCES,
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export { normalizeLanguageCode, SUPPORTED_LANGUAGE_CODES } from './supportedLanguages';
export default i18n;
