import { useId } from 'react';
import { MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { JobPosting } from '../../types/jobPosting';
import type { MapProfile } from '../../types/mapProfile';
import { activeContactPostings, effectiveHospitalSmsPhone, maskContactPhone, profileSmsConsent } from '../../lib/contactLinks';
import ContactActions from './ContactActions';
import PostingRail from './PostingRail';
import './contact.css';

export interface HospitalSheetProps {
  hospital: MapProfile;
  postings: JobPosting[];
  workerName: string;
  workerRole: string;
  onClose: () => void;
}

/** Content container only: the map owns sheet/panel placement and dismissal. */
export default function HospitalSheet({ hospital, postings, workerName, workerRole, onClose }: HospitalSheetProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const active = activeContactPostings(postings, hospital.id);
  const name = hospital.hospital_name || hospital.name || t('mapUi.hospitalFallback', { defaultValue: '병원' });
  const smsPhone = effectiveHospitalSmsPhone(hospital, active);
  const body = t('mapUi.hospitalInquiryBody', { hospitalName: name, workerName, workerRole, defaultValue: `[${name.replace(/[\r\n]+/g, ' ')} 근무 문의]\n안녕하세요, ${[workerRole, workerName].filter(Boolean).join(' ')}입니다.\n현재 모집 중인 근무 조건을 문의드립니다.` });

  return <section className="map-hospital-sheet map-contact-ui" aria-labelledby={titleId}>
    <div className="map-sheet-handle" aria-hidden="true" />
    <header className="map-contact-header">
      <div><h2 id={titleId}>{name}</h2>{hospital.hospital_type && <p className="map-contact-subtitle">{t('hospitalType.' + hospital.hospital_type, { defaultValue: hospital.hospital_type })}</p>}</div>
      <button type="button" className="map-contact-close" onClick={onClose} aria-label={t('mapUi.close', { defaultValue: '닫기' })}><X size={20} aria-hidden="true" /></button>
    </header>
    {hospital.address && <p className="map-contact-address"><MapPin size={14} aria-hidden="true" />{hospital.address}</p>}
    {hospital.phone && <p className="map-contact-number" translate="no">{maskContactPhone(hospital.phone)}</p>}
    {smsPhone && smsPhone !== hospital.phone && <p className="map-contact-subtitle" translate="no">{maskContactPhone(smsPhone)}</p>}
    <PostingRail postings={active} hospital={hospital} workerName={workerName} workerRole={workerRole} />
    <div className="map-hospital-general-contact">
      <h3>{t('mapUi.generalInquiry', { defaultValue: '병원 일반 문의' })}</h3>
      <ContactActions key={hospital.id} phone={hospital.phone} smsPhone={smsPhone} body={body} acceptsSms={profileSmsConsent(hospital)} compact ghost smsLabel={t('mapUi.hospitalInquiry', { defaultValue: '병원에 문자 보내기' })} />
    </div>
    <p className="map-contact-note map-posting-explanation">{t('mapUi.postingTitleHelp', { defaultValue: '공고 카드의 버튼은 해당 공고 제목이 문자 첫 줄에 자동으로 들어갑니다.' })}</p>
  </section>;
}
