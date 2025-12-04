// 주소를 입력받아 위도(lat), 경도(lng)를 찾아주는 함수
export const getCoordinates = async (address: string) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error("Google Maps API Key가 없습니다.");
    return null;
  }

  try {
    // 구글에게 주소를 보내서 좌표를 물어봅니다
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    const data = await response.json();

    if (data.status === 'OK') {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    } else {
      console.error("Geocoding 실패:", data.status);
      return null;
    }
  } catch (error) {
    console.error("좌표 변환 중 에러 발생:", error);
    return null;
  }
};