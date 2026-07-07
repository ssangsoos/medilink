import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

// 언어 수동 전환. 선택은 localStorage(mn_lang)에 저장돼 IP 자동감지보다 우선한다.
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.split('-')[0];

  const change = (code: string) => {
    localStorage.setItem('mn_lang', code);
    i18n.changeLanguage(code);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      {LANGS.map((l, i) => (
        <span key={l.code} className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => change(l.code)}
            className={
              current === l.code
                ? 'font-bold text-blue-600'
                : 'text-gray-400 hover:text-gray-700 transition-colors'
            }
          >
            {l.label}
          </button>
          {i < LANGS.length - 1 && <span className="text-gray-300">·</span>}
        </span>
      ))}
    </div>
  );
}
