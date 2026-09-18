import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PrivacyConsent from '../src/components/PrivacyConsent';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('real consent component inside a signup form', () => {
  it.each([0, 1])('closing modal %i does not submit or consent', index => {
    const submit = vi.fn();
    const validity = vi.fn();
    render(<MemoryRouter><form onSubmit={e => { e.preventDefault(); submit(); }}>
      <PrivacyConsent onValidChange={validity} />
    </form></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'consent.viewContent' })[index]);
    const close = document.querySelector<HTMLButtonElement>('button .lucide-x')!.closest('button')!;
    expect(close).toHaveAttribute('type', 'button');
    fireEvent.click(close);
    expect(submit).not.toHaveBeenCalled();
    expect(validity).not.toHaveBeenCalled();
    expect(document.querySelector('.lucide-x')).not.toBeInTheDocument();
  });
  it.each([0, 1])('agreeing in modal %i updates consent but never submits', index => {
    const submit = vi.fn();
    const validity = vi.fn();
    render(<MemoryRouter><form onSubmit={e => { e.preventDefault(); submit(); }}>
      <PrivacyConsent onValidChange={validity} />
    </form></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'consent.viewContent' })[index]);
    fireEvent.click(screen.getByRole('button', { name: 'consent.agreeAndClose' }));
    expect(validity).toHaveBeenLastCalledWith(false);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: index === 0 ? 'consent.privacyLabel' : 'consent.termsLabel' })).toBeChecked();
  });
});
