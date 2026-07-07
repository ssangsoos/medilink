// src/components/PrivacyConsent.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, X } from 'lucide-react';

interface Props {
  onValidChange: (allRequiredChecked: boolean) => void;
  showThirdParty?: boolean; // 의료인력 회원만 제3자 제공 동의 표시
}

export default function PrivacyConsent({ onValidChange, showThirdParty = false }: Props) {
  const { t } = useTranslation();
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const updateValidity = (p: boolean, tm: boolean, a: boolean) => {
    onValidChange(p && tm && a);
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
          {t('consent.allAgree')}
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
              {t('consent.privacyLabel')}
            </label>
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="text-xs text-gray-500 flex items-center mt-0.5 hover:text-blue-600 underline"
            >
              {t('consent.viewContent')} <ChevronRight size={12} />
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
              {t('consent.termsLabel')}
            </label>
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="text-xs text-gray-500 flex items-center mt-0.5 hover:text-blue-600 underline"
            >
              {t('consent.viewContent')} <ChevronRight size={12} />
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
            {t('consent.ageLabel')}
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
                {t('consent.thirdPartyLabel')}
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('consent.thirdPartyDesc')}
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
              <h3 className="font-bold text-lg">{t('consent.privacyModalTitle')}</h3>
              <button onClick={() => setIsPrivacyOpen(false)} className="text-gray-500 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
              <p><strong>{t('consent.companyName')}</strong>{t('consent.privacyIntroRest')}</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>{t('consent.collectItemsLabel')}</strong> {t('consent.collectItemsValue')}</li>
                <li><strong>{t('consent.collectPurposeLabel')}</strong> {t('consent.collectPurposeValue')}</li>
                <li><strong>{t('consent.retentionLabel')}</strong> {t('consent.retentionValue')}</li>
              </ul>
              <p className="text-red-500 font-bold mt-2">{t('consent.privacyWarn')}</p>
              <Link to="/privacy" className="inline-block mt-3 text-xs text-blue-600 underline hover:text-blue-800">
                {t('consent.privacyFullLink')}
              </Link>
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => { setIsPrivacyOpen(false); handlePrivacy(true); }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
              >
                {t('consent.agreeAndClose')}
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
              <h3 className="font-bold text-lg">{t('consent.termsModalTitle')}</h3>
              <button onClick={() => setIsTermsOpen(false)} className="text-gray-500 hover:text-black">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
              <p><strong>{t('consent.article1Title')}</strong><br />{t('consent.article1Body')}</p>
              <p><strong>{t('consent.article4Title')}</strong><br />{t('consent.article4Body')}</p>
              <p><strong>{t('consent.article9Title')}</strong><br />{t('consent.article9Body')}</p>
              <p><strong>{t('consent.article10Title')}</strong><br />{t('consent.article10Body')}</p>
              <Link to="/terms" className="inline-block mt-3 text-xs text-blue-600 underline hover:text-blue-800">
                {t('consent.termsFullLink')}
              </Link>
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => { setIsTermsOpen(false); handleTerms(true); }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
              >
                {t('consent.agreeAndClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
