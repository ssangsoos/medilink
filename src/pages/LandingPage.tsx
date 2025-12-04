import { Link } from 'react-router-dom';
import { Building2, Stethoscope, LogIn } from 'lucide-react';

export default function LandingPage() {
  return (
    // 전체 화면 높이 고정
    <div className="h-[100dvh] bg-gray-50 flex flex-col p-4 overflow-hidden">
      
      {/* 1. 상단 타이틀 영역 */}
      <div className="text-center py-4 md:py-10 shrink-0">
        <h1 className="text-2xl md:text-5xl font-extrabold text-gray-900 leading-tight">
          우리 동네 의료 인력,<br className="md:hidden" /> 지도에서 찾기
        </h1>
        <p className="text-sm md:text-xl text-gray-600 mt-2">
          복잡한 절차 없이 위치 기반으로 즉시 연결됩니다.
        </p>
      </div>

      {/* 2. 3가지 선택 버튼 영역 */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 min-h-0 w-full max-w-6xl mx-auto">
        
        {/* [병의원] 카드 */}
        <Link
          to="/register/hospital"
          className="group flex flex-row md:flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-600 hover:shadow-xl transition-all duration-300 h-full w-full"
        >
          <div className="h-12 w-12 md:h-24 md:w-24 bg-blue-100 rounded-full flex items-center justify-center mr-4 md:mr-0 md:mb-6 shrink-0 group-hover:scale-110 transition-transform">
            <Building2 className="h-6 w-6 md:h-12 md:w-12 text-blue-600" />
          </div>
          <div className="text-left md:text-center">
            <h3 className="text-lg md:text-2xl font-bold text-gray-900">병의원 가입</h3>
            <p className="text-gray-500 text-xs md:text-sm mt-1 mb-0 md:mb-4 break-keep">
              즉시 인력이 필요한가요?
            </p>
            <span className="hidden md:inline-block w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl mt-2 group-hover:bg-blue-700">
              병원 가입하기
            </span>
          </div>
          <div className="ml-auto md:hidden text-blue-600 font-bold text-sm">
            가입 &rarr;
          </div>
        </Link>

        {/* [의료인] 카드 */}
        <Link
          to="/register/worker"
          className="group flex flex-row md:flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-purple-800 hover:shadow-xl transition-all duration-300 h-full w-full"
        >
          <div className="h-12 w-12 md:h-24 md:w-24 bg-purple-100 rounded-full flex items-center justify-center mr-4 md:mr-0 md:mb-6 shrink-0 group-hover:scale-110 transition-transform">
            <Stethoscope className="h-6 w-6 md:h-12 md:w-12 text-purple-900" />
          </div>
          <div className="text-left md:text-center">
            <h3 className="text-lg md:text-2xl font-bold text-gray-900">의료인 가입</h3>
            <p className="text-gray-500 text-xs md:text-sm mt-1 mb-0 md:mb-4 break-keep">
              파트타임으로 근처에 있는 일자리를 찾으시나요?
            </p>
            <span className="hidden md:inline-block w-full py-3 px-6 bg-purple-900 text-white font-bold rounded-xl mt-2 group-hover:bg-purple-950">
              의료인 가입하기
            </span>
          </div>
          <div className="ml-auto md:hidden text-purple-900 font-bold text-sm">
            가입 &rarr;
          </div>
        </Link>

        {/* [로그인] 카드 */}
        <Link
          to="/login"
          className="group flex flex-row md:flex-col items-center justify-center p-4 bg-gray-100 rounded-2xl shadow-inner border-2 border-transparent hover:bg-white hover:border-gray-400 hover:shadow-xl transition-all duration-300 h-full w-full"
        >
          <div className="h-12 w-12 md:h-24 md:w-24 bg-gray-200 rounded-full flex items-center justify-center mr-4 md:mr-0 md:mb-6 shrink-0 group-hover:scale-110 transition-transform">
            <LogIn className="h-6 w-6 md:h-12 md:w-12 text-gray-600" />
          </div>
          <div className="text-left md:text-center">
            <h3 className="text-lg md:text-2xl font-bold text-gray-900">로그인</h3>
            <p className="text-gray-500 text-xs md:text-sm mt-1 mb-0 md:mb-4">이미 계정이 있나요?</p>
            <span className="hidden md:inline-block w-full py-3 px-6 bg-gray-800 text-white font-bold rounded-xl mt-2 group-hover:bg-black">
              로그인하기
            </span>
          </div>
           <div className="ml-auto md:hidden text-gray-700 font-bold text-sm">
            로그인 &rarr;
          </div>
        </Link>

      </div>
      
      <div className="text-center py-2 text-xs text-gray-400 shrink-0">
        © Medilink. All rights reserved.
      </div>
    </div>
  );
}