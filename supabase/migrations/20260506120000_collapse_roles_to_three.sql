-- Colapsa el enum app_role a sólo {superadmin, admin, conductor}.
-- portero/cajero/operator → admin (mantienen acceso operativo del tenant)
-- viewer/enduser → conductor (usuario final)

-- 1. Normaliza valores existentes en user_profiles.
UPDATE public.user_profiles SET role = 'admin'::public.app_role
  WHERE role::text IN ('operator', 'portero', 'cajero');
UPDATE public.user_profiles SET role = 'conductor'::public.app_role
  WHERE role::text IN ('viewer', 'enduser');

-- 2. Recrea el enum sin los valores legacy.
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'conductor');

ALTER TABLE public.user_profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role,
  ALTER COLUMN role SET DEFAULT 'conductor'::public.app_role;

-- 3. Limpia el tipo viejo.
DROP TYPE public.app_role_old;
