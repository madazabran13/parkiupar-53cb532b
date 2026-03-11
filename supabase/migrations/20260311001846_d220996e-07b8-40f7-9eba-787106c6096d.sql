
-- =============================================
-- 1. Tenant Schedules Table
-- =============================================
CREATE TABLE public.tenant_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day_group text NOT NULL DEFAULT 'weekday' CHECK (day_group IN ('weekday', 'saturday', 'sunday')),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_schedules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenant_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies for tenant_schedules
CREATE POLICY "Tenant admin manages schedules" ON public.tenant_schedules
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant users read schedules" ON public.tenant_schedules
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));

CREATE POLICY "Public reads active schedules" ON public.tenant_schedules
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Superadmin manages all schedules" ON public.tenant_schedules
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));

-- =============================================
-- 2. Parking Spaces Table
-- =============================================
CREATE TABLE public.parking_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  space_number text NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  reserved_by uuid,
  reserved_at timestamptz,
  reservation_expires_at timestamptz,
  session_id uuid REFERENCES public.parking_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, space_number)
);

ALTER TABLE public.parking_spaces ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parking_spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies for parking_spaces
CREATE POLICY "Tenant staff manages spaces" ON public.parking_spaces
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Public reads spaces" ON public.parking_spaces
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Superadmin manages all spaces" ON public.parking_spaces
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));

-- =============================================
-- 3. Space Reservations Table (for booking history/tracking)
-- =============================================
CREATE TABLE public.space_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
  reserved_by uuid,
  customer_name text,
  customer_phone text,
  plate text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.space_reservations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.space_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies for space_reservations
CREATE POLICY "Tenant staff manages reservations" ON public.space_reservations
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users read own reservations" ON public.space_reservations
  FOR SELECT TO authenticated
  USING (reserved_by = auth.uid());

CREATE POLICY "Users create reservations" ON public.space_reservations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmin manages all reservations" ON public.space_reservations
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));
