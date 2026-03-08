
-- Payment history table for tracking all renewals and payments
CREATE TABLE public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  plan_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  months integer NOT NULL DEFAULT 1,
  previous_expires_at timestamptz,
  new_expires_at timestamptz NOT NULL,
  payment_method text DEFAULT 'manual',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Superadmin full access
CREATE POLICY "Superadmin manages payment history"
  ON public.payment_history FOR ALL
  USING (is_superadmin(auth.uid()));

-- Tenant admin reads own history
CREATE POLICY "Tenant admin reads own payment history"
  ON public.payment_history FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
