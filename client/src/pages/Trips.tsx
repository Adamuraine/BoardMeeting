import { useTrips, useCreateTrip, useUpdateTripActivities } from "@/hooks/use-trips";
import { useMyProfile, useUpdateProfile } from "@/hooks/use-profiles";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, MapPin, Car, Anchor, Plane, Users, ThumbsUp, ArrowRight, Sailboat, Umbrella, Beer, Leaf, Fish, Footprints, Share2, Download } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema, type CreateTripRequest } from "@shared/routes";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { type DateRange } from "react-day-picker";
import treasureMapBg from "@assets/IMG_2639_1767484629952.jpeg";

const LOCATIONS = [
  "Oceanside, CA",
  "Carlsbad, CA",
  "Encinitas, CA",
  "San Diego, CA",
  "La Jolla, CA",
  "Del Mar, CA",
  "Pacific Beach, CA",
  "Mission Beach, CA",
  "Imperial Beach, CA",
  "Huntington Beach, CA",
  "Newport Beach, CA",
  "Trestles, CA",
  "Malibu, CA",
  "Santa Cruz, CA",
  "Hawaii",
  "Bali, Indonesia",
  "Costa Rica",
  "Portugal",
  "Australia",
];

const REGIONS: Record<string, string[]> = {
  "San Diego County": ["Oceanside, CA", "Carlsbad, CA", "Encinitas, CA", "San Diego, CA", "La Jolla, CA", "Del Mar, CA", "Pacific Beach, CA", "Mission Beach, CA", "Imperial Beach, CA"],
  "Orange County": ["Huntington Beach, CA", "Newport Beach, CA", "Trestles, CA"],
  "Los Angeles": ["Malibu, CA"],
  "Northern California": ["Santa Cruz, CA"],
  "International": ["Hawaii", "Bali, Indonesia", "Costa Rica", "Portugal", "Australia"],
};

const ACTIVITY_OPTIONS = [
  { id: "surfboard", label: "Surfing", icon: Sailboat },
  { id: "sandals", label: "Beach", icon: Footprints },
  { id: "beer", label: "Drinks", icon: Beer },
  { id: "umbrella", label: "Relax", icon: Umbrella },
  { id: "boat", label: "Boat", icon: Anchor },
  { id: "fishing", label: "Fishing", icon: Fish },
  { id: "leaf", label: "Nature", icon: Leaf },
];

const WAVE_TYPE_OPTIONS = [
  { id: "point_break", label: "Point Break" },
  { id: "beach_break", label: "Beach Break" },
  { id: "outer_reef", label: "Outer Reef" },
  { id: "beginner_crumbly", label: "Beginner (Long & Crumbly)" },
  { id: "long_performance", label: "Long & Performance" },
];

const PRICE_RANGES = [
  { id: "budget", label: "$", min: 0, max: 500 },
  { id: "moderate", label: "$$", min: 500, max: 1500 },
  { id: "premium", label: "$$$", min: 1500, max: 5000 },
  { id: "luxury", label: "$$$$", min: 5000, max: null },
];

