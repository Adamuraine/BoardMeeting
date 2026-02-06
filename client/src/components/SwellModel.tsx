import { useState, useEffect, useRef, useCallback } from "react";
import boardMeetingLogo from "@assets/IMG_3950_1769110363136.jpeg";
import { useMyProfile } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/button";
import { Lock, ChevronLeft, ChevronRight, Play, Pause, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";

const STORMSURF_BASE = "https://www.stormsurfing.com/stormuser2/images/grib";

const FRAME_INDICES = [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61];

const REGIONS = [
  { id: "scal_wave", name: "Southern California Swell", short: "SoCal" },
  { id: "scal_comp", name: "Southern California Surf", short: "SoCal Surf" },
  { id: "ncal_wave", name: "Northern California Swell", short: "NorCal" },
  { id: "ncal_comp", name: "Northern California Surf", short: "NorCal Surf" },
  { id: "hi_wave", name: "Hawaii Swell", short: "Hawaii" },
  { id: "nj_wave", name: "New Jersey Swell", short: "New Jersey" },
];

function getImageUrl(regionId: string, frameIndex: number): string {
  return `${STORMSURF_BASE}/${regionId}_${frameIndex}.png`;
}

const FREE_FRAMES = 9;

export function SwellModel() {
  const { data: profile } = useMyProfile();
  const [showPremium, setShowPremium] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [imageError, setImageError] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPremium = profile?.isPremium ?? false;
  const maxFrames = isPremium ? FRAME_INDICES.length : FREE_FRAMES;
  const region = REGIONS[selectedRegion];
  const totalFrames = FRAME_INDICES.length;

  const currentImageUrl = getImageUrl(region.id, FRAME_INDICES[currentFrame]);

  useEffect(() => {
    const preloadCount = Math.min(maxFrames, totalFrames);
    for (let i = 0; i < preloadCount; i++) {
      const url = getImageUrl(region.id, FRAME_INDICES[i]);
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(url));
      };
      img.src = url;
    }
  }, [region.id, maxFrames, totalFrames]);

  const goToFrame = useCallback((frame: number) => {
    if (frame >= 0 && frame < maxFrames) {
      setCurrentFrame(frame);
      setImageError(false);
    } else if (frame >= maxFrames && !isPremium) {
      setIsPlaying(false);
      setShowPremium(true);
    }
  }, [maxFrames, isPremium]);

  const nextFrame = useCallback(() => {
    setCurrentFrame(prev => {
      const next = prev + 1;
      if (next >= maxFrames) {
        if (!isPremium) {
          setIsPlaying(false);
          setShowPremium(true);
          return prev;
        }
        return 0;
      }
      return next;
    });
    setImageError(false);
  }, [maxFrames, isPremium]);

  const prevFrame = useCallback(() => {
    setCurrentFrame(prev => {
      if (prev <= 0) return maxFrames - 1;
      return prev - 1;
    });
    setImageError(false);
  }, [maxFrames]);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        nextFrame();
      }, 800);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, nextFrame]);

  useEffect(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
    setImageError(false);
  }, [selectedRegion]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRegionMenu(false);
      }
    }
    if (showRegionMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRegionMenu]);

  const forecastHour = currentFrame * 6;
  const forecastDay = Math.floor(forecastHour / 24);
  const forecastHourOfDay = forecastHour % 24;

  return (
    <div className="flex flex-col h-full bg-slate-900" data-testid="swell-model-container">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />

      <div className="bg-gradient-to-r from-blue-800 to-blue-700 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img
            src={boardMeetingLogo}
            alt="Board Meeting"
            className="w-7 h-7 rounded-full object-cover border border-white/30"
          />
          <div>
            <h2 className="text-white font-bold text-sm leading-tight" data-testid="text-swell-title">Wave Model</h2>
            <p className="text-blue-200 text-[10px]">Powered by STORMSURF</p>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowRegionMenu(!showRegionMenu)}
            className="flex items-center gap-1 bg-white/15 text-white text-xs px-2.5 py-1.5 rounded-md"
            data-testid="button-swell-region-select"
          >
            {region.short}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showRegionMenu && (
            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/20 rounded-md shadow-xl z-50 min-w-[180px] py-1" data-testid="menu-swell-regions">
              {REGIONS.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRegion(i);
                    setShowRegionMenu(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm",
                    i === selectedRegion
                      ? "bg-blue-600 text-white"
                      : "text-white/80 hover:bg-white/10"
                  )}
                  data-testid={`button-region-${r.id}`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 border-b border-white/10">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={prevFrame}
            className="h-7 w-7 text-white/80"
            data-testid="button-swell-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-7 w-7 text-white/80"
            data-testid="button-swell-play"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={nextFrame}
            className="h-7 w-7 text-white/80"
            data-testid="button-swell-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-white text-xs">
          <span className="text-white/60">
            Frame {currentFrame + 1}/{isPremium ? totalFrames : FREE_FRAMES}
          </span>
          <span className="font-medium text-blue-300" data-testid="text-swell-forecast-info">
            +{forecastHour}hr (Day {forecastDay + 1}, {forecastHourOfDay.toString().padStart(2, '0')}Z)
          </span>
        </div>
      </div>

      <div className="bg-slate-800 px-2 py-1.5 border-b border-white/10">
        <div className="flex gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {Array.from({ length: isPremium ? totalFrames : totalFrames }).map((_, i) => {
            const isLocked = i >= maxFrames;
            const isActive = i === currentFrame;
            return (
              <button
                key={i}
                onClick={() => {
                  if (isLocked) {
                    setShowPremium(true);
                  } else {
                    goToFrame(i);
                  }
                }}
                className={cn(
                  "h-2 flex-1 min-w-[4px] max-w-[12px] rounded-sm transition-all",
                  isActive
                    ? "bg-blue-400 scale-y-150"
                    : isLocked
                      ? "bg-white/10"
                      : loadedImages.has(getImageUrl(region.id, FRAME_INDICES[i]))
                        ? "bg-blue-600/60"
                        : "bg-white/20"
                )}
                data-testid={`button-swell-frame-${i}`}
              />
            );
          })}
        </div>
        {!isPremium && (
          <div className="flex items-center justify-center mt-1.5">
            <button
              onClick={() => setShowPremium(true)}
              className="flex items-center gap-1 text-[10px] text-blue-400 font-medium"
              data-testid="button-swell-unlock-forecast"
            >
              <Lock className="h-2.5 w-2.5" />
              Unlock full 7-day forecast ($5/mo)
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden pb-16">
        {imageError ? (
          <div className="text-white/50 text-sm text-center p-4">
            <p>Unable to load forecast image</p>
            <p className="text-xs mt-1">Try selecting a different region or frame</p>
          </div>
        ) : (
          <img
            src={currentImageUrl}
            alt={`${region.name} Swell Height - +${forecastHour}hr forecast`}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            data-testid="img-swell-forecast"
          />
        )}

        {currentFrame >= maxFrames - 1 && !isPremium && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
            <Lock className="h-8 w-8 text-white/80 mb-2" />
            <p className="text-white font-semibold text-sm">Premium Forecast</p>
            <p className="text-white/70 text-xs mt-1 mb-3">Get the full 7-day swell forecast</p>
            <Button
              onClick={() => setShowPremium(true)}
              className="bg-blue-600 text-white text-sm"
              data-testid="button-swell-premium-overlay"
            >
              Upgrade - $5/mo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
