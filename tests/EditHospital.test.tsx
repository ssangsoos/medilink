import { useEffect, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditHospital from '../src/pages/EditHospital';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), saved: vi.fn(),
  resolve: vi.fn(), legacyGeocode: vi.fn(), postcode: vi.fn(), navigate: vi.fn(),
  mapsFail: false,
}));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }));
vi.mock('../src/lib/geocode', () => ({ getCoordinates: mocks.legacyGeocode }));
vi.mock('../src/lib/hospitalLocation', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/lib/hospitalLocation')>(), resolveHospitalAddress: mocks.resolve,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/i18n', () => ({ getMapLanguage: () => 'en', getMapRegion: () => 'US' }));
vi.mock('../src/components/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('react-router-dom', async (importOriginal) => ({ ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate }));
vi.mock('react-daum-postcode', () => ({ useDaumPostcodePopup: () => mocks.postcode }));
vi.mock('@react-google-maps/api', () => ({
  LoadScript: ({ children, onLoad, onError }: { children: ReactNode; onLoad: () => void; onError: (error: Error) => void }) => {
    useEffect(() => { if (mocks.mapsFail) onError(new Error('offline')); else onLoad(); }, [onLoad, onError]);
    return mocks.mapsFail ? null : children;
  },
  GoogleMap: ({ children, center }: { children: ReactNode; center: { lat: number; lng: number } }) => <div data-testid="map" data-lat={center.lat} data-lng={center.lng}>{children}</div>,
  Marker: () => null,
}));
const ADDRESS = '123 Main Street, New York, NY, USA';
const POINT = { lat: 40.7128, lng: -74.006 };
let profile: { id: string; address: string; hospital_name: string; latitude: number | null; longitude: number | null; phone: string };
let payload: Record<string, unknown>;
const addressInput = () => screen.getByPlaceholderText('hospitalForm.addressSearchPlaceholder');
const submit = () => fireEvent.submit(document.querySelector('form')!);
const lookup = () => fireEvent.click(screen.getByRole('button', { name: 'hospitalForm.verifyAddress' }));
async function load() {
  render(<MemoryRouter><EditHospital /></MemoryRouter>);
  await screen.findByDisplayValue(ADDRESS);
  await act(async () => {});
}
async function verify() { lookup(); await screen.findByRole('checkbox', { name: 'hospitalForm.confirmMapLocation' }); }
function confirm() { fireEvent.click(screen.getByRole('checkbox', { name: 'hospitalForm.confirmMapLocation' })); }

beforeEach(() => {
  vi.clearAllMocks(); mocks.mapsFail = false;
  profile = { id: 'owner', address: ADDRESS, hospital_name: 'Test clinic', latitude: 37.5, longitude: 127, phone: '123' };
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'owner' } } });
  mocks.resolve.mockReset().mockResolvedValue({ coordinates: POINT, formattedAddress: ADDRESS });
  mocks.legacyGeocode.mockReset().mockResolvedValue(null);
  mocks.saved.mockReset().mockImplementation(async () => ({ data: { ...profile, ...payload }, error: null }));
  mocks.select.mockReturnValue({ single: mocks.saved });
  mocks.eq.mockReturnValue({ select: mocks.select, error: null });
  mocks.update.mockImplementation((value) => { payload = value; return { eq: mocks.eq }; });
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: profile, error: null }) }) }), update: mocks.update,
  }));
  mocks.postcode.mockImplementation(({ onComplete }) => onComplete({ roadAddress: '서울 강남구 압구정로 152', address: '서울 강남구 신사동', addressType: 'R', bname: '신사동', buildingName: 'Building' }));
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('hospital profile location repair (no real services)', () => {
  it('regression: does not silently save a changed address after geocoding fails', async () => {
    await load();
    fireEvent.click(screen.getByRole('button', { name: /hospitalForm.(searchButton|searchRoadAddress)/ }));
    submit(); await act(async () => {});
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('repairs same-address coordinates only after precise lookup and explicit confirmation', async () => {
    await load(); await verify(); submit(); expect(mocks.update).not.toHaveBeenCalled();
    confirm(); submit(); await waitFor(() => expect(mocks.saved).toHaveBeenCalled());
    expect(payload).toMatchObject({ address: ADDRESS, latitude: POINT.lat, longitude: POINT.lng });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'owner');
    expect(mocks.select).toHaveBeenCalledWith('id,address,latitude,longitude');
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
  });
  it.each(['reject', 'partial'])('blocks same-address save after %s lookup', async (kind) => {
    if (kind === 'reject') mocks.resolve.mockRejectedValue(new Error('REQUEST_DENIED'));
    else mocks.resolve.mockResolvedValue(null);
    await load(); lookup(); await screen.findByRole('alert'); submit(); await act(async () => {});
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.legacyGeocode).not.toHaveBeenCalled();
  });
  it('invalidates confirmation on a worldwide typed address change', async () => {
    await load(); expect(addressInput()).not.toHaveAttribute('readonly'); await verify(); confirm();
    fireEvent.change(addressInput(), { target: { value: '東京都新宿区西新宿2丁目8-1' } }); submit();
    expect(mocks.update).not.toHaveBeenCalled(); expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });
  it.each(['success', 'error'])('ignores stale lookup %s after an edit and newer resolution', async (kind) => {
    let resolve!: (value: unknown) => void; let reject!: (value: Error) => void;
    mocks.resolve.mockImplementationOnce(() => new Promise((yes, no) => { resolve = yes; reject = no; }));
    await load(); lookup(); lookup(); expect(mocks.resolve).toHaveBeenCalledTimes(1);
    submit(); expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(addressInput(), { target: { value: '10 Downing Street, London, UK' } }); await verify(); confirm();
    await act(async () => { if (kind === 'success') resolve({ coordinates: { lat: 1, lng: 2 }, formattedAddress: 'stale' }); else reject(new Error('stale')); });
    expect(screen.getByTestId('map')).toHaveAttribute('data-lat', String(POINT.lat));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); submit();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(payload).toMatchObject({ address: '10 Downing Street, London, UK', latitude: POINT.lat });
  });
  it('preserves original coordinates for phone edits even when Maps is unavailable', async () => {
    mocks.mapsFail = true; await load(); fireEvent.change(screen.getByDisplayValue('123'), { target: { value: '456' } }); submit();
    await waitFor(() => expect(mocks.saved).toHaveBeenCalled());
    expect(payload.phone).toBe('456'); expect(payload).not.toHaveProperty('latitude'); expect(payload).not.toHaveProperty('longitude');
    expect(mocks.resolve).not.toHaveBeenCalled(); expect(mocks.legacyGeocode).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
  });
  it.each([
    ['address', { address: 'wrong address' }],
    ['latitude', { latitude: POINT.lat }],
    ['longitude', { longitude: POINT.lng }],
  ])('rejects altered returned %s on an unchanged-address phone-only save', async (_field, changedFields) => {
    mocks.mapsFail = true;
    mocks.saved.mockImplementation(async () => ({ data: { ...profile, ...payload, ...changedFields }, error: null }));
    await load();
    fireEvent.change(screen.getByDisplayValue('123'), { target: { value: '456' } });
    submit();
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(payload.phone).toBe('456');
    expect(payload).not.toHaveProperty('latitude');
    expect(payload).not.toHaveProperty('longitude');
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('hospitalForm.errSaveFailedPrefixhospitalForm.locationRequired');
    expect(window.alert).not.toHaveBeenCalledWith('hospitalForm.editSuccessAlert');
    expect(mocks.navigate).not.toHaveBeenCalledWith('/dashboard');
  });
  it.each([[null, null], [0, 0], [100, 200]])('requires verification for invalid saved coordinates %s/%s', async (lat, lng) => {
    profile.latitude = lat; profile.longitude = lng; await load(); submit(); await act(async () => {});
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('blocks saving loaded profile data into a different authenticated account', async () => {
    await load(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'other-account' } } }); submit();
    await act(async () => {}); expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([null, { id: 'wrong-id' }, { id: 'owner', address: ADDRESS, latitude: 1, longitude: 2 }])('does not report success for missing or mismatched returned rows %#', async (data) => {
    mocks.saved.mockResolvedValue({ data, error: null }); await load(); await verify(); confirm(); submit();
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalledWith('/dashboard');
    expect(window.alert).not.toHaveBeenCalledWith('hospitalForm.editSuccessAlert');
  });
  it('blocks duplicate saves while the authenticated update is pending', async () => {
    let finish!: (value: unknown) => void;
    mocks.saved.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await load(); await verify(); confirm(); submit(); submit();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(document.querySelector('fieldset')).toBeDisabled();
    await act(async () => finish({ data: { ...profile, ...payload }, error: null }));
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');
  });
  it('does not report success when Supabase returns an update error', async () => {
    mocks.saved.mockResolvedValue({ data: null, error: new Error('update denied') });
    await load(); submit(); await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalledWith('/dashboard');
  });
  it('blocks a returned address mismatch even if the corrected coordinates match', async () => {
    mocks.saved.mockResolvedValue({ data: { id: 'owner', address: 'wrong address', latitude: POINT.lat, longitude: POINT.lng }, error: null });
    await load(); await verify(); confirm(); submit(); await waitFor(() => expect(window.alert).toHaveBeenCalled());
    expect(mocks.navigate).not.toHaveBeenCalledWith('/dashboard');
  });
  it('requires a fresh confirmation after a second same-address lookup', async () => {
    await load(); await verify(); confirm(); await verify(); submit();
    expect(screen.getByRole('checkbox', { name: 'hospitalForm.confirmMapLocation' })).not.toBeChecked();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('uses the plain Korean road address without district/building suffixes', async () => {
    await load(); fireEvent.click(screen.getByRole('button', { name: 'hospitalForm.searchRoadAddress' }));
    expect(addressInput()).toHaveValue('서울 강남구 압구정로 152'); await verify();
    expect(mocks.resolve).toHaveBeenCalledWith('서울 강남구 압구정로 152');
  });
});
