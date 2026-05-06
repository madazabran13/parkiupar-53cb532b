-- Arregla trigger de notificación: usa el set de roles vigente.
CREATE OR REPLACE FUNCTION public.notify_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _space_number text;
  _admin record;
BEGIN
  SELECT space_number INTO _space_number FROM public.parking_spaces WHERE id = NEW.space_id;

  FOR _admin IN
    SELECT id FROM public.user_profiles
    WHERE tenant_id = NEW.tenant_id
      AND role = 'admin'
      AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, tenant_id, title, message, type, metadata)
    VALUES (
      _admin.id,
      NEW.tenant_id,
      'Nueva reserva de cupo',
      'Espacio #' || COALESCE(_space_number, '?') || ' reservado por ' || COALESCE(NEW.customer_name, NEW.plate, 'Cliente') || ' - Placa: ' || COALESCE(NEW.plate, 'N/A'),
      'info',
      jsonb_build_object('reservation_id', NEW.id, 'space_id', NEW.space_id, 'plate', NEW.plate)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- RPC pública para crear reserva (atómica, valida disponibilidad).
-- Permite a conductores logueados y a invitados anon reservar sin tropezar con
-- las RLS de tenant-staff (que no aplican a este caso de uso).
CREATE OR REPLACE FUNCTION public.reserve_parking_space(
  p_tenant_id uuid,
  p_space_id uuid,
  p_plate text,
  p_customer_phone text,
  p_customer_name text DEFAULT NULL,
  p_timeout_minutes integer DEFAULT 15
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _space_status text;
  _space_tenant uuid;
  _expires_at timestamptz;
  _reservation_id uuid;
  _timeout integer;
BEGIN
  IF p_plate IS NULL OR length(trim(p_plate)) = 0 THEN
    RAISE EXCEPTION 'La placa es obligatoria';
  END IF;
  IF p_customer_phone IS NULL OR length(trim(p_customer_phone)) = 0 THEN
    RAISE EXCEPTION 'El teléfono es obligatorio';
  END IF;

  _timeout := GREATEST(1, LEAST(COALESCE(p_timeout_minutes, 15), 120));
  _expires_at := now() + make_interval(mins => _timeout);

  -- Lock del espacio para evitar carrera
  SELECT status, tenant_id INTO _space_status, _space_tenant
  FROM public.parking_spaces
  WHERE id = p_space_id
  FOR UPDATE;

  IF _space_status IS NULL THEN
    RAISE EXCEPTION 'El espacio no existe';
  END IF;
  IF _space_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'El espacio no pertenece al parqueadero indicado';
  END IF;
  IF _space_status <> 'available' THEN
    RAISE EXCEPTION 'El espacio ya no está disponible';
  END IF;

  INSERT INTO public.space_reservations (
    tenant_id, space_id, reserved_by, customer_name, customer_phone, plate,
    status, expires_at
  ) VALUES (
    p_tenant_id, p_space_id, auth.uid(),
    NULLIF(trim(p_customer_name), ''),
    trim(p_customer_phone),
    upper(trim(p_plate)),
    'pending', _expires_at
  ) RETURNING id INTO _reservation_id;

  UPDATE public.parking_spaces
  SET status = 'reserved',
      reserved_at = now(),
      reservation_expires_at = _expires_at,
      reserved_by = auth.uid()
  WHERE id = p_space_id;

  RETURN _reservation_id;
END;
$$;

-- Que la RPC sea ejecutable por todos los roles que necesiten reservar.
REVOKE ALL ON FUNCTION public.reserve_parking_space(uuid, uuid, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_parking_space(uuid, uuid, text, text, text, integer) TO anon, authenticated;

-- Permitir a conductores leer las reservas que hicieron por su teléfono
-- (la policy actual sólo permite SELECT cuando reserved_by = auth.uid()).
CREATE POLICY "Conductors read own phone reservations" ON public.space_reservations
  FOR SELECT TO authenticated
  USING (
    customer_phone IS NOT NULL
    AND customer_phone = (SELECT phone FROM public.user_profiles WHERE id = auth.uid())
  );
