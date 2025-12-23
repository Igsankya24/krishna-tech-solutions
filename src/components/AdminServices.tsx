import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  display_order: number;
}

const AdminServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: "",
  });

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Failed to load services");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();

    const channel = supabase
      .channel("admin-services")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => fetchServices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddService = async () => {
    if (!newService.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    try {
      const { error } = await supabase.from("services").insert({
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        price: parseFloat(newService.price) || 0,
        display_order: services.length,
      });

      if (error) throw error;

      toast.success("Service added successfully");
      setNewService({ name: "", description: "", price: "" });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding service:", error);
      toast.error("Failed to add service");
    }
  };

  const handleToggleVisibility = async (service: Service) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);

      if (error) throw error;

      toast.success(
        service.is_active ? "Service hidden" : "Service visible"
      );
    } catch (error) {
      console.error("Error toggling service:", error);
      toast.error("Failed to update service");
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      toast.success("Service removed");
    } catch (error) {
      console.error("Error removing service:", error);
      toast.error("Failed to remove service");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="animate-pulse text-muted-foreground text-center">
          Loading services...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg text-foreground">
          Services
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline" className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService({ ...newService, name: e.target.value })
                  }
                  placeholder="e.g., Website Development"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  value={newService.price}
                  onChange={(e) =>
                    setNewService({ ...newService, price: e.target.value })
                  }
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({ ...newService, description: e.target.value })
                  }
                  placeholder="Brief description of the service"
                  rows={3}
                />
              </div>
              <Button onClick={handleAddService} className="w-full">
                Add Service
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          No services added yet. Click + to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                service.is_active
                  ? "border-border bg-background"
                  : "border-muted bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {service.name}
                  </span>
                  <span className="text-sm text-primary font-semibold">
                    ₹{service.price.toLocaleString()}
                  </span>
                </div>
                {service.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {service.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleToggleVisibility(service)}
                  title={service.is_active ? "Hide service" : "Show service"}
                >
                  {service.is_active ? (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemoveService(service.id)}
                  title="Remove service"
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminServices;
