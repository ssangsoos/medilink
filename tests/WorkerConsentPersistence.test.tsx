import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterWorker from '../src/pages/RegisterWorker';
import EditProfile from '../src/pages/EditProfile';

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), getUser: vi.fn(), from: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), saved: vi.fn(), navigate: vi.fn() }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { signUp: mocks.signUp, getUser: mocks.getUser, signOut: vi.fn() }, from: mocks.from } }));
vi.mock('../src/lib/geocode', () => ({ getCoordinates: vi.fn().mockResolvedValue(null) }));
vi.mock('react-i18next', async original => ({ ...await original<typeof import('react-i18next')>(), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/components/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('react-daum-postcode', () => ({ useDaumPostcodePopup: () => vi.fn() }));
vi.mock('react-router-dom', async original => ({ ...await original<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate }));

const VERSION = '2026-09-17-v1';
let profile: Record<string, unknown>;
let payload: Record<string, unknown>;
const scrollIntoView = vi.fn();
const optional = () => screen.getByRole('checkbox', { name: 'consent.thirdPartyLabel' });
const submit = () => fireEvent.submit(document.querySelector('form')!);
async function edit(path = "/worker/profile") {
  render(<MemoryRouter initialEntries={[path]}><EditProfile /></MemoryRouter>);
  await screen.findByDisplayValue('Test worker');
}

beforeEach(() => {
  vi.clearAllMocks();
  profile = { id: 'owner', role: 'worker', name: 'Test worker', phone: '01012345678', worker_contact_consent: null, worker_contact_consent_version: null };
  payload = {};
  Element.prototype.scrollIntoView = scrollIntoView;
  mocks.signUp.mockResolvedValue({ data: { user: { id: 'owner' }, session: null }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } });
  mocks.insert.mockImplementation(rows => { payload = rows[0]; return { select: mocks.select }; });
  mocks.saved.mockReset().mockImplementation(async () => ({ data: { ...profile, ...payload }, error: null }));
  mocks.select.mockReturnValue({ single: mocks.saved });
  mocks.eq.mockReturnValue({ select: mocks.select, error: null });
  mocks.update.mockImplementation(value => { payload = value; return { eq: mocks.eq }; });
  mocks.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }), insert: mocks.insert, update: mocks.update }));
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('worker signup consent persistence (mock services only)', () => {
  it.each([false, true])('stores explicit %s with version while required consent remains separate', async accepted => {
    render(<MemoryRouter><RegisterWorker /></MemoryRouter>);
    for (const name of ['consent.privacyLabel', 'consent.termsLabel', 'consent.ageLabel']) fireEvent.click(screen.getByRole('checkbox', { name }));
    if (accepted) fireEvent.click(optional());
    submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ worker_contact_consent: accepted, worker_contact_consent_version: VERSION });
    expect(mocks.insert.mock.calls[0][0][0]).not.toHaveProperty('worker_contact_consent_at');
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/login'));
    expect(mocks.select).toHaveBeenCalledWith('id,worker_contact_consent,worker_contact_consent_version');
    expect(mocks.saved).toHaveBeenCalled();
  });
  it.each([null, { id: 'other', worker_contact_consent: false, worker_contact_consent_version: VERSION }, { id: 'owner', worker_contact_consent: true, worker_contact_consent_version: VERSION }, { id: 'owner', worker_contact_consent: false, worker_contact_consent_version: 'old' }])('rejects unverified signup consent readback %#', async data => {
    mocks.saved.mockResolvedValue({ data, error: null });
    render(<MemoryRouter><RegisterWorker /></MemoryRouter>);
    for (const name of ['consent.privacyLabel', 'consent.termsLabel', 'consent.ageLabel']) fireEvent.click(screen.getByRole('checkbox', { name }));
    submit();
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(mocks.saved).toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalledWith('workerForm.signupPendingEmail');
  });
  it('does not report signup success when persistence/readback returns an error', async () => {
    mocks.saved.mockResolvedValue({ data: null, error: new Error('denied') });
    render(<MemoryRouter><RegisterWorker /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'consent.allAgree' })); submit();
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.saved).toHaveBeenCalled();
  });
  it('stores the optional selection from all-agree', async () => {
    render(<MemoryRouter><RegisterWorker /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: 'consent.allAgree' })); submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0][0].worker_contact_consent).toBe(true);
  });
});

