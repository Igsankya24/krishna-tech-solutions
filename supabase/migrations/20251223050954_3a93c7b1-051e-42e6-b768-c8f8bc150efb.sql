-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete sessions
CREATE POLICY "Admins can delete sessions"
ON public.sessions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));