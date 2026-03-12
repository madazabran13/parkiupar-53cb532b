
-- Allow anonymous users to create reservations (public booking from map)
CREATE POLICY "Anon creates reservations"
ON public.space_reservations
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to read spaces (already exists but let's ensure)
-- Allow anon to update space status for reservations
CREATE POLICY "Anon updates spaces for reservation"
ON public.parking_spaces
FOR UPDATE
TO anon
USING (status = 'available')
WITH CHECK (status = 'reserved');
