import { Link, useLocation } from "wouter";
import { User, Waves, Plane, Users, Home as HomeIcon, MessageCircle, ShoppingBag, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const pastelColors: Record<string, { bg: string; text: string; activeBg: string; activeText: string }> = {
  "/home":        { bg: "bg-sky-100 dark:bg-sky-900/40",         text: "text-black dark:text-gray-300",          activeBg: "bg-sky-300 dark:bg-sky-700/60",         activeText: "text-sky-800 dark:text-sky-200" },
  "/surf":        { bg: "bg-teal-100 dark:bg-teal-900/40",       text: "text-black dark:text-gray-300",          activeBg: "bg-teal-300 dark:bg-teal-700/60",       activeText: "text-teal-800 dark:text-teal-200" },
  "/marketplace": { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-black dark:text-gray-300",          activeBg: "bg-emerald-300 dark:bg-emerald-700/60", activeText: "text-emerald-800 dark:text-emerald-200" },
  "/buddies":     { bg: "bg-violet-100 dark:bg-violet-900/40",   text: "text-black dark:text-gray-300",          activeBg: "bg-violet-300 dark:bg-violet-700/60",   activeText: "text-violet-800 dark:text-violet-200" },
  "/trips":       { bg: "bg-amber-100 dark:bg-amber-900/40",     text: "text-black dark:text-gray-300",          activeBg: "bg-amber-300 dark:bg-amber-700/60",     activeText: "text-amber-800 dark:text-amber-200" },
  "/messages":    { bg: "bg-pink-100 dark:bg-pink-900/40",       text: "text-black dark:text-gray-300",          activeBg: "bg-pink-300 dark:bg-pink-700/60",       activeText: "text-pink-800 dark:text-pink-200" },
  "/profile":     { bg: "bg-indigo-100 dark:bg-indigo-900/40",   text: "text-black dark:text-gray-300",          activeBg: "bg-indigo-300 dark:bg-indigo-700/60",   activeText: "text-indigo-800 dark:text-indigo-200" },
  "/":            { bg: "bg-sky-100 dark:bg-sky-900/40",         text: "text-black dark:text-gray-300",          activeBg: "bg-sky-300 dark:bg-sky-700/60",         activeText: "text-sky-800 dark:text-sky-200" },
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
