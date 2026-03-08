
ALTER TABLE public.tenants 
  ADD COLUMN plan_started_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN plan_expires_at timestamp with time zone DEFAULT NULL;
