import { Wrench, Mail, Phone } from "lucide-react";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="w-12 h-12 text-primary animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            We're Under Maintenance
          </h1>
          <p className="text-muted-foreground">
            Our website is currently undergoing scheduled maintenance. We'll be back shortly!
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Need to reach us?</h2>
          <div className="space-y-3">
            <a 
              href="mailto:info@krishnatech.com" 
              className="flex items-center justify-center gap-2 text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              info@krishnatech.com
            </a>
            <a 
              href="tel:+911234567890" 
              className="flex items-center justify-center gap-2 text-primary hover:underline"
            >
              <Phone className="w-4 h-4" />
              +91 12345 67890
            </a>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Thank you for your patience!
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
