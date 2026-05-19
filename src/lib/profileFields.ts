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
