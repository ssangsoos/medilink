-- Apply as the trusted profiles owner / SQL administrator, in one transaction.
-- No backfill: existing workers must make a new, explicit consent decision.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS worker_contact_consent boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS worker_contact_consent_version text,
  ADD COLUMN IF NOT EXISTS worker_contact_consent_at timestamptz;

-- SECURITY INVOKER is deliberate: current_user must be the actual writing role,
-- not the function owner. Existing base-table RLS continues to apply unchanged.
CREATE OR REPLACE FUNCTION public.stamp_worker_contact_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  receipt_changed boolean;
  trusted_sql_admin boolean;
BEGIN
  -- Only trusted non-end-user SQL sessions may perform administrative changes.
  -- An end-user JWT must never turn a privileged session into an admin instruction.
  trusted_sql_admin := auth.uid() IS NULL
    AND current_user IN ('postgres', 'supabase_admin', 'service_role');

  -- Own-row RLS does not protect role/id columns. Guard every UPDATE before the
  -- unchanged-receipt early return; preserve intentional INSERT registration.
  IF TG_OP = 'UPDATE' AND NOT trusted_sql_admin THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PROFILE_IDENTITY_FORBIDDEN';
    END IF;
  END IF;

  -- Unknown is never an affirmative receipt. Ignore client-provided metadata.
  IF NEW.worker_contact_consent IS NULL THEN
    NEW.worker_contact_consent_version := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    receipt_changed := NEW.worker_contact_consent IS NOT NULL;
    NEW.worker_contact_consent_at := NULL;
  ELSE
    receipt_changed := NEW.worker_contact_consent IS DISTINCT FROM OLD.worker_contact_consent
      OR NEW.worker_contact_consent_version IS DISTINCT FROM OLD.worker_contact_consent_version;
    -- A phone/address/exposure save or a replay of the same consent is not a new receipt.
    -- Timestamp-only writes cannot forge, erase, or refresh an existing receipt.
    NEW.worker_contact_consent_at := OLD.worker_contact_consent_at;
  END IF;

  IF NOT receipt_changed THEN
    RETURN NEW;
  END IF;

  IF NOT trusted_sql_admin THEN
    IF current_user <> 'authenticated' OR auth.uid() IS NULL
      OR NEW.id IS DISTINCT FROM auth.uid() OR NEW.role IS DISTINCT FROM 'worker' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKER_CONSENT_FORBIDDEN';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF OLD.id IS DISTINCT FROM auth.uid() OR OLD.role IS DISTINCT FROM 'worker' THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'WORKER_CONSENT_FORBIDDEN';
      END IF;
    END IF;
  END IF;

  IF NEW.worker_contact_consent IS TRUE
    AND NEW.worker_contact_consent_version IS DISTINCT FROM '2026-09-17-v1' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'WORKER_CONSENT_VERSION_REQUIRED';
  END IF;

  IF NEW.worker_contact_consent IS NULL THEN
    NEW.worker_contact_consent_at := NULL;
  ELSE
    -- Both an explicit acceptance and a decline/revocation get a server receipt.
    -- False is always permitted with respect to version, including a stale client.
    NEW.worker_contact_consent_at := pg_catalog.transaction_timestamp();
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.stamp_worker_contact_consent() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS worker_contact_consent_guard ON public.profiles;
CREATE TRIGGER worker_contact_consent_guard
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.stamp_worker_contact_consent();

-- Narrow, read-only declassification boundary. It returns one validated phone,
-- never a profile row, and deliberately does not grant table access or change RLS.
CREATE OR REPLACE FUNCTION public.resolve_worker_contact(p_worker_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  requester_id uuid;
  contact_phone text;
BEGIN
  requester_id := auth.uid();
  IF requester_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS requester
    WHERE requester.id = requester_id AND requester.role = 'hospital'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'HOSPITAL_REQUIRED';
  END IF;

  SELECT target.phone INTO contact_phone
  FROM public.profiles AS target
  WHERE target.id = p_worker_id
    AND target.role = 'worker'
    AND target.is_exposed IS TRUE
    AND target.worker_contact_consent IS TRUE
    AND target.worker_contact_consent_version = '2026-09-17-v1'
    -- No dependency on an invented column. An actual legacy boolean opt-out,
    -- if present in this deployment, must still win over the new consent.
    AND (pg_catalog.to_jsonb(target) -> 'accepts_sms') IS DISTINCT FROM 'false'::pg_catalog.jsonb
    AND (pg_catalog.to_jsonb(target) -> 'acceptsSms') IS DISTINCT FROM 'false'::pg_catalog.jsonb;

  -- Validate BEFORE normalization; never strip/reconstruct masking characters.
  -- Match contactLinks.ts: ASCII digits, optional initial +, single space/hyphen
  -- separators; Korean local/service numbers or international E.164 form.
  IF contact_phone IS NULL OR contact_phone !~ '^\+?[0-9]+([ -][0-9]+)*$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CONTACT_UNAVAILABLE';
  END IF;
  contact_phone := pg_catalog.replace(pg_catalog.replace(contact_phone, ' ', ''), '-', '');
  IF contact_phone !~ '^(0[0-9]{8,10}|1[568][0-9]{6}|\+[1-9][0-9]{7,14})$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CONTACT_UNAVAILABLE';
  END IF;
  RETURN contact_phone;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_worker_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_worker_contact(uuid) TO authenticated;
