
-- Allow authenticated users to insert notifications (for reactivation requests)
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
