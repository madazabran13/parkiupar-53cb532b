-- Fix: Sync available_spaces with actual active sessions for all tenants
UPDATE public.tenants t
SET available_spaces = t.total_spaces - COALESCE((
  SELECT count(*)::int FROM public.parking_sessions ps 
  WHERE ps.tenant_id = t.id AND ps.status = 'active'
), 0);
