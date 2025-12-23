import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Eye, EyeOff, Pencil, Download } from "lucide-react";
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

// Default services that can be imported
const defaultServices = [
  {
    name: "Data Recovery",
    description: "Professional data recovery from all types of storage devices. We handle HDDs, SSDs, USB drives, SD cards, and RAID systems.",
    price: 999,
  },
  {
    name: "Windows Upgrade",
    description: "Seamless Windows upgrades from any version to the latest Windows 11. All your files, apps, and settings stay intact.",
    price: 999,
  },
  {
    name: "Password Recovery",
    description: "Reset or remove Windows passwords without losing any data. Fast, secure, and reliable service.",
    price: 499,
  },
  {
    name: "Computer Repair",
    description: "Expert hardware and software repairs for laptops and desktops. We fix all brands and models.",
    price: 299,
  },
  {
    name: "Virus Removal",
    description: "Complete malware, virus, and spyware removal. We clean your system and install protection.",
    price: 599,
  },
  {
    name: "Backup Solutions",
    description: "Set up automated backup systems to protect your valuable data. Cloud and local options available.",
    price: 799,
  },
  {
    name: "Software Installation",
    description: "Professional installation of operating systems and software. Includes configuration and optimization.",
    price: 399,
  },
  {
    name: "Network Setup",
    description: "Home and small office network setup. WiFi configuration, security, and troubleshooting.",
    price: 699,
  },
];

const AdminServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [editForm, setEditForm] = useState({
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

  // Auto-import default services if none exist
  const autoImportDefaults = async () => {
    try {
      const { count, error: countError } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      if (count === 0) {
        const servicesToInsert = defaultServices.map((service, index) => ({
          name: service.name,
          description: service.description,
          price: service.price,
          display_order: index,
          is_active: true,
        }));

        const { error } = await supabase.from("services").insert(servicesToInsert);
        if (error) throw error;
        
        toast.success("Default services loaded");
      }
    } catch (error) {
      console.error("Error auto-importing services:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await autoImportDefaults();
      await fetchServices();
    };
    init();

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

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setEditForm({
      name: service.name,
      description: service.description || "",
      price: service.price.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    if (!editForm.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          price: parseFloat(editForm.price) || 0,
        })
        .eq("id", editingService.id);

      if (error) throw error;

      toast.success("Service updated successfully");
      setIsEditDialogOpen(false);
      setEditingService(null);
    } catch (error) {
      console.error("Error updating service:", error);
      toast.error("Failed to update service");
    }
  };

  const handleToggleVisibility = async (service: Service) => {
    try {
      const newStatus = !service.is_active;
      const { error } = await supabase
        .from("services")
        .update({ is_active: newStatus })
        .eq("id", service.id);

      if (error) throw error;

      // Update local state immediately for instant feedback
      setServices(prev => prev.map(s => 
        s.id === service.id ? { ...s, is_active: newStatus } : s
      ));

      toast.success(newStatus ? "Service visible" : "Service hidden");
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

  const handleImportDefaults = async () => {
    setIsImporting(true);
    try {
      const servicesToInsert = defaultServices.map((service, index) => ({
        name: service.name,
        description: service.description,
        price: service.price,
        display_order: services.length + index,
        is_active: true,
      }));

      const { error } = await supabase.from("services").insert(servicesToInsert);

      if (error) throw error;

      toast.success("Default services imported successfully");
    } catch (error) {
      console.error("Error importing services:", error);
      toast.error("Failed to import default services");
    } finally {
      setIsImporting(false);
    }
  };

  const activeCount = services.filter(s => s.is_active).length;
  const hiddenCount = services.filter(s => !s.is_active).length;

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-xl text-foreground">
            Services Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, hide, or remove services. Active services appear on the website.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportDefaults}
            disabled={isImporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isImporting ? "Importing..." : "Import Defaults"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
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
      </div>

      {services.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No services found. Click "Add Service" to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                service.is_active
                  ? "border-border bg-background"
                  : "border-muted bg-muted/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${service.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                    {service.name}
                  </span>
                  <span className="text-sm text-primary font-semibold">
                    ₹{service.price.toLocaleString()}
                  </span>
                  {!service.is_active && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      Hidden
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {service.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => handleEditClick(service)}
                  title="Edit service"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => handleToggleVisibility(service)}
                  title={service.is_active ? "Hide from website" : "Show on website"}
                >
                  {service.is_active ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
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

      {/* Total Services Count */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Total Services: <span className="font-semibold text-foreground">{services.length}</span>
          </span>
          <div className="flex gap-4">
            <span className="text-muted-foreground">
              Active: <span className="font-semibold text-green-600">{activeCount}</span>
            </span>
            <span className="text-muted-foreground">
              Hidden: <span className="font-semibold text-muted-foreground">{hiddenCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-name">Service Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="e.g., Website Development"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price (₹)</Label>
              <Input
                id="edit-price"
                type="number"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: e.target.value })
                }
                placeholder="e.g., 5000"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Brief description of the service"
                rows={3}
              />
            </div>
            <Button onClick={handleUpdateService} className="w-full">
              Update Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServices;
