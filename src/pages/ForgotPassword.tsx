import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const until = useRef(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(false), Math.max(0, until.current - Date.now()));
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || Date.now() < until.current) return;
    pending.current = true; setBusy(true); setError(''); setSent(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'https://www.medinoti.com/reset-password' });
      if (error) throw error;
      setSent(true); until.current = Date.now() + 60000; setCooldown(true);
    } catch (cause) {
      const rateLimited = typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 429;
      setError(rateLimited ? 'recovery.rateError' : 'recovery.requestError');
      if (rateLimited) { until.current = Date.now() + 60000; setCooldown(true); }
    } finally { pending.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-gray-50 px-4 py-12"><div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow space-y-6">
    <LanguageSwitcher /><h1 className="text-2xl font-bold">{t('recovery.title')}</h1>
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor="recovery-email" className="block">{t('recovery.email')}</label>
      <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded p-3" />
      <button disabled={busy || cooldown} className="w-full bg-blue-600 text-white rounded p-3 disabled:bg-gray-400">{t(busy ? 'recovery.sending' : 'recovery.send')}</button>
      {cooldown && <p>{t('recovery.cooldown')}</p>}
      {sent && <p role="status">{t('recovery.sent')}</p>}
      {error && <p role="alert" className="text-red-700">{t(error)}</p>}
    </form>
    <section id="email-help" aria-labelledby="email-help-title" className="space-y-3 border-t pt-4">
      <h2 id="email-help-title" className="font-bold">{t('recovery.emailHelp')}</h2><p>{t('recovery.emailHelpText')}</p>
      <a className="text-blue-700 underline" href="mailto:ssangsoos@gmail.com">ssangsoos@gmail.com</a><p>{t('recovery.safety')}</p>
    </section>
    <Link className="block text-blue-700 underline" to="/login">{t('recovery.login')}</Link>
  </div></main>;
}
