import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-gray-500 hover:text-gray-800">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">개인정보처리방침</h1>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-10 text-sm text-gray-700 leading-relaxed space-y-8">

          <div>
            <p className="text-gray-500 text-xs mb-4">시행일: 2026년 3월 29일</p>
            <p>
              <strong>주식회사 스마일업</strong>(이하 "회사")은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고
              이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
          </div>

          {/* 제1조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (개인정보의 처리 목적)</h2>
            <p className="mb-2">회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>회원 가입 및 관리:</strong> 회원제 서비스 이용에 따른 본인확인, 개인식별, 가입의사 확인, 부정이용 방지</li>
              <li><strong>서비스 제공:</strong> 의료인 구인구직 매칭, 지도 기반 위치 서비스, 채용 정보 제공</li>
              <li><strong>고충 처리:</strong> 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리 결과 통보</li>
            </ul>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (개인정보의 처리 및 보유 기간)</h2>
            <p className="mb-2">회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-xs mt-2">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">구분</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">보유 기간</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">근거 법령</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">회원 가입 및 관리</td>
                    <td className="border border-gray-200 px-3 py-2">회원 탈퇴 시까지</td>
                    <td className="border border-gray-200 px-3 py-2">개인정보 보호법</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">계약 또는 청약철회 등에 관한 기록</td>
                    <td className="border border-gray-200 px-3 py-2">5년</td>
                    <td className="border border-gray-200 px-3 py-2">전자상거래 등에서의 소비자보호에 관한 법률</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">대금결제 및 재화 등의 공급에 관한 기록</td>
                    <td className="border border-gray-200 px-3 py-2">5년</td>
                    <td className="border border-gray-200 px-3 py-2">전자상거래 등에서의 소비자보호에 관한 법률</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">소비자의 불만 또는 분쟁 처리에 관한 기록</td>
                    <td className="border border-gray-200 px-3 py-2">3년</td>
                    <td className="border border-gray-200 px-3 py-2">전자상거래 등에서의 소비자보호에 관한 법률</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">접속에 관한 기록(로그)</td>
                    <td className="border border-gray-200 px-3 py-2">3개월</td>
                    <td className="border border-gray-200 px-3 py-2">통신비밀보호법</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (처리하는 개인정보의 항목)</h2>
            <p className="mb-2">회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">1. 의료인력 회원</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>필수항목:</strong> 이름, 이메일, 비밀번호, 전화번호, 거주지 주소, 면허/자격 종류, 면허번호</li>
              <li><strong>자동수집항목:</strong> 위치 좌표(위도·경도)</li>
            </ul>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">2. 병원 회원</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>필수항목:</strong> 병원명, 이메일, 비밀번호, 연락처, 주소, 병원분류, 사업자등록번호</li>
              <li><strong>자동수집항목:</strong> 위치 좌표(위도·경도)</li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
            <p className="mb-2">회사는 정보주체의 동의를 받은 경우에 한하여 다음과 같이 개인정보를 제3자에게 제공합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-xs mt-2">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">제공받는 자</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">제공 항목</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">제공 목적</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">보유 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">병원 회원</td>
                    <td className="border border-gray-200 px-3 py-2">의료인력의 이름, 전화번호, 면허종류, 대략적 위치</td>
                    <td className="border border-gray-200 px-3 py-2">채용 제안 및 연락</td>
                    <td className="border border-gray-200 px-3 py-2">회원 탈퇴 시 또는 노출 해제 시까지</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">※ 의료인력 회원은 "노출 설정"을 통해 언제든지 제3자 제공을 중단할 수 있습니다.</p>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (개인정보 처리의 위탁)</h2>
            <p className="mb-2">회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-xs mt-2">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">수탁업체</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">Supabase Inc.</td>
                    <td className="border border-gray-200 px-3 py-2">데이터베이스 호스팅 및 회원 인증 처리</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">Google LLC</td>
                    <td className="border border-gray-200 px-3 py-2">지도 서비스 및 주소 검색(Google Maps API)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">카카오 주식회사</td>
                    <td className="border border-gray-200 px-3 py-2">주소 검색(Daum 우편번호 서비스)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (개인정보의 국외 이전)</h2>
            <p className="mb-2">회사는 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전하고 있습니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-xs mt-2">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">이전받는 자</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">이전되는 국가</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">이전 항목</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">이전 목적</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">Google LLC</td>
                    <td className="border border-gray-200 px-3 py-2">미국</td>
                    <td className="border border-gray-200 px-3 py-2">주소, 위치 좌표</td>
                    <td className="border border-gray-200 px-3 py-2">지도 표시 및 주소 검색</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">※ 데이터베이스(Supabase)는 한국(서울) 리전에서 운영되고 있습니다.</p>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제7조 (개인정보의 파기 절차 및 방법)</h2>
            <p className="mb-2">회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>파기 절차:</strong> 회원 탈퇴 시 즉시 파기하며, 법령에 따라 보존이 필요한 정보는 해당 기간 경과 후 파기합니다.</li>
              <li><strong>파기 방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
            </ul>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제8조 (정보주체의 권리·의무 및 행사 방법)</h2>
            <p className="mb-2">정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="mt-2">위 권리 행사는 서비스 내 프로필 수정 기능을 통해 직접 처리하거나, 고객센터(ssangsoos@gmail.com, 032-473-2222)로 연락하여 행사할 수 있습니다.</p>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제9조 (개인정보의 안전성 확보 조치)</h2>
            <p className="mb-2">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>비밀번호의 암호화 저장 및 관리</li>
              <li>개인정보에 대한 접근 제한 조치</li>
              <li>SSL/TLS를 이용한 전송 구간 암호화</li>
              <li>개인정보 접근 기록의 보관</li>
            </ul>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제10조 (개인정보 보호책임자)</h2>
            <p className="mb-2">회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
            <div className="bg-gray-50 rounded-xl p-4 mt-2">
              <p><strong>개인정보 보호책임자</strong></p>
              <ul className="mt-1 space-y-1">
                <li>성명: 안상수</li>
                <li>직위: 대표이사</li>
                <li>연락처: 032-473-2222</li>
                <li>이메일: ssangsoos@gmail.com</li>
              </ul>
            </div>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제11조 (권익침해 구제방법)</h2>
            <p className="mb-2">정보주체는 개인정보 침해로 인한 구제를 받기 위하여 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
              <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
              <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
              <li>경찰청: (국번없이) 182 (ecrm.cyber.go.kr)</li>
            </ul>
          </section>

          {/* 제12조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제12조 (개인정보 처리방침의 변경)</h2>
            <p>이 개인정보 처리방침은 2026년 3월 29일부터 적용됩니다. 변경 사항이 있을 경우 시행 7일 전부터 서비스 내 공지사항을 통해 고지할 것입니다.</p>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
