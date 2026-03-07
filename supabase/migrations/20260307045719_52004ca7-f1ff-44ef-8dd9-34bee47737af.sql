
-- Fix search_path for functions missing it
ALTER FUNCTION public.calculate_parking_fee(TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, INTEGER) SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
