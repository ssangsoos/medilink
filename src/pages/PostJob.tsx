import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, DollarSign, MessageCircle } from 'lucide-react'; 

export default function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hospitalLocation, setHospitalLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [kakaoLink, setKakaoLink] = useState('');

  useEffect(() => {
    const fetchHospitalInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('latitude, longitude')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setHospitalLocation({ lat: data.latitude, lng: data.longitude });
        }
      }
    };
    fetchHospitalInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error } = await supabase
        .from('job_postings')
        .insert([
          {
            hospital_id: user.id,
            title,
            description,
            hourly_rate: Number(hourlyRate),
            work_start_date: startDate,
            work_end_date: endDate,
            work_start_time: startTime,
            work_end_time: endTime,
            kakao_link: kakaoLink,
            status: 'active',
            latitude: hospitalLocation?.lat,
            longitude: hospitalLocation?.lng
          }
        ]);

      if (error) throw error;

      alert('공고가 성공적으로 등록되었습니다!');
      navigate('/dashboard');

    } catch (error: any) {
      alert('등록 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <div className="bg-blue-600 p-6 text-center text-white">
          <h2 className="text-2xl font-bold">새 채용 공고 등록</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">공고 제목</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="예: 치과위생사 대타 구합니다" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">상세 업무 내용</label>
            <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="업무 내용, 자격 요건 등" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">시급 (원)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="number" required value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="w-full pl-10 p-3 border rounded-xl" placeholder="20000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">근무 시작일</label>
              <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">근무 종료일</label>
              <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">시작 시간</label>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-3 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">종료 시간</label>
              <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-3 border rounded-xl" />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <label className="block text-sm font-bold text-gray-900 mb-1 flex items-center gap-1">
              <MessageCircle size={16} className="text-yellow-600" /> 카카오톡 오픈채팅방 링크
            </label>
            <input type="url" required value={kakaoLink} onChange={(e) => setKakaoLink(e.target.value)} className="w-full p-3 border border-yellow-300 rounded-xl bg-white" placeholder="https://open.kakao.com/o/..." />
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg mt-4 disabled:bg-gray-400">
            {loading ? '등록 중...' : '공고 등록 완료'}
          </button>

          <button type="button" onClick={() => navigate('/dashboard')} className="w-full text-gray-500 py-2 flex items-center justify-center gap-1 hover:text-gray-900">
            <ArrowLeft size={16} /> 취소하고 돌아가기
          </button>

        </form>
      </div>
    </div>
  );
}