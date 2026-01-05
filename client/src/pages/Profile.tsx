import { useMyProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Camera, TrendingUp, X, Plus, Users, Lock, Globe, GripVertical, Star, MapPin, Calendar, MessageCircle } from "lucide-react";
import { PremiumModal } from "@/components/PremiumModal";
import { useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/SafeImage";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import type { Profile as ProfileType, Trip } from "@shared/schema";
import { format } from "date-fns";

export default function Profile() {
  const { data: profile, isLoading } = useMyProfile();
  const { logout } = useAuth();
  const [showPremium, setShowPremium] = useState(false);
  const { toast } = useToast();

  const { data: buddies = [] } = useQuery<ProfileType[]>({
    queryKey: ["/api/buddies"],
    enabled: !!profile,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: myTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips/user", profile?.userId],
    enabled: !!profile?.userId,
  });

  const updatePhotosMutation = useMutation({
    mutationFn: async (imageUrls: string[]) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", { imageUrls });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({ title: "Photos updated", description: "Your photos have been saved!" });
    },
    onError: () => {
      toast({ 
        title: "Upload failed", 
        description: "Failed to save your photos. Please try again.",
        variant: "destructive"
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<ProfileType>) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
    },
  });

  const pendingPathsRef = useRef(new Map<string, string>());

  const getUploadParams = async (file: { id?: string; name: string; size: number | null; type: string }) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size || 0,
        contentType: file.type,
      }),
    });
    const { uploadURL, objectPath } = await res.json();
    const fileId = file.id || file.name;
    pendingPathsRef.current.set(fileId, objectPath);
    return {
      method: "PUT" as const,
      url: uploadURL as string,
      headers: { "Content-Type": file.type },
    };
  };

  const handleProfilePhotoComplete = (result: { successful?: { id?: string; name?: string }[] }) => {
    const files = result.successful || [];
    if (files.length > 0) {
      const file = files[0];
      const fileId = file?.id || file?.name;
      const objectPath = fileId ? pendingPathsRef.current.get(fileId) : undefined;
      if (objectPath) {
        const newImageUrls = [objectPath, ...(profile?.imageUrls?.slice(1) || [])];
        updatePhotosMutation.mutate(newImageUrls);
        pendingPathsRef.current.delete(fileId!);
      }
    }
  };

  const handleGalleryComplete = (result: { successful?: { id?: string; name?: string }[] }) => {
    const files = result.successful || [];
    const newUrls: string[] = [];
    
    for (const file of files) {
      const fileId = file?.id || file?.name;
      if (fileId) {
        const objectPath = pendingPathsRef.current.get(fileId);
        if (objectPath) {
          newUrls.push(objectPath);
          pendingPathsRef.current.delete(fileId);
        }
      }
    }
    
    if (newUrls.length > 0) {
      const currentUrls = profile?.imageUrls || [];
      const updatedUrls = [...currentUrls, ...newUrls];
      updatePhotosMutation.mutate(updatedUrls);
    }
  };

  const removePhoto = (index: number) => {
    if (profile?.imageUrls) {
      const updated = profile.imageUrls.filter((_, i) => i !== index);
      updatePhotosMutation.mutate(updated);
    }
  };

  const toggleBuddiesPublic = () => {
    updateProfileMutation.mutate({ buddiesPublic: !profile?.buddiesPublic });
  };

  const toggleTopBuddy = (buddyUserId: string) => {
    const currentTop = profile?.topBuddyIds || [];
    let newTop: string[];
    
    if (currentTop.includes(buddyUserId)) {
      newTop = currentTop.filter(id => id !== buddyUserId);
    } else {
      if (currentTop.length >= 10) {
        toast({ title: "Top 10 limit", description: "You can only have 10 top buddies. Remove one first." });
        return;
      }
      newTop = [...currentTop, buddyUserId];
    }
    
    updateProfileMutation.mutate({ topBuddyIds: newTop });
  };

  if (isLoading) return <ProfileSkeleton />;
  if (!profile) return null;

  const topBuddyIds = profile.topBuddyIds || [];
  const topBuddies = buddies.filter(b => topBuddyIds.includes(b.userId));
  const otherBuddies = buddies.filter(b => !topBuddyIds.includes(b.userId));
  const sortedBuddies = [...topBuddies, ...otherBuddies];

  return (
    <Layout>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      <div className="relative pb-20">
        <div className="h-40 bg-gradient-to-r from-primary to-cyan-400" />
        
        <div className="px-6 -mt-16">
          <div className="flex justify-between items-end mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-background bg-secondary overflow-hidden shadow-xl">
                 <SafeImage 
                   src={profile.imageUrls?.[0] || "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80"} 
                   alt={profile.displayName} 
                   className="w-full h-full object-cover"
                 />
              </div>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={getUploadParams}
                onComplete={handleProfilePhotoComplete}
                buttonClassName="absolute bottom-0 right-0 w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center border-2 border-background p-0 hover:bg-foreground/90"
              >
                <Camera className="w-4 h-4" />
              </ObjectUploader>
            </div>

            <Button variant="ghost" size="icon" className="mb-2" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              {profile.displayName}
              {profile.isPremium && <Crown className="w-5 h-5 text-accent fill-current" />}
            </h1>
            <p className="text-muted-foreground">{profile.location} - {profile.skillLevel} Surfer</p>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">About</h3>
              <p className="text-foreground/80 leading-relaxed">
                {profile.bio || "No bio yet."}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Upcoming Trips ({myTrips.length})
              </h3>
              {myTrips.length > 0 ? (
                <div className="space-y-3">
                  {myTrips.map((trip) => (
                    <div 
                      key={trip.id} 
                      className="p-4 rounded-xl border border-border/50 bg-secondary/30"
                      data-testid={`trip-card-${trip.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground truncate">{trip.destination}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                            </span>
                          </div>
                          {trip.description && (
                            <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{trip.description}</p>
                          )}
                        </div>
                        {trip.tripType && (
                          <Badge variant="secondary" className="flex-shrink-0">{trip.tripType}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-secondary/30 rounded-xl border border-border/50">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming trips planned</p>
                  <Link href="/trips">
                    <Button variant="outline" size="sm" className="mt-3" data-testid="button-plan-trip">
                      Plan a Trip
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                My Photos ({profile.imageUrls?.length || 0})
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Upload as many surf action shots and lifestyle photos as you want</p>
              <div className="grid grid-cols-3 gap-2">
                {profile.imageUrls?.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-secondary relative group">
                    <SafeImage src={url} alt="Gallery" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-remove-photo-${i}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <ObjectUploader
                  maxNumberOfFiles={50}
                  maxFileSize={10485760}
                  onGetUploadParameters={getUploadParams}
                  onComplete={handleGalleryComplete}
                  buttonClassName="aspect-square w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors p-0"
                >
                  <Plus className="w-6 h-6" />
                </ObjectUploader>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Surf Buddies ({buddies.length})
                </h3>
                <div className="flex items-center gap-2">
                  {profile.buddiesPublic ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch 
                    checked={profile.buddiesPublic ?? true} 
                    onCheckedChange={toggleBuddiesPublic}
                    data-testid="switch-buddies-public"
                  />
                  <span className="text-xs text-muted-foreground">
                    {profile.buddiesPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mb-4">
                Star up to 10 buddies to feature them at the top. {profile.buddiesPublic ? "Others can see your buddies." : "Only you can see your buddies."}
              </p>

              {sortedBuddies.length > 0 ? (
                <div className="space-y-2">
                  {sortedBuddies.map((buddy) => {
                    const isTop = topBuddyIds.includes(buddy.userId);
                    return (
                      <div 
                        key={buddy.userId} 
                        className={`flex items-center gap-3 p-3 rounded-xl border ${isTop ? 'border-accent bg-accent/10' : 'border-border/50 bg-secondary/30'}`}
                        data-testid={`buddy-row-${buddy.userId}`}
                      >
                        <button 
                          onClick={() => toggleTopBuddy(buddy.userId)}
                          className="flex-shrink-0"
                          data-testid={`button-star-buddy-${buddy.userId}`}
                        >
                          <Star className={`h-5 w-5 ${isTop ? 'text-accent fill-current' : 'text-muted-foreground'}`} />
                        </button>
                        
                        <Link href={`/profile/${buddy.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={buddy.imageUrls?.[0]} />
                            <AvatarFallback>{buddy.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{buddy.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{buddy.location} - {buddy.skillLevel}</p>
                          </div>
                        </Link>
                        
                        <Link href={`/messages?buddy=${buddy.userId}`}>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            data-testid={`button-message-buddy-${buddy.userId}`}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        {isTop && (
                          <Badge variant="outline" className="flex-shrink-0 text-accent border-accent">
                            Top 10
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No surf buddies yet!</p>
                  <p className="text-xs mt-1">Match with other surfers to add them here</p>
                </div>
              )}
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

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tricks Mastered ({profile.tricks?.length || 0})
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.tricks?.length ? (
                  profile.tricks.map((trick: string) => (
                    <Badge 
                      key={trick} 
                      variant="secondary"
                      data-testid={`profile-badge-trick-${trick.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {trick}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No tricks logged yet. Add tricks from the Stats page!</p>
                )}
              </div>
            </div>
          </div>

          {!profile.isPremium && (
            <div className="mt-12 mb-8">
              <Button 
                onClick={() => setShowPremium(true)}
                variant="outline"
                className="w-full text-muted-foreground"
                data-testid="button-upgrade-premium"
              >
                <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ProfileSkeleton() {
  return (
    <Layout>
      <div className="h-40 bg-muted animate-pulse" />
      <div className="px-6 -mt-16">
        <Skeleton className="w-32 h-32 rounded-full border-4 border-background mb-4" />
        <Skeleton className="w-48 h-8 mb-2" />
        <Skeleton className="w-32 h-4 mb-8" />
        <Skeleton className="w-full h-24 rounded-2xl mb-8" />
        <div className="space-y-4">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      </div>
    </Layout>
  );
}
