-- Tipo de vehículo en reservas + RPCs para que el admin confirme/rechace.

-- 1. Columna vehicle_type en space_reservations.
ALTER TABLE public.space_reservations
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'car';

ALTER TABLE public.space_reservations
  DROP CONSTRAINT IF EXISTS space_reservations_vehicle_type_check;

ALTER TABLE public.space_reservations
  ADD CONSTRAINT space_reservations_vehicle_type_check
  CHECK (vehicle_type IN ('car', 'motorcycle', 'truck', 'bicycle'));

-- 2. Reescribir reserve_parking_space con p_vehicle_type.
-- Se elimina la firma anterior (6 args) explícitamente para evitar overload ambiguo.
DROP FUNCTION IF EXISTS public.reserve_parking_space(uuid, uuid, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.reserve_parking_space(
  p_tenant_id uuid,
  p_space_id uuid,
  p_plate text,
  p_customer_phone text,
  p_vehicle_type text DEFAULT 'car',
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
  _vehicle_type text;
BEGIN
  IF p_plate IS NULL OR length(trim(p_plate)) = 0 THEN
    RAISE EXCEPTION 'La placa es obligatoria';
  END IF;
  IF p_customer_phone IS NULL OR length(trim(p_customer_phone)) = 0 THEN
    RAISE EXCEPTION 'El teléfono es obligatorio';
  END IF;

  _vehicle_type := COALESCE(NULLIF(trim(p_vehicle_type), ''), 'car');
  IF _vehicle_type NOT IN ('car', 'motorcycle', 'truck', 'bicycle') THEN
    RAISE EXCEPTION 'Tipo de vehículo no válido: %', _vehicle_type;
  END IF;

  _timeout := GREATEST(1, LEAST(COALESCE(p_timeout_minutes, 15), 120));
  _expires_at := now() + make_interval(mins => _timeout);

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
    vehicle_type, status, expires_at
  ) VALUES (
    p_tenant_id, p_space_id, auth.uid(),
    NULLIF(trim(p_customer_name), ''),
    trim(p_customer_phone),
    upper(trim(p_plate)),
    _vehicle_type,
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

REVOKE ALL ON FUNCTION public.reserve_parking_space(uuid, uuid, text, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_parking_space(uuid, uuid, text, text, text, text, integer) TO anon, authenticated;

-- 3. confirm_reservation — solo admin del tenant pasa a 'confirmed'.
CREATE OR REPLACE FUNCTION public.confirm_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res record;
  _role text;
  _tenant uuid;
BEGIN
  SELECT * INTO _res
  FROM public.space_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF _res.id IS NULL THEN
    RAISE EXCEPTION 'La reserva no existe';
  END IF;
  IF _res.status <> 'pending' THEN
    RAISE EXCEPTION 'La reserva no está pendiente (estado actual: %)', _res.status;
  END IF;

  SELECT role::text, tenant_id INTO _role, _tenant
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF _role IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF _role NOT IN ('admin', 'superadmin') OR _tenant <> _res.tenant_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.space_reservations
  SET status = 'confirmed',
      confirmed_at = now(),
      updated_at = now()
  WHERE id = p_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_reservation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_reservation(uuid) TO authenticated;

-- 4. cancel_reservation — admin del tenant o el propio reserved_by.
CREATE OR REPLACE FUNCTION public.cancel_reservation(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res record;
  _role text;
  _tenant uuid;
BEGIN
  SELECT * INTO _res
  FROM public.space_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF _res.id IS NULL THEN
    RAISE EXCEPTION 'La reserva no existe';
  END IF;
  IF _res.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'La reserva ya está cerrada (estado actual: %)', _res.status;
  END IF;

  SELECT role::text, tenant_id INTO _role, _tenant
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF NOT (
    (_role IN ('admin', 'superadmin') AND _tenant = _res.tenant_id)
    OR _res.reserved_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.space_reservations
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_reservation_id;

  -- Liberar el cupo solo si seguía marcado como reserved para esta reserva.
  UPDATE public.parking_spaces
  SET status = 'available',
      reserved_at = NULL,
      reservation_expires_at = NULL,
      reserved_by = NULL
  WHERE id = _res.space_id
    AND status = 'reserved';
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_reservation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid) TO authenticated;
