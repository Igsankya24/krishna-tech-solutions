import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  LogOut,
  Home,
  Users,
  Settings,
  Calendar,
  MessageSquare,
  BarChart3,
  Shield,
  ArrowLeft,
  RefreshCw,
  Wrench,
  Ticket,
  Bell,
  User,
  UserPlus,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import AdminAppointments from "@/components/AdminAppointments";
import AdminUsers from "@/components/AdminUsers";
import AdminSettings from "@/components/AdminSettings";
import AdminServices from "@/components/AdminServices";
import AdminCoupons from "@/components/AdminCoupons";

type AdminView = "dashboard" | "appointments" | "users" | "settings" | "services" | "coupons";

interface Stats {
  totalUsers: number;
  totalAppointments: number;
  pendingAppointments: number;
  totalServices: number;
}

interface RecentAppointment {
  id: string;
  user_name: string;
  service_type: string | null;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
}

interface PendingUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

const Admin = () => {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalAppointments: 0, pendingAppointments: 0, totalServices: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, isApproved, isLoading, signOut } = useAuth();

  const fetchStats = useCallback(async () => {
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch appointment stats
      const { data: appointments } = await supabase
        .from("appointments")
        .select("status");

      // Fetch active services count
      const { count: serviceCount } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const totalAppointments = appointments?.length || 0;
      const pendingAppointments = appointments?.filter((a) => a.status === "pending").length || 0;

      setStats({
        totalUsers: userCount || 0,
        totalAppointments,
        pendingAppointments,
        totalServices: serviceCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchRecentAppointments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("appointments")
        .select("id, user_name, service_type, appointment_date, appointment_time, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        setRecentAppointments(data);
      }
    } catch (error) {
      console.error("Error fetching recent appointments:", error);
    }
  }, []);

  const fetchPendingUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });

      if (data) {
        setPendingUsers(data);
      }
    } catch (error) {
      console.error("Error fetching pending users:", error);
    }
  }, []);

  const fetchUserName = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.full_name) {
        setUserName(data.full_name);
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  }, [user]);

  // Calculate unread count - only pending users count as notifications
  useEffect(() => {
    setUnreadCount(pendingUsers.length);
  }, [pendingUsers]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  // Fetch stats and notifications on login/mount
  useEffect(() => {
    if (user) {
      fetchStats();
      fetchRecentAppointments();
      fetchPendingUsers();
      fetchUserName();
    }
  }, [user, fetchStats, fetchRecentAppointments, fetchPendingUsers, fetchUserName]);

  // Real-time updates for stats
  useEffect(() => {
    const appointmentsChannel = supabase
      .channel("admin-appointments-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchStats();
          fetchRecentAppointments();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("admin-profiles-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchStats();
          fetchPendingUsers();
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel("admin-services-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(servicesChannel);
    };
  }, [fetchStats]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  // Filter dashboard items based on role - regular users only see appointments
  const allDashboardItems = [
    {
      icon: BarChart3,
      title: "Overview",
      description: "View site statistics and analytics",
      color: "from-blue-500 to-blue-600",
      adminOnly: true,
    },
    {
      icon: MessageSquare,
      title: "Messages",
      description: "View customer inquiries",
      color: "from-green-500 to-green-600",
      adminOnly: true,
    },
    {
      icon: Calendar,
      title: "Appointments",
      description: "Manage service bookings",
      color: "from-purple-500 to-purple-600",
      view: "appointments" as AdminView,
      adminOnly: false,
    },
    {
      icon: Users,
      title: "Users",
      description: "View registered users",
      color: "from-orange-500 to-orange-600",
      view: "users" as AdminView,
      adminOnly: true,
    },
    {
      icon: Wrench,
      title: "Services",
      description: "Manage your services",
      color: "from-cyan-500 to-cyan-600",
      view: "services" as AdminView,
      adminOnly: true,
    },
    {
      icon: Ticket,
      title: "Coupons",
      description: "Manage discount coupons",
      color: "from-pink-500 to-pink-600",
      view: "coupons" as AdminView,
      adminOnly: true,
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Configure site settings",
      color: "from-gray-500 to-gray-600",
      view: "settings" as AdminView,
      adminOnly: true,
    },
  ];

  // Filter items based on user role
  const dashboardItems = isAdmin 
    ? allDashboardItems 
    : allDashboardItems.filter(item => !item.adminOnly);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Monitor className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg text-foreground leading-tight">
                  Admin Dashboard
                </span>
              </div>
            </Link>

            {/* User Info & Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notification Bell */}
              <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  {/* Pending User Approvals */}
                  {pendingUsers.length > 0 && (
                    <>
                      <div className="p-3 border-b border-border bg-amber-500/10">
                        <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-700">
                          <UserPlus className="w-4 h-4" />
                          Pending Approvals ({pendingUsers.length})
                        </h4>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {pendingUsers.map((pendingUser) => (
                          <div
                            key={pendingUser.id}
                            className="p-3 border-b border-border hover:bg-muted/50 cursor-pointer flex items-center gap-3"
                            onClick={() => {
                              setCurrentView("users");
                              setNotificationOpen(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {pendingUser.full_name || "Unknown User"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {pendingUser.email || "No email"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Recent Bookings */}
                  <div className="p-3 border-b border-border">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Recent Bookings
                    </h4>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {recentAppointments.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No recent appointments
                      </div>
                    ) : (
                      recentAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="p-3 border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setCurrentView("appointments");
                            setNotificationOpen(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{apt.user_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {apt.service_type || "General"}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-medium">
                                {format(new Date(apt.appointment_date), "MMM d")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {apt.appointment_time.slice(0, 5)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {recentAppointments.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          setCurrentView("appointments");
                          setNotificationOpen(false);
                        }}
                      >
                        View All Appointments
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">
                  {userName || user.email}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  {(isAdmin || isSuperAdmin) && <Shield className="w-3 h-3 text-primary" />}
                  {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "User"}
                  {userName && <span className="ml-1">• {user.email}</span>}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === "dashboard" ? (
          <>
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Monitor className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Welcome to Admin Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Manage your Krishna Tech Solutions website
                  </p>
                </div>
              </div>
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4" />
                  View Website
                </Button>
              </Link>
            </div>

            {/* Pending Approval Notice */}
            {!isApproved && !isAdmin && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-700">Account Pending Approval</h3>
                    <p className="text-sm text-amber-600">
                      Your account is awaiting admin approval. You'll have full access once approved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notice */}
            {isApproved && !isAdmin && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> You are logged in as a regular user. Contact
                  an administrator to get admin privileges for full access.
                </p>
              </div>
            )}

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => item.view && setCurrentView(item.view)}
                  className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-pointer group"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Quick Stats - Now with real data */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="font-display text-2xl font-bold gradient-text">
                  {stats.totalUsers}
                </p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="font-display text-2xl font-bold gradient-text">
                  {stats.totalAppointments}
                </p>
                <p className="text-sm text-muted-foreground">Appointments</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="font-display text-2xl font-bold gradient-text">
                  {stats.totalServices}
                </p>
                <p className="text-sm text-muted-foreground">Active Services</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="font-display text-2xl font-bold gradient-text">
                  {isAdmin ? "Active" : "Limited"}
                </p>
                <p className="text-sm text-muted-foreground">Your Access</p>
              </div>
            </div>
          </>
        ) : currentView === "appointments" ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView("dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <AdminAppointments />
          </div>
        ) : currentView === "users" && isAdmin ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView("dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <AdminUsers />
          </div>
        ) : currentView === "services" && isAdmin ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView("dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <AdminServices />
          </div>
        ) : currentView === "coupons" && isAdmin ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView("dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <AdminCoupons />
          </div>
        ) : currentView === "settings" && isAdmin ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView("dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <AdminSettings />
          </div>
        ) : (
          // Redirect non-admins trying to access admin-only views back to dashboard
          <div className="text-center py-8">
            <p className="text-muted-foreground">You don't have access to this section.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setCurrentView("dashboard")}
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
