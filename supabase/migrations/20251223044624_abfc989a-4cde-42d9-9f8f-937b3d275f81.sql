-- Create permissions enum
CREATE TYPE public.user_permission AS ENUM ('read', 'write', 'change_password', 'manage_appointments', 'manage_services');

-- Create user_permissions table for granular access control
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission user_permission NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission user_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
      AND permission = _permission
  )
$$;

-- RLS Policies for user_permissions
CREATE POLICY "Admins can view all permissions"
ON public.user_permissions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert permissions"
ON public.user_permissions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update permissions"
ON public.user_permissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissions"
ON public.user_permissions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id);