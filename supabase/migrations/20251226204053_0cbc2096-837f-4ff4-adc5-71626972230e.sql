-- Create admin audit logs table
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Only super_admins can insert audit logs (via edge function with service role)
CREATE POLICY "Super admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Create client_supabase_credentials table (encrypted storage)
CREATE TABLE public.client_supabase_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  supabase_service_role_key_encrypted TEXT NOT NULL,
  connection_status TEXT DEFAULT 'not_tested',
  db_initialized BOOLEAN DEFAULT false,
  last_connection_test TIMESTAMP WITH TIME ZONE,
  last_initialized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on client_supabase_credentials
ALTER TABLE public.client_supabase_credentials ENABLE ROW LEVEL SECURITY;

-- Only super_admins can access credentials
CREATE POLICY "Super admins can view credentials"
ON public.client_supabase_credentials
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert credentials"
ON public.client_supabase_credentials
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update credentials"
ON public.client_supabase_credentials
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete credentials"
ON public.client_supabase_credentials
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_client_supabase_credentials_updated_at
BEFORE UPDATE ON public.client_supabase_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();