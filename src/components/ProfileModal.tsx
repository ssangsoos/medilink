// src/components/ProfileModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Save, MessageCircle, Phone } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';

interface Props {
  user: any;
  onClose: () => void;
  onUpdate: () => void;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function ProfileModal({ user, onClose, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    isVisible: false,
    kakaoLink: '',
    phoneNumber: '',
    desiredHourlyRate: 0,
    availableTasks: '',
    selectedDays: [] as string[],
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    if (user) {
      const days = user.available_time ? user.available_time.split(' / ')[0].split(',') : [];
      setFormData({
        isVisible: user.is_visible || false,
        kakaoLink: user.kakao_link || '',
        phoneNumber: user.phone_number || '',
        desiredHourlyRate: user.desired_hourly_rate || 0,
        availableTasks: user.available_tasks || '',
        selectedDays: days,
        startTime: user.start_time || '',
        endTime: user.end_time || '',
      });
    }
  }, [user]);

  const toggleDay = (day: string) => {
    setFormData(prev => {
      if (prev.selectedDays.includes(day)) {
        return { ...prev, selectedDays: prev.selectedDays.filter(d => d !== day) };
      } else {
        return { ...prev, selectedDays: [...prev.selectedDays, day] };
      }
    });
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
          
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div>
              <div className="font-bold text-purple-900">지도에 내 정보 노출</div>
              <div className="text-xs text-purple-600">켜두면 병원에서 제안이 올 수 있습니다.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={formData.isVisible} onChange={(e) => setFormData({...formData, isVisible: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="space-y-3 p-4 border border-gray-100 rounded-xl bg-gray-50">
            <h3 className="font-bold text-sm text-gray-800 mb-1">연락처 정보 (노출 시 공개됨)</h3>
            <div className="relative">
              <MessageCircle size={16} className="absolute left-3 top-3.5 text-yellow-500" />
              <input 
                type="text" 
                className="w-full p-3 pl-9 border rounded-lg text-sm text-black" 
                placeholder="카카오톡 오픈채팅 링크 (선택)" 
                value={formData.kakaoLink} 
                onChange={(e) => setFormData({...formData, kakaoLink: e.target.value})}
                autoComplete="off"
              />
            </div>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input 
                type="tel" 
                className="w-full p-3 pl-9 border rounded-lg text-sm text-black" 
                placeholder="전화번호 (필수)" 
                value={formData.phoneNumber} 
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">희망 시급 (원)</label>
            <input 
              type="number" 
              className="w-full p-3 border rounded-lg text-black" 
              // 0이면 빈칸으로 보여주기
              value={formData.desiredHourlyRate || ''} 
              onChange={(e) => setFormData({...formData, desiredHourlyRate: parseInt(e.target.value) || 0})} 
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">가능한 요일</label>
            <div className="flex justify-between gap-1">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors
                    ${formData.selectedDays.includes(day) 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 text-black'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">시작 시간</label>
              <input 
                type="time" 
                className="w-full p-3 border rounded-lg text-black" 
                value={formData.startTime} 
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 mb-1">종료 시간</label>
              <input 
                type="time" 
                className="w-full p-3 border rounded-lg text-black" 
                value={formData.endTime} 
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">가능한 업무 (상세히)</label>
            <textarea 
              rows={3} 
              className="w-full p-3 border rounded-lg resize-none text-black" 
              placeholder="예: 스케일링, 인비절라인 어시스트 가능" 
              value={formData.availableTasks} 
              onChange={(e) => setFormData({...formData, availableTasks: e.target.value})} 
            />
          </div>

        </div>

        <button onClick={handleSave} disabled={loading} className="w-full bg-purple-800 text-white py-3 rounded-xl font-bold hover:bg-purple-900 mt-4 shrink-0 flex items-center justify-center gap-2 shadow-lg">
          <Save size={20} /> 저장하기
        </button>
      </div>
    </div>
  );
}