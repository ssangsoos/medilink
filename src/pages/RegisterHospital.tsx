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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [location, setLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [isMapVisible, setIsMapVisible] = useState(false);

  const [agreePrivacy, setAgreePrivacy] = useState(false);

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

    if (!agreePrivacy) {
      alert("개인정보 수집 및 이용에 동의해주세요.");
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
            latitude: location.lat,
            longitude: location.lng,
            is_exposed: true 
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
          <form className="p-8 space-y-6" onSubmit={handleRegister}>
            
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
                    <option value="dental">치과 병의원</option>
                    <option value="medical">일반 의과 병의원</option>
                    <option value="oriental">한방 병의원</option>
                    <option value="nursing">요양병원</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">사업자 등록번호</label>
                <input type="text" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" placeholder="000-00-00000" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">아이디 (이메일)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none" placeholder="hospital@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">비밀번호</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none" placeholder="••••••••" />
              </div>
            </div>

            <PrivacyConsent checked={agreePrivacy} onChange={setAgreePrivacy} />

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