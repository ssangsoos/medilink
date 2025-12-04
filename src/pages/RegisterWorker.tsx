import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Search, ShieldCheck } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode'; // 변환기 가져오기

export default function RegisterWorker() {
  const navigate = useNavigate();
  const open = useDaumPostcodePopup();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
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

    if (!email || !password || !name || !address || !phone || !licenseType || !licenseNumber) {
      alert("모든 정보를 입력해주세요.");
      setLoading(false);
      return;
    }

    try {
      // 1. 주소 -> 좌표 변환
      const coords = await getCoordinates(address);
      const lat = coords ? coords.lat : 0;
      const lng = coords ? coords.lng : 0;

      // 2. 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("회원가입 실패 (유저 정보 없음)");

      // 3. 프로필 저장 (좌표 포함)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: email,
            role: 'worker',
            name: name,
            license_type: licenseType,
            license_number: licenseNumber,
            address: address,
            detail_address: detailAddress,
            phone: phone,
            latitude: lat, // 저장!
            longitude: lng // 저장!
          }
        ]);

      if (profileError) throw profileError;

      alert("의료인 회원가입이 완료되었습니다! 로그인 해주세요.");
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
        <div className="bg-purple-900 p-8 text-center">
          <div className="mx-auto h-14 w-14 bg-white/20 flex items-center justify-center rounded-full mb-4">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">의료인 회원가입</h2>
          <p className="text-purple-200 mt-2">일자리를 찾는 의료 전문가용</p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleRegister}>
          {/* 폼 내용은 동일하게 유지 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">이름</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="실명 입력" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">직종 (면허 종류)</label>
              <select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium bg-white">
                <option value="">선택해주세요</option>
                <option value="doctor">의사</option>
                <option value="dentist">치과의사</option>
                <option value="oriental_doctor">한의사</option>
                <option value="nurse">간호사</option>
                <option value="nurse_aide">간호조무사</option>
                <option value="dental_hygienist">치과위생사</option>
                <option value="coordinator">코디네이터</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">면허 번호</label>
              <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="면허번호 입력" />
            </div>
          </div>
          <hr className="border-gray-100" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">거주지 주소</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black font-medium" placeholder="주소 검색" />
                <button type="button" onClick={handleClick} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> 검색
                </button>
              </div>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="상세 주소 (동/호수)" />
            </div>
            <div className="bg-purple-50 p-4 rounded-xl flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-purple-900 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-900 font-medium break-keep">
                안심하세요! 개인 회원의 상세 주소는 지도에 절대 공개되지 않으며, 매칭을 위한 대략적인 위치(동 단위)로만 사용됩니다.
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">연락처</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="010-0000-0000" />
            </div>
          </div>
          <hr className="border-gray-100" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">이메일 (아이디)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="worker@medilink.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="••••••••" />
            </div>
          </div>
          <button disabled={loading} className="w-full bg-purple-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-950 transition-colors shadow-lg mt-6 disabled:bg-gray-400">
            {loading ? '가입 처리 중...' : '의료인 가입 완료하기'}
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