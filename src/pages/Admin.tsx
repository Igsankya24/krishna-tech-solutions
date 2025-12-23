import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
} from "lucide-react";
import AdminAppointments from "@/components/AdminAppointments";

type AdminView = "dashboard" | "appointments";

const Admin = () => {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard");
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const dashboardItems = [
    {
      icon: BarChart3,
      title: "Overview",
      description: "View site statistics and analytics",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: MessageSquare,
      title: "Messages",
      description: "View customer inquiries",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Calendar,
      title: "Appointments",
      description: "Manage service bookings",
      color: "from-purple-500 to-purple-600",
      view: "appointments" as AdminView,
    },
    {
      icon: Users,
      title: "Customers",
      description: "View customer database",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Configure site settings",
      color: "from-gray-500 to-gray-600",
    },
  ];

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
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">
                  {user.email}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  {isAdmin && <Shield className="w-3 h-3 text-primary" />}
                  {isAdmin ? "Admin" : "User"}
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

            {/* Admin Notice */}
            {!isAdmin && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
                <p className="text-sm text-yellow-700">
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

            {/* Quick Stats */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Visitors", value: "1,234" },
                { label: "New Messages", value: "12" },
                { label: "Appointments", value: "8" },
                { label: "Active Users", value: "45" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-card rounded-xl p-4 border border-border text-center"
                >
                  <p className="font-display text-2xl font-bold gradient-text">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
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
        ) : null}
      </main>
    </div>
  );
};

export default Admin;
