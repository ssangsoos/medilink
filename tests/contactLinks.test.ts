import { describe, expect, it, vi } from 'vitest';
import type { JobPosting } from '../src/types/jobPosting';
import { activeContactPostings, buildSmsHref, buildTelHref, maskContactPhone, validateContactPhone } from '../src/lib/contactLinks';

describe('strict contact links', () => {
  it('uses the local calendar and Dashboard null-end-date rule, even for always jobs', () => {
    const now = new Date('2026-09-17T01:00:00Z');
    vi.spyOn(now, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(now, 'getMonth').mockReturnValue(8);
    vi.spyOn(now, 'getDate').mockReturnValue(16);
    const jobs = [
      { id: 'today', hospital_id: 'h', status: 'active', schedule_type: 'specific', work_end_date: '2026-09-16' },
      { id: 'null-end', hospital_id: 'h', status: 'active', schedule_type: 'specific', work_start_date: '2000-01-01', work_end_date: null },
      { id: 'expired-always', hospital_id: 'h', status: 'active', schedule_type: 'always', work_end_date: '2000-01-01' },
    ] as JobPosting[];
    expect(activeContactPostings(jobs, 'h', now).map(j => j.id)).toEqual(['today', 'null-end']);
  });
  it.each(['010-****-5678', '010-12**-3456', '02-***-1234', '010-1234-5678javascript:', '01012345678?body=bad', '01012345678;123', '01012345678,123', '010\n12345678', '123', '', undefined])('rejects masked or malformed phone %s before normalization', phone => {
    expect(validateContactPhone(phone)).toBeNull();
    expect(buildSmsHref(phone, '[제목]\n본문', 'iPhone')).toBeNull();
    expect(buildTelHref(phone)).toBeNull();
  });
  it.each([['010-1234-5678', '01012345678'], ['02-123-4567', '021234567'], ['+82 10 1234 5678', '+821012345678'], ['+1 202 555 0100', '+12025550100']])('validates actual full phone %s', (input, result) => {
    expect(validateContactPhone(input)).toBe(result);
    expect(buildTelHref(input)).toBe(`tel:${result}`);
  });
  it('keeps the title first and body multiline with correct mobile separators', () => {
    const body = '[야간 간호 공고]\n안녕하세요 & 문의합니다.\n가능할까요?';
    expect(buildSmsHref('010-1234-5678', body, 'iPhone')).toBe(`sms:01012345678&body=${encodeURIComponent(body)}`);
    expect(buildSmsHref('010-1234-5678', body, 'Android')).toBe(`sms:01012345678?body=${encodeURIComponent(body)}`);
  });
  it('preserves already masked values and masks all full numbers for display', () => {
    expect(maskContactPhone('010-****-5678')).toBe('010-****-5678');
    expect(maskContactPhone('010-1234-5678')).toBe('010-****-5678');
    expect(maskContactPhone('02-123-4567')).toBe('02-****-4567');
    expect(maskContactPhone(undefined)).toBe('');
  });
});
