// src/components/ProfileModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Save, MessageCircle, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import AddressSearch from './AddressSearch'; // 주소 검색기 재사용

interface Props {
  user: any;
  onClose: () => void;
  onUpdate: () => void;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function ProfileModal({ user, onClose, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [showAddress, setShowAddress] = useState(false); // 주소창 상태

  const [formData, setFormData] = useState({
    isVisible: false,
    kakaoLink: '',
    phoneNumber: '',
    desiredHourlyRate: 0,
    availableTasks: '',
    selectedDays: [] as string[],
    startTime: '',
    endTime: '',
    address: '',       // 🆕 주소 수정용
    workRadius: 3,     // 🆕 근무 반경 (km)
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    if (user) {
      const days = user.available_time ? user.available_time.split(' / ')[0].split(',') : [];
      // 시간 파싱 로직은 단순화를 위해 생략 (DB 구조 개선 시 수정 권장)
      
      setFormData({
        isVisible: user.is_visible || false,
        kakaoLink: user.kakao_link || '',
        phoneNumber: user.phone_number || '',
        desiredHourlyRate: user.desired_hourly_rate || 0,
        availableTasks: user.available_tasks || '',
        selectedDays: days,
        startTime: '09:00', // 기존 데이터 파싱 대신 기본값 처리 (편의상)
        endTime: '18:00',
        address: user.address || '',
        workRadius: user.work_radius || 3,
        latitude: user.latitude,
        longitude: user.longitude,
      });
    }
  }, [user]);

  const toggleDay = (day: string) => {
    setFormData(prev => {
      if (prev.selectedDays.includes(day)) return { ...prev, selectedDays: prev.selectedDays.filter(d => d !== day) };
      else return { ...prev, selectedDays: [...prev.selectedDays, day] };
    });
  };

  // 🆕 주소 변경 핸들러
  const handleAddressSelect = async (addr: string) => {
    // 주소 -> 좌표 변환 (Geocoding)
    let lat = formData.latitude;
    let lng = formData.longitude;

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const encodedAddress = encodeURIComponent(addr);
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`);
        const data = await res.json();
        if (data.results?.length > 0) {
          lat = data.results[0].geometry.location.lat;
          lng = data.results[0].geometry.location.lng;
        }
      }
    } catch (e) {
      console.error(e);
    }

    setFormData(prev => ({ ...prev, address: addr, latitude: lat, longitude: lng }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const daysString = formData.selectedDays.join(',');
      const timeString = `${formData.startTime} ~ ${formData.endTime}`;

      const { error } = await supabase
        .from('profiles')
        .update({
          is_visible: formData.isVisible,
          kakao_link: formData.kakaoLink,
          phone_number: formData.phoneNumber,
          desired_hourly_rate: formData.desiredHourlyRate,
          available_tasks: formData.availableTasks,
          available_time: `${daysString} / ${timeString}`,
          address: formData.address,       // 🆕 주소 업데이트
          work_radius: formData.workRadius, // 🆕 반경 업데이트
          latitude: formData.latitude,     // 🆕 좌표 업데이트
          longitude: formData.longitude,
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('프로필이 업데이트되었습니다!');
      onUpdate();
      onClose();
    } catch (error: any) {
      alert('저장 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">내 프로필 관리</h2>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 flex-1">
          
          {/* 노출 스위치 */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div>
              <div className="font-bold text-purple-900">지도에 내 정보 노출</div>
              <div className="text-xs text-purple-600">켜야만 병원에서 나를 찾을 수 있습니다.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={formData.isVisible} onChange={(e) => setFormData({...formData, isVisible: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          {/* 🆕 주소 및 반경 설정 */}
          <div className="p-4 border border-gray-200 rounded-xl">
            <h3 className="font-bold text-sm text-gray-800 mb-3">희망 근무 지역</h3>
            
            <div 
              onClick={() => setShowAddress(true)}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 mb-4"
            >
              <MapPin size={18} className="text-purple-600 shrink-0"/>
              <span className="text-sm text-gray-700 truncate">{formData.address || "주소 설정하기"}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 font-bold">
                <span>근무 가능 반경</span>
                <span className="text-purple-700">{formData.workRadius}km</span>
              </div>
              <input 
                type="range" min="1" max="30" step="1"
                value={formData.workRadius}
                onChange={(e) => setFormData({...formData, workRadius: parseInt(e.target.value)})}
                className="w-full accent-purple-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>1km</span>
                <span>30km</span>
              </div>
            </div>
          </div>

          {/* 연락처 정보 */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-500">연락처</label>
            <div className="relative">
              <MessageCircle size={16} className="absolute left-3 top-3.5 text-yellow-500" />
              <input type="text" className="w-full p-3 pl-9 border rounded-lg text-sm" placeholder="카카오톡 오픈채팅 링크" value={formData.kakaoLink} onChange={(e) => setFormData({...formData, kakaoLink: e.target.value})} autoComplete="off"/>
            </div>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="tel" className="w-full p-3 pl-9 border rounded-lg text-sm" placeholder="전화번호" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} autoComplete="off"/>
            </div>
          </div>

          {/* 근무 조건 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">희망 시급 (원)</label>
            <input type="number" className="w-full p-3 border rounded-lg" value={formData.desiredHourlyRate} onChange={(e) => setFormData({...formData, desiredHourlyRate: parseInt(e.target.value) || 0})} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">가능한 요일</label>
            <div className="flex justify-between gap-1">
              {WEEKDAYS.map((day) => (
                <button key={day} onClick={() => toggleDay(day)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${formData.selectedDays.includes(day) ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{day}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">시작 시간</label><input type="time" className="w-full p-3 border rounded-lg" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})}/></div>
            <div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">종료 시간</label><input type="time" className="w-full p-3 border rounded-lg" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})}/></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">가능한 업무</label>
            <textarea rows={2} className="w-full p-3 border rounded-lg resize-none" placeholder="예: 스케일링, 인비절라인 어시스트 가능" value={formData.availableTasks} onChange={(e) => setFormData({...formData, availableTasks: e.target.value})} />
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className="w-full bg-purple-800 text-white py-3 rounded-xl font-bold hover:bg-purple-900 mt-4 shrink-0 flex items-center justify-center gap-2 shadow-lg">
          <Save size={20} /> 저장하기
        </button>

        {showAddress && <AddressSearch onComplete={handleAddressSelect} onClose={() => setShowAddress(false)} />}
      </div>
    </div>
  );
}