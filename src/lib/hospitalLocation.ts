// Hospital signup uses the browser Maps SDK, not the worker's REST geocoder.
export type HospitalCoordinates = { lat: number; lng: number };

export function validHospitalCoordinates({ lat, lng }: HospitalCoordinates): boolean {
  // Clinics can be anywhere; reject malformed coordinates and the default zero point.
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && (lat !== 0 || lng !== 0);
}

function isBroadLocationType(type: string): boolean {
  return /^(administrative_area_level_|sublocality|postal_code)/.test(type)
    || ['country', 'political', 'locality', 'route', 'intersection', 'neighborhood', 'colloquial_area', 'natural_feature'].includes(type);
}

export function preciseHospitalPlaceTypes(types: string[] | undefined): boolean {
  // PlaceResult has no geocoder location_type. Require a real business/building
  // category, reject geographic results, then let the user explicitly confirm the pin.
  return !!types?.some(type => ['establishment', 'premise', 'subpremise', 'dentist', 'doctor', 'hospital', 'pharmacy', 'veterinary_care'].includes(type))
    && !types.some(isBroadLocationType);
}

export async function resolveHospitalAddress(address: string): Promise<{
  coordinates: HospitalCoordinates;
  formattedAddress: string;
} | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      new google.maps.Geocoder().geocode({ address }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Geocoder timeout')), 15000);
      }),
    ]);
    // No first-result guessing: the user must refine any ambiguous address.
    if (response.results.length !== 1) return null;
    const result = response.results[0];
    const geometry = result.geometry;
    const precise = ['ROOFTOP', 'RANGE_INTERPOLATED'].includes(geometry?.location_type);
    if (result.partial_match || !geometry?.location || !result.formatted_address || !precise
      || result.types.some(isBroadLocationType)) return null;
    const coordinates = { lat: geometry.location.lat(), lng: geometry.location.lng() };
    return validHospitalCoordinates(coordinates)
      ? { coordinates, formattedAddress: result.formatted_address }
      : null;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ZERO_RESULTS') return null;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
