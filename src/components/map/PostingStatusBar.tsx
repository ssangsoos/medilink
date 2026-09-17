import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobPosting } from '../../types/jobPosting';
import { JOB_CATEGORY_OTHER } from '../../lib/medicalConstants';
import { derivePostingStatus, getPostingTimestamp, getPostingVisibility } from '../../lib/postingStatus';
import './PostingStatusBar.css';

export interface PostingStatusBarProps {
  postings: JobPosting[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onManage: () => void;
  onCreate: () => void;
  onEnable: () => void;
  onEdit: (id: string) => void;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
}

function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function PostingStatusBar({ postings, expanded, onExpandedChange, onManage, onCreate, onEnable, onEdit, loading = false, error = null, busy = false }: PostingStatusBarProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const headingId = useId();
  const [today, setToday] = useState(() => localToday());
  const summary = derivePostingStatus(postings, today);
  const ready = !loading && !error;
  const showList = ready && expanded && postings.length > 0;

  useEffect(() => {
    // Keep an open map honest across midnight and after background-tab suspension.
    const refresh = () => setToday(localToday());
    const now = new Date();
    // Calendar construction also handles 23/25-hour daylight-saving days.
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const timer = window.setTimeout(refresh, Math.max(0, nextDay - Date.now()));
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [today]);

  useEffect(() => {
    if (!showList) return;
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onExpandedChange(false);
        toggleRef.current?.focus();
      }
    };
    const pointerDown = (event: PointerEvent) => {
      if (window.matchMedia?.('(min-width: 768px)').matches && event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        onExpandedChange(false);
      }
    };
    document.addEventListener('keydown', keyDown);
    document.addEventListener('pointerdown', pointerDown);
    return () => {
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('pointerdown', pointerDown);
    };
  }, [showList, onExpandedChange]);

  const role = (posting: JobPosting) => {
    if (posting.job_category === JOB_CATEGORY_OTHER && posting.job_category_custom) return posting.job_category_custom;
    return posting.job_category
      ? t(`licenseTypes.${posting.job_category}`, { defaultValue: posting.job_category })
      : t('job.unspecifiedCategory', { defaultValue: '직종 미정' });
  };
  const schedule = (posting: JobPosting) => {
    if (posting.schedule_type === 'always') return t('job.always', { defaultValue: '상시 구인' });
    if (!posting.work_start_date) return t('job.undecidedSchedule', { defaultValue: '일정 미정' });
    const range = posting.work_end_date && posting.work_end_date !== posting.work_start_date
      ? `${posting.work_start_date} ~ ${posting.work_end_date}` : posting.work_start_date;
    return posting.work_start_time && posting.work_end_time
      ? `${range} · ${posting.work_start_time.slice(0, 5)}~${posting.work_end_time.slice(0, 5)}` : range;
  };
  const canEnable = summary.sortedPostings.some(posting => posting.status === 'paused' && getPostingVisibility(posting, today) === 'private');
  const visibilityLabels = {
    visible: t('mapUi.postings.visible', { defaultValue: '공개 중' }),
    private: t('mapUi.postings.private', { defaultValue: '비공개' }),
    expired: t('mapUi.postings.expired', { defaultValue: '기간 만료' }),
  };

