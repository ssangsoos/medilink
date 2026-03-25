export default function Footer() {
  return (
    <footer className="bg-gray-100 py-8 px-4 mt-auto border-t border-gray-200">
      <div className="max-w-4xl mx-auto text-sm text-gray-600">
        
        {/* 서비스명 및 설명 */}
        <h4 className="font-bold text-lg text-gray-800 mb-2">메디노티 (Medinoti)</h4>
        <p className="mb-6 text-gray-500">
          병원과 의료인을 가장 빠르고 확실하게 연결하는 지도 기반 매칭 플랫폼<br />
          (치과위생사, 간호사, 간호조무사 구인구직)
        </p>

        {/* 사업자 정보 섹션 */}
        <div className="space-y-1">
          <div className="flex flex-col md:flex-row md:gap-4">
            <span><strong>상호명:</strong> 주식회사 스마일업</span>
            <span className="hidden md:inline">|</span>
            <span><strong>대표자:</strong> 안상수</span>
          </div>

          <div className="flex flex-col md:flex-row md:gap-4">
            <span><strong>사업자등록번호:</strong> 167-86-02585</span>
            <span className="hidden md:inline">|</span>
            <span><strong>통신판매업신고:</strong> 2025-용인수지-0147</span>
          </div>

          <div>
            <strong>주소:</strong> 인천 남동구 구월로 247 스마일업사무실
          </div>

          <div className="flex flex-col md:flex-row md:gap-4">
            <span><strong>고객센터:</strong> ssangsoos@gmail.com</span>
            <span className="hidden md:inline">|</span>
            <span><strong>연락처:</strong> 032-473-2222</span>
          </div>
        </div>

        {/* 카피라이트 */}
        <div className="mt-8 text-xs text-gray-400 border-t border-gray-200 pt-4">
          Copyright © {new Date().getFullYear()} SmileUp Corp. All rights reserved.
        </div>
      </div>
    </footer>
  );
}