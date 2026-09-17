import { describe, expect, it } from 'vitest';
import { buildWorkerContactConsentUpdate, hasCurrentWorkerContactConsent, WORKER_CONTACT_CONSENT_VERSION } from '../src/lib/workerContactConsent';

describe('worker contact consent contract', () => {
  it.each([true, false])('persists explicit %s and current version, never a client timestamp', accepted => {
    expect(WORKER_CONTACT_CONSENT_VERSION).toBe('2026-09-17-v1');
    expect(buildWorkerContactConsentUpdate(accepted)).toEqual({ worker_contact_consent: accepted, worker_contact_consent_version: '2026-09-17-v1' });
  });
  it.each([undefined, null, {}, { worker_contact_consent: null }, { worker_contact_consent: false, worker_contact_consent_version: '2026-09-17-v1' }, { worker_contact_consent: true }, { worker_contact_consent: true, worker_contact_consent_version: 'old' }])('fails closed for legacy, declined or stale profile %#', profile => {
    expect(hasCurrentWorkerContactConsent(profile)).toBe(false);
  });
  it('accepts only explicit current-version consent', () => {
    expect(hasCurrentWorkerContactConsent(buildWorkerContactConsentUpdate(true))).toBe(true);
  });
});
