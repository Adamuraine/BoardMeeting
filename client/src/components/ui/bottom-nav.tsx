import { Link, useLocation } from "wouter";
import { User, Waves, Plane, Users, Activity, Home as HomeIcon, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/home", icon: HomeIcon, label: "Home" },
    { href: "/stats", icon: Activity, label: "Stats" },
    { href: "/surf", icon: Waves, label: "Surf" },
    { href: "/trips", icon: Plane, label: "Trips" },
    { href: "/buddies", icon: Users, label: "Buddies" },
    { href: "/messages", icon: MessageCircle, label: "Messages" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  // Don't show on onboarding
  if (location === "/onboarding") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg px-4 py-2 z-50 safe-area-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-pointer",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
              )}>
                <Icon className={cn("h-6 w-6", isActive && "fill-current/20")} />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
