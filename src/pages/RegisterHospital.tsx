import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// MapPin 제거됨 (에러 수정 버전)
import { Building2, ArrowLeft, Search, Edit } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import PrivacyConsent from '../components/PrivacyConsent'; 

const libraries: ("places")[] = ["places"];
const koreaBounds = { north: 38.63, south: 33.00, east: 132.00, west: 124.00 };
const mapContainerStyle = { width: '100%', height: '240px', borderRadius: '12px', marginTop: '16px' };

export default function RegisterHospital() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const [isManualMode, setIsManualMode] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [address, setAddress] = useState('');
  const [hospitalType, setHospitalType] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [location, setLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [isMapVisible, setIsMapVisible] = useState(false);

  const [agreeAll, setAgreeAll] = useState(false);
  const [seekingPositions, setSeekingPositions] = useState<string[]>([]);
  const [offeredHourlyRate, setOfferedHourlyRate] = useState('');
  const [employmentType, setEmploymentType] = useState('');

  const POSITION_OPTIONS = [
    "간호사", "간호조무사", "물리치료사", "방사선사", "보건교육사",
    "수의사", "안경사", "약사", "언어재활사", "영양사",
    "위생사", "의무기록사", "의사", "의지보조기기사", "임상병리사",
    "작업치료사", "조산사", "치과기공사", "치과위생사", "치과의사",
    "코디네이터", "한약사", "한의사", "응급구조사(1급)", "응급구조사(2급)"
  ];

  const togglePosition = (pos: string) => {
    setSeekingPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return; 
      
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      setLocation({ lat, lng });
      setHospitalName(place.name || '');
      setAddress(place.formatted_address || '');
      if (place.formatted_phone_number) setPhone(place.formatted_phone_number);
      
      setIsMapVisible(true);
      setIsManualMode(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault(); 
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeAll) {
      alert("필수 약관에 모두 동의해주세요.");
      return;
    }

    if (!email || !password || !hospitalName || !address) {
      alert("병원 정보를 모두 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("회원가입 실패");

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: email,
            role: 'hospital',
            name: hospitalName,
            hospital_name: hospitalName,
            hospital_type: hospitalType,
            business_number: businessNumber,
            address: address,
            detail_address: detailAddress,
            phone: phone,
            mobile_phone: mobilePhone || null,
            latitude: location.lat,
            longitude: location.lng,
            is_exposed: true,
            seeking_positions: seekingPositions,
            offered_hourly_rate: offeredHourlyRate ? Number(offeredHourlyRate) : null,
            employment_type: employmentType || null
          }
        ]);

      if (profileError) throw profileError;
      alert("가입이 완료되었습니다! 로그인 페이지로 이동합니다.");
      navigate('/login');

    } catch (error: any) {
      console.error(error);
      alert("오류: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleManualMode = () => {
    setIsManualMode(!isManualMode);
    if (!isManualMode) {
        setIsMapVisible(false);
        setAddress('');
        setHospitalName('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="mx-auto h-14 w-14 bg-white/20 flex items-center justify-center rounded-full mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">병원 회원가입</h2>
          <p className="text-blue-100 mt-2">지도를 통해 정확한 위치를 등록하세요</p>
        </div>

        <LoadScript 
            googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""} 
            libraries={libraries}
            language="ko" 
            region="KR"
        >
          <form className="p-8 space-y-6" onSubmit={handleRegister} autoComplete="off">
            {/* Chrome 자동완성 흡수용 더미 필드 */}
            <input type="text" name="fake_email" style={{ display: 'none' }} tabIndex={-1} />
            <input type="password" name="fake_pw" style={{ display: 'none' }} tabIndex={-1} />

            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-blue-900 flex items-center gap-1">
                  {isManualMode ? <Edit size={16}/> : <Search size={16}/>} 
                  {isManualMode ? "직접 입력 모드" : "병원 검색 (구글 맵)"}
                </label>
                <button type="button" onClick={toggleManualMode} className="text-xs text-blue-600 underline">
                    {isManualMode ? "다시 검색하기" : "검색이 안 되나요?"}
                </button>
              </div>
              
              {!isManualMode ? (
                  <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} options={{ bounds: koreaBounds, componentRestrictions: { country: "kr" }, fields: ["geometry", "name", "formatted_address", "formatted_phone_number"] }}>
                    {/* ★ 수정 포인트: placeholder "예: 스마일업의원"으로 변경 */}
                    <input type="text" placeholder="예: 스마일업의원" onKeyDown={handleKeyDown} className="w-full px-4 py-4 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold shadow-sm" />
                  </Autocomplete>
              ) : (
                  <div className="text-sm text-gray-600 p-2 bg-white/50 rounded">병원을 찾을 수 없다면 직접 입력해주세요.</div>
              )}

              {isMapVisible && !isManualMode && (
                <div className="relative mt-4">
                  <GoogleMap mapContainerStyle={mapContainerStyle} center={location} zoom={18} options={{ disableDefaultUI: true }}>
                    <Marker position={location} />
                  </GoogleMap>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">병원명</label>
                <input type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} readOnly={!isManualMode} className={`w-full px-4 py-3 border border-gray-300 rounded-xl font-bold ${!isManualMode ? 'bg-gray-100' : 'bg-white'}`} placeholder="자동 입력됨" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">주소</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} readOnly={!isManualMode} className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${!isManualMode ? 'bg-gray-100' : 'bg-white'}`} placeholder="자동 입력됨" />
              </div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="상세 주소 (예: 3층)" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">연락처</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="02-000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">병원 분류</label>
                  <select value={hospitalType} onChange={(e) => setHospitalType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white">
                    <option value="">선택</option>
                    <option value="animal">동물병원</option>
                    <option value="pharmacy">약국</option>
                    <option value="nursing">요양병원</option>
                    <option value="medical">일반 의과 병의원</option>
                    <option value="dental">치과 병의원</option>
                    <option value="oriental">한방 병의원</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">휴대폰 번호 <span className="text-xs text-gray-500 font-normal">(선택, 문자 수신용)</span></label>
                <input type="tel" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="010-0000-0000" />
                <p className="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded">
                  💡 휴대폰을 입력하면 의료인이 <b>바로 문자</b>로 연락할 수 있어 매칭이 빠릅니다. 국선(02/032 등)만 쓰시는 경우 비워두셔도 됩니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">사업자 등록번호</label>
                <input type="text" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="000-00-00000" />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 구인 정보 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">구하는 인력 (복수 선택 가능)</label>
                <div className="flex flex-wrap gap-2">
                  {POSITION_OPTIONS.map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        seekingPositions.includes(pos)
                          ? 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">제시 시급 (선택)</label>
                  <div className="relative flex items-center">
                    <input type="number" value={offeredHourlyRate} onChange={(e) => setOfferedHourlyRate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-right pr-8" placeholder="예: 15000" />
                    <span className="absolute right-4 text-gray-500 font-bold">원</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">고용 형태 (선택)</label>
                  <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white">
                    <option value="">선택</option>
                    <option value="정규직">정규직</option>
                    <option value="아르바이트">아르바이트</option>
                    <option value="계약직">계약직</option>
                  </select>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">아이디 (이메일)</label>
                <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" name="register-hospital-email" className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none" placeholder="hospital@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">비밀번호</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" name="register-hospital-pw" className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none" placeholder="••••••••" />
              </div>
            </div>

            <PrivacyConsent onValidChange={setAgreeAll} />

            <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-shadow shadow-lg disabled:bg-gray-400 mt-4">
              {loading ? '가입 처리 중...' : '병원 가입 완료하기'}
            </button>
            
            <div className="text-center pt-2">
              <Link to="/" className="text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1">
                <ArrowLeft size={16} /> 첫 화면으로 돌아가기
              </Link>
            </div>
          </form>
        </LoadScript>
      </div>
    </div>
  );
}