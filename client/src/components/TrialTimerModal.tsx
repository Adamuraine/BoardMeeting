import { useState, useEffect } from "react";
import { useMyProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Waves, Clock, Users, MapPin, Sparkles } from "lucide-react";

const TRIAL_DURATION_MS = 5 * 60 * 1000;

export function TrialTimerModal() {
  const { data: profile } = useMyProfile();
  const [location, setLocation] = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const updateProfile = useUpdateProfile();
  
  // Hide timer during onboarding/setup
  const isOnboarding = location === "/onboarding";

  useEffect(() => {
    if (!profile?.isIncompleteProfile || !profile?.trialStartedAt) {
      return;
    }

    const trialStart = new Date(profile.trialStartedAt).getTime();
    const trialEnd = trialStart + TRIAL_DURATION_MS;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = trialEnd - now;

      if (remaining <= 0) {
        setShowModal(true);
        setTimeRemaining(0);
      } else {
        setTimeRemaining(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [profile?.isIncompleteProfile, profile?.trialStartedAt]);

  const handleCompleteProfile = () => {
    setShowModal(false);
    setLocation("/onboarding");
  };

  const handleContinueBrowsing = () => {
    updateProfile.mutate({
      isIncompleteProfile: false,
      trialStartedAt: null,
    });
    setShowModal(false);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!profile?.isIncompleteProfile || isOnboarding) {
    return null;
  }

  return (
    <>
      {timeRemaining !== null && timeRemaining > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg backdrop-blur-sm">
          <Clock className="w-4 h-4" />
          <span>Trial: {formatTime(timeRemaining)}</span>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-trial-expired">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Waves className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Join Board Meeting</DialogTitle>
            <DialogDescription className="text-base">
              Your free preview has ended. Create your profile to unlock all features - completely free!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">Find Surf Buddies</p>
                <p className="text-xs text-muted-foreground">Match with surfers who share your vibe</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">Plan Epic Trips</p>
                <p className="text-xs text-muted-foreground">Organize adventures with your crew</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">Track Your Sessions</p>
                <p className="text-xs text-muted-foreground">Earn badges and climb the leaderboard</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleCompleteProfile} 
              className="w-full h-12 text-lg font-semibold"
              data-testid="button-complete-profile"
            >
              Complete My Profile - Free
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleContinueBrowsing}
              className="w-full text-muted-foreground"
              data-testid="button-continue-browsing"
            >
              I'll browse a bit more
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            No credit card required. Premium features available for $5/month.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
