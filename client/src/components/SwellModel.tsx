import { useState, useRef, useEffect } from "react";
import { useMyProfile } from "@/hooks/use-profiles";
import { Lock, MapPin, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { PremiumModal } from "@/components/PremiumModal";

interface Region {
  name: string;
  short: string;
  lat: number;
  lng: number;
  zoom: number;
}

const REGIONS: Region[] = [
  { name: "Southern California", short: "SoCal", lat: 33.0, lng: -117.5, zoom: 7 },
  { name: "Northern California", short: "NorCal", lat: 37.5, lng: -122.5, zoom: 7 },
  { name: "Hawaii", short: "Hawaii", lat: 21.3, lng: -157.8, zoom: 7 },
  { name: "North Shore Oahu", short: "N. Shore", lat: 21.6, lng: -158.1, zoom: 10 },
  { name: "New Jersey", short: "NJ", lat: 39.9, lng: -74.0, zoom: 8 },
  { name: "Florida", short: "Florida", lat: 28.0, lng: -80.5, zoom: 7 },
  { name: "North Pacific", short: "N. Pacific", lat: 35.0, lng: -170.0, zoom: 3 },
  { name: "South Pacific", short: "S. Pacific", lat: -15.0, lng: -150.0, zoom: 3 },
  { name: "Indonesia", short: "Indo", lat: -8.5, lng: 115.5, zoom: 7 },
  { name: "Australia (East)", short: "Aus East", lat: -28.5, lng: 153.5, zoom: 7 },
  { name: "Australia (West)", short: "Aus West", lat: -31.5, lng: 115.5, zoom: 7 },
  { name: "Portugal", short: "Portugal", lat: 39.5, lng: -9.5, zoom: 7 },
  { name: "France", short: "France", lat: 44.0, lng: -1.5, zoom: 7 },
  { name: "UK & Ireland", short: "UK/Ireland", lat: 52.5, lng: -9.0, zoom: 6 },
  { name: "South Africa", short: "S. Africa", lat: -33.9, lng: 18.5, zoom: 7 },
  { name: "Japan", short: "Japan", lat: 33.5, lng: 134.0, zoom: 6 },
  { name: "Mexico (Baja)", short: "Baja", lat: 23.0, lng: -109.5, zoom: 7 },
  { name: "Costa Rica", short: "Costa Rica", lat: 9.5, lng: -84.5, zoom: 7 },
  { name: "Peru", short: "Peru", lat: -12.0, lng: -77.5, zoom: 7 },
  { name: "Chile", short: "Chile", lat: -33.0, lng: -72.0, zoom: 7 },
  { name: "North Atlantic", short: "N. Atlantic", lat: 45.0, lng: -30.0, zoom: 3 },
  { name: "Indian Ocean", short: "Indian", lat: -10.0, lng: 75.0, zoom: 3 },
  { name: "Global View", short: "Global", lat: 10.0, lng: -30.0, zoom: 2 },
];

const REGION_GROUPS = [
  { label: "USA", regions: [0, 1, 2, 3, 4, 5] },
  { label: "Pacific", regions: [6, 7, 8, 9, 10, 16, 17, 18, 19] },
  { label: "Atlantic / Europe", regions: [11, 12, 13, 20] },
  { label: "Other", regions: [14, 15, 21, 22] },
];

function buildWindyUrl(lat: number, lng: number, zoom: number): string {
  return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=${zoom}&overlay=swell1&product=gfsWave&level=surface&lat=${lat}&lon=${lng}`;
}

export function SwellModel() {
  const { data: profile } = useMyProfile();
  const [showPremium, setShowPremium] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(0);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPremium = profile?.isPremium ?? false;
  const region = REGIONS[selectedRegion];
  const windyUrl = buildWindyUrl(region.lat, region.lng, region.zoom);

  useEffect(() => {
    setIframeLoaded(false);
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

  return (
    <div className="flex flex-col h-full bg-black" data-testid="swell-model-container">
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />

      <div className="bg-slate-900/95 px-3 py-2 flex items-center justify-between gap-2 border-b border-white/10 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-white font-bold text-sm leading-tight truncate" data-testid="text-swell-title">
              {region.name}
            </h2>
            <p className="text-white/40 text-[10px]">Swell Model &middot; Worldwide</p>
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
              className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/20 rounded-md shadow-xl z-50 min-w-[220px] max-h-[60vh] overflow-y-auto py-1"
              data-testid="menu-swell-regions"
            >
              {REGION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.regions.map((idx) => {
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
                        data-testid={`button-region-${idx}`}
                      >
                        <MapPin className="h-3 w-3 flex-shrink-0 opacity-50" />
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
          {REGIONS.slice(0, 10).map((r, i) => (
            <button
              key={i}
              onClick={() => setSelectedRegion(i)}
              className={cn(
                "px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap transition-colors",
                i === selectedRegion
                  ? "bg-blue-600 text-white"
                  : "bg-white/8 text-white/60 hover:bg-white/15 hover:text-white/80"
              )}
              data-testid={`chip-region-${i}`}
            >
              {r.short}
            </button>
          ))}
          <button
            onClick={() => setShowRegionMenu(true)}
            className="px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap bg-white/8 text-white/60 hover:bg-white/15 hover:text-white/80"
            data-testid="chip-region-more"
          >
            More...
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-black" data-testid="swell-map-area">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
            <div className="w-8 h-8 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-white/50 text-sm mt-3">Loading swell model...</p>
          </div>
        )}

        <iframe
          key={selectedRegion}
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
              onClick={() => setShowPremium(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 font-medium mx-auto pointer-events-auto"
              data-testid="button-swell-unlock-forecast"
            >
              <Lock className="h-3 w-3" />
              Extended 7-day forecast - $5/mo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
