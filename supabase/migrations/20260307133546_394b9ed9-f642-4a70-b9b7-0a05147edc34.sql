
-- Plan change requests table
CREATE TABLE public.plan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_plan_id uuid REFERENCES public.plans(id),
  requested_plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_requests ENABLE ROW LEVEL SECURITY;

-- Tenant admins can read their own requests
CREATE POLICY "Tenant admin reads own requests"
ON public.plan_requests FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Tenant admins can create requests
CREATE POLICY "Tenant admin creates requests"
ON public.plan_requests FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Superadmin full access
CREATE POLICY "Superadmin manages plan requests"
ON public.plan_requests FOR ALL TO authenticated
USING (is_superadmin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_plan_requests_updated_at
  BEFORE UPDATE ON public.plan_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
