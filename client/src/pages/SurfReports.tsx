import { useLocations, useFavoriteLocations, useToggleFavorite } from "@/hooks/use-locations";
import { Layout } from "@/components/Layout";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { MapPin, Wind, TrendingUp, Lock, Calendar, Camera, ExternalLink, Search, Plus, Star, Waves, Compass, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { PremiumModal } from "@/components/PremiumModal";
import { useMyProfile } from "@/hooks/use-profiles";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import type { PostWithUser } from "@shared/schema";

function WaveIcon({ height, rating }: { height: number; rating: string }) {
  const color = rating === 'epic' ? '#8b5cf6' : rating === 'good' ? '#10b981' : rating === 'fair' ? '#06b6d4' : '#94a3b8';
  const scale = Math.min(1, Math.max(0.4, height / 8));
  
  return (
    <svg viewBox="0 0 40 30" className="w-full h-8" style={{ transform: `scaleY(${scale})` }}>
      <path
        d="M0 25 Q10 15, 20 20 T40 15 L40 30 L0 30 Z"
        fill={color}
        opacity="0.8"
      />
      <path
        d="M0 22 Q8 12, 18 18 T38 12"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

export default function SurfReports() {
  const { data: allLocations, isLoading: loadingAll } = useLocations();
  const { data: favorites, isLoading: loadingFavs } = useFavoriteLocations();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  if (loadingAll || loadingFavs) return <ReportsSkeleton />;

  const today = new Date();

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 via-cyan-50/30 to-background dark:from-slate-900 dark:via-slate-900 dark:to-background">
        <header className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Waves className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              <h1 className="text-xl font-bold text-foreground">Surf Forecast</h1>
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {format(today, 'EEEE, MMM d')}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Live conditions for San Diego County</p>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
          {allLocations?.map((location) => {
            const isFav = favorites?.some(f => f.id === location.id);
            const todayReport = location.reports?.[0];
            const nextDays = location.reports?.slice(1, 5) || [];
            
            return (
              <div 
                key={location.id}
                onClick={() => setSelectedLocation(location)}
                className="rounded-2xl overflow-hidden cursor-pointer group"
              >
                {/* Main spot card with gradient based on conditions */}
                <div className={cn(
                  "p-4 relative",
                  todayReport?.rating === 'epic' ? "bg-gradient-to-r from-violet-500 to-purple-600" :
                  todayReport?.rating === 'good' ? "bg-gradient-to-r from-emerald-500 to-teal-600" :
                  todayReport?.rating === 'fair' ? "bg-gradient-to-r from-cyan-500 to-sky-600" :
                  "bg-gradient-to-r from-slate-400 to-slate-500"
                )}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white drop-shadow-sm">
                        {location.name}
                      </h3>
                      <p className="text-white/80 text-xs">{location.region}</p>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className={cn("h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white", isFav && "text-yellow-300")}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(location.id);
                      }}
                    >
                      <Star className={cn("h-4 w-4", isFav && "fill-current")} />
                    </Button>
                  </div>
                  
                  {/* Today's conditions - big and bold */}
                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white drop-shadow-md">
                        {todayReport?.waveHeightMin || 0}-{todayReport?.waveHeightMax || 0}
                      </span>
                      <span className="text-lg font-bold text-white/90">ft</span>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                        "bg-white/25 text-white backdrop-blur-sm"
                      )}>
                        {todayReport?.rating || 'fair'}
                      </span>
                      <p className="text-white/70 text-[10px] mt-1 flex items-center justify-end gap-1">
                        <Compass className="h-3 w-3" />
                        {todayReport?.windDirection || 'SW'} swell
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 4-day mini forecast strip */}
                <div className="bg-card border-x border-b border-border/50 rounded-b-2xl p-3 flex justify-between gap-2">
                  {nextDays.map((report, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">
                        {format(addDays(today, idx + 1), 'EEE')}
                      </p>
                      <WaveIcon height={report.waveHeightMax || 2} rating={report.rating || 'fair'} />
                      <p className="text-xs font-bold text-foreground mt-1">
                        {report.waveHeightMin}-{report.waveHeightMax}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
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
