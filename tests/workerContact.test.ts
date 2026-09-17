import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc } }));
import { resolveWorkerContact } from '../src/lib/workerContact';
const workerId = '00000000-0000-4000-8000-000000000002';
beforeEach(() => { rpc.mockReset(); });
describe('permission-checked worker contact lookup', () => {
  it('fetches only the requested worker through the protected RPC', async () => {
    rpc.mockResolvedValue({ data: '+1 202-555-0123', error: null });
    expect(await resolveWorkerContact(workerId)).toBe('+12025550123');
    expect(rpc).toHaveBeenCalledExactlyOnceWith('resolve_worker_contact', { p_worker_id: workerId });
  });
  it('does not query a malformed worker identifier', async () => {
    await expect(resolveWorkerContact('invalid')).rejects.toMatchObject({ reason: 'unavailable' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([null, '', '010-****-1234', 'javascript:alert(1)', { phone: '01012345678' }])('rejects invalid RPC result %j', async value => {
    rpc.mockResolvedValue({ data: value, error: null });
    await expect(resolveWorkerContact(workerId)).rejects.toMatchObject({ reason: 'unavailable' });
  });
  it.each([
    ['CONTACT_UNAVAILABLE', 'P0001', 'unavailable'],
    ['AUTH_REQUIRED', '42501', 'signIn'],
    ['HOSPITAL_REQUIRED', '42501', 'hospitalOnly'],
    ['function not found', 'PGRST202', 'setupRequired'],
    ['network unavailable', '', 'failed'],
  ])('maps server denial %s without returning a phone', async (message, code, reason) => {
    rpc.mockResolvedValue({ data: '01012345678', error: { message, code } });
    await expect(resolveWorkerContact(workerId)).rejects.toMatchObject({ reason });
  });
  it('never falls back to a masked/public number after a rejected request', async () => {
    rpc.mockRejectedValue(new Error('network'));
    await expect(resolveWorkerContact(workerId)).rejects.toMatchObject({ reason: 'failed' });
  });
});
