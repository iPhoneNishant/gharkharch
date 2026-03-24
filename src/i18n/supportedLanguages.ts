/**
 * App UI languages (JSON resources under src/i18n/locales).
 * Device / saved codes are normalized to these base codes before i18n.changeLanguage.
 */
export const SUPPORTED_LANGUAGE_CODES = ['en', 'hi'] as const;
// export const SUPPORTED_LANGUAGE_CODES = ['en', 'hi', 'gu', 'ta', 'mr', 'te', 'kn'] as const;


export type AppLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

const SUPPORTED_SET = new Set<string>(SUPPORTED_LANGUAGE_CODES);

export function normalizeLanguageCode(lang: string | undefined | null): AppLanguageCode {
  if (!lang) return 'en';
  const base = lang.split('-')[0].toLowerCase();
  return SUPPORTED_SET.has(base) ? (base as AppLanguageCode) : 'en';
}
