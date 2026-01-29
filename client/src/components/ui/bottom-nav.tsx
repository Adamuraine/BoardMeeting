import { Link, useLocation } from "wouter";
import { User, Waves, Plane, Users, Home as HomeIcon, MessageCircle, ShoppingBag, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Show different nav items for anonymous vs logged-in users
  const navItems = user ? [
    { href: "/home", icon: HomeIcon, label: "Home" },
    { href: "/surf", icon: Waves, label: "Surf" },
    { href: "/marketplace", icon: ShoppingBag, label: "Market" },
    { href: "/buddies", icon: Users, label: "Buddies" },
    { href: "/trips", icon: Plane, label: "Trips" },
    { href: "/messages", icon: MessageCircle, label: "Messages" },
    { href: "/profile", icon: User, label: "Profile" },
  ] : [
    { href: "/home", icon: HomeIcon, label: "Home" },
    { href: "/surf", icon: Waves, label: "Surf" },
    { href: "/marketplace", icon: ShoppingBag, label: "Market" },
    { href: "/buddies", icon: Users, label: "Buddies" },
    { href: "/trips", icon: Plane, label: "Trips" },
    { href: "/", icon: LogIn, label: "Sign In" },
  ];

  // Don't show on onboarding
  if (location === "/onboarding") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg px-1 py-1 z-50 safe-area-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex flex-col items-center gap-0.5 p-1 rounded-md transition-colors cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
              )}>
                <Icon className={cn("h-5 w-5", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
