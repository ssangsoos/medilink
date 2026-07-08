import { track } from '@vercel/analytics';

// 퍼널 측정용 커스텀 이벤트. Vercel Web Analytics는 쿠키리스·PII 미수집.
// 원칙: 분석 이벤트는 절대 앱 흐름을 막지 않는다. 실패해도 조용히 무시한다.
type Props = Record<string, string | number | boolean | null>;

export const trackEvent = (name: string, props?: Props): void => {
  try {
    track(name, props);
  } catch {
    /* 분석 실패는 사용자 경험에 영향 없음 — 무시 */
  }
};
