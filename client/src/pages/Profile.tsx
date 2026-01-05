import { useMyProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Settings, Camera, TrendingUp, X, Plus } from "lucide-react";
import { PremiumModal } from "@/components/PremiumModal";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/SafeImage";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { data: profile, isLoading } = useMyProfile();
  const { logout } = useAuth();
  const [showPremium, setShowPremium] = useState(false);
  const { toast } = useToast();

  const updatePhotosMutation = useMutation({
    mutationFn: async (imageUrls: string[]) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", { imageUrls });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({ title: "Photos updated", description: "Your photos have been saved!" });
    },
  });

  const [pendingPaths, setPendingPaths] = useState<Map<string, string>>(new Map());

  const getUploadParams = async (file: { name: string; size: number | null; type: string }) => {
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
    setPendingPaths(prev => new Map(prev).set(file.name, objectPath));
    return {
      method: "PUT" as const,
      url: uploadURL as string,
      headers: { "Content-Type": file.type },
    };
  };

  const handleProfilePhotoComplete = (result: { successful?: { name?: string }[] }) => {
    const files = result.successful || [];
    if (files.length > 0 && files[0]?.name) {
      const objectPath = pendingPaths.get(files[0].name);
      if (objectPath) {
        const newImageUrls = [objectPath, ...(profile?.imageUrls?.slice(1) || [])];
        updatePhotosMutation.mutate(newImageUrls);
        setPendingPaths(new Map());
      }
    }
  };

  const handleGalleryComplete = (result: { successful?: { name?: string }[] }) => {
    const files = result.successful || [];
    const newUrls = files
      .map((f) => f?.name ? pendingPaths.get(f.name) : undefined)
      .filter((path): path is string => !!path);
    
    if (newUrls.length > 0) {
      const currentUrls = profile?.imageUrls || [];
      const updatedUrls = [...currentUrls, ...newUrls].slice(0, 50);
      updatePhotosMutation.mutate(updatedUrls);
      setPendingPaths(new Map());
    }
  };

  const removePhoto = (index: number) => {
    if (profile?.imageUrls) {
      const updated = profile.imageUrls.filter((_, i) => i !== index);
      updatePhotosMutation.mutate(updated);
    }
  };

  if (isLoading) return <ProfileSkeleton />;
  if (!profile) return null;

  return (
    <Layout>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      <div className="relative">
        {/* Header Background */}
        <div className="h-40 bg-gradient-to-r from-primary to-cyan-400" />
        
        {/* Profile Content */}
        <div className="px-6 pb-20 -mt-16">
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

            <Button variant="ghost" size="icon" className="mb-2" onClick={() => logout()}>
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              {profile.displayName}
              {profile.isPremium && <Crown className="w-5 h-5 text-accent fill-current" />}
            </h1>
            <p className="text-muted-foreground">{profile.location} • {profile.skillLevel} Surfer</p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">About</h3>
              <p className="text-foreground/80 leading-relaxed">
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

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Surf Photos ({profile.imageUrls?.length || 0}/50)
              </h3>
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
                {(profile.imageUrls?.length || 0) < 50 && (
                  <ObjectUploader
                    maxNumberOfFiles={Math.min(10, 50 - (profile.imageUrls?.length || 0))}
                    maxFileSize={10485760}
                    onGetUploadParameters={getUploadParams}
                    onComplete={handleGalleryComplete}
                    buttonClassName="aspect-square w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors p-0"
                  >
                    <Plus className="w-6 h-6" />
                  </ObjectUploader>
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
