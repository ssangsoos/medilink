// types/index.ts

// 사용자 역할 (병원 또는 의료인)
export type UserRole = 'hospital' | 'worker' | 'admin';

// 1. 기본 사용자 정보 (공통)
export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;      // 담당자 이름 또는 의료인 이름
  phoneNumber: string;
  createdAt: string;
}

// 2. 병원 프로필 (병원의 구인 조건)
export interface HospitalProfile extends User {
  hospitalName: string;   // 병원명
  businessNumber: string; // 사업자등록번호
  address: string;        // 주소 (도로명)
  location: {             // 지도 좌표 (핵심 기능)
    lat: number;
    lng: number;
  };
  description?: string;   // 병원 소개
}

// 3. 의료인 프로필 (구직 조건)
export interface WorkerProfile extends User {
  licenseType: string;    // 면허 종류 (간호사, 치과위생사 등)
  licenseNumber: string;  // 면허 번호
  address: string;        // 거주지 주소
  location: {             // 희망 근무지 중심 좌표
    lat: number;
    lng: number;
  };
  workRadius: number;     // 근무 가능 반경 (km) - 핵심 기능
  hourlyRate?: number;    // 희망 시급
  specialty?: string;     // 전문 분야 (예: 교정, 수술방 등)
  isAvailable: boolean;   // 현재 구직 중 여부
}

// 4. 채용 공고 (Job Posting)
export interface JobPosting {
  id: string;
  hospitalId: string;
  title: string;
  description: string;
  hourlyRate: number;
  workDate: string;       // 근무 날짜
  startTime: string;      // 시작 시간
  endTime: string;        // 종료 시간
  status: 'open' | 'closed';
}