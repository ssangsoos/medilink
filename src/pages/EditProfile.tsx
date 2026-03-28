import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Search, Phone, Home, Edit, Trash2, Shield } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';

export default function EditProfile() {
  const navigate = useNavigate();
  const open = useDaumPostcodePopup();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [name, setName] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [experience, setExperience] = useState('');
  const [desiredHourlyRate, setDesiredHourlyRate] = useState('');
  const [workRadius, setWorkRadius] = useState('5');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');

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
        setName(data.name || '');
        setLicenseType(data.license_type || '');
        setExperience(data.experience || '');
        setDesiredHourlyRate(data.desired_hourly_rate || '');
        setWorkRadius(data.work_radius ? String(data.work_radius) : '5');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setDetailAddress(data.detail_address || '');
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
        name,
        license_type: licenseType,
        experience,
        desired_hourly_rate: Number(desiredHourlyRate),
        work_radius: Number(workRadius),
        phone,
        address,
        detail_address: detailAddress
      };

      if (address) {
        const coords = await getCoordinates(address);
        if (coords) {
          updates.latitude = coords.lat;
          updates.longitude = coords.lng;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      alert('정보가 수정되었습니다!');
      navigate('/dashboard');

    } catch (error: any) {
      alert('저장 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ★ 수정된 회원 탈퇴 함수 (안전하고 확실한 방식)
  const handleDeleteAccount = async () => {
    if (!window.confirm('정말로 탈퇴하시겠습니까?\n\n• 프로필 정보는 즉시 삭제됩니다.\n• 단, 관계 법령에 따라 아래 정보는 일정 기간 보관됩니다.\n  - 계약/청약철회 기록: 5년\n  - 소비자 불만/분쟁 처리 기록: 3년\n  - 접속 로그: 3개월')) return;

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          alert("로그인 정보가 없습니다.");
          return;
      }

      // 1. 프로필 데이터 삭제 (이력서, 지도에서 사라짐)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;

      // 2. 로그아웃 처리
      await supabase.auth.signOut();

      alert('탈퇴가 완료되었습니다. Medinoti를 이용해 주셔서 감사합니다.');
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
        <div className="bg-purple-900 p-6 text-center text-white">
          <h2 className="text-2xl font-bold">내 정보 수정</h2>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                <Edit size={16} /> 이름
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">면허/직종</label>
              <select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-900">
                <option value="">선택해주세요</option>
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
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><Phone size={16}/> 연락처</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" />
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><Home size={16}/> 거주지 주소 (이사 시 수정)</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black" placeholder="주소 검색" />
                <button type="button" onClick={handleSearchAddress} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> 검색
                </button>
              </div>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" placeholder="상세 주소" />
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><FileText size={16} /> 경력 및 자기소개</label>
            <textarea rows={5} value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">희망 시급</label>
              <div className="relative flex items-center">
                <input type="number" value={desiredHourlyRate} onChange={(e) => setDesiredHourlyRate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900 text-right pr-8" />
                <span className="absolute right-4 text-gray-500 font-bold">원</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><MapPin size={16} /> 근무 희망 반경</label>
              <select value={workRadius} onChange={(e) => setWorkRadius(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-900">
                <option value="1">1km 이내</option>
                <option value="3">3km 이내</option>
                <option value="5">5km 이내</option>
                <option value="10">10km 이내</option>
                <option value="20">20km 이내</option>
              </select>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-purple-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-950 transition-colors shadow-lg mt-6">
            {loading ? '저장 중...' : '이력서 저장하기'}
          </button>
          
          <button type="button" onClick={() => navigate('/dashboard')} className="w-full text-gray-500 py-2 flex items-center justify-center gap-1 hover:text-gray-900">
            <ArrowLeft size={16} /> 취소하고 돌아가기
          </button>
        </form>
        
        {/* 개인정보 권리 안내 */}
        <div className="bg-blue-50 p-6 border-t border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">내 개인정보 권리</h3>
          </div>
          <ul className="text-xs text-blue-800 space-y-1 mb-3">
            <li>• 위 양식에서 개인정보를 직접 열람·수정할 수 있습니다.</li>
            <li>• 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.</li>
            <li>• 추가 문의: ssangsoos@gmail.com / 032-473-2222</li>
          </ul>
          <Link to="/privacy" className="text-xs text-blue-600 underline hover:text-blue-800">
            개인정보처리방침 보기
          </Link>
        </div>

        {/* 회원 탈퇴 구역 */}
        <div className="bg-red-50 p-6 text-center border-t border-red-100">
            <p className="text-xs text-red-600 mb-3 font-medium">더 이상 서비스를 이용하지 않으시나요?</p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="text-red-500 text-sm font-bold flex items-center justify-center gap-2 hover:text-red-700 mx-auto px-4 py-2 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} /> 회원 탈퇴하기
            </button>
        </div>
      </div>
    </div>
  );
}