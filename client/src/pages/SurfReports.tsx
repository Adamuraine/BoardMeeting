import { useLocations, useFavoriteLocations, useToggleFavorite } from "@/hooks/use-locations";
import { Layout } from "@/components/Layout";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { MapPin, Wind, TrendingUp, Lock, Calendar, Camera, ExternalLink, Search, Plus, Star, Waves, Compass, Thermometer, X, ChevronDown, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { PremiumModal } from "@/components/PremiumModal";
import { useMyProfile } from "@/hooks/use-profiles";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PostWithUser } from "@shared/schema";

// Worldwide surf spots database
const WORLDWIDE_SPOTS = [
  // California
  { name: "Pipeline", region: "Oahu, Hawaii", lat: 21.6650, lng: -158.0539, country: "USA" },
  { name: "Mavericks", region: "Half Moon Bay, CA", lat: 37.4950, lng: -122.4960, country: "USA" },
  { name: "Rincon", region: "Santa Barbara, CA", lat: 34.3736, lng: -119.4765, country: "USA" },
  { name: "Steamer Lane", region: "Santa Cruz, CA", lat: 36.9514, lng: -122.0264, country: "USA" },
  { name: "Huntington Pier", region: "Huntington Beach, CA", lat: 33.6556, lng: -117.9993, country: "USA" },
  // Australia
  { name: "Snapper Rocks", region: "Gold Coast", lat: -28.1658, lng: 153.5500, country: "Australia" },
  { name: "Bells Beach", region: "Victoria", lat: -38.3686, lng: 144.2811, country: "Australia" },
  { name: "Margaret River", region: "Western Australia", lat: -33.9556, lng: 114.9931, country: "Australia" },
  // Indonesia
  { name: "Uluwatu", region: "Bali", lat: -8.8291, lng: 115.0849, country: "Indonesia" },
  { name: "Padang Padang", region: "Bali", lat: -8.8150, lng: 115.1019, country: "Indonesia" },
  { name: "G-Land", region: "Java", lat: -8.4214, lng: 114.3542, country: "Indonesia" },
  // Portugal
  { name: "Nazare", region: "Leiria", lat: 39.6017, lng: -9.0714, country: "Portugal" },
  { name: "Peniche", region: "Leiria", lat: 39.3558, lng: -9.3808, country: "Portugal" },
  { name: "Ericeira", region: "Lisbon", lat: 38.9631, lng: -9.4194, country: "Portugal" },
  // France
  { name: "Hossegor", region: "Landes", lat: 43.6667, lng: -1.4000, country: "France" },
  { name: "Lacanau", region: "Gironde", lat: 45.0000, lng: -1.2000, country: "France" },
  // South Africa
  { name: "Jeffreys Bay", region: "Eastern Cape", lat: -34.0500, lng: 24.9333, country: "South Africa" },
  // Fiji
  { name: "Cloudbreak", region: "Tavarua", lat: -17.8667, lng: 177.1833, country: "Fiji" },
  // Tahiti
  { name: "Teahupoo", region: "Tahiti", lat: -17.8500, lng: -149.2667, country: "French Polynesia" },
  // Costa Rica
  { name: "Playa Hermosa", region: "Puntarenas", lat: 9.5556, lng: -84.5806, country: "Costa Rica" },
  { name: "Witch's Rock", region: "Guanacaste", lat: 10.9167, lng: -85.7833, country: "Costa Rica" },
  // Mexico
  { name: "Puerto Escondido", region: "Oaxaca", lat: 15.8611, lng: -97.0667, country: "Mexico" },
  // Morocco
  { name: "Taghazout", region: "Agadir", lat: 30.5456, lng: -9.7089, country: "Morocco" },
  // Japan
  { name: "Shonan", region: "Kanagawa", lat: 35.3167, lng: 139.4833, country: "Japan" },
  // Brazil
  { name: "Florianopolis", region: "Santa Catarina", lat: -27.5954, lng: -48.5480, country: "Brazil" },
];

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

