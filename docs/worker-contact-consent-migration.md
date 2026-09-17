# Worker contact consent: database rollout and recovery

Migration: `supabase/migrations/202609170001_worker_contact_consent.sql`

Consent contract: **`2026-09-17-v1`**

## Scope and contract

Apply the **database migration first**, verify it, then deploy the frontend. Existing members must explicitly consent in their own worker profile. **Do not backfill `true`**, infer consent from exposure, or turn an unknown legacy value into acceptance. Until consent is collected, contact is intentionally unavailable.

Added to `public.profiles`:

| Column | Meaning |
| --- | --- |
| `worker_contact_consent boolean DEFAULT NULL` | `NULL` unknown/legacy; `false` declined/revoked; `true` explicit acceptance |
| `worker_contact_consent_version text` | Acceptance must exactly equal `2026-09-17-v1` |
| `worker_contact_consent_at timestamptz` | Server-written receipt time for the latest explicit decision |

The frontend sends the boolean and version, **not a timestamp**. The `BEFORE INSERT OR UPDATE` trigger overrides any client timestamp. Unrelated saves, identical consent payloads, and timestamp-only writes preserve the existing receipt. A changed decision gets `transaction_timestamp()`; two changes in one transaction may share that timestamp. Clearing consent to `NULL` clears version and timestamp and fails closed. A decline/revocation does not require a valid version (stale clients can always revoke). Only the latest receipt is retained; this is not an event/audit-log system.

Authenticated consent changes must affect the caller's own worker profile. On updates, both old and new rows must identify that worker; a same-statement role change cannot manufacture eligibility. Trusted direct SQL sessions (`postgres`, `supabase_admin`, `service_role`, with no `auth.uid()`) may make controlled administrative corrections, but even those normally receive server timestamps and version validation. Never use that exception to assume consent. Existing own-row RLS is left unchanged.

The trigger also rejects **all non-admin UPDATE changes to `profiles.role` or `profiles.id`**, before the unchanged-receipt early return. A worker cannot promote its own existing profile to hospital and then use the resolver, even without touching consent. Same-value role/id payloads and unrelated own-profile edits remain allowed under existing RLS. Intentional worker/hospital **INSERT registration remains unchanged**; this is an update guard, not a new hospital-approval process. Trusted SQL administrators without an end-user JWT may correct role/id; unchanged consent keeps its existing receipt. Privileged SQL sessions carrying an end-user JWT do not receive this exception.

`public.resolve_worker_contact(p_worker_id uuid)` returns **one normalized phone string**, not a profile. The `SECURITY DEFINER` function has an empty search path and qualified object references. Public/anonymous execution is revoked; authenticated callers must have a nonnull `auth.uid()` and a `profiles.role = 'hospital'` row. The target must be a worker, explicitly exposed, and affirmatively consented to the current contract. If either real legacy column `accepts_sms` or quoted `"acceptsSms"` exists and contains JSON boolean `false`, it additionally vetoes disclosure, even when the other column is true or null. Absent/null columns do not veto or imply acceptance; neither column is required or fabricated. This matches the frontend's explicit-false opt-out behavior.

There is no separate hospital-approval column in this contract. Existing registration/provisioning defines a hospital account; this migration does not add institutional verification. **Review who can initially set `profiles.role` before rollout**, including registration, trusted provisioning functions, and existing triggers. The new update guard closes own-row role escalation but intentionally does not prohibit hospital registration. If hospital roles require approval in your deployment, enforce that in your existing provisioning flow before enabling the endpoint; do not mistake this role check for a new approval system.

Validation occurs before normalization: only ASCII digits, optional initial `+`, and single space/hyphen separators. The normalized shape matches `src/lib/contactLinks.ts`: `0` plus 8–10 digits, `1[568]` plus 6 digits, or `+` plus a nonzero digit and 7–14 further digits. Masking characters, extensions, URI syntax, control characters, Unicode digits, and malformed values are rejected, never reconstructed. This validates dialing syntax, not number ownership or reachability.

Stable errors:

- `AUTH_REQUIRED`, SQLSTATE `42501`: missing authenticated user ID (anonymous execution is already denied by the function ACL).
- `HOSPITAL_REQUIRED`, SQLSTATE `42501`: requester is not a hospital.
- `CONTACT_UNAVAILABLE`, SQLSTATE `P0001`: nonexistent, non-worker, hidden, unknown, declined/revoked, outdated consent, legacy opt-out, or invalid/masked phone. Do not reveal which condition failed.
- `WORKER_CONSENT_FORBIDDEN`, SQLSTATE `42501`: unauthorized consent write.
- `PROFILE_IDENTITY_FORBIDDEN`, SQLSTATE `42501`: non-admin update changing profile role or id, regardless of whether consent changes.
- `WORKER_CONSENT_VERSION_REQUIRED`, SQLSTATE `23514`: affirmative consent without the exact version.

