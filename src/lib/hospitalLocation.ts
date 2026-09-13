// Hospital signup uses the browser Maps SDK, not the worker's REST geocoder.
export type HospitalCoordinates = { lat: number; lng: number };

export function validHospitalCoordinates({ lat, lng }: HospitalCoordinates): boolean {
  // Registration and postcode search are domestic; never accept a default/zero or foreign point.
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 33 && lat <= 38.63 && lng >= 124 && lng <= 132;
}

export async function resolveHospitalAddress(address: string): Promise<{
  coordinates: HospitalCoordinates;
  formattedAddress: string;
} | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      new google.maps.Geocoder().geocode({
        address, componentRestrictions: { country: 'KR' }, region: 'KR',
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Geocoder timeout')), 15000);
      }),
    ]);
    // No first-result guessing: the user must refine any ambiguous address.
    if (response.results.length !== 1) return null;
    const result = response.results[0];
    const geometry = result.geometry;
    const broadTypes = ['country', 'administrative_area_level_1', 'administrative_area_level_2', 'locality', 'sublocality', 'postal_code'];
    const precise = result.types.some(type => ['premise', 'subpremise', 'street_address'].includes(type))
      || ['ROOFTOP', 'RANGE_INTERPOLATED'].includes(geometry?.location_type);
    if (result.partial_match || !geometry?.location || !result.formatted_address || !precise
      || result.types.some(type => broadTypes.includes(type))) return null;
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
