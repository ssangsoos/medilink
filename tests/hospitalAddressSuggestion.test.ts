import { describe, expect, it } from 'vitest';
import { suggestHospitalRoadAddress } from '../src/lib/hospitalAddressSuggestion';

describe('explicit Korean road-address suggestion (not geocode validation)', () => {
  it.each([
    ['대전서구 대덕대로203 둔산미래빌딩 5층', '대전 서구 대덕대로 203', '둔산미래빌딩 5층'],
    ['대전광역시 서구 대덕대로 203 둔산미래빌딩 5층', '대전광역시 서구 대덕대로 203', '둔산미래빌딩 5층'],
    ['서울특별시 강남구 테헤란로 12-3 미래빌딩 2층', '서울특별시 강남구 테헤란로 12-3', '미래빌딩 2층'],
    ['경기도 성남시 분당구 판교역로10번길 12 3층', '경기도 성남시 분당구 판교역로10번길 12', '3층'],
  ])('suggests %s without losing building-number suffixes or detail', (input, address, detailAddress) => {
    expect(suggestHospitalRoadAddress(input)).toEqual({ address, detailAddress });
  });
  it.each([
    '1-1-1 Shinjuku, Tokyo, Japan', '123 Main Street, New York, NY, USA',
    '대전 서구 둔산동 203 5층', '대덕대로203 5층', '대전 서구 대덕대로 203',
    '대전 서구 대덕대로 203 또는 205 5층', '대전 서구 대덕대로 203 / 한밭대로 12 5층',
    '대전 서구 대덕대로 203- 5층', '대전 서구 대덕대로 203, 205 5층',
  ])('does not guess an international, incomplete, ambiguous or non-road address: %s', input => {
    expect(suggestHospitalRoadAddress(input)).toBeNull();
  });
});
