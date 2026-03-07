
-- Create vehicle_categories table (combines category + rate per tenant)
CREATE TABLE public.vehicle_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'car',
  rate_per_hour numeric NOT NULL DEFAULT 0,
  fraction_minutes integer NOT NULL DEFAULT 15,
  minimum_minutes integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS policies
CREATE POLICY "Superadmin manages all categories"
  ON public.vehicle_categories FOR ALL
  TO authenticated
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Tenant admin manages categories"
  ON public.vehicle_categories FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant users read categories"
  ON public.vehicle_categories FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_vehicle_categories_updated_at
  BEFORE UPDATE ON public.vehicle_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
