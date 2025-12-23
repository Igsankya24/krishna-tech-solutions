import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Eye, EyeOff, Pencil, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";

interface Coupon {
  id: string;
  name: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  expires_at: string | null;
}

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    name: "",
    code: "",
    discount_percent: "",
    expires_at: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    discount_percent: "",
    expires_at: "",
  });

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();

    const channel = supabase
      .channel("admin-coupons")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons" },
        () => fetchCoupons()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleAddCoupon = async () => {
    if (!newCoupon.name.trim()) {
      toast.error("Coupon name is required");
      return;
    }
    if (!newCoupon.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    const discount = parseInt(newCoupon.discount_percent);
    if (isNaN(discount) || discount < 1 || discount > 100) {
      toast.error("Discount must be between 1 and 100");
      return;
    }

    try {
      const { error } = await supabase.from("coupons").insert({
        name: newCoupon.name.trim(),
        code: newCoupon.code.trim().toUpperCase(),
        discount_percent: discount,
        expires_at: newCoupon.expires_at || null,
      });

      if (error) throw error;

      toast.success("Coupon created successfully");
      setNewCoupon({ name: "", code: "", discount_percent: "", expires_at: "" });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding coupon:", error);
      if (error.code === "23505") {
        toast.error("Coupon code already exists");
      } else {
        toast.error("Failed to create coupon");
      }
    }
  };

  const handleEditClick = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditForm({
      name: coupon.name,
      code: coupon.code,
      discount_percent: coupon.discount_percent.toString(),
      expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0] : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return;
    if (!editForm.name.trim()) {
      toast.error("Coupon name is required");
      return;
    }
    const discount = parseInt(editForm.discount_percent);
    if (isNaN(discount) || discount < 1 || discount > 100) {
      toast.error("Discount must be between 1 and 100");
      return;
    }

    try {
      const { error } = await supabase
        .from("coupons")
        .update({
          name: editForm.name.trim(),
          code: editForm.code.trim().toUpperCase(),
          discount_percent: discount,
          expires_at: editForm.expires_at || null,
        })
        .eq("id", editingCoupon.id);

      if (error) throw error;

      toast.success("Coupon updated successfully");
      setIsEditDialogOpen(false);
      setEditingCoupon(null);
    } catch (error) {
      console.error("Error updating coupon:", error);
      toast.error("Failed to update coupon");
    }
  };

  const handleToggleVisibility = async (coupon: Coupon) => {
    try {
      const newStatus = !coupon.is_active;
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: newStatus })
        .eq("id", coupon.id);

      if (error) throw error;

      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: newStatus } : c))
      );

      toast.success(newStatus ? "Coupon activated" : "Coupon deactivated");
    } catch (error) {
      console.error("Error toggling coupon:", error);
      toast.error("Failed to update coupon");
    }
  };

  const handleDeleteClick = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!couponToDelete) return;

    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", couponToDelete.id);

      if (error) throw error;

      setCoupons((prev) => prev.filter((c) => c.id !== couponToDelete.id));
      toast.success("Coupon deleted");
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Failed to delete coupon");
    } finally {
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
    }
  };

  const activeCount = coupons.filter((c) => c.is_active).length;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="animate-pulse text-muted-foreground text-center">
          Loading coupons...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Coupon Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage discount coupons for customers.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Coupon Name</Label>
                <Input
                  id="name"
                  value={newCoupon.name}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, name: e.target.value })
                  }
                  placeholder="e.g., New Year Sale"
                />
              </div>
              <div>
                <Label htmlFor="code">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., NEWYEAR2024"
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setNewCoupon({ ...newCoupon, code: generateCode() })
                    }
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="discount">Discount Percentage (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="1"
                  max="100"
                  value={newCoupon.discount_percent}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, discount_percent: e.target.value })
                  }
                  placeholder="e.g., 15"
                />
              </div>
              <div>
                <Label htmlFor="expires">Expiry Date (Optional)</Label>
                <Input
                  id="expires"
                  type="date"
                  value={newCoupon.expires_at}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, expires_at: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleAddCoupon} className="w-full">
                Create Coupon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {coupons.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No coupons found. Click "Create Coupon" to add one.
        </p>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                coupon.is_active
                  ? "border-border bg-background"
                  : "border-muted bg-muted/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-medium ${
                      coupon.is_active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {coupon.name}
                  </span>
                  <code className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    {coupon.code}
                  </code>
                  <span className="text-sm font-semibold text-green-600">
                    -{coupon.discount_percent}%
                  </span>
                  {!coupon.is_active && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                {coupon.expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => handleEditClick(coupon)}
                  title="Edit coupon"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => handleToggleVisibility(coupon)}
                  title={coupon.is_active ? "Deactivate" : "Activate"}
                >
                  {coupon.is_active ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeleteClick(coupon)}
                  title="Delete coupon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Total Coupons:{" "}
            <span className="font-semibold text-foreground">{coupons.length}</span>
          </span>
          <span className="text-muted-foreground">
            Active:{" "}
            <span className="font-semibold text-green-600">{activeCount}</span>
          </span>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-name">Coupon Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-code">Coupon Code</Label>
              <Input
                id="edit-code"
                value={editForm.code}
                onChange={(e) =>
                  setEditForm({ ...editForm, code: e.target.value.toUpperCase() })
                }
                className="uppercase"
              />
            </div>
            <div>
              <Label htmlFor="edit-discount">Discount Percentage (%)</Label>
              <Input
                id="edit-discount"
                type="number"
                min="1"
                max="100"
                value={editForm.discount_percent}
                onChange={(e) =>
                  setEditForm({ ...editForm, discount_percent: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-expires">Expiry Date (Optional)</Label>
              <Input
                id="edit-expires"
                type="date"
                value={editForm.expires_at}
                onChange={(e) =>
                  setEditForm({ ...editForm, expires_at: e.target.value })
                }
              />
            </div>
            <Button onClick={handleUpdateCoupon} className="w-full">
              Update Coupon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{couponToDelete?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCoupons;