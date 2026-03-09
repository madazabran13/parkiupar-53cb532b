
-- ============================================
-- ParkiUpar SaaS - Complete Database Schema
-- ============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'operator', 'viewer', 'enduser');
CREATE TYPE public.vehicle_type AS ENUM ('car', 'motorcycle', 'truck', 'bicycle');
CREATE TYPE public.session_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.license_type AS ENUM ('basic', 'pro', 'enterprise');

-- 2. TABLES

-- Plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_spaces INTEGER NOT NULL DEFAULT 50,
  modules JSONB NOT NULL DEFAULT '["dashboard","parking","customers","rates"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants table (parking lots)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e40af',
  secondary_color TEXT NOT NULL DEFAULT '#3b82f6',
  plan_id UUID REFERENCES public.plans(id),
  address TEXT,
  city TEXT NOT NULL DEFAULT 'Valledupar',
  phone TEXT,
  email TEXT,
  total_spaces INTEGER NOT NULL DEFAULT 20,
  available_spaces INTEGER NOT NULL DEFAULT 20,
  latitude NUMERIC(10,7) DEFAULT 10.4735,
  longitude NUMERIC(10,7) DEFAULT -73.2503,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  role public.app_role NOT NULL DEFAULT 'enduser',
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicle rates per tenant
CREATE TABLE public.vehicle_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_type public.vehicle_type NOT NULL,
  rate_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_minutes INTEGER NOT NULL DEFAULT 15,
  fraction_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, vehicle_type)
);

-- Customers (vehicle owners)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  plate TEXT NOT NULL,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'car',
  brand TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parking sessions
CREATE TABLE public.parking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  plate TEXT NOT NULL,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'car',
  customer_name TEXT,
  customer_phone TEXT,
  space_number TEXT,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_time TIMESTAMPTZ,
  hours_parked NUMERIC(8,2),
  rate_per_hour NUMERIC(10,2),
  total_amount NUMERIC(12,2),
  status public.session_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SECURITY DEFINER FUNCTIONS (for RLS without recursion)

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = _user_id AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = _user_id AND role = _role
  );
$$;

-- 4. PARKING FEE CALCULATION FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_parking_fee(
  _entry_time TIMESTAMPTZ,
  _exit_time TIMESTAMPTZ,
  _rate_per_hour NUMERIC,
  _fraction_minutes INTEGER DEFAULT 15
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _total_minutes NUMERIC;
  _fractions INTEGER;
  _cost_per_fraction NUMERIC;
BEGIN
  _total_minutes := EXTRACT(EPOCH FROM (_exit_time - _entry_time)) / 60.0;
  IF _total_minutes <= 0 THEN RETURN 0; END IF;
  _fractions := CEIL(_total_minutes / _fraction_minutes);
  _cost_per_fraction := _rate_per_hour * _fraction_minutes / 60.0;
  RETURN ROUND(_fractions * _cost_per_fraction, 2);
END;
$$;

-- 5. TRIGGER: Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'enduser'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. TRIGGER: Update available_spaces on session insert (active)
CREATE OR REPLACE FUNCTION public.handle_session_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.tenants
    SET available_spaces = GREATEST(available_spaces - 1, 0),
        updated_at = now()
    WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_session_start
  AFTER INSERT ON public.parking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_session_start();

-- 7. TRIGGER: Update available_spaces and customer stats on session complete
CREATE OR REPLACE FUNCTION public.handle_session_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'completed' THEN
    -- Increment available spaces
    UPDATE public.tenants
    SET available_spaces = LEAST(available_spaces + 1, total_spaces),
        updated_at = now()
    WHERE id = NEW.tenant_id;

    -- Update customer stats
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE public.customers
      SET total_visits = total_visits + 1,
          total_spent = total_spent + COALESCE(NEW.total_amount, 0),
          updated_at = now()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;

  -- Handle cancellation - restore space
  IF OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    UPDATE public.tenants
    SET available_spaces = LEAST(available_spaces + 1, total_spaces),
        updated_at = now()
    WHERE id = NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_session_complete
  AFTER UPDATE ON public.parking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_session_complete();

-- 8. TRIGGER: updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vehicle_rates_updated_at BEFORE UPDATE ON public.vehicle_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_parking_sessions_updated_at BEFORE UPDATE ON public.parking_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 9. RLS POLICIES

-- Plans: public read
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are publicly readable" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Superadmin manages plans" ON public.plans FOR ALL USING (public.is_superadmin(auth.uid()));

-- Tenants: public read for map, superadmin full access, tenant users read own
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants publicly readable" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Superadmin manages tenants" ON public.tenants FOR ALL USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant admin updates own" ON public.tenants FOR UPDATE USING (
  id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin')
);

-- User profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.user_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Superadmin manages profiles" ON public.user_profiles FOR ALL USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Tenant admin reads team" ON public.user_profiles FOR SELECT USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin')
);

-- Vehicle rates
ALTER TABLE public.vehicle_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users read rates" ON public.vehicle_rates FOR SELECT USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid())
);
CREATE POLICY "Tenant admin manages rates" ON public.vehicle_rates FOR ALL USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin')
) WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Superadmin manages all rates" ON public.vehicle_rates FOR ALL USING (public.is_superadmin(auth.uid()));

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users read customers" ON public.customers FOR SELECT USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid())
);
CREATE POLICY "Tenant staff manages customers" ON public.customers FOR ALL USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
) WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
);
CREATE POLICY "Superadmin manages all customers" ON public.customers FOR ALL USING (public.is_superadmin(auth.uid()));

-- Vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users read vehicles" ON public.vehicles FOR SELECT USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid())
);
CREATE POLICY "Tenant staff manages vehicles" ON public.vehicles FOR ALL USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
) WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
);
CREATE POLICY "Superadmin manages all vehicles" ON public.vehicles FOR ALL USING (public.is_superadmin(auth.uid()));

-- Parking sessions
ALTER TABLE public.parking_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users read sessions" ON public.parking_sessions FOR SELECT USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_superadmin(auth.uid())
);
CREATE POLICY "Tenant staff manages sessions" ON public.parking_sessions FOR ALL USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
) WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
);
CREATE POLICY "Superadmin manages all sessions" ON public.parking_sessions FOR ALL USING (public.is_superadmin(auth.uid()));

-- 10. STORAGE BUCKET for tenant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-logos', 'tenant-logos', true);

CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'tenant-logos');
CREATE POLICY "Superadmin uploads logos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'tenant-logos' AND public.is_superadmin(auth.uid())
);
CREATE POLICY "Superadmin deletes logos" ON storage.objects FOR DELETE USING (
  bucket_id = 'tenant-logos' AND public.is_superadmin(auth.uid())
);

-- 11. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_sessions;
