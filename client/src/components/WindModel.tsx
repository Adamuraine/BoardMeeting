import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyProfile } from "@/hooks/use-profiles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind, Navigation, Lock, ChevronLeft, ChevronRight, Droplets, Thermometer, Gauge } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";

type WindData = {
  time: string;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  temperature: number;
  humidity: number;
  pressure: number;
};

type DailyWindData = {
  date: Date;
  avgWindSpeed: number;
  maxWindSpeed: number;
  avgWindDirection: number;
  avgGusts: number;
  avgTemp: number;
  hourlyData: WindData[];
};

async function fetchWindData(lat: number, lng: number): Promise<DailyWindData[]> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m,surface_pressure&forecast_days=7&timezone=auto`
  );
  const data = await response.json();
  
  const dailyData: DailyWindData[] = [];
  const hourly = data.hourly;
  
  for (let day = 0; day < 7; day++) {
    const startIdx = day * 24;
    const endIdx = startIdx + 24;
    
    const dayHourly: WindData[] = [];
    let totalSpeed = 0, maxSpeed = 0, totalDir = 0, totalGusts = 0, totalTemp = 0;
    
    for (let i = startIdx; i < endIdx && i < hourly.time.length; i++) {
      const windSpeed = hourly.wind_speed_10m[i];
      const windDir = hourly.wind_direction_10m[i];
      const windGusts = hourly.wind_gusts_10m[i];
      const temp = hourly.temperature_2m[i];
      const humidity = hourly.relative_humidity_2m[i];
      const pressure = hourly.surface_pressure[i];
      
      dayHourly.push({
        time: hourly.time[i],
        windSpeed,
        windDirection: windDir,
        windGusts,
        temperature: temp,
        humidity,
        pressure,
      });
      
      totalSpeed += windSpeed;
      maxSpeed = Math.max(maxSpeed, windSpeed);
      totalDir += windDir;
      totalGusts += windGusts;
      totalTemp += temp;
    }
    
    const count = dayHourly.length;
    dailyData.push({
      date: addDays(new Date(), day),
      avgWindSpeed: Math.round(totalSpeed / count),
      maxWindSpeed: Math.round(maxSpeed),
      avgWindDirection: Math.round(totalDir / count),
      avgGusts: Math.round(totalGusts / count),
      avgTemp: Math.round(totalTemp / count),
      hourlyData: dayHourly,
    });
  }
  
  return dailyData;
}

function getWindDescription(speed: number): string {
  if (speed < 5) return "Calm";
  if (speed < 12) return "Light";
  if (speed < 20) return "Moderate";
  if (speed < 29) return "Fresh";
  if (speed < 39) return "Strong";
  return "Gale";
}

function getDirectionName(deg: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

function getWindColor(speed: number): string {
  if (speed < 5) return "text-sky-400";
  if (speed < 12) return "text-green-400";
  if (speed < 20) return "text-yellow-400";
  if (speed < 29) return "text-orange-400";
  return "text-red-400";
}

function WindArrow({ direction, speed, size = "md" }: { direction: number; speed: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
  };
  
  return (
    <div 
      className={cn("transition-transform", getWindColor(speed))}
      style={{ transform: `rotate(${direction}deg)` }}
    >
      <Navigation className={sizeClasses[size]} />
    </div>
  );
}

function WindParticles({ speed, direction }: { speed: number; direction: number }) {
  const particleCount = Math.min(Math.floor(speed / 3), 15);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: particleCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white/40 rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1 + Math.random()}s`,
          }}
        />
      ))}
    </div>
  );
}

