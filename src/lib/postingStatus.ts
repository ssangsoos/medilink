import type { JobPosting } from '../types/jobPosting';

export type PostingStatus = 'NONE' | 'OFF' | 'ON';
export type PostingVisibility = 'visible' | 'private' | 'expired';
export interface PostingStatusSummary {
  status: PostingStatus;
  sortedPostings: JobPosting[];
  visiblePostings: JobPosting[];
  leadPosting: JobPosting | null;
}

function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Match Dashboard's local calendar visibility query, including its null-end-date rule.
export function getPostingVisibility(posting: JobPosting, today = localToday()): PostingVisibility {
  if (posting.work_end_date && posting.work_end_date < today) return 'expired';
  return posting.status === 'active' ? 'visible' : 'private';
}

export function getPostingTimestamp(posting: JobPosting): number | null {
  // Some deployed rows expose updated_at; the shared schema does not require it.
  const updatedAt = (posting as JobPosting & { updated_at?: string }).updated_at;
  for (const value of [updatedAt, posting.created_at]) {
    const timestamp = value ? Date.parse(value) : NaN;
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

export function sortPostingsNewestFirst(postings: readonly JobPosting[]): JobPosting[] {
  return [...postings].sort((a, b) => {
    const aTime = getPostingTimestamp(a);
    const bTime = getPostingTimestamp(b);
    if (aTime === bTime) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });
}

export function derivePostingStatus(postings: readonly JobPosting[], today = localToday()): PostingStatusSummary {
  const sortedPostings = sortPostingsNewestFirst(postings);
  const visiblePostings = sortedPostings.filter(posting => getPostingVisibility(posting, today) === 'visible');
  return {
    status: visiblePostings.length ? 'ON' : postings.length ? 'OFF' : 'NONE',
    sortedPostings,
    visiblePostings,
    leadPosting: visiblePostings[0] ?? null,
  };
}
