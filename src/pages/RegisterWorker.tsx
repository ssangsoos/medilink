import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Search, ShieldCheck, Info } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import PrivacyConsent from '../components/PrivacyConsent';

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
  const [agreeAll, setAgreeAll] = useState(false);

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

    if (!agreeAll) {
      alert("필수 약관에 모두 동의해주세요.");
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

      // 주소를 좌표로 변환
      let lat = 0, lng = 0;
      if (address) {
        const coords = await getCoordinates(address);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

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
            latitude: lat,
            longitude: lng,
            is_exposed: true // 가입 시 기본 공개
          }
        ]);

      if (profileError) throw profileError;

      alert("가입이 완료되었습니다! 로그인 해주세요.");
      navigate('/login');

    } catch (error: any) {
      console.error(error);
      alert("가입 오류: " + error.message);
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
          <p className="text-purple-200 mt-2">당신의 능력을 필요로 하는 병원과 연결해드립니다</p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">이름</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="실명을 입력해주세요" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">면허/자격 종류</label>
                <select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none bg-white">
                  <option value="">선택</option>
                  <option value="간호사">간호사</option>
                  <option value="간호조무사">간호조무사</option>
                  <option value="물리치료사">물리치료사</option>
                  <option value="방사선사">방사선사</option>
                  <option value="보건교육사">보건교육사</option>
                  <option value="수의사">수의사</option>
                  <option value="안경사">안경사</option>
                  <option value="약사">약사</option>
                  <option value="언어재활사">언어재활사</option>
                  <option value="영양사">영양사</option>
                  <option value="위생사">위생사</option>
                  <option value="의무기록사">의무기록사</option>
                  <option value="의사">의사</option>
                  <option value="의지보조기기사">의지보조기기사</option>
                  <option value="임상병리사">임상병리사</option>
                  <option value="작업치료사">작업치료사</option>
                  <option value="조산사">조산사</option>
                  <option value="치과기공사">치과기공사</option>
                  <option value="치과위생사">치과위생사</option>
                  <option value="치과의사">치과의사</option>
                  <option value="코디네이터">코디네이터</option>
                  <option value="한약사">한약사</option>
                  <option value="한의사">한의사</option>
                  <option value="응급구조사(1급)">응급구조사(1급)</option>
                  <option value="응급구조사(2급)">응급구조사(2급)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">면허 번호</label>
                <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none" placeholder="면허번호 숫자" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">거주지 주소</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black font-medium" placeholder="주소 검색 버튼 클릭" />
                <button type="button" onClick={handleClick} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> 검색
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> 상세 주소는 공개되지 않으며, 거리 계산에만 사용됩니다.
              </p>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none" placeholder="상세 주소 " />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">연락처</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="010-0000-0000" />
              
              {/* ★ 추가된 안내 문구 */}
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 bg-blue-50 p-2 rounded-lg">
                <Info size={14} /> 이 번호는 채용 제안을 위해 병원 회원에게 공개됩니다.
              </p>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">이메일 (아이디)</label>
              {/* ★ 이메일 예시 변경: worker@medinoti.com */}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="new-email" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="worker@medinoti.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="••••••••" />
            </div>
          </div>

          <PrivacyConsent onValidChange={setAgreeAll} showThirdParty />

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