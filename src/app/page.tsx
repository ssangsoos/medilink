// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import { LogOut, Map as MapIcon, User, Building, Plus, X, MessageCircle, LogIn } from 'lucide-react';
import MapComponent from '@/components/Map';
import ProfileModal from '@/components/ProfileModal';

const JOB_CATEGORIES = ["의사", "치과의사", "한의사", "간호사", "간호조무사", "치과위생사", "코디네이터", "기타"];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const today = new Date().toISOString().split('T')[0];

  const [jobData, setJobData] = useState({
    title: '', jobCategory: '치과위생사', description: '', hourlyRate: '',
    workDate: today, startTime: '09:00', endTime: '18:00', kakaoLink: '', 
  });

  const fetchData = async (currentUser: any) => {
    if (!currentUser) return;

    if (currentUser.role === 'worker') {
      const { data } = await supabase.from('job_postings').select(`*, profiles:hospital_id(hospital_name, latitude, longitude, phone_number)`).eq('status', 'open');
      if (data) {
        const markers = data.map((job: any) => ({
          id: job.id,
          type: 'job',
          title: job.title,
          position: { lat: job.profiles?.latitude || 37.5665, lng: job.profiles?.longitude || 126.9780 },
          info: {
            title: job.title,
            name: job.profiles?.hospital_name,
            sub: `${job.hourly_rate.toLocaleString()}원`,
            desc: `${job.work_date} (${job.start_time}~${job.end_time})`,
            kakaoLink: job.kakao_link,
            phoneNumber: job.profiles?.phone_number
          }
        }));
        setMapMarkers(markers);
      }
    } else {
      const { data } = await supabase.from('profiles')
        .select('*')
        .eq('role', 'worker')
        .eq('is_visible', true);

      if (data) {
        const markers = data.map((worker: any) => ({
          id: worker.id,
          type: 'worker',
          title: worker.name,
          // 🆕 반경 정보(work_radius) 추가
          workRadius: worker.work_radius, 
          position: { lat: worker.latitude || 37.5665, lng: worker.longitude || 126.9780 },
          info: {
            title: `${worker.job_category || '의료인'} 구직`,
            name: worker.name,
            sub: `희망시급 ${worker.desired_hourly_rate?.toLocaleString()}원`,
            desc: `${worker.available_tasks || ''}\n가능시간: ${worker.available_time || ''}`,
            kakaoLink: worker.kakao_link,
            phoneNumber: worker.phone_number
          }
        }));
        setMapMarkers(markers);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(data);
        fetchData(data);
      }
      setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    try {
        const { error } = await supabase.from('job_postings').insert({
            hospital_id: session.user.id,
            title: jobData.title,
            job_category: jobData.jobCategory,
            description: jobData.description,
            hourly_rate: parseInt(jobData.hourlyRate),
            work_date: jobData.workDate,
            start_time: jobData.startTime,
            end_time: jobData.endTime,
            kakao_link: jobData.kakaoLink,
            status: 'open'
        });
        if (error) throw error;
        alert('등록되었습니다!');
        setShowJobModal(false);
    } catch(e: any) { alert(e.message); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };

  if (loading) return <div>Loading...</div>;

  if (session) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 relative">
        <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center z-[50] relative">
          <div className="font-bold text-xl text-blue-600 flex items-center gap-2"><MapIcon /> 메디링크</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-800 hidden md:block">{userProfile?.name} 님 ({userProfile?.role === 'hospital' ? '병원' : '의료인'})</span>
            <button onClick={handleLogout} className="text-sm bg-gray-100 px-3 py-2 rounded-md"><LogOut size={16}/></button>
          </div>
        </nav>

        <div className="absolute inset-0 top-[60px] z-[0]">
          <MapComponent 
            userLocation={userProfile?.latitude ? { lat: userProfile.latitude, lng: userProfile.longitude } : undefined}
            markers={mapMarkers} 
          />
        </div>

        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-3 z-[100] pointer-events-none">
          <div className="pointer-events-auto">
            {userProfile?.role === 'hospital' ? (
              <button onClick={() => setShowJobModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold hover:bg-blue-700 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
                <Plus size={20}/> 채용 공고 올리기
              </button>
            ) : (
              <button onClick={() => setShowProfileModal(true)} className="bg-purple-800 text-white px-6 py-3 rounded-full shadow-2xl font-bold hover:bg-purple-900 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105">
                <User size={20}/> 내 프로필 관리
              </button>
            )}
          </div>
        </div>

        {/* ... (공고 모달 및 프로필 모달은 기존과 동일) ... */}
        {showJobModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">새 채용 공고</h2>
                <button onClick={() => setShowJobModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <form onSubmit={handlePostJob} className="space-y-3">
                 <div><label className="block text-xs font-bold text-gray-500 mb-1">공고 제목</label><input type="text" required className="w-full p-3 border rounded-lg" onChange={(e) => setJobData({...jobData, title: e.target.value})}/></div>
                 <div><label className="block text-xs font-bold text-gray-500 mb-1">모집 직종</label><select className="w-full p-3 border rounded-lg bg-white" value={jobData.jobCategory} onChange={(e) => setJobData({...jobData, jobCategory: e.target.value})}>{JOB_CATEGORIES.map((job) => <option key={job} value={job}>{job}</option>)}</select></div>
                 <div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">근무 날짜</label><input type="date" required className="w-full p-3 border rounded-lg" value={jobData.workDate} onChange={(e) => setJobData({...jobData, workDate: e.target.value})}/></div><div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">시급</label><input type="number" required className="w-full p-3 border rounded-lg" onChange={(e) => setJobData({...jobData, hourlyRate: e.target.value})}/></div></div>
                 <div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">시작 시간</label><input type="time" required className="w-full p-3 border rounded-lg" value={jobData.startTime} onChange={(e) => setJobData({...jobData, startTime: e.target.value})}/></div><div className="flex-1"><label className="block text-xs font-bold text-gray-500 mb-1">종료 시간</label><input type="time" required className="w-full p-3 border rounded-lg" value={jobData.endTime} onChange={(e) => setJobData({...jobData, endTime: e.target.value})}/></div></div>
                 <div><label className="block text-xs font-bold text-gray-500 mb-1">오픈채팅방 링크 (선택)</label><div className="relative"><MessageCircle size={18} className="absolute left-3 top-3 text-yellow-500" /><input type="text" placeholder="https://open.kakao.com/..." className="w-full p-3 pl-10 border rounded-lg bg-gray-50" onChange={(e) => setJobData({...jobData, kakaoLink: e.target.value})}/></div></div>
                 <div><label className="block text-xs font-bold text-gray-500 mb-1">상세 내용</label><textarea required rows={3} className="w-full p-3 border rounded-lg resize-none" onChange={(e) => setJobData({...jobData, description: e.target.value})}/></div>
                 <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 mt-2">공고 등록하기</button>
              </form>
            </div>
          </div>
        )}

        {showProfileModal && <ProfileModal user={userProfile} onClose={() => setShowProfileModal(false)} onUpdate={() => fetchData(userProfile)} />}
      </div>
    );
  }

  // 비로그인 상태 (랜딩) - 기존과 동일하므로 생략하지 않고 전체 코드 유지
  return (
    <div className="min-h-screen bg-white">
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto"><div className="text-2xl font-bold text-blue-600">Medilink</div><Link href="/login" className="text-gray-600 hover:text-blue-600 font-medium">로그인</Link></nav>
      <main className="max-w-6xl mx-auto px-6 py-20 text-center"><h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">우리 동네 의료 인력,<br/><span className="text-blue-600">지도에서 바로</span> 찾으세요.</h1><p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">병원은 급한 인력을 빠르게 구하고, 의료인은 원하는 시간에 일하세요.<br/>복잡한 절차 없이 위치 기반으로 즉시 연결됩니다.</p><div className="flex justify-center gap-6"><Link href="/register?role=hospital" className="flex flex-col items-center gap-3 p-8 border-2 border-blue-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-pointer w-64 shadow-sm hover:shadow-md"><div className="bg-blue-100 p-4 rounded-full group-hover:bg-blue-200 transition-colors"><Building size={36} className="text-blue-600"/></div><span className="font-bold text-xl text-gray-800">병의원으로 회원가입</span><span className="text-sm text-gray-500">인력이 필요하신가요?</span></Link><Link href="/register?role=worker" className="flex flex-col items-center gap-3 p-8 border-2 border-purple-100 rounded-2xl hover:border-purple-600 hover:bg-purple-50 transition-all group cursor-pointer w-64 shadow-sm hover:shadow-md"><div className="bg-purple-100 p-4 rounded-full group-hover:bg-purple-200 transition-colors"><User size={36} className="text-purple-700"/></div><span className="font-bold text-xl text-gray-800">의료인으로 회원가입</span><span className="text-sm text-gray-500">일자리를 찾고 계신가요?</span></Link><Link href="/login" className="flex flex-col items-center gap-3 p-8 border-2 border-gray-200 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition-all group cursor-pointer w-64 shadow-sm hover:shadow-md"><div className="bg-gray-100 p-4 rounded-full group-hover:bg-gray-200 transition-colors"><LogIn size={36} className="text-gray-600"/></div><span className="font-bold text-xl text-gray-800">기존 회원 로그인</span><span className="text-sm text-gray-500">이미 계정이 있으신가요?</span></Link></div></main>
    </div>
  );
}