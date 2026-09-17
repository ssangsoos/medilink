import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PostingStatusBar, { type PostingStatusBarProps } from '../src/components/map/PostingStatusBar';
import { readFileSync } from 'node:fs';
import type { JobPosting } from '../src/types/jobPosting';
const statusCss = readFileSync('src/components/map/PostingStatusBar.css', 'utf8');

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }) }));
const job = (overrides: Partial<JobPosting> & { updated_at?: string } = {}): JobPosting => ({
  id: 'one', hospital_id: 'hospital', title: '간호사 공고', description: '', job_category: '간호사', job_category_custom: null,
  schedule_type: 'always', work_start_date: null, work_end_date: null, work_start_time: null, work_end_time: null,
  hourly_rate: null, wage_negotiable: true, kakao_link: null, contact_phone: null, status: 'active', latitude: null, longitude: null, ...overrides,
});
const props = (overrides: Partial<PostingStatusBarProps> = {}): PostingStatusBarProps => ({
  postings: [], expanded: false, onExpandedChange: vi.fn(), onManage: vi.fn(), onCreate: vi.fn(), onEnable: vi.fn(), onEdit: vi.fn(), ...overrides,
});
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T10:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('matches the white status bar and bounded expanded card styling', () => {
  const mobile = statusCss.split('@media (min-width: 768px)')[0];
  const rule = (name: string) => mobile.match(new RegExp(`^(?:\\.mn-posting-status )?\\.${name}\\s*\\{([^}]*)`, 'm'))?.[1] ?? '';
  expect(rule('mn-posting-status__row')).toMatch(/background:\s*#fff/);
  expect(rule('mn-posting-status__badge')).toMatch(/background:\s*transparent/);
  expect(rule('mn-posting-status__panel')).toMatch(/background:\s*#FAFBFD/);
  expect(rule('mn-posting-status__panel')).toMatch(/padding:\s*2px 12px 12px/);
  expect(rule('mn-posting-status__panel')).toMatch(/max-height:\s*34dvh/);
  expect(rule('mn-posting-status__list')).toMatch(/gap:\s*8px/);
  expect(rule('mn-posting-status__item')).toMatch(/background:\s*#fff/);
  expect(rule('mn-posting-status__item')).toMatch(/border:\s*1px solid #E4E9F1/);
  expect(rule('mn-posting-status__item')).toMatch(/border-radius:\s*14px/);
  expect(rule('mn-posting-status__item')).toMatch(/padding:\s*12px 13px/);
});
it('matches status typography, spacing, separator, count chip and touch targets', () => {
  const [mobile, desktop] = statusCss.split('@media (min-width: 768px)');
  const rule = (name: string) => mobile.match(new RegExp(`^(?:\\.mn-posting-status )?\\.${name}\\s*\\{([^}]*)`, 'm'))?.[1] ?? '';
  expect(rule('mn-posting-status')).toMatch(/z-index:\s*30/);
  expect(rule('mn-posting-status__row')).toMatch(/gap:\s*10px/);
  expect(rule('mn-posting-status__row')).toMatch(/padding:\s*0 18px/);
  expect(desktop).toMatch(/\.mn-posting-status__row\s*\{[^}]*padding:\s*0 28px/);
  expect(desktop).toMatch(/\.mn-posting-status__row\s*\{[^}]*gap:\s*10px/);
  expect(rule('mn-posting-status__toggle')).toMatch(/gap:\s*10px/);
  expect(rule('mn-posting-status__toggle')).toMatch(/flex:\s*1/);
  expect(rule('mn-posting-status__toggle')).toMatch(/height:\s*100%/);
  expect(rule('mn-posting-status__badge')).toMatch(/font-size:\s*13px/);
  expect(rule('mn-posting-status__badge')).toMatch(/font-weight:\s*800/);
  expect(rule('mn-posting-status__badge--on')).toMatch(/color:\s*#14794F/);
  expect(rule('mn-posting-status__summary')).toMatch(/font-size:\s*13\.5px/);
  expect(rule('mn-posting-status__summary')).toMatch(/font-weight:\s*600/);
  expect(rule('mn-posting-status__separator')).toMatch(/width:\s*1px/);
  expect(rule('mn-posting-status__count')).toMatch(/background:\s*#EDF2FE/);
  expect(rule('mn-posting-status__count')).toMatch(/color:\s*#1B4DD8/);
  expect(rule('mn-posting-status__count')).toMatch(/border-radius:\s*\d+px/);
  expect(mobile).toMatch(/\.mn-posting-status button\s*\{[^}]*min-height:\s*44px/);
  const { container } = render(<PostingStatusBar {...props({ postings: [job()] })} />);
  expect(container.querySelector('.mn-posting-status__separator')).toHaveAttribute('aria-hidden', 'true');
});
it('uses muted OFF/NONE surfaces with outlined enable and filled first-post CTAs', () => {
  const rule = (name: string) => statusCss.match(new RegExp(`^(?:\\.mn-posting-status )?\\.${name}\\s*\\{([^}]*)`, 'm'))?.[1] ?? '';
  expect(rule('mn-posting-status__row--off')).toMatch(/background:\s*#F7F8FA/);
  expect(rule('mn-posting-status__row--none')).toMatch(/background:\s*#F7F8FA/);
  expect(rule('mn-posting-status__action--outline')).toMatch(/background:\s*#fff/);
  expect(rule('mn-posting-status__action--outline')).toMatch(/border:\s*1px solid #CFDAF8/);
  expect(rule('mn-posting-status__action--outline')).toMatch(/color:\s*#1B4DD8/);
  expect(rule('mn-posting-status__action--primary')).toMatch(/background:\s*#1B4DD8/);
  expect(rule('mn-posting-status__action--primary')).toMatch(/color:\s*#fff/);
  const p = props({ postings: [job({ status: 'paused' })] });
  const view = render(<PostingStatusBar {...p} />);
  expect(view.container.querySelector('.mn-posting-status__row')).toHaveClass('mn-posting-status__row--off');
  expect(view.container.querySelector('.mn-posting-status__badge')).toBeNull();
  expect(view.container.querySelector('.mn-posting-status__separator')).toBeNull();
  expect(view.container.querySelector('.mn-posting-status__dot')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByText('OFF')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '공고 켜기' })).toHaveClass('mn-posting-status__action--outline');
  fireEvent.click(screen.getByRole('button', { name: '내 공고 목록' }));
  expect(p.onExpandedChange).toHaveBeenCalledWith(true);
  view.rerender(<PostingStatusBar {...p} expanded />);
  expect(screen.getByRole('region', { name: '우리 병원 공고 1개' })).toBeVisible();
  view.rerender(<PostingStatusBar {...props()} />);
  expect(view.container.querySelector('.mn-posting-status__row')).toHaveClass('mn-posting-status__row--none');
  expect(view.container.querySelector('.mn-posting-status__dot')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('button', { name: '첫 공고 올리기' })).toHaveClass('mn-posting-status__action--primary');
});
it('renders NONE and routes create/manage without nested buttons', () => {
  const p = props(); const { container } = render(<PostingStatusBar {...p} />);
  expect(screen.getByText('아직 올린 공고가 없어요')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '첫 공고 올리기' })); expect(p.onCreate).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: '공고 관리' })); expect(p.onManage).toHaveBeenCalledOnce();
  expect(container.querySelector('button button')).toBeNull();
});
it('does not pretend loading or errors mean NONE', () => {
  const view = render(<PostingStatusBar {...props({ loading: true })} />);
  expect(screen.getByRole('status')).toHaveTextContent('공고를 불러오는 중');
  expect(screen.queryByText('아직 올린 공고가 없어요')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '첫 공고 올리기' })).not.toBeInTheDocument();
  view.rerender(<PostingStatusBar {...props({ error: '네트워크 오류' })} />);
  expect(screen.getByRole('alert')).toHaveTextContent('네트워크 오류');
  expect(screen.queryByText('아직 올린 공고가 없어요')).not.toBeInTheDocument();
});
it('shows OFF for expired-active rows and dispatches enable for private rows', () => {
  const p = props({ postings: [job({ work_end_date: '2026-09-16' })] });
  const view = render(<PostingStatusBar {...p} />);
  expect(screen.getByText('공고가 꺼져 있어요')).toBeVisible();
  expect(screen.queryByText('OFF')).not.toBeInTheDocument(); expect(screen.queryByText('공고 ON')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '공고 켜기' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '공고 수정' })); expect(p.onEdit).toHaveBeenCalledWith('one');
  const paused = props({ postings: [job({ status: 'paused' })] });
  view.rerender(<PostingStatusBar {...paused} />);
  fireEvent.click(screen.getByRole('button', { name: '공고 켜기' })); expect(paused.onEnable).toHaveBeenCalledOnce();
});
it.each([
  { status: 'closed' as const, work_end_date: null },
  { status: 'paused' as const, work_end_date: '2026-09-16' },
])('requires editing rather than enabling ineligible $status postings', posting => {
  const p = props({ postings: [job(posting)] });
  render(<PostingStatusBar {...p} />);
  expect(screen.queryByRole('button', { name: '공고 켜기' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '공고 수정' }));
  expect(p.onEdit).toHaveBeenCalledWith('one');
  expect(p.onEnable).not.toHaveBeenCalled();
});
it('provides desktop view/manage actions without an extra mobile management button', () => {
  const p = props({ postings: [job()] });
  const view = render(<PostingStatusBar {...p} />);
  const preview = screen.getByRole('button', { name: '공고 보기 →' });
  const manage = screen.getByRole('button', { name: '공고 관리' });
  expect(manage).toHaveTextContent(/^공고 관리$/);
  expect(preview).toHaveClass('mn-posting-status__view');
  expect(manage).not.toHaveClass('mn-posting-status__manage--error');
  fireEvent.click(preview); expect(p.onExpandedChange).toHaveBeenCalledWith(true);
  fireEvent.click(manage); expect(p.onManage).toHaveBeenCalledOnce();
  const [mobile, desktop] = statusCss.split('@media (min-width: 768px)');
  expect(mobile).toMatch(/\.mn-posting-status\s*\{[^}]*flex-shrink:\s*0/);
  expect(mobile).toMatch(/\.mn-posting-status__row\s*\{[^}]*height:\s*52px/);
  expect(mobile).toMatch(/\.mn-posting-status__manage\s*\{[^}]*display:\s*none/);
  expect(mobile).toMatch(/\.mn-posting-status__view\s*\{[^}]*display:\s*none/);
  expect(desktop).toMatch(/\.mn-posting-status__row\s*\{[^}]*height:\s*56px/);
  expect(desktop).toMatch(/\.mn-posting-status__manage\s*\{[^}]*display:\s*inline-flex/);
  expect(desktop).toMatch(/\.mn-posting-status__view\s*\{[^}]*display:\s*inline-flex/);
  expect(desktop).toMatch(/\.mn-posting-status__manage\s*\{[^}]*background:\s*#1B4DD8/);
  view.rerender(<PostingStatusBar {...props({ error: '서버 오류' })} />);
  expect(screen.getByRole('button', { name: '공고 관리' })).toHaveClass('mn-posting-status__manage--error');
});
it('shows newest visible role and schedule with visible-only additional count', () => {
  const p = props({ postings: [job({ id: 'hidden', status: 'paused', created_at: '2026-09-18' }), job(), job({ id: 'new', job_category: '치과의사', created_at: '2026-09-17' }), job({ id: 'expired', work_end_date: '2026-09-16' })] });
  render(<PostingStatusBar {...p} />);
  expect(screen.getByText('공고 ON')).toBeVisible(); expect(screen.getByText('치과의사 · 상시 구인')).toBeVisible();
  expect(screen.getByText('+1')).toBeVisible(); expect(screen.queryByText('+3')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /내 공고 목록/ })); expect(p.onExpandedChange).toHaveBeenCalledWith(true);
});
it('expanded list contains every posting newest first, honest states and edit callbacks', () => {
  const p = props({ expanded: true, postings: [job({ id: 'old', title: '오래된 공고', created_at: '2026-09-15' }), job({ id: 'private', title: '비공개 공고', status: 'closed', created_at: '2026-09-16' }), job({ id: 'expired', title: '만료 공고', work_end_date: '2026-09-16', updated_at: '2026-09-17T05:00:00Z' })] });
  render(<PostingStatusBar {...p} />);
  expect(screen.getByRole('heading', { name: '우리 병원 공고 3개' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '공고 관리 →' }));
  expect(p.onManage).toHaveBeenCalledOnce();
  const rows = screen.getAllByRole('listitem');
  expect(rows.map(row => row.textContent)).toEqual([expect.stringContaining('만료 공고'), expect.stringContaining('비공개 공고'), expect.stringContaining('오래된 공고')]);
  expect(within(rows[0]).getByText('기간 만료')).toBeVisible(); expect(within(rows[1]).getByText('비공개')).toBeVisible(); expect(within(rows[2]).getByText('공개 중')).toBeVisible();
  expect(screen.queryByText(/방금/)).not.toBeInTheDocument();
  fireEvent.click(within(rows[0]).getByRole('button', { name: /수정/ })); expect(p.onEdit).toHaveBeenCalledWith('expired');
});
it('closes on Escape, restores toggle focus, and closes on desktop outside pointer only', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  const p = props({ expanded: true, postings: [job()] }); render(<PostingStatusBar {...p} />);
  fireEvent.keyDown(document, { key: 'Escape' }); expect(p.onExpandedChange).toHaveBeenCalledWith(false);
  expect(screen.getByRole('button', { name: /내 공고 목록/ })).toHaveFocus();
  vi.mocked(p.onExpandedChange).mockClear(); fireEvent.pointerDown(document.body); expect(p.onExpandedChange).toHaveBeenCalledWith(false);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  vi.mocked(p.onExpandedChange).mockClear(); fireEvent.pointerDown(document.body); expect(p.onExpandedChange).not.toHaveBeenCalled();
});
it('expires a visible posting at the local calendar day boundary and cleans up its timer', () => {
  vi.setSystemTime(new Date(2026, 8, 17, 23, 59, 59));
  const view = render(<PostingStatusBar {...props({ postings: [job({ work_end_date: '2026-09-17' })] })} />);
  expect(screen.getByText('공고 ON')).toBeVisible();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByText('OFF')).not.toBeInTheDocument(); expect(screen.getByText('공고가 꺼져 있어요')).toBeVisible();
  view.unmount(); expect(vi.getTimerCount()).toBe(0);
});
it('refreshes expiry when a suspended browser tab becomes visible again', () => {
  render(<PostingStatusBar {...props({ postings: [job({ work_end_date: '2026-09-17' })] })} />);
  expect(screen.getByText('공고 ON')).toBeVisible();
  vi.setSystemTime(new Date('2026-09-18T10:00:00Z'));
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.queryByText('OFF')).not.toBeInTheDocument(); expect(screen.getByText('공고가 꺼져 있어요')).toBeVisible();
});
it('uses custom roles and actual date/time ranges without inventing employment type', () => {
  render(<PostingStatusBar {...props({ postings: [job({ job_category: '기타', job_category_custom: '특수 직종', schedule_type: 'specific', work_start_date: '2026-09-18', work_end_date: '2026-09-19', work_start_time: '09:30:00', work_end_time: '18:00:00' })] })} />);
  expect(screen.getByText('특수 직종 · 2026-09-18 ~ 2026-09-19 · 09:30~18:00')).toBeVisible();
  expect(screen.queryByText('+0')).not.toBeInTheDocument();
});
it('disables mutation/navigation actions while busy', () => {
  render(<PostingStatusBar {...props({ postings: [job()], expanded: true, busy: true })} />);
  expect(screen.getByRole('button', { name: '공고 관리' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /간호사 공고 수정/ })).toBeDisabled();
});
