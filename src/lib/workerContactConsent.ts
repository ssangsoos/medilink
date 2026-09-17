export const WORKER_CONTACT_CONSENT_VERSION = '2026-09-17-v1';

interface WorkerContactConsentProfile {
  worker_contact_consent?: boolean | null;
  worker_contact_consent_version?: string | null;
}

/** The database trigger owns worker_contact_consent_at; never send a client timestamp. */
export function buildWorkerContactConsentUpdate(accepted: boolean) {
  return {
    worker_contact_consent: accepted,
    worker_contact_consent_version: WORKER_CONTACT_CONSENT_VERSION,
  };
}

/** Legacy, missing and outdated consent fail closed until an explicit new choice. */
export function hasCurrentWorkerContactConsent(profile: WorkerContactConsentProfile | null | undefined): boolean {
  return profile?.worker_contact_consent === true
    && profile.worker_contact_consent_version === WORKER_CONTACT_CONSENT_VERSION;
}
