import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../components/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-gray-500 hover:text-gray-800">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">이용약관</h1>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-10 text-sm text-gray-700 leading-relaxed space-y-8">

          <div>
            <p className="text-gray-500 text-xs mb-4">시행일: 2026년 3월 29일</p>
            <p>
              본 약관은 <strong>주식회사 스마일업</strong>(이하 "회사")이 운영하는 메디노티(Medinoti) 서비스(이하 "서비스")의
              이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </div>

          {/* 제1조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p>본 약관은 회사가 제공하는 의료인력 구인구직 매칭 플랫폼 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정합니다.</p>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제2조 (정의)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>"서비스"</strong>란 회사가 운영하는 메디노티(Medinoti) 웹 플랫폼을 통해 제공하는 의료인력 구인구직 매칭 및 관련 부가 서비스를 말합니다.</li>
              <li><strong>"회원"</strong>이란 본 약관에 동의하고 회원가입을 완료한 자를 말하며, 병원 회원과 의료인력 회원으로 구분됩니다.</li>
              <li><strong>"병원 회원"</strong>이란 의료인력의 채용을 목적으로 서비스에 가입한 의료기관을 말합니다.</li>
              <li><strong>"의료인력 회원"</strong>이란 구직을 목적으로 서비스에 가입한 의료 면허 또는 자격 소지자를 말합니다.</li>
            </ul>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 적용일자 7일 전부터 서비스 내 공지합니다.</li>
              <li>변경된 약관에 동의하지 않는 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제4조 (회원가입)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원가입은 이용자가 본 약관에 동의하고, 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 회원가입 신청을 함으로써 이루어집니다.</li>
              <li>회사는 다음 각 호에 해당하는 신청에 대하여는 승낙을 거부하거나 사후에 이용계약을 해지할 수 있습니다.
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>타인의 명의를 이용한 경우</li>
                  <li>허위의 정보를 기재한 경우</li>
                  <li>만 14세 미만인 경우</li>
                  <li>기타 회사가 정한 이용 요건에 미충족한 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제5조 (서비스의 제공 및 변경)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사는 다음과 같은 서비스를 제공합니다.
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>지도 기반 의료인력 매칭 서비스</li>
                  <li>구인 공고 등록 및 열람 서비스</li>
                  <li>의료인력 프로필 등록 및 관리 서비스</li>
                  <li>기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스</li>
                </ul>
              </li>
              <li>회사는 서비스의 내용을 변경할 수 있으며, 변경 시 변경 내용을 서비스 내에 공지합니다.</li>
            </ul>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제6조 (서비스의 중단)</h2>
            <p>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있으며, 이 경우 사전에 공지합니다. 다만, 불가피한 사유로 사전 공지가 불가능한 경우 사후에 공지할 수 있습니다.</p>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제7조 (회원의 의무)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원은 관계 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.</li>
              <li>회원은 다음 각 호의 행위를 하여서는 안 됩니다.
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>신청 또는 변경 시 허위 내용의 등록</li>
                  <li>타인의 정보 도용</li>
                  <li>서비스에 게시된 정보의 변경</li>
                  <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                  <li>회사 및 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                  <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                  <li>서비스를 이용하여 법령 또는 공서양속에 위반되는 내용을 유포하는 행위</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제8조 (회사의 의무)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사는 관련 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 지속적이고 안정적으로 서비스를 제공하기 위해 최선을 다합니다.</li>
              <li>회사는 회원의 개인정보 보호를 위해 개인정보처리방침을 수립하고 이를 준수합니다.</li>
              <li>회사는 서비스 이용과 관련한 회원의 의견이나 불만이 정당하다고 인정할 경우 이를 처리하여야 합니다.</li>
            </ul>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제9조 (회원 탈퇴 및 자격 상실)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원은 언제든지 서비스 내 탈퇴 기능을 통해 이용계약 해지를 신청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.</li>
              <li>탈퇴 시 회원의 개인정보는 개인정보처리방침에 따라 처리됩니다. 단, 관계 법령에 의해 보존이 필요한 정보는 해당 기간 동안 보관됩니다.</li>
              <li>회사는 회원이 본 약관을 위반한 경우 사전 통지 후 이용계약을 해지하거나 서비스 이용을 제한할 수 있습니다.</li>
            </ul>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제10조 (면책조항)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사는 회원 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임을 지지 않습니다.</li>
              <li>회사는 서비스에 게재된 채용 정보 및 인력 정보의 신뢰성, 정확성에 대해 보증하지 않습니다.</li>
              <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
            </ul>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">제11조 (분쟁해결)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사와 회원 간에 발생한 서비스 이용에 관한 분쟁에 대하여는 대한민국 법을 적용합니다.</li>
              <li>서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.</li>
            </ul>
          </section>

          {/* 부칙 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">부칙</h2>
            <p>본 약관은 2026년 3월 29일부터 시행합니다.</p>
          </section>

        </div>
      </div>

      <Footer />
    </div>
  );
}
