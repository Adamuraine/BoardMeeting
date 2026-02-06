import { useState, useEffect, useRef, useCallback } from "react";
import { useMyProfile } from "@/hooks/use-profiles";
import { Lock, SkipBack, SkipForward, Play, Pause, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";

const STORMSURF_BASE = "https://www.stormsurfing.com/stormuser2/images/grib";

const FRAME_INDICES = [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61];

const REGIONS = [
  { id: "scal_wave", name: "Southern California Swell", short: "SoCal Swell" },
  { id: "scal_comp", name: "Southern California Surf", short: "SoCal Surf" },
  { id: "ncal_wave", name: "Northern California Swell", short: "NorCal Swell" },
  { id: "ncal_comp", name: "Northern California Surf", short: "NorCal Surf" },
  { id: "hi_wave", name: "Hawaii Swell", short: "Hawaii" },
  { id: "nj_wave", name: "New Jersey Swell", short: "New Jersey" },
];

function getImageUrl(regionId: string, frameIndex: number): string {
  return `${STORMSURF_BASE}/${regionId}_${frameIndex}.png`;
}

const FREE_FRAMES = 9;
const PLAY_INTERVAL = 400;
const FADE_DURATION = 250;

export function SwellModel() {
  const { data: profile } = useMyProfile();
  const [showPremium, setShowPremium] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideControlsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const preloadedRef = useRef<HTMLImageElement[]>([]);

  const isPremium = profile?.isPremium ?? false;
  const maxFrames = isPremium ? FRAME_INDICES.length : FREE_FRAMES;
  const region = REGIONS[selectedRegion];
  const totalFrames = FRAME_INDICES.length;

  useEffect(() => {
    setImagesReady(false);
    setCurrentFrame(0);
    setIsPlaying(false);
    setImageError(false);
    setOpacity(1);

    const preloadCount = Math.min(maxFrames, totalFrames);
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 0; i < preloadCount; i++) {
      const url = getImageUrl(region.id, FRAME_INDICES[i]);
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= Math.min(3, preloadCount)) {
          setImagesReady(true);
          setIsPlaying(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= Math.min(3, preloadCount)) {
          setImagesReady(true);
        }
      };
      img.src = url;
      images.push(img);
    }
    preloadedRef.current = images;
  }, [region.id, maxFrames, totalFrames]);

  const fadeToFrame = useCallback((newFrame: number) => {
    setOpacity(0);
    setTimeout(() => {
      setCurrentFrame(newFrame);
      setImageError(false);
      setOpacity(1);
    }, FADE_DURATION);
  }, []);

  const nextFrame = useCallback(() => {
    setCurrentFrame(prev => {
      const next = prev + 1;
      if (next >= maxFrames) {
        return 0;
      }
      return next;
    });
  }, [maxFrames]);

  const prevFrame = useCallback(() => {
    setCurrentFrame(prev => {
      if (prev <= 0) return maxFrames - 1;
      return prev - 1;
    });
  }, [maxFrames]);

  useEffect(() => {
    if (isPlaying && imagesReady) {
      playIntervalRef.current = setInterval(() => {
        nextFrame();
      }, PLAY_INTERVAL);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, imagesReady, nextFrame]);

  const handleShowControls = useCallback(() => {
    setShowControls(true);
    if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    hideControlsRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleHideControls = useCallback(() => {
    if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    setShowControls(false);
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    };
  }, []);

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
  const currentImageUrl = getImageUrl(region.id, FRAME_INDICES[currentFrame]);

  return (
    <div className="flex flex-col h-full bg-black" data-testid="swell-model-container">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />

      <div className="bg-slate-900/90 px-3 py-2 flex items-center justify-between gap-2 border-b border-white/10 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm leading-tight truncate" data-testid="text-swell-title">
              {region.name}
            </h2>
            <p className="text-white/40 text-[10px]">STORMSURF Wave Model</p>
          </div>
        </div>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowRegionMenu(!showRegionMenu)}
            className="flex items-center gap-1 bg-white/10 text-white text-xs px-2.5 py-1.5 rounded-md"
            data-testid="button-swell-region-select"
          >
            {region.short}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showRegionMenu && (
            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/20 rounded-md shadow-xl z-50 min-w-[200px] py-1" data-testid="menu-swell-regions">
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

      <div
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
        ref={imageContainerRef}
        onMouseEnter={handleShowControls}
        onMouseLeave={handleHideControls}
        onTouchStart={handleShowControls}
        data-testid="swell-image-area"
      >
        {!imagesReady ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/50 text-sm">Loading forecast...</p>
          </div>
        ) : imageError ? (
          <div className="text-white/50 text-sm text-center p-4">
            <p>Unable to load forecast image</p>
            <p className="text-xs mt-1">Try selecting a different region</p>
          </div>
        ) : (
          <img
            src={currentImageUrl}
            alt={`${region.name} - +${forecastHour}hr forecast`}
            className="w-full h-full object-contain"
            style={{
              opacity,
              transition: `opacity ${FADE_DURATION}ms ease-in-out`,
            }}
            onError={() => setImageError(true)}
            data-testid="img-swell-forecast"
          />
        )}

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex items-center gap-1 pointer-events-auto bg-black/60 rounded-full px-2 py-1.5 backdrop-blur-sm" data-testid="swell-overlay-controls">
            <button
              onClick={(e) => { e.stopPropagation(); prevFrame(); handleShowControls(); }}
              className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              data-testid="button-swell-prev"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); handleShowControls(); }}
              className="w-12 h-12 flex items-center justify-center text-white bg-white/15 hover:bg-white/25 rounded-full transition-colors"
              data-testid="button-swell-play"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextFrame(); handleShowControls(); }}
              className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              data-testid="button-swell-next"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-3">
          <div className="flex items-center justify-between text-white text-xs mb-1.5">
            <span className="font-medium" data-testid="text-swell-forecast-info">
              +{forecastHour}hr
            </span>
            <span className="text-white/50">
              {currentFrame + 1} / {isPremium ? totalFrames : `${FREE_FRAMES} free`}
            </span>
          </div>
          <div className="flex gap-[2px]">
            {Array.from({ length: totalFrames }).map((_, i) => {
              const isLocked = i >= maxFrames;
              const isActive = i === currentFrame;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isLocked) {
                      setShowPremium(true);
                    } else {
                      fadeToFrame(i);
                    }
                  }}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all",
                    isActive
                      ? "bg-white h-1.5"
                      : isLocked
                        ? "bg-white/15"
                        : "bg-white/40"
                  )}
                  data-testid={`button-swell-frame-${i}`}
                />
              );
            })}
          </div>
          {!isPremium && (
            <button
              onClick={() => setShowPremium(true)}
              className="flex items-center gap-1 text-[10px] text-blue-400 font-medium mt-1.5 mx-auto"
              data-testid="button-swell-unlock-forecast"
            >
              <Lock className="h-2.5 w-2.5" />
              Unlock full 7-day forecast ($5/mo)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
