import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { ArrowLeft, MessageCircle, Calendar, Infinity as InfinityIcon, Briefcase, Phone } from 'lucide-react';
import { MEDICAL_LICENSE_TYPES, JOB_CATEGORY_OTHER } from '../lib/medicalConstants';
import { safeHttpUrl } from '../lib/sanitize';
import { trackEvent } from '../lib/analytics';
import type { ScheduleType } from '../types/jobPosting';

export default function PostJob() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [hospitalLocation, setHospitalLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitalMobile, setHospitalMobile] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [jobCategoryCustom, setJobCategoryCustom] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('specific');
  const [hourlyRate, setHourlyRate] = useState('');
  const [wageNegotiable, setWageNegotiable] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [kakaoLink, setKakaoLink] = useState('');
  const [phoneMode, setPhoneMode] = useState<'default' | 'custom'>('default');
  const [customPhone, setCustomPhone] = useState('');

  useEffect(() => {
    const fetchHospitalInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('latitude, longitude, mobile_phone')
          .eq('id', user.id)
          .single();

        if (data) {
          setHospitalLocation({ lat: data.latitude, lng: data.longitude });
          setHospitalMobile(data.mobile_phone ?? '');
          if (!data.mobile_phone) {
            setPhoneMode('custom');
          }
        }
      }
    };
    fetchHospitalInfo();
  }, []);

  const isOther = jobCategory === JOB_CATEGORY_OTHER;

  const validate = (): string | null => {
    if (!jobCategory) return t('jobForm.errCategoryRequired');
    if (isOther && !jobCategoryCustom.trim()) return t('jobForm.errCategoryCustomRequired');
    if (scheduleType === 'specific') {
      if (!startDate || !endDate || !startTime || !endTime) {
        return t('jobForm.errScheduleIncomplete');
      }
      if (startDate > endDate) return t('jobForm.errEndDateBeforeStart');
      if (startDate === endDate && startTime >= endTime) {
        return t('jobForm.errEndTimeBeforeStart');
      }
    }
    if (!wageNegotiable) {
      const wage = Number(hourlyRate);
      if (!hourlyRate || Number.isNaN(wage) || wage <= 0) {
        return t('jobForm.errWageRequired');
      }
    }
    if (phoneMode === 'custom' && !customPhone.trim()) {
      return t('jobForm.errCustomPhoneRequired');
    }
    if (kakaoLink.trim() !== '' && !safeHttpUrl(kakaoLink)) {
      return t('jobForm.errKakaoInvalid');
    }
    return null;
  };

  const resolveContactPhone = (): string | null => {
    if (phoneMode === 'default') return null;
    return customPhone.trim() || null;
  };

  const normalizeKakao = (link: string): string | null => safeHttpUrl(link);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('jobForm.errLoginRequired'));

      const payload = {
        hospital_id: user.id,
        title,
        description,
        job_category: isOther ? JOB_CATEGORY_OTHER : jobCategory,
        job_category_custom: isOther ? jobCategoryCustom.trim() : null,
        schedule_type: scheduleType,
        hourly_rate: wageNegotiable ? null : Number(hourlyRate),
        wage_negotiable: wageNegotiable,
        work_start_date: scheduleType === 'specific' ? startDate : null,
        work_end_date: scheduleType === 'specific' ? endDate : null,
        work_start_time: scheduleType === 'specific' ? startTime : null,
        work_end_time: scheduleType === 'specific' ? endTime : null,
        kakao_link: normalizeKakao(kakaoLink),
        contact_phone: resolveContactPhone(),
        status: 'active',
        latitude: hospitalLocation?.lat ?? null,
        longitude: hospitalLocation?.lng ?? null,
      };

      const { error } = await supabase.from('job_postings').insert([payload]);
      if (error) throw error;

      trackEvent('job_post');
      alert(t('jobForm.postSuccess'));
      navigate('/hospital/jobs');
    } catch (error: any) {
      alert(t('jobForm.postFailPrefix') + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h2 className="text-2xl font-bold">{t('jobForm.postTitle')}</h2>
          <p className="text-blue-100 text-sm mt-1">{t('jobForm.postSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label htmlFor="post-job-title" className="block text-sm font-bold text-gray-900 mb-1">{t('jobForm.titleLabel')}</label>
            <input
              id="post-job-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-xl"
              placeholder={t('jobForm.titlePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="post-job-category" className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
              <Briefcase size={16} className="text-blue-600" /> {t('jobForm.categoryLabel')}
            </label>
            <select
              id="post-job-category"
              required
              value={jobCategory}
              onChange={(e) => setJobCategory(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white"
            >
              <option value="">{t('jobForm.categoryPlaceholder')}</option>
              {MEDICAL_LICENSE_TYPES.map((type) => (
                <option key={type} value={type}>{t('licenseTypes.' + type, { defaultValue: type })}</option>
              ))}
              <option value={JOB_CATEGORY_OTHER}>{t('jobForm.categoryOtherOption')}</option>
            </select>
            {isOther && (
              <input
                type="text"
                required
                maxLength={30}
                value={jobCategoryCustom}
                onChange={(e) => setJobCategoryCustom(e.target.value)}
                className="w-full p-3 border rounded-xl mt-2"
                placeholder={t('jobForm.categoryCustomPlaceholder')}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">{t('jobForm.scheduleLabel')}</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setScheduleType('specific')}
                className={`p-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${scheduleType === 'specific' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <Calendar size={16} /> {t('jobForm.scheduleSpecific')}
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('always')}
                className={`p-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${scheduleType === 'always' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <InfinityIcon size={16} /> {t('jobForm.scheduleAlways')}
              </button>
            </div>

            {scheduleType === 'specific' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="post-job-start-date" className="block text-xs font-bold text-gray-600 mb-1">{t('jobForm.startDateLabel')}</label>
                    <input id="post-job-start-date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div>
                    <label htmlFor="post-job-end-date" className="block text-xs font-bold text-gray-600 mb-1">{t('jobForm.endDateLabel')}</label>
                    <input id="post-job-end-date" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="post-job-start-time" className="block text-xs font-bold text-gray-600 mb-1">{t('jobForm.startTimeLabel')}</label>
                    <input id="post-job-start-time" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div>
                    <label htmlFor="post-job-end-time" className="block text-xs font-bold text-gray-600 mb-1">{t('jobForm.endTimeLabel')}</label>
                    <input id="post-job-end-time" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
                <InfinityIcon size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>{t('jobForm.alwaysModeTitle')}</strong> {t('jobForm.alwaysModeDescPost')}
                </span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="post-job-hourly-rate" className="block text-sm font-bold text-gray-900 mb-1">{t('jobForm.hourlyRateLabel')}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg pointer-events-none">₩</span>
              <input
                id="post-job-hourly-rate"
                type="number"
                min={0}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                disabled={wageNegotiable}
                className="w-full pl-10 p-3 border rounded-xl disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="20000"
              />
            </div>
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={wageNegotiable}
                onChange={(e) => setWageNegotiable(e.target.checked)}
                className="h-4 w-4"
              />
              {t('jobForm.wageNegotiableLabel')}
            </label>
          </div>

          <div>
            <label htmlFor="post-job-description" className="block text-sm font-bold text-gray-900 mb-1">{t('jobForm.descriptionLabel')}</label>
            <textarea
              id="post-job-description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border rounded-xl"
              placeholder={t('jobForm.descriptionPlaceholder')}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
              <Phone size={16} className="text-blue-600" /> {t('jobForm.phoneSectionLabel')}
            </label>
            <div className="space-y-2">
              <label className={`flex items-start gap-2 p-3 bg-white rounded-lg border cursor-pointer ${phoneMode === 'default' ? 'border-blue-500' : 'border-gray-200'} ${!hospitalMobile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="phone-mode"
                  checked={phoneMode === 'default'}
                  disabled={!hospitalMobile}
                  onChange={() => setPhoneMode('default')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">{t('jobForm.phoneDefaultOption')}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {hospitalMobile
                      ? hospitalMobile
                      : t('jobForm.noHospitalMobileHint')}
                  </div>
                </div>
              </label>
              <label className={`flex items-start gap-2 p-3 bg-white rounded-lg border cursor-pointer ${phoneMode === 'custom' ? 'border-blue-500' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  name="phone-mode"
                  checked={phoneMode === 'custom'}
                  onChange={() => setPhoneMode('custom')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">{t('jobForm.phoneCustomOption')}</div>
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    onFocus={() => setPhoneMode('custom')}
                    placeholder={t('jobForm.phonePlaceholder')}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <label htmlFor="post-job-kakao" className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
              <MessageCircle size={16} className="text-yellow-600" /> {t('jobForm.kakaoLabel')} <span className="text-xs font-normal text-gray-500">{t('jobForm.optionalTag')}</span>
            </label>
            <input
              id="post-job-kakao"
              type="url"
              value={kakaoLink}
              onChange={(e) => setKakaoLink(e.target.value)}
              className="w-full p-3 border border-yellow-300 rounded-xl bg-white"
              placeholder="https://open.kakao.com/o/..."
            />
            <p className="text-xs text-gray-500 mt-1">{t('jobForm.kakaoHint')}</p>
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg mt-4 disabled:bg-gray-400"
          >
            {loading ? t('jobForm.submitting') : t('jobForm.submitPost')}
          </button>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-gray-500 py-2 flex items-center gap-1 hover:text-gray-900"
            >
              <ArrowLeft size={16} /> {t('jobForm.cancelBackPost')}
            </button>
            <LanguageSwitcher />
          </div>
        </form>
      </div>
    </div>
  );
}
