// 외부 링크·전화 스킴을 안전하게 다루는 유틸.
// 저장형 XSS·피싱 방지: javascript:, data:, vbscript: 같은 위험 스킴을 차단하고
// http(s)만 허용한다. 렌더 시점과 저장 시점 양쪽에서 사용한다.

const tryParseHttp = (candidate: string): string | null => {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
};

// http(s) URL이면 정규화해서 반환, 아니면 null.
// - javascript:/data: 등 위험 스킴 → null (차단)
// - 스킴이 없는 기존 링크(open.kakao.com/…) → https:// 를 붙여 보존
export const safeHttpUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === '') return null;

  const direct = tryParseHttp(trimmed);
  if (direct) return direct;

  // 스킴이 붙어 있는데 http(s)가 아니면(javascript: 등) 차단.
  // 스킴이 아예 없을 때만 https:// 를 붙여 재검증한다.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return tryParseHttp('https://' + trimmed);
  }
  return null;
};

// sms:/tel: href에 넣을 전화번호를 숫자(+ 선택적 선행 +)만 남긴다.
export const safeTelDigits = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^0-9]/g, '');
};
