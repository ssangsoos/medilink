import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Phone, Building2, Trash2, Shield } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function EditHospital() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const open = useDaumPostcodePopup();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [hospitalName, setHospitalName] = useState('');
  const [hospitalType, setHospitalType] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [seekingPositions, setSeekingPositions] = useState<string[]>([]);
  const [offeredHourlyRate, setOfferedHourlyRate] = useState('');
  const [employmentType, setEmploymentType] = useState('');

  const POSITION_OPTIONS = [
    "치과위생사", "치과의사", "치과기공사",
    "간호사", "간호조무사", "물리치료사", "방사선사", "보건교육사",
    "수의사", "안경사", "약사", "언어재활사", "영양사",
    "위생사", "의무기록사", "의사", "의지보조기기사", "임상병리사",
    "작업치료사", "조산사",
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
        setMobilePhone(data.mobile_phone || '');
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
      if (!user) throw new Error(t('hospitalForm.errLoginRequired'));

      let updates: any = {
        name: hospitalName,
        hospital_name: hospitalName,
        hospital_type: hospitalType,
        business_number: businessNumber,
        phone,
        mobile_phone: mobilePhone || null,
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

      alert(t('hospitalForm.editSuccessAlert'));
      navigate('/dashboard');

    } catch (error: any) {
      alert(t('hospitalForm.errSaveFailedPrefix') + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ★ 수정된 회원 탈퇴 함수 (가장 안전한 방식)
  const handleDeleteAccount = async () => {
    if (!window.confirm(t('hospitalForm.deleteConfirmMessage'))) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          alert(t('hospitalForm.errNoLoginInfo'));
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

      alert(t('hospitalForm.deleteSuccessAlert'));
      navigate('/');

    } catch (error: any) {
      console.error(error);
      alert(t('hospitalForm.errDeleteFailedPrefix') + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="p-8 text-center">{t('hospitalForm.loadingInfo')}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h2 className="text-2xl font-bold">{t('hospitalForm.editTitle')}</h2>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                <Building2 size={16} /> {t('hospitalForm.hospitalName')}
              </label>
              <input type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('hospitalForm.hospitalType')}</label>
              <select value={hospitalType} onChange={(e) => setHospitalType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('hospitalForm.selectHospitalTypePlaceholder')}</option>
                <option value="animal">{t('hospitalForm.typeAnimal')}</option>
                <option value="pharmacy">{t('hospitalForm.typePharmacy')}</option>
                <option value="nursing">{t('hospitalForm.typeNursing')}</option>
                <option value="medical">{t('hospitalForm.typeMedical')}</option>
                <option value="dental">{t('hospitalForm.typeDental')}</option>
                <option value="oriental">{t('hospitalForm.typeOriental')}</option>
                <option value="other">{t('hospitalForm.typeOther')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('hospitalForm.businessNumberShort')}</label>
              <input type="text" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('hospitalForm.addressLabelEdit')}</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black" placeholder={t('hospitalForm.addressSearchPlaceholder')} />
                <button type="button" onClick={handleSearchAddress} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> {t('hospitalForm.searchButton')}
                </button>
              </div>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('hospitalForm.detailAddressPlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><Phone size={16}/> {t('hospitalForm.phone')}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><Phone size={16}/> {t('hospitalForm.mobilePhone')} <span className="text-xs text-gray-500 font-normal">{t('hospitalForm.optionalSmsHint')}</span></label>
              <input type="tel" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('hospitalForm.mobilePhonePlaceholder')} />
              <p className="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded">
                💡 {t('hospitalForm.mobileHintPrefix')}<b>{t('hospitalForm.mobileHintBold')}</b>{t('hospitalForm.mobileHintSuffixEdit')}
              </p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 구인 정보 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">{t('hospitalForm.seekingPositionsLabel')}</label>
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
                    {t('licenseTypes.' + pos, { defaultValue: pos })}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">{t('hospitalForm.offeredWageLabel')}</label>
                <div className="relative flex items-center">
                  <input type="number" value={offeredHourlyRate} onChange={(e) => setOfferedHourlyRate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-right pr-8" placeholder={t('hospitalForm.wagePlaceholderExample')} />
                  <span className="absolute right-4 text-gray-500 font-bold">{t('hospitalForm.won')}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">{t('hospitalForm.employmentTypeLabel')}</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('hospitalForm.selectOption')}</option>
                  <option value="정규직">{t('hospitalForm.employmentFulltime')}</option>
                  <option value="아르바이트">{t('hospitalForm.employmentPartTime')}</option>
                  <option value="계약직">{t('hospitalForm.employmentContract')}</option>
                </select>
              </div>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg mt-6">
            {loading ? t('hospitalForm.saving') : t('hospitalForm.editSubmit')}
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 text-gray-500 py-2 flex items-center justify-center gap-1 hover:text-gray-900">
              <ArrowLeft size={16} /> {t('hospitalForm.cancelAndBack')}
            </button>
            <LanguageSwitcher />
          </div>
        </form>

        {/* 개인정보 권리 안내 */}
        <div className="bg-blue-50 p-6 border-t border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">{t('hospitalForm.privacyRightsTitle')}</h3>
          </div>
          <ul className="text-xs text-blue-800 space-y-1 mb-3">
            <li>• {t('hospitalForm.privacyBullet1')}</li>
            <li>• {t('hospitalForm.privacyBullet2')}</li>
            <li>• {t('hospitalForm.privacyBullet3')}</li>
          </ul>
          <Link to="/privacy" className="text-xs text-blue-600 underline hover:text-blue-800">
            {t('hospitalForm.privacyPolicyLink')}
          </Link>
        </div>

        {/* 회원 탈퇴 구역 */}
        <div className="bg-red-50 p-6 text-center border-t border-red-100">
            <p className="text-xs text-red-600 mb-3 font-medium">{t('hospitalForm.deleteSectionPrompt')}</p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="text-red-500 text-sm font-bold flex items-center justify-center gap-2 hover:text-red-700 mx-auto px-4 py-2 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} /> {t('hospitalForm.deleteAccountButton')}
            </button>
        </div>
      </div>
    </div>
  );
}
