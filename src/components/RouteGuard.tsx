import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

// 라우트 접근 가드: 로그인 여부 + 역할(role) 일치를 확인한다.
//  - allow="any"      → 로그인만 되어 있으면 통과 (예: /dashboard)
//  - allow="hospital" → 병원 계정만 통과 (의료인이 URL로 들어오면 /dashboard로 돌려보냄)
//  - allow="worker"   → 의료인 계정만 통과
// 각 페이지의 자체 로그인 체크·데이터 로직은 그대로 두고 그 위에 덧씌우는 방어층이다.
type AllowedRole = 'hospital' | 'worker' | 'any';
type GuardState = 'loading' | 'ok' | 'nologin' | 'wrongrole';

export default function RouteGuard({
  allow,
  children,
}: {
  allow: AllowedRole;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<GuardState>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setState('nologin');
        return;
      }
      if (allow === 'any') {
        setState('ok');
        return;
      }
      // 본인 role만 조회 (본인 행이라 강화된 SELECT 정책에서도 허용됨)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!active) return;
      setState(profile?.role === allow ? 'ok' : 'wrongrole');
    })();
    return () => {
      active = false;
    };
  }, [allow]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        {t('common.checking', { defaultValue: '확인 중...' })}
      </div>
    );
  }
  if (state === 'nologin') return <Navigate to="/login" replace />;
  if (state === 'wrongrole') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