function HourlyChart({ data }: { data: WindData[] }) {
  const maxSpeed = Math.max(...data.map(d => d.windSpeed), 30);
  
  return (
    <div className="flex items-end gap-1 h-24 px-2">
      {data.filter((_, i) => i % 3 === 0).map((hour, i) => {
        const height = (hour.windSpeed / maxSpeed) * 100;
        const hourNum = new Date(hour.time).getHours();
        
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className={cn("w-full rounded-t transition-all", getWindColor(hour.windSpeed).replace("text-", "bg-"))}
              style={{ height: `${Math.max(height, 4)}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{hourNum}</span>
          </div>
        );
      })}
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
  const [selectedDay, setSelectedDay] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  
  const isPremium = profile?.isPremium;
  const maxDays = isPremium ? 7 : 3;
  
  const { data: windData, isLoading } = useQuery({
    queryKey: ['wind-data', lat, lng],
    queryFn: () => fetchWindData(lat, lng),
    staleTime: 1000 * 60 * 30,
  });
  
  const visibleDays = windData?.slice(0, maxDays) || [];
  const currentDay = windData?.[selectedDay];
  
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="flex-1 h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4 p-4">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      <Card className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-800 border-none text-white">
        <WindParticles speed={currentDay?.avgWindSpeed || 10} direction={currentDay?.avgWindDirection || 0} />
        
        <div className="relative p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold opacity-90">{locationName}</h2>
              <p className="text-sm opacity-70">{format(currentDay?.date || new Date(), "EEEE, MMM d")}</p>
            </div>
            <WindArrow direction={currentDay?.avgWindDirection || 0} speed={currentDay?.avgWindSpeed || 0} size="lg" />
          </div>
          
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold">{currentDay?.avgWindSpeed || 0}</span>
            <span className="text-lg opacity-70 mb-2">km/h</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm opacity-80">
            <span className="flex items-center gap-1">
              <Navigation className="h-4 w-4" style={{ transform: `rotate(${currentDay?.avgWindDirection || 0}deg)` }} />
              {getDirectionName(currentDay?.avgWindDirection || 0)}
            </span>
            <span>Gusts: {currentDay?.avgGusts || 0} km/h</span>
            <span>{getWindDescription(currentDay?.avgWindSpeed || 0)}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Thermometer className="h-4 w-4 mx-auto mb-1 opacity-70" />
              <p className="text-lg font-semibold">{currentDay?.avgTemp || 0}°</p>
              <p className="text-[10px] opacity-60">Temperature</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Wind className="h-4 w-4 mx-auto mb-1 opacity-70" />
              <p className="text-lg font-semibold">{currentDay?.maxWindSpeed || 0}</p>
              <p className="text-[10px] opacity-60">Max km/h</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Gauge className="h-4 w-4 mx-auto mb-1 opacity-70" />
              <p className="text-lg font-semibold">{currentDay?.avgGusts || 0}</p>
              <p className="text-[10px] opacity-60">Gusts km/h</p>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="flex items-center gap-2">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
          disabled={selectedDay === 0}
          data-testid="button-prev-day"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {visibleDays.map((day, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "flex-1 min-w-[80px] p-3 rounded-xl transition-all",
                selectedDay === i 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary/50 hover:bg-secondary"
              )}
              data-testid={`button-day-${i}`}
            >
              <p className="text-xs font-medium">{format(day.date, "EEE")}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <WindArrow direction={day.avgWindDirection} speed={day.avgWindSpeed} size="sm" />
                <span className="text-sm font-bold">{day.avgWindSpeed}</span>
              </div>
            </button>
          ))}
          
          {!isPremium && (
            <button
              onClick={() => setShowPremium(true)}
              className="flex-1 min-w-[80px] p-3 rounded-xl bg-secondary/30 border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1"
              data-testid="button-unlock-days"
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">+4 days</p>
            </button>
          )}
        </div>
        
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => setSelectedDay(Math.min(maxDays - 1, selectedDay + 1))}
          disabled={selectedDay >= maxDays - 1}
          data-testid="button-next-day"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 text-foreground">Hourly Wind Speed</h3>
        {currentDay && <HourlyChart data={currentDay.hourlyData} />}
      </Card>
      
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Wind Conditions</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <div className={cn("p-2 rounded-full", getWindColor(currentDay?.avgWindSpeed || 0).replace("text-", "bg-").replace("-400", "-500/20"))}>
              <Wind className={cn("h-5 w-5", getWindColor(currentDay?.avgWindSpeed || 0))} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-semibold">{currentDay?.avgWindSpeed || 0} km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <div className="p-2 rounded-full bg-orange-500/20">
              <Wind className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Gusts</p>
              <p className="font-semibold">{currentDay?.avgGusts || 0} km/h</p>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Light (5-12 km/h) - Good for beginners
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Moderate (12-20 km/h) - Ideal conditions
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            Fresh (20-29 km/h) - Experienced surfers
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            Strong (29+ km/h) - Challenging conditions
          </p>
        </div>
      </Card>
    </div>
  );
}