describe('worker profile consent persistence and read-back', () => {
  it.each([null, false, true])('initializes legacy/declined/current selection %s without automatic enabling', async accepted => {
    profile.worker_contact_consent = accepted; profile.worker_contact_consent_version = accepted === null ? null : VERSION;
    await edit(); expect(optional()).toHaveProperty('checked', accepted === true);
    submit(); await waitFor(() => expect(mocks.saved).toHaveBeenCalled());
    expect(payload).not.toHaveProperty('worker_contact_consent');
    expect(payload).not.toHaveProperty('worker_contact_consent_version');
    expect(payload).not.toHaveProperty('worker_contact_consent_at');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'owner');
    expect(mocks.select).toHaveBeenCalledWith('id,worker_contact_consent,worker_contact_consent_version');
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
  });
  it('scrolls to the consent anchor after asynchronous profile loading', async () => {
    await edit('/worker/profile#contact-consent');
    expect(document.getElementById('contact-consent')).toContainElement(optional());
    expect(scrollIntoView).toHaveBeenCalled();
  });
  it('preserves stale legacy consent on unrelated saves rather than fabricating a new receipt', async () => {
    profile.worker_contact_consent = true; profile.worker_contact_consent_version = 'old';
    await edit(); submit();
    await waitFor(() => expect(mocks.saved).toHaveBeenCalled());
    expect(payload).not.toHaveProperty('worker_contact_consent');
    expect(payload).not.toHaveProperty('worker_contact_consent_version');
    expect(window.alert).toHaveBeenCalledWith('workerForm.saveSuccess');
  });
  it('requires a fresh explicit choice for stale positive consent', async () => {
    profile.worker_contact_consent = true; profile.worker_contact_consent_version = 'old';
    await edit(); expect(optional()).not.toBeChecked();
    fireEvent.click(optional()); submit(); await waitFor(() => expect(mocks.saved).toHaveBeenCalled());
    expect(payload).toMatchObject({ worker_contact_consent: true, worker_contact_consent_version: VERSION });
  });
  it('allows current consent to be withdrawn and confirms the saved false value', async () => {
    profile.worker_contact_consent = true; profile.worker_contact_consent_version = VERSION;
    await edit(); fireEvent.click(optional()); submit();
    await waitFor(() => expect(mocks.saved).toHaveBeenCalled());
    expect(payload.worker_contact_consent).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('workerForm.saveSuccess');
  });
  it.each([
    null,
    { id: 'other', worker_contact_consent: false, worker_contact_consent_version: VERSION },
    { id: 'owner', worker_contact_consent: true, worker_contact_consent_version: VERSION },
    { id: 'owner', worker_contact_consent: false, worker_contact_consent_version: 'old' },
    { id: 'owner', worker_contact_consent: null, worker_contact_consent_version: VERSION },
  ])('never reports success for missing or mismatched read-back %#', async data => {
    mocks.saved.mockResolvedValue({ data, error: null }); await edit(); submit();
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(window.alert).not.toHaveBeenCalledWith('workerForm.saveSuccess');
    expect(mocks.navigate).not.toHaveBeenCalledWith('/dashboard');
  });
  it('never reports success for a read-back/update error', async () => {
    mocks.saved.mockResolvedValue({ data: null, error: new Error('denied') }); await edit(); submit();
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(window.alert).not.toHaveBeenCalledWith('workerForm.saveSuccess');
    expect(mocks.navigate).not.toHaveBeenCalledWith('/dashboard');
  });
  it('does not transfer loaded consent to a changed authenticated account', async () => {
    await edit(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'other' } } }); submit();
    await act(async () => {}); expect(mocks.update).not.toHaveBeenCalled();
  });
});
