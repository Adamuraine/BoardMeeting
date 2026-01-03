import { useLocations } from "@/hooks/use-locations";
import { Layout } from "@/components/Layout";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { MapPin, Wind, TrendingUp, Lock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { PremiumModal } from "@/components/PremiumModal";
import { useMyProfile } from "@/hooks/use-profiles";

export default function SurfReports() {
  const { data: locations, isLoading } = useLocations();
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  if (isLoading) return <ReportsSkeleton />;

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Surf Reports</h1>
          <p className="text-muted-foreground">Conditions for the next 3 days</p>
        </header>

        <div className="grid gap-4">
          {locations?.map((location) => (
            <div 
              key={location.id} 
              onClick={() => setSelectedLocation(location)}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            >
              {/* Background gradient based on rating */}
              <div className={cn(
                "absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20",
                location.reports?.[0]?.rating === 'epic' ? "bg-purple-500" :
                location.reports?.[0]?.rating === 'good' ? "bg-green-500" :
                location.reports?.[0]?.rating === 'fair' ? "bg-blue-500" : "bg-gray-500"
              )} />

              <div className="relative p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold font-display">{location.name}</h3>
                    <div className="flex items-center text-muted-foreground text-xs mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {location.region}
                    </div>
                  </div>
                  <Badge rating={location.reports?.[0]?.rating || 'poor'} />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">Wave</span>
                    <span className="text-lg font-bold font-display">
                      {location.reports?.[0]?.waveHeightMin}-{location.reports?.[0]?.waveHeightMax}ft
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">Wind</span>
                    <div className="flex items-center">
                      <Wind className="w-4 h-4 mr-1 text-primary" />
                      <span className="font-semibold">{location.reports?.[0]?.windSpeed}kts</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">Tide</span>
                    <span className="font-semibold">Rising</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
  const [showPremium, setShowPremium] = useState(false);

  if (!location) return null;

  const isPremium = profile?.isPremium;
  const daysToShow = isPremium ? 7 : 3;
  const today = new Date();

  return (
    <>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          {/* Header Image */}
          <div className="h-48 relative w-full shrink-0">
             <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
             {/* unsplash: surf break ocean waves */}
             <img 
               src="https://images.unsplash.com/photo-1526346698789-22fd84314424?w=800&q=80" 
               alt="Surf Spot" 
               className="w-full h-full object-cover"
             />
             <div className="absolute bottom-4 left-6 z-20">
               <h2 className="text-3xl font-display font-bold text-foreground">{location.name}</h2>
               <p className="text-muted-foreground flex items-center">
                 <MapPin className="w-4 h-4 mr-1" />
                 {location.latitude}, {location.longitude}
               </p>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-2">Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {location.description || "A classic reef break suitable for intermediate to advanced surfers. Best on a SW swell and NE wind."}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Forecast</h3>
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
                  const report = location.reports?.[0]; // Mocking same report for demo

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
                           <div className="text-xs text-muted-foreground uppercase">{format(date, 'EEE')}</div>
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
                            <div className="text-sm font-medium">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportsSkeleton() {
  return (
    <Layout>
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-4 mt-8">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </Layout>
  );
}
