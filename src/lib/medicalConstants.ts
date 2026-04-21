export const MEDICAL_LICENSE_TYPES = [
  "간호사",
  "간호조무사",
  "물리치료사",
  "방사선사",
  "보건교육사",
  "수의사",
  "안경사",
  "약사",
  "언어재활사",
  "영양사",
  "위생사",
  "의무기록사",
  "의사",
  "의지보조기기사",
  "임상병리사",
  "작업치료사",
  "조산사",
  "치과기공사",
  "치과위생사",
  "치과의사",
  "코디네이터",
  "한약사",
  "한의사",
  "응급구조사(1급)",
  "응급구조사(2급)",
] as const;

export type MedicalLicenseType = typeof MEDICAL_LICENSE_TYPES[number];

export const HOSPITAL_TYPES = [
  { label: "동물병원", value: "animal" },
  { label: "약국", value: "pharmacy" },
  { label: "요양병원", value: "nursing" },
  { label: "일반 의과", value: "medical" },
  { label: "치과", value: "dental" },
  { label: "한방", value: "oriental" },
  { label: "기타", value: "other" },
] as const;

export type HospitalTypeValue = typeof HOSPITAL_TYPES[number]["value"];

export const JOB_CATEGORY_OTHER = "기타" as const;
