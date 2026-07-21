import { useTranslation } from '../i18n/context';

export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="join font-mono text-xs">
      <button
        type="button"
        className={`btn btn-xs join-item ${lang === 'ru' ? 'btn-active text-accent neon-text' : 'btn-ghost'}`}
        onClick={() => setLang('ru')}
        aria-pressed={lang === 'ru'}
      >
        RU
      </button>
      <button
        type="button"
        className={`btn btn-xs join-item ${lang === 'en' ? 'btn-active text-accent neon-text' : 'btn-ghost'}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  );
}
