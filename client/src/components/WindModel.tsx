import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMyProfile } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, Lock, MapPin, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m&forecast_days=7&timezone=auto`
  );
  const data = await response.json();
  
  if (!data.hourly || !data.hourly.time) {
    return [];
  }
  
  const hourly = data.hourly;
  const result: HourlyWindData[] = [];
  
  const now = new Date();
  let currentHourIndex = 0;
  
  for (let i = 0; i < hourly.time.length; i++) {
    const hourTime = new Date(hourly.time[i]);
    if (hourTime <= now) {
      currentHourIndex = i;
    }
    
    let windSpeed = hourly.wind_speed_10m[i];
    let windGusts = hourly.wind_gusts_10m[i];
    let windDirection = hourly.wind_direction_10m[i];
    let temperature = hourly.temperature_2m[i];
    
    if (i === currentHourIndex && data.current) {
      windSpeed = data.current.wind_speed_10m;
      windGusts = data.current.wind_gusts_10m;
      windDirection = data.current.wind_direction_10m;
      temperature = data.current.temperature_2m;
    }
    
    result.push({
      time: hourTime,
      windSpeed: Math.round(windSpeed * 0.621371 * 10) / 10,
      windDirection: windDirection,
      windGusts: Math.round(windGusts * 0.621371 * 10) / 10,
      temperature: Math.round(temperature * 9/5 + 32),
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

function WindCanvas({ 
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
  
  const createParticle = useCallback((w: number, h: number): Particle => {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      age: Math.random() * 60,
      maxAge: 80 + Math.random() * 80,
      speed: 1 + Math.random() * 2,
    };
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = width;
    canvas.height = height;
    
    const particleCount = Math.min(400, Math.floor(width * height / 1000));
    particlesRef.current = Array.from({ length: particleCount }, () => 
      createParticle(width, height)
    );
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      const radians = (windDirection - 90) * (Math.PI / 180);
      const speedFactor = Math.max(1, windSpeed / 10);
      
      particlesRef.current.forEach((particle, i) => {
        particle.age++;
        
        if (particle.age > particle.maxAge || 
            particle.x < -50 || particle.x > width + 50 || 
            particle.y < -50 || particle.y > height + 50) {
          particlesRef.current[i] = createParticle(width, height);
          particlesRef.current[i].age = 0;
          return;
        }
        
        const moveX = Math.cos(radians) * particle.speed * speedFactor;
        const moveY = Math.sin(radians) * particle.speed * speedFactor;
        
        particle.x += moveX;
        particle.y += moveY;
        
        const fadeIn = Math.min(1, particle.age / 15);
        const fadeOut = Math.max(0, 1 - (particle.age - particle.maxAge + 30) / 30);
        const alpha = Math.min(fadeIn, fadeOut) * 0.9;
        
        const tailLength = 15;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.moveTo(particle.x - moveX * tailLength, particle.y - moveY * tailLength);
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
  
  if (width <= 0 || height <= 0) return null;
  
  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      width={width}
      height={height}
    />
  );
}

function MapController({ 
  lat, 
  lng, 
  zoom,
  programmaticMoveId,
  onMoveEnd 
}: { 
  lat: number; 
  lng: number; 
  zoom: number;
  programmaticMoveId: number;
  onMoveEnd: (lat: number, lng: number, zoom: number) => void;
}) {
  const map = useMap();
  const lastProgrammaticMoveRef = useRef(0);
  const isUserGestureRef = useRef(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const mapReadyRef = useRef(false);
  
  useEffect(() => {
    const checkReady = () => {
      try {
        map.getCenter();
        mapReadyRef.current = true;
      } catch {
        mapReadyRef.current = false;
      }
    };
    
    checkReady();
    map.whenReady(() => {
      mapReadyRef.current = true;
    });
  }, [map]);
  
  useEffect(() => {
    if (!mapReadyRef.current) return;
    if (programmaticMoveId > lastProgrammaticMoveRef.current) {
      lastProgrammaticMoveRef.current = programmaticMoveId;
      isUserGestureRef.current = false;
      try {
        map.setView([lat, lng], Math.round(8 + (zoom - 1) * 2), { animate: true });
      } catch {
        // Map not ready, ignore
      }
    }
  }, [lat, lng, zoom, programmaticMoveId, map]);
  
  useMapEvents({
    movestart: () => {
      isUserGestureRef.current = true;
    },
    moveend: () => {
      if (!isUserGestureRef.current || !mapReadyRef.current) return;
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = window.setTimeout(() => {
        try {
          const center = map.getCenter();
          const z = map.getZoom();
          const normalizedZoom = (z - 8) / 2 + 1;
          onMoveEnd(center.lat, center.lng, normalizedZoom);
        } catch {
          // Map not ready, ignore
        }
        isUserGestureRef.current = false;
      }, 300);
    },
  });
  
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  return null;
}

function LeafletWindOverlay({ 
  windSpeed, 
  windDirection 
}: { 
  windSpeed: number; 
  windDirection: number;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  
  useEffect(() => {
    const container = map.getContainer();
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '400';
    container.appendChild(canvas);
    canvasRef.current = canvas;
    
    const updateSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
      }
    };
    updateSize();
    
    map.on('resize', updateSize);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      map.off('resize', updateSize);
      if (canvasRef.current && container.contains(canvasRef.current)) {
        container.removeChild(canvasRef.current);
      }
    };
  }, [map]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const particleCount = Math.min(150, Math.max(30, windSpeed * 8));
    const dirRad = (windDirection - 90) * Math.PI / 180;
    
    const createParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      age: Math.random() * 100,
      maxAge: 60 + Math.random() * 60,
      speed: 0.5 + Math.random() * 1.5 + windSpeed * 0.15,
    });
    
    while (particlesRef.current.length < particleCount) {
      particlesRef.current.push(createParticle());
    }
    while (particlesRef.current.length > particleCount) {
      particlesRef.current.pop();
    }
    
    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);
      
      for (const p of particlesRef.current) {
        p.x += Math.cos(dirRad) * p.speed;
        p.y += Math.sin(dirRad) * p.speed;
        p.age++;
        
        if (p.age > p.maxAge || p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) {
          Object.assign(p, createParticle());
          const edge = Math.floor(Math.random() * 4);
          if (edge === 0) { p.x = -5; p.y = Math.random() * height; }
          else if (edge === 1) { p.x = width + 5; p.y = Math.random() * height; }
          else if (edge === 2) { p.x = Math.random() * width; p.y = -5; }
          else { p.x = Math.random() * width; p.y = height + 5; }
        }
        
        const alpha = Math.min(1, (1 - p.age / p.maxAge) * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [windSpeed, windDirection]);
  
  return null;
}

function WindMapView({ 
  lat, 
  lng, 
  windSpeed, 
  windDirection,
  locationName,
  onPositionChange,
  zoom,
  programmaticMoveId,
  searchQuery,
  onSearchChange,
  onSearch,
  isSearching,
  onZoomButton
}: { 
  lat: number; 
  lng: number; 
  windSpeed: number; 
  windDirection: number;
  locationName: string;
  onPositionChange: (lat: number, lng: number, zoom: number) => void;
  zoom: number;
  programmaticMoveId: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  onZoomButton: (delta: number) => void;
}) {
  const [mapKey] = useState(() => `map-${Date.now()}`);
  const baseColor = getWindColorHex(windSpeed);
  const onshoreWind = isOnshore(windDirection);
  const leafletZoom = Math.round(8 + (zoom - 1) * 2);
  
  const handleMoveEnd = useCallback((newLat: number, newLng: number, newZoom: number) => {
    onPositionChange(newLat, newLng, newZoom);
  }, [onPositionChange]);
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      <style>{`
        .leaflet-container {
          background: #1e293b !important;
        }
        .leaflet-tile {
          filter: brightness(0.7) saturate(0.8);
        }
        .leaflet-control-zoom {
          display: none !important;
        }
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
      
      <MapContainer
        key={mapKey}
        center={[lat, lng]}
        zoom={leafletZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController 
          lat={lat} 
          lng={lng} 
          zoom={zoom}
          programmaticMoveId={programmaticMoveId}
          onMoveEnd={handleMoveEnd}
        />
        <LeafletWindOverlay 
          windSpeed={windSpeed} 
          windDirection={windDirection}
        />
      </MapContainer>
      
      <div 
        className="absolute inset-0 pointer-events-none z-[500]"
        style={{
          background: `
            linear-gradient(135deg, ${baseColor}40 0%, transparent 50%),
            linear-gradient(225deg, #0ea5e930 0%, transparent 50%),
            linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.3) 100%)
          `,
        }}
      />
      
      <div className="absolute top-3 left-3 right-3 z-[600]">
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
      
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-[600]">
        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
      </div>
      
      <div className="absolute left-1/2 top-[58%] -translate-x-1/2 w-[280px] pointer-events-auto z-[600]">
        <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 text-white shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-sm font-medium opacity-90 mb-1 truncate">{locationName}</p>
              <p className="text-xs text-white/60">
                {lat >= 0 ? 'N' : 'S'} {Math.abs(lat).toFixed(2)}, {lng >= 0 ? 'E' : 'W'} {Math.abs(lng).toFixed(2)}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400 shrink-0">
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
      
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto z-[600]">
        <Button 
          size="icon" 
          variant="secondary" 
          className="h-9 w-9 bg-white/20 backdrop-blur-sm border-0 text-white"
          onClick={() => onZoomButton(0.25)}
          data-testid="button-zoom-in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          variant="secondary" 
          className="h-9 w-9 bg-white/20 backdrop-blur-sm border-0 text-white"
          onClick={() => onZoomButton(-0.25)}
          data-testid="button-zoom-out"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="absolute bottom-4 left-4 pointer-events-none z-[600]">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-[10px]">
          Drag to explore
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
          const dateStr = format(hour.time, 'EEE M/d');
          const showDate = dateStr !== currentDate;
          if (showDate) currentDate = dateStr;
          
          const hourStr = format(hour.time, 'ha').toLowerCase();
          const isSelected = i === selectedIndex;
          const isLocked = i >= maxHours;
          const windColor = getWindColorHex(hour.windSpeed);
          const onshoreWind = isOnshore(hour.windDirection);
          
          return (
            <div key={i} className="flex flex-col items-center">
              {showDate && (
                <div className="text-[9px] text-white/50 mb-1 whitespace-nowrap">{dateStr}</div>
              )}
              <button
                data-index={i}
                onClick={() => !isLocked && onSelectHour(i)}
                disabled={isLocked}
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

export function WindModel({ lat: initialLat = 33.19, lng: initialLng = -117.39, locationName: initialName = "Oceanside, CA" }: WindModelProps) {
  const { data: profile } = useMyProfile();
  const [selectedHour, setSelectedHour] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [locationName, setLocationName] = useState(initialName);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [geolocating, setGeolocating] = useState(false);
  const [programmaticMoveId, setProgrammaticMoveId] = useState(0);
  
  const isPremium = profile?.isPremium ?? false;
  const maxHours = isPremium ? 168 : 72;
  
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGeolocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setLat(userLat);
          setLng(userLng);
          setProgrammaticMoveId(prev => prev + 1);
          
          try {
            const response = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${userLat}&longitude=${userLng}&count=1&language=en&format=json`
            );
            const reverseResult = await geocodeLocation(`${userLat.toFixed(2)}, ${userLng.toFixed(2)}`);
            if (reverseResult) {
              setLocationName(reverseResult.name);
            } else {
              setLocationName(`${Math.abs(userLat).toFixed(2)}${userLat >= 0 ? 'N' : 'S'}, ${Math.abs(userLng).toFixed(2)}${userLng >= 0 ? 'W' : 'E'}`);
            }
          } catch {
            setLocationName(`${Math.abs(userLat).toFixed(2)}${userLat >= 0 ? 'N' : 'S'}, ${Math.abs(userLng).toFixed(2)}${userLng >= 0 ? 'W' : 'E'}`);
          }
          setGeolocating(false);
        },
        () => {
          setGeolocating(false);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);
  
  useEffect(() => {
    if (selectedHour >= maxHours) {
      setSelectedHour(maxHours - 1);
    }
  }, [maxHours, selectedHour]);
  
  const { data: hourlyData, isLoading, refetch } = useQuery({
    queryKey: ['hourly-wind-data', lat, lng],
    queryFn: () => fetchHourlyWindData(lat, lng),
    staleTime: 1000 * 60 * 15,
  });
  
  const handlePositionChange = useCallback((newLat: number, newLng: number, newZoom: number) => {
    setLat(newLat);
    setLng(newLng);
    setZoom(newZoom);
    setLocationName(`${Math.abs(newLat).toFixed(2)}${newLat >= 0 ? 'N' : 'S'}, ${Math.abs(newLng).toFixed(2)}${newLng >= 0 ? 'E' : 'W'}`);
  }, []);
  
  const handleZoomButton = useCallback((delta: number) => {
    setZoom(prev => {
      const newZoom = Math.max(0.5, Math.min(3, prev + delta));
      return newZoom;
    });
    setProgrammaticMoveId(prev => prev + 1);
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
      setProgrammaticMoveId(prev => prev + 1);
      refetch();
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
      
      <div className="flex-1 min-h-[400px] relative bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-700">
        <WindMapView 
          lat={lat}
          lng={lng}
          windSpeed={currentHour?.windSpeed || 0}
          windDirection={currentHour?.windDirection || 0}
          locationName={locationName}
          onPositionChange={handlePositionChange}
          zoom={zoom}
          programmaticMoveId={programmaticMoveId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
          isSearching={isSearching}
          onZoomButton={handleZoomButton}
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
