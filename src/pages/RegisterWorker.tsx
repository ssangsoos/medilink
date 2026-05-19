import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Search, ShieldCheck, Info, MapPin, Clock, Sparkles } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import PrivacyConsent from '../components/PrivacyConsent';
import { MEDICAL_LICENSE_TYPES } from '../lib/medicalConstants';
import { WORK_RADIUS_OPTIONS, optionToRadius } from '../lib/distance';
import { AVAILABLE_FROM_OPTIONS, BIO_MAX_LENGTH } from '../lib/profileFields';

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
  const [workRadius, setWorkRadius] = useState<string>('5');
  const [availableFrom, setAvailableFrom] = useState<string>('flexible');
  const [bio, setBio] = useState<string>('');

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
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
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
            work_radius: optionToRadius(workRadius),
            available_from: availableFrom,
            bio: bio.trim() || null,
            is_exposed: true // 가입 시 기본 공개
          }
        ]);

      if (profileError) {
        console.error('Profile insert failed for', authData.user.id, profileError);
        await supabase.auth.signOut();
        alert(
          '프로필 등록 중 오류가 발생했습니다.\n' +
          '잠시 후 다시 시도해주시거나, 문제가 지속되면 고객센터로 문의해주세요.\n\n' +
          `오류: ${profileError.message}`
        );
        return;
      }

      if (authData.session) {
        alert('가입이 완료되었습니다. 로그인 페이지에서 로그인해주세요.');
      } else {
        alert(
          `가입 신청이 완료되었습니다.\n\n` +
          `${email} 주소로 인증 메일이 발송되었습니다.\n` +
          `메일함(스팸함 포함)을 확인하시고 인증 링크를 클릭하셔야 로그인이 가능합니다.`
        );
      }
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

        <form className="p-8 space-y-6" onSubmit={handleRegister} autoComplete="off">
          {/* Chrome 자동완성 흡수용 더미 필드 */}
          <input type="text" name="fake_email" style={{ display: 'none' }} tabIndex={-1} />
          <input type="password" name="fake_pw" style={{ display: 'none' }} tabIndex={-1} />
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
                  {MEDICAL_LICENSE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
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

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                <MapPin size={16} className="text-purple-700" /> 출퇴근 가능 반경
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {WORK_RADIUS_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setWorkRadius(opt.value)}
                    className={`px-2 py-3 rounded-xl border-2 font-bold text-xs transition-colors ${
                      workRadius === opt.value
                        ? 'border-purple-700 bg-purple-50 text-purple-800'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                거주지에서 출퇴근 가능한 거리를 선택해주세요. 병원이 이 범위를 벗어나면 안내가 표시됩니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                <Clock size={16} className="text-purple-700" /> 즉시 근무 가능 시점
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {AVAILABLE_FROM_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setAvailableFrom(opt.value)}
                    className={`px-2 py-3 rounded-xl border-2 font-bold text-xs transition-colors ${
                      availableFrom === opt.value
                        ? 'border-purple-700 bg-purple-50 text-purple-800'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                <Sparkles size={16} className="text-purple-700" /> 한 줄 소개 <span className="text-xs font-normal text-gray-500">(선택)</span>
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                maxLength={BIO_MAX_LENGTH}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium"
                placeholder="예) 임플란트 어시스트 자신 있어요"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500">병원이 프로필 볼 때 함께 표시됩니다.</p>
                <p className="text-xs text-gray-400">{bio.length}/{BIO_MAX_LENGTH}</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">이메일 (아이디)</label>
              {/* ★ 이메일 예시 변경: worker@medinoti.com */}
              <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" name="register-worker-email" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="worker@medinoti.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" name="register-worker-pw" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder="••••••••" />
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