// Fetch live surf data from Open-Meteo Marine API
async function fetchSurfData(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&daily=wave_height_max,wave_period_max,wave_direction_dominant&timezone=auto&forecast_days=7`
    );
    const data = await response.json();
    
    if (!data.daily) return null;
    
    return data.daily.time.map((date: string, i: number) => {
      const waveHeightM = data.daily.wave_height_max[i] || 0;
      const waveHeightFt = Math.round(waveHeightM * 3.28084);
      const period = data.daily.wave_period_max[i] || 0;
      const direction = data.daily.wave_direction_dominant[i] || 0;
      
      // Calculate rating based on wave height and period
      let rating = 'poor';
      if (waveHeightFt >= 6 && period >= 12) rating = 'epic';
      else if (waveHeightFt >= 4 && period >= 10) rating = 'good';
      else if (waveHeightFt >= 2 && period >= 8) rating = 'fair';
      
      // Convert direction degrees to compass
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const windDirection = directions[Math.round(direction / 45) % 8];
      
      return {
        date,
        waveHeightMin: Math.max(1, waveHeightFt - 1),
        waveHeightMax: waveHeightFt,
        rating,
        windDirection,
        period,
      };
    });
  } catch (error) {
    return null;
  }
}

function SpotCard({ spot, onRemove, allSpots }: { 
  spot: typeof WORLDWIDE_SPOTS[0]; 
  onRemove: () => void;
  allSpots: typeof WORLDWIDE_SPOTS;
}) {
  const [selectedSpot, setSelectedSpot] = useState(spot);
  const [showSpotSelector, setShowSpotSelector] = useState(false);
  const today = new Date();
  
  const { data: reports, isLoading } = useQuery({
    queryKey: ['surf-data', selectedSpot.lat, selectedSpot.lng],
    queryFn: () => fetchSurfData(selectedSpot.lat, selectedSpot.lng),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
  
  const todayReport = reports?.[0];
  const nextDays = reports?.slice(1, 5) || [];
  
  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-400 to-slate-500 animate-pulse">
          <Skeleton className="h-6 w-32 bg-white/20 mb-2" />
          <Skeleton className="h-4 w-24 bg-white/20 mb-4" />
          <Skeleton className="h-10 w-20 bg-white/20" />
        </div>
        <div className="bg-card border-x border-b border-border/50 rounded-b-2xl p-3">
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="flex-1 h-12" />)}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer group relative">
      {/* Remove button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        data-testid={`button-remove-${spot.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      
      {/* Spot selector tab */}
      <Popover open={showSpotSelector} onOpenChange={setShowSpotSelector}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 left-2 z-10 h-7 px-2 rounded-full bg-black/30 hover:bg-black/50 text-white text-xs gap-1"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-change-spot-${spot.name}`}
          >
            <MapPin className="h-3 w-3" />
            Change
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <ScrollArea className="h-[200px]">
            <div className="p-2">
              {allSpots.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    setSelectedSpot(s);
                    setShowSpotSelector(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors",
                    selectedSpot.name === s.name 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-secondary/80"
                  )}
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.region}</p>
                  </div>
                  {selectedSpot.name === s.name && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      {/* Main spot card with gradient based on conditions */}
      <div className={cn(
        "p-4 pt-12 relative",
        todayReport?.rating === 'epic' ? "bg-gradient-to-r from-violet-500 to-purple-600" :
        todayReport?.rating === 'good' ? "bg-gradient-to-r from-emerald-500 to-teal-600" :
        todayReport?.rating === 'fair' ? "bg-gradient-to-r from-cyan-500 to-sky-600" :
        "bg-gradient-to-r from-slate-400 to-slate-500"
      )}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-white drop-shadow-sm">
              {selectedSpot.name}
            </h3>
            <p className="text-white/80 text-xs">{selectedSpot.region}, {selectedSpot.country}</p>
          </div>
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
        {nextDays.map((report: { waveHeightMin: number; waveHeightMax: number; rating: string }, idx: number) => (
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
}

export default function SurfReports() {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showAddSpots, setShowAddSpots] = useState(false);
  const [addedSpots, setAddedSpots] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const today = new Date();
  
  // Group worldwide spots by country
  const spotsByCountry = WORLDWIDE_SPOTS.reduce((acc, spot) => {
    if (!acc[spot.country]) acc[spot.country] = [];
    acc[spot.country].push(spot);
    return acc;
  }, {} as Record<string, typeof WORLDWIDE_SPOTS>);
  
  const filteredSpots = searchQuery 
    ? WORLDWIDE_SPOTS.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : WORLDWIDE_SPOTS;
    
  // Get the actual spot objects for added spots
  const userSpots = addedSpots.map(name => WORLDWIDE_SPOTS.find(s => s.name === name)).filter(Boolean) as typeof WORLDWIDE_SPOTS;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 via-cyan-50/30 to-background dark:from-slate-900 dark:via-slate-900 dark:to-background">
        <header className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Waves className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              <h1 className="text-xl font-bold text-foreground">Surf Forecast</h1>
            </div>
            <Popover open={showAddSpots} onOpenChange={setShowAddSpots}>
              <PopoverTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="gap-1.5 rounded-full"
                  data-testid="button-add-spots"
                >
                  <Globe className="h-4 w-4" />
                  Add Spots
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                  <input
                    type="text"
                    placeholder="Search worldwide spots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-secondary/50 border-0 focus:ring-2 focus:ring-primary/20 outline-none"
                    data-testid="input-search-spots"
                  />
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="p-2">
                    {Object.entries(spotsByCountry).map(([country, spots]) => {
                      const countrySpots = spots.filter(s => 
                        !searchQuery || filteredSpots.includes(s)
                      );
                      if (countrySpots.length === 0) return null;
                      
                      return (
                        <div key={country} className="mb-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
                            {country}
                          </p>
                          {countrySpots.map((spot) => {
                            const isAdded = addedSpots.includes(spot.name);
                            return (
                              <button
                                key={spot.name}
                                onClick={() => {
                                  if (isAdded) {
                                    setAddedSpots(prev => prev.filter(s => s !== spot.name));
                                  } else {
                                    setAddedSpots(prev => [...prev, spot.name]);
                                  }
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors",
                                  isAdded 
                                    ? "bg-primary/10 text-primary" 
                                    : "hover:bg-secondary/80"
                                )}
                                data-testid={`button-spot-${spot.name.toLowerCase().replace(/\s/g, '-')}`}
                              >
                                <div>
                                  <p className="font-medium">{spot.name}</p>
                                  <p className="text-xs text-muted-foreground">{spot.region}</p>
                                </div>
                                {isAdded ? (
                                  <Check className="h-4 w-4 text-primary" />
                                ) : (
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">
            {userSpots.length > 0 ? `Tracking ${userSpots.length} spot${userSpots.length > 1 ? 's' : ''}` : 'Add spots to see live conditions'}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
          {userSpots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-4">
                <Waves className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No spots added yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Add your favorite surf spots to track live wave conditions from around the world
              </p>
              <Button 
                onClick={() => setShowAddSpots(true)}
                className="gap-2"
                data-testid="button-add-first-spot"
              >
                <Plus className="h-4 w-4" />
                Add Your First Spot
              </Button>
            </div>
          ) : (
            userSpots.map((spot) => (
              <SpotCard 
                key={spot.name}
                spot={spot}
                allSpots={WORLDWIDE_SPOTS}
                onRemove={() => setAddedSpots(prev => prev.filter(s => s !== spot.name))}
              />
            ))
          )}
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
