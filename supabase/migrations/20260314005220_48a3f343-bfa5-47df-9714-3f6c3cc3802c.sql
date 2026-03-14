
-- Create monthly_subscriptions table
CREATE TABLE public.monthly_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  plate text NOT NULL,
  customer_name text,
  customer_phone text,
  amount numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monthly_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Superadmin manages all subscriptions" ON public.monthly_subscriptions FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant staff manages subscriptions" ON public.monthly_subscriptions FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Add DELETE policy for notifications so users can delete their own
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Superadmin deletes notifications" ON public.notifications FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER set_updated_at_monthly_subscriptions BEFORE UPDATE ON public.monthly_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
