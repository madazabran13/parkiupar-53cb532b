
-- Fix current data: recalculate available_spaces for all tenants
UPDATE public.tenants t
SET available_spaces = t.total_spaces - COALESCE(
  (SELECT count(*) FROM public.parking_sessions ps 
   WHERE ps.tenant_id = t.id AND ps.status = 'active'), 0
),
updated_at = now();

-- Replace session triggers with ones that recalculate from actual data
CREATE OR REPLACE FUNCTION public.handle_session_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM recalculate_available_spaces(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_session_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'active' AND (NEW.status = 'completed' OR NEW.status = 'cancelled') THEN
    -- Recalculate available spaces
    PERFORM recalculate_available_spaces(NEW.tenant_id);
    
    -- Update customer stats on completion
    IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
      UPDATE public.customers
      SET total_visits = total_visits + 1,
          total_spent = total_spent + COALESCE(NEW.total_amount, 0),
          updated_at = now()
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure triggers exist
DROP TRIGGER IF EXISTS on_session_start ON public.parking_sessions;
CREATE TRIGGER on_session_start
  AFTER INSERT ON public.parking_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_session_start();

DROP TRIGGER IF EXISTS on_session_complete ON public.parking_sessions;
CREATE TRIGGER on_session_complete
  AFTER UPDATE ON public.parking_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_session_complete();
