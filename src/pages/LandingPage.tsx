import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Footer from '../components/Footer'; 

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center relative overflow-hidden">
      
      {/* 배경 장식 요소들 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-auto px-6 py-12 flex flex-col items-center">
        
        {/* 로고 영역 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="h-20 w-20 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl shadow-xl flex items-center justify-center mb-4 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-white text-4xl font-bold">M</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight text-center">
            Medinoti
          </h1>
          <p className="text-gray-500 mt-2 text-center text-lg">
            의료인 구인구직의 새로운 기준
          </p>
        </div>

        {/* 메인 카드 영역 */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full border border-white/20">
          <div className="space-y-4">
            
            {/* 병원 회원 버튼 (링크 수정됨) */}
            <Link 
              to="/register/hospital" 
              className="group relative w-full flex items-center p-4 bg-white border-2 border-blue-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all duration-200"
            >
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">병원 회원가입</h3>
                <p className="text-sm text-gray-500">인재를 찾고 계신가요?</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>

            {/* 의료인 회원 버튼 (링크 수정됨) */}
            <Link 
              to="/register/worker"
              className="group relative w-full flex items-center p-4 bg-white border-2 border-purple-100 rounded-xl hover:border-purple-500 hover:shadow-md transition-all duration-200"
            >
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600">의료인 회원가입</h3>
                <p className="text-sm text-gray-500">좋은 일자리를 찾고 계신가요?</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>

            {/* 로그인 섹션 */}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <Link to="/login" className="group flex flex-row md:flex-col items-center justify-center p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                 <div className="h-14 w-14 md:h-24 md:w-24 bg-gray-200 rounded-full flex items-center justify-center mb-0 md:mb-4 mr-4 md:mr-0 group-hover:bg-gray-300 transition-colors">
                    <LogIn className="h-7 w-7 md:h-12 md:w-12 text-gray-600" />
                 </div>
                 <div className="text-left md:text-center flex-1">
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900">로그인</h3>
                    <p className="text-gray-500 text-xs md:text-sm mt-1 mb-0 md:mb-4">이미 계정이 있나요?</p>
                    <span className="hidden md:inline-block w-full py-3 px-6 bg-gray-800 text-white font-bold rounded-lg group-hover:bg-gray-900 transition-colors text-center">
                      로그인하기
                    </span>
                 </div>
              </Link>
            </div>

          </div>
        </div>
        
        {/* Footer 삽입 */}
        <Footer />
        
      </div>
    </div>
  );
}