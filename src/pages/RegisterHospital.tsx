import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Search } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode'; // 방금 만든 변환기 가져오기

export default function RegisterHospital() {
  const navigate = useNavigate();
  const open = useDaumPostcodePopup();

  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalType, setHospitalType] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }
    setAddress(fullAddress);
  };

  const handleClick = () => {
    open({ onComplete: handleComplete });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password || !hospitalName || !address || !phone) {
      alert("모든 정보를 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      // 1. 주소를 좌표로 변환 (추가된 부분!)
      const coords = await getCoordinates(address);
      const lat = coords ? coords.lat : 0;
      const lng = coords ? coords.lng : 0;

      // 2. 로그인 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("회원가입 실패 (유저 정보 없음)");

      // 3. 프로필 저장 (위도, 경도 포함!)
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
            latitude: lat,   // 저장!
            longitude: lng   // 저장!
          }
        ]);

      if (profileError) throw profileError;

      alert("회원가입이 완료되었습니다! 로그인 해주세요.");
      navigate('/login');

    } catch (error: any) {
      console.error("가입 에러:", error);
      alert("가입 중 오류가 발생했습니다: " + error.message);
    } finally {
      setLoading(false);
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
          <p className="text-blue-100 mt-2">인력이 필요한 병원/의료기관용</p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleRegister}>
          {/* 입력 폼 내용은 기존과 동일하므로 유지 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">병원명</label>
              <input type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium" placeholder="예: 연세바로치과" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">병원 분류</label>
              <select value={hospitalType} onChange={(e) => setHospitalType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium bg-white">
                <option value="">선택해주세요</option>
                <option value="dental">치과 병의원</option>
                <option value="medical">일반 의과 병의원</option>
                <option value="oriental">한방 병의원</option>
                <option value="nursing">요양병원</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">사업자 등록번호</label>
              <input type="text" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium" placeholder="000-00-00000" />
            </div>
          </div>
          <hr className="border-gray-100" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">병원 주소</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black font-medium" placeholder="주소 검색 버튼을 눌러주세요" />
                <button type="button" onClick={handleClick} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> 검색
                </button>
              </div>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium" placeholder="상세 주소 (예: 3층)" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">연락처 (지원자가 연락할 번호)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium" placeholder="010-0000-0000" />
            </div>
          </div>
          <hr className="border-gray-100" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">이메일 (아이디)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium" placeholder="hospital@medilink.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black font-medium" placeholder="••••••••" />
            </div>
          </div>
          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg mt-6 disabled:bg-gray-400">
            {loading ? '가입 처리 중...' : '병원 가입 완료하기'}
          </button>
          <div className="text-center pt-2">
            <Link to="/" className="text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1">
              <ArrowLeft size={16} /> 첫 화면으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}