import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Mail, Calendar, Shield, RefreshCw, CheckCircle, XCircle, Clock, Key, Settings, History, Monitor, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  is_approved: boolean;
}

interface UserRole {
  user_id: string;
  role: "admin" | "user" | "super_admin";
}

type PermissionType = "read" | "write" | "change_password" | "manage_appointments" | "manage_services";

interface UserPermission {
  user_id: string;
  permission: PermissionType;
}

interface Session {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
  user_agent: string | null;
  is_active: boolean;
}

interface UserWithRole extends Profile {
  role: "admin" | "user" | "super_admin";
  permissions: PermissionType[];
}

const PERMISSION_LABELS: Record<PermissionType, string> = {
  read: "Read Access",
  write: "Write Access",
  change_password: "Change Password",
  manage_appointments: "Manage Appointments",
  manage_services: "Manage Services",
};

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [selectedUserForSessions, setSelectedUserForSessions] = useState<UserWithRole | null>(null);
  const [userSessions, setUserSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    fetchUsers();

    // Subscribe to realtime updates for profiles
    const profilesChannel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchUsers()
      )
      .subscribe();

    // Subscribe to realtime updates for user_roles
    const rolesChannel = supabase
      .channel("roles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => fetchUsers()
      )
      .subscribe();

    // Subscribe to realtime updates for permissions
    const permissionsChannel = supabase
      .channel("permissions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_permissions" },
        () => fetchUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(permissionsChannel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        throw rolesError;
      }

      // Fetch permissions
      const { data: permissions, error: permissionsError } = await supabase
        .from("user_permissions")
        .select("user_id, permission");

      if (permissionsError) {
        console.error("Error fetching permissions:", permissionsError);
      }

      // Merge profiles with roles and permissions
      const rolesMap = new Map<string, "admin" | "user" | "super_admin">();
      roles?.forEach((r: UserRole) => rolesMap.set(r.user_id, r.role));

      const permissionsMap = new Map<string, PermissionType[]>();
      permissions?.forEach((p: UserPermission) => {
        const existing = permissionsMap.get(p.user_id) || [];
        existing.push(p.permission);
        permissionsMap.set(p.user_id, existing);
      });

      const usersWithRoles: UserWithRole[] = (profiles || []).map((p: Profile) => ({
        ...p,
        role: rolesMap.get(p.user_id) || "user",
        permissions: permissionsMap.get(p.user_id) || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "User Approved",
        description: "The user can now access the admin panel.",
      });
      fetchUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: "Failed to approve user.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "User Deleted",
        description: `${userName || "User"} has been permanently removed.`,
      });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
    toast({
      title: "Refreshed",
      description: "User data has been updated.",
    });
  };

  const openPermissionsDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions);
    setPermissionsDialogOpen(true);
  };

  const handlePermissionToggle = (permission: PermissionType) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || !currentUser) return;

    setIsSavingPermissions(true);
    try {
      // Delete existing permissions
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", selectedUser.user_id);

      // Insert new permissions
      if (selectedPermissions.length > 0) {
        const permissionsToInsert = selectedPermissions.map((permission) => ({
          user_id: selectedUser.user_id,
          permission,
          granted_by: currentUser.id,
        }));

        const { error } = await supabase
          .from("user_permissions")
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast({
        title: "Permissions Updated",
        description: `Permissions for ${selectedUser.full_name || "user"} have been updated.`,
      });
      setPermissionsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Error",
        description: "Failed to update permissions.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const openSessionsDialog = async (user: UserWithRole) => {
    setSelectedUserForSessions(user);
    setSessionsDialogOpen(true);
    setIsLoadingSessions(true);
    
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user.user_id)
        .order("login_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setUserSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load session history.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const getBrowserFromUserAgent = (userAgent: string | null): string => {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    if (userAgent.includes("Opera")) return "Opera";
    return "Unknown Browser";
  };

  const pendingUsers = users.filter((u) => !u.is_approved);
  const approvedUsers = users.filter((u) => u.is_approved);

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="font-display text-2xl font-bold text-primary">
            {users.length}
          </p>
          <p className="text-sm text-muted-foreground">Total Users</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="font-display text-2xl font-bold text-amber-500">
            {pendingUsers.length}
          </p>
          <p className="text-sm text-muted-foreground">Pending Approval</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="font-display text-2xl font-bold text-green-500">
            {users.filter((u) => u.role === "admin").length}
          </p>
          <p className="text-sm text-muted-foreground">Admins</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="font-display text-2xl font-bold text-blue-500">
            {approvedUsers.length}
          </p>
          <p className="text-sm text-muted-foreground">Approved Users</p>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-amber-700">
            <Clock className="w-5 h-5" />
            Pending Approvals ({pendingUsers.length})
          </h3>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between bg-card rounded-lg p-4 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user.user_id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject and delete this user? This will permanently remove their account and all associated data. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.user_id, user.full_name || "User")}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users Table */}
      {users.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No users found.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">
                        {user.full_name || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {user.email || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === "super_admin" ? (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                        <Shield className="w-3 h-3 mr-1" />
                        Super Admin
                      </Badge>
                    ) : user.role === "admin" ? (
                      <Badge className="bg-primary">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.length === 0 ? (
                        <span className="text-xs text-muted-foreground">None</span>
                      ) : (
                        user.permissions.slice(0, 2).map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p.replace("_", " ")}
                          </Badge>
                        ))
                      )}
                      {user.permissions.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.permissions.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_approved ? (
                      <Badge className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openSessionsDialog(user)}
                      >
                        <History className="w-3 h-3 mr-1" />
                        Sessions
                      </Button>
                      {user.is_approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPermissionsDialog(user)}
                          className="text-primary"
                        >
                          <Key className="w-3 h-3 mr-1" />
                          Permissions
                        </Button>
                      )}
                      {!user.is_approved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(user.user_id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          Approve
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              Revoke & Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to revoke access and delete this user? This will permanently remove their account and all associated data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.user_id, user.full_name || "User")}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manage Permissions
            </DialogTitle>
            <DialogDescription>
              Set permissions for {selectedUser?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(Object.keys(PERMISSION_LABELS) as PermissionType[]).map((permission) => (
              <div key={permission} className="flex items-center space-x-3">
                <Checkbox
                  id={permission}
                  checked={selectedPermissions.includes(permission)}
                  onCheckedChange={() => handlePermissionToggle(permission)}
                />
                <label
                  htmlFor={permission}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {PERMISSION_LABELS[permission]}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSavingPermissions}>
              {isSavingPermissions ? "Saving..." : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sessions History Dialog */}
      <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Session History
            </DialogTitle>
            <DialogDescription>
              Login history for {selectedUserForSessions?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {isLoadingSessions ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading sessions...
              </div>
            ) : userSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No session history found.
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {userSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border ${
                      session.is_active 
                        ? "border-green-500/30 bg-green-500/5" 
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {getBrowserFromUserAgent(session.user_agent)}
                        </span>
                      </div>
                      {session.is_active ? (
                        <Badge className="bg-green-600 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Ended</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <LogIn className="w-3 h-3" />
                        <span>
                          {format(new Date(session.login_at), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      {session.logout_at && (
                        <div className="flex items-center gap-1">
                          <LogOut className="w-3 h-3" />
                          <span>
                            {format(new Date(session.logout_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(session.login_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
