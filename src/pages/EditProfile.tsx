import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import { ArrowLeft, FileText, MapPin, Search, Phone, Home, Edit, Trash2 } from 'lucide-react';
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
    if (!window.confirm('정말로 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 정보가 즉시 삭제됩니다.')) return;

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
                <option value="치과의사">치과의사</option>
                <option value="의사">의사</option>
                <option value="한의사">한의사</option>
                <option value="치과위생사">치과위생사</option>
                <option value="간호사">간호사</option>
                <option value="간호조무사">간호조무사</option>
                <option value="코디네이터">코디네이터</option>
                <option value="기타">기타</option>
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
        
        {/* 회원 탈퇴 구역 */}
        <div className="bg-red-50 p-6 text-center mt-4 border-t border-red-100">
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