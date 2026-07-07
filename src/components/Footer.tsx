import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-100 py-8 px-4 mt-auto border-t border-gray-200">
      <div className="max-w-4xl mx-auto text-sm text-gray-600">

        {/* 서비스명 및 설명 */}
        <h4 className="font-bold text-lg text-gray-800 mb-2">{t('footer.brand')}</h4>
        <p className="mb-6 text-gray-500">
          {t('footer.descriptionLine1')}<br />
          {t('footer.descriptionLine2')}
        </p>

        {/* 사업자 정보 섹션 */}
        <div className="space-y-1">
          <div className="flex flex-col md:flex-row md:gap-4">
            <span><strong>{t('footer.company')}:</strong> {t('footer.companyValue')}</span>
            <span className="hidden md:inline">|</span>
            <span><strong>{t('footer.ceo')}:</strong> {t('footer.ceoValue')}</span>
          </div>

          <div className="flex flex-col md:flex-row md:gap-4">
            <span><strong>{t('footer.bizNo')}:</strong> 167-86-02585</span>
            <span className="hidden md:inline">|</span>
            <span><strong>{t('footer.salesNo')}:</strong> 2025-용인수지-0147</span>
          </div>

          <div>
            <strong>{t('footer.address')}:</strong> {t('footer.addressValue')}
          </div>

          <div className="flex flex-col md:flex-row md:gap-4">
            <span><strong>{t('footer.support')}:</strong> ssangsoos@gmail.com</span>
            <span className="hidden md:inline">|</span>
            <span><strong>{t('footer.contact')}:</strong> 032-473-2222</span>
          </div>
        </div>

        {/* 법적 링크 */}
        <div className="mt-6 flex gap-4 text-xs">
          <Link to="/privacy" className="text-gray-500 hover:text-blue-600 underline">
            {t('footer.privacy')}
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/terms" className="text-gray-500 hover:text-blue-600 underline">
            {t('footer.terms')}
          </Link>
        </div>

        {/* 카피라이트 */}
        <div className="mt-4 text-xs text-gray-400 border-t border-gray-200 pt-4">
          Copyright © {new Date().getFullYear()} SmileUp Corp. All rights reserved.
        </div>
      </div>
    </footer>
  );
}