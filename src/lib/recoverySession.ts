import type { Session, SupabaseClient } from '@supabase/supabase-js';

const KEY = 'medinoti.recovery';
const RECOVERY_WINDOW_MS = 30 * 60 * 1000;
export const RECOVERY_PASSWORD_MIN_LENGTH = 8;

// UI provenance only, never an authentication token. Supabase validates the
// actual session and authorizes updateUser. No credentials are copied to storage.
export function createRecoverySession(auth: SupabaseClient['auth']) {
  let marker: { userId: string; lastSignIn: string; until: number } | null = null;
  const listeners = new Set<() => void>();
  try { marker = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { /* unavailable storage */ }
  const clear = () => {
    marker = null;
    try { sessionStorage.removeItem(KEY); } catch { /* memory fallback */ }
    listeners.forEach(fn => fn());
  };
  const params = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  if (params.has('error') || query.has('error') || params.has('access_token')) clear();
  // Subscribe at client creation, BEFORE React mounts. The implicit-flow SDK
  // emits PASSWORD_RECOVERY on a timer after getSession can already resolve.
  auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session?.user.last_sign_in_at) {
      marker = { userId: session.user.id, lastSignIn: session.user.last_sign_in_at, until: Date.now() + RECOVERY_WINDOW_MS };
      try { sessionStorage.setItem(KEY, JSON.stringify(marker)); } catch { /* memory fallback */ }
      listeners.forEach(fn => fn());
    } else if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && (!session || marker?.userId !== session.user.id || marker?.lastSignIn !== session.user.last_sign_in_at))) clear();
    // SIGNED_IN also fires on SDK storage recovery / tab focus. Preserve only
    // the same recovery login, not a later ordinary login by the same user.
  });
  return {
    clear,
    isValid: (session: Session | null) => Boolean(session && marker && marker.userId === session.user.id && marker.lastSignIn === session.user.last_sign_in_at && marker.until > Date.now() && session.expires_at && session.expires_at * 1000 > Date.now()),
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}
