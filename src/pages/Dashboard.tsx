import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, Search, MessageCircle, Edit, Filter, X, Lock, MapPin, Briefcase, Calendar, Infinity as InfinityIcon } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { MEDICAL_LICENSE_TYPES, HOSPITAL_TYPES } from '../lib/medicalConstants';
import type { JobPosting } from '../types/jobPosting';
import { formatHourlyRate, formatSchedule, formatJobCategory } from '../lib/jobPostingDisplay';

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 37.5665, lng: 126.9780 };

const WORKER_TYPES = MEDICAL_LICENSE_TYPES;

// ★ 1. 전화번호 마스킹 (010-****-5678)
const maskPhoneNumber = (phone: string) => {
  if (!phone) return "";
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 10) return phone; 
  return clean.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-****-$3');
};

// ★ 2. 주소 마스킹 (개인 보호용 - 상세주소 자르기)
const maskAddress = (address: string) => {
  if (!address) return "";
  
  // (1) 괄호 안 내용 제거 (예: 온수동, 힐스테이트...)
  const baseAddress = address.split('(')[0].trim();
  
  // (2) 공백으로 잘라서 분석
  const parts = baseAddress.split(' ');
  let result = "";
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // 숫자로 시작하는 덩어리 발견 (예: 127, 26, 103동)
    const isNumberStart = /^\d/.test(part);
    // 하지만 '길', '로', '가'로 끝나면 도로명이므로 살려둠 (예: 20가길, 3공단로)
    const isRoadName = part.endsWith('길') || part.endsWith('로') || part.endsWith('가');

    // 숫자로 시작하는데 도로명이 아니면 -> 번지수/동호수 시작됨 -> 여기서 멈춤!
    if (i > 1 && isNumberStart && !isRoadName) {
      break; 
    }
    result += part + " ";
  }
  return result.trim();
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [isExposed, setIsExposed] = useState(false);
  const [myLocation, setMyLocation] = useState(defaultCenter);

  const [items, setItems] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [jobsByHospital, setJobsByHospital] = useState<Map<string, JobPosting[]>>(new Map());

  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

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
        setUserName(profile.name);
        setIsExposed(profile.is_exposed || false);

        if (profile.latitude && profile.longitude) {
          setMyLocation({ lat: profile.latitude, lng: profile.longitude });
        }
      }

      if (profile?.role === 'hospital') {
        const { data: workers } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'worker')
          .eq('is_exposed', true);
        setItems(workers || []);
      } else {
        const { data: hospitals } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'hospital');
        setItems(hospitals || []);

        // 의료인이 병원별 공고를 볼 수 있도록 active 공고 전체 fetch 후 그룹화
        const { data: jobs } = await supabase
          .from('job_postings')
          .select('*')
          .eq('status', 'active');
        const grouped = new Map<string, JobPosting[]>();
        (jobs ?? []).forEach((job: JobPosting) => {
          const list = grouped.get(job.hospital_id) ?? [];
          list.push(job);
          grouped.set(job.hospital_id, list);
        });
        setJobsByHospital(grouped);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleExposure = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newValue = !isExposed;
      setIsExposed(newValue);

      const { error } = await supabase
        .from('profiles')
        .update({ is_exposed: newValue })
        .eq('id', user.id);

      if (error) throw error;
      
    } catch (error) {
      alert('상태 변경 실패');
      setIsExposed(!isExposed);
    }
  };

  const toggleFilter = (value: string) => {
    if (selectedFilters.includes(value)) {
      setSelectedFilters(selectedFilters.filter(item => item !== value));
    } else {
      setSelectedFilters([...selectedFilters, value]);
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedFilters.length === 0) return true; 

    if (userRole === 'hospital') {
      return selectedFilters.includes(item.license_type);
    } else {
      return selectedFilters.includes(item.hospital_type);
    }
  });

  const getSmsHref = (phone: string) => {
    const message = "안녕하세요, 메디노티를 보고 연락드립니다.";
    return `sms:${phone}?body=${encodeURIComponent(message)}`;
  };

  // ★ 3. 화면 표시용 주소 결정 함수 (가장 중요!)
  const getDisplayAddress = (item: any) => {
    // 1) 아이템이 'license_type'을 가지고 있다? -> 의료인(개인)입니다.
    // -> 주소를 가립니다 (maskAddress 사용)
    if (item.license_type) {
        return maskAddress(item.address);
    }
    
    // 2) 그 외 (병원) -> 주소를 있는 그대로 다 보여줍니다.
    return item.address;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <nav className="bg-white shadow-sm px-4 py-3 md:px-6 md:py-4 flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-gray-800">
            {userRole === 'hospital' ? '인재 찾기' : '병원 찾기'}
            </h1>
            
            <button 
                onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${showFilter || selectedFilters.length > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
                <Filter size={16} />
                필터 {selectedFilters.length > 0 && <span className="ml-1 bg-white text-blue-600 rounded-full px-1.5 text-xs">{selectedFilters.length}</span>}
            </button>
        </div>

        <div className="flex gap-2">
          {userRole === 'hospital' ? (
            <>
              <button onClick={() => navigate('/hospital/jobs')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors text-sm md:text-base shadow-sm">
                <Briefcase size={16} /> <span className="hidden md:inline">내 공고</span>
              </button>
              <button onClick={() => navigate('/hospital/edit')} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold transition-colors text-sm md:text-base">
                <Edit size={16} /> <span className="hidden md:inline">정보수정</span>
              </button>
            </>
          ) : (
             <button onClick={() => navigate('/worker/profile')} className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 font-bold transition-colors text-sm md:text-base">
               <Edit size={16} /> <span className="hidden md:inline">정보수정</span>
             </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-red-500 transition-colors font-medium text-sm md:text-base">
            <LogOut size={16} /> <span className="hidden md:inline">로그아웃</span>
          </button>
        </div>
      </nav>

      {showFilter && (
          <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm z-10 animate-fade-in-down">
              <div className="max-w-4xl mx-auto">
                  <div className="flex flex-wrap gap-2 mb-2">
                      <div className="text-sm font-bold text-gray-500 flex items-center mr-2 pt-1">
                          보고 싶은 {userRole === 'hospital' ? '직종' : '병원'} 선택:
                      </div>
                      
                      {userRole === 'hospital' ? (
                          WORKER_TYPES.map(type => (
                              <button
                                  key={type}
                                  onClick={() => toggleFilter(type)}
                                  className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${selectedFilters.includes(type) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                              >
                                  {type}
                              </button>
                          ))
                      ) : (
                          HOSPITAL_TYPES.map(type => (
                              <button
                                  key={type.value}
                                  onClick={() => toggleFilter(type.value)}
                                  className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${selectedFilters.includes(type.value) ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                              >
                                  {type.label}
                              </button>
                          ))
                      )}

                      {selectedFilters.length > 0 && (
                          <button onClick={() => setSelectedFilters([])} className="ml-auto text-xs text-gray-400 underline hover:text-gray-600 flex items-center gap-1">
                              <X size={12}/> 초기화
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* 왼쪽 사이드바 */}
        <div className="w-80 bg-white shadow-lg z-10 flex flex-col hidden md:flex">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">
              <span className={userRole === 'hospital' ? 'text-blue-600' : 'text-purple-600'}>{userName}</span>님 주변
            </h2>
            <p className="text-sm text-gray-500 mt-1">
               총 {filteredItems.length}개의 결과가 있습니다.
            </p>
          </div>

          {userRole === 'worker' && (
            <div className="p-6 bg-purple-50 m-4 rounded-2xl border border-purple-100 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isExposed ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <Search className={isExposed ? 'text-purple-600' : 'text-gray-400'} size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">내 이력서 공개</h2>
                      <p className="text-xs text-gray-500">{isExposed ? "공개 중" : "비공개"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleExposure}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isExposed ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${isExposed ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <button onClick={() => navigate('/worker/profile')} className="w-full bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                  <Edit size={14} /> 이력서 내용 수정하기
                </button>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-4">
             {filteredItems.map(item => (
               <div 
                 key={item.id} 
                 onClick={() => {
                   setSelectedPin(item);
                   setMyLocation({ lat: item.latitude, lng: item.longitude });
                 }}
                 className="p-4 bg-gray-50 hover:bg-blue-50 rounded-xl mb-3 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
               >
                 <div className="flex justify-between items-start">
                    <div className="font-bold text-gray-800">{item.name || item.hospital_name}</div>
                    <div className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">
                        {userRole === 'hospital' ? item.license_type : 
                            (HOSPITAL_TYPES.find(t => t.value === item.hospital_type)?.label || '기타')}
                    </div>
                 </div>
                 {/* ★ 목록에도 주소 필터 적용 (getDisplayAddress 사용) */}
                 <div className="text-sm text-gray-500 truncate mt-1">
                    {getDisplayAddress(item)}
                 </div>
                 {userRole === 'worker' && (jobsByHospital.get(item.id)?.length ?? 0) > 0 && (
                   <div className="mt-2 inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                     <Briefcase size={11} />
                     공고 {jobsByHospital.get(item.id)!.length}건
                   </div>
                 )}
                 {userRole === 'worker' && item.seeking_positions?.length > 0 && (
                   <div className="flex flex-wrap gap-1 mt-2">
                     {item.seeking_positions.map((pos: string) => (
                       <span key={pos} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{pos}</span>
                     ))}
                   </div>
                 )}
               </div>
             ))}
             {filteredItems.length === 0 && (
                 <div className="text-center text-gray-400 py-10">
                     조건에 맞는 결과가 없습니다.
                 </div>
             )}
          </div>
        </div>

        {/* 구글 지도 영역 */}
        <div className="flex-1 relative">
          <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={myLocation}
              zoom={14}
              options={{ disableDefaultUI: false, zoomControl: true }}
            >
              <Marker 
                position={myLocation} 
                label="나"
                icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }}
              />

              {filteredItems.map((item) => (
                <Marker
                  key={item.id}
                  position={{ lat: item.latitude, lng: item.longitude }}
                  onClick={() => setSelectedPin(item)}
                />
              ))}

              {selectedPin && (
                <InfoWindow
                  position={{ lat: selectedPin.latitude, lng: selectedPin.longitude }}
                  onCloseClick={() => setSelectedPin(null)}
                >
                  <div className="p-3 min-w-[240px] max-w-[320px]">
                    <h3 className="font-bold text-lg text-gray-900">{selectedPin.name || selectedPin.hospital_name}</h3>

                    {/* 전화번호 마스킹 */}
                    <div className="flex items-center gap-1 text-gray-800 font-bold text-lg mb-1">
                        📞 {maskPhoneNumber(selectedPin.phone)}
                    </div>
                    <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                        <Lock size={10} /> 개인정보 보호를 위해 번호가 가려집니다.
                    </div>

                    {/* ★ 팝업 주소 필터 적용 (getDisplayAddress 사용) */}
                    <div className="flex items-start gap-1 text-sm text-gray-600 mb-3 border-b pb-2">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span>{getDisplayAddress(selectedPin)}</span>
                    </div>

                    {userRole === 'hospital' ? (
                        <div className="space-y-1 mb-4 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            <div><span className="font-bold text-gray-900">면허:</span> {selectedPin.license_type}</div>
                            <div><span className="font-bold text-gray-900">경력:</span> {selectedPin.experience}</div>
                            <div><span className="font-bold text-gray-900">희망시급:</span> {Number(selectedPin.desired_hourly_rate).toLocaleString()}원</div>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-3">
                                <span className="font-bold text-gray-900">분류:</span> {HOSPITAL_TYPES.find(t => t.value === selectedPin.hospital_type)?.label || '기타'}
                            </div>

                            {/* 병원이 올린 공고 목록 */}
                            <div className="mb-3">
                                <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                    <Briefcase size={12} />
                                    등록된 공고
                                    {(jobsByHospital.get(selectedPin.id)?.length ?? 0) > 0 && (
                                        <span>({jobsByHospital.get(selectedPin.id)!.length}건)</span>
                                    )}
                                </div>
                                {(jobsByHospital.get(selectedPin.id)?.length ?? 0) === 0 ? (
                                    <>
                                        <div className="text-xs text-gray-400 py-2">현재 등록된 공고가 없습니다.</div>
                                        {(selectedPin.seeking_positions?.length > 0 || selectedPin.offered_hourly_rate || selectedPin.employment_type) && (
                                            <div className="space-y-1 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                                <div className="font-bold text-gray-700 text-[10px] mb-1">병원 프로필 기본 희망 조건</div>
                                                {selectedPin.seeking_positions?.length > 0 && (
                                                    <div><span className="font-bold">구인:</span> {selectedPin.seeking_positions.join(', ')}</div>
                                                )}
                                                {selectedPin.offered_hourly_rate && (
                                                    <div><span className="font-bold">제시 시급:</span> {Number(selectedPin.offered_hourly_rate).toLocaleString()}원</div>
                                                )}
                                                {selectedPin.employment_type && (
                                                    <div><span className="font-bold">고용 형태:</span> {selectedPin.employment_type}</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {jobsByHospital.get(selectedPin.id)!.map((job) => (
                                            <div key={job.id} className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                                                <div className="font-bold text-sm text-gray-900 mb-1 line-clamp-2">{job.title}</div>
                                                <div className="text-[11px] text-gray-700 space-y-0.5">
                                                    <div className="flex items-center gap-1">
                                                        <Briefcase size={10} className="text-blue-600 shrink-0" />
                                                        <span>{formatJobCategory(job)}</span>
                                                    </div>
                                                    <div className="flex items-start gap-1">
                                                        {job.schedule_type === 'always' ? (
                                                            <InfinityIcon size={10} className="text-blue-600 shrink-0 mt-0.5" />
                                                        ) : (
                                                            <Calendar size={10} className="text-blue-600 shrink-0 mt-0.5" />
                                                        )}
                                                        <span>{formatSchedule(job)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="inline-flex w-[10px] justify-center text-blue-600 font-bold text-[11px]">₩</span>
                                                        <span>{formatHourlyRate(job)}</span>
                                                    </div>
                                                </div>
                                                {job.kakao_link && (
                                                    <a
                                                        href={job.kakao_link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-2 block text-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-bold py-1.5 rounded transition-colors"
                                                    >
                                                        💬 카카오톡 문의
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <a
                      href={getSmsHref(selectedPin.phone)}
                      className={`block w-full py-3 px-4 rounded-xl text-white font-bold text-center flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md ${userRole === 'hospital' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      <MessageCircle size={18} />
                      문자 보내기
                    </a>

                    <p className="text-xs text-gray-400 text-center mt-2">
                        * 모바일 환경에서 문자를 보낼 수 있습니다.
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
          
          {userRole === 'worker' && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 md:hidden">
               <button 
                onClick={toggleExposure}
                className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-xl font-bold text-white transition-all ${isExposed ? 'bg-purple-600' : 'bg-gray-500'}`}
               >
                 <Search size={20} />
                 {isExposed ? '구직 중 (노출 됨)' : '구직 비공개 (노출 안 됨)'}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}