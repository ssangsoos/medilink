import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import ForgotPassword from '../src/pages/ForgotPassword';
import App from '../src/App';
import ko from '../src/i18n/locales/ko.json';
import en from '../src/i18n/locales/en.json';
import ja from '../src/i18n/locales/ja.json';
import ResetPassword from '../src/pages/ResetPassword';
import { createRecoverySession } from '../src/lib/recoverySession';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
const m = vi.hoisted(() => ({ request: vi.fn(), update: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), valid: false, listeners: new Set<() => void>(), clear: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { resetPasswordForEmail: m.request, updateUser: m.update, signOut: m.signOut, getSession: m.getSession } }, recoverySession: { isValid: () => m.valid, clear: m.clear, subscribe: (fn: () => void) => { m.listeners.add(fn); return () => m.listeners.delete(fn); } } }));
vi.mock('react-i18next', async importOriginal => ({ ...await importOriginal<typeof import('react-i18next')>(), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/components/LanguageSwitcher', () => ({ default: () => null }));
const session = { user: { id: 'u1', last_sign_in_at: '2026-09-18T08:00:00Z' }, expires_at: Math.floor(Date.now()/1000)+3600 } as Session;
beforeEach(() => { vi.clearAllMocks(); m.valid = false; m.listeners.clear(); sessionStorage.clear(); m.request.mockResolvedValue({ error: null }); m.update.mockResolvedValue({ error: null }); m.signOut.mockResolvedValue({ error: null }); m.getSession.mockResolvedValue({ data: { session }, error: null }); });
afterEach(() => vi.useRealTimers());
it.each(['/forgot-password', '/reset-password'])('routes public %s without requiring login', async path => { window.history.replaceState({}, '', path); render(<App />); expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(path === '/forgot-password' ? 'recovery.title' : 'recovery.resetTitle'); });
it('links login to password and email help', () => { window.history.replaceState({}, '', '/login'); render(<App />); expect(screen.getByRole('link', { name: 'recovery.title' })).toHaveAttribute('href', '/forgot-password'); expect(screen.getByRole('link', { name: 'recovery.emailHelp' })).toHaveAttribute('href', '/forgot-password#email-help'); });
it('has all recovery strings in KO EN JA', () => { for (const locale of [ko, en, ja]) { expect(locale).toHaveProperty('recovery.invalid'); expect(locale).toHaveProperty('recovery.sent'); expect(locale).toHaveProperty('recovery.signOutError'); } });
const mount = (page: React.ReactNode) => render(<MemoryRouter>{page}</MemoryRouter>);
const submit = () => fireEvent.submit(document.querySelector('form')!);
function passwords(a = 'new-password', b = a) { fireEvent.change(screen.getByLabelText('recovery.password'), { target: { value: a } }); fireEvent.change(screen.getByLabelText('recovery.confirm'), { target: { value: b } }); }
it('requests canonical recovery with trimmed email and generic success, guards duplicates and cooldown', async () => {
  vi.useFakeTimers(); let resolve!: (v: unknown) => void;
  m.request.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  mount(<ForgotPassword />); fireEvent.change(screen.getByLabelText('recovery.email'), { target: { value: ' user@example.test ' } }); submit(); submit();
  expect(m.request).toHaveBeenCalledTimes(1); expect(m.request).toHaveBeenCalledWith('user@example.test', { redirectTo: 'https://www.medinoti.com/reset-password' });
  await act(async () => resolve({ error: null })); expect(screen.getByRole('status')).toHaveTextContent('recovery.sent'); submit(); expect(m.request).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTimeAsync(60000)); expect(screen.getByRole('button', { name: 'recovery.send' })).toBeEnabled();
  expect(screen.getByRole('link', { name: 'ssangsoos@gmail.com' })).toHaveAttribute('href', 'mailto:ssangsoos@gmail.com');
});
it.each(['smtp', 'network', 'rate'])('shows actionable %s failure, never delivery success', async kind => {
  if (kind === 'network') m.request.mockRejectedValue(new Error('offline')); else m.request.mockResolvedValue({ error: { status: kind === 'rate' ? 429 : 500 } });
  mount(<ForgotPassword />); fireEvent.change(screen.getByLabelText('recovery.email'), { target: { value: 'user@example.test' } }); submit();
  expect(await screen.findByRole('alert')).toHaveTextContent(kind === 'rate' ? 'recovery.rateError' : 'recovery.requestError'); expect(screen.queryByText('recovery.sent')).not.toBeInTheDocument();
});
it('never permits an ordinary existing session or no token to update', async () => { mount(<ResetPassword />); expect(await screen.findByText('recovery.invalid')).toBeVisible(); expect(screen.queryByLabelText('recovery.password')).not.toBeInTheDocument(); expect(m.update).not.toHaveBeenCalled(); });
it('handles SDK recovery event after getSession resolves, rejects mismatch, updates once then local signout', async () => {
  mount(<ResetPassword />); await screen.findByText('recovery.invalid');
  act(() => { m.valid = true; m.listeners.forEach(fn => fn()); }); await screen.findByLabelText('recovery.password'); passwords('new-password', 'different'); submit(); expect(screen.getByRole('alert')).toHaveTextContent('recovery.mismatch'); expect(m.update).not.toHaveBeenCalled();
  passwords(); submit(); submit(); await screen.findByText('recovery.updated'); expect(m.update).toHaveBeenCalledTimes(1); expect(m.update).toHaveBeenCalledWith({ password: 'new-password' }); expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' }); expect(m.clear).toHaveBeenCalled();
});
it('retains successful update when local signout fails', async () => { m.valid = true; m.signOut.mockRejectedValue(new Error('offline')); mount(<ResetPassword />); await screen.findByLabelText('recovery.password'); passwords(); submit(); expect(await screen.findByText('recovery.updated')).toBeVisible(); expect(screen.getByText('recovery.signOutError')).toBeVisible(); });
it('handles expired session and SDK initialization timeout without endless spinner', async () => {
  vi.useFakeTimers(); m.getSession.mockReturnValue(new Promise(() => {})); mount(<ResetPassword />); await act(async () => vi.advanceTimersByTimeAsync(10000)); expect(screen.getByText('recovery.invalid')).toBeVisible(); expect(m.update).not.toHaveBeenCalled();
});
it('rechecks recovery authorization before updating', async () => { m.valid = true; mount(<ResetPassword />); await screen.findByLabelText('recovery.password'); passwords(); m.valid = false; submit(); await screen.findByText('recovery.invalid'); expect(m.update).not.toHaveBeenCalled(); });
it('tracks only actual SDK recovery events, survives same-tab reload, expires and clears on use/signout', () => {
  let callback!: (event: string, session: Session | null) => void;
  const auth = { onAuthStateChange: vi.fn(fn => { callback = fn; return { data: { subscription: { unsubscribe: vi.fn() } } }; }) } as unknown as SupabaseClient['auth'];
  const tracker = createRecoverySession(auth); expect(tracker.isValid(session)).toBe(false); callback('SIGNED_IN', session); expect(tracker.isValid(session)).toBe(false);
  callback('PASSWORD_RECOVERY', session); expect(tracker.isValid(session)).toBe(true); expect(tracker.isValid(null)).toBe(false); expect(tracker.isValid({ ...session, user: { id: 'other' } } as Session)).toBe(false);
  const restored = createRecoverySession(auth); callback('SIGNED_IN', session); expect(restored.isValid(session)).toBe(true); expect(restored.isValid({ ...session, expires_at: 1 })).toBe(false); callback('SIGNED_OUT', null); expect(restored.isValid(session)).toBe(false);
});
