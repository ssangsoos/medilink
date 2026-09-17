import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ resolve: vi.fn(), open: vi.fn(), qr: vi.fn() }));
vi.mock('../src/lib/workerContact', () => ({ resolveWorkerContact: m.resolve, openContactApp: m.open }));
vi.mock('qrcode', () => ({ default: { toDataURL: m.qr } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, o?: { defaultValue?: string }) => o?.defaultValue ?? key }) }));
import ContactActions from '../src/components/map/ContactActions';
const workerId = '00000000-0000-4000-8000-000000000002';
const props = { workerId, phone: '010-****-1234', smsPhone: '010-****-1234', body: '채용 문의입니다.' };
beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Macintosh');
  m.resolve.mockReset().mockResolvedValue('+12025550123');
  m.open.mockReset(); m.qr.mockReset().mockResolvedValue('data:image/png;base64,qr');
});
afterEach(() => vi.restoreAllMocks());
describe('worker contact behind a display-masked number', () => {
  it('enables contact without prefetching the raw phone, resolves only on click and opens desktop QR', async () => {
    render(<ContactActions {...props} />);
    const button = screen.getByRole('button', { name: '문자 보내기' });
    expect(button).toBeEnabled(); expect(m.resolve).not.toHaveBeenCalled();
    expect(screen.queryByText('+12025550123')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(await screen.findByRole('dialog', { name: '휴대폰으로 문자 보내기' })).toBeVisible();
    await screen.findByRole('img');
    expect(m.resolve).toHaveBeenCalledExactlyOnceWith(workerId);
    expect(m.qr).toHaveBeenLastCalledWith('sms:+12025550123&body='+encodeURIComponent('안녕하세요. 메디노티 보고 연락드립니다.'), expect.any(Object));
    expect(m.open).not.toHaveBeenCalled();
  });
  it.each(['iPhone', 'Android'])('opens %s SMS composer with fetched phone and original editable draft; no auto-send', async device => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(device);
    render(<ContactActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    const expected = 'sms:+12025550123'+(device==='iPhone'?'&':'?')+'body='+encodeURIComponent(props.body);
    await waitFor(() => expect(m.open).toHaveBeenCalledExactlyOnceWith(expected));
    expect(screen.getByRole('link', { name: '문자 앱 열기' })).toHaveAttribute('href', expected);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('uses the same authorization lookup for phone calls', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
    render(<ContactActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '전화' }));
    await waitFor(() => expect(m.open).toHaveBeenCalledWith('tel:+12025550123'));
    expect(m.resolve).toHaveBeenCalledExactlyOnceWith(workerId);
  });
  it('does not bypass permission checks even when a public phone happens to be complete', async () => {
    m.resolve.mockRejectedValue({ reason: 'unavailable' });
    render(<ContactActions {...props} phone="01012345678" smsPhone="01012345678" />);
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('현재 이 의료인에게 연락할 수 없습니다. 연락 동의 또는 프로필 공개 상태가 변경되었을 수 있습니다.');
    expect(m.qr).not.toHaveBeenCalled(); expect(m.open).not.toHaveBeenCalled();
  });
  it('clearly reports missing backend instead of exposing or guessing a number', async () => {
    m.resolve.mockRejectedValue({ reason: 'setupRequired' });
    render(<ContactActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('연락 기능을 준비 중입니다. 잠시 후 다시 시도해 주세요.');
    expect(m.qr).not.toHaveBeenCalled();
  });
  it('ignores a stale in-flight result after the recipient changes', async () => {
    let finish!: (phone: string) => void;
    m.resolve.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<ContactActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    expect(screen.getByRole('button', { name: '문자 보내기' })).toBeDisabled();
    view.rerender(<ContactActions {...props} workerId="00000000-0000-4000-8000-000000000003" />);
    await act(async () => finish('+12025550123'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(m.qr).not.toHaveBeenCalled();
  });
  it('checks permission again on each contact attempt and clears a closed QR', async () => {
    render(<ContactActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    const modal = await screen.findByRole('dialog'); await within(modal).findByRole('img');
    fireEvent.click(within(modal).getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    m.resolve.mockRejectedValueOnce({ reason: 'unavailable' });
    fireEvent.click(screen.getByRole('button', { name: '문자 보내기' }));
    await screen.findByRole('alert');
    expect(m.resolve).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
