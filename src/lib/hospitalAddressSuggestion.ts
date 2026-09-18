/** A conservative editing suggestion only; never a location/precision validator.
 * The caller must show both parts, require explicit acceptance, and geocode again.
 * Unknown formats are deliberately left to manual correction or postcode search.
 */
export function suggestHospitalRoadAddress(input: string): { address: string; detailAddress: string } | null {
  const match = input.trim().match(/^(서울특별시|서울|부산광역시|부산|대구광역시|대구|인천광역시|인천|광주광역시|광주|대전광역시|대전|울산광역시|울산|경기도|경기|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s*((?:[가-힣]+[시군구읍면]\s+)+)([가-힣0-9·]+(?:대로|로|길))\s*(\d+(?:-\d+)?)\s+([가-힣A-Za-z0-9()\s-]+)$/);
  if (!match) return null;
  const [, region, district, road, number, detail] = match;
  // A trailing number alone or a second address is not a building/floor detail.
  if (!/(?:빌딩|건물|타워|센터|\d+층|\d+호)/.test(detail)
    || /(?:또는|혹은|대로|로|길)\s*\d/.test(detail)
    || /^(?:\d+\s+|또는|혹은)/.test(detail)) return null;
  return {
    address: `${region} ${district.trim().replace(/\s+/g, ' ')} ${road} ${number}`,
    detailAddress: detail.trim(),
  };
}
