
-- Update existing viewer users to conductor
UPDATE public.user_profiles SET role = 'conductor' WHERE role = 'viewer';

-- Update handle_new_user trigger to assign 'conductor' role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'conductor');
  RETURN NEW;
END;
$function$;
