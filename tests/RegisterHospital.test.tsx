import { useEffect, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ko from '../src/i18n/locales/ko.json';
import en from '../src/i18n/locales/en.json';
import ja from '../src/i18n/locales/ja.json';
import RegisterHospital from '../src/pages/RegisterHospital';
import { validHospitalCoordinates } from '../src/lib/hospitalLocation';

const mocks = vi.hoisted(() => ({
  mapsFail: false,
  mapsPending: false,
  mapLanguage: 'ko',
  loaderConfig: vi.fn(),
  searchProps: vi.fn(),
  place: {} as google.maps.places.PlaceResult,
  geocode: vi.fn(), signUp: vi.fn(), insert: vi.fn(), from: vi.fn(), signOut: vi.fn(),
}));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { signUp: mocks.signUp, signOut: mocks.signOut }, from: mocks.from,
} }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../src/i18n', () => ({ getMapLanguage: () => mocks.mapLanguage, getMapRegion: () => 'KR' }));
vi.mock('../src/components/LanguageSwitcher', () => ({ default: () => null }));
vi.mock('../src/components/PrivacyConsent', () => ({ default: ({ onValidChange }: { onValidChange: (value: boolean) => void }) =>
  <button type="button" onClick={() => onValidChange(true)}>test consent</button> }));
vi.mock('react-daum-postcode', () => ({ default: ({ onComplete }: { onComplete: (data: { roadAddress: string; address: string }) => void }) =>
  <button type="button" onClick={() => onComplete({ roadAddress: '서울특별시 강남구 압구정로 152', address: '서울 강남구 신사동' })}>test postcode result</button> }));
vi.mock('../src/components/HospitalPlaceSearch', () => ({ default: ({ value, onChange, onSelect }: { value: string; onChange: (value: string) => void; onSelect: (place: google.maps.places.PlaceResult) => void }) => {
  mocks.searchProps({ value, onChange, onSelect });
  return <div><input aria-label="hospitalForm.googleSearchLabel" placeholder="hospitalForm.hospitalNamePlaceholderExample" value={value} onChange={e => onChange(e.target.value)} /><button type="button" onClick={() => onSelect(mocks.place)}>test select place</button></div>;
} }));
vi.mock('@react-google-maps/api', () => ({
  LoadScript: ({ children, onLoad, onError, language, region }: { children: ReactNode; onLoad?: () => void; onError?: (error: Error) => void; language: string; region: string }) => {
    mocks.loaderConfig({ language, region });
    useEffect(() => {
      if (mocks.mapsFail) onError?.(new Error('maps unavailable'));
      else if (!mocks.mapsPending) onLoad?.();
    }, [onLoad, onError]);
    return mocks.mapsFail || mocks.mapsPending ? <div>test maps unavailable</div> : children;
  },
  GoogleMap: ({ children, center }: { children: ReactNode; center: { lat: number; lng: number } }) =>
    <div data-testid="map" data-lat={center.lat} data-lng={center.lng}>{children}</div>,
  Marker: () => null,
}));

const ADDRESS = '서울특별시 강남구 압구정로 152';
const NAME = '압구정 연세바로치과';
const coords = { lat: 37.5234, lng: 127.0281 };
function result(overrides = {}) {
  return { formatted_address: ADDRESS, types: ['street_address'], partial_match: false,
    geometry: { location: { lat: () => coords.lat, lng: () => coords.lng }, location_type: 'ROOFTOP' }, ...overrides };
}
function renderForm() { return render(<MemoryRouter><RegisterHospital /></MemoryRouter>); }
function manual() { fireEvent.click(screen.getByRole('button', { name: /hospitalForm.(manualAddressRegister|searchNotWorking)/ })); }
function nameInput() { return screen.getAllByPlaceholderText('hospitalForm.autoFilledPlaceholder')[0]; }
function addressInput() { return screen.getAllByPlaceholderText('hospitalForm.autoFilledPlaceholder')[1]; }
function typeAddress(value = ADDRESS) { fireEvent.change(addressInput(), { target: { value } }); }
function fillRequired() {
  fireEvent.change(nameInput(), { target: { value: NAME } });
  fireEvent.change(screen.getByPlaceholderText('hospitalForm.emailPlaceholder'), { target: { value: 'mock@example.test' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'not-a-real-password' } });
  fireEvent.click(screen.getByText('test consent'));
}
function submit() { fireEvent.submit(document.querySelector('form')!); }
function lookup() { fireEvent.click(screen.getByRole('button', { name: 'hospitalForm.verifyAddress' })); }
async function resolved() { await screen.findByRole('checkbox', { name: 'hospitalForm.confirmMapLocation' }); }
function confirm() { fireEvent.click(screen.getByRole('checkbox', { name: 'hospitalForm.confirmMapLocation' })); }
function noWrites() { expect(mocks.signUp).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled(); }

