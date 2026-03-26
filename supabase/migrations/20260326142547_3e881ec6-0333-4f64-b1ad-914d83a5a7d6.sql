
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.monthly_subscriptions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  payment_method text DEFAULT 'efectivo',
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manages subscription payments" ON public.subscription_payments
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Superadmin manages all subscription payments" ON public.subscription_payments
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));
