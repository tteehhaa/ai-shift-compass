
-- Allow admins to delete from activity_rankings
CREATE POLICY "Admins can delete rankings"
ON public.activity_rankings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete from email_subscribers
CREATE POLICY "Admins can delete subscribers"
ON public.email_subscribers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete from shared_results
CREATE POLICY "Admins can delete shared results"
ON public.shared_results
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
