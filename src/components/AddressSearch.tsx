// src/components/AddressSearch.tsx
'use client';

import DaumPostcode from 'react-daum-postcode';
import { X } from 'lucide-react';

interface Props {
  onComplete: (address: string) => void; // 주소 선택 완료 시 실행될 함수
  onClose: () => void; // 닫기 버튼 누를 때 실행될 함수
}

export default function AddressSearch({ onComplete, onClose }: Props) {
  const handleComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
      }
      fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
    }

    // 완성된 주소를 부모(회원가입 페이지)에게 전달
    onComplete(fullAddress);
    onClose(); // 창 닫기
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        {/* 헤더 */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">주소 검색</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        {/* 다음 우편번호 컴포넌트 */}
        <div className="h-[450px]">
          <DaumPostcode 
            onComplete={handleComplete} 
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}