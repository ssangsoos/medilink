import { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { validateContactPhone } from '../src/lib/contactLinks';

// Use a filesystem path: Vite rewrites new URL(relativeAsset, import.meta.url).
const migrationPath = resolvePath(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations/202609170001_worker_contact_consent.sql');
const migration = readFileSync(migrationPath, 'utf8');
const worker = '00000000-0000-4000-8000-000000000001';
const hospital = '00000000-0000-4000-8000-000000000002';
const otherWorker = '00000000-0000-4000-8000-000000000003';
const newWorker = '00000000-0000-4000-8000-000000000004';
const absent = '00000000-0000-4000-8000-000000000099';
const version = '2026-09-17-v1';
let db: PGlite;
let originalView: string;
let originalPolicies: unknown;

async function as<T>(role: 'authenticated' | 'anon', id: string | null, action: () => Promise<T>): Promise<T> {
  await db.exec(`SET LOCAL ROLE ${role}`);
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [id ?? '']);
  // Recover expected SQL errors without aborting the enclosing isolated test transaction.
  await db.exec('SAVEPOINT caller_action');
  try {
    const result = await action();
    await db.exec('RELEASE SAVEPOINT caller_action');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK TO SAVEPOINT caller_action; RELEASE SAVEPOINT caller_action');
    throw error;
  } finally {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', '', true)");
  }
}
async function receipt(id = worker) {
  return (await db.query(`SELECT worker_contact_consent AS consent, worker_contact_consent_version AS version,
    worker_contact_consent_at::text AS at FROM public.profiles WHERE id = $1`, [id])).rows[0];
}
async function optIn(id = worker) {
  return as('authenticated', id, () => db.query(`UPDATE public.profiles
    SET worker_contact_consent = true, worker_contact_consent_version = $2 WHERE id = $1`, [id, version]));
}
async function resolve(id = worker, caller: string | null = hospital, role: 'authenticated' | 'anon' = 'authenticated') {
  return as(role, caller, async () => (await db.query<{ phone: string }>(
    'SELECT public.resolve_worker_contact($1::uuid) AS phone', [id])).rows[0].phone);
}
async function unavailable(id = worker) {
  await expect(resolve(id)).rejects.toMatchObject({ code: 'P0001', message: 'CONTACT_UNAVAILABLE' });
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY, role text NOT NULL, phone text, is_exposed boolean DEFAULT false
    );
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_profile ON public.profiles TO authenticated
      USING (id = auth.uid()) WITH CHECK (id = auth.uid());
    GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
    CREATE VIEW public.public_profiles AS SELECT id, role, is_exposed,
      CASE WHEN phone IS NULL THEN NULL ELSE '010-****-' || right(phone, 4) END AS phone
      FROM public.profiles WHERE is_exposed = true;
    GRANT SELECT ON public.public_profiles TO anon, authenticated;
    INSERT INTO public.profiles VALUES
      ('${worker}', 'worker', '010-1234-5678', true),
      ('${hospital}', 'hospital', '02-123-4567', true),
      ('${otherWorker}', 'worker', '010-9876-5432', true);
  `);
  originalView = (await db.query<{ definition: string }>("SELECT pg_get_viewdef('public.public_profiles'::regclass) AS definition")).rows[0].definition;
  originalPolicies = (await db.query("SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'")).rows;
  await db.exec(migration);
}, 60_000);
beforeEach(async () => { await db.exec('BEGIN'); });
afterEach(async () => { await db.exec('ROLLBACK'); });
afterAll(async () => { await db.close(); });

describe('worker contact consent migration on PostgreSQL (PGlite)', () => {
  it('keeps initial legacy consent unknown with no fabricated receipt', async () => {
    expect(await receipt()).toEqual({ consent: null, version: null, at: null });
    await unavailable();
  });

  it('keeps consent optional on new worker insertion and ignores a fake timestamp', async () => {
    await as('authenticated', newWorker, () => db.query(`INSERT INTO public.profiles
      (id, role, phone, worker_contact_consent_at) VALUES ($1, 'worker', '010-1111-2222', '2001-01-01')`, [newWorker]));
    expect(await receipt(newWorker)).toEqual({ consent: null, version: null, at: null });
  });

  it('records an optional decline without requiring a version', async () => {
    await as('authenticated', worker, () => db.query('UPDATE public.profiles SET worker_contact_consent = false WHERE id = $1', [worker]));
    expect(await receipt()).toMatchObject({ consent: false, version: null, at: expect.any(String) });
    await unavailable();
  });

  it('stamps affirmative consent on INSERT using the server clock', async () => {
    await as('authenticated', newWorker, () => db.query(`INSERT INTO public.profiles
      (id, role, phone, worker_contact_consent, worker_contact_consent_version, worker_contact_consent_at)
      VALUES ($1, 'worker', '010-1111-2222', true, $2, '2001-01-01')`, [newWorker, version]));
    const now = (await db.query<{ now: string }>('SELECT transaction_timestamp()::text AS now')).rows[0].now;
    expect(await receipt(newWorker)).toEqual({ consent: true, version, at: now });
  });

  it('stamps affirmative consent on UPDATE and overrides client timestamp spoofing', async () => {
    await as('authenticated', worker, () => db.query(`UPDATE public.profiles SET worker_contact_consent = true,
      worker_contact_consent_version = $2, worker_contact_consent_at = '2001-01-01' WHERE id = $1`, [worker, version]));
    const now = (await db.query<{ now: string }>('SELECT transaction_timestamp()::text AS now')).rows[0].now;
    expect(await receipt()).toEqual({ consent: true, version, at: now });
  });

  it.each([null, '', '2020-v0'])('rejects affirmative consent with invalid version %s', async supplied => {
    await expect(as('authenticated', worker, () => db.query(`UPDATE public.profiles
      SET worker_contact_consent = true, worker_contact_consent_version = $2 WHERE id = $1`, [worker, supplied])))
      .rejects.toMatchObject({ code: '23514' });
    expect(await receipt()).toEqual({ consent: null, version: null, at: null });
  });

  it('preserves the receipt on unrelated saves, identical consent payloads, and timestamp-only spoofing', async () => {
    await optIn();
    // An old legitimate receipt makes a refresh visible even inside one transaction.
    await db.exec(`ALTER TABLE public.profiles DISABLE TRIGGER worker_contact_consent_guard;
      UPDATE public.profiles SET worker_contact_consent_at = '2026-01-01' WHERE id = '${worker}';
      ALTER TABLE public.profiles ENABLE TRIGGER worker_contact_consent_guard;`);
    const before = await receipt();
    await as('authenticated', worker, () => db.query(`UPDATE public.profiles SET phone = '010-2222-3333',
      worker_contact_consent = true, worker_contact_consent_version = $2,
      worker_contact_consent_at = '2001-01-01' WHERE id = $1`, [worker, version]));
    expect(await receipt()).toEqual(before);
  });

  it('prevents one worker from changing another worker consent through RLS', async () => {
    const result = await as('authenticated', otherWorker, () => db.query(`UPDATE public.profiles
      SET worker_contact_consent = true, worker_contact_consent_version = $2 WHERE id = $1 RETURNING id`, [worker, version]));
    expect(result.rows).toEqual([]);
    expect(await receipt()).toMatchObject({ consent: null });
  });

  it('checks ownership in the trigger even if a permissive policy is mistakenly added', async () => {
    await db.exec('CREATE POLICY accidental_access ON public.profiles TO authenticated USING (true) WITH CHECK (true)');
    await expect(as('authenticated', otherWorker, () => db.query(`UPDATE public.profiles
      SET worker_contact_consent = true, worker_contact_consent_version = $2 WHERE id = $1`, [worker, version])))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('rejects hospital consent and a same-statement hospital-to-worker masquerade', async () => {
    for (const role of ['hospital', 'worker']) {
      await expect(as('authenticated', hospital, () => db.query(`UPDATE public.profiles
        SET role = $2, worker_contact_consent = true, worker_contact_consent_version = $3 WHERE id = $1`, [hospital, role, version])))
        .rejects.toMatchObject({ code: '42501' });
    }
  });

  it.each([false, true])('rejects worker-to-hospital escalation without a consent change (accepted=%s)', async accepted => {
    await optIn();
    if (accepted) await optIn(otherWorker);
    const before = await receipt(otherWorker);
    await expect(as('authenticated', otherWorker, () => db.query(
      "UPDATE public.profiles SET role = 'hospital' WHERE id = $1", [otherWorker])))
      .rejects.toMatchObject({ code: '42501', message: 'PROFILE_IDENTITY_FORBIDDEN' });
    expect((await db.query('SELECT role FROM public.profiles WHERE id = $1', [otherWorker])).rows)
      .toEqual([{ role: 'worker' }]);
    expect(await receipt(otherWorker)).toEqual(before);
    await expect(resolve(worker, otherWorker)).rejects.toMatchObject({ message: 'HOSPITAL_REQUIRED' });
  });

  it('rejects id-only changes in the trigger even under a permissive RLS policy', async () => {
    await db.exec('CREATE POLICY accidental_access ON public.profiles TO authenticated USING (true) WITH CHECK (true)');
    await expect(as('authenticated', worker, () => db.query(
      'UPDATE public.profiles SET id = $2 WHERE id = $1', [worker, newWorker])))
      .rejects.toMatchObject({ code: '42501', message: 'PROFILE_IDENTITY_FORBIDDEN' });
    expect(await receipt()).toEqual({ consent: null, version: null, at: null });
  });

  it.each(['hospital', 'worker'])('preserves intentional %s INSERT registration and unrelated own edits', async role => {
    await as('authenticated', newWorker, () => db.query(
      'INSERT INTO public.profiles (id, role, phone) VALUES ($1, $2, $3)', [newWorker, role, '010-1111-2222']));
    await as('authenticated', newWorker, () => db.query(`UPDATE public.profiles
      SET role = $2, id = $1, phone = '010-2222-3333', is_exposed = true WHERE id = $1`, [newWorker, role]));
    expect((await db.query('SELECT role, phone, is_exposed FROM public.profiles WHERE id = $1', [newWorker])).rows)
      .toEqual([{ role, phone: '010-2222-3333', is_exposed: true }]);
    expect(await receipt(newWorker)).toEqual({ consent: null, version: null, at: null });
  });

  it('allows trusted SQL admin role/id corrections without refreshing the consent receipt', async () => {
    await optIn();
    const before = await receipt();
    await db.query("UPDATE public.profiles SET role = 'hospital', id = $2 WHERE id = $1", [worker, newWorker]);
    expect((await db.query('SELECT role FROM public.profiles WHERE id = $1', [newWorker])).rows)
      .toEqual([{ role: 'hospital' }]);
    expect(await receipt(newWorker)).toEqual(before);
    await db.query("UPDATE public.profiles SET role = 'worker', id = $2 WHERE id = $1", [newWorker, worker]);
    expect(await receipt()).toEqual(before);
    expect(await resolve()).toBe('01012345678');
  });

  it('does not treat a privileged SQL session with an end-user JWT as an identity administrator', async () => {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [worker]);
    await db.exec('SAVEPOINT identity_update');
    await expect(db.query("UPDATE public.profiles SET role = 'hospital' WHERE id = $1", [worker]))
      .rejects.toMatchObject({ code: '42501', message: 'PROFILE_IDENTITY_FORBIDDEN' });
    await db.exec('ROLLBACK TO SAVEPOINT identity_update; RELEASE SAVEPOINT identity_update');
    await db.query("SELECT set_config('request.jwt.claim.sub', '', true)");
  });

  it('allows a controlled SQL administrator to record consent while still server stamping', async () => {
    await db.query(`UPDATE public.profiles SET worker_contact_consent = true,
      worker_contact_consent_version = $2, worker_contact_consent_at = '2001-01-01' WHERE id = $1`, [worker, version]);
    expect(await receipt()).toMatchObject({ consent: true, version, at: expect.not.stringContaining('2001-01-01') });
  });

  it('returns only a normalized phone to a signed-in hospital', async () => {
    await optIn();
    expect(await resolve()).toBe('01012345678');
  });

  it('rejects anonymous execution and an authenticated role without a user', async () => {
    await optIn();
    await expect(resolve(worker, null, 'anon')).rejects.toMatchObject({ code: '42501' });
    await expect(resolve(worker, null)).rejects.toMatchObject({ message: 'AUTH_REQUIRED' });
  });

  it('rejects a worker and a signed-in user without a hospital profile', async () => {
    await optIn();
    await expect(resolve(worker, otherWorker)).rejects.toMatchObject({ message: 'HOSPITAL_REQUIRED' });
    await expect(resolve(worker, absent)).rejects.toMatchObject({ message: 'HOSPITAL_REQUIRED' });
  });

  it('uses the same unavailable error for nonexistent, hospital, and hidden targets', async () => {
    await optIn();
    await unavailable(absent);
    await unavailable(hospital);
    await db.query('UPDATE public.profiles SET is_exposed = false WHERE id = $1', [worker]);
    await unavailable();
    await db.query('UPDATE public.profiles SET is_exposed = NULL WHERE id = $1', [worker]);
    await unavailable();
  });

  it('revokes immediately even with an obsolete or missing version', async () => {
    await optIn();
    await as('authenticated', worker, () => db.query(`UPDATE public.profiles SET worker_contact_consent = false,
      worker_contact_consent_version = 'old-version' WHERE id = $1`, [worker]));
    expect(await receipt()).toMatchObject({ consent: false, at: expect.any(String) });
    await unavailable();
  });

  it('clearing consent to null fails closed and clears the receipt', async () => {
    await optIn();
    await as('authenticated', worker, () => db.query('UPDATE public.profiles SET worker_contact_consent = NULL WHERE id = $1', [worker]));
    expect(await receipt()).toEqual({ consent: null, version: null, at: null });
    await unavailable();
  });

  it('rejects stored obsolete affirmative consent even if an administrator bypassed the trigger', async () => {
    await optIn();
    await db.exec(`ALTER TABLE public.profiles DISABLE TRIGGER worker_contact_consent_guard;
      UPDATE public.profiles SET worker_contact_consent_version = 'old-version' WHERE id = '${worker}';
      ALTER TABLE public.profiles ENABLE TRIGGER worker_contact_consent_guard;`);
    await unavailable();
  });

  it.each(['010-****-5678', '0101234', '010--1234-5678', ' 01012345678', '01012345678 ', '010\t1234\t5678',
    '01012345678\n', '01012345678;ext=1', 'tel:01012345678', '010(1234)5678', '+0123456789', '１２３４５６７８９０', '', null])(
    'rejects malformed/masked phone %j before normalization', async phone => {
      expect(validateContactPhone(phone)).toBeNull();
      await optIn();
      await db.query('UPDATE public.profiles SET phone = $2 WHERE id = $1', [worker, phone]);
      await unavailable();
    });

  it.each(['010-1234-5678', '010 1234 5678', '02-123-4567', '1588-1234', '+82-10-1234-5678', '+1 212 555 1234'])(
    'matches the frontend phone validator for valid number %s', async phone => {
      await optIn();
      await db.query('UPDATE public.profiles SET phone = $2 WHERE id = $1', [worker, phone]);
      expect(await resolve()).toBe(validateContactPhone(phone));
    });

  it('does not require an invented accepts_sms column; honors explicit false if a legacy column exists', async () => {
    await optIn();
    expect(await resolve()).toBe('01012345678');
    await db.exec('ALTER TABLE public.profiles ADD COLUMN accepts_sms boolean');
    expect(await resolve()).toBe('01012345678');
    await db.query('UPDATE public.profiles SET accepts_sms = false WHERE id = $1', [worker]);
    await unavailable();
  });

  it('honors an actual quoted camel-case acceptsSms column without requiring the snake-case column', async () => {
    await optIn();
    await db.exec('ALTER TABLE public.profiles ADD COLUMN "acceptsSms" boolean');
    expect(await resolve()).toBe('01012345678');
    await db.query('UPDATE public.profiles SET "acceptsSms" = true WHERE id = $1', [worker]);
    expect(await resolve()).toBe('01012345678');
    await db.query('UPDATE public.profiles SET "acceptsSms" = false WHERE id = $1', [worker]);
    await unavailable();
  });

  it.each([[false, true], [true, false], [false, null], [null, false]])(
    'lets either legacy opt-out veto when both columns exist (snake=%s, camel=%s)', async (snake, camel) => {
      await optIn();
      await db.exec('ALTER TABLE public.profiles ADD COLUMN accepts_sms boolean, ADD COLUMN "acceptsSms" boolean');
      await db.query('UPDATE public.profiles SET accepts_sms = $2, "acceptsSms" = $3 WHERE id = $1', [worker, snake, camel]);
      await unavailable();
    });

  it('retains peer SELECT isolation and the original masked public view and RLS policies', async () => {
    await optIn();
    const peer = await as('authenticated', hospital, () => db.query('SELECT phone FROM public.profiles WHERE id = $1', [worker]));
    expect(peer.rows).toEqual([]);
    const masked = await as('anon', null, () => db.query('SELECT phone FROM public.public_profiles WHERE id = $1', [worker]));
    expect(masked.rows).toEqual([{ phone: '010-****-5678' }]);
    expect((await db.query<{ definition: string }>("SELECT pg_get_viewdef('public.public_profiles'::regclass) AS definition")).rows[0].definition).toBe(originalView);
    expect((await db.query("SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'")).rows).toEqual(originalPolicies);
  });

  it('locks down function privileges/search_path and resists temporary-table shadowing', async () => {
    await optIn();
    const metadata = (await db.query(`SELECT p.prosecdef, p.proconfig,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
      FROM pg_proc p WHERE p.oid = 'public.resolve_worker_contact(uuid)'::regprocedure`)).rows[0];
    expect(metadata).toMatchObject({ prosecdef: true, proconfig: ['search_path=""'], anon_execute: false, authenticated_execute: true });
    await expect(as('authenticated', otherWorker, async () => {
      await db.exec(`CREATE TEMP TABLE profiles (id uuid, role text);
        INSERT INTO profiles VALUES ('${otherWorker}', 'hospital'); SET LOCAL search_path = pg_temp, public;`);
      return db.query('SELECT public.resolve_worker_contact($1)', [worker]);
    })).rejects.toMatchObject({ message: 'HOSPITAL_REQUIRED' });
  });

  it('blocks affirmative INSERT with a missing version and insertion under another user id', async () => {
    await expect(as('authenticated', newWorker, () => db.query(`INSERT INTO public.profiles
      (id, role, worker_contact_consent) VALUES ($1, 'worker', true)`, [newWorker])))
      .rejects.toMatchObject({ code: '23514' });
    await expect(as('authenticated', worker, () => db.query(`INSERT INTO public.profiles
      (id, role, worker_contact_consent, worker_contact_consent_version) VALUES ($1, 'worker', true, $2)`, [newWorker, version])))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('does not refresh or erase an accepted timestamp with a timestamp-only update', async () => {
    await optIn();
    const before = await receipt();
    await as('authenticated', worker, () => db.query(`UPDATE public.profiles
      SET worker_contact_consent_at = NULL WHERE id = $1`, [worker]));
    expect(await receipt()).toEqual(before);
  });

  it('does not mutate profiles when resolving and never grants anonymous raw SELECT', async () => {
    await optIn();
    const before = (await db.query('SELECT * FROM public.profiles ORDER BY id')).rows;
    expect(await resolve()).toBe('01012345678');
    expect((await db.query('SELECT * FROM public.profiles ORDER BY id')).rows).toEqual(before);
    await expect(as('anon', null, () => db.query('SELECT phone FROM public.profiles')))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('supports a fail-closed rollback without deleting consent or receipts', async () => {
    await optIn();
    const before = await receipt();
    await db.exec('REVOKE ALL ON FUNCTION public.resolve_worker_contact(uuid) FROM PUBLIC, anon, authenticated');
    await expect(resolve()).rejects.toMatchObject({ code: '42501' });
    expect(await receipt()).toEqual(before);
    // Re-enabling is explicit; retrying the approved migration restores its grant.
    await db.exec(migration);
    expect(await resolve()).toBe('01012345678');
    expect(await receipt()).toEqual(before);
  });

  it('is retry-safe without resetting consent, receipts, view, or privileges', async () => {
    await optIn();
    const before = await receipt();
    await db.exec(migration);
    expect(await receipt()).toEqual(before);
    expect(await receipt(otherWorker)).toEqual({ consent: null, version: null, at: null });
    expect(await resolve()).toBe('01012345678');
    await expect(resolve(worker, null, 'anon')).rejects.toMatchObject({ code: '42501' });
    expect((await db.query<{ definition: string }>("SELECT pg_get_viewdef('public.public_profiles'::regclass) AS definition")).rows[0].definition).toBe(originalView);
  });
});
