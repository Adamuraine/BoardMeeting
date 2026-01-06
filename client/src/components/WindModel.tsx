import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyProfile } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, Lock, MapPin, Search, ChevronLeft, ChevronRight, Compass, Wind, ArrowUp, ArrowDown } from "lucide-react";
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

type Particle = {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  speed: number;
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

function isOnshore(windDirection: number, coastDirection: number = 270): boolean {
  const diff = Math.abs(windDirection - coastDirection);
  const normalizedDiff = diff > 180 ? 360 - diff : diff;
  return normalizedDiff < 90;
}

function WindSpeedScale() {
  const speeds = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  
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

function AnimatedWindCanvas({ 
  windSpeed, 
  windDirection,
  width,
  height
}: { 
  windSpeed: number; 
  windDirection: number;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  
  const createParticle = useCallback((width: number, height: number): Particle => {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      age: 0,
      maxAge: 50 + Math.random() * 100,
      speed: 0.5 + Math.random() * 1.5,
    };
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = width;
    canvas.height = height;
    
    const particleCount = Math.min(200, Math.floor(width * height / 2000));
    particlesRef.current = Array.from({ length: particleCount }, () => 
      createParticle(width, height)
    );
    
    const radians = (windDirection - 90) * (Math.PI / 180);
    const speedFactor = Math.max(0.5, windSpeed / 20);
    
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, width, height);
      
      particlesRef.current.forEach((particle, i) => {
        particle.age++;
        
        if (particle.age > particle.maxAge || 
            particle.x < 0 || particle.x > width || 
            particle.y < 0 || particle.y > height) {
          particlesRef.current[i] = createParticle(width, height);
          particlesRef.current[i].age = 0;
          return;
        }
        
        const moveX = Math.cos(radians) * particle.speed * speedFactor;
        const moveY = Math.sin(radians) * particle.speed * speedFactor;
        
        particle.x += moveX;
        particle.y += moveY;
        
        const fadeIn = Math.min(1, particle.age / 20);
        const fadeOut = Math.max(0, 1 - (particle.age - particle.maxAge + 20) / 20);
        const alpha = Math.min(fadeIn, fadeOut) * 0.7;
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.moveTo(particle.x - moveX * 3, particle.y - moveY * 3);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, windDirection, windSpeed, createParticle]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}

function WindMapView({ 
  lat, 
  lng, 
  windSpeed, 
  windDirection,
  locationName,
  onDrag,
  searchQuery,
  onSearchChange,
  onSearch,
  isSearching
}: { 
  lat: number; 
  lng: number; 
  windSpeed: number; 
  windDirection: number;
  locationName: string;
  onDrag: (deltaLat: number, deltaLng: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  isSearching: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastPosRef.current.x;
    const deltaY = e.clientY - lastPosRef.current.y;
    
    const deltaLat = deltaY * 0.01;
    const deltaLng = -deltaX * 0.01;
    
    onDrag(deltaLat, deltaLng);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    lastPosRef.current = { x: touch.clientX, y: touch.clientY };
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastPosRef.current.x;
    const deltaY = touch.clientY - lastPosRef.current.y;
    
    const deltaLat = deltaY * 0.01;
    const deltaLng = -deltaX * 0.01;
    
    onDrag(deltaLat, deltaLng);
    lastPosRef.current = { x: touch.clientX, y: touch.clientY };
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  const baseColor = getWindColorHex(windSpeed);
  const onshoreWind = isOnshore(windDirection);
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, ${baseColor}99 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, #0ea5e966 0%, transparent 40%),
            radial-gradient(ellipse at 50% 50%, #06b6d455 0%, transparent 60%),
            linear-gradient(180deg, #0c4a6e 0%, #0e7490 50%, #0d9488 100%)
          `,
        }}
      />
      
      <AnimatedWindCanvas 
        windSpeed={windSpeed}
        windDirection={windDirection}
        width={dimensions.width}
        height={dimensions.height}
      />
      
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="Search location..."
              className="pl-10 bg-slate-900/70 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-10"
              data-testid="input-location-search"
            />
          </div>
          <Button 
            onClick={onSearch}
            disabled={isSearching}
            className="bg-teal-600 hover:bg-teal-700 text-white"
            data-testid="button-search-location"
          >
            {isSearching ? "..." : "Go"}
          </Button>
        </div>
      </div>
      
      <div className="absolute left-4 top-1/3 flex flex-col items-center text-white/70 text-[10px]">
        <div className="h-20 w-[2px] bg-white/40 rounded-full mb-1" />
        <span>50 mi</span>
      </div>
      
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
        <div className="w-5 h-5 rounded-full bg-blue-500 border-3 border-white shadow-lg animate-pulse" />
      </div>
      
      <div className="absolute left-1/2 top-[60%] -translate-x-1/2 w-[280px] pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 text-white shadow-xl">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">{locationName}</p>
              <p className="text-xs text-white/60">
                {lat >= 0 ? 'N' : 'S'} {Math.abs(lat).toFixed(4)}, {lng >= 0 ? 'E' : 'W'} {Math.abs(lng).toFixed(4)}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400">
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4 py-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: baseColor }}
              >
                <Navigation 
                  className="h-4 w-4 text-white" 
                  style={{ transform: `rotate(${windDirection}deg)` }}
                />
              </div>
              <div>
                <p className="text-lg font-bold">{windSpeed} <span className="text-xs font-normal">mph</span></p>
                <p className="text-xs text-white/60">{getDirectionName(windDirection)}</p>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-end gap-2">
              <div className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                onshoreWind ? "bg-amber-500/80 text-white" : "bg-emerald-500/80 text-white"
              )}>
                {onshoreWind ? (
                  <span className="flex items-center gap-1">
                    <ArrowDown className="h-3 w-3" /> Onshore
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" /> Offshore
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-xs flex items-center gap-1">
          <Compass className="h-3 w-3" />
          <span>Drag to pan</span>
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
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-emerald-400">
            <ArrowUp className="h-3 w-3" /> Offshore
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <ArrowDown className="h-3 w-3" /> Onshore
          </span>
        </div>
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
        className="flex overflow-x-auto scrollbar-hide py-3 px-2 gap-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {data.map((hour, i) => {
          const dateStr = format(hour.time, "EEE, MMM d");
          const showDate = dateStr !== currentDate;
          if (showDate) currentDate = dateStr;
          const hourStr = format(hour.time, "ha").toLowerCase();
          const isSelected = i === selectedIndex;
          const isLocked = i >= maxHours;
          const onshoreWind = isOnshore(hour.windDirection);
          const windColor = getWindColorHex(hour.windSpeed);
          
          return (
            <div key={i} className="flex flex-col items-center min-w-[44px]" data-index={i}>
              {showDate && (
                <div className="text-[9px] text-white/50 mb-1 whitespace-nowrap px-1 flex items-center gap-1">
                  {isLocked && (
                    <span className="bg-amber-500/80 text-white text-[8px] px-1 rounded">PRO</span>
                  )}
                  <span>{format(hour.time, "EEE")}</span>
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
                  "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all",
                  isSelected 
                    ? "bg-white/20 ring-2 ring-teal-400" 
                    : "hover:bg-white/10",
                  isLocked && "opacity-40"
                )}
                data-testid={`button-hour-${i}`}
              >
                {isLocked && <Lock className="h-3 w-3 text-white/60" />}
                
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: isLocked ? '#64748b' : windColor }}
                >
                  {onshoreWind ? (
                    <ArrowDown className="h-3 w-3 text-white" />
                  ) : (
                    <ArrowUp className="h-3 w-3 text-white" />
                  )}
                </div>
                
                <span className="text-[10px] text-white/70">{hourStr}</span>
                <span className="text-[10px] font-medium text-white">{Math.round(hour.windSpeed)}</span>
              </button>
            </div>
          );
        })}
        
        {!isPremium && (
          <button
            onClick={onShowPremium}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-amber-400 text-xs whitespace-nowrap min-w-[100px]"
            data-testid="button-unlock-premium"
          >
            <Lock className="h-4 w-4" />
            <span>Unlock 7-day</span>
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

export function WindModel({ lat: initialLat = 33.1936, lng: initialLng = -117.3831, locationName: initialName = "Oceanside, CA" }: WindModelProps) {
  const { data: profile } = useMyProfile();
  const [selectedHour, setSelectedHour] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [locationName, setLocationName] = useState(initialName);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
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
  
  const handleDrag = (deltaLat: number, deltaLng: number) => {
    setLat(prev => Math.max(-90, Math.min(90, prev + deltaLat)));
    setLng(prev => {
      let newLng = prev + deltaLng;
      if (newLng > 180) newLng -= 360;
      if (newLng < -180) newLng += 360;
      return newLng;
    });
    setLocationName(`${lat >= 0 ? 'N' : 'S'}${Math.abs(lat).toFixed(2)}, ${lng >= 0 ? 'E' : 'W'}${Math.abs(lng).toFixed(2)}`);
  };
  
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
  
  const visibleData = hourlyData?.slice(0, maxHours) || [];
  const currentHour = visibleData[selectedHour];
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Skeleton className="flex-1 rounded-none" />
        <Skeleton className="h-32 rounded-none" />
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
          onDrag={handleDrag}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
          isSearching={isSearching}
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
