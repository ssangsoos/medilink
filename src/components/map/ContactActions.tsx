import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import QRCode from 'qrcode';
import { createPortal } from 'react-dom';
import { Copy, MessageSquare, Phone, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildSmsHref, buildTelHref, validateContactPhone } from '../../lib/contactLinks';
import { openContactApp, resolveWorkerContact } from '../../lib/workerContact';
import type { WorkerContactFailure } from '../../lib/workerContact';
import './contact.css';

export interface ContactActionsProps {
  /** Worker contacts must be resolved server-side on click, never from display-masked fields. */
  workerId?: string;
  phone?: string;
  smsPhone?: string;
  body: string;
  acceptsSms?: boolean;
  smsLabel?: string;
  showPhone?: boolean;
  /** Parent must render shared availability/privacy notes when compact. */
  compact?: boolean;
  ghost?: boolean;
}

type ContactKind = 'sms' | 'tel';

/** Keyed by the validated URI: old images disappear on device/recipient changes. */
function LocalSmsQr({ href }: { href: string }) {
  const { t } = useTranslation();
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    // Local canvas encoding only: neither the number nor draft leaves the device.
    void QRCode.toDataURL(href, { width: 224, margin: 4, errorCorrectionLevel: 'M' })
      .then(data => { if (current) setImage(data); })
      .catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [href]);
  if (failed) return <p role="alert" className="map-contact-note">{t('mapUi.qrFailed', { defaultValue: 'QR 코드를 만들지 못했습니다. 번호와 내용을 복사해 주세요.' })}</p>;
  return image ? <img className="map-contact-qr" src={image} alt={t('mapUi.qrAlt', { defaultValue: '문자 작성 QR 코드' })} width={224} height={224} />
    : <p className="map-contact-note">{t('mapUi.qrGenerating', { defaultValue: 'QR 코드 생성 중…' })}</p>;
}

function DesktopContactDialog({ kind, phone, onClose }: {
  kind: ContactKind; phone: string; onClose: () => void;
}) {
  const { t } = useTranslation();
  const draft = t('mapUi.qrSmsBody', { defaultValue: '안녕하세요. 메디노티 보고 연락드립니다.' });
  const [copyStatus, setCopyStatus] = useState('');
  const [qrDevice, setQrDevice] = useState<'iPhone' | 'Android'>('iPhone');
  const qrHref = kind === 'sms' ? buildSmsHref(phone, draft, qrDevice) : null;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); onClose(); return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, a[href], input:not(:disabled), [tabindex="0"]');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  async function copy(value: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setCopyStatus(t('mapUi.copied', { defaultValue: '복사했습니다.' }));
    } catch {
      setCopyStatus(t('mapUi.copyFailed', { defaultValue: '자동 복사를 사용할 수 없습니다. 내용을 선택해 직접 복사해 주세요.' }));
    }
  }

  return createPortal(
    <dialog ref={dialogRef} className="map-contact-dialog map-contact-ui" aria-labelledby={titleId} aria-modal="true"
      onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={trapFocus}>
      <header className="map-contact-header">
        <h2 id={titleId}>{kind === 'sms' ? t('mapUi.prepareSms', { defaultValue: '휴대폰으로 문자 보내기' }) : t('mapUi.prepareCall', { defaultValue: '전화 문의 준비' })}</h2>
        <button ref={closeRef} type="button" className="map-contact-close" onClick={onClose} aria-label={t('mapUi.close', { defaultValue: '닫기' })}><X size={18} aria-hidden="true" /></button>
      </header>
      <p className="map-contact-note">{t('mapUi.directContactWarning', { defaultValue: '연락 시 상대 번호가 문자·전화 앱에 표시됩니다.' })}</p>
      <p className="map-contact-number" translate="no">{phone}</p>
      <button type="button" className="map-contact-button map-contact-secondary" onClick={() => void copy(phone)}><Copy size={16} aria-hidden="true" />{t('mapUi.copyNumber', { defaultValue: '번호 복사' })}</button>
      {kind === 'sms' && <>
        <p className="map-contact-preview" aria-label={t('mapUi.messageBody', { defaultValue: '문자 내용' })}>{draft}</p>
        <div className="map-template-chips map-qr-devices" role="group" aria-label={t('mapUi.qrDevice', { defaultValue: 'QR을 스캔할 휴대폰' })}>
          {(['iPhone', 'Android'] as const).map(device => <button key={device} type="button" aria-pressed={qrDevice === device} onClick={() => setQrDevice(device)}>{device}</button>)}
        </div>
        {qrHref && <LocalSmsQr key={qrHref} href={qrHref} />}
        <p className="map-contact-note">{t('mapUi.qrHelp', { defaultValue: '문자는 휴대폰에서 보낼 수 있어요. 휴대폰 종류를 선택하고 QR을 스캔하면 받는 번호와 기본 문구가 입력됩니다. 내용 수정과 전송은 문자 앱에서 직접 해 주세요.' })}</p>
        <button type="button" className="map-contact-button map-contact-primary" onClick={() => void copy(draft)}><Copy size={16} aria-hidden="true" />{t('mapUi.copyBody', { defaultValue: '내용 복사' })}</button>
      </>}
      <p role="status" className="map-contact-note">{copyStatus}</p>
    </dialog>, document.body,
  );
}

