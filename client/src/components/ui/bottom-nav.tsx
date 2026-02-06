import { Link, useLocation } from "wouter";
import { User, Waves, Plane, Users, Home as HomeIcon, MessageCircle, ShoppingBag, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const pastelColors: Record<string, { bg: string; text: string; activeBg: string; activeText: string }> = {
  "/home":        { bg: "bg-sky-50 dark:bg-sky-950/30",         text: "text-sky-400 dark:text-sky-600",         activeBg: "bg-sky-200 dark:bg-sky-800/50",         activeText: "text-sky-700 dark:text-sky-300" },
  "/surf":        { bg: "bg-teal-50 dark:bg-teal-950/30",       text: "text-teal-400 dark:text-teal-600",       activeBg: "bg-teal-200 dark:bg-teal-800/50",       activeText: "text-teal-700 dark:text-teal-300" },
  "/marketplace": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-400 dark:text-emerald-600", activeBg: "bg-emerald-200 dark:bg-emerald-800/50", activeText: "text-emerald-700 dark:text-emerald-300" },
  "/buddies":     { bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-400 dark:text-violet-600",   activeBg: "bg-violet-200 dark:bg-violet-800/50",   activeText: "text-violet-700 dark:text-violet-300" },
  "/trips":       { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-400 dark:text-amber-600",     activeBg: "bg-amber-200 dark:bg-amber-800/50",     activeText: "text-amber-700 dark:text-amber-300" },
  "/messages":    { bg: "bg-pink-50 dark:bg-pink-950/30",       text: "text-pink-400 dark:text-pink-600",       activeBg: "bg-pink-200 dark:bg-pink-800/50",       activeText: "text-pink-700 dark:text-pink-300" },
  "/profile":     { bg: "bg-indigo-50 dark:bg-indigo-950/30",   text: "text-indigo-400 dark:text-indigo-600",   activeBg: "bg-indigo-200 dark:bg-indigo-800/50",   activeText: "text-indigo-700 dark:text-indigo-300" },
  "/":            { bg: "bg-sky-50 dark:bg-sky-950/30",         text: "text-sky-400 dark:text-sky-600",         activeBg: "bg-sky-200 dark:bg-sky-800/50",         activeText: "text-sky-700 dark:text-sky-300" },
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
                  : cn(colors.bg, colors.text)
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
