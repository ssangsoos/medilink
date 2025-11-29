// src/app/register/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building, Stethoscope, ArrowRight, ArrowLeft, Check, MapPin } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import AddressSearch from '@/components/AddressSearch';

// 직종 목록
const JOB_CATEGORIES = [
  "의사", "치과의사", "한의사", 
  "간호사", "간호조무사", "치과위생사", 
  "코디네이터", "기타"
];

// 병원 구분 목록
const HOSPITAL_TYPES = [
  "치과 병의원", 
  "일반 의과 병의원", 
  "한방 병의원", 
  "요양병원", 
  "기타"
];

function RegisterContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role');

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<'hospital' | 'worker' | null>(
    (initialRole === 'hospital' || initialRole === 'worker') ? initialRole : null
  );
  
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', hospitalName: '', licenseNumber: '',
    phoneNumber: '', address: '', detailAddress: '', 
    jobCategory: '', hospitalType: '',
  });

  useEffect(() => {
    if (initialRole === 'hospital' || initialRole === 'worker') {
      setStep(2);
    }
  }, [initialRole]);

  const handleNext = () => { if (role) setStep(2); };
  const handleAddressSelect = (selectedAddress: string) => { setFormData({ ...formData, address: selectedAddress }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let lat = 0, lng = 0;
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; 
        if (apiKey && formData.address) {
          const encodedAddress = encodeURIComponent(formData.address);
          const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`);
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            lat = geoData.results[0].geometry.location.lat;
            lng = geoData.results[0].geometry.location.lng;
          }
        }
      } catch (geoError) { console.error(geoError); }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email, password: formData.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('회원가입 실패');

      const fullAddress = formData.detailAddress ? `${formData.address} ${formData.detailAddress}` : formData.address;
      
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id, email: formData.email, role: role, name: formData.name,
        hospital_name: role === 'hospital' ? formData.hospitalName : null,
        hospital_type: role === 'hospital' ? formData.hospitalType : null,
        license_number: role === 'worker' ? formData.licenseNumber : null,
        job_category: role === 'worker' ? formData.jobCategory : null,
        phone_number: formData.phoneNumber, address: fullAddress, latitude: lat, longitude: lng,
      });
      
      if (profileError) throw profileError;

      alert('가입이 완료되었습니다! 메인 페이지로 이동합니다.');
      window.location.href = '/';
    } catch (error: any) { alert(`에러 발생: ${error.message}`); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* 왼쪽 패널 */}
        <div className={`md:w-1/2 p-12 text-white flex flex-col justify-between transition-colors duration-500 ${role === 'worker' ? 'bg-purple-800' : 'bg-blue-600'}`}>
          <div>
            <h1 className="text-3xl font-bold mb-4">{step === 1 ? "메디링크 시작하기" : "정보 입력"}</h1>
            <p className="text-white/90 text-lg">
              {step === 1 ? "의료 공백을 채우는 스마트한 방법.\n지금 바로 매칭을 시작하세요." : role === 'hospital' ? "병원 정보를 입력하고\n검증된 의료 인력을 만나보세요." : "프로필을 등록하고\n원하는 조건의 병원을 찾아보세요."}
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 opacity-80">
              <div className="p-2 bg-white/20 rounded-lg">{role === 'worker' ? <Stethoscope size={20}/> : <Building size={20}/>}</div>
              <span>{role === 'worker' ? "의료 전문가를 위한 커리어 관리" : "신뢰할 수 있는 병원 네트워크"}</span>
            </div>
          </div>
        </div>

        {/* 오른쪽 입력 폼 */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center">
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">어떤 분이신가요?</h2>
              <div className="space-y-4">
                <button onClick={() => setRole('hospital')} className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${role === 'hospital' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
                  <div className={`p-3 rounded-full ${role === 'hospital' ? 'bg-blue-200' : 'bg-gray-100'}`}><Building size={24} className={role === 'hospital' ? 'text-blue-700' : 'text-gray-500'} /></div>
                  <div className="text-left"><div className="font-bold text-lg">병원 / 의료기관</div><div className="text-sm text-gray-500">의료 인력이 필요합니다</div></div>
                </button>
                <button onClick={() => setRole('worker')} className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${role === 'worker' ? 'border-purple-700 bg-purple-50 text-purple-800' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}>
                  <div className={`p-3 rounded-full ${role === 'worker' ? 'bg-purple-200' : 'bg-gray-100'}`}><Stethoscope size={24} className={role === 'worker' ? 'text-purple-800' : 'text-gray-500'} /></div>
                  <div className="text-left"><div className="font-bold text-lg">의료 전문가</div><div className="text-sm text-gray-500">일할 병원을 찾고 있습니다</div></div>
                </button>
              </div>
              <button onClick={handleNext} disabled={!role} className={`mt-8 w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors ${role ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>다음 단계로 <ArrowRight size={20} /></button>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!initialRole && (
                <button type="button" onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-2 text-sm"><ArrowLeft size={16}/> 뒤로가기</button>
              )}
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{role === 'hospital' ? '병원 정보 입력' : '의료인 프로필 입력'}</h2>

              <div><label className="block text-sm font-medium text-gray-700 mb-1">이메일</label><input type="email" required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="name@example.com" onChange={(e) => setFormData({...formData, email: e.target.value})}/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label><input type="password" required minLength={6} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="6자리 이상" onChange={(e) => setFormData({...formData, password: e.target.value})}/></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{role === 'hospital' ? '담당자 성함' : '성함'}</label><input type="text" required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="홍길동" onChange={(e) => setFormData({...formData, name: e.target.value})}/></div>
              
              {/* 🆕 [수정] 연락처 안내 문구 개선 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {role === 'hospital' ? '연락처 (지원자가 연락할 번호)' : '연락처 (휴대폰)'}
                </label>
                <input 
                  type="tel" 
                  required 
                  className="w-full p-3 border border-gray-300 rounded-lg" 
                  placeholder={role === 'hospital' ? "02-1234-5678 또는 010-..." : "010-1234-5678"}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {role === 'hospital' 
                    ? "⚠️ 채용 공고에 노출되어 지원자가 전화할 수 있습니다." 
                    : "🔒 안심하세요! 개인 회원의 번호는 지도에 공개되지 않습니다."}
                </p>
              </div>

              {role === 'hospital' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">병원 구분</label>
                  <select required className="w-full p-3 border border-gray-300 rounded-lg bg-white" onChange={(e) => setFormData({...formData, hospitalType: e.target.value})}>
                    <option value="">선택해주세요</option>
                    {HOSPITAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              )}

              {role === 'worker' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직종 선택</label>
                  <select required className="w-full p-3 border border-gray-300 rounded-lg bg-white" onChange={(e) => setFormData({...formData, jobCategory: e.target.value})}>
                    <option value="">선택해주세요</option>
                    {JOB_CATEGORIES.map((job) => <option key={job} value={job}>{job}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소 (클릭하여 검색)</label>
                <div onClick={() => setShowAddressModal(true)} className="w-full p-3 border border-gray-300 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 bg-white"><MapPin size={18} className="text-gray-400" /><span className={formData.address ? "text-black" : "text-gray-400"}>{formData.address || "주소를 검색해주세요"}</span></div>
                {formData.address && (
                  <div className="mt-2">
                    <input type="text" placeholder="상세 주소 (예: 2층, 301호)" className="w-full p-3 border border-gray-300 rounded-lg" onChange={(e) => setFormData({...formData, detailAddress: e.target.value})}/>
                    {role === 'worker' && <p className="text-xs text-gray-500 mt-1">🔒 안심하세요! 개인 회원의 상세 주소는 지도에 공개되지 않습니다.</p>}
                  </div>
                )}
              </div>

              {role === 'hospital' && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">병원명</label><input type="text" required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="연세바로치과" onChange={(e) => setFormData({...formData, hospitalName: e.target.value})}/></div>
              )}
              {role === 'worker' && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">면허번호</label><input type="text" required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="123456" onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}/></div>
              )}

              <button type="submit" disabled={loading} className={`mt-6 w-full py-4 rounded-lg font-bold text-lg text-white shadow-lg transition-transform hover:scale-[1.02] ${role === 'worker' ? 'bg-purple-800 hover:bg-purple-900' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? '가입 처리 중...' : '가입 완료하기'} <Check size={20} className="inline ml-1"/>
              </button>
            </form>
          )}
        </div>
        {showAddressModal && <AddressSearch onComplete={handleAddressSelect} onClose={() => setShowAddressModal(false)} />}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}