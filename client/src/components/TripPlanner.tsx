import { useState, useMemo } from "react";
import { Plane, Home, Car, Anchor, Building2, Users, BedDouble, Hotel, Tent, Castle, ExternalLink, Search, X, MessageCircle, UserPlus, MapPin, Calendar as CalendarIcon, Sparkles, ThumbsUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface TripPlannerProps {
  location: string;
  startDate: string;
  endDate: string;
  className?: string;
}

function formatDateForGoogle(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.replace(/-/g, "-");
}

function formatDateForSkyscanner(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.replace(/-/g, "");
}

function encodeLocation(location: string): string {
  return encodeURIComponent(location);
}

function buildFlightLinks(location: string, startDate: string, endDate: string) {
  const loc = encodeLocation(location);
  const sd = formatDateForGoogle(startDate);
  const ed = formatDateForGoogle(endDate);
  const skySd = formatDateForSkyscanner(startDate);
  const skyEd = formatDateForSkyscanner(endDate);
  return [
    {
      name: "Google Flights",
      url: `https://www.google.com/travel/flights?q=flights+to+${loc}&d1=${sd}&d2=${ed}`,
      color: "bg-blue-500",
    },
    {
      name: "Skyscanner",
      url: `https://www.skyscanner.com/transport/flights/anywhere/${loc}/${skySd}/${skyEd}/`,
      color: "bg-cyan-500",
    },
    {
      name: "Kayak",
      url: `https://www.kayak.com/flights?search=1&destination=${loc}&depart=${sd}&return=${ed}`,
      color: "bg-orange-500",
    },
  ];
}

type AccommodationType = "all" | "room" | "shared" | "hostel" | "resort";

function buildAccommodationLinks(location: string, startDate: string, endDate: string, type: AccommodationType) {
  const loc = encodeLocation(location);
  const sd = formatDateForGoogle(startDate);
  const ed = formatDateForGoogle(endDate);

  const typeQueryMap: Record<AccommodationType, string> = {
    all: "",
    room: "+private+room",
    shared: "+shared+room",
    hostel: "+hostel",
    resort: "+resort",
  };
  const typeQuery = typeQueryMap[type];

  return [
    {
      name: "Airbnb",
      url: `https://www.airbnb.com/s/${loc}/homes?checkin=${sd}&checkout=${ed}&query=${loc}${typeQuery ? `+${type}` : ""}`,
      color: "bg-rose-500",
    },
    {
      name: "Booking.com",
      url: `https://www.booking.com/searchresults.html?ss=${loc}&checkin=${sd}&checkout=${ed}`,
      color: "bg-blue-700",
    },
    {
      name: "Hostelworld",
      url: `https://www.hostelworld.com/st/hostels/${loc}/?DateRange=${sd},${ed}`,
      color: "bg-orange-600",
    },
    {
      name: "Hotels.com",
      url: `https://www.hotels.com/search.do?q-destination=${loc}&q-check-in=${sd}&q-check-out=${ed}`,
      color: "bg-red-600",
    },
  ];
}

function buildRentalLinks(location: string, startDate: string, endDate: string) {
  const loc = encodeLocation(location);
  const sd = formatDateForGoogle(startDate);
  const ed = formatDateForGoogle(endDate);
  return [
    {
      name: "Turo",
      url: `https://turo.com/search?location=${loc}&startDate=${sd}&endDate=${ed}`,
      color: "bg-purple-600",
    },
    {
      name: "Rental Cars",
      url: `https://www.rentalcars.com/search-results?location=${loc}&pick-up=${sd}&drop-off=${ed}`,
      color: "bg-sky-600",
    },
    {
      name: "Kayak Cars",
      url: `https://www.kayak.com/cars/${loc}/${sd}/${ed}`,
      color: "bg-orange-500",
    },
  ];
}

function buildSurfGuideLinks(location: string) {
  const loc = encodeLocation(location);
  return [
    {
      name: "Google Search",
      url: `https://www.google.com/search?q=surf+guide+${loc}+lessons+tours`,
      color: "bg-blue-500",
    },
    {
      name: "TripAdvisor",
      url: `https://www.tripadvisor.com/Search?q=surf+guide+${loc}`,
      color: "bg-green-600",
    },
    {
      name: "Airbnb Experiences",
      url: `https://www.airbnb.com/s/${loc}/experiences?query=surf`,
      color: "bg-rose-500",
    },
    {
      name: "GetYourGuide",
      url: `https://www.getyourguide.com/s/?q=surf+${loc}`,
      color: "bg-blue-600",
    },
  ];
}

const ACCOMMODATION_TYPES: { id: AccommodationType; label: string; icon: typeof BedDouble }[] = [
  { id: "all", label: "All", icon: Building2 },
  { id: "room", label: "Room", icon: BedDouble },
  { id: "shared", label: "Shared", icon: Users },
  { id: "hostel", label: "Hostel", icon: Tent },
  { id: "resort", label: "Resort", icon: Castle },
];

export function TripPlanner({ location, startDate, endDate, className }: TripPlannerProps) {
  const [activeTab, setActiveTab] = useState("flights");
  const [accomType, setAccomType] = useState<AccommodationType>("all");
  const [expanded, setExpanded] = useState(true);

  const hasRequiredInfo = location && startDate && endDate;

  const flightLinks = useMemo(() => buildFlightLinks(location, startDate, endDate), [location, startDate, endDate]);
  const accomLinks = useMemo(() => buildAccommodationLinks(location, startDate, endDate, accomType), [location, startDate, endDate, accomType]);
  const rentalLinks = useMemo(() => buildRentalLinks(location, startDate, endDate), [location, startDate, endDate]);
  const surfGuideLinks = useMemo(() => buildSurfGuideLinks(location), [location]);

  if (!hasRequiredInfo && !expanded) {
    return null;
  }

  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20"
        data-testid="button-trip-planner-toggle"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-foreground">Trip Planner</span>
          <Badge variant="secondary" className="text-[9px] no-default-active-elevate">AI</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? "Hide" : "Find deals"}</span>
      </button>

      {expanded && (
        <div className="p-3 space-y-3 bg-card/50">
          {!hasRequiredInfo ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Enter a location and dates above to find flights, stays, and more
            </p>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground text-center">
                Search results for <span className="font-semibold text-foreground">{location}</span> &middot; {startDate} to {endDate}
              </p>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 h-auto">
                  <TabsTrigger value="flights" className="text-[10px] py-1.5 flex flex-col items-center gap-0.5 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300" data-testid="tab-planner-flights">
                    <Plane className="w-3.5 h-3.5" />
                    Flights
                  </TabsTrigger>
                  <TabsTrigger value="stays" className="text-[10px] py-1.5 flex flex-col items-center gap-0.5 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-300" data-testid="tab-planner-stays">
                    <Home className="w-3.5 h-3.5" />
                    Stays
                  </TabsTrigger>
                  <TabsTrigger value="rentals" className="text-[10px] py-1.5 flex flex-col items-center gap-0.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300" data-testid="tab-planner-rentals">
                    <Car className="w-3.5 h-3.5" />
                    Rentals
                  </TabsTrigger>
                  <TabsTrigger value="guides" className="text-[10px] py-1.5 flex flex-col items-center gap-0.5 data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300" data-testid="tab-planner-guides">
                    <Anchor className="w-3.5 h-3.5" />
                    Guides
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="flights" className="mt-3 space-y-2">
                  <div className="grid gap-2">
                    {flightLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover-elevate transition-all"
                        data-testid={`link-flight-${link.name.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white", link.color)}>
                            <Plane className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium">{link.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="stays" className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {ACCOMMODATION_TYPES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setAccomType(t.id)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                            accomType === t.id
                              ? "bg-rose-500 text-white"
                              : "bg-secondary text-secondary-foreground hover-elevate"
                          )}
                          data-testid={`button-accom-type-${t.id}`}
                        >
                          <Icon className="w-3 h-3" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-2">
                    {accomLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover-elevate transition-all"
                        data-testid={`link-stay-${link.name.toLowerCase().replace(/[\s.]/g, "-")}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white", link.color)}>
                            <Hotel className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium">{link.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="rentals" className="mt-3 space-y-2">
                  <div className="grid gap-2">
                    {rentalLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover-elevate transition-all"
                        data-testid={`link-rental-${link.name.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white", link.color)}>
                            <Car className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium">{link.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="guides" className="mt-3 space-y-2">
                  <div className="grid gap-2">
                    {surfGuideLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover-elevate transition-all"
                        data-testid={`link-guide-${link.name.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white", link.color)}>
                            <Anchor className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium">{link.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                  <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-lg p-3 border border-teal-500/20">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Know a local surf guide, house rental, or hotel?{" "}
                      <span className="font-semibold text-foreground">List them on Board Meeting</span> and earn referral fees for every booking.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface TripMatchPopupProps {
  destination: string;
  startDate: string;
  endDate: string;
  className?: string;
}

export function TripMatchPopup({ destination, startDate, endDate, className }: TripMatchPopupProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const hasInfo = destination && startDate && endDate;

  const queryUrl = hasInfo
    ? `/api/trips/similar?${new URLSearchParams({ destination, startDate, endDate }).toString()}`
    : '';

  const { data: matches, isLoading } = useQuery<any[]>({
    queryKey: [queryUrl],
    enabled: !!user && !!hasInfo,
    staleTime: 30000,
  });

  const visibleMatches = matches?.filter(m => !dismissed.has(m.id)) ?? [];

  if (!hasInfo) return null;

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-3", className)}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">Checking for trip matches...</span>
        </div>
      </div>
    );
  }

  if (visibleMatches.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {visibleMatches.map((match: any) => (
        <div
          key={match.id}
          className="relative rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 p-3 space-y-2"
          data-testid={`trip-match-popup-${match.id}`}
        >
          <button
            onClick={() => setDismissed(prev => { const next = new Set(Array.from(prev)); next.add(match.id); return next; })}
            className="absolute top-2 right-2 text-muted-foreground"
            data-testid={`button-dismiss-match-${match.id}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Trip Match Found!</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Avatar className="w-9 h-9 border-2 border-amber-400/50">
              <AvatarImage src={match.organizer?.profilePhoto} alt={match.organizer?.displayName || "User"} />
              <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                {(match.organizer?.displayName || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {match.organizer?.displayName || "Surfer"}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{match.destination}</span>
                <span className="shrink-0">·</span>
                <CalendarIcon className="w-3 h-3 shrink-0" />
                <span className="shrink-0">{match.startDate} - {match.endDate}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-foreground/80 leading-relaxed">
            This user is also going to <span className="font-semibold">{match.destination}</span> around similar dates! Send them an invite or message to jump on their trip.
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="flex-1 bg-amber-500 text-white border-amber-600"
              onClick={() => navigate(`/messages?to=${match.organizerId}`)}
              data-testid={`button-message-match-${match.id}`}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/trips?view=${match.id}`)}
              data-testid={`button-view-trip-match-${match.id}`}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              View Trip
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface RideMatchPopupProps {
  destination: string;
  date: string;
  className?: string;
}

export function RideMatchPopup({ destination, date, className }: RideMatchPopupProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const hasInfo = destination && date;

  const queryUrl = hasInfo
    ? `/api/rides/similar?${new URLSearchParams({ destination, date }).toString()}`
    : '';

  const { data: matches, isLoading } = useQuery<any[]>({
    queryKey: [queryUrl],
    enabled: !!user && !!hasInfo,
    staleTime: 30000,
  });

  const visibleMatches = matches?.filter(m => !dismissed.has(m.id)) ?? [];

  if (!hasInfo) return null;

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 p-3", className)}>
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">Checking for ride matches...</span>
        </div>
      </div>
    );
  }

  if (visibleMatches.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {visibleMatches.map((match: any) => {
        const isOffering = match.description?.startsWith("Offering");
        return (
          <div
            key={match.id}
            className="relative rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 p-3 space-y-2"
            data-testid={`ride-match-popup-${match.id}`}
          >
            <button
              onClick={() => setDismissed(prev => { const next = new Set(Array.from(prev)); next.add(match.id); return next; })}
              className="absolute top-2 right-2 text-muted-foreground"
              data-testid={`button-dismiss-ride-match-${match.id}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {isOffering ? "Ride Available!" : "Someone needs a ride too!"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Avatar className="w-9 h-9 border-2 border-emerald-400/50">
                <AvatarImage src={match.organizer?.profilePhoto} alt={match.organizer?.displayName || "User"} />
                <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {(match.organizer?.displayName || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {match.organizer?.displayName || "Surfer"}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{match.startingLocation ? `${match.startingLocation} → ` : ""}{match.destination}</span>
                  <span className="shrink-0">·</span>
                  <CalendarIcon className="w-3 h-3 shrink-0" />
                  <span className="shrink-0">{match.startDate}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed">
              {isOffering
                ? <>This surfer is <span className="font-semibold">offering a ride</span> to <span className="font-semibold">{match.destination}</span> around the same time! Hop in!</>
                : <>This surfer also <span className="font-semibold">needs a ride</span> to <span className="font-semibold">{match.destination}</span>. Team up and share a ride!</>
              }
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1 bg-emerald-500 text-white border-emerald-600"
                onClick={() => navigate(`/messages?to=${match.organizerId}`)}
                data-testid={`button-message-ride-match-${match.id}`}
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                Message
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/trips?tab=carpool`)}
                data-testid={`button-view-ride-match-${match.id}`}
              >
                <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                View Ride
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
