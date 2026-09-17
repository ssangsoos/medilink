import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { JobPosting } from '../../types/jobPosting';
import type { MapProfile } from '../../types/mapProfile';
import { activeContactPostings, profileSmsConsent, validateContactPhone } from '../../lib/contactLinks';
import { formatHourlyRate, formatJobCategory, formatSchedule } from '../../lib/jobPostingDisplay';
import { safeHttpUrl } from '../../lib/sanitize';
import ContactActions from './ContactActions';
import './contact.css';

export interface PostingRailProps {
  postings: JobPosting[];
  hospital: MapProfile;
  workerName: string;
  workerRole: string;
}

function PostingRailContent({ postings, hospital, workerName, workerRole }: PostingRailProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const viewportId = useId();
  const consent = profileSmsConsent(hospital);
  const targets = [hospital.phone, hospital.mobile_phone, ...postings.map(job => job.contact_phone || hospital.mobile_phone)];
  const hasUnavailable = targets.some(phone => !validateContactPhone(phone));
  const hasPublicContact = targets.some(phone => validateContactPhone(phone));

  function syncActive() {
    const rail = viewport.current;
    if (!rail) return;
    const origin = rail.getBoundingClientRect().left + (parseFloat(getComputedStyle(rail).paddingLeft) || 0);
    const cards = Array.from(rail.children) as HTMLElement[];
    let nearest = 0;
    let distance = Infinity;
    cards.forEach((card, index) => {
      const delta = Math.abs(card.getBoundingClientRect().left - origin);
      if (delta < distance) { nearest = index; distance = delta; }
    });
    setActive(nearest);
  }

  useEffect(() => {
    const rail = viewport.current;
    if (!rail) return;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncActive) : null;
    observer?.observe(rail);
    Array.from(rail.children).forEach(card => observer?.observe(card));
    window.addEventListener('resize', syncActive);
    return () => { observer?.disconnect(); window.removeEventListener('resize', syncActive); };
  }, []);

  function scrollToCard(index: number) {
    const rail = viewport.current;
    const card = rail?.children[index];
    if (!rail || !card) return;
    const left = card.getBoundingClientRect().left - rail.getBoundingClientRect().left - (parseFloat(getComputedStyle(rail).paddingLeft) || 0);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return <section className="map-posting-section map-contact-ui" aria-labelledby={titleId}>
    <header className="map-posting-header">
      <h3 id={titleId}>{t('mapUi.postingCount', { count: postings.length, defaultValue: `등록된 공고 ${postings.length}건` })}</h3>
      {postings.length > 1 && <div className="map-posting-dots" role="group" aria-label={t('mapUi.postingPages', { defaultValue: '공고 선택' })}>
        {postings.map((job, index) => <button key={job.id} type="button" aria-label={t('mapUi.viewPosting', { index: index + 1, defaultValue: `공고 ${index + 1} 보기` })} aria-current={index === active ? 'true' : undefined} aria-controls={viewportId} onClick={() => scrollToCard(index)}><span aria-hidden="true" /></button>)}
      </div>}
      {postings.length > 1 && <div className="map-posting-arrows">
        <button type="button" aria-label={t('mapUi.previousPosting', { defaultValue: '이전 공고' })} aria-controls={viewportId} disabled={active === 0} onClick={() => scrollToCard(active - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <button type="button" aria-label={t('mapUi.nextPosting', { defaultValue: '다음 공고' })} aria-controls={viewportId} disabled={active === postings.length - 1} onClick={() => scrollToCard(active + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>}
    </header>
    {postings.length === 0 ? <div className="map-posting-empty">
      <p>{t('mapUi.noPostings', { defaultValue: '등록된 공고가 없습니다.' })}</p>
      {(hospital.seeking_positions?.length || hospital.offered_hourly_rate != null || hospital.employment_type) && <div className="map-default-conditions">
        <h4>{t('mapUi.defaultConditions', { defaultValue: '병원 기본 구인 조건' })}</h4>
        {!!hospital.seeking_positions?.length && <p>{hospital.seeking_positions.map(role => t('licenseTypes.' + role, { defaultValue: role })).join(', ')}</p>}
        {hospital.offered_hourly_rate != null && <p>{t('mapUi.offeredHourlyRate', { amount: hospital.offered_hourly_rate.toLocaleString(), defaultValue: `제안 시급 ${hospital.offered_hourly_rate.toLocaleString()}원` })}</p>}
        {hospital.employment_type && <p>{hospital.employment_type}</p>}
      </div>}
    </div> : <>
      <div ref={viewport} id={viewportId} className={`map-posting-rail${postings.length === 1 ? ' is-single' : ''}`} role="region" aria-roledescription="carousel" aria-label={t('mapUi.postingList', { defaultValue: '공고 카드 목록' })} onScroll={syncActive}>
        {postings.map((job, index) => {
          const smsPhone = job.contact_phone || hospital.mobile_phone || '';
          const title = job.title.replace(/[\r\n]+/g, ' ').trim();
          const body = t('mapUi.postingInquiryBody', { title, workerName, workerRole, defaultValue: `[${title}]\n안녕하세요, ${[workerRole, workerName].filter(Boolean).join(' ')}입니다.\n공고를 보고 연락드립니다.\n근무 조건과 지원 절차를 안내해 주실 수 있을까요?` });
          const kakaoUrl = safeHttpUrl(job.kakao_link);
          return <article key={job.id} className="map-posting-card" aria-label={t('mapUi.postingCardLabel', { index: index + 1, count: postings.length, title: job.title, defaultValue: `공고 ${index + 1}/${postings.length}: ${job.title}` })}>
            <header className="map-posting-card-header">
              <h4>{job.title}</h4>
              {job.schedule_type === 'always' && <span className="map-posting-always">{t('mapUi.alwaysHiring', { defaultValue: '상시 구인' })}</span>}
            </header>
            <div className="map-posting-properties">
              <span className="map-posting-category">{formatJobCategory(job)}</span>
              <span className="map-posting-schedule">{formatSchedule(job)}</span>
              <span className="map-posting-wage">{formatHourlyRate(job)}</span>
            </div>
            {job.description && <p className="map-posting-description map-contact-prewrap">{job.description}</p>}
            <ContactActions phone={job.contact_phone || hospital.phone || hospital.mobile_phone} smsPhone={smsPhone} body={body} acceptsSms={consent} showPhone={false} compact smsLabel={t('mapUi.thisPostingInquiry', { defaultValue: '문자 보내기 · 이 공고' })} />
            {kakaoUrl && <a className="map-contact-button map-contact-kakao" href={kakaoUrl} target="_blank" rel="noopener noreferrer">{t('mapUi.kakaoInquiry', { defaultValue: '카카오톡 문의' })}</a>}
          </article>;
        })}
      </div>

    </>}
    <div className="map-shared-contact-notes">
      {hasUnavailable && <p className="map-contact-note">{t('mapUi.contactPending', { defaultValue: '안전한 연락 연결 준비 중' })}</p>}
      {consent === false && <p className="map-contact-note">{t('mapUi.smsDeclined', { defaultValue: '문자 문의를 받지 않는 대상입니다.' })}</p>}
      {hasPublicContact && consent === undefined && <p className="map-contact-note">{t('mapUi.smsConsentUnknown', { defaultValue: '문자 수신 동의 정보가 확인되지 않았습니다.' })}</p>}
      {hasPublicContact && <p className="map-contact-note">{t('mapUi.directContactWarning', { defaultValue: '연락 시 상대 번호가 문자·전화 앱에 표시됩니다.' })}</p>}
    </div>
  </section>;
}

export default function PostingRail(props: PostingRailProps) {
  const postings = activeContactPostings(props.postings, props.hospital.id);
  return <PostingRailContent key={`${props.hospital.id}:${postings.map(job => job.id).join(',')}`} {...props} postings={postings} />;
}
