-- ============ Enums ============
DO $$ BEGIN
  CREATE TYPE public.audit_severity AS ENUM ('info','low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_category AS ENUM ('auth','mfa','session','project','ai','deployment','security','admin','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ MFA backup codes ============
CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mfa_backup_codes_user_idx ON public.mfa_backup_codes(user_id);
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mfa_codes_select_own ON public.mfa_backup_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY mfa_codes_insert_own ON public.mfa_backup_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY mfa_codes_update_own ON public.mfa_backup_codes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY mfa_codes_delete_own ON public.mfa_backup_codes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ User sessions ============
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  user_agent text,
  browser text,
  os text,
  device text,
  ip_address text,
  location text,
  mfa_verified boolean NOT NULL DEFAULT false,
  risk_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON public.user_sessions(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_idx ON public.user_sessions(session_token);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_select_own_or_admin ON public.user_sessions
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_sessions_insert_own ON public.user_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_sessions_update_own ON public.user_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_sessions_delete_own ON public.user_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ Audit log enrichment ============
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS severity public.audit_severity NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS category public.audit_category NOT NULL DEFAULT 'system';

CREATE INDEX IF NOT EXISTS activity_logs_user_created_idx
  ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_severity_idx
  ON public.activity_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_category_idx
  ON public.activity_logs(category, created_at DESC);

-- ============ Realtime ============
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;