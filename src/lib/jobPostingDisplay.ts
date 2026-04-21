import type { JobPosting } from '../types/jobPosting';
import { JOB_CATEGORY_OTHER } from './medicalConstants';

export const formatHourlyRate = (job: JobPosting): string => {
  if (job.wage_negotiable) return '협의 가능';
  if (job.hourly_rate == null) return '미정';
  return `${Number(job.hourly_rate).toLocaleString()}원`;
};

export const formatSchedule = (job: JobPosting): string => {
  if (job.schedule_type === 'always') return '항시 구인';
  if (!job.work_start_date) return '일정 미정';
  const range = job.work_end_date && job.work_end_date !== job.work_start_date
    ? `${job.work_start_date} ~ ${job.work_end_date}`
    : job.work_start_date;
  const time = job.work_start_time && job.work_end_time
    ? ` · ${job.work_start_time.slice(0, 5)}~${job.work_end_time.slice(0, 5)}`
    : '';
  return `${range}${time}`;
};

export const formatJobCategory = (job: JobPosting): string => {
  if (!job.job_category) return '직종 미지정';
  if (job.job_category === JOB_CATEGORY_OTHER && job.job_category_custom) {
    return job.job_category_custom;
  }
  return job.job_category;
};
