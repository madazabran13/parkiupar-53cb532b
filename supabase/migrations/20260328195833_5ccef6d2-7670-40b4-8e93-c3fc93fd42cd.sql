
-- Incident Reports table
CREATE TABLE public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'bug',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users create own reports"
ON public.incident_reports FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can read own reports
CREATE POLICY "Users read own reports"
ON public.incident_reports FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Superadmin manages all
CREATE POLICY "Superadmin manages all reports"
ON public.incident_reports FOR ALL TO authenticated
USING (is_superadmin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
