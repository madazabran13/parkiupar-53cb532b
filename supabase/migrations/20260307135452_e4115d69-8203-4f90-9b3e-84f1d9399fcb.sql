-- Allow tenant admins to upload logos to their own folder
CREATE POLICY "Tenant admin uploads logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Allow tenant admins to update logos in their own folder
CREATE POLICY "Tenant admin updates logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

-- Allow tenant admins to delete logos in their own folder
CREATE POLICY "Tenant admin deletes logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);
