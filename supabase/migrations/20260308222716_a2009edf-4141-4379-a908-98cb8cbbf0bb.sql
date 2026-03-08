-- Recalculate available_spaces for ALL tenants based on actual active sessions
UPDATE public.tenants t
SET available_spaces = GREATEST(
  t.total_spaces - COALESCE(
    (SELECT count(*)::int FROM public.parking_sessions ps 
     WHERE ps.tenant_id = t.id AND ps.status = 'active'), 0
  ), 0),
  updated_at = now();