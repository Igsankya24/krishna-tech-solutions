import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  isLoading: boolean;
  setMaintenanceMode: (enabled: boolean) => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMaintenanceMode = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      if (error) {
        console.error("Error fetching maintenance mode:", error);
        return;
      }

      setIsMaintenanceMode(data?.value === "true");
    } catch (error) {
      console.error("Error fetching maintenance mode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceMode();

    // Listen for realtime updates
    const channel = supabase
      .channel("site_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "key=eq.maintenance_mode",
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "value" in payload.new) {
            setIsMaintenanceMode(payload.new.value === "true");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setMaintenanceMode = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
        .eq("key", "maintenance_mode");

      if (error) throw error;

      setIsMaintenanceMode(enabled);
    } catch (error) {
      console.error("Error updating maintenance mode:", error);
      throw error;
    }
  };

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, isLoading, setMaintenanceMode }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenanceMode = () => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error("useMaintenanceMode must be used within a MaintenanceProvider");
  }
  return context;
};
