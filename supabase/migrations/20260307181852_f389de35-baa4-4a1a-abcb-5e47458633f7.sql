
-- Fix hash function using pgcrypto schema
CREATE OR REPLACE FUNCTION public.hash_sensitive(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT encode(extensions.digest(lower(trim(value)), 'sha256'), 'hex');
$$;
