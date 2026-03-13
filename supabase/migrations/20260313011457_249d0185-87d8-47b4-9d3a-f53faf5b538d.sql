
-- 1. Add new roles to the app_role enum: 'cajero' and 'portero'
-- Rename is done at app level, DB enum gets new values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cajero';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'portero';

-- 2. Add max_users column to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_users integer NOT NULL DEFAULT 10;

-- 3. Create a function to notify operators when a reservation is created
CREATE OR REPLACE FUNCTION public.notify_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _space_number text;
  _tenant_name text;
  _operator record;
BEGIN
  -- Get space number
  SELECT space_number INTO _space_number FROM public.parking_spaces WHERE id = NEW.space_id;
  
  -- Get tenant name
  SELECT name INTO _tenant_name FROM public.tenants WHERE id = NEW.tenant_id;
  
  -- Notify all operators/porteros/admins of this tenant
  FOR _operator IN
    SELECT id FROM public.user_profiles 
    WHERE tenant_id = NEW.tenant_id 
    AND role IN ('admin', 'operator', 'portero', 'cajero')
    AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, tenant_id, title, message, type, metadata)
    VALUES (
      _operator.id,
      NEW.tenant_id,
      '🅿️ Nueva reserva de cupo',
      'Espacio #' || COALESCE(_space_number, '?') || ' reservado por ' || COALESCE(NEW.customer_name, NEW.plate, 'Cliente') || ' - Placa: ' || COALESCE(NEW.plate, 'N/A'),
      'info',
      jsonb_build_object('reservation_id', NEW.id, 'space_id', NEW.space_id, 'plate', NEW.plate)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger for reservation notifications
DROP TRIGGER IF EXISTS trg_notify_reservation ON public.space_reservations;
CREATE TRIGGER trg_notify_reservation
  AFTER INSERT ON public.space_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reservation();
