import { useLocations, useFavoriteLocations, useToggleFavorite } from "@/hooks/use-locations";
import { Layout } from "@/components/Layout";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { MapPin, Wind, TrendingUp, Lock, Calendar, Camera, ExternalLink, Search, Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { PremiumModal } from "@/components/PremiumModal";
import { useMyProfile } from "@/hooks/use-profiles";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import type { PostWithUser } from "@shared/schema";

export default function SurfReports() {
  const { data: allLocations, isLoading: loadingAll } = useLocations();
  const { data: favorites, isLoading: loadingFavs } = useFavoriteLocations();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  if (loadingAll || loadingFavs) return <ReportsSkeleton />;

  const today = new Date();
  const dates = Array.from({ length: 6 }).map((_, i) => addDays(today, i));

  return (
    <Layout>
      <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-background">
        <header className="p-6 pb-2 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">Good afternoon, adam</h1>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" className="rounded-full bg-white dark:bg-secondary shadow-sm">
                <Plus className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full bg-white dark:bg-secondary shadow-sm">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Horizontal Date Header */}
          <div className="flex justify-between px-2">
            {dates.map((date, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/60">
                  {format(date, 'eee')}
                </span>
                <span className="text-sm font-bold">
                  {format(date, 'd')}
                </span>
              </div>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
          {allLocations?.map((location) => {
            const isFav = favorites?.some(f => f.id === location.id);
            return (
              <Card 
                key={location.id}
                onClick={() => setSelectedLocation(location)}
                className="p-5 rounded-[20px] bg-white dark:bg-card border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-bold tracking-tight text-[#333] dark:text-foreground">
                    {location.name}, {location.region}
                  </h3>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className={cn("h-8 w-8 rounded-full", isFav && "text-yellow-500")}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(location.id);
                    }}
                  >
                    <Star className={cn("h-4 w-4", isFav && "fill-current")} />
                  </Button>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {location.reports?.slice(0, 6).map((report, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-3">
                      <span className="text-xs font-bold text-[#333] dark:text-foreground">
                        {report.waveHeightMin}-{report.waveHeightMax ?? 0}{report.waveHeightMax && report.waveHeightMax > 3 ? "+" : ""}
                      </span>
                      <div className="flex gap-0.5 w-full">
                        <div className={cn("h-1 flex-1 rounded-full", 
                          report.rating === 'epic' ? "bg-purple-500" :
                          report.rating === 'good' ? "bg-emerald-500" :
                          "bg-sky-400"
                        )} />
                        <div className={cn("h-1 flex-1 rounded-full", 
                          report.rating === 'epic' ? "bg-purple-500" :
                          report.rating === 'good' ? "bg-emerald-500" :
                          "bg-sky-400"
                        )} />
                        <div className={cn("h-1 flex-1 rounded-full", 
                          report.rating === 'epic' ? "bg-purple-500" :
                          report.rating === 'good' ? "bg-emerald-500" :
                          "bg-sky-400 opacity-30"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </main>
      </div>

      <LocationDetail 
        location={selectedLocation} 
        open={!!selectedLocation} 
        onOpenChange={(open) => !open && setSelectedLocation(null)} 
      />
    </Layout>
  );
}

function Badge({ rating }: { rating: string }) {
  const colors = {
    epic: "bg-purple-100 text-purple-700 border-purple-200",
    good: "bg-green-100 text-green-700 border-green-200",
    fair: "bg-blue-100 text-blue-700 border-blue-200",
    poor: "bg-gray-100 text-gray-700 border-gray-200",
  };
  
  return (
    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border", colors[rating as keyof typeof colors] || colors.poor)}>
      {rating}
    </span>
  );
}

function LocationDetail({ location, open, onOpenChange }: { location: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { data: profile } = useMyProfile();
  const { data: favorites } = useFavoriteLocations();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const [showPremium, setShowPremium] = useState(false);
  const { data: posts, isLoading: postsLoading } = useQuery<PostWithUser[]>({
    queryKey: [location ? `/api/locations/${location.id}/posts` : null],
    enabled: !!location,
  });

  if (!location) return null;

  const isPremium = profile?.isPremium;
  const daysToShow = isPremium ? 14 : 3;
  const today = new Date();
  const isFav = favorites?.some(f => f.id === location.id);

  return (
    <>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          <div className="h-48 relative w-full shrink-0">
             <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
             <img 
               src="https://images.unsplash.com/photo-1526346698789-22fd84314424?w=800&q=80" 
               alt="Surf Spot" 
               className="w-full h-full object-cover"
             />
             <div className="absolute top-4 right-4 z-20">
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className={cn("h-10 w-10 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40", isFav && "text-yellow-400")}
                 onClick={(e) => {
                   e.stopPropagation();
                   toggleFavorite(location.id);
                 }}
               >
                 <Star className={cn("h-5 w-5", isFav && "fill-current")} />
               </Button>
             </div>
             <div className="absolute bottom-4 left-6 z-20">
               <h2 className="text-3xl font-display font-bold text-foreground">{location.name}</h2>
               <p className="text-muted-foreground flex items-center text-sm">
                 <MapPin className="w-4 h-4 mr-1" />
                 {location.latitude}, {location.longitude}
               </p>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div>
              <h3 className="font-bold text-lg mb-2 text-foreground">Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {location.description || "A classic reef break suitable for intermediate to advanced surfers. Best on a SW swell and NE wind."}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-foreground">Forecast</h3>
                {!isPremium && (
                  <button onClick={() => setShowPremium(true)} className="text-xs text-primary font-medium flex items-center hover:underline">
                    Unlock 14 Days <Lock className="w-3 h-3 ml-1" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = addDays(today, i);
                  const isLocked = i >= daysToShow;
                  const report = location.reports?.[i] || location.reports?.[0];

                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border",
                        isLocked ? "bg-muted/50 border-transparent opacity-60" : "bg-card border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 text-center">
                           <div className="text-[10px] text-muted-foreground uppercase font-bold">{format(date, 'EEE')}</div>
                           <div className="font-bold text-sm">{format(date, 'd')}</div>
                        </div>
                        {isLocked ? (
                          <div className="flex items-center text-muted-foreground text-sm">
                            <Lock className="w-4 h-4 mr-2" />
                            Premium Only
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <Badge rating={report?.rating || 'fair'} />
                            <div className="text-sm font-bold">
                              {report?.waveHeightMin}-{report?.waveHeightMax}ft
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!isLocked && (
                        <div className="text-right">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Wind className="w-3 h-3 mr-1" />
                            {report?.windSpeed}kts
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                  <Camera className="h-5 w-5 text-primary" />
                  User Photos
                </h3>
                <Button size="sm" variant="ghost" className="text-xs text-primary h-8">
                  Share Photo
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-8">
                {posts?.map((post) => (
                  <Card key={post.id} className="group relative aspect-square overflow-hidden border-none shadow-md">
                    <img 
                      src={post.imageUrl} 
                      alt="Surf session" 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2">
                        <Link href={`/profile/${post.user.userId}`}>
                          <Button size="sm" className="w-full h-8 text-[10px] bg-white/20 backdrop-blur-md border-white/10 text-white hover:bg-white/40">
                            <ExternalLink className="mr-1 h-3 w-3" />
                            User Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
                {!posts?.length && !postsLoading && (
                  <div className="col-span-2 py-8 text-center bg-secondary/30 rounded-xl border border-dashed">
                    <p className="text-xs text-muted-foreground italic">Be the first to share a photo from this spot!</p>
                  </div>
                )}
                {postsLoading && (
                  <>
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="aspect-square rounded-xl" />
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportsSkeleton() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex justify-between px-2">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-10 w-10 rounded-full" />)}
        </div>
        <div className="space-y-4 mt-8">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-[20px]" />
          ))}
        </div>
      </div>
    </Layout>
  );
}
