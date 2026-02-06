import { useState, useEffect, useRef, useCallback } from "react";
import { useMyProfile } from "@/hooks/use-profiles";
import { Lock, SkipBack, SkipForward, Play, Pause, ChevronDown, MapPin, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";

const STORMSURF_BASE = "https://www.stormsurfing.com/stormuser2/images/grib";

const FRAME_INDICES = [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61];

interface Region {
  id: string;
  name: string;
  short: string;
  source: "stormsurf" | "windy";
  lat?: number;
  lng?: number;
  zoom?: number;
}

const REGIONS: Region[] = [
  { id: "scal_wave", name: "Southern California Swell", short: "SoCal Swell", source: "stormsurf" },
  { id: "scal_comp", name: "Southern California Surf", short: "SoCal Surf", source: "stormsurf" },
  { id: "ncal_wave", name: "Northern California Swell", short: "NorCal Swell", source: "stormsurf" },
  { id: "ncal_comp", name: "Northern California Surf", short: "NorCal Surf", source: "stormsurf" },
  { id: "hi_wave", name: "Hawaii Swell", short: "Hawaii", source: "stormsurf" },
  { id: "hi_comp", name: "Hawaii Surf", short: "Hawaii Surf", source: "stormsurf" },
  { id: "nj_wave", name: "New Jersey Swell", short: "New Jersey", source: "stormsurf" },
  { id: "nj_comp", name: "New Jersey Surf", short: "NJ Surf", source: "stormsurf" },
  { id: "mex_wave", name: "Mexico Swell", short: "Mexico", source: "stormsurf" },
  { id: "mex_comp", name: "Mexico Surf", short: "Mexico Surf", source: "stormsurf" },
  { id: "w_florida", name: "Florida", short: "Florida", source: "windy", lat: 28.0, lng: -80.5, zoom: 7 },
  { id: "w_north_pacific", name: "North Pacific", short: "N. Pacific", source: "windy", lat: 35.0, lng: -170.0, zoom: 3 },
  { id: "w_south_pacific", name: "South Pacific", short: "S. Pacific", source: "windy", lat: -15.0, lng: -150.0, zoom: 3 },
  { id: "w_indonesia", name: "Indonesia", short: "Indo", source: "windy", lat: -8.5, lng: 115.5, zoom: 7 },
  { id: "w_australia_east", name: "Australia (East)", short: "Aus East", source: "windy", lat: -28.5, lng: 153.5, zoom: 7 },
  { id: "w_australia_west", name: "Australia (West)", short: "Aus West", source: "windy", lat: -31.5, lng: 115.5, zoom: 7 },
  { id: "w_portugal", name: "Portugal", short: "Portugal", source: "windy", lat: 39.5, lng: -9.5, zoom: 7 },
  { id: "w_france", name: "France", short: "France", source: "windy", lat: 44.0, lng: -1.5, zoom: 7 },
  { id: "w_uk_ireland", name: "UK & Ireland", short: "UK/Ireland", source: "windy", lat: 52.5, lng: -9.0, zoom: 6 },
  { id: "w_south_africa", name: "South Africa", short: "S. Africa", source: "windy", lat: -33.9, lng: 18.5, zoom: 7 },
  { id: "w_japan", name: "Japan", short: "Japan", source: "windy", lat: 33.5, lng: 134.0, zoom: 6 },
  { id: "w_costa_rica", name: "Costa Rica", short: "Costa Rica", source: "windy", lat: 9.5, lng: -84.5, zoom: 7 },
  { id: "w_peru", name: "Peru", short: "Peru", source: "windy", lat: -12.0, lng: -77.5, zoom: 7 },
  { id: "w_chile", name: "Chile", short: "Chile", source: "windy", lat: -33.0, lng: -72.0, zoom: 7 },
  { id: "w_north_atlantic", name: "North Atlantic", short: "N. Atlantic", source: "windy", lat: 45.0, lng: -30.0, zoom: 3 },
  { id: "w_indian_ocean", name: "Indian Ocean", short: "Indian", source: "windy", lat: -10.0, lng: 75.0, zoom: 3 },
  { id: "w_global", name: "Global View", short: "Global", source: "windy", lat: 10.0, lng: -30.0, zoom: 2 },
];

const REGION_GROUPS = [
  { label: "Stormsurf Models", indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { label: "USA", indices: [10] },
  { label: "Pacific", indices: [11, 12, 13, 14, 15, 21, 22, 23] },
  { label: "Atlantic / Europe", indices: [16, 17, 18, 24] },
  { label: "Other", indices: [19, 20, 25, 26] },
];

function getImageUrl(regionId: string, frameIndex: number): string {
  return `${STORMSURF_BASE}/${regionId}_${frameIndex}.png`;
}

function buildWindyUrl(lat: number, lng: number, zoom: number): string {
  return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=${zoom}&overlay=swell1&product=gfsWave&level=surface&lat=${lat}&lon=${lng}`;
}

const FREE_FRAMES = 9;
const PLAY_INTERVAL = 400;
const FADE_DURATION = 250;

function StormsurfPlayer({ region, isPremium, onShowPremium }: { region: Region; isPremium: boolean; onShowPremium: () => void }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideControlsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadedRef = useRef<HTMLImageElement[]>([]);

  const maxFrames = isPremium ? FRAME_INDICES.length : FREE_FRAMES;
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
      if (next >= maxFrames) return 0;
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

  const forecastHour = currentFrame * 6;
  const currentImageUrl = getImageUrl(region.id, FRAME_INDICES[currentFrame]);

  return (
    <div
      className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
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
                    onShowPremium();
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
            onClick={() => onShowPremium()}
            className="flex items-center gap-1 text-[10px] text-blue-400 font-medium mt-1.5 mx-auto"
            data-testid="button-swell-unlock-forecast"
          >
            <Lock className="h-2.5 w-2.5" />
            Unlock full 7-day forecast ($5/mo)
          </button>
        )}
      </div>
    </div>
  );
}

function WindyPlayer({ region, isPremium, onShowPremium }: { region: Region; isPremium: boolean; onShowPremium: () => void }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const windyUrl = buildWindyUrl(region.lat!, region.lng!, region.zoom!);

  useEffect(() => {
    setIframeLoaded(false);
  }, [region.id]);

  return (
    <div className="flex-1 relative bg-black" data-testid="swell-map-area">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
          <div className="w-8 h-8 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-white/50 text-sm mt-3">Loading swell model...</p>
        </div>
      )}

      <iframe
        key={region.id}
        src={windyUrl}
        title={`Swell Model - ${region.name}`}
        className="w-full h-full border-0"
        onLoad={() => setIframeLoaded(true)}
        allow="fullscreen"
        data-testid="iframe-swell-map"
      />

      {!isPremium && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-6 pb-2 px-3 pointer-events-none">
          <button
            onClick={() => onShowPremium()}
            className="flex items-center gap-1.5 text-xs text-blue-400 font-medium mx-auto pointer-events-auto"
            data-testid="button-swell-unlock-forecast"
          >
            <Lock className="h-3 w-3" />
            Extended 7-day forecast ($5/mo)
          </button>
        </div>
      )}
    </div>
  );
}

export function SwellModel() {
  const { data: profile } = useMyProfile();
  const [showPremium, setShowPremium] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPremium = profile?.isPremium ?? false;
  const region = REGIONS[selectedRegion];

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

  const quickChips = [0, 2, 4, 6, 8, 10, 13, 16, 20, 26];

  return (
    <div className="flex flex-col h-full bg-black" data-testid="swell-model-container">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />

      <div className="bg-slate-900/95 px-3 py-2 flex items-center justify-between gap-2 border-b border-white/10 z-10">
        <div className="flex items-center gap-2 min-w-0">
          {region.source === "stormsurf" ? (
            <Globe className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          ) : (
            <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm leading-tight truncate" data-testid="text-swell-title">
              {region.name}
            </h2>
            <p className="text-white/40 text-[10px]">
              {region.source === "stormsurf" ? "STORMSURF Wave Model" : "Swell Model \u00b7 Interactive Map"}
            </p>
          </div>
        </div>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowRegionMenu(!showRegionMenu)}
            className="flex items-center gap-1 bg-white/10 text-white text-xs px-2.5 py-1.5 rounded-md"
            data-testid="button-swell-region-select"
          >
            <MapPin className="h-3 w-3" />
            {region.short}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showRegionMenu && (
            <div
              className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/20 rounded-md shadow-xl z-50 min-w-[240px] max-h-[60vh] overflow-y-auto py-1"
              data-testid="menu-swell-regions"
            >
              {REGION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.indices.map((idx) => {
                    const r = REGIONS[idx];
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedRegion(idx);
                          setShowRegionMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2",
                          idx === selectedRegion
                            ? "bg-blue-600 text-white"
                            : "text-white/80 hover:bg-white/10"
                        )}
                        data-testid={`button-region-${r.id}`}
                      >
                        {r.source === "stormsurf" ? (
                          <Globe className="h-3 w-3 flex-shrink-0 text-cyan-400" />
                        ) : (
                          <MapPin className="h-3 w-3 flex-shrink-0 opacity-50" />
                        )}
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-slate-900/80 px-2 py-1.5 border-b border-white/10 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-1.5 min-w-max">
          {quickChips.map((idx) => {
            const r = REGIONS[idx];
            return (
              <button
                key={idx}
                onClick={() => setSelectedRegion(idx)}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap transition-colors",
                  idx === selectedRegion
                    ? "bg-blue-600 text-white"
                    : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white/80"
                )}
                data-testid={`chip-region-${idx}`}
              >
                {r.short}
              </button>
            );
          })}
          <button
            onClick={() => setShowRegionMenu(true)}
            className="px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap bg-white/8 text-white/60 hover:bg-white/15 hover:text-white/80"
            data-testid="chip-region-more"
          >
            More...
          </button>
        </div>
      </div>

      {region.source === "stormsurf" ? (
        <StormsurfPlayer
          region={region}
          isPremium={isPremium}
          onShowPremium={() => setShowPremium(true)}
        />
      ) : (
        <WindyPlayer
          region={region}
          isPremium={isPremium}
          onShowPremium={() => setShowPremium(true)}
        />
      )}
    </div>
  );
}
