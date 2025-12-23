import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Chatbot from "@/components/Chatbot";
import Maintenance from "@/pages/Maintenance";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isMaintenanceMode, isLoading } = useMaintenanceMode();
  const location = useLocation();
  
  // Pages that should bypass maintenance mode
  const bypassPaths = ["/auth", "/admin"];
  const shouldBypass = bypassPaths.some(path => location.pathname.startsWith(path));

  // Show maintenance page for public routes when maintenance mode is enabled
  if (!isLoading && isMaintenanceMode && !shouldBypass) {
    return <Maintenance />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
      <Chatbot />
    </div>
  );
};

export default Layout;
