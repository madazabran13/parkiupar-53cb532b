
-- 1. Drop ALL RLS policies that depend on has_role, is_superadmin, get_user_role, get_user_tenant_id
-- tenants
DROP POLICY IF EXISTS "Superadmin manages tenants" ON tenants;
DROP POLICY IF EXISTS "Tenant admin updates own" ON tenants;
-- user_profiles
DROP POLICY IF EXISTS "Superadmin manages profiles" ON user_profiles;
DROP POLICY IF EXISTS "Tenant admin reads team" ON user_profiles;
-- plans
DROP POLICY IF EXISTS "Superadmin manages plans" ON plans;
-- vehicle_rates
DROP POLICY IF EXISTS "Superadmin manages all rates" ON vehicle_rates;
DROP POLICY IF EXISTS "Tenant admin manages rates" ON vehicle_rates;
DROP POLICY IF EXISTS "Tenant users read rates" ON vehicle_rates;
-- vehicle_categories
DROP POLICY IF EXISTS "Superadmin manages all categories" ON vehicle_categories;
DROP POLICY IF EXISTS "Tenant admin manages categories" ON vehicle_categories;
DROP POLICY IF EXISTS "Tenant users read categories" ON vehicle_categories;
-- customers
DROP POLICY IF EXISTS "Superadmin manages all customers" ON customers;
DROP POLICY IF EXISTS "Tenant users read customers" ON customers;
DROP POLICY IF EXISTS "Tenant staff manages customers" ON customers;
-- vehicles
DROP POLICY IF EXISTS "Superadmin manages all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Tenant users read vehicles" ON vehicles;
DROP POLICY IF EXISTS "Tenant staff manages vehicles" ON vehicles;
-- parking_sessions
DROP POLICY IF EXISTS "Superadmin manages all sessions" ON parking_sessions;
DROP POLICY IF EXISTS "Tenant users read sessions" ON parking_sessions;
DROP POLICY IF EXISTS "Tenant staff manages sessions" ON parking_sessions;
-- storage
DROP POLICY IF EXISTS "Superadmin uploads logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin deletes logos" ON storage.objects;

-- 2. Drop functions
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.is_superadmin(uuid);

-- 3. Swap enum
UPDATE user_profiles SET role = 'viewer' WHERE role = 'enduser';
ALTER TABLE user_profiles ALTER COLUMN role DROP DEFAULT;
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('superadmin', 'admin', 'operator', 'viewer');
ALTER TABLE user_profiles ALTER COLUMN role TYPE app_role USING role::text::app_role;
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'viewer'::app_role;
DROP TYPE app_role_old;

-- 4. Recreate functions
CREATE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT role FROM public.user_profiles WHERE id = _user_id LIMIT 1; $$;

CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _user_id AND role = _role); $$;

CREATE FUNCTION public.is_superadmin(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _user_id AND role = 'superadmin'); $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'viewer');
  RETURN NEW;
END;
$function$;

-- 5. Recreate ALL RLS policies
-- tenants
CREATE POLICY "Superadmin manages tenants" ON tenants FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant admin updates own" ON tenants FOR UPDATE TO authenticated USING (id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
-- user_profiles
CREATE POLICY "Superadmin manages profiles" ON user_profiles FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant admin reads team" ON user_profiles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
-- plans
CREATE POLICY "Superadmin manages plans" ON plans FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
-- vehicle_rates
CREATE POLICY "Superadmin manages all rates" ON vehicle_rates FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant admin manages rates" ON vehicle_rates FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant users read rates" ON vehicle_rates FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
-- vehicle_categories
CREATE POLICY "Superadmin manages all categories" ON vehicle_categories FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant admin manages categories" ON vehicle_categories FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Tenant users read categories" ON vehicle_categories FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
-- customers
CREATE POLICY "Superadmin manages all customers" ON customers FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant users read customers" ON customers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "Tenant staff manages customers" ON customers FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
-- vehicles
CREATE POLICY "Superadmin manages all vehicles" ON vehicles FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant users read vehicles" ON vehicles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "Tenant staff manages vehicles" ON vehicles FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
-- parking_sessions
CREATE POLICY "Superadmin manages all sessions" ON parking_sessions FOR ALL TO authenticated USING (is_superadmin(auth.uid()));
CREATE POLICY "Tenant users read sessions" ON parking_sessions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_superadmin(auth.uid()));
CREATE POLICY "Tenant staff manages sessions" ON parking_sessions FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
-- storage
CREATE POLICY "Superadmin uploads logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tenant-logos' AND is_superadmin(auth.uid()));
CREATE POLICY "Superadmin deletes logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tenant-logos' AND is_superadmin(auth.uid()));
