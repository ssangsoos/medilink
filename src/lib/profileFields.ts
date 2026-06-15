// 즉시 출근 가능 시점 옵션
export const AVAILABLE_FROM_OPTIONS = [
  { value: 'now', label: '오늘부터' },
  { value: '1week', label: '1주 내' },
  { value: '2weeks', label: '2주 후' },
  { value: 'flexible', label: '협의' },
] as const;

export type AvailableFromValue = typeof AVAILABLE_FROM_OPTIONS[number]['value'];

export const BIO_MAX_LENGTH = 60;

export const formatAvailableFrom = (value: string | null | undefined): string => {
  if (!value) return '';
  return AVAILABLE_FROM_OPTIONS.find((o) => o.value === value)?.label ?? '';
};

// 근무 형태 (다중 선택)
export const WORK_PATTERN_OPTIONS = [
  { value: 'one_off', label: '단발/대타' },
  { value: 'regular', label: '정기 근무' },
  { value: 'fulltime', label: '풀타임 전환' },
] as const;

// 가능 요일 (다중 선택)
export const AVAILABLE_DAYS_OPTIONS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
] as const;

// 가능 시간대 (다중 선택)
export const AVAILABLE_TIMES_OPTIONS = [
  { value: 'morning', label: '오전' },
  { value: 'afternoon', label: '오후' },
  { value: 'evening', label: '저녁' },
] as const;

type OptionList = readonly { value: string; label: string }[];

export const formatFromOptions = (
  values: string[] | null | undefined,
  options: OptionList,
): string => {
  if (!values || values.length === 0) return '';
  return values
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean)
    .join(', ');
};

export const toggleValue = (list: string[], value: string): string[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// 경력 행 (연도 범위 + 병원명) — DB 스키마 변경 없이 experience 텍스트 컬럼에
// "2002~2008 병원명" 형식 줄로 저장하고, 불러올 때 다시 행으로 파싱한다.
export interface CareerRow {
  startYear: string;
  endYear: string; // 연도 또는 '현재'
  hospital: string;
}

export const CAREER_END_ONGOING = '현재';
export const CAREER_DEFAULT_ROWS = 3;

const CAREER_YEAR_MIN = 1975;

export const getCareerYearOptions = (): string[] => {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current; y >= CAREER_YEAR_MIN; y--) years.push(String(y));
  return years;
};

export const emptyCareerRow = (): CareerRow => ({ startYear: '', endYear: '', hospital: '' });

const CAREER_LINE_PATTERN = /^(\d{4})\s*[~\-–]\s*(\d{4}|현재)\s+(.+)$/;

// 행 + 기타 사항을 experience 텍스트 한 덩어리로 합친다.
export const serializeExperience = (rows: CareerRow[], notes: string): string => {
  const lines = rows
    .filter((r) => r.hospital.trim() !== '' && r.startYear !== '')
    .map((r) => `${r.startYear}~${r.endYear || CAREER_END_ONGOING} ${r.hospital.trim()}`);
  const trimmedNotes = notes.trim();
  if (lines.length === 0) return trimmedNotes;
  if (trimmedNotes === '') return lines.join('\n');
  return `${lines.join('\n')}\n\n${trimmedNotes}`;
};

// experience 텍스트를 경력 행과 기타 사항으로 분리한다.
// 형식에 안 맞는 줄(기존 자유 서술 데이터 포함)은 전부 기타 사항으로 보존된다.
export const parseExperience = (text: string | null | undefined): { rows: CareerRow[]; notes: string } => {
  const rows: CareerRow[] = [];
  const noteLines: string[] = [];
  for (const line of (text ?? '').split('\n')) {
    const match = line.trim().match(CAREER_LINE_PATTERN);
    if (match) {
      rows.push({ startYear: match[1], endYear: match[2], hospital: match[3].trim() });
    } else {
      noteLines.push(line);
    }
  }
  return { rows, notes: noteLines.join('\n').trim() };
};

// 화면 표시용: 최소 행 수를 빈 행으로 채운다.
export const padCareerRows = (rows: CareerRow[]): CareerRow[] => {
  const padded = [...rows];
  while (padded.length < CAREER_DEFAULT_ROWS) padded.push(emptyCareerRow());
  return padded;
};
