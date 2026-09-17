import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JobPosting } from '../src/types/jobPosting';
import { derivePostingStatus, getPostingVisibility, sortPostingsNewestFirst } from '../src/lib/postingStatus';

const job = (overrides: Partial<JobPosting> & { updated_at?: string } = {}): JobPosting => ({
  id: 'one', hospital_id: 'hospital', title: '공고', description: '', job_category: '간호사', job_category_custom: null,
  schedule_type: 'specific', work_start_date: '2026-09-17', work_end_date: '2026-09-17', work_start_time: null,
  work_end_time: null, hourly_rate: null, wage_negotiable: true, kakao_link: null, contact_phone: null,
  status: 'active', latitude: null, longitude: null, ...overrides,
});
const today = '2026-09-17';
afterEach(() => vi.useRealTimers());
it.each([0, 23])('defaults expiry to the local calendar at hour %s, not the UTC date', hour => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 18, hour, 30));
  const yesterday = job({ work_end_date: '2026-09-17' });
  const current = job({ work_end_date: '2026-09-18' });
  expect(getPostingVisibility(yesterday)).toBe('expired');
  expect(derivePostingStatus([yesterday]).status).toBe('OFF');
  expect(getPostingVisibility(current)).toBe('visible');
  expect(derivePostingStatus([current]).status).toBe('ON');
});

describe('posting status derived from actual map visibility', () => {
  it('distinguishes no stored postings from non-visible postings', () => {
    expect(derivePostingStatus([], today)).toMatchObject({ status: 'NONE', visiblePostings: [], leadPosting: null });
    expect(derivePostingStatus([job({ status: 'paused' })], today).status).toBe('OFF');
    expect(derivePostingStatus([job({ status: 'closed' })], today).status).toBe('OFF');
    expect(derivePostingStatus([job({ work_end_date: '2026-09-16' })], today).status).toBe('OFF');
  });
  it('includes today and null end dates, including future-start and always postings', () => {
    for (const posting of [job(), job({ work_start_date: '2026-10-01', work_end_date: '2026-10-02' }), job({ schedule_type: 'always', work_end_date: null })]) {
      expect(getPostingVisibility(posting, today)).toBe('visible');
      expect(derivePostingStatus([posting], today).status).toBe('ON');
    }
  });
  it('honors end dates even on inconsistent legacy always rows to match the map query', () => {
    expect(getPostingVisibility(job({ schedule_type: 'always', work_end_date: '2026-09-16' }), today)).toBe('expired');
  });
  it('distinguishes visible, private and expired postings', () => {
    expect(getPostingVisibility(job({ status: 'paused' }), today)).toBe('private');
    expect(getPostingVisibility(job({ status: 'closed', work_end_date: '2026-09-16' }), today)).toBe('expired');
    expect(getPostingVisibility(job(), today)).toBe('visible');
  });
  it('uses numeric updated_at then created_at sorting without mutating input', () => {
    const postings = [
      job({ id: 'old', created_at: '2026-09-17T09:00:00+09:00' }),
      job({ id: 'new', created_at: '2026-09-17T01:00:00Z' }),
      job({ id: 'updated', created_at: '2025-01-01', updated_at: '2026-09-17T03:00:00Z' }),
      job({ id: 'invalid-update', created_at: '2026-09-17T02:00:00Z', updated_at: 'invalid' }),
      job({ id: 'unknown', created_at: 'invalid' }),
      job({ id: 'missing' }),
    ];
    expect(sortPostingsNewestFirst(postings).map(p => p.id)).toEqual(['updated', 'invalid-update', 'new', 'old', 'unknown', 'missing']);
    expect(postings[0].id).toBe('old');
  });
  it('chooses newest visible lead without counting expired or private rows', () => {
    const result = derivePostingStatus([
      job({ id: 'private', status: 'paused', created_at: '2026-09-18' }),
      job({ id: 'expired', work_end_date: '2026-09-16', created_at: '2026-09-19' }),
      job({ id: 'older', created_at: '2026-09-16' }),
      job({ id: 'lead', created_at: '2026-09-17' }),
    ], today);
    expect(result.status).toBe('ON');
    expect(result.leadPosting?.id).toBe('lead');
    expect(result.visiblePostings.map(p => p.id)).toEqual(['lead', 'older']);
    expect(result.sortedPostings).toHaveLength(4);
  });
});
