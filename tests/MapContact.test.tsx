import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSmsHref } from '../src/lib/contactLinks';
import ContactActions from '../src/components/map/ContactActions';
import TalentCard from '../src/components/map/TalentCard';
import HospitalSheet from '../src/components/map/HospitalSheet';
import PostingRail from '../src/components/map/PostingRail';
import type { JobPosting } from '../src/types/jobPosting';

vi.mock('react-i18next', async importOriginal => ({ ...await importOriginal<typeof import('react-i18next')>(), useTranslation: () => ({
  t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
}) }));
const qrToDataURL = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<string>>());
vi.mock('qrcode', () => ({ default: { toDataURL: qrToDataURL } }));
const hospital = { id: 'h', hospital_name: '테스트 병원', phone: '02-123-4567', mobile_phone: '010-1111-2222' };
const talent = { id: 't', name: '김인재', license_type: '간호사', phone: '010-****-5678', address: '서울 강남구', experience: '5년 경력', bio: '성실한 간호사', desired_hourly_rate: 25000 };
const job = (id: string, overrides: Partial<JobPosting> = {}): JobPosting => ({
  id, hospital_id: 'h', title: `공고 ${id}`, description: '업무 상세', job_category: '간호사', job_category_custom: null,
  schedule_type: 'always', work_start_date: null, work_end_date: null, work_start_time: null, work_end_time: null,
  hourly_rate: 23000, wage_negotiable: false, kakao_link: null, contact_phone: null, status: 'active', latitude: null, longitude: null, ...overrides,
});
beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
  qrToDataURL.mockReset().mockResolvedValue('data:image/png;base64,first');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('ContactActions privacy and device handling', () => {
  it('never creates a route from masked numbers or claims SMS consent', () => {
    render(<ContactActions phone="010-****-1234" body={'[문의]\n안녕하세요'} />);
    expect(screen.getByRole('button', { name: '문자 보내기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '전화' })).toBeDisabled();
    expect(screen.getByText('안전한 연락 연결 준비 중')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('문자 수신 동의')).not.toBeInTheDocument();
  });
  it('preserves valid existing public contacts with an honest warning and unknown consent label', () => {
    render(<ContactActions phone="010-1234-5678" body={'[문의]\n안녕하세요'} />);
    expect(screen.getByRole('link', { name: '문자 보내기' })).toHaveAttribute('href', `sms:01012345678?body=${encodeURIComponent('[문의]\n안녕하세요')}`);
    expect(screen.getByText('연락 시 상대 번호가 문자·전화 앱에 표시됩니다.')).toBeVisible();
    expect(screen.getByText('문자 수신 동의 정보가 확인되지 않았습니다.')).toBeVisible();
  });
  it('explicit opt-out disables SMS but does not disable independently valid phone', () => {
    render(<ContactActions phone="02-123-4567" smsPhone="010-1234-5678" acceptsSms={false} body="[문의]\n내용" />);
    expect(screen.getByRole('button', { name: '문자 보내기' })).toBeDisabled();
    expect(screen.getByRole('link', { name: '전화' })).toHaveAttribute('href', 'tel:021234567');
  });
  it('does not silently substitute a landline for an explicitly unavailable SMS target', () => {
    render(<ContactActions phone="02-123-4567" smsPhone="" body="[문의]\n내용" />);
    expect(screen.getByRole('button', { name: '문자 보내기' })).toBeDisabled();
  });
  it('opens a simple desktop QR with a short greeting, copies only on request, and restores focus', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Macintosh');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<ContactActions phone="010-1234-5678" body={'[문의]\n원문'} />);
    const trigger = screen.getByRole('button', { name: '문자 보내기' });
    trigger.focus(); fireEvent.click(trigger);
    const modal = screen.getByRole('dialog', { name: '휴대폰으로 문자 보내기' });
    expect(writeText).not.toHaveBeenCalled();
    expect(await within(modal).findByRole('img', { name: '문자 작성 QR 코드' })).toHaveAttribute('src', 'data:image/png;base64,first');
    const greeting = '안녕하세요. 메디노티 보고 연락드립니다.';
    expect(within(modal).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(modal).getByText(greeting)).toBeVisible();
    expect(qrToDataURL).toHaveBeenLastCalledWith(buildSmsHref('010-1234-5678', greeting, 'iPhone'), expect.any(Object));
    await act(async () => fireEvent.click(within(modal).getByRole('button', { name: '내용 복사' })));
    expect(writeText).toHaveBeenCalledWith(greeting);
    fireEvent.click(within(modal).getByRole('button', { name: 'Android' }));
    await waitFor(() => expect(qrToDataURL).toHaveBeenLastCalledWith(buildSmsHref('010-1234-5678', greeting, 'Android'), expect.any(Object)));
    expect(within(modal).getByRole('status')).toHaveTextContent('복사했습니다.');
    const close = within(modal).getByRole('button', { name: '닫기' });
    const last = within(modal).getByRole('button', { name: '내용 복사' });
    last.focus(); fireEvent.keyDown(last, { key: 'Tab' }); expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus();
    fireEvent.keyDown(modal, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
    expect(screen.queryByText(/전송했습니다/)).not.toBeInTheDocument();
  });
});

describe('local QR fallback', () => {
  it('ignores stale async QR results and shows an actionable local error', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Macintosh');
    let finishOld!: (value: string) => void;
    qrToDataURL.mockImplementationOnce(() => new Promise<string>(resolve => { finishOld = resolve; }));
    render(<ContactActions phone="010-1234-5678" body="original" smsLabel="QR test" />);
    fireEvent.click(screen.getByRole('button', { name: 'QR test' }));
    const modal = screen.getByRole('dialog');
    await waitFor(() => expect(qrToDataURL).toHaveBeenCalledOnce());
    qrToDataURL.mockResolvedValue('data:image/png;base64,new');
    fireEvent.click(within(modal).getByRole('button', { name: 'Android' }));
    expect(await within(modal).findByRole('img')).toHaveAttribute('src', 'data:image/png;base64,new');
    await act(async () => finishOld('data:image/png;base64,stale'));
    expect(within(modal).getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,new');
    qrToDataURL.mockRejectedValueOnce(new Error('too long'));
    fireEvent.click(within(modal).getByRole('button', { name: 'iPhone' }));
    expect(await within(modal).findByRole('alert')).toHaveTextContent('QR 코드를 만들지 못했습니다. 번호와 내용을 복사해 주세요.');
    expect(within(modal).queryByRole('img')).not.toBeInTheDocument();
  });
  it.each([
    { phone: '010-****-1234', acceptsSms: true },
    { phone: '010-1234-5678', acceptsSms: false },
  ])('never generates a desktop QR for unavailable SMS contact %j', props => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Macintosh');
    render(<ContactActions {...props} body="secret" />);
    const trigger = screen.getByRole('button', { name: '문자 보내기' });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(qrToDataURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('discards the open QR when the recipient changes', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Macintosh');
    const view = render(<ContactActions phone="010-1234-5678" body="mobile draft" />);
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    await screen.findByRole('img');
    view.rerender(<ContactActions phone="010-2345-6789" body="mobile draft" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    await screen.findByRole('img');
    expect(qrToDataURL).toHaveBeenLastCalledWith(buildSmsHref('010-2345-6789', '안녕하세요. 메디노티 보고 연락드립니다.', 'iPhone'), expect.any(Object));
  });
});

describe('TalentCard', () => {
  it('shows supplied masked profile, keeps details and supports templates/custom editing/reset', () => {
    const props = { talent, hospitalName: '테스트 병원', distanceLabel: '약 2km', outOfRange: true, onClose: vi.fn() };
    const view = render(<TalentCard {...props} />);
    expect(screen.getByText('010-****-5678')).toBeVisible();
    expect(screen.getByText('서울 강남구')).toBeVisible();
    expect(screen.getByText(/출퇴근 범위 밖/)).toBeVisible();
    expect(screen.getByText('5년 경력')).toBeInTheDocument();
    expect(screen.getByText('성실한 간호사')).toBeInTheDocument();
    expect(screen.getByText(/25,000/)).toBeInTheDocument();
    expect(screen.getByLabelText('문자 미리보기')).toHaveTextContent('내일');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: '빠른 문자' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '정규 채용' }));
    expect(screen.getByLabelText('문자 미리보기')).toHaveTextContent('간호사 정규 채용');
    fireEvent.click(screen.getByRole('button', { name: '직접 작성' }));
    fireEvent.change(screen.getByRole('textbox', { name: '문자 내용' }), { target: { value: '[직접 문의]\n가능한가요?' } });
    expect(screen.getByRole('textbox')).toHaveValue('[직접 문의]\n가능한가요?');
    view.rerender(<TalentCard {...props} talent={{ ...talent, id: 'new', name: '새인재' }} />);
    expect(screen.getByRole('button', { name: '내일 가능?' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('문자 미리보기')).toHaveTextContent('새인재');
    fireEvent.click(screen.getByRole('button', { name: '닫기' })); expect(props.onClose).toHaveBeenCalledOnce();
  });
});

describe('PostingRail and HospitalSheet', () => {
  it('uses distinct per-job phones and each matching title on the SMS first line', () => {
    render(<PostingRail postings={[job('A', { contact_phone: '010-2222-3333' }), job('B', { contact_phone: '010-4444-5555' })]} hospital={hospital} workerName="김인재" workerRole="간호사" />);
    const cards = screen.getAllByRole('article'); expect(cards).toHaveLength(2);
    expect(screen.getByRole('region', { name: '공고 카드 목록' })).toHaveAttribute('aria-roledescription', 'carousel');
    expect(screen.getByRole('heading', { name: '등록된 공고 2건' })).toBeVisible();
    expect(screen.getByRole('button', { name: '공고 1 보기' }).closest('header')).not.toBeNull();
    cards.forEach((card, index) => {
      expect(card).toHaveAttribute('aria-label', `공고 ${index + 1}/2: 공고 ${index === 0 ? 'A' : 'B'}`);
      expect(within(card).queryByRole('link', { name: '전화' })).not.toBeInTheDocument();
      expect(within(card).getByText('업무 상세')).toBeVisible();
      expect(within(card).getByText('업무 상세').closest('details')).toBeNull();
      expect(within(card).getByText('상시 구인')).toBeVisible();
      expect(card.querySelector('.map-posting-properties')?.children).toHaveLength(3);
      const href = within(card).getByRole('link', { name: '문자 보내기 · 이 공고' }).getAttribute('href')!;
      expect(href).toContain(index === 0 ? 'sms:01022223333?' : 'sms:01044445555?');
      expect(decodeURIComponent(href.split('body=')[1]).split('\n')[0]).toBe(index === 0 ? '[공고 A]' : '[공고 B]');
    });
    expect(screen.getAllByRole('button', { name: /공고 \d+ 보기/ })).toHaveLength(2);
  });
  it('filters closed and expired postings, hides single-card dots, and rejects unsafe kakao', () => {
    render(<PostingRail postings={[job('live', { kakao_link: 'javascript:alert(1)' }), job('closed', { status: 'closed' }), job('expired', { schedule_type: 'specific', work_end_date: '2000-01-01' })]} hospital={hospital} workerName="김" workerRole="간호사" />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /공고 \d+ 보기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '카카오톡 문의' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '문자 보내기 · 이 공고' }).getAttribute('href')).toContain('sms:01011112222?');
  });
  it('preserves safe kakao and disables masked custom phone rather than falling back', () => {
    render(<PostingRail postings={[job('A', { contact_phone: '010-****-1234', kakao_link: 'open.kakao.com/o/test' })]} hospital={hospital} workerName="김" workerRole="간호사" />);
    expect(screen.getByRole('button', { name: '문자 보내기 · 이 공고' })).toBeDisabled();
    expect(screen.getByRole('link', { name: '카카오톡 문의' })).toHaveAttribute('href', 'https://open.kakao.com/o/test');
  });
  it('keeps empty-state hospital default conditions', () => {
    render(<PostingRail postings={[]} hospital={{ ...hospital, seeking_positions: ['간호사'], offered_hourly_rate: 25000, employment_type: '정규직' }} workerName="김" workerRole="간호사" />);
    expect(screen.getByText('등록된 공고가 없습니다.')).toBeVisible();
    expect(screen.getByText(/25,000/)).toBeVisible(); expect(screen.getByText('정규직')).toBeVisible();
  });
  it.each([
    [['010-2222-3333', '010-2222-3333'], '01022223333'],
    [['010-2222-3333', '010-4444-5555'], '01011112222'],
    [['010-2222-3333', null], '01011112222'],
  ])('preserves all-jobs-same override rule for %j', (phones, expected) => {
    render(<HospitalSheet hospital={hospital} postings={phones.map((p, i) => job(`${i}`, { contact_phone: p }))} workerName="김" workerRole="간호사" onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: '병원에 문자 보내기' }).getAttribute('href')).toContain(`sms:${expected}?`);
  });
  it('syncs rail dots from actual card geometry rather than assumed widths', () => {
    render(<PostingRail postings={[job('A'), job('B'), job('C')]} hospital={hospital} workerName="김" workerRole="간호사" />);
    const rail = screen.getByLabelText('공고 카드 목록');
    const cards = screen.getAllByRole('article');
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({ left: 20 } as DOMRect);
    [-355, 20, 430].forEach((left, index) => vi.spyOn(cards[index], 'getBoundingClientRect').mockReturnValue({ left } as DOMRect));
    fireEvent.scroll(rail);
    expect(screen.getByRole('button', { name: '공고 2 보기' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: '공고 1 보기' })).not.toHaveAttribute('aria-current', 'true');
  });
});
