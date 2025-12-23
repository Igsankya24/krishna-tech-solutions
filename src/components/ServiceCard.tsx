import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: string[];
  price?: string;
}

const ServiceCard = ({ icon: Icon, title, description, features, price }: ServiceCardProps) => {
  return (
    <div className="group bg-card rounded-2xl p-8 card-shadow border border-border/50 hover:border-primary/30 transition-all duration-500">
      {/* Icon */}
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-7 h-7 text-primary" />
      </div>

      {/* Content */}
      <h3 className="font-display font-bold text-xl text-card-foreground mb-3">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {description}
      </p>

      {/* Features */}
      {features && (
        <ul className="space-y-2 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Price */}
      {price && (
        <div className="pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">Starting from</span>
          <p className="font-display font-bold text-2xl gradient-text">{price}</p>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;
