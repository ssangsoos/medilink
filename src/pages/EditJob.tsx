import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageCircle, Calendar, Infinity as InfinityIcon, Briefcase, AlertCircle } from 'lucide-react';
import { MEDICAL_LICENSE_TYPES, JOB_CATEGORY_OTHER } from '../lib/medicalConstants';
import type { JobPosting, ScheduleType } from '../types/jobPosting';

const DESCRIPTION_PLACEHOLDER = '예) 임플란트 수술 어시스트 경험자 우대. 숙련도에 따라 시급 협의 (일반적으로 2~4만원 선).';

export default function EditJob() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [jobCategoryCustom, setJobCategoryCustom] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('specific');
  const [hourlyRate, setHourlyRate] = useState('');
  const [wageNegotiable, setWageNegotiable] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [kakaoLink, setKakaoLink] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setNotFound(true);
        setFetching(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', id)
        .eq('hospital_id', user.id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setFetching(false);
        return;
      }

      const job = data as JobPosting;
      setTitle(job.title ?? '');
      setDescription(job.description ?? '');
      setJobCategory(job.job_category ?? '');
      setJobCategoryCustom(job.job_category_custom ?? '');
      setScheduleType((job.schedule_type as ScheduleType) ?? 'specific');
      setHourlyRate(job.hourly_rate != null ? String(job.hourly_rate) : '');
      setWageNegotiable(job.wage_negotiable ?? false);
      setStartDate(job.work_start_date ?? '');
      setEndDate(job.work_end_date ?? '');
      setStartTime(job.work_start_time ?? '');
      setEndTime(job.work_end_time ?? '');
      setKakaoLink(job.kakao_link ?? '');
      setFetching(false);
    };

    load();
  }, [id, navigate]);

  const isOther = jobCategory === JOB_CATEGORY_OTHER;
  const hasLegacyEmptyFields = !jobCategory;

  const validate = (): string | null => {
    if (!jobCategory) return '구인 직종을 선택해주세요.';
    if (isOther && !jobCategoryCustom.trim()) return '기타 직종명을 입력해주세요.';
    if (scheduleType === 'specific') {
      if (!startDate || !endDate || !startTime || !endTime) {
        return '특정 일시를 선택한 경우 근무일/시간을 모두 입력해주세요.';
      }
      if (startDate > endDate) return '종료일이 시작일보다 빠를 수 없습니다.';
      if (startDate === endDate && startTime >= endTime) {
        return '같은 날짜 내 종료 시간은 시작 시간보다 늦어야 합니다.';
      }
    }
    if (!wageNegotiable) {
      const wage = Number(hourlyRate);
      if (!hourlyRate || Number.isNaN(wage) || wage <= 0) {
        return '시급을 입력하거나 "시급 협의 가능"을 선택해주세요.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      alert(errorMsg);
      return;
    }
    if (!id) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const payload = {
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
        kakao_link: kakaoLink,
      };

      const { error } = await supabase
        .from('job_postings')
        .update(payload)
        .eq('id', id)
        .eq('hospital_id', user.id);

      if (error) throw error;

      alert('공고가 수정되었습니다.');
      navigate('/hospital/jobs');
    } catch (error: any) {
      alert('수정 실패: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">공고를 불러오는 중...</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle size={40} className="text-gray-400" />
        <p className="text-gray-700 font-bold">공고를 찾을 수 없거나 접근 권한이 없습니다.</p>
        <button
          onClick={() => navigate('/hospital/jobs')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
        >
          내 공고 목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-center text-white">
          <h2 className="text-2xl font-bold">공고 수정</h2>
        </div>

        {hasLegacyEmptyFields && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-4 text-sm text-yellow-900 flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>
              이 공고는 업데이트된 필수 항목(구인 직종 등)이 비어 있습니다. 저장하려면 모든 항목을 채워주세요.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label htmlFor="edit-job-title" className="block text-sm font-bold text-gray-900 mb-1">공고 제목</label>
            <input
              id="edit-job-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-xl"
            />
          </div>

          <div>
            <label htmlFor="edit-job-category" className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
              <Briefcase size={16} className="text-blue-600" /> 구인 직종
            </label>
            <select
              id="edit-job-category"
              required
              value={jobCategory}
              onChange={(e) => setJobCategory(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white"
            >
              <option value="">직종을 선택해주세요</option>
              {MEDICAL_LICENSE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
              <option value={JOB_CATEGORY_OTHER}>{JOB_CATEGORY_OTHER} (직접 입력)</option>
            </select>
            {isOther && (
              <input
                type="text"
                required
                maxLength={30}
                value={jobCategoryCustom}
                onChange={(e) => setJobCategoryCustom(e.target.value)}
                className="w-full p-3 border rounded-xl mt-2"
                placeholder="직종명을 입력해주세요 (최대 30자)"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">근무 일시</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setScheduleType('specific')}
                className={`p-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${scheduleType === 'specific' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <Calendar size={16} /> 특정 일시 지정
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('always')}
                className={`p-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${scheduleType === 'always' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <InfinityIcon size={16} /> 항시 구인
              </button>
            </div>

            {scheduleType === 'specific' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-job-start-date" className="block text-xs font-bold text-gray-600 mb-1">근무 시작일</label>
                    <input id="edit-job-start-date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div>
                    <label htmlFor="edit-job-end-date" className="block text-xs font-bold text-gray-600 mb-1">근무 종료일</label>
                    <input id="edit-job-end-date" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="edit-job-start-time" className="block text-xs font-bold text-gray-600 mb-1">시작 시간</label>
                    <input id="edit-job-start-time" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div>
                    <label htmlFor="edit-job-end-time" className="block text-xs font-bold text-gray-600 mb-1">종료 시간</label>
                    <input id="edit-job-end-time" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
                <InfinityIcon size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>항시 구인 모드입니다.</strong> 특정 날짜 없이 상시 인력을 구합니다.
                </span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="edit-job-hourly-rate" className="block text-sm font-bold text-gray-900 mb-1">시급 (원)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg pointer-events-none">₩</span>
              <input
                id="edit-job-hourly-rate"
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
              시급 협의 가능 (구체 금액은 면접/상담 시 확정)
            </label>
          </div>

          <div>
            <label htmlFor="edit-job-description" className="block text-sm font-bold text-gray-900 mb-1">상세 업무 내용</label>
            <textarea
              id="edit-job-description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border rounded-xl"
              placeholder={DESCRIPTION_PLACEHOLDER}
            />
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <label htmlFor="edit-job-kakao" className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
              <MessageCircle size={16} className="text-yellow-600" /> 카카오톡 오픈채팅방 링크
            </label>
            <input
              id="edit-job-kakao"
              type="url"
              required
              value={kakaoLink}
              onChange={(e) => setKakaoLink(e.target.value)}
              className="w-full p-3 border border-yellow-300 rounded-xl bg-white"
              placeholder="https://open.kakao.com/o/..."
            />
          </div>

          <button
            disabled={saving}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg mt-4 disabled:bg-gray-400"
          >
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/hospital/jobs')}
            className="w-full text-gray-500 py-2 flex items-center justify-center gap-1 hover:text-gray-900"
          >
            <ArrowLeft size={16} /> 내 공고 목록으로
          </button>
        </form>
      </div>
    </div>
  );
}
