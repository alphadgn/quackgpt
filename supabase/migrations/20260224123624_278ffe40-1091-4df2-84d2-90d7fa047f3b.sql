
-- Security Findings table for granular per-finding tracking
CREATE TABLE public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.security_scans(id) ON DELETE CASCADE,
  component text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  exploit_vector text,
  recommended_fix text,
  status text NOT NULL DEFAULT 'open',
  exploitability_score integer DEFAULT 0,
  impact_score integer DEFAULT 0,
  confidence_score integer DEFAULT 0,
  auto_fix_available boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to security_findings"
  ON public.security_findings AS RESTRICTIVE FOR ALL USING (false);

CREATE TRIGGER update_security_findings_updated_at
  BEFORE UPDATE ON public.security_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Incident Logs table for tracking acknowledgments and resolution
CREATE TABLE public.incident_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES public.security_findings(id) ON DELETE CASCADE,
  acknowledged_by text,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to incident_logs"
  ON public.incident_logs AS RESTRICTIVE FOR ALL USING (false);

-- Add overall_score column to security_scans for the security score metric
ALTER TABLE public.security_scans ADD COLUMN IF NOT EXISTS overall_score integer DEFAULT 100;