export default function Trips() {
  const { data: trips, isLoading } = useTrips();
  const { data: myProfile } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useAuth();
  const createTrip = useCreateTrip();
  const updateActivities = useUpdateTripActivities();
  const [open, setOpen] = useState(false);
  const [tripDetailsOpen, setTripDetailsOpen] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<number | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [startFilter, setStartFilter] = useState<string>("");
  const [destFilter, setDestFilter] = useState<string>("");
  // Expense inputs
  const [houseRental, setHouseRental] = useState<string>("");
  const [taxiRides, setTaxiRides] = useState<string>("");
  const [boatTrips, setBoatTrips] = useState<string>("");
  const [cookingMeals, setCookingMeals] = useState<string>("");
  const [boardRental, setBoardRental] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [flexibleLocation, setFlexibleLocation] = useState(false);
  const [selectedWaveTypes, setSelectedWaveTypes] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleLetsGo = () => {
    if (!user || !destFilter || destFilter === "all" || !dateRange?.from || !dateRange?.to) {
      setOpen(true);
      return;
    }

    const priceConfig = selectedPriceRange ? PRICE_RANGES.find(p => p.id === selectedPriceRange) : null;
    
    createTrip.mutate({
      organizerId: user.id,
      destination: destFilter,
      startingLocation: startFilter && startFilter !== "all" ? startFilter : undefined,
      startDate: format(dateRange.from, "yyyy-MM-dd"),
      endDate: format(dateRange.to, "yyyy-MM-dd"),
      tripType: "surf_trip",
      waveType: selectedWaveTypes.length > 0 ? selectedWaveTypes : undefined,
      priceRangeMin: priceConfig?.min ?? undefined,
      priceRangeMax: priceConfig?.max ?? undefined,
      approximateDates: flexibleDates,
    }, {
      onSuccess: (trip) => {
        setCreatedTripId(trip.id);
        setTripDetailsOpen(true);
        setDateRange(undefined);
      }
    });
  };

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(a => a !== activityId)
        : [...prev, activityId]
    );
  };

  const getRegionLocations = (location: string): string[] => {
    for (const [region, locs] of Object.entries(REGIONS)) {
      if (locs.includes(location)) return locs;
    }
    return [location];
  };

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter(trip => {
      if (trip.isVisiting) return false;
      if (trip.tripType === 'beach_carpool') return false;
      
      if (startFilter && startFilter !== "all") {
        if (flexibleLocation) {
          const regionLocs = getRegionLocations(startFilter);
          if (!regionLocs.includes(trip.startingLocation || "")) return false;
        } else {
          if (trip.startingLocation !== startFilter) return false;
        }
      }
      
      if (destFilter && destFilter !== "all") {
        if (flexibleLocation) {
          const regionLocs = getRegionLocations(destFilter);
          if (!regionLocs.includes(trip.destination)) return false;
        } else {
          if (trip.destination !== destFilter) return false;
        }
      }
      
      if (!flexibleDates && dateRange) {
        if (dateRange.from && new Date(trip.startDate) < dateRange.from) return false;
        if (dateRange.to && new Date(trip.endDate) > dateRange.to) return false;
      }

      if (selectedWaveTypes.length > 0 && trip.waveType) {
        const hasMatchingWave = selectedWaveTypes.some(wt => trip.waveType?.includes(wt));
        if (!hasMatchingWave) return false;
      }

      if (selectedPriceRange) {
        const priceConfig = PRICE_RANGES.find(p => p.id === selectedPriceRange);
        if (priceConfig) {
          const tripMin = trip.priceRangeMin ?? trip.cost ?? 0;
          const tripMax = trip.priceRangeMax ?? trip.cost ?? 0;
          if (tripMax < priceConfig.min) return false;
          if (priceConfig.max && tripMin > priceConfig.max) return false;
        }
      }
      
      return true;
    });
  }, [trips, startFilter, destFilter, dateRange, flexibleDates, flexibleLocation, selectedWaveTypes, selectedPriceRange]);

  const visitingTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter(trip => trip.isVisiting);
  }, [trips]);

  const carpoolTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter(trip => !trip.isVisiting && trip.tripType === 'beach_carpool');
  }, [trips]);

  return (
    <Layout>
      <div 
        className="h-full flex flex-col relative"
        style={{
          backgroundImage: `url(${treasureMapBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-background/70 dark:bg-background/80" />
        
        <div className="relative z-10 p-4 pb-20 h-full flex flex-col">
          <header className="mb-4">
            <div className="flex justify-between items-start gap-2 mb-3">
              <h1 className="text-3xl font-display font-bold text-foreground">Surf Trips</h1>
              <CreateTripDialog open={open} onOpenChange={setOpen} />
            </div>
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 dark:from-cyan-600/30 dark:to-blue-600/30 backdrop-blur-sm rounded-xl p-3 border border-cyan-400/30 dark:border-cyan-500/40">
              <p className="text-sm text-foreground leading-relaxed">
                Save money by traveling with a buddy, or explore new surf destinations without the worry of going alone. Team up with someone who knows the ins and outs, the lefts and rights.
              </p>
            </div>
          </header>

        <Tabs defaultValue="trips" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="trips" data-testid="tab-trips">
              <Car className="w-4 h-4 mr-1" />
              Trips
            </TabsTrigger>
            <TabsTrigger value="carpool" data-testid="tab-carpool">
              <ThumbsUp className="w-4 h-4 mr-1" />
              Rides
            </TabsTrigger>
            <TabsTrigger value="visiting" data-testid="tab-visiting">
              <Plane className="w-4 h-4 mr-1" />
              Visiting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="flex-1 space-y-4 mt-0 overflow-y-auto">
            <div className="bg-card/90 backdrop-blur-sm rounded-xl p-3 border border-border/50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Starting From</Label>
                  <Select value={startFilter} onValueChange={setStartFilter}>
                    <SelectTrigger className="h-10" data-testid="select-start-location">
                      <SelectValue placeholder="Any location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any location</SelectItem>
                      {LOCATIONS.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Destination</Label>
                  <Select value={destFilter} onValueChange={setDestFilter}>
                    <SelectTrigger className="h-10" data-testid="select-destination">
                      <SelectValue placeholder="Any destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any destination</SelectItem>
                      {LOCATIONS.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trip Dates</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground",
                        flexibleDates && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={flexibleDates}
                      data-testid="button-date-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        <span>Select dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      data-testid="calendar-date-range"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={flexibleDates} 
                    onCheckedChange={setFlexibleDates}
                    data-testid="switch-flexible-dates"
                  />
                  <Label className="text-xs cursor-pointer" onClick={() => setFlexibleDates(!flexibleDates)}>
                    Flexible on dates
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={flexibleLocation} 
                    onCheckedChange={setFlexibleLocation}
                    data-testid="switch-flexible-location"
                  />
                  <Label className="text-xs cursor-pointer" onClick={() => setFlexibleLocation(!flexibleLocation)}>
                    Nearby areas OK
                  </Label>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full text-xs text-muted-foreground"
                data-testid="button-advanced-filters"
              >
                {showAdvancedFilters ? "Hide" : "Show"} Wave & Budget Options
              </Button>

              {showAdvancedFilters && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Wave Type</Label>
                    <div className="flex flex-wrap gap-2">
                      {WAVE_TYPE_OPTIONS.map((wave) => (
                        <button
                          key={wave.id}
                          onClick={() => setSelectedWaveTypes(prev => 
                            prev.includes(wave.id) 
                              ? prev.filter(w => w !== wave.id)
                              : [...prev, wave.id]
                          )}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedWaveTypes.includes(wave.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover-elevate"
                          }`}
                          data-testid={`button-wave-${wave.id}`}
                        >
                          {wave.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Budget Range</Label>
                    <div className="flex gap-2">
                      {PRICE_RANGES.map((price) => (
                        <button
                          key={price.id}
                          onClick={() => setSelectedPriceRange(prev => prev === price.id ? "" : price.id)}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            selectedPriceRange === price.id
                              ? "bg-green-500 text-white"
                              : "bg-secondary text-secondary-foreground hover-elevate"
                          }`}
                          data-testid={`button-price-${price.id}`}
                        >
                          {price.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {selectedPriceRange ? 
                        PRICE_RANGES.find(p => p.id === selectedPriceRange)?.max 
                          ? `$${PRICE_RANGES.find(p => p.id === selectedPriceRange)?.min} - $${PRICE_RANGES.find(p => p.id === selectedPriceRange)?.max}`
                          : `$${PRICE_RANGES.find(p => p.id === selectedPriceRange)?.min}+`
                        : "Select a budget range"
                      }
                    </p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleLetsGo}
                disabled={createTrip.isPending}
                className="w-full bg-green-500 text-white font-semibold"
                data-testid="button-lets-go"
              >
                {createTrip.isPending ? "Creating..." : "Let's Go!"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <Dialog open={tripDetailsOpen} onOpenChange={setTripDetailsOpen}>
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sailboat className="w-5 h-5 text-primary" />
                    Add Trip Details
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Trip to <span className="font-semibold text-foreground">{destFilter}</span> created! Add activities and costs:
                  </p>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Activities</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {ACTIVITY_OPTIONS.map((activity) => {
                        const Icon = activity.icon;
                        const isSelected = selectedActivities.includes(activity.id);
                        return (
                          <button
                            key={activity.id}
                            onClick={() => toggleActivity(activity.id)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/10 text-primary" 
                                : "border-border bg-card hover-elevate"
                            }`}
                            data-testid={`button-activity-${activity.id}`}
                          >
                            <Icon className="w-6 h-6" />
                            <span className="text-xs">{activity.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <Label className="text-xs font-medium">Trip Expenses (Total Cost)</Label>
                    <p className="text-xs text-muted-foreground">
                      Enter total costs - these will be split among travelers
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">House Rental</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={houseRental}
                            onChange={(e) => setHouseRental(e.target.value)}
                            className="pl-7"
                            data-testid="input-house-rental"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Taxi/Transport</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={taxiRides}
                            onChange={(e) => setTaxiRides(e.target.value)}
                            className="pl-7"
                            data-testid="input-taxi-rides"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Boat Trips</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={boatTrips}
                            onChange={(e) => setBoatTrips(e.target.value)}
                            className="pl-7"
                            data-testid="input-boat-trips"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Food/Chef</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={cookingMeals}
                            onChange={(e) => setCookingMeals(e.target.value)}
                            className="pl-7"
                            data-testid="input-cooking-meals"
                          />
                        </div>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs text-muted-foreground">Board Rental / Surfboard Travel</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={boardRental}
                            onChange={(e) => setBoardRental(e.target.value)}
                            className="pl-7"
                            data-testid="input-board-rental"
                          />
                        </div>
                      </div>
                    </div>
                    {(houseRental || taxiRides || boatTrips || cookingMeals || boardRental) && (
                      <div className="bg-primary/10 rounded-lg p-3 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Total Trip Cost</span>
                          <span className="text-lg font-bold text-primary">
                            ${(parseInt(houseRental || "0") + parseInt(taxiRides || "0") + parseInt(boatTrips || "0") + parseInt(cookingMeals || "0") + parseInt(boardRental || "0")).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Per person with 4 travelers: ${Math.round((parseInt(houseRental || "0") + parseInt(taxiRides || "0") + parseInt(boatTrips || "0") + parseInt(cookingMeals || "0") + parseInt(boardRental || "0")) / 4).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={async () => {
                      if (createdTripId) {
                        updateActivities.mutate({ 
                          tripId: createdTripId, 
                          activities: selectedActivities,
                          houseRental: houseRental ? parseInt(houseRental) : undefined,
                          taxiRides: taxiRides ? parseInt(taxiRides) : undefined,
                          boatTrips: boatTrips ? parseInt(boatTrips) : undefined,
                          cookingMeals: cookingMeals ? parseInt(cookingMeals) : undefined,
                          boardRental: boardRental ? parseInt(boardRental) : undefined,
                        }, {
                          onSuccess: () => {
                            setTripDetailsOpen(false);
                            setSelectedActivities([]);
                            setCreatedTripId(null);
                            setHouseRental("");
                            setTaxiRides("");
                            setBoatTrips("");
                            setCookingMeals("");
                            setBoardRental("");
                          }
                        });
                      } else {
                        setTripDetailsOpen(false);
                        setSelectedActivities([]);
                        setCreatedTripId(null);
                      }
                    }}
                    disabled={updateActivities.isPending}
                    className="w-full"
                    data-testid="button-save-trip-details"
                  >
                    {updateActivities.isPending ? "Saving..." : "Save Trip"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
                {filteredTrips.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No trips match your filters</p>
                    <p className="text-sm">Try adjusting your search or create a new trip</p>
                  </div>
                )}

                {/* Share Board Meeting QR Code */}
                <div className="bg-card/90 backdrop-blur-sm rounded-xl p-4 border border-border/50 mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Share2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Share Board Meeting</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Invite your surf buddies! Scan or share this QR code to download the app.
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-3 rounded-xl">
                      <img 
                        src="/boardmeeting-qr-code.png" 
                        alt="Board Meeting QR Code" 
                        className="w-40 h-40"
                        data-testid="img-qr-code"
                      />
                    </div>
                    <a 
                      href="/boardmeeting-qr-code.png" 
                      download="boardmeeting-qr-code.png"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid="link-download-qr"
                    >
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </a>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="carpool" className="flex-1 space-y-4 mt-0 overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 dark:from-green-600/30 dark:to-emerald-600/30 rounded-xl p-4 border border-green-400/30 dark:border-green-500/40">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center shrink-0">
                  <ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Need a Ride to the Beach?</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect with surfers who can give you a ride to local surf spots. No car? No problem!
                  </p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {carpoolTrips.map((trip) => (
                  <CarpoolCard key={trip.id} trip={trip} />
                ))}
                {carpoolTrips.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No carpool offers yet</p>
                    <p className="text-sm">Offer a ride or request one!</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="visiting" className="flex-1 space-y-4 mt-0">
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-600/30 dark:to-orange-600/30 rounded-xl p-4 border border-amber-400/30 dark:border-amber-500/40">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Solo Travelers</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect with surfers visiting your area or find locals when you travel to a new spot
                  </p>
                </div>
              </div>
            </div>

            {/* Open to Guiding Toggle */}
            <div className="bg-card/90 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-foreground">Open to Meeting/Guiding Travelers</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show on your profile that you're willing to meet or guide visitors in your area
                  </p>
                </div>
                <Switch
                  checked={myProfile?.openToGuiding ?? false}
                  onCheckedChange={(checked) => {
                    updateProfile.mutate({ openToGuiding: checked });
                  }}
                  className="data-[state=checked]:bg-green-500"
                  data-testid="switch-open-to-guiding"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {visitingTrips.map((trip) => (
                  <VisitingCard key={trip.id} trip={trip} />
                ))}
                {visitingTrips.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Plane className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No visitors yet</p>
                    <p className="text-sm">Be the first to post you're visiting an area!</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </Layout>
  );
}

function TripCard({ trip }: { trip: any }) {
  const [, setLocation] = useLocation();
  
  const getBudgetDisplay = () => {
    if (trip.priceRangeMin != null || trip.priceRangeMax != null) {
      if (trip.priceRangeMax) {
        return `$${trip.priceRangeMin || 0} - $${trip.priceRangeMax}`;
      }
      return `$${trip.priceRangeMin}+`;
    }
    return `$${trip.cost || 0}`;
  };

  const getWaveTypeLabels = () => {
    if (!trip.waveType || trip.waveType.length === 0) return null;
    return trip.waveType.map((wt: string) => 
      WAVE_TYPE_OPTIONS.find(w => w.id === wt)?.label || wt
    ).slice(0, 2);
  };

  const waveLabels = getWaveTypeLabels();
  
  return (
    <div 
      className="bg-card rounded-2xl p-5 border border-border shadow-sm hover-elevate cursor-pointer" 
      data-testid={`card-trip-${trip.id}`}
      onClick={() => setLocation(`/trips/${trip.id}`)}
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center text-xs text-primary font-bold uppercase tracking-wider mb-1">
            {trip.tripType === 'carpool' ? <Car className="w-3 h-3 mr-1" /> : <Anchor className="w-3 h-3 mr-1" />}
            {trip.tripType}
            {trip.approximateDates && (
              <span className="ml-2 text-[10px] text-muted-foreground font-normal normal-case">(flexible dates)</span>
            )}
          </div>
          {trip.name && (
            <div className="text-xs text-primary font-medium mb-0.5 truncate">{trip.name}</div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="truncate">{trip.startingLocation || "TBD"}</span>
            <span className="text-primary font-bold shrink-0">→</span>
            <span className="font-semibold text-foreground truncate">{trip.destination}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold font-display text-primary">
            {getBudgetDisplay()}
          </div>
          <span className="text-[10px] text-muted-foreground">budget</span>
        </div>
      </div>

      {waveLabels && waveLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {waveLabels.map((label: string, idx: number) => (
            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300" data-testid={`badge-wave-${idx}`}>
              {label}
            </span>
          ))}
          {trip.waveType && trip.waveType.length > 2 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground" data-testid="badge-wave-more">
              +{trip.waveType.length - 2}
            </span>
          )}
        </div>
      )}
      
      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
        {trip.description || "No description provided"}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs shrink-0">
            {trip.organizer?.displayName?.substring(0, 2).toUpperCase() || "??"}
          </div>
          <div className="text-xs min-w-0">
            <span className="text-muted-foreground">by</span>
            <div className="font-semibold truncate">{trip.organizer?.displayName || "Unknown"}</div>
          </div>
        </div>

        <div className="flex items-center text-xs font-medium bg-secondary/50 px-2 py-1 rounded-lg shrink-0">
          <CalendarIcon className="w-3 h-3 mr-1 opacity-70" />
          {format(new Date(trip.startDate), 'MMM d')}
        </div>
      </div>
    </div>
  );
}

function CarpoolCard({ trip }: { trip: any }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm hover-elevate" data-testid={`card-carpool-${trip.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-green-500/20 dark:bg-green-500/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-sm shrink-0">
          <Car className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">{trip.organizer?.displayName || "Surfer"}</span>
            <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
              {trip.hasRide ? "Offering Ride" : "Needs Ride"}
            </span>
          </div>
          {trip.name && (
            <div className="text-xs text-primary font-medium mb-1 truncate">{trip.name}</div>
          )}
          <div className="flex items-center text-sm text-muted-foreground mb-2 gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="font-medium text-foreground truncate">{trip.destination}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {format(new Date(trip.startDate), 'EEE, MMM d')}
          </div>
          {trip.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{trip.description}</p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-3">
        Message
      </Button>
    </div>
  );
}

function VisitingCard({ trip }: { trip: any }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm hover-elevate" data-testid={`card-visiting-${trip.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shrink-0">
          {trip.organizer?.displayName?.substring(0, 2).toUpperCase() || "??"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{trip.organizer?.displayName || "Surfer"}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Visiting</span>
          </div>
          {trip.name && (
            <div className="text-xs text-primary font-medium mb-1 truncate">{trip.name}</div>
          )}
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="font-medium text-foreground">{trip.destination}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <CalendarIcon className="w-3 h-3 mr-1" />
            {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d')}
          </div>
          {trip.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{trip.description}</p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-3">
        Connect
      </Button>
    </div>
  );
}

function CreateTripDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useCreateTrip();
  const { user } = useAuth();
  const [isVisiting, setIsVisiting] = useState(false);
  
  const form = useForm<CreateTripRequest>({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      organizerId: user?.id,
      name: "",
      startingLocation: "",
      destination: "",
      cost: 0,
      tripType: "carpool",
    }
  });

  const onSubmit = (data: CreateTripRequest) => {
    mutate({ ...data, organizerId: user?.id!, isVisiting }, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
        setIsVisiting(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90">
          <Plus className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Plan a Trip
            </DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
            <div>
              <Label className="font-medium">I'm visiting (solo traveler)</Label>
              <p className="text-xs text-muted-foreground">Looking to meet locals at destination</p>
            </div>
            <Switch checked={isVisiting} onCheckedChange={setIsVisiting} data-testid="switch-visiting" />
          </div>

          {!isVisiting && (
            <div className="space-y-2">
              <Label>Starting Location</Label>
              <Select onValueChange={(v) => form.setValue("startingLocation", v)}>
                <SelectTrigger data-testid="select-start">
                  <SelectValue placeholder="Where are you leaving from?" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Trip Name</Label>
            <Input 
              {...form.register("name")} 
              placeholder="e.g. Baja Boys Trip, Indo Mission..."
              data-testid="input-trip-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Destination</Label>
            <Select onValueChange={(v) => form.setValue("destination", v)}>
              <SelectTrigger data-testid="select-dest">
                <SelectValue placeholder="Where to?" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...form.register("startDate")} data-testid="input-start-date" />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...form.register("endDate")} data-testid="input-end-date" />
            </div>
          </div>

          {!isVisiting && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Est. Cost ($)</Label>
                <Input type="number" {...form.register("cost", { valueAsNumber: true })} data-testid="input-cost" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue="carpool" onValueChange={(v) => form.setValue("tripType", v)}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carpool">Carpool (road trip)</SelectItem>
                    <SelectItem value="beach_carpool">Ride to Beach</SelectItem>
                    <SelectItem value="boat">Boat Trip</SelectItem>
                    <SelectItem value="resort">Resort Stay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea 
              {...form.register("description")} 
              placeholder={isVisiting ? "Tell locals about yourself and what you're looking for..." : "Looking for 2 people to split gas..."} 
              data-testid="input-description"
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full" data-testid="button-create-trip">
            {isPending ? "Creating..." : isVisiting ? "Post Visit" : "Create Trip"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
