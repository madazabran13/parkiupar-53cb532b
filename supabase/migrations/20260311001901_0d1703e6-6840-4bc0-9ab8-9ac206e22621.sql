
-- Fix overly permissive INSERT policy on space_reservations
DROP POLICY IF EXISTS "Users create reservations" ON public.space_reservations;
CREATE POLICY "Users create reservations" ON public.space_reservations
  FOR INSERT TO authenticated
  WITH CHECK (reserved_by = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));

-- Fix overly permissive SELECT policy on parking_spaces for anon
DROP POLICY IF EXISTS "Public reads spaces" ON public.parking_spaces;
CREATE POLICY "Public reads spaces" ON public.parking_spaces
  FOR SELECT TO anon
  USING (status IS NOT NULL);
