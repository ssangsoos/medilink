import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, Plus, MapPin, Search, Edit } from 'lucide-react'; 
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 37.5665, lng: 126.9780 };

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [isExposed, setIsExposed] = useState(false);
  const [myLocation, setMyLocation] = useState(defaultCenter);

  const [jobs, setJobs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<any>(null);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (profile) {
        setUserRole(profile.role);
        setUserName(profile.hospital_name || profile.name);
        setIsExposed(profile.is_exposed || false);

        if (profile.latitude && profile.longitude) {
          setMyLocation({ lat: profile.latitude, lng: profile.longitude });
        }

        if (profile.role === 'worker') {
          const { data } = await supabase
            .from('job_postings')
            .select('*, profiles(hospital_name)')
            .eq('status', 'active')
            .not('latitude', 'is', null);
          setJobs(data || []);
        } 
        else if (profile.role === 'hospital') {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'worker')
            .eq('is_exposed', true) 
            .not('latitude', 'is', null);
          setWorkers(data || []);
        }
      }
    } catch (error) {
      console.error('에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleExposure = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const newValue = !isExposed;
    setIsExposed(newValue); 

    const { error } = await supabase
      .from('profiles')
      .update({ is_exposed: newValue })
      .eq('id', user.id);
      
    if (error) {
      alert('설정 저장 실패! 다시 시도해주세요.');
      setIsExposed(!newValue);
    }
  };

  const goEditProfile = () => {
    if (userRole === 'hospital') navigate('/hospital/edit');
    else navigate('/worker/profile');
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">데이터 로딩 중...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center shrink-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">Medilink</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600"><span className="font-bold">{userName}</span>님</span>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 flex items-center gap-1 text-sm"><LogOut size={16} /> <span className="hidden md:inline">로그아웃</span></button>
        </div>
      </nav>

      <div className="flex-1 relative w-full h-full">
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={myLocation}
            zoom={13}
            options={{ disableDefaultUI: true, zoomControl: true }}
          >
            {myLocation.lat && (
              <Marker 
                position={myLocation} 
                icon={"http://maps.google.com/mapfiles/ms/icons/blue-dot.png"} 
                title="내 위치 (클릭하여 수정)"
                onClick={goEditProfile} 
              />
            )}

            {userRole === 'worker' && jobs.map((job) => (
              <Marker key={job.id} position={{ lat: job.latitude, lng: job.longitude }} onClick={() => setSelectedPin({ type: 'job', data: job })} />
            ))}

            {userRole === 'hospital' && workers.map((worker) => (
              <Marker 
                key={worker.id} 
                position={{ lat: worker.latitude, lng: worker.longitude }} 
                icon={"http://maps.google.com/mapfiles/ms/icons/purple-dot.png"} 
                onClick={() => setSelectedPin({ type: 'worker', data: worker })} 
              />
            ))}

            {selectedPin && (
              <InfoWindow position={{ lat: selectedPin.data.latitude, lng: selectedPin.data.longitude }} onCloseClick={() => setSelectedPin(null)}>
                <div className="p-2 min-w-[240px]">
                  {selectedPin.type === 'job' && (
                    <div>
                      <h3 className="font-bold text-lg mb-1">{selectedPin.data.title}</h3>
                      <p className="text-blue-600 font-bold text-sm mb-2">{selectedPin.data.profiles?.hospital_name}</p>
                      <p className="text-sm mb-1">💰 시급: {Number(selectedPin.data.hourly_rate).toLocaleString()}원</p>
                      <p className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">{selectedPin.data.description}</p>
                      {selectedPin.data.kakao_link && (
                        <a href={selectedPin.data.kakao_link} target="_blank" rel="noreferrer" className="block w-full bg-yellow-300 hover:bg-yellow-400 text-black text-center py-2 rounded-lg font-bold text-sm">카카오톡으로 지원하기</a>
                      )}
                    </div>
                  )}

                  {selectedPin.type === 'worker' && (
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{selectedPin.data.name}</h3>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">
                          {selectedPin.data.license_type || '직종 미입력'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <p>💰 희망 시급: {selectedPin.data.desired_hourly_rate ? `${Number(selectedPin.data.desired_hourly_rate).toLocaleString()}원` : '-'}</p>
                        <p>📍 희망 반경: {selectedPin.data.work_radius}km 이내</p>
                      </div>
                      <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded mb-3 max-h-24 overflow-y-auto">
                        {selectedPin.data.experience || '자기소개가 없습니다.'}
                      </p>
                      <a href={`tel:${selectedPin.data.phone}`} className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-lg font-bold text-sm">📞 전화로 제안하기</a>
                      
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>

        {/* 컨트롤 패널 */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-3 pointer-events-none">
          {userRole === 'hospital' && (
            <div className="bg-white/95 backdrop-blur shadow-lg rounded-xl p-4 border border-blue-100 flex justify-between items-center pointer-events-auto">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><MapPin className="text-blue-600" size={20} /> 인재 찾기</h2>
                <p className="text-xs text-gray-500">보라색 핀을 눌러 이력서를 확인하세요.</p>
              </div>
              <button onClick={() => navigate('/hospital/post')} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md flex items-center gap-2 text-sm">
                <Plus size={18} /> 공고 등록
              </button>
            </div>
          )}

          {userRole === 'worker' && (
            <div className="flex flex-col gap-2 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur shadow-lg rounded-xl p-4 border border-purple-100 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isExposed ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <Search className={isExposed ? 'text-purple-600' : 'text-gray-400'} size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">내 이력서 공개</h2>
                      <p className="text-xs text-gray-500">{isExposed ? "병원에서 내 핀이 보입니다" : "현재 비공개입니다"}</p>
                    </div>
                  </div>
                  <button onClick={toggleExposure} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isExposed ? 'bg-purple-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${isExposed ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <button onClick={() => navigate('/worker/profile')} className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Edit size={16} /> 내 정보 수정하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}