function ContactActionsContent({ workerId, phone, smsPhone, body, acceptsSms, smsLabel, showPhone = true, compact = false, ghost = false }: ContactActionsProps) {
  const { t } = useTranslation();
  const [dialogKind, setDialogKind] = useState<ContactKind | null>(null);
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState<WorkerContactFailure | null>(null);
  const [mobileContact, setMobileContact] = useState<{ kind: ContactKind; href: string } | null>(null);
  const contactRequest = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => () => { contactRequest.current++; }, []);
  // Undefined consent is NOT treated as opt-in. Existing public-listing contact
  // availability remains unchanged; explicit false always disables SMS.
  const smsTarget = smsPhone === undefined ? phone : smsPhone;
  const userAgent = typeof navigator === 'undefined' ? '' : /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1 ? 'iPad' : navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const smsHref = acceptsSms === false ? null : buildSmsHref(smsTarget, body, userAgent);
  const telHref = buildTelHref(phone);
  const label = smsLabel || t('mapUi.smsInquiry', { defaultValue: '문자 보내기' });
  const phoneLabel = t('mapUi.call', { defaultValue: '전화' });
  const modalPhone = workerId ? resolvedPhone : validateContactPhone(dialogKind === 'sms' ? smsTarget : phone);
  const errorMessages: Record<WorkerContactFailure, string> = {
    unavailable: t('mapUi.workerContactUnavailable', { defaultValue: '현재 이 의료인에게 연락할 수 없습니다. 연락 동의 또는 프로필 공개 상태가 변경되었을 수 있습니다.' }),
    signIn: t('mapUi.workerContactSignIn', { defaultValue: '로그인 후 다시 시도해 주세요.' }),
    hospitalOnly: t('mapUi.workerContactHospitalOnly', { defaultValue: '병원 회원만 의료인에게 연락할 수 있습니다.' }),
    setupRequired: t('mapUi.workerContactSetupRequired', { defaultValue: '연락 기능을 준비 중입니다. 잠시 후 다시 시도해 주세요.' }),
    failed: t('mapUi.workerContactFailed', { defaultValue: '연락처를 불러오지 못했습니다. 다시 시도해 주세요.' }),
  };

  async function contactWorker(kind: ContactKind) {
    if (!workerId || inFlight.current || (kind === 'sms' && acceptsSms === false)) return;
    inFlight.current = true;
    const request = ++contactRequest.current;
    setContactBusy(true); setContactError(null); setResolvedPhone(null); setMobileContact(null); setDialogKind(null);
    try {
      const value = await resolveWorkerContact(workerId);
      if (request !== contactRequest.current) return;
      const valid = validateContactPhone(value);
      if (!valid) { setContactError('unavailable'); return; }
      if (mobile) {
        const href = kind === 'sms' ? buildSmsHref(valid, body, userAgent) : buildTelHref(valid);
        if (!href) { setContactError('unavailable'); return; }
        setMobileContact({ kind, href });
        // Some browsers require another tap after asynchronous authorization.
        // Preserve an explicit link even when an automatic app handoff is blocked.
        try { openContactApp(href); } catch { /* User can tap the fallback link. */ }
      } else {
        setResolvedPhone(valid); setDialogKind(kind);
      }
    } catch (error) {
      if (request !== contactRequest.current) return;
      const reason = error && typeof error === 'object' && 'reason' in error ? error.reason : 'failed';
      setContactError(typeof reason === 'string' && Object.hasOwn(errorMessages, reason) ? reason as WorkerContactFailure : 'failed');
    } finally {
      if (request === contactRequest.current) { inFlight.current = false; setContactBusy(false); }
    }
  }
  function closeDialog() { setDialogKind(null); setResolvedPhone(null); }


  return <div className={`map-contact-actions map-contact-ui${ghost ? ' is-ghost' : ''}`}>
    <div className="map-contact-action-row">
      {workerId ? <button type="button" className="map-contact-button map-contact-primary" disabled={contactBusy || acceptsSms === false} onClick={() => void contactWorker('sms')}><MessageSquare size={16} aria-hidden="true" />{label}</button> : smsHref && mobile ? <a className="map-contact-button map-contact-primary" href={smsHref}><MessageSquare size={16} aria-hidden="true" />{label}</a>
        : <button type="button" className="map-contact-button map-contact-primary" disabled={!smsHref} onClick={() => setDialogKind('sms')}><MessageSquare size={16} aria-hidden="true" />{label}</button>}
      {showPhone && (workerId ? <button type="button" className="map-contact-button map-contact-secondary" disabled={contactBusy} onClick={() => void contactWorker('tel')}><Phone size={16} aria-hidden="true" />{phoneLabel}</button> : telHref && mobile ? <a className="map-contact-button map-contact-secondary" href={telHref}><Phone size={16} aria-hidden="true" />{phoneLabel}</a>
        : <button type="button" className="map-contact-button map-contact-secondary" disabled={!telHref} onClick={() => setDialogKind('tel')}><Phone size={16} aria-hidden="true" />{phoneLabel}</button>)}
    </div>
    {!workerId && !compact && (!validateContactPhone(smsTarget) || (showPhone && !telHref)) && <p className="map-contact-note">{t('mapUi.contactPending', { defaultValue: '안전한 연락 연결 준비 중' })}</p>}
    {!compact && acceptsSms === false && <p className="map-contact-note">{t('mapUi.smsDeclined', { defaultValue: '문자 문의를 받지 않는 대상입니다.' })}</p>}
    {!workerId && !compact && smsHref && acceptsSms === undefined && <p className="map-contact-note">{t('mapUi.smsConsentUnknown', { defaultValue: '문자 수신 동의 정보가 확인되지 않았습니다.' })}</p>}
    {!compact && (workerId || smsHref || (showPhone && telHref)) && <p className="map-contact-note">{t('mapUi.directContactWarning', { defaultValue: '연락 시 상대 번호가 문자·전화 앱에 표시됩니다.' })}</p>}
    {contactBusy && <p role="status" className="map-contact-note">{t('mapUi.workerContactLoading', { defaultValue: '연락 동의를 확인하고 있습니다…' })}</p>}
    {contactError && <p role="alert" className="map-contact-note">{errorMessages[contactError]}</p>}
    {mobileContact && <div>
      <p className="map-contact-note">{t('mapUi.workerContactOpenHelp', { defaultValue: '앱이 열리지 않으면 아래 버튼을 눌러 주세요. 전송은 문자 앱에서 직접 합니다.' })}</p>
      <a className="map-contact-button map-contact-primary" href={mobileContact.href}>{mobileContact.kind === 'sms' ? t('mapUi.openSmsApp', { defaultValue: '문자 앱 열기' }) : t('mapUi.openPhoneApp', { defaultValue: '전화 앱 열기' })}</a>
    </div>}
    {dialogKind && modalPhone && <DesktopContactDialog kind={dialogKind} phone={modalPhone} onClose={closeDialog} />}
  </div>;
}

export default function ContactActions(props: ContactActionsProps) {
  // Never retain a prepared recipient or draft when the parent target changes.
  return <ContactActionsContent key={JSON.stringify([props.workerId, props.phone, props.smsPhone, props.body, props.acceptsSms])} {...props} />;
}
