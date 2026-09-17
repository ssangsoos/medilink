import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import WorkerContactConsent from '../src/components/WorkerContactConsent';
import PrivacyPolicy from '../src/pages/PrivacyPolicy';
import ko from '../src/i18n/locales/ko.json';
import en from '../src/i18n/locales/en.json';
import ja from '../src/i18n/locales/ja.json';

vi.mock('../src/components/Footer', () => ({ default: () => null }));
const keys = ['provider', 'recipient', 'purpose', 'items', 'retention', 'refusal', 'disclosure', 'withdrawal', 'legacyNotice', 'versionNotice', 'publicProfileNotice'];

describe.each([['ko', ko], ['en', en], ['ja', ja]] as const)('contact disclosure in %s', (lang, locale) => {
  async function translations() {
    const i18n = createInstance();
    await i18n.init({ lng: lang, resources: { [lang]: { translation: locale } }, interpolation: { escapeValue: false } });
    return i18n;
  }
  it('has localized material disclosures and renders every detail before optional choice', async () => {
    const strings = (locale as unknown as { workerContactConsent: Record<string, string> }).workerContactConsent;
    expect(strings).toBeDefined();
    for (const key of keys) expect(strings[key], key).toBeTruthy();
    for (const key of ['workerContactUnavailable', 'workerContactSignIn', 'workerContactHospitalOnly', 'workerContactSetupRequired', 'workerContactFailed', 'workerContactLoading', 'workerContactOpenHelp', 'openSmsApp', 'openPhoneApp']) {
      expect((locale.mapUi as Record<string, string>)[key], key).toBeTruthy();
    }
    for (const key of ['workerConsentPrompt', 'workerConsentManage']) {
      expect((locale.mapUi as Record<string, string>)[key], key).toBeTruthy();
    }
    const change = vi.fn();
    render(<I18nextProvider i18n={await translations()}><WorkerContactConsent checked={false} onChange={change} needsRenewal /></I18nextProvider>);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    for (const key of keys.filter(key => key !== 'versionNotice')) expect(screen.getByText(strings[key])).toBeVisible();
    expect(screen.getByText(/2026-09-17-v1/)).toBeVisible();
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox')); expect(change).toHaveBeenCalledWith(true);
  });
  it('uses the same disclosure and current notice in the privacy policy without an opt-in control', async () => {
    render(<I18nextProvider i18n={await translations()}><MemoryRouter><PrivacyPolicy /></MemoryRouter></I18nextProvider>);
    const strings = (locale as unknown as { workerContactConsent: Record<string, string> }).workerContactConsent;
    expect(screen.getAllByText(/2026-09-17-v1/).length).toBeGreaterThan(0);
    for (const key of ['provider', 'recipient', 'purpose', 'items', 'retention', 'refusal', 'disclosure', 'withdrawal']) expect(screen.getByText(strings[key])).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('시행일: 2026년 3월 29일')).toBeVisible();
    expect(screen.getByText(/시행 7일 전부터/)).toBeVisible();
    expect(screen.getByText(strings.policyApplicability)).toBeVisible();
    expect(screen.getByText(strings.publicProfileNotice)).toBeVisible();
  });
});
