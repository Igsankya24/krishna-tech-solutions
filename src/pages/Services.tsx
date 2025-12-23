import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import ServiceCard from "@/components/ServiceCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  HardDrive,
  RefreshCw,
  KeyRound,
  Wrench,
  Shield,
  Bug,
  Laptop,
  Server,
  ArrowRight,
  Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  display_order: number;
}

// Default services as fallback
const defaultServices = [
  {
    icon: HardDrive,
    title: "Data Recovery",
    description:
      "Professional data recovery from all types of storage devices. We handle HDDs, SSDs, USB drives, SD cards, and RAID systems.",
    features: [
      "Hard Drive Recovery",
      "SSD Data Recovery",
      "USB & SD Card Recovery",
      "RAID Recovery",
      "Deleted File Recovery",
    ],
    price: "₹999",
  },
  {
    icon: RefreshCw,
    title: "Windows Upgrade",
    description:
      "Seamless Windows upgrades from any version to the latest Windows 11. All your files, apps, and settings stay intact.",
    features: [
      "Windows 10/11 Upgrade",
      "Data Preservation",
      "Application Migration",
      "Driver Updates",
      "Performance Optimization",
    ],
    price: "₹999",
  },
  {
    icon: KeyRound,
    title: "Password Recovery",
    description:
      "Reset or remove Windows passwords without losing any data. Fast, secure, and reliable service.",
    features: [
      "Windows Password Reset",
      "Admin Account Recovery",
      "BIOS Password Removal",
      "No Data Loss",
      "Same Day Service",
    ],
    price: "₹499",
  },
  {
    icon: Wrench,
    title: "Computer Repair",
    description:
      "Expert hardware and software repairs for laptops and desktops. We fix all brands and models.",
    features: [
      "Hardware Diagnostics",
      "Screen Replacement",
      "Keyboard Repair",
      "Battery Replacement",
      "Motherboard Repair",
    ],
    price: "₹299",
  },
  {
    icon: Bug,
    title: "Virus Removal",
    description:
      "Complete malware, virus, and spyware removal. We clean your system and install protection.",
    features: [
      "Malware Removal",
      "Ransomware Recovery",
      "Spyware Cleanup",
      "Antivirus Installation",
      "Security Setup",
    ],
    price: "₹599",
  },
  {
    icon: Shield,
    title: "Backup Solutions",
    description:
      "Set up automated backup systems to protect your valuable data. Cloud and local options available.",
    features: [
      "Cloud Backup Setup",
      "Local Backup Solutions",
      "Automated Scheduling",
      "Data Encryption",
      "Disaster Recovery Plan",
    ],
    price: "₹799",
  },
  {
    icon: Laptop,
    title: "Software Installation",
    description:
      "Professional installation of operating systems and software. Includes configuration and optimization.",
    features: [
      "OS Installation",
      "Office Suite Setup",
      "Development Tools",
      "Design Software",
      "License Activation",
    ],
    price: "₹399",
  },
  {
    icon: Server,
    title: "Network Setup",
    description:
      "Home and small office network setup. WiFi configuration, security, and troubleshooting.",
    features: [
      "WiFi Setup",
      "Router Configuration",
      "Network Security",
      "Speed Optimization",
      "Printer Sharing",
    ],
    price: "₹699",
  },
];

const Services = () => {
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) throw error;
        setDbServices(data || []);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();

    // Real-time updates for services
    const channel = supabase
      .channel("public-services")
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

  // Use database services, fall back to defaults only if database is empty
  const displayServices = dbServices.length > 0
    ? dbServices.map((service) => ({
        icon: Cpu as LucideIcon,
        title: service.name,
        description: service.description || "",
        features: [],
        price: `₹${service.price.toLocaleString()}`,
      }))
    : defaultServices;

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-section py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6">
              Our Services
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-hero-foreground mb-6">
              Professional Tech{" "}
              <span className="gradient-text">Solutions</span>
            </h1>
            <p className="text-lg text-hero-foreground/70 max-w-2xl mx-auto">
              From data recovery to system repairs, we offer comprehensive IT
              services to keep your technology running smoothly.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading services...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {displayServices.map((service, idx) => (
                <ServiceCard key={idx} {...service} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-medium">How It Works</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
              Our Simple Process
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { step: "01", title: "Contact Us", desc: "Call or message us about your issue" },
              { step: "02", title: "Diagnosis", desc: "We analyze and diagnose the problem" },
              { step: "03", title: "Solution", desc: "We fix the issue with expert care" },
              { step: "04", title: "Delivery", desc: "Get your device back, working perfectly" },
            ].map((item, idx) => (
              <div key={idx} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="font-display text-xl font-bold text-primary-foreground">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 hero-section">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-hero-foreground mb-6">
              Need Our Services?
            </h2>
            <p className="text-hero-foreground/70 mb-10">
              Contact us today for a free consultation. We're here to help with
              all your tech needs.
            </p>
            <Link to="/contact">
              <Button variant="hero" size="lg">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
