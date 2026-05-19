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
