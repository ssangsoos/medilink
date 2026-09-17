import type { JobPosting } from '../types/jobPosting';
import type { MapProfile } from '../types/mapProfile';

/** Validate BEFORE normalizing: stripping stars from public_profiles is unsafe. */
export function validateContactPhone(phone: string | null | undefined): string | null {
  if (!phone || !/^\+?[0-9]+(?:[ -][0-9]+)*$/.test(phone)) return null;
  const normalized = phone.replace(/[ -]/g, '');
  // Korean local numbers or explicit international E.164 numbers only.
  return /^(?:0\d{8,10}|1[568]\d{6}|\+[1-9]\d{7,14})$/.test(normalized) ? normalized : null;
}

export function buildTelHref(phone: string | null | undefined): string | null {
  const valid = validateContactPhone(phone);
  return valid ? `tel:${valid}` : null;
}

export function buildSmsHref(phone: string | null | undefined, body: string, userAgent = ''): string | null {
  const valid = validateContactPhone(phone);
  if (!valid) return null;
  const separator = /iPhone|iPad|iPod/i.test(userAgent) ? '&' : '?';
  return `sms:${valid}${separator}body=${encodeURIComponent(body)}`;
}

/** Pure presentation masking, never a source for tel/sms hrefs. */
export function maskContactPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (/^[+\d *-]+$/.test(phone) && phone.includes('*')) return phone;
  const valid = validateContactPhone(phone);
  if (!valid) return '••••';
  const prefix = valid.startsWith('02') ? '02' : valid.slice(0, 3);
  return `${prefix}-****-${valid.slice(-4)}`;
}

/** Unknown is not affirmative consent. An explicit opt-out always wins. */
export function profileSmsConsent(profile: MapProfile): boolean | undefined {
  if (profile.acceptsSms === false || profile.accepts_sms === false) return false;
  if (profile.acceptsSms === true || profile.accepts_sms === true) return true;
  return undefined;
}

/** Defensive UI guard in addition to the parent's public/expiry query. */
export function activeContactPostings(postings: JobPosting[], hospitalId: string, now = new Date()): JobPosting[] {
  // Match Dashboard's local calendar query, not UTC or a fixed region.
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return postings.filter(job => {
    if (job.hospital_id !== hospitalId || job.status !== 'active') return false;
    const end = job.work_end_date;
    return !end || (/^\d{4}-\d{2}-\d{2}$/.test(end) && end >= today);
  });
}

/** Preserve the existing rule: a common nonempty override, otherwise hospital mobile. */
export function effectiveHospitalSmsPhone(hospital: MapProfile, postings: JobPosting[]): string {
  const first = postings[0]?.contact_phone;
  return first && postings.every(job => job.contact_phone === first) ? first : hospital.mobile_phone || '';
}
