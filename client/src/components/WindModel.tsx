import { useState, useEffect, useRef, useMemo } from "react";
import surfTribeLogo from "@assets/IMG_2616_1768196403100.jpeg";
import { useMyProfile } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, Lock, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { format, addHours, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";

async function geocodeLocation(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.latitude,
        lng: result.longitude,
        name: `${result.name}, ${result.country || ''}`.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function WindSpeedScale() {
  const speeds = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  
  const getWindColorHex = (speed: number): string => {
    if (speed < 5) return "#93c5fd";
    if (speed < 10) return "#6ee7b7";
    if (speed < 15) return "#86efac";
    if (speed < 20) return "#fde047";
    if (speed < 25) return "#fdba74";
    if (speed < 30) return "#fb923c";
    if (speed < 40) return "#f87171";
    return "#ef4444";
  };
  
  return (
    <div className="flex items-center gap-0 h-6 text-[10px] font-medium text-white">
      <span className="pr-1 opacity-80">mph</span>
      {speeds.map((speed) => (
        <div key={speed} className="flex items-center">
          <div 
            className="w-6 h-4 flex items-center justify-center"
            style={{ backgroundColor: getWindColorHex(speed) }}
          >
            <span className="text-white/90 drop-shadow-sm">{speed}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WindyEmbed({ 
  lat, 
  lng, 
  zoom = 10,
  timestamp
}: { 
  lat: number; 
  lng: number;
  zoom?: number;
  timestamp: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  
  const embedUrl = useMemo(() => {
    const calendarParam = timestamp ? timestamp : 'now';
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=mph&zoom=${zoom}&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lng}&detailLat=${lat}&detailLon=${lng}&marker=true&message=true&calendar=${calendarParam}&pressure=true&type=map&menu=`;
  }, [lat, lng, zoom, timestamp]);
  
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [lat, lng, timestamp]);
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      <iframe
        key={key}
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full border-0"
        style={{ marginBottom: '-10px' }}
        title="Windy Wind Map"
        allow="fullscreen"
        data-testid="windy-embed"
      />
      <div 
        className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500 rounded-lg shadow-md"
      >
        <img 
          src={surfTribeLogo} 
          alt="SurfTribe Logo" 
          className="w-6 h-6 rounded-full object-cover"
        />
        <span className="text-white font-semibold text-sm tracking-wide">SurfTribe</span>
      </div>
    </div>
  );
}

function TimeSlider({
  selectedHour,
  onHourChange,
  selectedDay,
  isPlaying,
  onTogglePlay
}: {
  selectedHour: number;
  onHourChange: (hour: number) => void;
  selectedDay: Date;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  const timeLabels = ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'];
  
  return (
    <div className="bg-slate-800 px-4 py-3 border-t border-white/10">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white/80 hover:text-white"
          onClick={onTogglePlay}
          data-testid="button-play-time"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        <div className="flex-1">
          <Slider
            value={[selectedHour]}
            onValueChange={(v) => onHourChange(v[0])}
            min={0}
            max={23}
            step={1}
            className="w-full"
            data-testid="slider-time"
          />
          <div className="flex justify-between mt-1 text-[10px] text-white/50">
            {timeLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>
        
        <div className="text-white text-sm font-medium min-w-[80px] text-right">
          {format(addHours(startOfDay(selectedDay), selectedHour), 'h:mm a')}
        </div>
      </div>
    </div>
  );
}

function DaySelector({ 
  days,
  selectedDay,
  onSelectDay,
  maxDays,
  isPremium,
  onShowPremium
}: { 
  days: Date[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
  maxDays: number;
  isPremium: boolean;
  onShowPremium: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-white/70"
          onClick={() => onSelectDay(Math.max(0, selectedDay - 1))}
          data-testid="button-day-prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-white text-sm font-medium">
          {isPremium ? "14-Day Forecast" : "3-Day Forecast"}
        </span>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-white/70"
          onClick={() => onSelectDay(Math.min(maxDays - 1, selectedDay + 1))}
          data-testid="button-day-next"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide py-3 px-2 gap-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map((day, i) => {
          const isSelected = i === selectedDay;
          const isLocked = i >= maxDays;
          
          return (
            <button
              key={i}
              onClick={() => {
                if (isLocked) {
                  onShowPremium();
                } else {
                  onSelectDay(i);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[70px]",
                isSelected 
                  ? "bg-teal-600 text-white" 
                  : "bg-white/10 text-white/80 hover:bg-white/20",
                isLocked && "opacity-50"
              )}
              data-testid={`button-day-${i}`}
            >
              {isLocked && <Lock className="h-3 w-3" />}
              <span className="text-xs font-medium">{format(day, 'EEE')}</span>
              <span className="text-lg font-bold">{format(day, 'd')}</span>
              <span className="text-[10px] opacity-70">{format(day, 'MMM')}</span>
            </button>
          );
        })}
      </div>
      
      {!isPremium && (
        <div className="px-4 pb-3">
          <Button 
            onClick={onShowPremium}
            variant="outline"
            className="w-full border-teal-500 text-teal-400 hover:bg-teal-500/20"
            data-testid="button-unlock-forecast"
          >
            Unlock 14-Day Forecast - $5/month
          </Button>
        </div>
      )}
    </div>
  );
}

type WindModelProps = {
  lat?: number;
  lng?: number;
  locationName?: string;
}

export function WindModel({ lat: propLat = 33.05, lng: propLng = -117.39, locationName: initialName = "Oceanside, CA" }: WindModelProps) {
  const { data: profile } = useMyProfile();
  const [showPremium, setShowPremium] = useState(false);
  const [lat, setLat] = useState(propLat);
  const [lng, setLng] = useState(propLng);
  const [locationName, setLocationName] = useState(initialName);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [isPlaying, setIsPlaying] = useState(false);
  
  const isPremium = profile?.isPremium ?? false;
  const maxDays = isPremium ? 14 : 3;
  
  const days = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      result.push(day);
    }
    return result;
  }, []);
  
  const timestamp = useMemo(() => {
    const baseDate = startOfDay(days[selectedDay]);
    const dateWithHour = addHours(baseDate, selectedHour);
    return dateWithHour.getTime();
  }, [days, selectedDay, selectedHour]);
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setSelectedHour(prev => {
        if (prev >= 23) {
          if (selectedDay < maxDays - 1) {
            setSelectedDay(d => d + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        return prev + 3;
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, [isPlaying, selectedDay, maxDays]);
  
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setLat(userLat);
          setLng(userLng);
          
          try {
            const reverseResult = await geocodeLocation(`${userLat.toFixed(2)}, ${userLng.toFixed(2)}`);
            if (reverseResult) {
              setLocationName(reverseResult.name);
            } else {
              setLocationName(`${Math.abs(userLat).toFixed(2)}${userLat >= 0 ? 'N' : 'S'}, ${Math.abs(userLng).toFixed(2)}${userLng >= 0 ? 'W' : 'E'}`);
            }
          } catch {
            setLocationName(`${Math.abs(userLat).toFixed(2)}${userLat >= 0 ? 'N' : 'S'}, ${Math.abs(userLng).toFixed(2)}${userLng >= 0 ? 'W' : 'E'}`);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const result = await geocodeLocation(searchQuery);
    setIsSearching(false);
    
    if (result) {
      setLat(result.lat);
      setLng(result.lng);
      setLocationName(result.name);
      setSearchQuery("");
    }
  };
  
  return (
    <div className="flex flex-col h-full" data-testid="wind-model-container">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      <div className="bg-slate-800 sticky top-0 z-10">
        <WindSpeedScale />
      </div>
      
      <div className="p-3 bg-slate-800 border-b border-white/10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search location..."
              className="pl-10 bg-slate-700 border-white/20 text-white placeholder:text-white/50 h-10"
              data-testid="input-location-search"
            />
          </div>
          <Button 
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-teal-600 hover:bg-teal-700 text-white"
            data-testid="button-search-location"
          >
            {isSearching ? "..." : "Go"}
          </Button>
        </div>
        <div className="mt-2 text-white/80 text-sm flex items-center justify-between">
          <span>{locationName}</span>
          <span className="text-teal-400">{format(addHours(startOfDay(days[selectedDay]), selectedHour), 'EEE, MMM d, h:mm a')}</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-[350px] relative">
        <WindyEmbed 
          lat={lat}
          lng={lng}
          zoom={10}
          timestamp={timestamp}
        />
      </div>
      
      <TimeSlider
        selectedHour={selectedHour}
        onHourChange={setSelectedHour}
        selectedDay={days[selectedDay]}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />
      
      <DaySelector 
        days={days}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        maxDays={maxDays}
        isPremium={isPremium}
        onShowPremium={() => setShowPremium(true)}
      />
    </div>
  );
}
