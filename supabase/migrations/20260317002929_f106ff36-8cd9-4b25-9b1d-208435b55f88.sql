
-- Add user_modules column to user_profiles for per-user module access
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS user_modules jsonb DEFAULT NULL;

-- This column stores an array of module keys that the admin assigns to each user.
-- NULL means the user inherits all modules from their tenant's plan.
COMMENT ON COLUMN public.user_profiles.user_modules IS 'Optional per-user module access list. NULL = inherit all from plan.';
