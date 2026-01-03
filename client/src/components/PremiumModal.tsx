import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { useUpgradePremium } from "@/hooks/use-profiles";
import { useToast } from "@/hooks/use-toast";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumModal({ open, onOpenChange }: PremiumModalProps) {
  const { mutate: upgrade, isPending } = useUpgradePremium();
  const { toast } = useToast();

  const handleUpgrade = () => {
    upgrade(undefined, {
      onSuccess: () => {
        toast({ title: "Welcome to Premium!", description: "You now have unlimited swipes and extended forecasts." });
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
            Unlock the full potential of Surf Buddy for just $5/month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-green-100 text-green-600"><Check className="w-4 h-4" /></div>
            <span className="font-medium">Unlimited buddy swipes</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-green-100 text-green-600"><Check className="w-4 h-4" /></div>
            <span className="font-medium">14-day extended surf forecasts</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-green-100 text-green-600"><Check className="w-4 h-4" /></div>
            <span className="font-medium">Advanced filtering for buddies</span>
          </div>
        </div>

        <Button 
          onClick={handleUpgrade} 
          disabled={isPending}
          className="w-full bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-500/20"
        >
          {isPending ? "Processing..." : "Upgrade for $5/mo"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
