import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Waves, Users, Radio, SlidersHorizontal } from "lucide-react";
import { useUpgradePremium } from "@/hooks/use-profiles";
import { useToast } from "@/hooks/use-toast";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREMIUM_FEATURES = [
  { icon: Users, label: "Unlimited buddy swipes", description: "Free users get 5 per day" },
  { icon: SlidersHorizontal, label: "Gender & age filters on buddy swipes", description: "Find exactly who you're looking for" },
  { icon: Waves, label: "7-day extended surf forecasts", description: "Free users get 3-day forecasts" },
  { icon: Radio, label: "Broadcast your trips & meetups", description: "Get seen by surfers in your area" },
];

export function PremiumModal({ open, onOpenChange }: PremiumModalProps) {
  const { mutate: upgrade, isPending } = useUpgradePremium();
  const { toast } = useToast();

  const handleUpgrade = () => {
    upgrade(undefined, {
      onSuccess: () => {
        toast({ title: "Welcome to Premium!", description: "You now have unlimited swipes, extended forecasts, and more." });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-secondary/30 border-0">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-2">
            <Crown className="w-8 h-8 text-accent" />
          </div>
          <DialogTitle className="text-2xl font-display text-primary">Go Premium</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Unlock the full Board Meeting experience for just <span className="font-bold text-foreground">$5/mo</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {PREMIUM_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.label} className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mt-0.5 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-sm">{feature.label}</span>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <Button 
          onClick={handleUpgrade} 
          disabled={isPending}
          className="w-full bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-500/20"
          data-testid="button-upgrade-premium"
        >
          {isPending ? "Processing..." : "Upgrade for $5/mo"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
