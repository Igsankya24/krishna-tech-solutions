import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import ServiceCard from "@/components/ServiceCard";
import {
  HardDrive,
  RefreshCw,
  KeyRound,
  Wrench,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Phone,
  Clock,
  Award,
} from "lucide-react";

const Index = () => {
  const services = [
    {
      icon: HardDrive,
      title: "Data Recovery",
      description:
        "Professional data recovery from hard drives, SSDs, USB drives, and memory cards with 95%+ success rate.",
    },
    {
      icon: RefreshCw,
      title: "Windows Upgrade",
      description: "Seamless Windows upgrades while keeping all your files, applications, and settings intact.",
    },
    {
      icon: KeyRound,
      title: "Password Recovery",
      description: "Remove or reset Windows passwords without losing any data. Quick and secure solution.",
    },
    {
      icon: Wrench,
      title: "Computer Repair",
      description: "Expert hardware and software repairs for laptops and desktops. All brands supported.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Happy Customers" },
    { value: "95%", label: "Recovery Rate" },
    { value: "5+", label: "Years Experience" },
    { value: "24/7", label: "Support Available" },
  ];

  const whyUs = [
    {
      icon: Shield,
      title: "100% Data Safety",
      description: "Your data security is our top priority. We follow strict protocols.",
    },
    {
      icon: Zap,
      title: "Fast Turnaround",
      description: "Most services completed within 24-48 hours.",
    },
    {
      icon: Award,
      title: "Expert Technicians",
      description: "Certified professionals with years of experience.",
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-section min-h-[90vh] flex items-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in">
              <span className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium mb-8">
                Trusted Tech Solutions Since 2019
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-hero-foreground mb-6 animate-slide-up">
              Your Data is <span className="gradient-text">Precious</span>
              <br />
              We Recover It
            </h1>

            <p className="text-lg md:text-xl text-hero-foreground/70 max-w-2xl mx-auto mb-10 animate-fade-in">
              Professional data recovery, Windows services, and computer repairs. Expert solutions with no data loss
              guarantee.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link to="/contact">
                <Button variant="hero" size="lg">
                  Get Free Consultation
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="heroOutline" size="lg">
                  View Services
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-10 border-t border-hero-foreground/10">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <p className="font-display text-3xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-hero-foreground/60 text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-medium">Our Services</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">What We Offer</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
              Comprehensive tech solutions for all your computer needs. From data recovery to system upgrades, we've got
              you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, idx) => (
              <ServiceCard key={idx} {...service} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/services">
              <Button variant="outline" size="lg">
                View All Services
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-primary font-medium">Why Choose Us</span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-6">
                Trusted by Thousands of Customers
              </h2>
              <p className="text-muted-foreground mb-8">
                At Krishna Tech Solutions, we combine expertise with cutting-edge technology to deliver exceptional
                results. Your satisfaction is our mission.
              </p>

              <div className="space-y-6">
                {whyUs.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-3xl p-8 card-shadow border border-border">
              <h3 className="font-display text-2xl font-bold text-foreground mb-6">Quick Contact</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                  <Phone className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Call Us Now</p>
                    <p className="font-semibold text-foreground">+91 7026292525</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                  <Clock className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Working Hours</p>
                    <p className="font-semibold text-foreground">Mon-Sat: 9AM - 8PM</p>
                  </div>
                </div>
              </div>
              <Link to="/contact" className="block mt-6">
                <Button variant="hero" className="w-full" size="lg">
                  Book Appointment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 hero-section relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-80 h-80 bg-accent/30 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-hero-foreground mb-6">
              Lost Your Data?
              <br />
              <span className="gradient-text">We Can Help!</span>
            </h2>
            <p className="text-hero-foreground/70 text-lg mb-10 max-w-xl mx-auto">
              Don't panic! Contact us immediately for a free consultation. Our experts are ready to recover your
              valuable data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button variant="hero" size="lg">
                  Contact Us Now
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="tel:+911234567890">
                <Button variant="heroOutline" size="lg">
                  <Phone className="w-5 h-5" />
                  Call: +91 7026292525
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
