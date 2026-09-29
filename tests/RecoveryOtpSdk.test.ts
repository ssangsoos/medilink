import { beforeEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createRecoverySession } from '../src/lib/recoverySession';

beforeEach(() => { sessionStorage.clear(); window.history.replaceState({}, '', '/reset-password'); });
// Execute the installed SDK, but every HTTP request stays in this local fixture.
// No credentials, production accounts, recovery emails or external network involved.
it.each(['recovery', 'email'] as const)('real SDK POST verifyOtp type=%s emits only the corresponding auth event', async type => {
  const transport = vi.fn(async () => new Response(JSON.stringify({
    access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token',
    token_type: 'bearer', expires_in: 3600,
    user: { id: 'fixture-user', email: 'fixture@example.test', last_sign_in_at: '2026-09-29T00:00:00Z' },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const client = createClient('https://supabase.example.test', 'fixture-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `otp-sdk-${type}` },
    global: { fetch: transport },
  });
  const tracker = createRecoverySession(client.auth);
  const events: string[] = [];
  const { data: { subscription } } = client.auth.onAuthStateChange(event => { events.push(event); });
  await client.auth.getSession();
  const result = await client.auth.verifyOtp({ email: 'fixture@example.test', token: '12345678', type });
  expect(result.error).toBeNull();
  const { data: { session } } = await client.auth.getSession();
  expect(session).not.toBeNull();
  expect(events.filter(event => event !== 'INITIAL_SESSION')).toEqual([type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN']);
  expect(tracker.isValid(session)).toBe(type === 'recovery');
  expect(transport).toHaveBeenCalledTimes(1);
  const [url, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://supabase.example.test/auth/v1/verify');
  expect(url).not.toContain('12345678'); expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toMatchObject({ email: 'fixture@example.test', token: '12345678', type });
  expect(JSON.stringify({ ...sessionStorage })).not.toContain('12345678');
  subscription.unsubscribe(); tracker.clear(); await client.auth.stopAutoRefresh();
});
it('real SDK rejects invalid OTP without emitting recovery or creating a marker/session', async () => {
  const client = createClient('https://supabase.example.test', 'fixture-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'otp-sdk-invalid' },
    global: { fetch: vi.fn(async () => new Response(JSON.stringify({ msg: 'Token has expired or is invalid', error_code: 'otp_expired' }), { status: 403, headers: { 'Content-Type': 'application/json' } })) },
  });
  const tracker = createRecoverySession(client.auth);
  const events: string[] = [];
  const { data: { subscription } } = client.auth.onAuthStateChange(event => { events.push(event); });
  await client.auth.getSession();
  const result = await client.auth.verifyOtp({ email: 'fixture@example.test', token: '123456', type: 'recovery' });
  expect(result.error?.status).toBe(403); expect(result.data.session).toBeNull();
  expect(events).not.toContain('PASSWORD_RECOVERY'); expect(sessionStorage.getItem('medinoti.recovery')).toBeNull();
  expect((await client.auth.getSession()).data.session).toBeNull();
  subscription.unsubscribe(); tracker.clear(); await client.auth.stopAutoRefresh();
});
