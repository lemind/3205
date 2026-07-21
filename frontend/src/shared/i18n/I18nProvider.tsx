import { useState, type ReactNode } from 'react';
import { translations, type Lang } from './translations';
import { I18nContext, type I18nContextValue } from './context';

const STORAGE_KEY = 'lang';

// RU default per spec (T054) — only trusts localStorage for a real prior choice.
function readInitialLang(): Lang {
  if (typeof window === 'undefined') return 'ru';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' ? 'en' : 'ru';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  function setLang(next: Lang): void {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const dict = translations[lang];
  const value: I18nContextValue = {
    lang,
    setLang,
    t: (key) => dict[key],
    statusLabel: (status) => dict.status[status],
    progressText: dict.progressText,
    countsText: dict.countsText,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
