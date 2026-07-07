import type { JobPosting } from '../types/jobPosting';
import { JOB_CATEGORY_OTHER } from './medicalConstants';
import i18n from '../i18n';

export const formatHourlyRate = (job: JobPosting): string => {
  if (job.wage_negotiable) return i18n.t('job.negotiable');
  if (job.hourly_rate == null) return i18n.t('job.undecidedWage');
  return `${Number(job.hourly_rate).toLocaleString()}${i18n.t('dashboard.wonSuffix')}`;
};

export const formatSchedule = (job: JobPosting): string => {
  if (job.schedule_type === 'always') return i18n.t('job.always');
  if (!job.work_start_date) return i18n.t('job.undecidedSchedule');
  const range = job.work_end_date && job.work_end_date !== job.work_start_date
    ? `${job.work_start_date} ~ ${job.work_end_date}`
    : job.work_start_date;
  const time = job.work_start_time && job.work_end_time
    ? ` · ${job.work_start_time.slice(0, 5)}~${job.work_end_time.slice(0, 5)}`
    : '';
  return `${range}${time}`;
};

export const formatJobCategory = (job: JobPosting): string => {
  if (!job.job_category) return i18n.t('job.unspecifiedCategory');
  if (job.job_category === JOB_CATEGORY_OTHER && job.job_category_custom) {
    return job.job_category_custom;
  }
  return i18n.t('licenseTypes.' + job.job_category, { defaultValue: job.job_category });
};
