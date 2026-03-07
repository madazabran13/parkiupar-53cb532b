
-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read their tenant's audit logs
CREATE POLICY "Tenant admin reads audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  OR is_superadmin(auth.uid())
);

-- Only system (triggers) can insert - no direct user inserts
CREATE POLICY "System inserts audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (false);

-- Audit trigger function that masks sensitive fields
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id uuid;
  _old_data jsonb;
  _new_data jsonb;
  _changed text[];
  _sensitive_keys text[] := ARRAY['phone', 'email', 'customer_phone'];
  _key text;
BEGIN
  -- Get tenant_id
  IF TG_OP = 'DELETE' THEN
    _tenant_id := CASE WHEN OLD ? 'tenant_id' THEN (OLD->>'tenant_id')::uuid ELSE NULL END;
  ELSE
    _tenant_id := CASE WHEN to_jsonb(NEW) ? 'tenant_id' THEN (to_jsonb(NEW)->>'tenant_id')::uuid ELSE NULL END;
  END IF;

  -- Build masked data
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    _old_data := to_jsonb(OLD);
    FOREACH _key IN ARRAY _sensitive_keys LOOP
      IF _old_data ? _key AND _old_data->>_key IS NOT NULL THEN
        _old_data := _old_data || jsonb_build_object(_key, '***' || right(_old_data->>_key, 4));
      END IF;
    END LOOP;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    _new_data := to_jsonb(NEW);
    FOREACH _key IN ARRAY _sensitive_keys LOOP
      IF _new_data ? _key AND _new_data->>_key IS NOT NULL THEN
        _new_data := _new_data || jsonb_build_object(_key, '***' || right(_new_data->>_key, 4));
      END IF;
    END LOOP;
  END IF;

  -- Detect changed fields on UPDATE
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO _changed
    FROM jsonb_each(to_jsonb(NEW)) AS n(key, val)
    WHERE to_jsonb(OLD)->>key IS DISTINCT FROM n.val::text;
  END IF;

  INSERT INTO public.audit_logs (tenant_id, user_id, user_name, table_name, record_id, action, old_data, new_data, changed_fields)
  VALUES (
    _tenant_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE((SELECT full_name FROM public.user_profiles WHERE id = auth.uid()), 'Sistema'),
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (OLD->>'id') ELSE (to_jsonb(NEW)->>'id') END,
    TG_OP,
    _old_data,
    _new_data,
    _changed
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach triggers to key tables
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_parking_sessions AFTER INSERT OR UPDATE OR DELETE ON public.parking_sessions FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_vehicles AFTER INSERT OR UPDATE OR DELETE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_tenants AFTER INSERT OR UPDATE OR DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_user_profiles AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_vehicle_rates AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_rates FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
