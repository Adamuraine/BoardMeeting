import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, TrendingUp, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/SafeImage";
import type { profiles } from "@shared/schema";

type Profile = typeof profiles.$inferSelect;

interface ViewProfileProps {
  params: { id: string };
}

export default function ViewProfile({ params }: ViewProfileProps) {
  const [, navigate] = useLocation();
  const { id } = params;

  const { data: profile, isLoading, error } = useQuery<Profile>({
    queryKey: ["/api/profiles", id],
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
          <div className="h-64 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
            <SafeImage
              src={images[0]}
              alt={displayName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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
        </div>

        <div className="p-4 space-y-6 -mt-8 relative z-10">
          <div className="bg-card rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl font-bold font-display" data-testid="text-profile-name">
                {displayName}
              </h1>
              {profile.age && (
                <span className="text-lg text-muted-foreground">{profile.age}</span>
              )}
            </div>
            
            {profile.location && (
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span data-testid="text-profile-location">{profile.location}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="capitalize" data-testid="badge-skill-level">
                {profile.skillLevel}
              </Badge>
              <Button 
                onClick={() => navigate(`/messages?buddy=${id}`)}
                className="ml-auto"
                data-testid="button-message"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          </div>

          {profile.bio && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">About</h3>
              <p className="text-foreground" data-testid="text-profile-bio">{profile.bio}</p>
            </div>
          )}

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