No base-table grant/policy or `public_profiles` definition is changed. The public view remains masked and is never a source for actionable phone links. The resolver sends no SMS/calls, performs no tracking, and changes no profile data. A returned phone is necessarily disclosed to the permitted caller; later revocation cannot retract a number they already saw. Do not log resolver results or persist them in client analytics.

## Operator preflight (read only)

These are instructions for an authorized operator, **not evidence that a remote database was inspected or migrated**. Use the intended project's trusted SQL/admin connection, never a browser/service credential copied into client code. Confirm backup and rollback access first.

```sql
SELECT current_database(), current_user, auth.uid();
SELECT c.relowner::regrole AS owner, c.relrowsecurity, c.relforcerowsecurity, c.relacl
FROM pg_class c WHERE c.oid = 'public.profiles'::regclass;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
SELECT pg_get_viewdef('public.public_profiles'::regclass, true) AS masked_view_definition;
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
SELECT to_regprocedure('public.resolve_worker_contact(uuid)'),
       to_regprocedure('public.stamp_worker_contact_consent()');
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname IN ('postgres', 'supabase_admin', 'anon', 'authenticated', 'service_role');
SELECT has_schema_privilege('anon', 'public', 'CREATE') AS anon_can_create,
       has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_can_create;
```

Preflight acceptance:

1. `profiles` has `id uuid`, `role text`, `phone text`, `is_exposed boolean`; normal authenticated access is own-row only. Capture policy definitions, table ACLs, and masked view definition privately for readback comparison.
2. The three new columns are absent, or a retry already has the exact intended types, nullable consent/default `NULL`, and compatible functions. `ADD COLUMN IF NOT EXISTS` does not repair an incompatible preexisting column/default. Stop on drift or name collisions; review instead of dropping data.
3. The migration/function owner is a trusted administrator who can read target profiles under the real RLS setup (table owner without forced RLS, or an appropriately privileged administrator). Never make an untrusted role the definer owner. Review existing triggers for conflicting consent/role behavior.
4. `auth.uid()` and the `anon`/`authenticated` roles exist. Direct administrative migration execution has no end-user JWT. Untrusted roles must not be able to replace objects/functions in `public` or `auth`.
5. Authenticated users can already insert/update their own profiles. If this deployment uses **column-specific** grants, separately review narrowly scoped access to the consent boolean/version rather than adding broad table grants. No client grant for the timestamp is needed. The migration deliberately makes no table-access changes.
6. Review role provisioning as described above; verify any required hospital-approval boundary. Confirm intentional worker/hospital INSERT registration remains compatible, end-user role/id UPDATE is blocked, and trusted SQL corrections have no end-user JWT. A role lookup is not a substitute for trusted approval. Check whether either optional legacy opt-out column exists and its actual type; a boolean false in either must veto.

## Apply atomically (authorized operator only)

The migration file omits its own `BEGIN`/`COMMIT` so a migration runner may own the transaction. **Do not run the statements individually in autocommit mode**: function creation, ACL revocation, and trigger replacement must be atomic. An example with psql, from the repository root:

```sh
# DATABASE_URL must be the authorized admin connection to the verified target.
psql "$DATABASE_URL" -X --set=ON_ERROR_STOP=1 --single-transaction \
  --file=supabase/migrations/202609170001_worker_contact_consent.sql
```

Alternatively, in a trusted SQL editor, execute `BEGIN;`, the entire file, and `COMMIT;` as one batch, aborting on any error. A reviewed local Supabase migration runner may apply the file transactionally. No commit/push/deploy or remote database write is part of the local verification task.

The migration contains no row update/backfill. Reapplying it preserves decisions and timestamps while recreating the functions/trigger and intended authenticated execution grant. **A retry also re-enables an endpoint previously disabled by the rollback below**; do not rerun it accidentally during an incident.

## Readback and smoke checks

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name LIKE 'worker_contact_consent%';
SELECT p.oid::regprocedure, p.proowner::regrole, p.prosecdef, p.proconfig, p.proacl
FROM pg_proc p
WHERE p.oid IN ('public.resolve_worker_contact(uuid)'::regprocedure,
                'public.stamp_worker_contact_consent()'::regprocedure);
