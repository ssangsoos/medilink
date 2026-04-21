export type ScheduleType = "specific" | "always";

export interface JobPosting {
  id: string;
  hospital_id: string;
  title: string;
  description: string;
  job_category: string | null;
  job_category_custom: string | null;
  schedule_type: ScheduleType;
  work_start_date: string | null;
  work_end_date: string | null;
  work_start_time: string | null;
  work_end_time: string | null;
  hourly_rate: number | null;
  wage_negotiable: boolean;
  kakao_link: string;
  status: "active" | "closed" | "paused";
  latitude: number | null;
  longitude: number | null;
  created_at?: string;
}

export interface JobPostingFormInput {
  title: string;
  description: string;
  jobCategory: string;
  jobCategoryCustom: string;
  scheduleType: ScheduleType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  wageNegotiable: boolean;
  kakaoLink: string;
}
