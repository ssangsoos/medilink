import { useId, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MapProfile } from '../../types/mapProfile';
import { maskContactPhone, profileSmsConsent } from '../../lib/contactLinks';
import { AVAILABLE_DAYS_OPTIONS, AVAILABLE_TIMES_OPTIONS, WORK_PATTERN_OPTIONS, formatAvailableFrom, formatFromOptions } from '../../lib/profileFields';
import ContactActions from './ContactActions';
import './contact.css';

export interface TalentCardProps {
  talent: MapProfile;
  hospitalName: string;
  distanceLabel?: string;
  outOfRange: boolean;
  onClose: () => void;
}

type TemplateKind = 'tomorrow' | 'regular' | 'custom';

function TalentCardContent({ talent, hospitalName, distanceLabel, outOfRange, onClose }: TalentCardProps) {
  const { t } = useTranslation();
  const [template, setTemplate] = useState<TemplateKind>('tomorrow');
  const [draft, setDraft] = useState('');
  const templateId = useId();
  const bodyId = useId();
  const titleId = useId();
  const name = talent.name || t('mapUi.talentFallback', { defaultValue: '인재' });
  const sender = hospitalName || t('mapUi.hospitalFallback', { defaultValue: '병원' });
  const role = talent.license_type || talent.role;
  const roleLabel = role ? t('licenseTypes.' + role, { defaultValue: role }) : '';
  const templates = {
    tomorrow: t('mapUi.talentTomorrowBody', { name, hospitalName: sender, defaultValue: `[내일 근무 문의]\n안녕하세요, ${sender}입니다.\n${name}님, 내일 근무 가능하실까요?\n가능한 시간과 조건을 알려주세요.` }),
    regular: t('mapUi.talentRegularBody', { name, hospitalName: sender, role: roleLabel, defaultValue: `[정규 채용 문의]\n안녕하세요, ${sender}입니다.\n${name}님, ${roleLabel ? `${roleLabel} ` : ''}정규 채용에 관심 있으실까요?\n가능한 근무 조건을 알려주세요.` }),
  };
  const body = template === 'custom' ? draft : templates[template];
  const shift = [formatFromOptions(talent.work_pattern, WORK_PATTERN_OPTIONS), formatFromOptions(talent.available_days, AVAILABLE_DAYS_OPTIONS), formatFromOptions(talent.available_times, AVAILABLE_TIMES_OPTIONS)].filter(Boolean).join(' · ');
  const phone = talent.phone || talent.mobile_phone;

  return <section className="map-talent-card map-contact-ui" aria-labelledby={titleId}>
    <header className="map-contact-header">
      <div><h2 id={titleId}>{name}</h2>{role && <p className="map-contact-subtitle">{t('licenseTypes.' + role, { defaultValue: role })}</p>}</div>
      <button type="button" className="map-contact-close" onClick={onClose} aria-label={t('mapUi.close', { defaultValue: '닫기' })}><X size={18} aria-hidden="true" /></button>
    </header>
    {shift && <p className="map-talent-shift">{shift}</p>}
    {talent.available_from && <p className="map-contact-subtitle">{formatAvailableFrom(talent.available_from)}</p>}
    {/* Public profile address is already server-masked: no client lookup/expansion. */}
    {talent.address && <p className="map-contact-address"><MapPin size={14} aria-hidden="true" />{talent.address}</p>}
    <p className={`map-commute-badge ${outOfRange ? 'is-outside' : 'is-within'}`}>
      {outOfRange ? t('mapUi.commuteOutside', { defaultValue: '출퇴근 범위 밖' }) : t('mapUi.commuteWithin', { defaultValue: '출퇴근 가능 범위' })}
      {distanceLabel && ` · ${distanceLabel}`}
    </p>
    {phone && <p className="map-contact-number" translate="no">{maskContactPhone(phone)}</p>}
    {(talent.bio || talent.experience || talent.desired_hourly_rate != null) && <details className="map-talent-details">
      <summary>{t('mapUi.profileDetails', { defaultValue: '경력·희망 조건 더 보기' })}</summary>
      {talent.bio && <p>{talent.bio}</p>}
      {talent.experience && <p className="map-contact-prewrap">{talent.experience}</p>}
      {talent.desired_hourly_rate != null && <p>{t('mapUi.desiredHourlyRate', { defaultValue: `희망 시급 ${talent.desired_hourly_rate.toLocaleString()}원`, amount: talent.desired_hourly_rate.toLocaleString() })}</p>}
    </details>}
    <p className="map-contact-label" id={templateId}>{t('mapUi.templateLabel', { defaultValue: '빠른 문자' })}</p>
    <div className="map-template-chips" role="group" aria-labelledby={templateId}>
      {([
        ['tomorrow', t('mapUi.templateTomorrow', { defaultValue: '내일 가능?' })],
        ['regular', t('mapUi.templateRegular', { defaultValue: '정규 채용' })],
        ['custom', t('mapUi.templateCustom', { defaultValue: '직접 작성' })],
      ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={template === value} onClick={() => {
        if (value === 'custom' && template !== 'custom') setDraft(body);
        setTemplate(value);
      }}>{label}</button>)}
    </div>
    {template === 'custom' ? <>
      <label className="map-contact-label" htmlFor={bodyId}>{t('mapUi.messageBody', { defaultValue: '문자 내용' })}</label>
      <textarea id={bodyId} rows={3} value={draft} onChange={event => setDraft(event.target.value)} />
    </> : <p className="map-contact-preview" aria-label={t('mapUi.messagePreview', { defaultValue: '문자 미리보기' })}>{body}</p>}
    <ContactActions phone={phone} smsPhone={talent.mobile_phone || phone} body={body} acceptsSms={profileSmsConsent(talent)} />
  </section>;
}

/** Content only: marker anchoring, panel width and placement belong to the parent. */
export default function TalentCard(props: TalentCardProps) {
  return <TalentCardContent key={props.talent.id} {...props} />;
}
