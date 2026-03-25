// src/components/PrivacyConsent.tsx
import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function PrivacyConsent({ checked, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 mb-6">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="privacy"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <div className="flex-1">
          <label htmlFor="privacy" className="text-sm font-bold text-gray-800 cursor-pointer select-none">
            [필수] 개인정보 수집 및 이용 동의
          </label>
          <button 
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs text-gray-500 flex items-center mt-1 hover:text-blue-600 underline"
          >
            약관 내용 전체보기 <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* 약관 모달 (팝업) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">개인정보 처리방침</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-black">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
              <p><strong>(주)스마일업</strong>은 서비스 제공을 위해 아래와 같이 개인정보를 수집/이용합니다.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>수집 항목:</strong> 이름, 전화번호, 주소, 이메일, 비밀번호 등</li>
                <li><strong>수집 목적:</strong> 구인구직 매칭 및 서비스 이용</li>
                <li><strong>보유 기간:</strong> 회원 탈퇴 시까지</li>
              </ul>
              <p className="text-red-500 font-bold mt-2">동의를 거부할 수 있으나, 서비스 이용이 제한될 수 있습니다.</p>
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <button 
                type="button"
                onClick={() => { setIsOpen(false); onChange(true); }}
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