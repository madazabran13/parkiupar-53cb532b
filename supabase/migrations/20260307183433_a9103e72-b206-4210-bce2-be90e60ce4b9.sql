
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
  _record_id text;
BEGIN
  -- Convert to jsonb first
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    _old_data := to_jsonb(OLD);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    _new_data := to_jsonb(NEW);
  END IF;

  -- Get tenant_id from jsonb
  IF TG_OP = 'DELETE' THEN
    _tenant_id := (_old_data->>'tenant_id')::uuid;
    _record_id := _old_data->>'id';
  ELSE
    _tenant_id := (_new_data->>'tenant_id')::uuid;
    _record_id := _new_data->>'id';
  END IF;

  -- Mask sensitive fields
  FOREACH _key IN ARRAY _sensitive_keys LOOP
    IF _old_data IS NOT NULL AND _old_data ? _key AND _old_data->>_key IS NOT NULL THEN
      _old_data := _old_data || jsonb_build_object(_key, '***' || right(_old_data->>_key, 4));
    END IF;
    IF _new_data IS NOT NULL AND _new_data ? _key AND _new_data->>_key IS NOT NULL THEN
      _new_data := _new_data || jsonb_build_object(_key, '***' || right(_new_data->>_key, 4));
    END IF;
  END LOOP;

  -- Detect changed fields
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO _changed
    FROM jsonb_each_text(to_jsonb(NEW)) AS n(key, val)
    LEFT JOIN jsonb_each_text(to_jsonb(OLD)) AS o(key, val) USING (key)
    WHERE n.val IS DISTINCT FROM o.val;
  END IF;

  INSERT INTO public.audit_logs (tenant_id, user_id, user_name, table_name, record_id, action, old_data, new_data, changed_fields)
  VALUES (
    _tenant_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE((SELECT full_name FROM public.user_profiles WHERE id = auth.uid()), 'Sistema'),
    TG_TABLE_NAME,
    _record_id,
    TG_OP,
    _old_data,
    _new_data,
    _changed
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
