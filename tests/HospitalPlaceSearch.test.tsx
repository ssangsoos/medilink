import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HospitalPlaceSearch from '../src/components/HospitalPlaceSearch';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const textSearch = vi.fn();
const getDetails = vi.fn();
const autocomplete = vi.fn((_query, callback) => callback([], 'ZERO_RESULTS'));
const selected = vi.fn();
const changed = vi.fn();
const clinic = { place_id: 'ChIJEwnAb_OjfDUR5juAgngByUs', name: 'Yonsei baro dental clinic',
  formatted_address: '서울특별시 강남구 신사동 논현로 873', types: ['dentist', 'establishment', 'health', 'point_of_interest'],
  geometry: { location: { lat: () => 37.5265801, lng: () => 127.0282433 } } } as google.maps.places.PlaceResult;
function Harness() {
  const [value, setValue] = useState('');
  return <form onSubmit={e => { e.preventDefault(); throw new Error('Search submitted form'); }}>
    <HospitalPlaceSearch value={value} onChange={v => { changed(v); setValue(v); }} onSelect={p => { selected(p); setValue(p.name!); }} />
    <button type="button">manual fallback</button>
  </form>;
}
function type(value: string) { fireEvent.change(screen.getByRole('combobox'), { target: { value } }); }
async function tick(ms = 600) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  textSearch.mockImplementation((_request, callback) => callback([clinic], 'OK'));
  getDetails.mockImplementation((_request, callback) => callback({ ...clinic, formatted_phone_number: '02-123-4567' }, 'OK'));
  vi.stubGlobal('google', { maps: { places: {
    PlacesService: class { textSearch = textSearch; getDetails = getDetails; },
    AutocompleteService: class { getPlacePredictions = autocomplete; },
  } } });
});
afterEach(() => { vi.useRealTimers(); });
it('finds the real clinic by original unspaced NAME even when native autocomplete has no match', async () => {
  render(<Harness />); type('압구정연세바로치과');
  expect(changed).toHaveBeenCalledWith('압구정연세바로치과');
  await tick();
  expect(textSearch).toHaveBeenCalledWith({ query: '압구정연세바로치과' }, expect.any(Function));
  const option = screen.getByRole('option', { name: /Yonsei baro dental clinic/ });
  expect(option).toHaveTextContent(clinic.formatted_address!);
  fireEvent.click(option);
  expect(selected).toHaveBeenCalledWith(expect.objectContaining({ ...clinic, formatted_phone_number: '02-123-4567' }));
  expect(getDetails).toHaveBeenCalledWith({ placeId: clinic.place_id, fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'formatted_phone_number'] }, expect.any(Function));
  expect(screen.getByRole('combobox')).toHaveValue(clinic.name);
  await tick(2000); expect(textSearch).toHaveBeenCalledTimes(1);
  expect(autocomplete).not.toHaveBeenCalled();
});
it('debounces typing and never calls the API for short or empty queries', async () => {
  render(<Harness />); type('a'); await tick(1000); expect(textSearch).not.toHaveBeenCalled();
  type('ab'); await tick(300); type('abc'); await tick(599); expect(textSearch).not.toHaveBeenCalled();
  await tick(1); expect(textSearch).toHaveBeenCalledTimes(1);
  type(''); expect(screen.queryByRole('option')).not.toBeInTheDocument(); await tick(); expect(textSearch).toHaveBeenCalledTimes(1);
});
it.each(['OK', 'REQUEST_DENIED'])('ignores stale query %s callbacks and clears results immediately', async status => {
  const callbacks: Array<(p: google.maps.places.PlaceResult[], s: string) => void> = [];
  textSearch.mockImplementation((_request, callback) => callbacks.push(callback));
  render(<Harness />); type('older clinic'); await tick(); type('newer clinic'); await tick();
  act(() => callbacks[1]([clinic], 'OK'));
  act(() => callbacks[0]([{ ...clinic, name: 'Wrong stale clinic' }], status));
  expect(screen.getByRole('option')).toHaveTextContent(clinic.name!);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  type('third clinic'); expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
it('cancels a pending debounce on Escape without starting a stale spinner', async () => {
  render(<Harness />); type('clinic'); fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
  await tick(20000); expect(textSearch).not.toHaveBeenCalled();
  expect(screen.queryByText('hospitalForm.nameSearchLoading')).not.toBeInTheDocument();
});
it('keeps selection immune to old search callbacks and late details after timeout', async () => {
  let searchCallback!: (p: google.maps.places.PlaceResult[], s: string) => void;
  let detailCallback!: (p: google.maps.places.PlaceResult, s: string) => void;
  textSearch.mockImplementation((_r, cb) => { searchCallback = cb; cb([clinic], 'OK'); });
  getDetails.mockImplementation((_r, cb) => { detailCallback = cb; });
  render(<Harness />); type('clinic'); await tick();
  expect(screen.getByText('Google Maps')).toHaveAttribute('translate', 'no');
  fireEvent.click(screen.getByRole('option')); await tick(15000);
  act(() => { searchCallback([{ ...clinic, name: 'stale' }], 'OK'); detailCallback({ ...clinic, name: 'late' }, 'OK'); });
  expect(selected).toHaveBeenCalledTimes(1); expect(selected).toHaveBeenCalledWith(clinic);
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
it('cancels timers and callbacks on unmount', async () => {
  let callback!: (p: google.maps.places.PlaceResult[], s: string) => void;
  textSearch.mockImplementation((_request, cb) => { callback = cb; });
  const view = render(<Harness />); type('clinic'); await tick(); view.unmount();
  act(() => callback([clinic], 'OK')); await tick(20000); expect(selected).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});
it.each(['ZERO_RESULTS', 'REQUEST_DENIED', 'timeout', 'throw'])('provides bounded %s guidance with fallback still usable', async status => {
  textSearch.mockImplementation((_r, cb) => { if (status === 'throw') throw new Error('SDK'); if (status !== 'timeout') cb([], status); });
  render(<Harness />); type('clinic'); await tick(16000);
  expect(screen.getByText(status === 'ZERO_RESULTS' ? 'hospitalForm.nameSearchEmpty' : 'hospitalForm.nameSearchError')).toBeVisible();
  expect(screen.getByText('manual fallback')).toBeEnabled();
  expect(screen.queryByText('hospitalForm.nameSearchLoading')).not.toBeInTheDocument();
});
it('filters broad/invalid places, deduplicates and caps without country or hospital-type restrictions', async () => {
  const invalid = [ { types: ['locality'] }, { types: ['establishment', 'route'] }, { types: [] }, { name: ' ' }, { formatted_address: '' }, { geometry: undefined }, { geometry: { location: { lat: () => NaN, lng: () => 127 } } }, { geometry: { location: { lat: () => 0, lng: () => 0 } } } ];
  textSearch.mockImplementation((_r, cb) => cb([...invalid.map((p, i) => ({ ...clinic, place_id: `bad${i}`, ...p })), clinic, clinic,
    ...Array.from({ length: 10 }, (_, i) => ({ ...clinic, place_id: `global${i}`, name: `Global pharmacy ${i}`, types: ['pharmacy'], geometry: { location: { lat: () => 40.71, lng: () => -74.01 } } }))], 'OK'));
  render(<Harness />); type('clinic'); await tick(); expect(screen.getAllByRole('option')).toHaveLength(8);
  expect(textSearch.mock.calls[0][0]).toEqual({ query: 'clinic' });
});
it.each(['REQUEST_DENIED', 'timeout', 'invalid', 'mismatch'])('uses the validated matching text result when details %s', async status => {
  getDetails.mockImplementation((_r, cb) => { if (status !== 'timeout') cb(status === 'invalid' ? { ...clinic, types: ['locality'] } : status === 'mismatch' ? { ...clinic, place_id: 'different' } : null, status === 'REQUEST_DENIED' ? status : 'OK'); });
  render(<Harness />); type('clinic'); await tick(); fireEvent.click(screen.getByRole('option')); await tick(15000);
  expect(selected).toHaveBeenCalledWith(clinic);
});
it('ignores pending details after a new query and after unmount', async () => {
  let callback!: (p: google.maps.places.PlaceResult, s: string) => void;
  getDetails.mockImplementation((_r, cb) => { callback = cb; });
  const view = render(<Harness />); type('clinic'); await tick(); fireEvent.click(screen.getByRole('option'));
  type('new query'); act(() => callback(clinic, 'OK')); expect(selected).not.toHaveBeenCalled();
  await tick(); fireEvent.click(screen.getByRole('option')); view.unmount(); act(() => callback(clinic, 'OK')); expect(selected).not.toHaveBeenCalled();
});
it('waits for IME composition end and never selects on composition Enter', async () => {
  render(<Harness />);
  fireEvent.compositionStart(screen.getByRole('combobox')); type('압구정'); await tick(1000);
  expect(textSearch).not.toHaveBeenCalled();
  fireEvent.compositionEnd(screen.getByRole('combobox')); await tick(); expect(textSearch).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', keyCode: 229 });
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter', isComposing: true });
  expect(selected).not.toHaveBeenCalled();
});
it('supports keyboard selection, Escape, and click after blur without form submission', async () => {
  render(<Harness />); type('clinic'); await tick();
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' }); expect(screen.queryByRole('option')).not.toBeInTheDocument();
  type('clinic again'); await tick(); fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-activedescendant');
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' }); expect(selected).toHaveBeenCalledTimes(1);
  type('clinic third'); await tick(); fireEvent.blur(screen.getByRole('combobox')); fireEvent.click(screen.getByRole('option')); expect(selected).toHaveBeenCalledTimes(2);
});
