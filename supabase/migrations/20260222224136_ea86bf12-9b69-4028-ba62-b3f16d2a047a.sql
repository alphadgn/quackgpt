
-- Security scan results table
CREATE TABLE public.security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text NOT NULL DEFAULT 'scheduled',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  vulnerability_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  ok_count integer NOT NULL DEFAULT 0,
  triggered_by text
);

ALTER TABLE public.security_scans ENABLE ROW LEVEL SECURITY;

-- Deny all client access - only service role via edge functions
CREATE POLICY "No direct client access to security_scans"
  ON public.security_scans FOR ALL
  USING (false);
