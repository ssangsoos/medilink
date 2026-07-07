import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { getCoordinates } from '../lib/geocode';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Search, Phone, Home, Edit, Trash2, Shield, Clock, Sparkles, Calendar, Sun, Plus, X } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { WORK_RADIUS_OPTIONS, optionToRadius, radiusToOption } from '../lib/distance';
import {
  AVAILABLE_FROM_OPTIONS,
  BIO_MAX_LENGTH,
  WORK_PATTERN_OPTIONS,
  AVAILABLE_DAYS_OPTIONS,
  AVAILABLE_TIMES_OPTIONS,
  toggleValue,
  type CareerRow,
  CAREER_END_ONGOING,
  getCareerYearOptions,
  emptyCareerRow,
  serializeExperience,
  parseExperience,
  padCareerRows,
} from '../lib/profileFields';

const CAREER_YEAR_OPTIONS = getCareerYearOptions();

export default function EditProfile() {
  const navigate = useNavigate();
  const open = useDaumPostcodePopup();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [name, setName] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [careerRows, setCareerRows] = useState<CareerRow[]>(padCareerRows([]));
  const [experienceNotes, setExperienceNotes] = useState('');
  const [desiredHourlyRate, setDesiredHourlyRate] = useState('');
  const [workRadius, setWorkRadius] = useState('5');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [availableFrom, setAvailableFrom] = useState<string>('flexible');
  const [bio, setBio] = useState<string>('');
  const [workPattern, setWorkPattern] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

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
        const parsed = parseExperience(data.experience);
        setCareerRows(padCareerRows(parsed.rows));
        setExperienceNotes(parsed.notes);
        setDesiredHourlyRate(data.desired_hourly_rate || '');
        setWorkRadius(radiusToOption(data.work_radius));
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setDetailAddress(data.detail_address || '');
        setAvailableFrom(data.available_from || 'flexible');
        setBio(data.bio || '');
        setWorkPattern(Array.isArray(data.work_pattern) ? data.work_pattern : []);
        setAvailableDays(Array.isArray(data.available_days) ? data.available_days : []);
        setAvailableTimes(Array.isArray(data.available_times) ? data.available_times : []);
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

  const updateCareerRow = (index: number, field: keyof CareerRow, value: string) => {
    setCareerRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addCareerRow = () => {
    setCareerRows((prev) => [...prev, emptyCareerRow()]);
  };

  const removeCareerRow = (index: number) => {
    setCareerRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [emptyCareerRow()] : next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('workerForm.loginRequired'));

      let updates: any = {
        name,
        license_type: licenseType,
        experience: serializeExperience(careerRows, experienceNotes),
        desired_hourly_rate: Number(desiredHourlyRate),
        work_radius: optionToRadius(workRadius),
        available_from: availableFrom,
        bio: bio.trim() || null,
        work_pattern: workPattern.length > 0 ? workPattern : null,
        available_days: availableDays.length > 0 ? availableDays : null,
        available_times: availableTimes.length > 0 ? availableTimes : null,
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

      alert(t('workerForm.saveSuccess'));
      navigate('/dashboard');

    } catch (error: any) {
      alert(t('workerForm.saveFailedPrefix') + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ★ 수정된 회원 탈퇴 함수 (안전하고 확실한 방식)
  const handleDeleteAccount = async () => {
    if (!window.confirm(t('workerForm.deleteConfirmMessage'))) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          alert(t('workerForm.noLoginInfo'));
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

      alert(t('workerForm.deleteSuccess'));
      navigate('/');

    } catch (error: any) {
      console.error(error);
      alert(t('workerForm.deleteErrorPrefix') + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="p-8 text-center">{t('workerForm.loadingProfile')}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-purple-900 p-6 text-center text-white">
          <div className="flex justify-end mb-2">
            <LanguageSwitcher />
          </div>
          <h2 className="text-2xl font-bold">{t('workerForm.editHeaderTitle')}</h2>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
                <Edit size={16} /> {t('workerForm.name')}
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.licenseTypeLabelEdit')}</label>
              <select value={licenseType} onChange={(e) => setLicenseType(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-900">
                <option value="">{t('workerForm.licenseSelectPlaceholder')}</option>
                <option value="간호사">{t('licenseTypes.간호사', { defaultValue: '간호사' })}</option>
                <option value="간호조무사">{t('licenseTypes.간호조무사', { defaultValue: '간호조무사' })}</option>
                <option value="물리치료사">{t('licenseTypes.물리치료사', { defaultValue: '물리치료사' })}</option>
                <option value="방사선사">{t('licenseTypes.방사선사', { defaultValue: '방사선사' })}</option>
                <option value="보건교육사">{t('licenseTypes.보건교육사', { defaultValue: '보건교육사' })}</option>
                <option value="수의사">{t('licenseTypes.수의사', { defaultValue: '수의사' })}</option>
                <option value="안경사">{t('licenseTypes.안경사', { defaultValue: '안경사' })}</option>
                <option value="약사">{t('licenseTypes.약사', { defaultValue: '약사' })}</option>
                <option value="언어재활사">{t('licenseTypes.언어재활사', { defaultValue: '언어재활사' })}</option>
                <option value="영양사">{t('licenseTypes.영양사', { defaultValue: '영양사' })}</option>
                <option value="위생사">{t('licenseTypes.위생사', { defaultValue: '위생사' })}</option>
                <option value="의무기록사">{t('licenseTypes.의무기록사', { defaultValue: '의무기록사' })}</option>
                <option value="의사">{t('licenseTypes.의사', { defaultValue: '의사' })}</option>
                <option value="의지보조기기사">{t('licenseTypes.의지보조기기사', { defaultValue: '의지보조기기사' })}</option>
                <option value="임상병리사">{t('licenseTypes.임상병리사', { defaultValue: '임상병리사' })}</option>
                <option value="작업치료사">{t('licenseTypes.작업치료사', { defaultValue: '작업치료사' })}</option>
                <option value="조산사">{t('licenseTypes.조산사', { defaultValue: '조산사' })}</option>
                <option value="치과기공사">{t('licenseTypes.치과기공사', { defaultValue: '치과기공사' })}</option>
                <option value="치과위생사">{t('licenseTypes.치과위생사', { defaultValue: '치과위생사' })}</option>
                <option value="치과의사">{t('licenseTypes.치과의사', { defaultValue: '치과의사' })}</option>
                <option value="코디네이터">{t('licenseTypes.코디네이터', { defaultValue: '코디네이터' })}</option>
                <option value="한약사">{t('licenseTypes.한약사', { defaultValue: '한약사' })}</option>
                <option value="한의사">{t('licenseTypes.한의사', { defaultValue: '한의사' })}</option>
                <option value="응급구조사(1급)">{t('licenseTypes.응급구조사(1급)', { defaultValue: '응급구조사(1급)' })}</option>
                <option value="응급구조사(2급)">{t('licenseTypes.응급구조사(2급)', { defaultValue: '응급구조사(2급)' })}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><Phone size={16}/> {t('workerForm.phone')}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" />
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><Home size={16}/> {t('workerForm.addressLabelEdit')}</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={address} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black" placeholder={t('workerForm.addressSearchPlaceholderEdit')} />
                <button type="button" onClick={handleSearchAddress} className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex items-center gap-2">
                  <Search size={18} /> {t('workerForm.search')}
                </button>
              </div>
            </div>
            <div>
              <input type="text" value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" placeholder={t('workerForm.detailAddressPlaceholder')} />
            </div>
          </div>

          <hr className="border-gray-100" />

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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900"
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

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><FileText size={16} /> {t('workerForm.careerLabel')}</label>
            <p className="text-xs text-purple-700 font-medium mb-2">{t('workerForm.careerHint')}</p>
            <div className="space-y-2">
              {careerRows.map((row, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <select
                    value={row.startYear}
                    onChange={(e) => updateCareerRow(index, 'startYear', e.target.value)}
                    className="w-24 px-2 py-3 border border-gray-300 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-purple-900"
                  >
                    <option value="">{t('workerForm.careerStartPlaceholder')}</option>
                    {CAREER_YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="text-gray-400 font-bold shrink-0">~</span>
                  <select
                    value={row.endYear}
                    onChange={(e) => updateCareerRow(index, 'endYear', e.target.value)}
                    className="w-24 px-2 py-3 border border-gray-300 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-purple-900"
                  >
                    <option value="">{t('workerForm.careerEndPlaceholder')}</option>
                    <option value={CAREER_END_ONGOING}>{t('workerForm.careerOngoing', { defaultValue: CAREER_END_ONGOING })}</option>
                    {CAREER_YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.hospital}
                    onChange={(e) => updateCareerRow(index, 'hospital', e.target.value)}
                    className="flex-1 min-w-0 px-3 py-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-900"
                    placeholder={t('workerForm.careerHospitalPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => removeCareerRow(index)}
                    className="p-2 text-gray-400 hover:text-red-500 shrink-0"
                    aria-label={t('workerForm.careerRowDeleteAria')}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCareerRow}
              className="mt-2 w-full py-2.5 border-2 border-dashed border-purple-200 rounded-xl text-purple-700 font-bold text-sm flex items-center justify-center gap-1 hover:bg-purple-50 transition-colors"
            >
              <Plus size={16} /> {t('workerForm.careerRowAdd')}
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><FileText size={16} /> {t('workerForm.notesLabel')}</label>
            <textarea rows={5} value={experienceNotes} onChange={(e) => setExperienceNotes(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900" placeholder={t('workerForm.notesPlaceholder')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">{t('workerForm.desiredWageLabel')}</label>
              <div className="relative flex items-center">
                <input type="number" value={desiredHourlyRate} onChange={(e) => setDesiredHourlyRate(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-900 text-right pr-8" />
                <span className="absolute right-4 text-gray-500 font-bold">{t('workerForm.wonSuffix')}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1"><MapPin size={16} /> {t('workerForm.workRadiusLabelEdit')}</label>
              <select value={workRadius} onChange={(e) => setWorkRadius(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-900">
                {WORK_RADIUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t('workerForm.radiusOptions.' + opt.value, { defaultValue: opt.label })}</option>
                ))}
              </select>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-purple-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-950 transition-colors shadow-lg mt-6">
            {loading ? t('workerForm.saveProcessing') : t('workerForm.saveButton')}
          </button>

          <button type="button" onClick={() => navigate('/dashboard')} className="w-full text-gray-500 py-2 flex items-center justify-center gap-1 hover:text-gray-900">
            <ArrowLeft size={16} /> {t('workerForm.cancelBack')}
          </button>
        </form>

        {/* 개인정보 권리 안내 */}
        <div className="bg-blue-50 p-6 border-t border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">{t('workerForm.myPrivacyRightsTitle')}</h3>
          </div>
          <ul className="text-xs text-blue-800 space-y-1 mb-3">
            <li>• {t('workerForm.privacyRight1')}</li>
            <li>• {t('workerForm.privacyRight2')}</li>
            <li>• {t('workerForm.contactInfoLine')}</li>
          </ul>
          <Link to="/privacy" className="text-xs text-blue-600 underline hover:text-blue-800">
            {t('workerForm.privacyPolicyLink')}
          </Link>
        </div>

        {/* 회원 탈퇴 구역 */}
        <div className="bg-red-50 p-6 text-center border-t border-red-100">
            <p className="text-xs text-red-600 mb-3 font-medium">{t('workerForm.deleteAccountPrompt')}</p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="text-red-500 text-sm font-bold flex items-center justify-center gap-2 hover:text-red-700 mx-auto px-4 py-2 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} /> {t('workerForm.deleteAccountButton')}
            </button>
        </div>
      </div>
    </div>
  );
}