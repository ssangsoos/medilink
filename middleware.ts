// Vercel Edge Middleware — 접속 IP의 국가를 읽어 `mn_country` 쿠키로 심는다.
// 클라이언트 i18n(detectLanguage)이 이 쿠키를 읽어 최초 언어를 정한다.
// 절대 원칙: 이 미들웨어는 어떤 경우에도 페이지를 막지 않는다.
// 국가 정보가 없거나 오류가 나면 쿠키만 생략하고 그대로 통과 → 클라이언트가
// navigator.language로 안전하게 폴백한다. (무중단·무오류)
import { next } from '@vercel/edge';

// 정적 자산(/assets, 확장자 있는 파일)과 API는 제외하고, SPA 문서 요청에만 적용.
export const config = {
  matcher: ['/((?!api|assets|.*\\..*).*)'],
};

export default function middleware(request: Request) {
  try {
    const res = next();
    // 이미 mn_country 쿠키가 있으면 덮어쓰지 않는다. (매 요청 재설정 방지 +
    // 사용자가 스위처로 언어를 바꿔 심어둔 상태를 존중) 쿠키는 7일 뒤 자동 갱신.
    const hasCookie = /(?:^|;\s*)mn_country=/.test(request.headers.get('cookie') || '');
    if (!hasCookie) {
      const country = request.headers.get('x-vercel-ip-country');
      // 2글자 ISO 국가코드일 때만 심는다. HttpOnly 아님 → 클라이언트 JS가 읽어야 함.
      if (country && /^[A-Za-z]{2}$/.test(country)) {
        res.headers.append(
          'Set-Cookie',
          `mn_country=${country.toUpperCase()}; Path=/; Max-Age=604800; SameSite=Lax; Secure`,
        );
      }
    }
    return res;
  } catch {
    // 어떤 예외든 그냥 통과. 언어 감지는 클라이언트 폴백에 맡긴다.
    return next();
  }
}
