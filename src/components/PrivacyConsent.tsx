// src/components/PrivacyConsent.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';

interface Props {
  onValidChange: (allRequiredChecked: boolean) => void;
  showThirdParty?: boolean; // 의료인력 회원만 제3자 제공 동의 표시
}

export default function PrivacyConsent({ onValidChange, showThirdParty = false }: Props) {
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const updateValidity = (p: boolean, t: boolean, a: boolean) => {
    onValidChange(p && t && a);
  };

  const handlePrivacy = (v: boolean) => {
    setPrivacy(v);
    updateValidity(v, terms, ageConfirm);
  };
  const handleTerms = (v: boolean) => {
    setTerms(v);
    updateValidity(privacy, v, ageConfirm);
  };
  const handleAge = (v: boolean) => {
    setAgeConfirm(v);
    updateValidity(privacy, terms, v);
  };

  const handleAllCheck = (checked: boolean) => {
    setPrivacy(checked);
    setTerms(checked);
    setAgeConfirm(checked);
    if (showThirdParty) setThirdParty(checked);
    onValidChange(checked);
  };

  const allChecked = privacy && terms && ageConfirm && (!showThirdParty || thirdParty);

  return (
    <div className="mt-4 mb-6 space-y-3">

      {/* 전체 동의 */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <input
          type="checkbox"
          id="all-agree"
          checked={allChecked}
          onChange={(e) => handleAllCheck(e.target.checked)}
          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <label htmlFor="all-agree" className="text-sm font-bold text-gray-900 cursor-pointer select-none">
          전체 동의하기
        </label>
      </div>

      <div className="pl-2 space-y-2">
        {/* [필수] 개인정보 수집·이용 동의 */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="privacy"
            checked={privacy}
            onChange={(e) => handlePrivacy(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label htmlFor="privacy" className="text-sm font-bold text-gray-800 cursor-pointer select-none">
              [필수] 개인정보 수집 및 이용 동의
            </label>
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="text-xs text-gray-500 flex items-center mt-0.5 hover:text-blue-600 underline"
            >
              내용 보기 <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* [필수] 이용약관 동의 */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            checked={terms}
            onChange={(e) => handleTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label htmlFor="terms" className="text-sm font-bold text-gray-800 cursor-pointer select-none">
              [필수] 이용약관 동의
            </label>
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="text-xs text-gray-500 flex items-center mt-0.5 hover:text-blue-600 underline"
            >
              내용 보기 <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* [필수] 만 14세 이상 확인 */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="age-confirm"
            checked={ageConfirm}
            onChange={(e) => handleAge(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="age-confirm" className="text-sm font-bold text-gray-800 cursor-pointer select-none">
            [필수] 만 14세 이상입니다
          </label>
        </div>

        {/* [선택] 제3자 제공 동의 - 의료인력만 */}
        {showThirdParty && (
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="third-party"
              checked={thirdParty}
              onChange={(e) => setThirdParty(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="third-party" className="text-sm font-bold text-gray-800 cursor-pointer select-none">
                [선택] 제3자 제공 동의 (연락처 병원 공개)
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                채용 제안을 위해 이름, 연락처, 면허종류가 병원 회원에게 공개됩니다.
                동의하지 않아도 가입 가능하며, 대시보드에서 언제든 변경할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 개인정보 수집·이용 모달 */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">개인정보 수집 및 이용 동의</h3>
              <button onClick={() => setIsPrivacyOpen(false)} className="text-gray-500 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
              <p><strong>(주)스마일업</strong>은 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>수집 항목:</strong> 이름, 전화번호, 주소, 이메일, 비밀번호, 면허정보(의료인력), 사업자정보(병원)</li>
                <li><strong>수집 목적:</strong> 구인구직 매칭, 회원 관리, 서비스 제공</li>
                <li><strong>보유 기간:</strong> 회원 탈퇴 시까지 (법령에 따른 보존 기간 별도)</li>
              </ul>
              <p className="text-red-500 font-bold mt-2">동의를 거부할 수 있으나, 서비스 이용이 제한됩니다.</p>
              <Link to="/privacy" className="inline-block mt-3 text-xs text-blue-600 underline hover:text-blue-800">
                개인정보처리방침 전문 보기
              </Link>
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => { setIsPrivacyOpen(false); handlePrivacy(true); }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
              >
                동의하고 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이용약관 모달 */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">이용약관</h3>
              <button onClick={() => setIsTermsOpen(false)} className="text-gray-500 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
              <p><strong>제1조 (목적)</strong><br />본 약관은 주식회사 스마일업이 운영하는 메디노티(Medinoti) 서비스의 이용 조건 및 절차, 회사와 회원 간의 권리·의무를 규정합니다.</p>
              <p><strong>제4조 (회원가입)</strong><br />회원가입은 본 약관에 동의하고, 정해진 양식에 따라 정보를 기입하여 신청합니다. 허위 정보 기재, 타인 명의 이용, 만 14세 미만은 가입이 거부될 수 있습니다.</p>
              <p><strong>제9조 (회원 탈퇴)</strong><br />회원은 언제든지 탈퇴할 수 있으며, 관계 법령에 따라 일부 정보는 일정 기간 보관됩니다.</p>
              <p><strong>제10조 (면책)</strong><br />회사는 회원 간 분쟁에 개입할 의무가 없으며, 게재된 정보의 정확성을 보증하지 않습니다.</p>
              <Link to="/terms" className="inline-block mt-3 text-xs text-blue-600 underline hover:text-blue-800">
                이용약관 전문 보기
              </Link>
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => { setIsTermsOpen(false); handleTerms(true); }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
              >
                동의하고 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
