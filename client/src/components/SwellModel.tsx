import { useState, useEffect, useRef, useMemo } from "react";
import boardMeetingLogo from "@assets/IMG_3950_1769110363136.jpeg";
import { useMyProfile } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, Lock, Play, Pause } from "lucide-react";
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

function SwellHeightScale() {
  const heights = [18, 16, 14, 12, 10, 8, 6, 4, 2, 0];

  const getSwellColorHex = (height: number): string => {
    if (height < 2) return "#1e3a5f";
    if (height < 4) return "#2563eb";
    if (height < 6) return "#06b6d4";
    if (height < 8) return "#10b981";
    if (height < 10) return "#84cc16";
    if (height < 12) return "#eab308";
    if (height < 14) return "#f97316";
    if (height < 16) return "#ef4444";
    return "#dc2626";
  };

  return (
    <div className="absolute left-2 top-[35%] -translate-y-1/2 z-20 flex flex-col items-center text-[9px] font-medium text-white bg-black/30 rounded-md overflow-hidden">
      <span className="py-1 px-1.5 opacity-80 bg-black/40">ft</span>
      {heights.map((height) => (
        <div
          key={height}
          className="w-7 h-5 flex items-center justify-center"
          style={{ backgroundColor: getSwellColorHex(height) }}
        >
          <span className="text-white/90 drop-shadow-sm">{height}</span>
        </div>
      ))}
    </div>
  );
}

function SwellEmbed({
  lat,
  lng,
  zoom = 7,
  timestamp
}: {
  lat: number;
  lng: number;
  zoom?: number;
  timestamp: number;
}) {
  const [key, setKey] = useState(0);

  const embedUrl = useMemo(() => {
    const calendarParam = timestamp ? timestamp : 'now';
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=${zoom}&overlay=swell1&product=ecmwf&level=surface&lat=${lat}&lon=${lng}&detailLat=${lat}&detailLon=${lng}&marker=true&message=true&calendar=${calendarParam}&pressure=false&type=map&menu=`;
  }, [lat, lng, zoom, timestamp]);

  useEffect(() => {
    setKey(prev => prev + 1);
  }, [lat, lng, timestamp]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <iframe
        key={key}
        src={embedUrl}
        className="w-full h-full border-0"
        title="Windy Swell Map"
        allow="fullscreen"
        data-testid="swell-embed"
      />
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-700 to-blue-600 rounded-lg shadow-md"
      >
        <img
          src={boardMeetingLogo}
          alt="Board Meeting Logo"
          className="w-6 h-6 rounded-full object-cover"
        />
        <span className="text-white font-semibold text-sm tracking-wide">Board Meeting</span>
      </div>
    </div>
  );
}

function SwellTimeSlider({
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
  const timeLabels = ['12a', '6a', '12p', '6p'];

  return (
    <div className="bg-slate-800 px-2 py-1.5 border-b border-white/10">
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-white/80 hover:text-white"
          onClick={onTogglePlay}
          data-testid="button-swell-play-time"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>

        <div className="flex-1">
          <Slider
            value={[selectedHour]}
            onValueChange={(v) => onHourChange(v[0])}
            min={0}
            max={23}
            step={1}
            className="w-full"
            data-testid="slider-swell-time"
          />
          <div className="flex justify-between mt-0.5 text-[8px] text-white/50">
            {timeLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>

        <div className="text-white text-[10px] font-medium min-w-[45px] text-right">
          {format(addHours(startOfDay(selectedDay), selectedHour), 'h a')}
        </div>
      </div>
    </div>
  );
}

function SwellDaySelector({
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
    <div className="bg-slate-800 border-b border-white/10">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide py-1.5 px-2 gap-1"
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
                "flex flex-col items-center px-2 py-1 rounded transition-all min-w-[40px]",
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/20",
                isLocked && "opacity-50"
              )}
              data-testid={`button-swell-day-${i}`}
            >
              {isLocked && <Lock className="h-2 w-2" />}
              <span className="text-[9px] font-medium">{format(day, 'EEE')}</span>
              <span className="text-sm font-bold leading-tight">{format(day, 'd')}</span>
            </button>
          );
        })}
        {!isPremium && (
          <button
            onClick={onShowPremium}
            className="flex items-center px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[9px] font-medium min-w-[50px] hover:bg-blue-500/30"
            data-testid="button-swell-unlock-forecast"
          >
            +5 days ($5/mo)
          </button>
        )}
      </div>
    </div>
  );
}

type SwellModelProps = {
  lat?: number;
  lng?: number;
  locationName?: string;
}

export function SwellModel({ lat: propLat = 32.55, lng: propLng = -117.39, locationName: initialName = "Oceanside, CA" }: SwellModelProps) {
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
  const maxDays = isPremium ? 7 : 2;

  const days = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
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
    <div className="flex flex-col h-full" data-testid="swell-model-container">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />

      <div className="px-2 py-1.5 bg-slate-800 border-b border-white/10 sticky top-0 z-10">
        <div className="flex gap-1.5 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/60" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search location..."
              className="pl-7 bg-slate-700 border-white/20 text-white placeholder:text-white/50 h-7 text-xs"
              data-testid="input-swell-location-search"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-2 text-xs"
            data-testid="button-swell-search-location"
          >
            {isSearching ? "..." : "Go"}
          </Button>
          <div className="text-white/70 text-[10px] flex flex-col items-end min-w-[70px]">
            <span className="truncate max-w-[70px]">{locationName}</span>
            <span className="text-blue-400">{format(addHours(startOfDay(days[selectedDay]), selectedHour), 'MMM d, h a')}</span>
          </div>
        </div>
      </div>

      <SwellTimeSlider
        selectedHour={selectedHour}
        onHourChange={setSelectedHour}
        selectedDay={days[selectedDay]}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      <SwellDaySelector
        days={days}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        maxDays={maxDays}
        isPremium={isPremium}
        onShowPremium={() => setShowPremium(true)}
      />

      <div className="flex-1 min-h-[350px] relative pb-16">
        <SwellEmbed
          lat={lat}
          lng={lng}
          zoom={7}
          timestamp={timestamp}
        />
      </div>
    </div>
  );
}
