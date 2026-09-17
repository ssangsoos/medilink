import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PrivacyConsent from '../src/components/PrivacyConsent';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const check = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }));
const required = () => ['consent.privacyLabel', 'consent.termsLabel', 'consent.ageLabel'].forEach(check);

describe('optional worker contact consent', () => {
  it('defaults unchecked and does not opt in when required agreements are accepted', () => {
    const change = vi.fn();
    render(<MemoryRouter><PrivacyConsent onValidChange={change} showThirdParty /></MemoryRouter>);
    expect(screen.getByRole('checkbox', { name: 'consent.thirdPartyLabel' })).not.toBeChecked();
    expect(change).not.toHaveBeenCalled();
    required();
    expect(change).toHaveBeenLastCalledWith(true, false);
    expect(screen.getByRole('checkbox', { name: 'consent.thirdPartyLabel' })).not.toBeChecked();
  });
  it('emits optional acceptance and withdrawal without invalidating required terms', () => {
    const change = vi.fn();
    render(<MemoryRouter><PrivacyConsent onValidChange={change} showThirdParty /></MemoryRouter>);
    required(); check('consent.thirdPartyLabel');
    expect(change).toHaveBeenLastCalledWith(true, true);
    check('consent.thirdPartyLabel');
    expect(change).toHaveBeenLastCalledWith(true, false);
  });
  it('emits both optional states from all-agree and keeps explicit choice on required changes', () => {
    const change = vi.fn();
    render(<MemoryRouter><PrivacyConsent onValidChange={change} showThirdParty /></MemoryRouter>);
    check('consent.allAgree'); expect(change).toHaveBeenLastCalledWith(true, true);
    check('consent.allAgree'); expect(change).toHaveBeenLastCalledWith(false, false);
    check('consent.thirdPartyLabel'); check('consent.privacyLabel');
    expect(change).toHaveBeenLastCalledWith(false, true);
  });
  it('keeps hospital agreements free of optional worker consent', () => {
    const change = vi.fn();
    render(<MemoryRouter><PrivacyConsent onValidChange={change} /></MemoryRouter>);
    expect(screen.queryByRole('checkbox', { name: 'consent.thirdPartyLabel' })).not.toBeInTheDocument();
    check('consent.allAgree'); expect(change).toHaveBeenLastCalledWith(true, false);
  });
});
