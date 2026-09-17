import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { WORKER_CONTACT_CONSENT_VERSION } from '../lib/workerContactConsent';

/** Shared verbatim between signup, profile settings and the privacy policy. */
export function WorkerContactDisclosure() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
      <dl className="space-y-2">
        {(['provider', 'recipient', 'purpose', 'items', 'retention'] as const).map(key => (
          <div key={key}>
            <dt className="font-bold">{t(`workerContactConsent.${key}Label`)}</dt>
            <dd>{t(`workerContactConsent.${key}`)}</dd>
          </div>
        ))}
      </dl>
      <p>{t('workerContactConsent.publicProfileNotice')}</p>
      <p className="font-medium">{t('workerContactConsent.disclosure')}</p>
      <p>{t('workerContactConsent.withdrawal')}</p>
      <p>{t('workerContactConsent.refusal')}</p>
      <p className="text-xs text-gray-500">{t('workerContactConsent.versionNotice', { version: WORKER_CONTACT_CONSENT_VERSION })}</p>
    </div>
  );
}

interface Props {
  checked: boolean;
  onChange: (accepted: boolean) => void;
  needsRenewal?: boolean;
  disabled?: boolean;
}

export default function WorkerContactConsent({ checked, onChange, needsRenewal = false, disabled = false }: Props) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <section id="contact-consent" className="scroll-mt-6 rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
      {needsRenewal && <p className="text-sm font-bold text-purple-900">{t('workerContactConsent.legacyNotice')}</p>}
      <div id={`${id}-disclosure`}><WorkerContactDisclosure /></div>
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={event => onChange(event.target.checked)}
          aria-describedby={`${id}-disclosure`}
          className="mt-0.5 w-4 h-4 shrink-0 text-purple-700 rounded border-gray-300 focus:ring-purple-500"
        />
        <label htmlFor={id} className="text-sm font-bold text-gray-900 cursor-pointer">{t('consent.thirdPartyLabel')}</label>
      </div>
    </section>
  );
}
