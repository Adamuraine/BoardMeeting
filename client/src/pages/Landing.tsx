import { Button } from "@/components/ui/button";
import { Waves } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import tribalLogo from "@assets/IMG_2619_1767474700755.jpeg";

export default function Landing() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/home");
    }
  }, [user, setLocation]);

  if (isLoading || user) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background with abstract waves */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        {/* Scenic Surf Image */}
        {/* unsplash: scenic ocean waves surfing photography */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1502680390469-be75c86b636f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 mb-8 transform rotate-3">
          <img src={tribalLogo} alt="SurfTribe Logo" className="w-full h-full object-cover" />
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4 leading-tight">
          Find Your <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500">Surf Tribe</span>
        </h1>

        <p className="text-lg font-medium text-foreground max-w-sm mb-3">
          It's not always what you know, but who you know that's important.
        </p>
        
        <p className="text-base text-muted-foreground max-w-sm mb-12">
          Learn new tricks, find rides to the beach, and plan surf trips with other surfers.
        </p>

        <Button 
          onClick={() => window.location.href = "/api/login"}
          className="w-full max-w-xs h-14 text-lg font-semibold rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-xl transition-all hover:scale-[1.02]"
        >
          Login with Replit
        </Button>
        
        <p className="mt-6 text-sm text-muted-foreground/60">
          Join thousands of surfers worldwide
        </p>
      </div>
    </div>
  );
}
