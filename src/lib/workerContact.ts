import { supabase } from './supabase';
import { validateContactPhone } from './contactLinks';

export type WorkerContactFailure = 'unavailable' | 'signIn' | 'hospitalOnly' | 'setupRequired' | 'failed';
export class WorkerContactError extends Error {
  readonly reason: WorkerContactFailure;
  constructor(reason: WorkerContactFailure) {
    super(reason);
    this.name = 'WorkerContactError';
    this.reason = reason;
  }
}

/** No public-table fallback: only this server-checked single-recipient lookup can disclose a worker phone. */
export async function resolveWorkerContact(workerId: string): Promise<string> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerId)) {
    throw new WorkerContactError('unavailable');
  }
  try {
    const { data, error } = await supabase.rpc('resolve_worker_contact', { p_worker_id: workerId });
    if (error) {
      if (error.message === 'AUTH_REQUIRED') throw new WorkerContactError('signIn');
      if (error.message === 'HOSPITAL_REQUIRED') throw new WorkerContactError('hospitalOnly');
      if (error.message === 'CONTACT_UNAVAILABLE') throw new WorkerContactError('unavailable');
      if (error.code === 'PGRST202' || error.code === '42883') throw new WorkerContactError('setupRequired');
      throw new WorkerContactError('failed');
    }
    const phone = typeof data === 'string' ? validateContactPhone(data) : null;
    if (!phone) throw new WorkerContactError('unavailable');
    return phone;
  } catch (error) {
    if (error instanceof WorkerContactError) throw error;
    throw new WorkerContactError('failed');
  }
}

/** Opens a composer/dialer only; never sends a message. An explicit fallback link remains in the UI. */
export function openContactApp(href: string): void {
  window.location.assign(href);
}
