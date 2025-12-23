-- Add is_approved column to profiles table for admin approval workflow
ALTER TABLE public.profiles ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;

-- Update existing profiles to be approved (for backward compatibility)
UPDATE public.profiles SET is_approved = true;

-- Create RLS policy for admins to update approval status
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));