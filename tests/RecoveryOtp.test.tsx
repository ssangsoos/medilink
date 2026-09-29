import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import ResetPassword from '../src/pages/ResetPassword';
import ForgotPassword from '../src/pages/ForgotPassword';
import { recoverySession } from '../src/lib/supabase';
import ko from '../src/i18n/locales/ko.json';
import en from '../src/i18n/locales/en.json';
import ja from '../src/i18n/locales/ja.json';

const m = vi.hoisted(() => ({ verify: vi.fn(), getSession: vi.fn(), update: vi.fn(), signOut: vi.fn(), request: vi.fn(), emit: vi.fn<(event: string, session: Session | null) => void>() }));
vi.mock('../src/lib/supabase', async () => {
  const { createRecoverySession } = await import('../src/lib/recoverySession');
  const auth = {
    verifyOtp: m.verify, getSession: m.getSession, updateUser: m.update,
    signOut: m.signOut, resetPasswordForEmail: m.request,
    onAuthStateChange: vi.fn(fn => { m.emit = fn; }),
  };
  return { supabase: { auth }, recoverySession: createRecoverySession(auth as never) };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/components/LanguageSwitcher', () => ({ default: () => null }));
const session = { user: { id: 'otp-user', last_sign_in_at: '2026-09-29T00:00:00Z' }, expires_at: Math.floor(Date.now() / 1000) + 3600 } as Session;
const mount = (page = <ResetPassword />) => render(<MemoryRouter>{page}</MemoryRouter>);
const submit = () => fireEvent.submit(document.querySelector('form')!);
async function enter(code = '123456', email = ' user@example.test ') {
  fireEvent.change(await screen.findByLabelText('recovery.email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('recovery.code'), { target: { value: code } });
}
function validRecovery() {
  m.getSession.mockResolvedValue({ data: { session }, error: null });
  m.emit('PASSWORD_RECOVERY', session);
  return { data: { session }, error: null };
}
beforeEach(() => {
  vi.resetAllMocks(); recoverySession.clear(); sessionStorage.clear(); localStorage.clear();
  window.history.replaceState({}, '', '/reset-password');
  m.getSession.mockResolvedValue({ data: { session: null }, error: null });
  m.verify.mockResolvedValue({ data: { session: null }, error: { status: 403, message: 'private provider detail' } });
  m.update.mockResolvedValue({ error: null }); m.signOut.mockResolvedValue({ error: null });
});

it('offers manual code entry from ForgotPassword without email or token in the URL', () => {
  mount(<ForgotPassword />);
  expect(screen.getByRole('link', { name: 'recovery.enterCode' })).toHaveAttribute('href', '/reset-password');
  expect(screen.getByText('recovery.codeHelp')).toBeVisible();
});
it.each(['123456', '1234567', '12345678', '123456789', '1234567890'])('verifies a %s recovery OTP with trimmed values and clears it', async code => {
  m.verify.mockImplementation(async () => validRecovery());
  mount(); await enter(` ${code} `);
  const input = screen.getByLabelText('recovery.code');
  expect(input).toHaveAttribute('inputmode', 'numeric');
  expect(input).toHaveAttribute('autocomplete', 'one-time-code');
  submit();
  await screen.findByLabelText('recovery.password');
  expect(m.verify).toHaveBeenCalledExactlyOnceWith({ email: 'user@example.test', token: code, type: 'recovery' });
  expect(recoverySession.isValid(session)).toBe(true);
  expect(m.update).not.toHaveBeenCalled();
  expect(window.location.href).not.toContain(code);
  expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(code);
  act(() => { m.getSession.mockResolvedValue({ data: { session: null }, error: null }); m.emit('SIGNED_OUT', null); });
  expect(await screen.findByLabelText('recovery.code')).toHaveValue('');
});
it.each(['12345', '12345678901', '12a456', '１２３４５６', '123 456', ''])('rejects malformed code %j before calling the SDK', async code => {
  mount(); await enter(code); submit();
  expect(screen.getByText('recovery.codeFormat')).toBeVisible();
  expect(m.verify).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
});
it('does not read an OTP from URL parameters or storage', async () => {
  window.history.replaceState({}, '', '/reset-password?token=987654#code=987654');
  sessionStorage.setItem('code', '987654');
  mount(); expect(await screen.findByLabelText('recovery.code')).toHaveValue(''); expect(m.verify).not.toHaveBeenCalled();
});
it('blocks duplicate and password submits while OTP verification is still pending', async () => {
  let resolve!: (value: unknown) => void;
  m.verify.mockImplementation(() => new Promise(r => { resolve = r; }));
  mount(); await enter(); submit(); submit();
  expect(m.verify).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'recovery.verifyingCode' })).toBeDisabled();
  act(() => { validRecovery(); });
  await screen.findByLabelText('recovery.password');
  fireEvent.change(screen.getByLabelText('recovery.password'), { target: { value: 'new-password' } });
  fireEvent.change(screen.getByLabelText('recovery.confirm'), { target: { value: 'new-password' } });
  submit(); expect(m.update).not.toHaveBeenCalled();
  await act(async () => resolve({ data: { session }, error: null }));
  submit(); await screen.findByText('recovery.updated');
  expect(m.update).toHaveBeenCalledTimes(1);
});
it.each(['no-event', 'signed-in', 'no-session', 'expired', 'session-error'])('does not trust OTP success without valid recovery provenance and SDK session: %s', async kind => {
  m.verify.mockImplementation(async () => {
    if (kind === 'signed-in') m.emit('SIGNED_IN', session);
    if (['no-session', 'expired', 'session-error'].includes(kind)) m.emit('PASSWORD_RECOVERY', session);
    m.getSession.mockResolvedValue({ data: { session: kind === 'no-session' ? null : kind === 'expired' ? { ...session, expires_at: 1 } : session }, error: kind === 'session-error' ? new Error('offline') : null });
    return { data: { session }, error: null };
  });
  mount(); await enter(); submit();
  await screen.findByText('recovery.codeInvalid');
  expect(screen.getByLabelText('recovery.code')).toHaveValue('');
  expect(screen.queryByLabelText('recovery.password')).not.toBeInTheDocument(); expect(m.update).not.toHaveBeenCalled();
  if (['no-event', 'signed-in'].includes(kind)) expect(recoverySession.isValid(session)).toBe(false);
});
it.each([
  [{ status: 403, code: 'otp_expired', message: 'private provider detail' }, 'recovery.codeInvalid'],
  [{ status: 400, message: 'unknown email private detail' }, 'recovery.codeInvalid'],
  [{ status: 429 }, 'recovery.rateError'],
  [{ code: 'over_request_rate_limit' }, 'recovery.rateError'],
  [{ status: 0, name: 'AuthRetryableFetchError' }, 'recovery.codeNetworkError'],
  [{ status: 503 }, 'recovery.codeNetworkError'],
])('shows safe actionable errors and clears attempted code: %j', async (error, key) => {
  m.verify.mockResolvedValue({ error }); mount(); await enter(); submit();
  await screen.findByText(key); expect(screen.getByLabelText('recovery.code')).toHaveValue('');
  expect(screen.queryByText(/private detail|private provider/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('recovery.password')).not.toBeInTheDocument();
});
it('handles a thrown network error without exposing or retaining the OTP', async () => {
  m.verify.mockRejectedValue(new TypeError('Failed to fetch private detail'));
  mount(); await enter(); submit(); await screen.findByText('recovery.codeNetworkError');
  expect(screen.getByLabelText('recovery.code')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'recovery.verifyCode' })).toBeEnabled();
});
it('still rechecks SDK session immediately before updating after OTP success', async () => {
  m.verify.mockImplementation(async () => validRecovery()); mount(); await enter(); submit();
  await screen.findByLabelText('recovery.password');
  fireEvent.change(screen.getByLabelText('recovery.password'), { target: { value: 'new-password' } });
  fireEvent.change(screen.getByLabelText('recovery.confirm'), { target: { value: 'new-password' } });
  m.getSession.mockResolvedValue({ data: { session: null }, error: null }); submit();
  await screen.findByLabelText('recovery.code'); expect(m.update).not.toHaveBeenCalled();
});
it('keeps the existing implicit recovery session form and hides OTP entry', async () => {
  validRecovery(); mount(); await screen.findByLabelText('recovery.password');
  expect(screen.queryByLabelText('recovery.code')).not.toBeInTheDocument();
  expect(m.verify).not.toHaveBeenCalled();
});
it('localizes manual fallback, length, safe errors and code safety in KO EN JA', () => {
  for (const locale of [ko, en, ja]) for (const key of ['enterCode', 'codeHelp', 'code', 'codeHint', 'codeFormat', 'verifyCode', 'verifyingCode', 'codeInvalid', 'codeNetworkError', 'codeSafety']) {
    expect(locale.recovery).toHaveProperty(key);
    expect((locale.recovery as Record<string, string>)[key]).not.toMatch(/^recovery\./);
  }
});
it('does not persist or log the submitted code on failure', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const log = vi.spyOn(console, 'log'); const warn = vi.spyOn(console, 'warn'); const error = vi.spyOn(console, 'error');
  mount(); await enter('9876543210'); submit(); await screen.findByText('recovery.codeInvalid');
  await waitFor(() => expect(screen.getByLabelText('recovery.code')).toHaveValue(''));
  for (const spy of [storage, log, warn, error]) { expect(JSON.stringify(spy.mock.calls)).not.toContain('9876543210'); spy.mockRestore(); }
  expect(window.location.href).not.toContain('9876543210');
});
