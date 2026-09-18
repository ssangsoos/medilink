import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, recoverySession } from '../lib/supabase';
import { RECOVERY_PASSWORD_MIN_LENGTH } from '../lib/recoverySession';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signOutError, setSignOutError] = useState(false);
  const pending = useRef(false);
  const completed = useRef(false);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => { if (active) setState('invalid'); }, 10000);
    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (active && !completed.current) { setState(!error && recoverySession.isValid(data.session) ? 'ready' : 'invalid'); window.clearTimeout(timer); }
      } catch { if (active && !completed.current) { setState('invalid'); window.clearTimeout(timer); } }
    };
    // Never call async SDK methods inside onAuthStateChange's auth lock.
    const unsubscribe = recoverySession.subscribe(() => { window.setTimeout(() => { if (active) void check(); }, 0); });
    void check();
    return () => { active = false; window.clearTimeout(timer); unsubscribe(); };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || completed.current || state !== 'ready') return;
    setError('');
    if (password.length < RECOVERY_PASSWORD_MIN_LENGTH) { setError('recovery.passwordHint'); return; }
    if (password !== confirm) { setError('recovery.mismatch'); return; }
    pending.current = true; setBusy(true);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !recoverySession.isValid(data.session)) { setState('invalid'); return; }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      completed.current = true; recoverySession.clear(); setPassword(''); setConfirm(''); setState('done');
      try { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) setSignOutError(true); }
      catch { setSignOutError(true); }
    } catch { setError('recovery.updateError'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-gray-50 px-4 py-12"><div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow space-y-6">
    <LanguageSwitcher /><h1 className="text-2xl font-bold">{t('recovery.resetTitle')}</h1>
    {state === 'loading' && <p role="status">{t('recovery.checking')}</p>}
    {state === 'invalid' && <p role="alert">{t('recovery.invalid')}</p>}
    {state === 'ready' && <form onSubmit={submit} className="space-y-4">
      <label htmlFor="new-password" className="block">{t('recovery.password')}</label>
      <input id="new-password" type="password" autoComplete="new-password" required minLength={RECOVERY_PASSWORD_MIN_LENGTH} aria-describedby="password-hint" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded p-3" />
      <p id="password-hint">{t('recovery.passwordHint')}</p>
      <label htmlFor="confirm-password" className="block">{t('recovery.confirm')}</label>
      <input id="confirm-password" type="password" autoComplete="new-password" required minLength={RECOVERY_PASSWORD_MIN_LENGTH} value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border rounded p-3" />
      {error && <p role="alert" className="text-red-700">{t(error)}</p>}
      <button disabled={busy} className="w-full bg-blue-600 text-white rounded p-3 disabled:bg-gray-400">{t(busy ? 'recovery.saving' : 'recovery.save')}</button>
    </form>}
    {state === 'done' && <p role="status">{t('recovery.updated')}</p>}
    {signOutError && <p role="alert">{t('recovery.signOutError')}</p>}
    {state !== 'done' && <Link className="block text-blue-700 underline" to="/forgot-password">{t('recovery.resend')}</Link>}
    <Link className="block text-blue-700 underline" to="/login">{t('recovery.login')}</Link>
  </div></main>;
}
