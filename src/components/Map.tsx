// src/components/Map.tsx
'use client';

import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { useState, useEffect } from 'react';

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 37.5665, lng: 126.9780 };

interface MapProps {
  userLocation?: { lat: number; lng: number };
  markers?: any[];
}

export default function MapComponent({ userLocation, markers = [] }: MapProps) {
  const [center, setCenter] = useState(defaultCenter);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    if (userLocation && userLocation.lat !== 0) setCenter(userLocation);
  }, [userLocation]);

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        options={{ zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {/* 🆕 [추가됨] 지도 왼쪽 상단 안내 박스 (범례) */}
        <div className="absolute top-2 left-2 bg-white/90 p-3 rounded-lg shadow-md z-10 text-xs font-bold border border-gray-200 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" className="w-5 h-5" alt="공고"/>
            <span className="text-black">채용 공고 (병원)</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="http://maps.google.com/mapfiles/ms/icons/purple-dot.png" className="w-5 h-5" alt="구직자"/>
            <span className="text-black">의료인 (구직)</span>
          </div>
        </div>

        {/* 내 위치 */}
        {userLocation && userLocation.lat !== 0 && (
          <Marker position={userLocation} title="내 위치" icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />
        )}

        {/* 마커들 */}
        {markers.map((marker) => (
          <>
            <Marker
              key={marker.id}
              position={marker.position}
              title={marker.title}
              onClick={() => setSelectedMarker(marker)}
              icon={marker.type === 'worker' ? 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'}
            />
            {/* 반경 원 그리기 */}
            {marker.type === 'worker' && marker.workRadius && (
              <Circle
                center={marker.position}
                radius={marker.workRadius * 1000}
                options={{ fillColor: '#800080', fillOpacity: 0.1, strokeColor: '#800080', strokeOpacity: 0.3, strokeWeight: 1, clickable: false }}
              />
            )}
          </>
        ))}

        {/* 정보창 */}
        {selectedMarker && (
          <InfoWindow position={selectedMarker.position} onCloseClick={() => setSelectedMarker(null)}>
            <div className="p-1 min-w-[200px]">
              <h3 className={`font-bold text-lg mb-1 ${selectedMarker.type === 'worker' ? 'text-purple-700' : 'text-gray-900'}`}>{selectedMarker.info.title}</h3>
              <p className="text-sm text-blue-600 font-bold mb-3 border-b pb-2">{selectedMarker.info.name}</p>
              
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p className="flex items-center gap-2"><span>💰</span> <span className="font-bold text-black">{selectedMarker.info.sub}</span></p>
                <p className="whitespace-pre-line text-xs">{selectedMarker.info.desc}</p>
              </div>

              <div className="flex gap-2">
                {selectedMarker.info.kakaoLink ? (
                  <a href={selectedMarker.info.kakaoLink} target="_blank" rel="noreferrer" className="flex-1 bg-[#FAE100] text-[#371D1E] text-xs py-2.5 rounded-md font-bold hover:bg-[#FCE840] flex items-center justify-center gap-1 no-underline transition-colors"><span>💬</span> 카톡 문의</a>
                ) : (
                  <button disabled className="flex-1 bg-gray-200 text-gray-400 text-xs py-2.5 rounded-md font-bold flex items-center justify-center gap-1 cursor-not-allowed"><span>💬</span> 카톡 미제공</button>
                )}
                {selectedMarker.info.phoneNumber && (
                  <a href={`tel:${selectedMarker.info.phoneNumber}`} className="bg-gray-100 text-gray-600 text-xs px-3 py-2.5 rounded-md hover:bg-gray-200 flex items-center justify-center border border-gray-200" title="전화 걸기">📞</a>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}