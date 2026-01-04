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

// Worldwide surf spots database with hierarchical location data
type SurfSpot = {
  name: string;
  continent: string;
  country: string;
  state: string;
  area: string;
  lat: number;
  lng: number;
};

const WORLDWIDE_SPOTS: SurfSpot[] = [
  // North America - USA - California
  { name: "Mavericks", continent: "North America", country: "USA", state: "California", area: "Half Moon Bay", lat: 37.4950, lng: -122.4960 },
  { name: "Steamer Lane", continent: "North America", country: "USA", state: "California", area: "Santa Cruz", lat: 36.9514, lng: -122.0264 },
  { name: "Rincon", continent: "North America", country: "USA", state: "California", area: "Santa Barbara County", lat: 34.3736, lng: -119.4765 },
  { name: "Huntington Pier", continent: "North America", country: "USA", state: "California", area: "Huntington Beach", lat: 33.6556, lng: -117.9993 },
  { name: "Trestles", continent: "North America", country: "USA", state: "California", area: "San Clemente", lat: 33.3825, lng: -117.5889 },
  { name: "Oceanside Pier", continent: "North America", country: "USA", state: "California", area: "Oceanside", lat: 33.1936, lng: -117.3831 },
  { name: "Black's Beach", continent: "North America", country: "USA", state: "California", area: "La Jolla", lat: 32.8894, lng: -117.2528 },
  { name: "Swami's", continent: "North America", country: "USA", state: "California", area: "Encinitas", lat: 33.0347, lng: -117.2931 },
  // North America - USA - Hawaii
  { name: "Pipeline", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6650, lng: -158.0539 },
  { name: "Sunset Beach", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6781, lng: -158.0417 },
  { name: "Waimea Bay", continent: "North America", country: "USA", state: "Hawaii", area: "North Shore, Oahu", lat: 21.6417, lng: -158.0656 },
  { name: "Jaws (Peahi)", continent: "North America", country: "USA", state: "Hawaii", area: "Maui", lat: 20.9425, lng: -156.2997 },
  // North America - USA - East Coast
  { name: "Cape Hatteras", continent: "North America", country: "USA", state: "North Carolina", area: "Outer Banks", lat: 35.2236, lng: -75.5347 },
  { name: "Sebastian Inlet", continent: "North America", country: "USA", state: "Florida", area: "Melbourne Beach", lat: 27.8583, lng: -80.4481 },
  { name: "Montauk", continent: "North America", country: "USA", state: "New York", area: "Long Island", lat: 41.0361, lng: -71.9431 },
  // North America - Mexico
  { name: "Puerto Escondido", continent: "North America", country: "Mexico", state: "Oaxaca", area: "Playa Zicatela", lat: 15.8611, lng: -97.0667 },
  { name: "Todos Santos", continent: "North America", country: "Mexico", state: "Baja California", area: "Ensenada", lat: 31.8167, lng: -116.8000 },
  { name: "Sayulita", continent: "North America", country: "Mexico", state: "Nayarit", area: "Riviera Nayarit", lat: 20.8692, lng: -105.4361 },
  // Central America - Costa Rica
  { name: "Playa Hermosa", continent: "Central America", country: "Costa Rica", state: "Puntarenas", area: "Jaco", lat: 9.5556, lng: -84.5806 },
  { name: "Witch's Rock", continent: "Central America", country: "Costa Rica", state: "Guanacaste", area: "Santa Rosa", lat: 10.9167, lng: -85.7833 },
  { name: "Pavones", continent: "Central America", country: "Costa Rica", state: "Puntarenas", area: "Golfo Dulce", lat: 8.3833, lng: -83.1500 },
  // Central America - Nicaragua
  { name: "Popoyo", continent: "Central America", country: "Nicaragua", state: "Rivas", area: "Tola", lat: 11.4833, lng: -85.8833 },
  // Central America - Panama
  { name: "Santa Catalina", continent: "Central America", country: "Panama", state: "Veraguas", area: "Sona", lat: 7.6333, lng: -81.2500 },
  // South America - Brazil
  { name: "Florianopolis", continent: "South America", country: "Brazil", state: "Santa Catarina", area: "Joaquina Beach", lat: -27.5954, lng: -48.5480 },
  { name: "Itacare", continent: "South America", country: "Brazil", state: "Bahia", area: "Costa do Cacau", lat: -14.2833, lng: -38.9833 },
  // South America - Peru
  { name: "Chicama", continent: "South America", country: "Peru", state: "La Libertad", area: "Puerto Malabrigo", lat: -7.7000, lng: -79.4500 },
  { name: "Punta Rocas", continent: "South America", country: "Peru", state: "Lima", area: "Punta Negra", lat: -12.3667, lng: -76.8167 },
  // South America - Chile
  { name: "Punta de Lobos", continent: "South America", country: "Chile", state: "O'Higgins", area: "Pichilemu", lat: -34.4333, lng: -72.0500 },
  // Europe - Portugal
  { name: "Nazare", continent: "Europe", country: "Portugal", state: "Leiria", area: "Praia do Norte", lat: 39.6017, lng: -9.0714 },
  { name: "Peniche", continent: "Europe", country: "Portugal", state: "Leiria", area: "Supertubos", lat: 39.3558, lng: -9.3808 },
  { name: "Ericeira", continent: "Europe", country: "Portugal", state: "Lisbon", area: "Ribeira d'Ilhas", lat: 38.9631, lng: -9.4194 },
  // Europe - France
  { name: "Hossegor", continent: "Europe", country: "France", state: "Landes", area: "La Graviere", lat: 43.6667, lng: -1.4000 },
  { name: "Lacanau", continent: "Europe", country: "France", state: "Gironde", area: "Lacanau-Ocean", lat: 45.0000, lng: -1.2000 },
  { name: "Biarritz", continent: "Europe", country: "France", state: "Pyrenees-Atlantiques", area: "Grande Plage", lat: 43.4833, lng: -1.5583 },
  // Europe - Spain
  { name: "Mundaka", continent: "Europe", country: "Spain", state: "Basque Country", area: "Urdaibai", lat: 43.4078, lng: -2.6981 },
  { name: "Zarautz", continent: "Europe", country: "Spain", state: "Basque Country", area: "Gipuzkoa", lat: 43.2833, lng: -2.1667 },
  // Europe - UK & Ireland
  { name: "Bundoran", continent: "Europe", country: "Ireland", state: "Donegal", area: "The Peak", lat: 54.4833, lng: -8.2833 },
  { name: "Newquay", continent: "Europe", country: "UK", state: "Cornwall", area: "Fistral Beach", lat: 50.4167, lng: -5.1000 },
  // Africa - Morocco
  { name: "Taghazout", continent: "Africa", country: "Morocco", state: "Agadir-Ida-Ou-Tanane", area: "Anchor Point", lat: 30.5456, lng: -9.7089 },
  { name: "Imsouane", continent: "Africa", country: "Morocco", state: "Agadir-Ida-Ou-Tanane", area: "Cathedral", lat: 30.8500, lng: -9.8167 },
  // Africa - South Africa
  { name: "Jeffreys Bay", continent: "Africa", country: "South Africa", state: "Eastern Cape", area: "Supertubes", lat: -34.0500, lng: 24.9333 },
  { name: "Durban", continent: "Africa", country: "South Africa", state: "KwaZulu-Natal", area: "North Beach", lat: -29.8500, lng: 31.0333 },
  // Asia - Indonesia
  { name: "Uluwatu", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.8291, lng: 115.0849 },
  { name: "Padang Padang", continent: "Asia", country: "Indonesia", state: "Bali", area: "Bukit Peninsula", lat: -8.8150, lng: 115.1019 },
  { name: "G-Land", continent: "Asia", country: "Indonesia", state: "Java", area: "Plengkung", lat: -8.4214, lng: 114.3542 },
  { name: "Desert Point", continent: "Asia", country: "Indonesia", state: "Lombok", area: "Bangko-Bangko", lat: -8.7500, lng: 115.8500 },
  // Asia - Japan
  { name: "Shonan", continent: "Asia", country: "Japan", state: "Kanagawa", area: "Kamakura", lat: 35.3167, lng: 139.4833 },
  { name: "Chiba", continent: "Asia", country: "Japan", state: "Chiba", area: "Ichinomiya", lat: 35.3833, lng: 140.3833 },
  // Asia - Philippines
  { name: "Siargao", continent: "Asia", country: "Philippines", state: "Surigao del Norte", area: "Cloud 9", lat: 9.8500, lng: 126.1500 },
  // Asia - Maldives
  { name: "Pasta Point", continent: "Asia", country: "Maldives", state: "North Male Atoll", area: "Thulusdhoo", lat: 4.3833, lng: 73.6333 },
  // Oceania - Australia
  { name: "Snapper Rocks", continent: "Oceania", country: "Australia", state: "Queensland", area: "Gold Coast", lat: -28.1658, lng: 153.5500 },
  { name: "Bells Beach", continent: "Oceania", country: "Australia", state: "Victoria", area: "Torquay", lat: -38.3686, lng: 144.2811 },
  { name: "Margaret River", continent: "Oceania", country: "Australia", state: "Western Australia", area: "Main Break", lat: -33.9556, lng: 114.9931 },
  { name: "Noosa Heads", continent: "Oceania", country: "Australia", state: "Queensland", area: "Sunshine Coast", lat: -26.3833, lng: 153.0833 },
  // Oceania - Fiji
  { name: "Cloudbreak", continent: "Oceania", country: "Fiji", state: "Western Division", area: "Tavarua", lat: -17.8667, lng: 177.1833 },
  { name: "Restaurants", continent: "Oceania", country: "Fiji", state: "Western Division", area: "Tavarua", lat: -17.8500, lng: 177.2000 },
  // Oceania - French Polynesia
  { name: "Teahupoo", continent: "Oceania", country: "French Polynesia", state: "Tahiti", area: "Teahupoo Village", lat: -17.8500, lng: -149.2667 },
  // Oceania - New Zealand
  { name: "Raglan", continent: "Oceania", country: "New Zealand", state: "Waikato", area: "Manu Bay", lat: -37.8000, lng: 174.8667 },
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

function SpotCard({ spot, onRemove, onAddSpot, allSpots }: { 
  spot: SurfSpot; 
  onRemove: () => void;
  onAddSpot: (spotName: string) => void;
  allSpots: SurfSpot[];
}) {
  const [selectedSpot, setSelectedSpot] = useState<SurfSpot>(spot);
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
      
      {/* Nearby spots selector */}
      <Popover open={showSpotSelector} onOpenChange={setShowSpotSelector}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 left-2 z-10 h-7 px-2 rounded-full bg-black/30 hover:bg-black/50 text-white text-xs gap-1"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-nearby-spots-${spot.name}`}
          >
            <Search className="h-3 w-3" />
            Nearby Spots
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <p className="text-xs font-medium text-muted-foreground">Spots near {selectedSpot.area}</p>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-2">
              {allSpots
                .filter(s => s.state === selectedSpot.state && s.name !== selectedSpot.name)
                .map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    onAddSpot(s.name);
                    setShowSpotSelector(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm hover:bg-secondary/80 transition-colors"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.area}</p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {allSpots.filter(s => s.state === selectedSpot.state && s.name !== selectedSpot.name).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No other spots in this area</p>
              )}
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
            <p className="text-white/80 text-xs">{selectedSpot.area}, {selectedSpot.state}, {selectedSpot.country}</p>
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

// Hierarchical spot picker component - 5 levels like Surfline
function SpotPicker({ 
  addedSpots, 
  onToggleSpot,
  onClose 
}: { 
  addedSpots: string[]; 
  onToggleSpot: (spotName: string) => void;
  onClose: () => void;
}) {
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get unique continents
  const continents = Array.from(new Set(WORLDWIDE_SPOTS.map(s => s.continent)));
  
  // Get countries for selected continent
  const countries = selectedContinent 
    ? Array.from(new Set(WORLDWIDE_SPOTS.filter(s => s.continent === selectedContinent).map(s => s.country)))
    : [];
    
  // Get states for selected country
  const states = selectedCountry
    ? Array.from(new Set(WORLDWIDE_SPOTS.filter(s => s.country === selectedCountry).map(s => s.state)))
    : [];
  
  // Get areas for selected state
  const areas = selectedState
    ? Array.from(new Set(WORLDWIDE_SPOTS.filter(s => s.state === selectedState).map(s => s.area)))
    : [];
    
  // Get spots for selected area
  const spots = selectedArea
    ? WORLDWIDE_SPOTS.filter(s => s.area === selectedArea)
    : [];
    
  // Search results
  const searchResults = searchQuery.length >= 2
    ? WORLDWIDE_SPOTS.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  const goBack = () => {
    if (selectedArea) {
      setSelectedArea(null);
    } else if (selectedState) {
      setSelectedState(null);
    } else if (selectedCountry) {
      setSelectedCountry(null);
    } else if (selectedContinent) {
      setSelectedContinent(null);
    }
  };
  
  const currentLevel = selectedArea ? 'spots' : selectedState ? 'areas' : selectedCountry ? 'states' : selectedContinent ? 'countries' : 'continents';
  
  // Step labels for visual hierarchy
  const stepLabels: Record<string, string> = {
    continents: 'Select Region',
    countries: 'Select Country',
    states: 'Select State/Province',
    areas: 'Select City/Area',
    spots: 'Select Spot'
  };

  return (
    <div className="bg-card">
      {/* Header with step indicator */}
      <div className="bg-primary/5 dark:bg-primary/10 px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground text-sm">Add Surf Spot</h3>
          {selectedContinent && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs gap-1"
              onClick={goBack}
            >
              <ChevronDown className="h-3 w-3 rotate-90" />
              Back
            </Button>
          )}
        </div>
        
        {/* Progress steps */}
        <div className="flex items-center gap-1">
          {['continents', 'countries', 'states', 'areas', 'spots'].map((step, idx) => {
            const stepOrder = ['continents', 'countries', 'states', 'areas', 'spots'];
            const currentIdx = stepOrder.indexOf(currentLevel);
            const isActive = idx === currentIdx;
            const isCompleted = idx < currentIdx;
            return (
              <div 
                key={step}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  isActive ? "bg-primary" : isCompleted ? "bg-primary/60" : "bg-muted"
                )}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{stepLabels[currentLevel]}</p>
      </div>
      
      {/* Search bar */}
      <div className="p-3 border-b bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search all spots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none"
            data-testid="input-search-spots"
          />
        </div>
      </div>
      
      {/* Breadcrumb */}
      {selectedContinent && !searchQuery && (
        <div className="px-4 py-2 bg-muted/30 border-b">
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[selectedContinent, selectedCountry, selectedState, selectedArea].filter(Boolean).join(' › ')}
          </p>
        </div>
      )}
      
      {searchQuery.length >= 2 ? (
        <ScrollArea className="h-[280px]">
          <div className="p-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No spots found</p>
            ) : (
              searchResults.map((spot) => {
                const isAdded = addedSpots.includes(spot.name);
                return (
                  <button
                    key={spot.name}
                    onClick={() => {
                      onToggleSpot(spot.name);
                      if (!isAdded) onClose();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors border mb-1",
                      isAdded 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "bg-background border-transparent hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-sm">{spot.name}</p>
                      <p className="text-xs text-muted-foreground">{spot.area}, {spot.state}, {spot.country}</p>
                    </div>
                    {isAdded ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="h-[280px]">
          <div className="p-2">
            {currentLevel === 'continents' && continents.map(continent => (
              <button
                key={continent}
                onClick={() => setSelectedContinent(continent)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="font-semibold text-foreground">{continent}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'countries' && countries.map(country => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="font-semibold text-foreground">{country}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'states' && states.map(state => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="font-semibold text-foreground">{state}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'areas' && areas.map(area => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left bg-background hover:bg-muted/50 border border-transparent hover:border-border transition-colors mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Waves className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="font-semibold text-foreground">{area}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground -rotate-90" />
              </button>
            ))}
            
            {currentLevel === 'spots' && spots.map(spot => {
              const isAdded = addedSpots.includes(spot.name);
              return (
                <button
                  key={spot.name}
                  onClick={() => {
                    onToggleSpot(spot.name);
                    if (!isAdded) onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-left transition-colors border mb-1",
                    isAdded 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-background border-transparent hover:bg-muted/50 hover:border-border"
                  )}
                  data-testid={`button-spot-${spot.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isAdded ? "bg-primary/20" : "bg-sky-100 dark:bg-sky-900/50"
                    )}>
                      <Waves className={cn(
                        "h-4 w-4",
                        isAdded ? "text-primary" : "text-sky-600 dark:text-sky-400"
                      )} />
                    </div>
                    <div>
                      <p className={cn("font-semibold", isAdded && "text-primary")}>{spot.name}</p>
                      <p className="text-xs text-muted-foreground">{spot.area}</p>
                    </div>
                  </div>
                  {isAdded ? <Check className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default function SurfReports() {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showAddSpots, setShowAddSpots] = useState(false);
  const [addedSpots, setAddedSpots] = useState<string[]>([]);

  const today = new Date();
    
  // Get the actual spot objects for added spots
  const userSpots = addedSpots.map(name => WORLDWIDE_SPOTS.find(s => s.name === name)).filter(Boolean) as SurfSpot[];
  
  const toggleSpot = (spotName: string) => {
    if (addedSpots.includes(spotName)) {
      setAddedSpots(prev => prev.filter(s => s !== spotName));
    } else {
      setAddedSpots(prev => [...prev, spotName]);
    }
  };

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
              <PopoverContent className="w-[340px] p-0" align="end">
                <SpotPicker addedSpots={addedSpots} onToggleSpot={toggleSpot} onClose={() => setShowAddSpots(false)} />
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
                onAddSpot={(spotName) => {
                  if (!addedSpots.includes(spotName)) {
                    setAddedSpots(prev => [...prev, spotName]);
                  }
                }}
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
