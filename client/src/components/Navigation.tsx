import { Link, useLocation } from "wouter";
import { Waves, User, Users, MapPin, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/buddies", icon: Users, label: "Buddies" },
    { href: "/surf", icon: Waves, label: "Surf" },
    { href: "/marketplace", icon: ShoppingBag, label: "Market" },
    { href: "/trips", icon: MapPin, label: "Trips" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[10000] bg-background/80 backdrop-blur-lg border-t border-border/50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors duration-200",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <item.icon className={cn("w-5 h-5", isActive && "fill-current")} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
