-- Fix available_spaces for tenants with no active sessions that have wrong counts
UPDATE public.tenants t
SET available_spaces = t.total_spaces - (
  SELECT count(*) FROM public.parking_sessions ps 
  WHERE ps.tenant_id = t.id AND ps.status = 'active'
)
WHERE t.available_spaces != t.total_spaces - (
  SELECT count(*) FROM public.parking_sessions ps 
  WHERE ps.tenant_id = t.id AND ps.status = 'active'
);
