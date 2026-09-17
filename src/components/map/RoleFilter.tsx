import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './RoleFilter.css';

export interface RoleFilterProps {
  roles: string[];
  options: readonly string[];
  activeRole: string | null;
  onActiveRoleChange: (role: string | null) => void;
  onRolesChange: (roles: string[]) => Promise<void> | void;
  onOpen?: () => void;
  busy?: boolean;
  error?: string | null;
}

interface RoleDialogProps extends RoleFilterProps {
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

function RoleDialog({ roles, options, onRolesChange, onActiveRoleChange, onClose, triggerRef, busy = false, error }: RoleDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => [...new Set(roles)]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  const savingRef = useRef(false);
  const titleId = useId();
  const hintId = useId();
  const locked = saving || busy;
  // Keep selected legacy values editable even when no longer in the canonical options.
  const allOptions = [...new Set([...options, ...roles])];
  const label = (role: string) => t(`licenseTypes.${role}`, { defaultValue: role });

  useEffect(() => {
    mountedRef.current = true;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    dialog?.showModal();
    closeRef.current?.focus();
    return () => {
      mountedRef.current = false;
      dialog?.close();
      trigger?.focus();
    };
  }, [triggerRef]);

  const save = async () => {
    if (savingRef.current || busy || draft.length === 0) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await onRolesChange([...draft]);
      if (!mountedRef.current) return;
      onActiveRoleChange(null);
      onClose();
    } catch (cause) {
      if (mountedRef.current) setSaveError(cause instanceof Error && cause.message ? cause.message : t('mapUi.roles.saveFailed', { defaultValue: '저장하지 못했어요. 다시 시도해 주세요.' }));
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  };

  return createPortal(
    <dialog ref={dialogRef} className="mn-role-dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={hintId}
      onCancel={event => { event.preventDefault(); if (!locked) onClose(); }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (!locked) onClose();
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? []);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) { event.preventDefault(); dialogRef.current?.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
      }}>
      <div className="mn-role-dialog__header">
        <h2 id={titleId}>{t('mapUi.roles.title', { defaultValue: '관심 직종 설정' })}</h2>
        <button type="button" ref={closeRef} className="mn-role-dialog__close" disabled={locked} onClick={onClose} aria-label={t('mapUi.roles.close', { defaultValue: '닫기' })}><span aria-hidden="true" /></button>
      </div>
      <p className="mn-role-dialog__hint" id={hintId}>{t('mapUi.roles.hint', { defaultValue: '지도에서 찾을 직종을 선택해 주세요. 최소 1개는 선택해야 해요.' })}</p>
      <div className="mn-role-dialog__options" aria-busy={saving}>
        {allOptions.map(role => {
          const checked = draft.includes(role);
          const disabled = locked || (checked && draft.length === 1);
          return <label key={role} className={`mn-role-dialog__option${checked ? ' mn-role-dialog__option--selected' : ''}`}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => {
              setSaveError(null);
              setDraft(current => current.includes(role) ? current.length > 1 ? current.filter(item => item !== role) : current : [...current, role]);
            }} />
            <span>{label(role)}</span>
          </label>;
        })}
      </div>
      {(saveError || error) && <p className="mn-role-dialog__error" role="alert">{saveError || error}</p>}
      <div className="mn-role-dialog__footer">
        <button type="button" className="mn-role-dialog__cancel" disabled={locked} onClick={onClose}>{t('mapUi.roles.cancel', { defaultValue: '취소' })}</button>
        <button type="button" className="mn-role-dialog__save" disabled={locked || draft.length === 0} onClick={() => void save()}>
          {saving ? t('mapUi.roles.saving', { defaultValue: '저장 중' }) : t('mapUi.roles.save', { defaultValue: '저장' })}
        </button>
      </div>
    </dialog>, document.body,
  );
}

export function RoleFilter(props: RoleFilterProps) {
  const { roles, activeRole, onActiveRoleChange, onOpen, busy = false, error } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedRoles = [...new Set(roles)];
  return <div className="mn-role-filter">
    <div className="mn-role-filter__row">
      <div className="mn-role-filter__scroll" role="group" aria-label={t('mapUi.roles.filter', { defaultValue: '지도 직종 필터' })}>
        <button type="button" className="mn-role-filter__chip" aria-pressed={activeRole === null} disabled={busy} onClick={() => onActiveRoleChange(null)}>{t('mapUi.roles.all', { defaultValue: '전체' })}</button>
        {selectedRoles.map(role => <button type="button" key={role} className="mn-role-filter__chip" aria-pressed={activeRole === role} disabled={busy} onClick={() => onActiveRoleChange(role)}>{t(`licenseTypes.${role}`, { defaultValue: role })}</button>)}
      </div>
      <button type="button" ref={triggerRef} className="mn-role-filter__add" disabled={busy} aria-haspopup="dialog" aria-expanded={open}
        aria-label={t('mapUi.roles.open', { defaultValue: '직종 추가·수정' })} onClick={() => { onOpen?.(); setOpen(true); }}>
        {t('mapUi.roles.add', { defaultValue: '직종' })}{' ＋'}
      </button>
    </div>
    {error && !open && <p className="mn-role-filter__error" role="alert">{error}</p>}
    {open && <RoleDialog {...props} triggerRef={triggerRef} onClose={() => setOpen(false)} />}
  </div>;
}

export default RoleFilter;
