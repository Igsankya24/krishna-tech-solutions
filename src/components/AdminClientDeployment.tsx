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