  return (
    <section className="mn-posting-status" ref={rootRef} aria-label={t('mapUi.postings.label', { defaultValue: '내 구인 상태' })}>
      <div className={`mn-posting-status__row${ready ? ` mn-posting-status__row--${summary.status.toLowerCase()}` : ''}`} aria-busy={loading || busy}>
        {!ready ? (
          <span className="mn-posting-status__message" role={error ? 'alert' : 'status'}>
            {error || t('mapUi.postings.loading', { defaultValue: '공고를 불러오는 중' })}
          </span>
        ) : summary.status === 'NONE' ? (
          <span className="mn-posting-status__empty">
            <span className="mn-posting-status__dot" aria-hidden="true" />
            <span className="mn-posting-status__message">{t('mapUi.postings.empty', { defaultValue: '아직 올린 공고가 없어요' })}</span>
          </span>
        ) : (
          <button type="button" ref={toggleRef} className="mn-posting-status__toggle" aria-expanded={showList} aria-controls={listId}
            aria-label={t('mapUi.postings.toggle', { defaultValue: '내 공고 목록' })} onClick={() => onExpandedChange(!expanded)}>
            {summary.status === 'ON' ? <>
              <span className="mn-posting-status__badge mn-posting-status__badge--on">
                <span className="mn-posting-status__dot" aria-hidden="true" />{t('mapUi.postings.on', { defaultValue: '공고 ON' })}
              </span>
              <span className="mn-posting-status__separator" aria-hidden="true" />
            </> : <span className="mn-posting-status__dot" aria-hidden="true" />}
            <span className="mn-posting-status__summary">
              {summary.leadPosting ? `${role(summary.leadPosting)} · ${schedule(summary.leadPosting)}` : t('mapUi.postings.off', { defaultValue: '공고가 꺼져 있어요' })}
            </span>
            {summary.visiblePostings.length > 1 && <span className="mn-posting-status__count">+{summary.visiblePostings.length - 1}</span>}
            <span className={`mn-posting-status__chevron${showList ? ' mn-posting-status__chevron--open' : ''}`} aria-hidden="true" />
          </button>
        )}
        {ready && summary.status === 'NONE' && <button type="button" className="mn-posting-status__action mn-posting-status__action--primary" disabled={busy} onClick={onCreate}>{t('mapUi.postings.create', { defaultValue: '첫 공고 올리기' })}</button>}
        {ready && summary.status === 'OFF' && <button type="button" className="mn-posting-status__action mn-posting-status__action--outline" disabled={busy}
          onClick={canEnable ? onEnable : () => onEdit(summary.sortedPostings[0].id)}>
          {canEnable ? t('mapUi.postings.enable', { defaultValue: '공고 켜기' }) : t('mapUi.postings.editExpired', { defaultValue: '공고 수정' })}
        </button>}
        {ready && postings.length > 0 && <button type="button" className="mn-posting-status__view" disabled={busy}
          aria-expanded={showList} aria-controls={listId} onClick={() => onExpandedChange(!expanded)}>
          {t('mapUi.postings.view', { defaultValue: '공고 보기 →' })}
        </button>}
        <button type="button" className={`mn-posting-status__manage${error ? ' mn-posting-status__manage--error' : ''}`} disabled={busy} onClick={onManage}>
          {t('mapUi.postings.manage', { defaultValue: '공고 관리' })}
        </button>
      </div>
      {showList && (
        <div className="mn-posting-status__panel" id={listId} role="region" aria-labelledby={headingId}>
          <div className="mn-posting-status__panel-header">
            <h2 id={headingId}>{t('mapUi.postings.listTitle', { defaultValue: `우리 병원 공고 ${postings.length}개`, count: postings.length })}</h2>
            <button type="button" className="mn-posting-status__action" disabled={busy} onClick={onManage}>{t('mapUi.postings.manageLink', { defaultValue: '공고 관리 →' })}</button>
          </div>
          <ul className="mn-posting-status__list">
            {summary.sortedPostings.map(posting => {
              const visibility = getPostingVisibility(posting, today);
              const timestamp = getPostingTimestamp(posting);
              const date = timestamp === null ? null : new Date(timestamp).toISOString().slice(0, 10);
              return <li key={posting.id} className="mn-posting-status__item">
                <div className="mn-posting-status__item-content">
                  <div className="mn-posting-status__item-heading"><h3>{posting.title || role(posting)}</h3><span className={`mn-posting-status__visibility mn-posting-status__visibility--${visibility}`}>{visibilityLabels[visibility]}</span></div>
                  <p>{role(posting)} · {schedule(posting)}</p>
                  {date && <time dateTime={date}>{date}</time>}
                </div>
                <button type="button" className="mn-posting-status__edit" disabled={busy} onClick={() => onEdit(posting.id)}
                  aria-label={`${posting.title || role(posting)} ${t('mapUi.postings.edit', { defaultValue: '수정' })}`}>
                  {t('mapUi.postings.edit', { defaultValue: '수정' })}
                </button>
              </li>;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export default PostingStatusBar;
