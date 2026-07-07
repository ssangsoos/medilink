import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Search, ShieldCheck, Info, MapPin, Clock, Sparkles, Calendar, Sun } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import PrivacyConsent from '../components/PrivacyConsent';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { MEDICAL_LICENSE_TYPES } from '../lib/medicalConstants';
import { WORK_RADIUS_OPTIONS, optionToRadius } from '../lib/distance';
import {
  AVAILABLE_FROM_OPTIONS,
  BIO_MAX_LENGTH,
  WORK_PATTERN_OPTIONS,
  AVAILABLE_DAYS_OPTIONS,
  AVAILABLE_TIMES_OPTIONS,
  toggleValue,
} from '../lib/profileFields';

export default function RegisterWorker() {
  const navigate = useNavigate();
  const open = useDaumPostcodePopup();
  const { t } = useTranslation();

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
  const [workPattern, setWorkPattern] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

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
      alert(t('workerForm.agreeRequired'));
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
      if (!authData.user) throw new Error(t('workerForm.signupFailedGeneric'));

      // 주소를 좌표로 변환. 실패 시 (0,0) 대신 null 저장 —
      // (0,0)은 지도에서 아프리카 앞바다에 마커를 찍으므로, 못 찾으면 아예 비워둔다.
      // 뷰(public_profiles)는 좌표 없는 회원을 지도에서 제외하고, 이후 프로필 수정에서 보정 가능.
      let lat: number | null = null;
      let lng: number | null = null;
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
            work_pattern: workPattern.length > 0 ? workPattern : null,
            available_days: availableDays.length > 0 ? availableDays : null,
            available_times: availableTimes.length > 0 ? availableTimes : null,
            is_exposed: true // 가입 시 기본 공개
          }
        ]);

      if (profileError) {
        console.error('Profile insert failed:', profileError.message);
        await supabase.auth.signOut();
        alert(t('workerForm.profileInsertError', { message: profileError.message }));
        return;
      }

      if (authData.session) {
        alert(t('workerForm.signupCompleteWithSession'));
      } else {
        alert(t('workerForm.signupPendingEmail', { email }));
      }
      navigate('/login');

    } catch (error: any) {
      console.error(error);
      alert(t('workerForm.signupErrorPrefix') + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-purple-900 p-8 text-center">
          <div className="flex justify-end mb-2">
            <LanguageSwitcher />
          </div>
          <div className="mx-auto h-14 w-14 bg-white/20 flex items-center justify-center rounded-full mb-4">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">{t('workerForm.registerHeaderTitle')}</h2>
          <p className="text-purple-200 mt-2">{t('workerForm.registerHeaderSubtitle')}</p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleRegister} autoComplete="off">
          {/* Chrome 자동완성 흡수용 더미 필드 */}
          <input type="text" name="fake_email" style={{ display: 'none' }} tabIndex={-1} />
          <input type="password" name="fake_pw" style={{ display: 'none' }} tabIndex={-1} />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.name')}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder={t('workerForm.namePlaceholder')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.licenseTypeLabelRegister')}</label>
                <select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none bg-white">
                  <option value="">{t('workerForm.selectPlaceholder')}</option>
                  {MEDICAL_LICENSE_TYPES.map((type) => (
                    <option key={type} value={type}>{t('licenseTypes.' + type, { defaultValue: type })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.licenseNumberLabel')}</label>
                <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none" placeholder={t('workerForm.licenseNumberPlaceholder')} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.addressLabelRegister')}</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black font-medium" placeholder={t('workerForm.addressSearchPlaceholderRegister')} />
                <button type="button" onClick={handleClick} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> {t('workerForm.search')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <ShieldCheck size={12} /> {t('workerForm.addressPrivacyHint')}
              </p>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none" placeholder={t('workerForm.detailAddressPlaceholder')} />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.phone')}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder={t('workerForm.phonePlaceholder')} />

              {/* ★ 추가된 안내 문구 */}
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 bg-blue-50 p-2 rounded-lg">
                <Info size={14} /> {t('workerForm.phonePublicHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                <MapPin size={16} className="text-purple-700" /> {t('workerForm.workRadiusLabel')}
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
                    {t('workerForm.radiusOptions.' + opt.value, { defaultValue: opt.label })}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                {t('workerForm.workRadiusHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                <Clock size={16} className="text-purple-700" /> {t('workerForm.availableFromSectionLabel')}
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
                    {t('options.' + opt.value, { defaultValue: opt.label })}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                <Sparkles size={16} className="text-purple-700" /> {t('workerForm.bioLabel')}
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                maxLength={BIO_MAX_LENGTH}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium"
                placeholder={t('workerForm.bioPlaceholder')}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-purple-700 font-medium">{t('workerForm.bioHint')}</p>
                <p className="text-xs text-gray-400">{bio.length}/{BIO_MAX_LENGTH}</p>
              </div>
            </div>

            <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 space-y-3">
              <p className="text-xs text-purple-800 font-medium flex items-center gap-1">
                <Calendar size={14} /> {t('workerForm.scheduleSectionLabel')}
              </p>

              <div>
                <p className="text-xs font-bold text-gray-700 mb-1.5">{t('workerForm.workPatternLabel')}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {WORK_PATTERN_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setWorkPattern((prev) => toggleValue(prev, opt.value))}
                      className={`px-2 py-2 rounded-lg border-2 font-bold text-xs transition-colors ${
                        workPattern.includes(opt.value)
                          ? 'border-purple-700 bg-purple-100 text-purple-800'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t('options.' + opt.value, { defaultValue: opt.label })}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-700 mb-1.5">{t('workerForm.availableDaysLabel')}</p>
                <div className="grid grid-cols-7 gap-1">
                  {AVAILABLE_DAYS_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setAvailableDays((prev) => toggleValue(prev, opt.value))}
                      className={`py-2 rounded-lg border-2 font-bold text-xs transition-colors ${
                        availableDays.includes(opt.value)
                          ? 'border-purple-700 bg-purple-100 text-purple-800'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t('options.' + opt.value, { defaultValue: opt.label })}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Sun size={12} /> {t('workerForm.availableTimesLabel')}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {AVAILABLE_TIMES_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setAvailableTimes((prev) => toggleValue(prev, opt.value))}
                      className={`px-2 py-2 rounded-lg border-2 font-bold text-xs transition-colors ${
                        availableTimes.includes(opt.value)
                          ? 'border-purple-700 bg-purple-100 text-purple-800'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t('options.' + opt.value, { defaultValue: opt.label })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.emailLabel')}</label>
              {/* ★ 이메일 예시 변경: worker@medinoti.com */}
              <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" name="register-worker-email" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder={t('workerForm.emailPlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.passwordLabel')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" name="register-worker-pw" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-900 outline-none text-black font-medium" placeholder={t('workerForm.passwordPlaceholder')} />
            </div>
          </div>

          <PrivacyConsent onValidChange={setAgreeAll} showThirdParty />

          <button disabled={loading} className="w-full bg-purple-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-950 transition-colors shadow-lg mt-6 disabled:bg-gray-400">
            {loading ? t('workerForm.submitProcessing') : t('workerForm.submitButton')}
          </button>

          <div className="text-center pt-2">
            <Link to="/" className="text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1">
              <ArrowLeft size={16} /> {t('workerForm.backToHome')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}