import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { LogOut, Search, MessageCircle, Edit, Filter, X, Lock, MapPin, Briefcase, Calendar, Infinity as InfinityIcon } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { MEDICAL_LICENSE_TYPES, HOSPITAL_TYPES } from '../lib/medicalConstants';
import type { JobPosting } from '../types/jobPosting';
import { formatHourlyRate, formatSchedule, formatJobCategory } from '../lib/jobPostingDisplay';
import { haversineKm, formatDistance } from '../lib/distance';
import { safeHttpUrl, safeTelDigits } from '../lib/sanitize';
import {
  formatAvailableFrom,
  formatFromOptions,
  WORK_PATTERN_OPTIONS,
  AVAILABLE_DAYS_OPTIONS,
  AVAILABLE_TIMES_OPTIONS,
} from '../lib/profileFields';

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 37.5665, lng: 126.9780 };

const WORKER_TYPES = MEDICAL_LICENSE_TYPES;

// 출퇴근 가능 거리 밖 인재 마커 — 보라색 핀 (회색 대비 가독성 개선)
const OUT_OF_RANGE_MARKER_ICON =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="27" height="43" viewBox="0 0 27 43">' +
      '<path d="M13.5 0C6.04 0 0 6.04 0 13.5c0 9.45 13.5 29.5 13.5 29.5S27 22.95 27 13.5C27 6.04 20.96 0 13.5 0z" fill="#A855F7" stroke="#7E22CE" stroke-width="1.5"/>' +
      '<circle cx="13.5" cy="13.5" r="5" fill="#ffffff"/>' +
    '</svg>'
  );

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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [isExposed, setIsExposed] = useState(false);
  const [myLocation, setMyLocation] = useState(defaultCenter);

  const [items, setItems] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [jobsByHospital, setJobsByHospital] = useState<Map<string, JobPosting[]>>(new Map());
  // selfLocation: 거리 계산 기준이 되는 "내 위치" (myLocation은 지도 중심이라 변동됨)
  const [selfLocation, setSelfLocation] = useState<{ lat: number; lng: number } | null>(null);

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
          setSelfLocation({ lat: profile.latitude, lng: profile.longitude });
        }
      }

      if (profile?.role === 'hospital') {
        // 개인정보 보호: 원본 profiles가 아니라 안전 가공 뷰(public_profiles)에서 조회한다.
        // 뷰가 이미 is_exposed=true 의료인만 노출하고, 전화·좌표를 서버에서 마스킹/흐림 처리한다.
        const { data: workers } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('role', 'worker');
        setItems(workers || []);
      } else {
        const { data: hospitals } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('role', 'hospital');
        setItems(hospitals || []);

        // 의료인이 병원별 공고를 볼 수 있도록 active + 미만료 공고 fetch 후 그룹화
        // - 항시 구인(work_end_date IS NULL)이거나
        // - 근무 종료일이 오늘 이후인 공고만 노출
        const today = new Date().toISOString().slice(0, 10);
        const { data: jobs } = await supabase
          .from('job_postings')
          .select('*')
          .eq('status', 'active')
          .or(`work_end_date.is.null,work_end_date.gte.${today}`);
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
      alert(t('dashboard.statusChangeFailed'));
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
    const message = t('dashboard.smsMessage');
    return `sms:${safeTelDigits(phone)}?body=${encodeURIComponent(message)}`;
  };

  // 병원이 "이 공고만 다른 번호 사용"으로 등록한 경우, 대표 표시·메인 문자 버튼도
  // 등록 번호가 아닌 공고 전용 번호를 쓰도록 보정한다.
  // 공고들의 전용 번호가 하나로 통일돼 있으면 그 번호를, 그렇지 않으면(여러 번호가
  // 섞여 있거나 전용 번호가 없으면) 병원 등록 번호로 폴백한다. 공고별 버튼은 각자
  // 자기 번호를 그대로 쓰므로 여러 번호가 섞인 경우에도 손실이 없다.
  const getEffectiveMobile = (pin: any): string => {
    const fallback = pin?.mobile_phone ?? '';
    const jobs = jobsByHospital.get(pin?.id) ?? [];
    if (jobs.length === 0) return fallback;
    // 모든 공고가 동일한 전용 번호 하나로 통일된 경우에만 대표 번호를 덮어쓴다.
    // 전용/등록 번호가 섞여 있으면 등록 번호로 폴백 (공고별 버튼이 각자 처리).
    const allCustom = jobs.every((j) => !!j.contact_phone);
    const distinct = Array.from(new Set(jobs.map((j) => j.contact_phone)));
    if (allCustom && distinct.length === 1 && distinct[0]) return distinct[0];
    return fallback;
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

  // 좌표 흐림은 서버(public_profiles 뷰)에서 처리된다.
  // 의료인은 이미 흐린 좌표, 병원은 정확 좌표가 내려오므로 여기서는 그대로 사용한다.
  const getDisplayPosition = (item: any): { lat: number; lng: number } => {
    if (!item?.latitude || !item?.longitude) return { lat: 0, lng: 0 };
    return { lat: item.latitude, lng: item.longitude };
  };

  // 병원이 의료인을 봤을 때 거리(km). 그 외엔 null
  const getDistanceKm = (item: any): number | null => {
    if (!selfLocation) return null;
    if (userRole !== 'hospital') return null;
    if (!item?.latitude || !item?.longitude) return null;
    return haversineKm(
      selfLocation.lat,
      selfLocation.lng,
      item.latitude,
      item.longitude,
    );
  };

  const isOutOfRadius = (item: any): boolean => {
    if (userRole !== 'hospital') return false;
    if (!item?.license_type) return false;
    if (item.work_radius == null) return false; // 제한 없음
    const d = getDistanceKm(item);
    if (d == null) return false;
    return d > item.work_radius;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('dashboard.loading')}</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <nav className="bg-white shadow-sm px-4 py-3 md:px-6 md:py-4 flex justify-between items-center z-20 relative">
        <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-gray-800">
            {userRole === 'hospital' ? t('dashboard.findTalent') : t('dashboard.findHospital')}
            </h1>
            
            <button 
                onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${showFilter || selectedFilters.length > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
                <Filter size={16} />
                {t('dashboard.filter')} {selectedFilters.length > 0 && <span className="ml-1 bg-white text-blue-600 rounded-full px-1.5 text-xs">{selectedFilters.length}</span>}
            </button>
        </div>

        <div className="flex gap-2 items-center">
          <LanguageSwitcher className="hidden md:inline-flex mr-1" />
          {userRole === 'hospital' ? (
            <>
              <button onClick={() => navigate('/hospital/jobs')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-colors text-sm md:text-base shadow-sm">
                <Briefcase size={16} /> <span className="hidden md:inline">{t('dashboard.myJobs')}</span>
              </button>
              <button onClick={() => navigate('/hospital/edit')} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold transition-colors text-sm md:text-base">
                <Edit size={16} /> <span className="hidden md:inline">{t('dashboard.editInfo')}</span>
              </button>
            </>
          ) : (
             <button onClick={() => navigate('/worker/profile')} className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 font-bold transition-colors text-sm md:text-base">
               <Edit size={16} /> <span className="hidden md:inline">{t('dashboard.editInfo')}</span>
             </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-red-500 transition-colors font-medium text-sm md:text-base">
            <LogOut size={16} /> <span className="hidden md:inline">{t('dashboard.logout')}</span>
          </button>
        </div>
      </nav>

      {showFilter && (
          <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm z-10 animate-fade-in-down">
              <div className="max-w-4xl mx-auto">
                  <div className="flex flex-wrap gap-2 mb-2">
                      <div className="text-sm font-bold text-gray-500 flex items-center mr-2 pt-1">
                          {userRole === 'hospital' ? t('dashboard.selectJobType') : t('dashboard.selectHospitalType')}
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
                              <X size={12}/> {t('dashboard.reset')}
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
              <span className={userRole === 'hospital' ? 'text-blue-600' : 'text-purple-600'}>{userName}</span>{t('dashboard.aroundNameSuffix')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
               {t('dashboard.resultCount', { n: filteredItems.length })}
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
                      <h2 className="text-sm font-bold text-gray-900">{t('dashboard.myResumeExposure')}</h2>
                      <p className="text-xs text-gray-500">{isExposed ? t('dashboard.exposed') : t('dashboard.hidden')}</p>
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
                  <Edit size={14} /> {t('dashboard.editResume')}
                </button>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-4">
             {filteredItems.map(item => (
               <div
                 key={item.id}
                 onClick={() => {
                   setSelectedPin(item);
                   const pos = getDisplayPosition(item);
                   setMyLocation({ lat: pos.lat, lng: pos.lng });
                 }}
                 className="p-4 bg-gray-50 hover:bg-blue-50 rounded-xl mb-3 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
               >
                 <div className="flex justify-between items-start">
                    <div className="font-bold text-gray-800">{item.name || item.hospital_name}</div>
                    <div className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">
                        {userRole === 'hospital' ? item.license_type :
                            (HOSPITAL_TYPES.find(ht => ht.value === item.hospital_type)?.label || t('dashboard.etc'))}
                    </div>
                 </div>
                 {/* ★ 목록에도 주소 필터 적용 (getDisplayAddress 사용) */}
                 <div className="text-sm text-gray-500 truncate mt-1">
                    {getDisplayAddress(item)}
                 </div>
                 {userRole === 'worker' && (jobsByHospital.get(item.id)?.length ?? 0) > 0 && (
                   <div className="mt-2 inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                     <Briefcase size={11} />
                     {t('dashboard.jobCountBadge', { n: jobsByHospital.get(item.id)!.length })}
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
                     {t('dashboard.noResults')}
                 </div>
             )}
          </div>
        </div>

        {/* 구글 지도 영역 */}
        <div className="flex-1 relative">
          {/* 마커 색상 안내 배너 (병원 화면에서만) */}
          {userRole === 'hospital' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-max max-w-[92%] pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm shadow-md border border-gray-100 rounded-xl px-4 py-2">
                <div className="flex items-center justify-center gap-2.5 text-xs text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block shrink-0"></span>
                    {t('dashboard.withinRange')}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500 inline-block shrink-0"></span>
                    {t('dashboard.outOfRangeShort')}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-0.5">
                  {t('dashboard.rangeLegend')}
                </p>
              </div>
            </div>
          )}
          <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={myLocation}
              zoom={14}
              options={{ disableDefaultUI: false, zoomControl: true }}
            >
              <Marker 
                position={myLocation} 
                label={t('dashboard.me')}
                icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }}
              />

              {filteredItems.map((item) => {
                const pos = getDisplayPosition(item);
                const outOfRange = isOutOfRadius(item);
                return (
                  <Marker
                    key={item.id}
                    position={pos}
                    icon={outOfRange ? { url: OUT_OF_RANGE_MARKER_ICON } : undefined}
                    onClick={() => setSelectedPin(item)}
                  />
                );
              })}

              {selectedPin && (
                <InfoWindow
                  position={getDisplayPosition(selectedPin)}
                  onCloseClick={() => setSelectedPin(null)}
                >
                  <div className="p-3 min-w-[240px] max-w-[320px]">
                    <h3 className="font-bold text-lg text-gray-900">{selectedPin.name || selectedPin.hospital_name}</h3>

                    {(() => {
                      const distKm = getDistanceKm(selectedPin);
                      const outOfRange = isOutOfRadius(selectedPin);
                      if (outOfRange && distKm != null) {
                        return (
                          <div className="mt-2 mb-2 bg-amber-50 border-l-4 border-amber-400 px-2 py-1.5 text-xs text-amber-900 rounded-r">
                            {t('dashboard.outOfRangeWarning', { radius: selectedPin.work_radius, distance: formatDistance(distKm) })}
                          </div>
                        );
                      }
                      if (userRole === 'hospital' && selectedPin.license_type && distKm != null) {
                        return (
                          <div className="text-xs text-gray-500 mb-1">
                            {t('dashboard.approxDistance', { distance: formatDistance(distKm) })}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 전화번호 마스킹 */}
                    <div className="flex items-center gap-1 text-gray-800 font-bold text-lg mb-1">
                        📞 {maskPhoneNumber(selectedPin.phone)}
                    </div>
                    {getEffectiveMobile(selectedPin) && (
                      <div className="flex items-center gap-1 text-gray-700 text-sm mb-1">
                          📱 {maskPhoneNumber(getEffectiveMobile(selectedPin))}
                          <span className="text-xs text-blue-600 font-bold ml-1">{t('dashboard.smsReceive')}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                        <Lock size={10} /> {t('dashboard.numberMasked')}
                    </div>

                    {/* ★ 팝업 주소 필터 적용 (getDisplayAddress 사용) */}
                    <div className="flex items-start gap-1 text-sm text-gray-600 mb-3 border-b pb-2">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span>{getDisplayAddress(selectedPin)}</span>
                    </div>

                    {userRole === 'hospital' ? (
                        <>
                            {selectedPin.bio && (
                                <div className="mb-2 px-3 py-2 bg-purple-50 border-l-4 border-purple-400 text-sm text-purple-900 italic rounded-r">
                                    "{selectedPin.bio}"
                                </div>
                            )}
                            <div className="space-y-1 mb-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                <div><span className="font-bold text-gray-900">{t('dashboard.license')}:</span> {selectedPin.license_type}</div>
                                <div className="whitespace-pre-line"><span className="font-bold text-gray-900">{t('dashboard.experience')}:</span> {selectedPin.experience}</div>
                                <div><span className="font-bold text-gray-900">{t('dashboard.desiredWage')}:</span> {Number(selectedPin.desired_hourly_rate).toLocaleString()}{t('dashboard.wonSuffix')}</div>
                                {selectedPin.available_from && (
                                    <div><span className="font-bold text-gray-900">{t('dashboard.availableFromLabel')}:</span> {formatAvailableFrom(selectedPin.available_from)}</div>
                                )}
                            </div>
                            {(selectedPin.work_pattern?.length || selectedPin.available_days?.length || selectedPin.available_times?.length) ? (
                                <div className="space-y-1 mb-4 text-xs text-gray-700 bg-purple-50/60 border border-purple-100 p-2 rounded">
                                    {selectedPin.work_pattern?.length > 0 && (
                                        <div><span className="font-bold text-purple-900">{t('dashboard.workPattern')}:</span> {formatFromOptions(selectedPin.work_pattern, WORK_PATTERN_OPTIONS)}</div>
                                    )}
                                    {selectedPin.available_days?.length > 0 && (
                                        <div><span className="font-bold text-purple-900">{t('dashboard.availableDaysLabel')}:</span> {formatFromOptions(selectedPin.available_days, AVAILABLE_DAYS_OPTIONS)}</div>
                                    )}
                                    {selectedPin.available_times?.length > 0 && (
                                        <div><span className="font-bold text-purple-900">{t('dashboard.availableTimesLabel')}:</span> {formatFromOptions(selectedPin.available_times, AVAILABLE_TIMES_OPTIONS)}</div>
                                    )}
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-3">
                                <span className="font-bold text-gray-900">{t('dashboard.category')}:</span> {HOSPITAL_TYPES.find(ht => ht.value === selectedPin.hospital_type)?.label || t('dashboard.etc')}
                            </div>

                            {/* 병원이 올린 공고 목록 */}
                            <div className="mb-3">
                                <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                    <Briefcase size={12} />
                                    {t('dashboard.registeredJobs')}
                                    {(jobsByHospital.get(selectedPin.id)?.length ?? 0) > 0 && (
                                        <span>{t('dashboard.jobCountParen', { n: jobsByHospital.get(selectedPin.id)!.length })}</span>
                                    )}
                                </div>
                                {(jobsByHospital.get(selectedPin.id)?.length ?? 0) === 0 ? (
                                    <>
                                        <div className="text-xs text-gray-400 py-2">{t('dashboard.noJobs')}</div>
                                        {(selectedPin.seeking_positions?.length > 0 || selectedPin.offered_hourly_rate || selectedPin.employment_type) && (
                                            <div className="space-y-1 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                                <div className="font-bold text-gray-700 text-[10px] mb-1">{t('dashboard.defaultConditions')}</div>
                                                {selectedPin.seeking_positions?.length > 0 && (
                                                    <div><span className="font-bold">{t('dashboard.seeking')}:</span> {selectedPin.seeking_positions.join(', ')}</div>
                                                )}
                                                {selectedPin.offered_hourly_rate && (
                                                    <div><span className="font-bold">{t('dashboard.offeredWage')}:</span> {Number(selectedPin.offered_hourly_rate).toLocaleString()}{t('dashboard.wonSuffix')}</div>
                                                )}
                                                {selectedPin.employment_type && (
                                                    <div><span className="font-bold">{t('dashboard.employmentTypeLabel')}:</span> {selectedPin.employment_type}</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                        {jobsByHospital.get(selectedPin.id)!.map((job) => {
                                            const jobSmsPhone = job.contact_phone || selectedPin.mobile_phone || '';
                                            return (
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
                                                <div className="mt-2 grid grid-cols-1 gap-1.5">
                                                    {jobSmsPhone ? (
                                                        <a
                                                            href={getSmsHref(jobSmsPhone)}
                                                            className="block text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <MessageCircle size={12} /> {t('dashboard.sendSms')}
                                                            {job.contact_phone && (
                                                                <span className="text-[10px] font-normal opacity-80">{t('dashboard.jobSpecific')}</span>
                                                            )}
                                                        </a>
                                                    ) : (
                                                        <div className="block text-center bg-gray-100 text-gray-400 text-xs font-bold py-1.5 rounded border border-gray-200">
                                                            {t('dashboard.noSmsNumber')}
                                                        </div>
                                                    )}
                                                    {(() => {
                                                        // 위험 스킴(javascript: 등)·잘못된 링크는 렌더하지 않음 (기존 데이터까지 방어)
                                                        const safeKakao = safeHttpUrl(job.kakao_link);
                                                        return safeKakao ? (
                                                            <a
                                                                href={safeKakao}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="block text-center bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-bold py-1.5 rounded transition-colors"
                                                            >
                                                                {t('dashboard.kakaoInquiry')}
                                                            </a>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {userRole === 'worker' && !getEffectiveMobile(selectedPin) ? (
                      <div className="block w-full py-3 px-4 rounded-xl bg-gray-100 text-gray-400 font-bold text-center flex items-center justify-center gap-2 border border-gray-200">
                        <MessageCircle size={18} />
                        {t('dashboard.noSmsNumber')}
                      </div>
                    ) : (
                      <a
                        href={getSmsHref(userRole === 'worker' ? getEffectiveMobile(selectedPin) : selectedPin.phone)}
                        className={`block w-full py-3 px-4 rounded-xl text-white font-bold text-center flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md ${userRole === 'hospital' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        <MessageCircle size={18} />
                        {t('dashboard.sendSms')}
                      </a>
                    )}

                    <p className="text-xs text-gray-400 text-center mt-2">
                      {userRole === 'worker' && !getEffectiveMobile(selectedPin)
                        ? t('dashboard.noSmsHelpKakao')
                        : t('dashboard.smsMobileHelp')}
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
                 {isExposed ? t('dashboard.seekingExposed') : t('dashboard.seekingHidden')}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}