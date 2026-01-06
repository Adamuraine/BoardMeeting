import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyProfile } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, Lock, MapPin, Layers, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";

type HourlyWindData = {
  time: Date;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  temperature: number;
};

async function fetchHourlyWindData(lat: number, lng: number): Promise<HourlyWindData[]> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&forecast_days=7&timezone=auto`
  );
  const data = await response.json();
  
  if (!data.hourly || !data.hourly.time) {
    return [];
  }
  
  const hourly = data.hourly;
  const result: HourlyWindData[] = [];
  
  for (let i = 0; i < hourly.time.length; i++) {
    result.push({
      time: new Date(hourly.time[i]),
      windSpeed: Math.round(hourly.wind_speed_10m[i] * 10) / 10,
      windDirection: hourly.wind_direction_10m[i],
      windGusts: Math.round(hourly.wind_gusts_10m[i] * 10) / 10,
      temperature: Math.round(hourly.temperature_2m[i]),
    });
  }
  
  return result;
}

function getDirectionName(deg: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

function getWindColorHex(speed: number): string {
  if (speed < 5) return "#93c5fd";
  if (speed < 10) return "#6ee7b7";
  if (speed < 15) return "#86efac";
  if (speed < 20) return "#fde047";
  if (speed < 25) return "#fdba74";
  if (speed < 30) return "#fb923c";
  if (speed < 40) return "#f87171";
  return "#ef4444";
}

function WindSpeedScale() {
  const speeds = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  
  return (
    <div className="flex items-center gap-0 h-6 text-[10px] font-medium text-white">
      <span className="pr-1 opacity-80">mph</span>
      {speeds.map((speed, i) => (
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

function WindMapView({ 
  lat, 
  lng, 
  windSpeed, 
  windDirection,
  locationName 
}: { 
  lat: number; 
  lng: number; 
  windSpeed: number; 
  windDirection: number;
  locationName: string;
}) {
  const baseColor = getWindColorHex(windSpeed);
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, 
              ${baseColor}88 0%, 
              #0ea5e966 25%,
              #06b6d466 50%,
              ${baseColor}66 75%,
              #22d3ee44 100%
            )
          `,
        }}
      />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => {
          const row = Math.floor(i / 6);
          const col = i % 6;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${col * 18 + 5}%`,
                top: `${row * 22 + 10}%`,
                transform: `rotate(${windDirection}deg)`,
                opacity: 0.4 + Math.random() * 0.3,
              }}
            >
              <Navigation className="h-3 w-3 text-white drop-shadow-md" />
            </div>
          );
        })}
      </div>
      
      <div className="absolute left-4 top-1/3 flex flex-col items-center text-white/70 text-[10px]">
        <div className="h-24 w-[2px] bg-white/40 rounded-full mb-1" />
        <span>27 mi</span>
      </div>
      
      <div className="absolute right-3 top-1/4 flex flex-col gap-2">
        <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/20 backdrop-blur-sm border-0 text-white">
          <Search className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/20 backdrop-blur-sm border-0 text-white">
          <Layers className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
      </div>
      
      <div className="absolute left-1/2 top-[35%] -translate-x-1/2 w-[280px]">
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 text-white">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium opacity-90">
                {lat >= 0 ? 'N' : 'S'} {Math.abs(lat).toFixed(4)}, {lng >= 0 ? 'E' : 'W'} {Math.abs(lng).toFixed(2)}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400">
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Navigation 
              className="h-4 w-4 text-white/70" 
              style={{ transform: `rotate(${windDirection}deg)` }}
            />
            <span className="text-sm">{windSpeed} mph, {getDirectionName(windDirection)}</span>
          </div>
          <Button 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-full h-10"
            data-testid="button-open-forecast"
          >
            Open forecast
          </Button>
        </div>
      </div>
      
      <div className="absolute bottom-20 right-4 flex flex-col gap-2">
        <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/20 backdrop-blur-sm border-0 text-white">
          <Navigation className="h-4 w-4" />
        </Button>
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs">
          GFS27
        </div>
      </div>
      
      <div className="absolute bottom-20 right-4 left-auto">
        <div className="bg-teal-600/90 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2 text-white text-sm">
          <span>Wind speed</span>
          <Layers className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function HourlyTimeline({ 
  data, 
  selectedIndex, 
  onSelectHour,
  maxHours,
  isPremium,
  onShowPremium
}: { 
  data: HourlyWindData[];
  selectedIndex: number;
  onSelectHour: (index: number) => void;
  maxHours: number;
  isPremium: boolean;
  onShowPremium: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedIndex]);
  
  let currentDate = "";
  
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-white/70"
          onClick={() => onSelectHour(Math.max(0, selectedIndex - 6))}
          data-testid="button-timeline-prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-white/50 text-xs">Scroll to select time</span>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-white/70"
          onClick={() => onSelectHour(Math.min(maxHours - 1, selectedIndex + 6))}
          data-testid="button-timeline-next"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide py-3 px-2 gap-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {data.map((hour, i) => {
          const dateStr = format(hour.time, "EEE, MMM d");
          const showDate = dateStr !== currentDate;
          if (showDate) currentDate = dateStr;
          const hourStr = format(hour.time, "h a");
          const isSelected = i === selectedIndex;
          const isLocked = i >= maxHours;
          
          return (
            <div key={i} className="flex flex-col items-center" data-index={i}>
              {showDate && (
                <div className="text-[10px] text-white/50 mb-1 whitespace-nowrap px-1">
                  {isLocked && (
                    <span className="bg-amber-500/80 text-white text-[8px] px-1 rounded mr-1">PRO</span>
                  )}
                  {dateStr}
                </div>
              )}
              {!showDate && <div className="h-4" />}
              <button
                onClick={() => {
                  if (isLocked) {
                    onShowPremium();
                  } else {
                    onSelectHour(i);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  isSelected 
                    ? "bg-teal-500 text-white" 
                    : "text-white/60 hover:text-white/80",
                  isLocked && "opacity-50"
                )}
                data-testid={`button-hour-${i}`}
              >
                {isLocked && <Lock className="h-3 w-3 inline mr-1" />}
                {hourStr}
              </button>
            </div>
          );
        })}
        
        {!isPremium && (
          <button
            onClick={onShowPremium}
            className="flex items-center gap-1 px-4 py-2 text-amber-400 text-xs whitespace-nowrap"
            data-testid="button-unlock-premium"
          >
            <Lock className="h-3 w-3" />
            Unlock 7-day forecast
          </button>
        )}
      </div>
    </div>
  );
}

interface WindModelProps {
  lat?: number;
  lng?: number;
  locationName?: string;
}

export function WindModel({ lat = 33.1936, lng = -117.3831, locationName = "Oceanside, CA" }: WindModelProps) {
  const { data: profile } = useMyProfile();
  const [selectedHour, setSelectedHour] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  
  const isPremium = profile?.isPremium ?? false;
  const maxHours = isPremium ? 168 : 72;
  
  useEffect(() => {
    if (selectedHour >= maxHours) {
      setSelectedHour(maxHours - 1);
    }
  }, [maxHours, selectedHour]);
  
  const { data: hourlyData, isLoading } = useQuery({
    queryKey: ['hourly-wind-data', lat, lng],
    queryFn: () => fetchHourlyWindData(lat, lng),
    staleTime: 1000 * 60 * 30,
  });
  
  const visibleData = hourlyData?.slice(0, maxHours) || [];
  const currentHour = visibleData[selectedHour];
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Skeleton className="flex-1 rounded-none" />
        <Skeleton className="h-24 rounded-none" />
      </div>
    );
  }
  
  if (!hourlyData || hourlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Unable to load wind data
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full" data-testid="wind-model-container">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      <div className="bg-slate-800 sticky top-0 z-10">
        <WindSpeedScale />
      </div>
      
      <div className="flex-1 relative bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600">
        <WindMapView 
          lat={lat}
          lng={lng}
          windSpeed={currentHour?.windSpeed || 0}
          windDirection={currentHour?.windDirection || 0}
          locationName={locationName}
        />
      </div>
      
      <HourlyTimeline 
        data={hourlyData}
        selectedIndex={selectedHour}
        onSelectHour={setSelectedHour}
        maxHours={maxHours}
        isPremium={isPremium}
        onShowPremium={() => setShowPremium(true)}
      />
    </div>
  );
}