beforeEach(() => {
  mocks.mapsFail = false; mocks.mapsPending = false; mocks.place = {}; mocks.mapLanguage = 'ko';
  mocks.geocode.mockReset().mockResolvedValue({ results: [result()] });
  mocks.signUp.mockReset().mockResolvedValue({ data: { user: { id: 'mock-user' }, session: null }, error: null });
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  mocks.from.mockReset().mockReturnValue({ insert: mocks.insert });
  vi.stubGlobal('google', { maps: { Geocoder: class { geocode = mocks.geocode; } } });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('hospital address registration (all external services mocked)', () => {
  it('keeps SDK language stable during in-form locale changes so loaded map objects are not destroyed', () => {
    const view = renderForm();
    expect(mocks.loaderConfig).toHaveBeenLastCalledWith({ language: 'ko', region: 'KR' });
    mocks.mapLanguage = 'ja';
    view.rerender(<MemoryRouter><RegisterHospital /></MemoryRouter>);
    expect(mocks.loaderConfig).toHaveBeenLastCalledWith({ language: 'ko', region: 'KR' });
  });
  it('exposes retry if the Maps script hangs instead of hiding the form indefinitely', async () => {
    vi.useFakeTimers();
    try {
      mocks.mapsPending = true;
      renderForm(); manual(); typeAddress();
      await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
      expect(screen.getByRole('alert')).toHaveTextContent('hospitalForm.mapsUnavailable');
      expect(screen.getByRole('button', { name: 'hospitalForm.retryMaps' })).toBeVisible();
      noWrites();
    } finally { vi.useRealTimers(); }
  });
  it('preserves an unmatched search name when switching to address registration', () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText('hospitalForm.hospitalNamePlaceholderExample'), { target: { value: NAME } });
    manual();
    expect(nameInput()).toHaveValue(NAME);
    expect(nameInput()).not.toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'hospitalForm.searchRoadAddress' })).toBeVisible();
  });
  it('never signs up using the old default coordinates for an unverified manual address', async () => {
    renderForm(); manual(); fillRequired(); typeAddress(); submit();
    await act(async () => {});
    noWrites();
  });
  it('selects a domestic road address, verifies it in browser Maps, confirms and saves actual coordinates', async () => {
    renderForm(); manual(); fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'hospitalForm.searchRoadAddress' }));
    fireEvent.click(screen.getByText('test postcode result'));
    expect(addressInput()).toHaveValue(ADDRESS);
    lookup(); await resolved();
    expect(mocks.geocode).toHaveBeenCalledWith({ address: ADDRESS });
    expect(screen.getByTestId('map')).toHaveAttribute('data-lat', String(coords.lat));
    expect(screen.getByTestId('map')).toHaveAttribute('data-lng', String(coords.lng));
    submit(); noWrites();
    confirm(); submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ name: NAME, address: ADDRESS, latitude: coords.lat, longitude: coords.lng });
  });
  it('invalidates verified coordinates and confirmation immediately on address edits', async () => {
    renderForm(); manual(); fillRequired(); typeAddress(); lookup(); await resolved(); confirm();
    typeAddress('서울특별시 강남구 압구정로 154'); submit();
    noWrites(); expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });
  it('ignores stale lookup success after an address edit and a newer lookup', async () => {
    let oldResolve!: (value: unknown) => void;
    mocks.geocode.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; }));
    renderForm(); manual(); fillRequired(); typeAddress(); lookup();
    typeAddress('서울특별시 강남구 압구정로 154'); lookup(); await resolved(); confirm();
    await act(async () => oldResolve({ results: [result({ geometry: { location: { lat: () => 36, lng: () => 128 }, location_type: 'ROOFTOP' } })] }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-lat', String(coords.lat));
    submit(); await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ address: '서울특별시 강남구 압구정로 154', latitude: coords.lat });
  });
  it('blocks account creation while lookup is loading and permits retry after a visible error', async () => {
    let reject!: (error: Error) => void;
    mocks.geocode.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    renderForm(); manual(); fillRequired(); typeAddress(); lookup();
    expect(screen.getByRole('button', { name: 'hospitalForm.registerSubmit' })).toBeDisabled();
    submit(); noWrites();
    await act(async () => reject(new Error('REQUEST_DENIED')));
    expect(screen.getByRole('alert')).toHaveTextContent('hospitalForm.addressLookupFailed');
    submit(); noWrites();
    lookup(); await resolved();
  });
  it.each([
    ['zero results', []], ['ambiguous results', [result(), result()]],
    ['partial match', [result({ partial_match: true })]],
    ...['premise', 'street_address'].flatMap(type => ['APPROXIMATE', 'GEOMETRIC_CENTER'].map(location_type => [
      `${location_type} ${type}`, [result({ types: [type], geometry: { location: { lat: () => coords.lat, lng: () => coords.lng }, location_type } })],
    ])),
    ['broad administrative rooftop', [result({ types: ['administrative_area_level_3'] })]],
    ['road rooftop', [result({ types: ['route'] })]],
    ['coarse city', [result({ types: ['locality'], geometry: { location: { lat: () => 37.5, lng: () => 127 }, location_type: 'APPROXIMATE' } })]],
    ['zero coordinates', [result({ geometry: { location: { lat: () => 0, lng: () => 0 }, location_type: 'ROOFTOP' } })]],
    ['invalid coordinates', [result({ geometry: { location: { lat: () => NaN, lng: () => 127 }, location_type: 'ROOFTOP' } })]],
  ])('rejects %s without creating an account', async (_, results) => {
    mocks.geocode.mockResolvedValue({ results });
    renderForm(); manual(); fillRequired(); typeAddress(); lookup();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('hospitalForm.addressNotPrecise'));
    submit(); noWrites(); expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });
  it.each(['failure', 'loading'])('keeps the form and address fallback accessible on Maps %s', mode => {
    mocks.mapsFail = mode === 'failure'; mocks.mapsPending = mode === 'loading';
    renderForm(); manual();
    expect(screen.getByPlaceholderText('hospitalForm.emailPlaceholder')).toBeVisible();
    expect(screen.getByRole('button', { name: 'hospitalForm.searchRoadAddress' })).toBeVisible();
    typeAddress(); expect(screen.getByRole('button', { name: 'hospitalForm.verifyAddress' })).toBeDisabled();
    if (mocks.mapsFail) expect(screen.getByRole('alert')).toHaveTextContent('hospitalForm.mapsUnavailable');
  });
  it('keeps Google autocomplete working but invalidates a selected location on new search text', async () => {
    mocks.place = { name: NAME, types: ['dentist', 'health', 'point_of_interest', 'establishment'], formatted_address: ADDRESS, geometry: { location: { lat: () => coords.lat, lng: () => coords.lng } as google.maps.LatLng } };
    renderForm(); fireEvent.click(screen.getByText('test select place')); await resolved(); confirm();
    fireEvent.change(screen.getByPlaceholderText('hospitalForm.hospitalNamePlaceholderExample'), { target: { value: 'another hospital' } });
    fillRequired(); submit(); noWrites();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });
  it('offers a useful manual fallback when a Google place lacks geometry', () => {
    mocks.place = { name: NAME };
    renderForm(); fireEvent.click(screen.getByText('test select place'));
    expect(screen.getByRole('alert')).toHaveTextContent('hospitalForm.placeMissingLocation');
    expect(nameInput()).toHaveValue(NAME);
  });
  it('connects signup to the unrestricted text-search selection interface', () => {
    renderForm();
    expect(mocks.searchProps).toHaveBeenLastCalledWith({ value: '', onChange: expect.any(Function), onSelect: expect.any(Function) });
  });
  it('applies the real Apgujeong name/address/phone/pin and still requires explicit confirmation', async () => {
    mocks.place = { place_id: 'ChIJEwnAb_OjfDUR5juAgngByUs', name: 'Yonsei baro dental clinic', formatted_address: '서울특별시 강남구 신사동 논현로 873', formatted_phone_number: '02-123-4567', types: ['dentist', 'establishment'], geometry: { location: { lat: () => 37.5265801, lng: () => 127.0282433 } as google.maps.LatLng } };
    renderForm(); fillRequired(); fireEvent.click(screen.getByText('test select place')); await resolved();
    expect(nameInput()).toHaveValue(mocks.place.name);
    expect(addressInput()).toHaveValue(mocks.place.formatted_address);
    expect(screen.getByPlaceholderText('hospitalForm.phonePlaceholder')).toHaveValue('02-123-4567');
    expect(screen.getByTestId('map')).toHaveAttribute('data-lat', '37.5265801');
    expect(screen.getByTestId('map')).toHaveAttribute('data-lng', '127.0282433');
    submit(); noWrites(); confirm(); submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
  });
  it.each([
    { name: 'Tokyo clinic', address: '1-1-1 Shinjuku, Tokyo, Japan', lat: 35.69, lng: 139.70 },
    { name: 'New York clinic', address: '123 Main Street, New York, NY, USA', lat: 40.71, lng: -74.01 },
  ])('registers worldwide selected business $name with its actual coordinates', async clinic => {
    mocks.place = { name: clinic.name, types: ['dentist', 'establishment'], formatted_address: clinic.address,
      geometry: { location: { lat: () => clinic.lat, lng: () => clinic.lng } as google.maps.LatLng } };
    renderForm(); fillRequired(); fireEvent.click(screen.getByText('test select place')); await resolved();
    expect(nameInput()).toHaveValue(clinic.name); expect(addressInput()).toHaveValue(clinic.address);
    submit(); noWrites(); confirm(); submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ name: clinic.name, address: clinic.address, latitude: clinic.lat, longitude: clinic.lng });
  });
  it.each([{ lat: 35.69, lng: 139.70 }, { lat: 40.71, lng: -74.01 }])('verifies global manual coordinates %j without restricting country', async point => {
    mocks.geocode.mockResolvedValue({ results: [result({ geometry: { location: { lat: () => point.lat, lng: () => point.lng }, location_type: 'ROOFTOP' } })] });
    renderForm(); manual(); fillRequired(); typeAddress('Full street, city, country'); lookup(); await resolved(); confirm(); submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.geocode).toHaveBeenCalledWith({ address: 'Full street, city, country' });
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ latitude: point.lat, longitude: point.lng });
  });
  it.each([
    ['city', ['locality', 'political']], ['road', ['route']],
    ['mixed broad/business', ['establishment', 'administrative_area_level_3']],
    ['missing types', undefined], ['empty types', []], ['generic POI', ['point_of_interest']],
  ])('rejects autocomplete %s even with domestic coordinates and an address', async (_, types) => {
    mocks.place = { name: NAME, types: types as string[] | undefined, formatted_address: ADDRESS,
      geometry: { location: { lat: () => coords.lat, lng: () => coords.lng } as google.maps.LatLng } };
    renderForm(); fireEvent.click(screen.getByText('test select place')); fillRequired();
    const checkbox = screen.queryByRole('checkbox', { name: 'hospitalForm.confirmMapLocation' });
    if (checkbox) fireEvent.click(checkbox);
    submit(); await act(async () => {}); noWrites();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'hospitalForm.verifyAddress' })).toBeVisible();
    expect(addressInput()).toHaveValue(ADDRESS);
  });
  it.each([['dentist', 'health', 'point_of_interest', 'establishment'], ['premise']])('allows precise place types %j only after explicit map confirmation', async (...types) => {
    mocks.place = { name: NAME, types: types as string[], formatted_address: ADDRESS,
      geometry: { location: { lat: () => coords.lat, lng: () => coords.lng } as google.maps.LatLng } };
    renderForm(); fireEvent.click(screen.getByText('test select place')); fillRequired(); await resolved();
    submit(); noWrites(); confirm(); submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ latitude: coords.lat, longitude: coords.lng });
    expect(mocks.geocode).not.toHaveBeenCalled();
  });
  it.each(['ROOFTOP', 'RANGE_INTERPOLATED'])('allows exact manual geometry %s after confirmation', async location_type => {
    mocks.geocode.mockResolvedValue({ results: [result({ geometry: { location: { lat: () => coords.lat, lng: () => coords.lng }, location_type } })] });
    renderForm(); manual(); fillRequired(); typeAddress(); lookup(); await resolved();
    submit(); noWrites(); confirm(); submit();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0][0][0]).toMatchObject({ latitude: coords.lat, longitude: coords.lng });
  });
  it('ignores a stale error after switching away from manual mode', async () => {
    let reject!: (error: Error) => void;
    mocks.geocode.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    renderForm(); manual(); typeAddress(); lookup();
    fireEvent.click(screen.getByRole('button', { name: 'hospitalForm.searchAgain' }));
    await act(async () => reject(new Error('old error')));
    expect(screen.queryByText('hospitalForm.addressLookupFailed')).not.toBeInTheDocument();
    noWrites();
  });
  it('guards duplicate submits even before React can disable the button', async () => {
    mocks.signUp.mockImplementation(() => new Promise(() => {}));
    renderForm(); manual(); fillRequired(); typeAddress(); lookup(); await resolved(); confirm();
    act(() => { submit(); submit(); });
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
  });
});

