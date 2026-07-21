import { createContext, useContext } from 'react';
import type { Lang, StatusKey, TranslationKey } from './translations';

export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  statusLabel: (status: StatusKey) => string;
  progressText: (processed: number, total: number) => string;
  countsText: (
    urlCount: number,
    successCount: number,
    errorCount: number,
    cancelledCount: number,
  ) => string;
  checkErrorMessage: (raw: string) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}
