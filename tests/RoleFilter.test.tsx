import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import RoleFilter, { type RoleFilterProps } from '../src/components/map/RoleFilter';
import { readFileSync } from 'node:fs';
import { MEDICAL_LICENSE_TYPES } from '../src/lib/medicalConstants';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }) }));
const props = (overrides: Partial<RoleFilterProps> = {}): RoleFilterProps => ({
  roles: ['간호사'], options: MEDICAL_LICENSE_TYPES, activeRole: null, onActiveRoleChange: vi.fn(), onRolesChange: vi.fn(), onOpen: vi.fn(), ...overrides,
});
function open() { fireEvent.click(screen.getByRole('button', { name: '직종 추가·수정' })); return screen.getByRole('dialog', { name: '관심 직종 설정' }); }
it('uses rounded-square white chips and a solid role-add border', () => {
  const css = readFileSync('src/components/map/RoleFilter.css', 'utf8');
  expect(css).toMatch(/\.mn-role-filter__chip\s*\{[^}]*border-radius:\s*10px/);
  expect(css).toMatch(/\.mn-role-filter__chip\s*\{[^}]*background:\s*#fff/);
  expect(css).toMatch(/\.mn-role-filter__chip\[aria-pressed="true"\]\s*\{[^}]*background:\s*#EDF2FE/);
  expect(css).toMatch(/\.mn-role-filter__add\s*\{[^}]*border:\s*1px solid #CFDAF8/);
  expect(css).toMatch(/\.mn-role-filter__add\s*\{[^}]*border-radius:\s*10px/);
});
it('uses the exact role add label', () => {
  render(<RoleFilter {...props()} />);
  expect(screen.getByRole('button', { name: '직종 추가·수정' })).toHaveTextContent(/^직종 ＋$/);
});
it('renders All plus selected roles only with controlled active state', () => {
  const p = props({ roles: ['간호사', '치과의사'], activeRole: '간호사' }); const { container } = render(<RoleFilter {...p} />);
  expect(screen.getByRole('button', { name: '간호사', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('button', { name: '응급구조사(2급)' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '전체' })); expect(p.onActiveRoleChange).toHaveBeenCalledWith(null);
  fireEvent.click(screen.getByRole('button', { name: '치과의사', exact: true })); expect(p.onActiveRoleChange).toHaveBeenCalledWith('치과의사');
  expect(container.querySelector('button button')).toBeNull();
});
it('preserves every provided option and selected legacy roles', () => {
  const p = props({ roles: ['레거시 직종'] }); render(<RoleFilter {...p} />); const dialog = open();
  expect(p.onOpen).toHaveBeenCalledOnce();
  expect(within(dialog).getAllByRole('checkbox')).toHaveLength(MEDICAL_LICENSE_TYPES.length + 1);
  expect(within(dialog).getByRole('checkbox', { name: '응급구조사(2급)' })).toBeVisible();
  expect(within(dialog).getByRole('checkbox', { name: '레거시 직종' })).toBeChecked();
});
it('cannot remove the last role and does not persist draft toggles or cancel', () => {
  const p = props(); render(<RoleFilter {...p} />); const dialog = open();
  const selected = within(dialog).getByRole('checkbox', { name: '간호사', exact: true });
  expect(selected).toBeDisabled(); fireEvent.click(selected); expect(selected).toBeChecked();
  fireEvent.click(within(dialog).getByRole('checkbox', { name: '치과의사', exact: true })); expect(p.onRolesChange).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  open(); expect(screen.getByRole('checkbox', { name: '치과의사', exact: true })).not.toBeChecked();
});
it('waits for successful persistence before closing and resetting All', async () => {
  let resolve!: () => void;
  const p = props({ onRolesChange: vi.fn(() => new Promise<void>(done => { resolve = done; })) });
  render(<RoleFilter {...p} />); const dialog = open();
  fireEvent.click(within(dialog).getByRole('checkbox', { name: '치과의사', exact: true }));
  fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
  expect(p.onRolesChange).toHaveBeenCalledWith(['간호사', '치과의사']); expect(p.onActiveRoleChange).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeVisible(); expect(within(dialog).getByRole('button', { name: '저장 중' })).toBeDisabled();
  await act(async () => resolve());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(p.onActiveRoleChange).toHaveBeenCalledWith(null);
  expect(screen.getByRole('button', { name: '직종 추가·수정' })).toHaveFocus();
});
it('keeps failed drafts open, announces failure and supports retry without false persistence', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('저장 실패')).mockResolvedValueOnce(undefined);
  const p = props({ onRolesChange: save }); render(<RoleFilter {...p} />); open();
  fireEvent.click(screen.getByRole('checkbox', { name: '치과의사', exact: true })); fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('저장 실패'));
  expect(screen.getByRole('checkbox', { name: '치과의사', exact: true })).toBeChecked(); expect(p.onActiveRoleChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '저장' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(save).toHaveBeenCalledTimes(2); expect(p.onActiveRoleChange).toHaveBeenCalledWith(null);
});
it('has a named modal with trapped keyboard focus and restores focus on Escape', () => {
  render(<RoleFilter {...props()} />); const trigger = screen.getByRole('button', { name: '직종 추가·수정' }); trigger.focus(); const dialog = open();
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  const close = within(dialog).getByRole('button', { name: '닫기' }); expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true }); expect(within(dialog).getByRole('button', { name: '저장' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(close).toHaveFocus();
  fireEvent.keyDown(dialog, { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
});
it('announces external errors, disables busy trigger and supports initially empty roles', () => {
  const view = render(<RoleFilter {...props({ busy: true, error: '서버 오류' })} />);
  expect(screen.getByRole('button', { name: '직종 추가·수정' })).toBeDisabled(); expect(screen.getByRole('alert')).toHaveTextContent('서버 오류');
  view.rerender(<RoleFilter {...props({ roles: [] })} />); open(); expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: '간호사', exact: true })); expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
});