it.each([
  { lat: NaN, lng: 127 }, { lat: 37, lng: Infinity }, { lat: 91, lng: 0 },
  { lat: -91, lng: 0 }, { lat: 0, lng: 181 }, { lat: 0, lng: -181 }, { lat: 0, lng: 0 },
])('rejects invalid world coordinates %j', point => {
  expect(validHospitalCoordinates(point)).toBe(false);
});
it.each([{ lat: 35.69, lng: 139.70 }, { lat: 40.71, lng: -74.01 }, { lat: 0, lng: 30 }, { lat: 51, lng: 0 }])('accepts valid world coordinates %j', point => {
  expect(validHospitalCoordinates(point)).toBe(true);
});
it('labels postcode as an optional Korean helper in every locale', () => {
  expect(ko.hospitalForm.searchRoadAddress).toBe('한국 주소 검색');
  expect(en.hospitalForm.searchRoadAddress).toBe('Korean address search');
  expect(ja.hospitalForm.searchRoadAddress).toBe('韓国の住所検索');
});
it('provides all new hospital fallback strings in Korean, English and Japanese', () => {
  const keys = ['nameSearchLoading', 'nameSearchDetails', 'nameSearchEmpty', 'nameSearchError', 'nameSearchResults', 'manualAddressRegister', 'searchCoverageHelp', 'searchRoadAddress', 'verifyAddress', 'addressLookupPending', 'addressLookupFailed', 'addressNotPrecise', 'mapsUnavailable', 'mapsLoading', 'retryMaps', 'confirmMapLocation', 'mapLocationHelp', 'locationRequired', 'placeMissingLocation', 'closeAddressSearch', 'typedAddressHelp', 'postcodeUnavailable'];
  for (const locale of [ko, en, ja]) for (const key of keys) {
    expect((locale.hospitalForm as Record<string, string>)[key], key).toBeTruthy();
  }
});
