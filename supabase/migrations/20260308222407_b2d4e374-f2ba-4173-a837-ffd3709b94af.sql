
-- Function to recalculate available_spaces based on actual active sessions
CREATE OR REPLACE FUNCTION public.recalculate_available_spaces(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _active_count integer;
  _total integer;
BEGIN
  SELECT count(*) INTO _active_count
  FROM public.parking_sessions
  WHERE tenant_id = _tenant_id AND status = 'active';
  
  SELECT total_spaces INTO _total
  FROM public.tenants
  WHERE id = _tenant_id;
  
  UPDATE public.tenants
  SET available_spaces = GREATEST(_total - _active_count, 0),
      updated_at = now()
  WHERE id = _tenant_id;
END;
$$;