SELECT has_function_privilege('anon', 'public.resolve_worker_contact(uuid)', 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', 'public.resolve_worker_contact(uuid)', 'EXECUTE') AS authenticated_execute;
SELECT tgname, tgenabled, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'worker_contact_consent_guard';
SELECT worker_contact_consent, worker_contact_consent_version, count(*)
FROM public.profiles WHERE role = 'worker'
GROUP BY worker_contact_consent, worker_contact_consent_version;
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
SELECT c.relrowsecurity, c.relforcerowsecurity, c.relacl
FROM pg_class c WHERE c.oid = 'public.profiles'::regclass;
SELECT pg_get_viewdef('public.public_profiles'::regclass, true);
```

Expect `anon_execute = false`, `authenticated_execute = true`, resolver `prosecdef = true`, stamping trigger function `prosecdef = false`, both functions `search_path=""`, and the enabled row-level before-insert/update trigger. Compare unchanged RLS/table ACL/view against preflight. On a first deployment with no concurrent consent writes, legacy workers remain all `NULL`; on retry, compare existing receipts rather than expecting all unknown.

Use dedicated **local/staging test identities and numbers**, not live member numbers, to smoke test: own-worker acceptance with server timestamp, same-payload timestamp preservation, hospital resolution, anonymous/worker denial, hidden/revoked/unknown/invalid generic denial, either actual legacy opt-out column vetoing, role/id-only update rejection, normal worker/hospital registration and unrelated own edits, trusted SQL role correction without JWT, peer direct `SELECT` returning no row, and public view still masked. Do not print real phone values in operator logs. An authenticated worker can read its own receipt with an ordinary owner-only profile query; no public consent fields are necessary. If PostgREST needs schema refresh after the approved migration, request its normal schema-cache reload (`NOTIFY pgrst, 'reload schema';`) and verify the RPC signature before deploying the frontend.

## Fail-closed rollback (preserve consent data)

Disable remote execution first; do **not** drop the columns, erase receipts, remove the stamping trigger, loosen RLS, or restore a phone-from-public-view fallback:

```sql
BEGIN;
REVOKE ALL ON FUNCTION public.resolve_worker_contact(uuid) FROM PUBLIC, anon, authenticated;
COMMIT;
SELECT has_function_privilege('anon', 'public.resolve_worker_contact(uuid)', 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', 'public.resolve_worker_contact(uuid)', 'EXECUTE') AS authenticated_execute;
```

Both results must be false. Inspect role membership/custom grants if either remains true and revoke those paths under a reviewed incident change. The default owner/admin powers are not end-user access. Disable the UI action or show unavailable; never fall back to a masked/guessed number. Existing consent records and owner edits remain available. Re-enable only after investigation and explicit approval, by reapplying the reviewed migration or restoring its authenticated grant and verifying the full boundary again.

## Local PostgreSQL-engine verification / TDD

```sh
npx vitest run tests/workerContactMigration.test.ts
npx eslint tests/workerContactMigration.test.ts
```

The suite runs the **actual migration in PGlite's PostgreSQL WASM engine**, with `auth.uid()` backed by `request.jwt.claim.sub`, real `SET LOCAL ROLE anon/authenticated`, table privileges, owner-only row-level security, a masked public view, trigger execution, and function ACL/catalog checks. Each test is isolated in a transaction; expected SQL errors are recovered using savepoints. No remote database, mocked SQL evaluator, or regex-only migration assertions are used.

Initial migration TDD RED was observed before implementation: the legacy-consent test failed in PostgreSQL with `column "worker_contact_consent" does not exist`. For the role-escalation/opt-out fix, regression tests were added first: **7 failed / 53 passed**, demonstrating accepted role/id-only updates (including a privileged session carrying a user JWT) and disclosed phone values despite camel-case false opt-outs. After the minimal fix: **60 tests passed (one test file)**; the focused ESLint command exited **0**. Only the repository's pre-existing `baseline-browser-mapping` freshness warning was emitted. Added coverage includes role escalation with unknown/accepted unchanged receipts, id protection even under permissive RLS, preserved worker/hospital INSERT registration and same-value identity/unrelated edits, trusted SQL role/id corrections with receipt preservation, and either optional opt-out column overriding true/null in the other. Existing tests still cover optional decline, timestamp spoofing, versions, ownership, resolver denial paths, phone validation parity, unchanged RLS/view, search-path shadowing, no side effects, fail-closed rollback, and migration retry without receipt reset.

The fixture intentionally models the stated minimum schema, not a dump of production. Passing locally does not certify deployment-specific triggers, role provisioning, default privileges, PostgREST caching, or remote migration state; operator preflight/readback remain mandatory.
