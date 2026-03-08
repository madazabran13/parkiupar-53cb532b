
-- Allow anonymous users to read vehicle categories (needed for public map rates display)
CREATE POLICY "Anon reads active categories"
ON public.vehicle_categories
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous users to read active vehicle rates (public map)
CREATE POLICY "Anon reads active rates"
ON public.vehicle_rates
FOR SELECT
TO anon
USING (is_active = true);

-- Fix user_profiles policies: ensure they target authenticated role properly
-- The existing policies using {public} role work fine since public includes authenticated,
-- but let's ensure the insert policy exists for the handle_new_user trigger
-- (It uses SECURITY DEFINER so it bypasses RLS - this is correct)

-- Add policy for operators to read their own tenant's data (they need this for parking operations)
-- Currently "Tenant staff manages sessions" covers ALL for tenant users, which is correct.

-- Ensure storage policies are set for tenant-logos bucket
-- (Already public bucket, so SELECT is allowed for all)
