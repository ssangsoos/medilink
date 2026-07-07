import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

export const SUPPORTED_LANGS = ['ko', 'en', 'ja'] as const;

// 접속 국가(ISO 코드) → 언어. 목록에 없으면 영어.
const COUNTRY_LANG: Record<string, string> = { KR: 'ko', JP: 'ja' };

const getCookie = (name: string): string | null => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
};

// 언어 결정 우선순위:
// 1) 사용자가 스위처로 고른 언어(localStorage)  2) IP 국가(Vercel 미들웨어가 심는 mn_country 쿠키)
// 3) 브라우저 언어  4) 최종 폴백=한국어. 어떤 단계가 비어도 다음으로 안전하게 내려간다.
export const detectLanguage = (): string => {
  const saved = localStorage.getItem('mn_lang');
  if (saved && (SUPPORTED_LANGS as readonly string[]).includes(saved)) return saved;

  const country = getCookie('mn_country');
  if (country) return COUNTRY_LANG[country.toUpperCase()] ?? 'en';

  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('en')) return 'en';

  return 'ko';
};

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: detectLanguage(),
  fallbackLng: 'ko', // 번역 누락 키는 항상 한국어로 표시 → 절대 빈 화면이 없음
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
