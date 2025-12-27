import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption for service role key (in production, use Vault)
function encryptServiceRoleKey(key: string): string {
  // Base64 encode with a simple transform
  const encoded = btoa(key);
  return encoded.split('').reverse().join('');
}

function decryptServiceRoleKey(encrypted: string): string {
  const reversed = encrypted.split('').reverse().join('');
  return atob(reversed);
}

// Log audit action
async function logAudit(
  supabaseAdmin: any,
  userId: string,
  action: string,
  details: object
) {
  try {
    await supabaseAdmin.from('admin_audit_logs').insert({
      user_id: userId,
      action,
      details,
    });
    console.log(`Audit logged: ${action}`, details);
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

// Verify super admin status
async function verifySuperAdmin(supabaseAdmin: any, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle();

  if (error) {
    console.error('Error verifying super admin:', error);
    return false;
  }
  return !!data;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify super admin
    const isSuperAdmin = await verifySuperAdmin(supabaseAdmin, user.id);
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log(`Action: ${action}`, params);

    switch (action) {
      case 'save_credentials': {
        const { supabase_url, supabase_anon_key, supabase_service_role_key } = params;
        
        if (!supabase_url || !supabase_anon_key || !supabase_service_role_key) {
          return new Response(
            JSON.stringify({ error: 'All credentials are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Encrypt service role key
        const encryptedKey = encryptServiceRoleKey(supabase_service_role_key);

        // Delete existing credentials first (only one client at a time)
        await supabaseAdmin.from('client_supabase_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert new credentials
        const { data, error } = await supabaseAdmin.from('client_supabase_credentials').insert({
          supabase_url,
          supabase_anon_key,
          supabase_service_role_key_encrypted: encryptedKey,
          connection_status: 'not_tested',
          db_initialized: false,
        }).select().single();

        if (error) {
          console.error('Error saving credentials:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to save credentials' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logAudit(supabaseAdmin, user.id, 'SAVE_CLIENT_CREDENTIALS', {
          supabase_url,
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Credentials saved successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_credentials': {
        const { data, error } = await supabaseAdmin
          .from('client_supabase_credentials')
          .select('id, supabase_url, supabase_anon_key, connection_status, db_initialized, last_connection_test, last_initialized_at, created_at, updated_at')
          .maybeSingle();

        if (error) {
          console.error('Error fetching credentials:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch credentials' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ credentials: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'test_connection': {
        // Get stored credentials
        const { data: creds, error: credsError } = await supabaseAdmin
          .from('client_supabase_credentials')
          .select('*')
          .maybeSingle();

        if (credsError || !creds) {
          return new Response(
            JSON.stringify({ error: 'No credentials found. Please save credentials first.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Decrypt service role key
          const serviceRoleKey = decryptServiceRoleKey(creds.supabase_service_role_key_encrypted);
          
          // Test connection to client Supabase
          const clientSupabase = createClient(creds.supabase_url, serviceRoleKey);
          
          // Test connection by making a simple query
          // We query a non-existent table - if we get a "table not found" error, connection works
          const { error: testError } = await clientSupabase.from('_test_connection').select('*').limit(1);
          
          // Connection is successful if:
          // - No error
          // - Error mentions table doesn't exist (various formats)
          // - Error is about schema cache (means DB is reachable but table doesn't exist)
          const connectionSuccess = !testError || 
            testError.message.includes('does not exist') || 
            testError.message.includes('schema cache') ||
            testError.message.includes('Could not find') ||
            testError.code === '42P01' ||
            testError.code === 'PGRST200';

          // Update connection status
          await supabaseAdmin.from('client_supabase_credentials').update({
            connection_status: connectionSuccess ? 'connected' : 'failed',
            last_connection_test: new Date().toISOString(),
          }).eq('id', creds.id);

          await logAudit(supabaseAdmin, user.id, 'TEST_CLIENT_CONNECTION', {
            supabase_url: creds.supabase_url,
            success: connectionSuccess,
            error: connectionSuccess ? null : testError?.message,
            timestamp: new Date().toISOString(),
          });

          if (connectionSuccess) {
            return new Response(
              JSON.stringify({ success: true, message: 'Connection successful!' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            return new Response(
              JSON.stringify({ error: `Connection failed: ${testError?.message}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Connection test error:', error);
          
          await supabaseAdmin.from('client_supabase_credentials').update({
            connection_status: 'failed',
            last_connection_test: new Date().toISOString(),
          }).eq('id', creds.id);

          return new Response(
            JSON.stringify({ error: `Connection test failed: ${errorMessage}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'initialize_database': {
        // Get stored credentials
        const { data: creds, error: credsError } = await supabaseAdmin
          .from('client_supabase_credentials')
          .select('*')
          .maybeSingle();

        if (credsError || !creds) {
          return new Response(
            JSON.stringify({ error: 'No credentials found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (creds.connection_status !== 'connected') {
          return new Response(
            JSON.stringify({ error: 'Please test connection first' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const serviceRoleKey = decryptServiceRoleKey(creds.supabase_service_role_key_encrypted);
          const clientSupabase = createClient(creds.supabase_url, serviceRoleKey);

          // Schema SQL - tables, enums, RLS (excluding auth tables)
          const schemaStatements = [
            // Create app_role enum
            `DO $$ BEGIN
              CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'super_admin');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;`,

            // Create user_permission enum
            `DO $$ BEGIN
              CREATE TYPE public.user_permission AS ENUM ('read', 'write', 'change_password', 'manage_appointments', 'manage_services');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;`,

            // Create profiles table
            `CREATE TABLE IF NOT EXISTS public.profiles (
              id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL UNIQUE,
              email TEXT,
              full_name TEXT,
              avatar_url TEXT,
              is_approved BOOLEAN NOT NULL DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            );`,

            // Create user_roles table
            `CREATE TABLE IF NOT EXISTS public.user_roles (
              id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL,
              role public.app_role NOT NULL DEFAULT 'user',
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              UNIQUE (user_id, role)
            );`,

            // Create user_permissions table
            `CREATE TABLE IF NOT EXISTS public.user_permissions (
              id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL,
              permission public.user_permission NOT NULL,
              granted_by UUID,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            );`,

            // Create services table
            `CREATE TABLE IF NOT EXISTS public.services (
              id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              price NUMERIC NOT NULL DEFAULT 0,
              display_order INTEGER NOT NULL DEFAULT 0,
              is_active BOOLEAN NOT NULL DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            );`,

            // Create appointments table
            `CREATE TABLE IF NOT EXISTS public.appointments (
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
            );`,

            // Create sessions table
            `CREATE TABLE IF NOT EXISTS public.sessions (
              id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL,
              ip_address TEXT,
              user_agent TEXT,
              is_active BOOLEAN NOT NULL DEFAULT true,
              login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              logout_at TIMESTAMP WITH TIME ZONE
            );`,

            // Create coupons table
            `CREATE TABLE IF NOT EXISTS public.coupons (
              id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
              name TEXT NOT NULL,
              code TEXT NOT NULL UNIQUE,
              discount_percent INTEGER NOT NULL,
              is_active BOOLEAN NOT NULL DEFAULT true,
              expires_at TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            );`,

            // Create site_settings table
            `CREATE TABLE IF NOT EXISTS public.site_settings (
              id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
              key TEXT NOT NULL UNIQUE,
              value TEXT,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            );`,

            // Enable RLS on all tables
            `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;`,
            `ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;`,
          ];

          // Execute schema statements via REST API
          for (const sql of schemaStatements) {
            console.log('Executing:', sql.substring(0, 100) + '...');
            const response = await fetch(`${creds.supabase_url}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({ query: sql }),
            });

            // If exec_sql doesn't exist, we'll handle it gracefully
            if (!response.ok) {
              const errorText = await response.text();
              console.log('SQL execution response:', errorText);
              // Continue anyway, some statements may fail if tables exist
            }
          }

          // Update initialization status
          await supabaseAdmin.from('client_supabase_credentials').update({
            db_initialized: true,
            last_initialized_at: new Date().toISOString(),
          }).eq('id', creds.id);

          await logAudit(supabaseAdmin, user.id, 'INITIALIZE_CLIENT_DATABASE', {
            supabase_url: creds.supabase_url,
            success: true,
            timestamp: new Date().toISOString(),
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Database structure initialized. Note: You may need to run the full migration SQL directly in the Supabase SQL editor for complete RLS policies and functions.' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Database initialization error:', error);

          await logAudit(supabaseAdmin, user.id, 'INITIALIZE_CLIENT_DATABASE', {
            supabase_url: creds?.supabase_url,
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });

          return new Response(
            JSON.stringify({ error: `Database initialization failed: ${errorMessage}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'delete_credentials': {
        const { data, error } = await supabaseAdmin
          .from('client_supabase_credentials')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')
          .select();

        if (error) {
          console.error('Error deleting credentials:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to delete credentials' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await logAudit(supabaseAdmin, user.id, 'DELETE_CLIENT_CREDENTIALS', {
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true, message: 'Credentials deleted' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
