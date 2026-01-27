import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, TrendingUp, MessageCircle, Crown, Users, UserPlus, Check, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/SafeImage";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { profiles } from "@shared/schema";
import boardMeetingLogo from "@assets/IMG_3950_1769110363136.jpeg";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type Profile = typeof profiles.$inferSelect;

interface ViewProfileProps {
  params: { id: string };
}

export default function ViewProfile({ params }: ViewProfileProps) {
  const [, navigate] = useLocation();
  const { id } = params;
  const { user } = useAuth();
  const { toast } = useToast();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const { data: profile, isLoading, error } = useQuery<Profile>({
    queryKey: ["/api/profiles/user", id],
  });

  const { data: buddies = [] } = useQuery<Profile[]>({
    queryKey: ["/api/buddies"],
    enabled: !!user,
  });

  const isAlreadyBuddy = buddies.some(b => b.userId === id);

  const addBuddyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/swipes", {
        swipedId: id,
        direction: "right"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buddies"] });
      setJustAdded(true);
      if (data.match) {
        toast({ 
          title: "You're now buddies!", 
          description: `You and ${profile?.displayName || 'this surfer'} are now connected.`
        });
      } else {
        toast({ 
          title: "Request sent!", 
          description: `${profile?.displayName || 'This surfer'} will see your interest.`
        });
      }
    },
    onError: () => {
      toast({ 
        title: "Couldn't add buddy", 
        description: "Please try again.",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col h-full p-4 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full p-4">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <Button onClick={() => navigate("/home")} data-testid="button-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </Layout>
    );
  }

  const displayName = profile.displayName || "Surfer";
  const images = profile.imageUrls || [];

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative">
          <div className="h-48 bg-gradient-to-br from-primary/30 to-accent/30 relative overflow-hidden">
            <img
              src={boardMeetingLogo}
              alt="Board Meeting"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm text-white"
            onClick={() => navigate("/home")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="absolute -bottom-16 left-6">
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={images[0]} alt={displayName} className="object-cover" />
              <AvatarFallback className="text-3xl bg-primary/10">{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="p-4 pt-20 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold font-display" data-testid="text-profile-name">
                {displayName}
              </h1>
              {profile.isPremium && (
                <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              )}
              {profile.age && (
                <span className="text-lg text-muted-foreground">({profile.age})</span>
              )}
            </div>
            
            <p className="text-muted-foreground capitalize">
              - {profile.skillLevel} Surfer
            </p>
            
            {profile.location && (
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                <span data-testid="text-profile-location">{profile.location}</span>
              </div>
            )}
            
            {profile.openToGuiding && (
              <div className="mt-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Users className="h-3 w-3 mr-1" />
                  Open to Meeting/Guiding Travelers
                </Badge>
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {isAlreadyBuddy || justAdded ? (
                <Button variant="secondary" disabled data-testid="button-already-buddy">
                  <Check className="h-4 w-4 mr-2" />
                  Buddies
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    if (!user) {
                      setShowLoginPrompt(true);
                    } else {
                      addBuddyMutation.mutate();
                    }
                  }}
                  disabled={addBuddyMutation.isPending}
                  data-testid="button-add-buddy"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {addBuddyMutation.isPending ? "Adding..." : "Add Buddy"}
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => {
                  if (!user) {
                    setShowLoginPrompt(true);
                  } else {
                    navigate(`/messages?buddy=${profile.userId}`);
                  }
                }}
                data-testid="button-message"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          </div>
          
          <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  Sign in to Connect
                </DialogTitle>
                <DialogDescription>
                  Create a free account to add buddies and message other surfers.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 mt-4">
                <Button 
                  onClick={() => window.location.href = '/api/login'}
                  className="w-full"
                  data-testid="button-login-prompt"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in with Apple or Google
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full"
                  data-testid="button-continue-browsing"
                >
                  Continue Browsing
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">About</h3>
            <p className="text-foreground" data-testid="text-profile-bio">
              {profile.bio || "No bio yet."}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <div className="text-2xl font-bold font-display text-primary">{profile.fastestSpeed || 0}</div>
                <div className="text-xs text-muted-foreground">Top Speed (mph)</div>
              </div>
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <div className="text-2xl font-bold font-display text-primary">{profile.biggestWave || 0}</div>
                <div className="text-xs text-muted-foreground">Biggest Wave (ft)</div>
              </div>
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <div className="text-2xl font-bold font-display text-primary">{profile.longestWave || 0}</div>
                <div className="text-xs text-muted-foreground">Longest Ride (yds)</div>
              </div>
              <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                <div className="text-2xl font-bold font-display text-primary capitalize">{profile.skillLevel}</div>
                <div className="text-xs text-muted-foreground">Skill Level</div>
              </div>
            </div>
          </div>

          {profile.tricks && profile.tricks.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tricks ({profile.tricks.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.tricks.map((trick: string) => (
                  <Badge 
                    key={trick} 
                    variant="secondary"
                    data-testid={`badge-trick-${trick.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {trick}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {images.length > 1 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Photos</h3>
              <div className="grid grid-cols-3 gap-2">
                {images.slice(1).map((img: string, i: number) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden">
                    <SafeImage
                      src={img}
                      alt={`${displayName} photo ${i + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
