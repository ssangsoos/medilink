import i18n from '../i18n';

// 두 좌표 사이 거리(km) - Haversine
export const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

// 거주지 정확 특정을 막기 위한 결정론적 노이즈 (±약 300m).
// 같은 id면 항상 같은 흐려진 좌표가 나옵니다.
const hashSeed = (id: string): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const jitterCoords = (
  id: string,
  lat: number,
  lon: number,
): { lat: number; lon: number } => {
  const seed = hashSeed(id);
  const r1 = (seed % 10000) / 10000;
  const r2 = ((seed >>> 16) % 10000) / 10000;
  // ±0.003도 ≈ ±330m
  const dLat = (r1 - 0.5) * 0.006;
  const dLon = (r2 - 0.5) * 0.006;
  return { lat: lat + dLat, lon: lon + dLon };
};

// 거리를 단계적으로 표시 (정확한 거리 노출 방지). 언어별 라벨은 i18n에서 조회.
export const formatDistance = (km: number): string => {
  if (km < 1) return i18n.t('distance.within1km');
  if (km < 3) return i18n.t('distance.about2km');
  if (km < 7) return i18n.t('distance.about5km');
  if (km < 15) return i18n.t('distance.about10km');
  if (km < 25) return i18n.t('distance.about20km');
  if (km < 40) return i18n.t('distance.about30km');
  if (km < 70) return i18n.t('distance.about50km');
  return i18n.t('distance.over70km');
};

// 반경 옵션 (NULL = 제한 없음)
export const WORK_RADIUS_OPTIONS = [
  { value: '1', label: '1km 이내' },
  { value: '5', label: '5km 이내' },
  { value: '10', label: '10km 이내' },
  { value: '30', label: '30km 이내' },
  { value: 'unlimited', label: '제한 없음 / 협의' },
] as const;

export const RADIUS_VALUES_KM = [1, 5, 10, 30];

// 기존 사용자(예: 3, 20)를 새 옵션으로 매핑
export const radiusToOption = (radius: number | null | undefined): string => {
  if (radius == null) return 'unlimited';
  // 가장 가까운 새 옵션으로 스냅
  let closest = RADIUS_VALUES_KM[0];
  let diff = Math.abs(radius - closest);
  for (const v of RADIUS_VALUES_KM) {
    const d = Math.abs(radius - v);
    if (d < diff) {
      closest = v;
      diff = d;
    }
  }
  return String(closest);
};

export const optionToRadius = (option: string): number | null =>
  option === 'unlimited' ? null : Number(option);
