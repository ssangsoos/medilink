import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Phone, Building2, Trash2, Shield } from 'lucide-react'; 
import { useDaumPostcodePopup } from 'react-daum-postcode';

export default function EditHospital() {
  const navigate = useNavigate();
  const open = useDaumPostcodePopup();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [hospitalName, setHospitalName] = useState('');
  const [hospitalType, setHospitalType] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
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

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setHospitalName(data.hospital_name || '');
        setHospitalType(data.hospital_type || '');
        setBusinessNumber(data.business_number || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setDetailAddress(data.detail_address || '');
        setSeekingPositions(data.seeking_positions || []);
        setOfferedHourlyRate(data.offered_hourly_rate ? String(data.offered_hourly_rate) : '');
        setEmploymentType(data.employment_type || '');
      }
      setInitialLoading(false);
    };
    fetchProfile();
  }, []);

  const handleAddressComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }
    setAddress(fullAddress);
  };

  const handleSearchAddress = () => {
    open({ onComplete: handleAddressComplete });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      let updates: any = {
        name: hospitalName,
        hospital_name: hospitalName,
        hospital_type: hospitalType,
        business_number: businessNumber,
        phone,
        address,
        detail_address: detailAddress,
        seeking_positions: seekingPositions,
        offered_hourly_rate: offeredHourlyRate ? Number(offeredHourlyRate) : null,
        employment_type: employmentType || null
      };

      if (address) {
        const coords = await getCoordinates(address);
        if (coords) {
          updates.latitude = coords.lat;
          updates.longitude = coords.lng;
        }
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;

      alert('병원 정보가 수정되었습니다!');
      navigate('/dashboard');

    } catch (error: any) {
      alert('저장 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ★ 수정된 회원 탈퇴 함수 (가장 안전한 방식)
  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 탈퇴하시겠습니까?\n\n• 병원 정보 및 채용공고는 즉시 삭제됩니다.\n• 단, 관계 법령에 따라 아래 정보는 일정 기간 보관됩니다.\n  - 계약/청약철회 기록: 5년\n  - 소비자 불만/분쟁 처리 기록: 3년\n  - 접속 로그: 3개월')) return;

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          alert("로그인 정보가 없습니다.");
          return;
      }

      // 1. 프로필 데이터 삭제 (지도에서 사라짐)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;

      // 2. 로그아웃 처리
      await supabase.auth.signOut();

      alert('탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
      navigate('/');
      
    } catch (error: any) {
      console.error(error);
      alert('탈퇴 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="p-8 text-center">정보 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h2 className="text-2xl font-bold">병원 정보 수정</h2>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                <Building2 size={16} /> 병원명
              </label>
              <input type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">병원 분류</label>
              <select value={hospitalType} onChange={(e) => setHospitalType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">선택해주세요</option>
                <option value="animal">동물병원</option>
                <option value="pharmacy">약국</option>
                <option value="nursing">요양병원</option>
                <option value="medical">일반 의과 병의원</option>
                <option value="dental">치과 병의원</option>
                <option value="oriental">한방 병의원</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">사업자 번호</label>
              <input type="text" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">병원 주소 (이전 시 수정)</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black" placeholder="주소 검색" />
                <button type="button" onClick={handleSearchAddress} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> 검색
                </button>
              </div>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="상세 주소" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><Phone size={16}/> 연락처</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
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
                  <input type="number" value={offeredHourlyRate} onChange={(e) => setOfferedHourlyRate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-right pr-8" placeholder="예: 15000" />
                  <span className="absolute right-4 text-gray-500 font-bold">원</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">고용 형태 (선택)</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택</option>
                  <option value="정규직">정규직</option>
                  <option value="아르바이트">아르바이트</option>
                  <option value="계약직">계약직</option>
                </select>
              </div>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg mt-6">
            {loading ? '저장 중...' : '병원 정보 수정 완료'}
          </button>
          
          <button type="button" onClick={() => navigate('/dashboard')} className="w-full text-gray-500 py-2 flex items-center justify-center gap-1 hover:text-gray-900">
            <ArrowLeft size={16} /> 취소하고 돌아가기
          </button>
        </form>

        {/* 개인정보 권리 안내 */}
        <div className="bg-blue-50 p-6 border-t border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">개인정보 권리 안내</h3>
          </div>
          <ul className="text-xs text-blue-800 space-y-1 mb-3">
            <li>• 위 양식에서 병원 정보를 직접 열람·수정할 수 있습니다.</li>
            <li>• 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.</li>
            <li>• 추가 문의: ssangsoos@gmail.com / 032-473-2222</li>
          </ul>
          <Link to="/privacy" className="text-xs text-blue-600 underline hover:text-blue-800">
            개인정보처리방침 보기
          </Link>
        </div>

        {/* 회원 탈퇴 구역 */}
        <div className="bg-red-50 p-6 text-center border-t border-red-100">
            <p className="text-xs text-red-600 mb-3 font-medium">서비스 이용을 중단하시겠습니까?</p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="text-red-500 text-sm font-bold flex items-center justify-center gap-2 hover:text-red-700 mx-auto px-4 py-2 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} /> 병원 회원 탈퇴하기
            </button>
        </div>
      </div>
    </div>
  );
}