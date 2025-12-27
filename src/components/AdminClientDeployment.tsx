import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Database,
  Server,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Download,
} from "lucide-react";

interface ClientCredentials {
  id: string;
  supabase_url: string;
  supabase_anon_key: string;
  connection_status: string;
  db_initialized: boolean;
  last_connection_test: string | null;
  last_initialized_at: string | null;
  created_at: string;
  updated_at: string;
}

const AdminClientDeployment = () => {
  const [credentials, setCredentials] = useState<ClientCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);
  const [showInitConfirm, setShowInitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    supabase_url: "",
    supabase_anon_key: "",
    supabase_service_role_key: "",
  });

  const fetchCredentials = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('client-deployment', {
        body: { action: 'get_credentials' },
      });

      if (error) throw error;
      
      if (data?.credentials) {
        setCredentials(data.credentials);
        setFormData({
          supabase_url: data.credentials.supabase_url,
          supabase_anon_key: data.credentials.supabase_anon_key,
          supabase_service_role_key: "",
        });
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleSaveCredentials = async () => {
    if (!formData.supabase_url || !formData.supabase_anon_key || !formData.supabase_service_role_key) {
      toast.error("All fields are required");
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.supabase_url);
    } catch {
      toast.error("Invalid Supabase URL format");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('client-deployment', {
        body: {
          action: 'save_credentials',
          ...formData,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Credentials saved successfully");
      await fetchCredentials();
      setFormData(prev => ({ ...prev, supabase_service_role_key: "" }));
    } catch (error: any) {
      console.error('Error saving credentials:', error);
      toast.error(error.message || "Failed to save credentials");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('client-deployment', {
        body: { action: 'test_connection' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Connection successful!");
      await fetchCredentials();
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast.error(error.message || "Connection test failed");
      await fetchCredentials();
    } finally {
      setIsTesting(false);
    }
  };

  const handleInitializeDatabase = async () => {
    setShowInitConfirm(false);
    setIsInitializing(true);
    try {
      const { data, error } = await supabase.functions.invoke('client-deployment', {
        body: { action: 'initialize_database' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || "Database initialized successfully");
      await fetchCredentials();
    } catch (error: any) {
      console.error('Error initializing database:', error);
      toast.error(error.message || "Database initialization failed");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDeleteCredentials = async () => {
    setShowDeleteConfirm(false);
    try {
      const { data, error } = await supabase.functions.invoke('client-deployment', {
        body: { action: 'delete_credentials' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Credentials deleted");
      setCredentials(null);
      setFormData({
        supabase_url: "",
        supabase_anon_key: "",
        supabase_service_role_key: "",
      });
    } catch (error: any) {
      console.error('Error deleting credentials:', error);
      toast.error(error.message || "Failed to delete credentials");
    }
  };

  const handleExportSchema = () => {
    const schemaSQL = `-- ============================================
-- Complete Schema SQL for Client Deployment
-- Generated: ${new Date().toISOString()}
-- ============================================

-- ==========================================
-- ENUMS
-- ==========================================

-- Create app_role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create user_permission enum
DO $$ BEGIN
  CREATE TYPE public.user_permission AS ENUM ('read', 'write', 'change_password', 'manage_appointments', 'manage_services');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- TABLES
-- ==========================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- User permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission public.user_permission NOT NULL,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  service_type TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME WITHOUT TIME ZONE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  cancelled_by UUID,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE
);

-- Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECURITY DEFINER FUNCTIONS
-- ==========================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR role = 'super_admin')
  )
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission user_permission)
RETURNS BOOLEAN
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

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- RLS POLICIES - PROFILES
-- ==========================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- RLS POLICIES - USER ROLES
-- ==========================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- RLS POLICIES - USER PERMISSIONS
-- ==========================================

DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_permissions;
CREATE POLICY "Admins can view all permissions"
ON public.user_permissions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert permissions" ON public.user_permissions;
CREATE POLICY "Admins can insert permissions"
ON public.user_permissions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update permissions" ON public.user_permissions;
CREATE POLICY "Admins can update permissions"
ON public.user_permissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete permissions" ON public.user_permissions;
CREATE POLICY "Admins can delete permissions"
ON public.user_permissions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- RLS POLICIES - SERVICES
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services"
ON public.services FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
CREATE POLICY "Admins can view all services"
ON public.services FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert services" ON public.services;
CREATE POLICY "Admins can insert services"
ON public.services FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update services" ON public.services;
CREATE POLICY "Admins can update services"
ON public.services FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete services" ON public.services;
CREATE POLICY "Admins can delete services"
ON public.services FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- RLS POLICIES - APPOINTMENTS
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view appointments for availability" ON public.appointments;
CREATE POLICY "Anyone can view appointments for availability"
ON public.appointments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
CREATE POLICY "Anyone can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update appointments" ON public.appointments;
CREATE POLICY "Admins can update appointments"
ON public.appointments FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
CREATE POLICY "Admins can delete appointments"
ON public.appointments FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- RLS POLICIES - SESSIONS
-- ==========================================

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
CREATE POLICY "Users can view their own sessions"
ON public.sessions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own session" ON public.sessions;
CREATE POLICY "Users can insert their own session"
ON public.sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
CREATE POLICY "Users can update their own sessions"
ON public.sessions FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sessions;
CREATE POLICY "Admins can view all sessions"
ON public.sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete sessions" ON public.sessions;
CREATE POLICY "Admins can delete sessions"
ON public.sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- RLS POLICIES - COUPONS
-- ==========================================

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING ((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())));

DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;
CREATE POLICY "Admins can view all coupons"
ON public.coupons FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert coupons" ON public.coupons;
CREATE POLICY "Admins can insert coupons"
ON public.coupons FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update coupons" ON public.coupons;
CREATE POLICY "Admins can update coupons"
ON public.coupons FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete coupons" ON public.coupons;
CREATE POLICY "Admins can delete coupons"
ON public.coupons FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- RLS POLICIES - SITE SETTINGS
-- ==========================================

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings"
ON public.site_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- DEFAULT DATA
-- ==========================================

-- Insert default site settings
INSERT INTO public.site_settings (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- END OF SCHEMA
-- ============================================
`;

    // Create blob and download
    const blob = new Blob([schemaSQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Schema SQL file downloaded");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Not Tested
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Server className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Supabase (Client Deployment)</h2>
          <p className="text-muted-foreground">Configure and deploy database for client projects</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {credentials ? getStatusBadge(credentials.connection_status) : (
              <Badge variant="outline">Not Configured</Badge>
            )}
            {credentials?.last_connection_test && (
              <p className="text-xs text-muted-foreground mt-2">
                Last tested: {new Date(credentials.last_connection_test).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {credentials?.db_initialized ? (
              <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Initialized
              </Badge>
            ) : (
              <Badge variant="outline">Not Initialized</Badge>
            )}
            {credentials?.last_initialized_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Initialized: {new Date(credentials.last_initialized_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle>Supabase Credentials</CardTitle>
          <CardDescription>
            Enter the client's Supabase project credentials. The service role key will be encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase_url">SUPABASE_URL</Label>
            <Input
              id="supabase_url"
              value={formData.supabase_url}
              onChange={(e) => setFormData(prev => ({ ...prev, supabase_url: e.target.value }))}
              placeholder="https://xxxxxxxxxxxxx.supabase.co"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase_anon_key">SUPABASE_ANON_KEY</Label>
            <Input
              id="supabase_anon_key"
              value={formData.supabase_anon_key}
              onChange={(e) => setFormData(prev => ({ ...prev, supabase_anon_key: e.target.value }))}
              placeholder="eyJhbGciOiJI..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase_service_role_key">SUPABASE_SERVICE_ROLE_KEY</Label>
            <div className="relative">
              <Input
                id="supabase_service_role_key"
                type={showServiceKey ? "text" : "password"}
                value={formData.supabase_service_role_key}
                onChange={(e) => setFormData(prev => ({ ...prev, supabase_service_role_key: e.target.value }))}
                placeholder={credentials ? "••••••••••••••••" : "eyJhbGciOiJI..."}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowServiceKey(!showServiceKey)}
              >
                {showServiceKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {credentials ? "Leave blank to keep existing key, or enter new key to update" : "Required for database operations"}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveCredentials} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Credentials
            </Button>
            {credentials && (
              <Button variant="outline" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Test connection and initialize the database structure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleTestConnection}
              disabled={!credentials || isTesting}
              variant="outline"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>

            <Button
              onClick={() => setShowInitConfirm(true)}
              disabled={!credentials || credentials.connection_status !== 'connected' || isInitializing}
              variant="default"
            >
              {isInitializing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Initialize Database
          </Button>

          <Button
            onClick={handleExportSchema}
            variant="secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Schema SQL
          </Button>
        </div>

          {credentials && credentials.connection_status !== 'connected' && (
            <p className="text-sm text-amber-600">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Please test connection before initializing database
            </p>
          )}
        </CardContent>
      </Card>

      {/* Initialization Confirmation Dialog */}
      <AlertDialog open={showInitConfirm} onOpenChange={setShowInitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initialize Database Structure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create the following tables and configurations in the client's Supabase project:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>profiles, user_roles, user_permissions</li>
                <li>services, appointments, sessions</li>
                <li>coupons, site_settings</li>
                <li>Row Level Security policies</li>
                <li>Required enums and functions</li>
              </ul>
              <p className="mt-3 text-amber-600 font-medium">
                This action cannot be undone. Make sure the Supabase project is ready.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInitializeDatabase}>
              Initialize Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credentials?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the stored client Supabase credentials. You will need to re-enter them to perform any operations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCredentials} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminClientDeployment;
