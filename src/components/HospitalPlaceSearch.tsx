import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { preciseHospitalPlaceTypes, validHospitalCoordinates } from '../lib/hospitalLocation';

type Place = google.maps.places.PlaceResult;
type Props = { value: string; onChange: (value: string) => void; onSelect: (place: Place) => void };

function validPlace(place: Place): boolean {
  const point = place.geometry?.location;
  return !!(place.place_id && place.name?.trim() && place.formatted_address?.trim() && point
    && validHospitalCoordinates({ lat: point.lat(), lng: point.lng() }) && preciseHospitalPlaceTypes(place.types));
}

/** Worldwide name search: Autocomplete predictions can omit real Google-listed clinics. */
export default function HospitalPlaceSearch({ value, onChange, onSelect }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error' | 'details'>('idle');
  const [active, setActive] = useState(-1);
  const [composing, setComposing] = useState(false);
  const version = useRef(0);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const service = useRef<google.maps.places.PlacesService | null>(null);
  const selectedName = useRef<string | null>(null);

  const cancel = () => { version.current += 1; clearTimeout(deadline.current); };
  const getService = () => service.current ??= new google.maps.places.PlacesService(document.createElement('div'));

  useEffect(() => {
    const token = ++version.current;
    const query = value.trim();
    if (composing || query.length < 2 || value === selectedName.current) return;
    const debounce = setTimeout(() => {
      if (token !== version.current) return;
      setStatus('loading');
      let settled = false;
      const finish = (places: Place[] | null, resultStatus: string) => {
        if (settled || token !== version.current) return;
        settled = true;
        clearTimeout(deadline.current);
        const seen = new Set<string>();
        const matches = resultStatus === 'OK' ? (places ?? []).filter(place => {
          if (!validPlace(place) || seen.has(place.place_id!)) return false;
          seen.add(place.place_id!);
          return true;
        }).slice(0, 8) : [];
        setResults(matches);
        setActive(-1);
        setStatus(matches.length ? 'idle' : ['OK', 'ZERO_RESULTS'].includes(resultStatus) ? 'empty' : 'error');
      };
      deadline.current = setTimeout(() => finish(null, 'TIMEOUT'), 15000);
      try { getService().textSearch({ query }, finish); }
      catch { finish(null, 'ERROR'); }
    }, 600);
    return () => { clearTimeout(debounce); cancel(); };
  }, [value, composing]);

  // Also covers unmount after a short/selected value, when the search effect has no cleanup.
  useEffect(() => () => { cancel(); }, []);

  const change = (next: string) => {
    cancel(); // Invalidate callbacks and the parent's confirmed location before debounce.
    selectedName.current = null;
    setResults([]); setActive(-1); setStatus('idle');
    onChange(next);
  };
  const select = (place: Place) => {
    if (!results.includes(place) || !validPlace(place)) return;
    cancel();
    const token = version.current;
    setResults([]); setActive(-1); setStatus('details');
    let settled = false;
    const finish = (details: Place | null, resultStatus: string) => {
      if (settled || token !== version.current) return;
      settled = true;
      clearTimeout(deadline.current);
      // Never apply a different place or weaken validation if details is unavailable.
      const chosen = resultStatus === 'OK' && details && details.place_id === place.place_id && validPlace(details) ? details : place;
      selectedName.current = chosen.name!;
      setStatus('idle');
      onSelect(chosen);
    };
    deadline.current = setTimeout(() => finish(null, 'TIMEOUT'), 15000);
    try {
      getService().getDetails({ placeId: place.place_id!, fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types', 'formatted_phone_number'] }, finish);
    } catch { finish(null, 'ERROR'); }
  };

  return <div className="relative min-w-0">
    <input type="text" role="combobox" aria-label={t('hospitalForm.googleSearchLabel')}
      aria-autocomplete="list" aria-expanded={results.length > 0} aria-controls={`${id}-list`}
      aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
      aria-describedby={`${id}-status`} autoComplete="off" value={value}
      placeholder={t('hospitalForm.hospitalNamePlaceholderExample')}
      onChange={e => change(e.target.value)}
      onCompositionStart={() => { cancel(); setResults([]); setActive(-1); setStatus('idle'); setComposing(true); }}
      onCompositionEnd={() => setComposing(false)}
      onKeyDown={e => {
        if (composing || e.nativeEvent.isComposing || e.keyCode === 229) { if (e.key === 'Enter') e.preventDefault(); return; }
        if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && results[active]) select(results[active]); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (results.length) setActive(current => e.key === 'ArrowDown' ? (current + 1) % results.length : (current <= 0 ? results.length - 1 : current - 1));
        }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); setResults([]); setActive(-1); setStatus('idle'); }
      }}
      className="w-full px-4 py-4 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold shadow-sm" />
    {results.length > 0 && <div className="mt-2 rounded-xl border border-blue-200 bg-white overflow-hidden">
      <ul id={`${id}-list`} role="listbox" aria-label={t('hospitalForm.nameSearchResults')} className="max-h-80 overflow-y-auto">
        {results.map((place, index) => <li key={place.place_id} id={`${id}-${index}`} role="option" aria-selected={active === index}
          onMouseDown={e => e.preventDefault()} onClick={() => select(place)}
          className={`cursor-pointer px-4 py-3 border-b border-gray-100 break-words ${active === index ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
          <span className="block font-bold text-gray-900">{place.name}</span>
          <span className="block text-sm text-gray-700 mt-1">{place.formatted_address}</span>
        </li>)}
      </ul>
      <div className="px-4 py-2 text-right text-sm text-gray-700"><span translate="no" className="whitespace-nowrap">Google Maps</span></div>
    </div>}
    <p id={`${id}-status`} role={status === 'error' ? 'alert' : 'status'} className="mt-2 text-sm text-gray-700">
      {status !== 'idle' && t(`hospitalForm.${status === 'loading' ? 'nameSearchLoading' : status === 'details' ? 'nameSearchDetails' : status === 'empty' ? 'nameSearchEmpty' : 'nameSearchError'}`)}
    </p>
  </div>;
}
