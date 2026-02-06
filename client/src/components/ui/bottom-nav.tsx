import { Link, useLocation } from "wouter";
import { User, Waves, Plane, Users, Home as HomeIcon, MessageCircle, ShoppingBag, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const pastelColors: Record<string, { bg: string; activeBg: string; activeText: string }> = {
  "/home":        { bg: "bg-sky-100/0 dark:bg-sky-900/0",       activeBg: "bg-sky-100 dark:bg-sky-900/40",       activeText: "text-sky-600 dark:text-sky-400" },
  "/surf":        { bg: "bg-teal-100/0 dark:bg-teal-900/0",     activeBg: "bg-teal-100 dark:bg-teal-900/40",     activeText: "text-teal-600 dark:text-teal-400" },
  "/marketplace": { bg: "bg-emerald-100/0 dark:bg-emerald-900/0", activeBg: "bg-emerald-100 dark:bg-emerald-900/40", activeText: "text-emerald-600 dark:text-emerald-400" },
  "/buddies":     { bg: "bg-violet-100/0 dark:bg-violet-900/0", activeBg: "bg-violet-100 dark:bg-violet-900/40", activeText: "text-violet-600 dark:text-violet-400" },
  "/trips":       { bg: "bg-amber-100/0 dark:bg-amber-900/0",   activeBg: "bg-amber-100 dark:bg-amber-900/40",   activeText: "text-amber-600 dark:text-amber-400" },
  "/messages":    { bg: "bg-pink-100/0 dark:bg-pink-900/0",     activeBg: "bg-pink-100 dark:bg-pink-900/40",     activeText: "text-pink-600 dark:text-pink-400" },
  "/profile":     { bg: "bg-indigo-100/0 dark:bg-indigo-900/0", activeBg: "bg-indigo-100 dark:bg-indigo-900/40", activeText: "text-indigo-600 dark:text-indigo-400" },
  "/":            { bg: "bg-sky-100/0 dark:bg-sky-900/0",       activeBg: "bg-sky-100 dark:bg-sky-900/40",       activeText: "text-sky-600 dark:text-sky-400" },
};

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

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

  if (location === "/onboarding") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg px-1 py-1 z-50 safe-area-bottom">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          const colors = pastelColors[href] || pastelColors["/home"];
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 cursor-pointer",
                isActive
                  ? cn(colors.activeBg, colors.activeText)
                  : cn(colors.bg, "text-muted-foreground")
              )}>
                <Icon className="h-5 w-5" />
                <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
