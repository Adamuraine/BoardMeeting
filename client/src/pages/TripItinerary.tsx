import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ArrowLeft, MapPin, Calendar, Waves, Zap, TreePine, PartyPopper, Droplets, Fish, Crown, Radio, DollarSign, Home, Car, Anchor, UtensilsCrossed, Sailboat, Users, Pencil, Camera, X, ImagePlus, UserPlus, Check, XCircle, Clock, MessageCircle, Plane, Compass, ChevronDown, ChevronRight, Plus, ExternalLink, Trash2, MoreHorizontal, Square, CheckSquare, Sparkles, Loader2, Globe } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMyProfile } from "@/hooks/use-profiles";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Trip, Profile } from "@shared/schema";
import { useState, useEffect, useRef, useCallback } from "react";
import { Slider } from "@/components/ui/slider";

// Use window object to persist across hot reloads
declare global {
  interface Window {
    __tripPhotoUploadPaths?: Record<string, string>;
  }
}
if (typeof window !== 'undefined' && !window.__tripPhotoUploadPaths) {
  window.__tripPhotoUploadPaths = {};
}

interface TripItineraryProps {
  params?: { id?: string };
}

const WAVE_OPTIONS = [
  { id: "steep", label: "Steep", icon: Waves },
  { id: "gentle", label: "Mellow", icon: Waves },
];

const STYLE_OPTIONS = [
  { id: "performance", label: "Performance", icon: Zap },
  { id: "chill", label: "Chill", icon: Droplets },
];

const LOCATION_OPTIONS = [
  { id: "remote", label: "Remote", icon: TreePine },
  { id: "town", label: "In Town", icon: MapPin },
];

const VIBE_OPTIONS = [
  { id: "party", label: "Party", icon: PartyPopper },
  { id: "waterTime", label: "Max Surf", icon: Waves },
];

const ACTIVITY_OPTIONS = [
  { id: "fishing", label: "Fish", icon: Fish },
  { id: "spearfishing", label: "Spear", icon: Fish },
];

const ITINERARY_CATEGORIES = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "car_rental", label: "Car Rental", icon: Car },
  { id: "accommodation", label: "House/Hostel", icon: Home },
  { id: "chef", label: "Chef", icon: UtensilsCrossed },
  { id: "surfboards", label: "Surfboards", icon: Waves },
  { id: "photographer", label: "Surf Photographer", icon: Camera },
  { id: "guide", label: "Surf Guide", icon: Compass },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

export default function TripItinerary({ params }: TripItineraryProps) {
  const tripId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: profile } = useMyProfile();
  const [travelerCount, setTravelerCount] = useState(4);
  
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseKey, setExpenseKey] = useState(0);
  const houseRentalRef = useRef<HTMLInputElement>(null);
  const taxiRidesRef = useRef<HTMLInputElement>(null);
  const boatTripsRef = useRef<HTMLInputElement>(null);
  const cookingMealsRef = useRef<HTMLInputElement>(null);
  const boardRentalRef = useRef<HTMLInputElement>(null);
  const airfareRef = useRef<HTMLInputElement>(null);
  const photographerRef = useRef<HTMLInputElement>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addItemCategory, setAddItemCategory] = useState("");
  const [newItemData, setNewItemData] = useState({ title: "", details: "", date: "", time: "", referenceNumber: "", bookingUrl: "", notes: "" });
  const [aiRecommendations, setAiRecommendations] = useState<Record<string, any[]>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const checkedStorageKey = `trip-checklist-${tripId}-${profile?.userId}`;
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`trip-checklist-${tripId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    if (tripId && profile?.userId) {
      try {
        const saved = localStorage.getItem(checkedStorageKey);
        if (saved) setCheckedCategories(new Set(JSON.parse(saved)));
      } catch {}
    }
  }, [tripId, profile?.userId, checkedStorageKey]);

  const toggleCategoryChecked = (catId: string) => {
    setCheckedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      localStorage.setItem(checkedStorageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const { data: trip, isLoading } = useQuery<Trip & { organizer: Profile }>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

  // Fetch participants
  const { data: participants = [] } = useQuery<any[]>({
    queryKey: ["/api/trips", tripId, "participants"],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/participants`);
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
    enabled: !!tripId,
  });

  // Fetch user's join status
  const { data: myJoinStatus } = useQuery<any>({
    queryKey: ["/api/trips", tripId, "my-status"],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/my-status`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!tripId && !!profile,
  });

  const { data: itineraryItems = [] } = useQuery<any[]>({
    queryKey: ["/api/trips", tripId, "itinerary"],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/itinerary`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tripId && !!profile,
  });

  // Request to join mutation
  const requestJoinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/trips/${tripId}/join`, { 
        method: "POST", 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to request to join");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "my-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "participants"] });
      toast({ title: "Request sent!", description: "The organizer will review your request." });
    },
  });

  // Approve/reject mutation
  const updateParticipantMutation = useMutation({
    mutationFn: async ({ participantUserId, status }: { participantUserId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/trips/${tripId}/participants/${participantUserId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "participants"] });
      toast({ title: "Updated", description: "Participant status updated!" });
    },
  });

  const approvedParticipants = participants.filter((p: any) => p.status === "approved");
  const pendingParticipants = participants.filter((p: any) => p.status === "pending");

  const updateTripMutation = useMutation({
    mutationFn: async (updates: Partial<Trip>) => {
      const res = await apiRequest("PATCH", `/api/trips/${tripId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/broadcast"] });
      toast({ title: "Trip updated", description: "Your preferences have been saved!" });
    },
  });

  const togglePreference = (field: string, value: string) => {
    if (!trip) return;
    const current = ((trip as any)[field] || []) as string[];
    const newValue = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateTripMutation.mutate({ [field]: newValue });
  };

  const toggleActivity = (activityId: string) => {
    if (!trip) return;
    const current = trip.extraActivities || [];
    const newActivities = current.includes(activityId)
      ? current.filter(a => a !== activityId)
      : [...current, activityId];
    updateTripMutation.mutate({ extraActivities: newActivities });
  };

  const updateExpensesMutation = useMutation({
    mutationFn: async (expenses: { houseRental?: number; taxiRides?: number; boatTrips?: number; cookingMeals?: number; boardRental?: number; airfare?: number; photographer?: number }) => {
      const res = await fetch(`/api/trips/${tripId}/details`, {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenses),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update expenses");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/user"] });
      setExpenseDialogOpen(false);
      toast({ title: "Expenses saved", description: "Trip costs have been updated!" });
    },
  });

  const openExpenseDialog = () => {
    setExpenseKey(prev => prev + 1);
    setExpenseDialogOpen(true);
  };

  const saveExpenses = () => {
    const houseRental = houseRentalRef.current?.value || "";
    const taxiRides = taxiRidesRef.current?.value || "";
    const boatTrips = boatTripsRef.current?.value || "";
    const cookingMeals = cookingMealsRef.current?.value || "";
    const boardRental = boardRentalRef.current?.value || "";
    const airfare = airfareRef.current?.value || "";
    const photographer = photographerRef.current?.value || "";
    
    updateExpensesMutation.mutate({
      houseRental: houseRental ? parseInt(houseRental) : undefined,
      taxiRides: taxiRides ? parseInt(taxiRides) : undefined,
      boatTrips: boatTrips ? parseInt(boatTrips) : undefined,
      cookingMeals: cookingMeals ? parseInt(cookingMeals) : undefined,
      boardRental: boardRental ? parseInt(boardRental) : undefined,
      airfare: airfare ? parseInt(airfare) : undefined,
      photographer: photographer ? parseInt(photographer) : undefined,
    });
  };

  const toggleBroadcast = (enabled: boolean) => {
    updateTripMutation.mutate({ broadcastEnabled: enabled });
  };

  const addItineraryItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/trips/${tripId}/itinerary`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary"] });
      setAddItemDialogOpen(false);
      setNewItemData({ title: "", details: "", date: "", time: "", referenceNumber: "", bookingUrl: "", notes: "" });
      setAddItemCategory("");
      toast({ title: "Item added", description: "Checklist item has been added." });
    },
  });

  const toggleItineraryBookedMutation = useMutation({
    mutationFn: async ({ itemId, isBooked }: { itemId: number; isBooked: boolean }) => {
      const res = await apiRequest("PATCH", `/api/trips/${tripId}/itinerary/${itemId}`, { isBooked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary"] });
    },
  });

  const deleteItineraryItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("DELETE", `/api/trips/${tripId}/itinerary/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "itinerary"] });
      toast({ title: "Item removed", description: "Checklist item has been removed." });
    },
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const openAddItemDialog = (categoryId: string) => {
    setAddItemCategory(categoryId);
    setNewItemData({ title: "", details: "", date: "", time: "", referenceNumber: "", bookingUrl: "", notes: "" });
    setAddItemDialogOpen(true);
  };

  const submitNewItem = () => {
    if (!newItemData.title.trim()) return;
    addItineraryItemMutation.mutate({
      category: addItemCategory,
      title: newItemData.title.trim(),
      details: newItemData.details.trim() || undefined,
      date: newItemData.date || undefined,
      time: newItemData.time || undefined,
      referenceNumber: newItemData.referenceNumber.trim() || undefined,
      bookingUrl: newItemData.bookingUrl.trim() || undefined,
      notes: newItemData.notes.trim() || undefined,
    });
  };

  const findWithAI = async (category: string) => {
    const dest = trip?.destination;
    if (!dest) return;
    setAiLoading(prev => ({ ...prev, [category]: true }));
    try {
      const res = await apiRequest("POST", "/api/ai/find-surf-services", { location: dest, category });
      const data = await res.json();
      setAiRecommendations(prev => ({ ...prev, [category]: data.recommendations || [] }));
    } catch {
      toast({ title: "Could not load AI suggestions", variant: "destructive" });
    } finally {
      setAiLoading(prev => ({ ...prev, [category]: false }));
    }
  };

  const isMexicoTrip = (dest: string) => {
    const lower = dest.toLowerCase();
    return lower.includes("mexico") || lower.includes("méxico") || lower.includes("baja") ||
      lower.includes("puerto escondido") || lower.includes("sayulita") || lower.includes("cabo") ||
      lower.includes("los cabos") || lower.includes("cancun") || lower.includes("cancún") ||
      lower.includes("playa del carmen") || lower.includes("tulum") || lower.includes("oaxaca") ||
      lower.includes("nayarit") || lower.includes("jalisco") || lower.includes("guerrero") ||
      lower.includes("mazatlan") || lower.includes("mazatlán") || lower.includes("ensenada") ||
      lower.includes("rosarito") || lower.includes("tijuana");
  };

  const isBajaMexicoTrip = (dest: string) => {
    const lower = dest.toLowerCase();
    return lower.includes("baja") || lower.includes("ensenada") ||
      lower.includes("rosarito") || lower.includes("tijuana");
  };

  const getBookingLinks = (categoryId: string) => {
    const dest = trip?.destination || "";
    const sd = trip?.startDate || "";
    const ed = trip?.endDate || "";
    if (!dest) return [];
    const loc = encodeURIComponent(dest);
    const skySd = sd.replace(/-/g, "");
    const skyEd = ed.replace(/-/g, "");
    const mexico = isMexicoTrip(dest);
    const bajaMexico = isBajaMexicoTrip(dest);
    switch (categoryId) {
      case "flights": {
        const links = [
          { name: "Google Flights", url: `https://www.google.com/travel/flights?q=flights+to+${loc}&d1=${sd}&d2=${ed}` },
          { name: "Skyscanner", url: `https://www.skyscanner.com/transport/flights/anywhere/${loc}/${skySd}/${skyEd}/` },
          { name: "Kayak", url: `https://www.kayak.com/flights?search=1&destination=${loc}&depart=${sd}&return=${ed}` },
        ];
        if (mexico) {
          links.push(
            { name: "Volaris", url: `https://www.volaris.com/en` },
            { name: "VivaAerobus", url: `https://www.vivaaerobus.com/en` },
            { name: "Aeromexico", url: `https://www.aeromexico.com/en-us` },
          );
          if (bajaMexico) {
            links.push(
              { name: "CBX Cross Border", url: "https://www.crossborderxpress.com/" },
            );
          }
        }
        return links;
      }
      case "car_rental":
        return [
          { name: "Turo", url: `https://turo.com/search?location=${loc}&startDate=${sd}&endDate=${ed}` },
          { name: "Rental Cars", url: `https://www.rentalcars.com/search-results?location=${loc}&pick-up=${sd}&drop-off=${ed}` },
          { name: "Kayak Cars", url: `https://www.kayak.com/cars/${loc}/${sd}/${ed}` },
        ];
      case "accommodation":
        return [
          { name: "Airbnb", url: `https://www.airbnb.com/s/${loc}/homes?checkin=${sd}&checkout=${ed}&query=${loc}` },
          { name: "Booking.com", url: `https://www.booking.com/searchresults.html?ss=${loc}&checkin=${sd}&checkout=${ed}` },
          { name: "Hostelworld", url: `https://www.hostelworld.com/st/hostels/${loc}/?DateRange=${sd},${ed}` },
        ];
      case "guide":
        return [
          { name: "Google Search", url: `https://www.google.com/search?q=surf+guide+${loc}+lessons+tours` },
          { name: "TripAdvisor", url: `https://www.tripadvisor.com/Search?q=surf+guide+${loc}` },
          { name: "GetYourGuide", url: `https://www.getyourguide.com/s/?q=surf+${loc}` },
          { name: "Instagram", url: `https://www.instagram.com/explore/tags/surfguide${dest.replace(/[^a-zA-Z\s]/g, "").replace(/\s+/g, "").toLowerCase()}/` },
          { name: "Facebook", url: `https://www.facebook.com/search/pages/?q=surf+guide+${dest.replace(/\s/g, "+")}` },
          { name: "Reddit Surf", url: `https://www.reddit.com/r/surfing/search/?q=surf+guide+${loc}` },
          { name: "Surfline Forums", url: `https://www.surfline.com/search?q=surf+guide+${dest.replace(/\s/g, "+")}` },
        ];
      case "chef":
        return [
          { name: "Google Search", url: `https://www.google.com/search?q=private+chef+${loc}` },
        ];
      case "surfboards":
        return [
          { name: "Google Search", url: `https://www.google.com/search?q=surfboard+rental+${loc}` },
        ];
      case "photographer":
        return [
          { name: "Google Search", url: `https://www.google.com/search?q=surf+photographer+${loc}` },
          { name: "Instagram", url: `https://www.instagram.com/explore/tags/surfphotography${dest.replace(/[^a-zA-Z\s]/g, "").replace(/\s+/g, "").toLowerCase()}/` },
          { name: "Facebook", url: `https://www.facebook.com/search/pages/?q=surf+photographer+${dest.replace(/\s/g, "+")}` },
          { name: "Reddit Surf", url: `https://www.reddit.com/r/surfing/search/?q=surf+photographer+${loc}` },
          { name: "Surfline Forums", url: `https://www.surfline.com/search?q=surf+photographer+${dest.replace(/\s/g, "+")}` },
        ];
      case "other": {
        const links: { name: string; url: string }[] = [];
        if (mexico) {
          links.push(
            { name: "Mexico Travel Docs", url: "https://www.inm.gob.mx/gobmx/word/index.php/paises-requieren-visa-702/" },
            { name: "Mexico Entry Requirements", url: "https://www.google.com/search?q=mexico+travel+entry+requirements+visa+FMM+immigration" },
            { name: "Mexico FMM Permit", url: "https://www.banjercito.com.mx/registroE.html" },
          );
          if (bajaMexico) {
            links.push(
              { name: "CBX Cross Border", url: "https://www.crossborderxpress.com/" },
            );
          }
        }
        return links;
      }
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-muted-foreground">Loading trip...</div>
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Trip not found</p>
          <Button variant="outline" onClick={() => setLocation("/profile")}>
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  const isPremium = profile?.isPremium;
  const isOrganizer = profile?.userId === trip.organizerId;

  return (
    <Layout>
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/profile")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>

          <div className="mb-6">
            {isOrganizer ? (
              <div className="flex items-center gap-2 mb-1">
                <Input
                  defaultValue={trip.name || ""}
                  onBlur={async (e) => {
                    const newName = e.target.value.trim();
                    if (newName !== (trip.name || "")) {
                      await apiRequest("PATCH", `/api/trips/${tripId}`, { name: newName || null });
                      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
                      toast({ title: "Trip name updated" });
                    }
                  }}
                  placeholder="Add trip name (e.g., 'Epic Bali Trip')"
                  className="text-sm text-primary font-medium border-dashed h-8 max-w-xs"
                  data-testid="input-trip-name"
                />
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </div>
            ) : trip.name ? (
              <p className="text-sm text-primary font-medium mb-1">{trip.name}</p>
            ) : null}
            {isOrganizer ? (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  defaultValue={trip.destination}
                  onBlur={async (e) => {
                    const newDest = e.target.value.trim();
                    if (newDest && newDest !== trip.destination) {
                      await apiRequest("PATCH", `/api/trips/${tripId}`, { destination: newDest });
                      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
                      toast({ title: "Destination updated" });
                    }
                  }}
                  placeholder="Destination"
                  className="text-2xl font-display font-bold border-dashed h-10 max-w-sm"
                  data-testid="input-trip-destination"
                />
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </div>
            ) : (
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">
                {trip.destination}
              </h1>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {isOrganizer ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 border border-dashed text-muted-foreground hover-elevate"
                      data-testid="button-edit-trip-dates"
                    >
                      {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                      <Pencil className="w-3 h-3 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom" sideOffset={8} collisionPadding={16} avoidCollisions={true}>
                    <CalendarComponent
                      mode="range"
                      defaultMonth={new Date(trip.startDate)}
                      selected={{
                        from: new Date(trip.startDate),
                        to: new Date(trip.endDate),
                      }}
                      onSelect={async (range: DateRange | undefined) => {
                        if (range?.from && range?.to) {
                          const startDate = format(range.from, "yyyy-MM-dd");
                          const endDate = format(range.to, "yyyy-MM-dd");
                          if (startDate !== trip.startDate || endDate !== trip.endDate) {
                            await apiRequest("PATCH", `/api/trips/${tripId}`, { startDate, endDate });
                            queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
                            toast({ title: "Trip dates updated" });
                          }
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <span>
                  {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              {isOrganizer ? (
                <div className="flex items-center gap-1">
                  <span>From:</span>
                  <Input
                    defaultValue={trip.startingLocation || ""}
                    onBlur={async (e) => {
                      const newLoc = e.target.value.trim();
                      if (newLoc !== (trip.startingLocation || "")) {
                        await apiRequest("PATCH", `/api/trips/${tripId}`, { startingLocation: newLoc || null });
                        queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
                        toast({ title: "Starting location updated" });
                      }
                    }}
                    placeholder="Starting location"
                    className="h-7 border-dashed max-w-xs"
                    data-testid="input-trip-starting-location"
                  />
                </div>
              ) : trip.startingLocation ? (
                <span>From: {trip.startingLocation}</span>
              ) : null}
            </div>

            {/* Trip Photos / Who's Going */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Trip Photos</span>
                {isOrganizer && (
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    onGetUploadParameters={async (file) => {
                      const res = await fetch("/api/uploads/request-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                        credentials: "include",
                      });
                      const { uploadURL, objectPath } = await res.json();
                      if (window.__tripPhotoUploadPaths) {
                        window.__tripPhotoUploadPaths[file.name || file.id] = objectPath;
                      }
                      return { method: "PUT" as const, url: uploadURL, headers: { "Content-Type": file.type || "application/octet-stream" } };
                    }}
                    onComplete={async (result) => {
                      const pathsMap = window.__tripPhotoUploadPaths || {};
                      const paths = (result.successful || [])
                        .map((f: any) => pathsMap[f.name] || pathsMap[f.id])
                        .filter(Boolean) as string[];
                      if (paths.length > 0) {
                        const currentPhotos = trip.photos || [];
                        const newPhotos = [...currentPhotos, ...paths];
                        await apiRequest("PATCH", `/api/trips/${tripId}`, { photos: newPhotos });
                        queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
                        toast({ title: "Photos added", description: "Trip photos updated!" });
                        window.__tripPhotoUploadPaths = {};
                      }
                    }}
                    buttonClassName="h-8 px-3"
                  >
                    <ImagePlus className="w-4 h-4 mr-1" />
                    Add Photos
                  </ObjectUploader>
                )}
              </div>
              {trip.photos && trip.photos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trip.photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={photo}
                        alt={`Trip photo ${idx + 1}`}
                        className="w-16 h-16 rounded-lg object-cover border border-border"
                      />
                      {isOrganizer && (
                        <button
                          onClick={async () => {
                            const newPhotos = trip.photos!.filter((_, i) => i !== idx);
                            await apiRequest("PATCH", `/api/trips/${tripId}`, { photos: newPhotos });
                            queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
                            toast({ title: "Photo removed" });
                          }}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-remove-photo-${idx}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  <span>No photos yet</span>
                </div>
              )}

              {/* Show organizer avatar */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Organized by:</span>
                <Avatar className="w-6 h-6">
                  <AvatarImage src={trip.organizer?.imageUrls?.[0]} />
                  <AvatarFallback>{trip.organizer?.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{trip.organizer?.displayName}</span>
              </div>
            </div>
          </div>

          {/* Who's Going Section */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Who's Going ({approvedParticipants.length + 1})
                </div>
                {!isOrganizer && !myJoinStatus && (
                  <Button
                    size="sm"
                    onClick={() => requestJoinMutation.mutate()}
                    disabled={requestJoinMutation.isPending}
                    data-testid="button-request-join"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Request to Join
                  </Button>
                )}
                {!isOrganizer && myJoinStatus?.status === "pending" && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                )}
                {!isOrganizer && myJoinStatus?.status === "approved" && (
                  <Badge className="bg-green-500 text-white">
                    <Check className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                )}
                {!isOrganizer && myJoinStatus?.status === "rejected" && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Approved
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Approved participants including organizer */}
              <div className="flex flex-wrap gap-3 mb-4">
                {/* Organizer always shows first */}
                <div className="flex flex-col items-center gap-1">
                  <Avatar className="w-12 h-12 ring-2 ring-primary">
                    <AvatarImage src={trip.organizer?.imageUrls?.[0]} />
                    <AvatarFallback>{trip.organizer?.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-center max-w-[60px] truncate">{trip.organizer?.displayName}</span>
                  <span className="text-[10px] text-primary font-medium">Organizer</span>
                </div>
                
                {/* Approved participants */}
                {approvedParticipants.map((p: any) => (
                  <div key={p.id} className="flex flex-col items-center gap-1">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={p.profile?.imageUrls?.[0]} />
                      <AvatarFallback>{p.profile?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-center max-w-[60px] truncate">{p.profile?.displayName}</span>
                  </div>
                ))}
              </div>

              {/* Pending requests (only visible to organizer) */}
              {isOrganizer && pendingParticipants.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Pending Requests ({pendingParticipants.length})
                  </p>
                  <div className="space-y-2">
                    {pendingParticipants.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={p.profile?.imageUrls?.[0]} />
                            <AvatarFallback>{p.profile?.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium">{p.profile?.displayName}</span>
                            <p className="text-xs text-muted-foreground">{p.profile?.skillLevel}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-500/20"
                            onClick={() => updateParticipantMutation.mutate({ participantUserId: p.userId, status: "approved" })}
                            data-testid={`button-approve-${p.userId}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-500/20"
                            onClick={() => updateParticipantMutation.mutate({ participantUserId: p.userId, status: "rejected" })}
                            data-testid={`button-reject-${p.userId}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(isOrganizer || myJoinStatus?.status === "approved") && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => setLocation(`/messages?trip=${tripId}`)}
                  data-testid="button-group-chat"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Group Chat
                </Button>
              )}
            </CardContent>
          </Card>

          {(isOrganizer || myJoinStatus?.status === "approved") && (
            <Card className="mb-6" data-testid="card-itinerary-checklist">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  Trip Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {ITINERARY_CATEGORIES.map((cat) => {
                  const catItems = (itineraryItems || []).filter((item: any) => item.category === cat.id);
                  const bookedCount = catItems.filter((item: any) => item.isBooked).length;
                  const isExpanded = expandedCategories.has(cat.id);
                  const CatIcon = cat.icon;
                  const bookingLinks = getBookingLinks(cat.id);

                  const isCategoryDone = checkedCategories.has(cat.id) || (catItems.length > 0 && bookedCount === catItems.length);

                  return (
                    <div key={cat.id} className={cn("border rounded-lg", isCategoryDone && "border-green-500/30 bg-green-500/5")} data-testid={`itinerary-category-${cat.id}`}>
                      <div className="flex items-center gap-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCategoryChecked(cat.id); }}
                          className="shrink-0 pl-3 py-3 pr-1"
                          data-testid={`button-check-category-${cat.id}`}
                        >
                          {isCategoryDone ? (
                            <CheckSquare className="w-5 h-5 text-green-500" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleCategory(cat.id)}
                          className="flex-1 flex items-center justify-between gap-2 p-3 hover-elevate rounded-lg"
                          data-testid={`button-toggle-category-${cat.id}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <CatIcon className="w-4 h-4 text-muted-foreground" />
                            <span className={cn("text-sm font-medium", isCategoryDone && "line-through text-muted-foreground")}>{cat.label}</span>
                            {catItems.length > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {bookedCount}/{catItems.length}
                              </Badge>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {catItems.map((item: any) => (
                            <div key={item.id} className="flex items-start gap-2 bg-secondary/30 rounded-lg p-2.5" data-testid={`itinerary-item-${item.id}`}>
                              <button
                                onClick={() => toggleItineraryBookedMutation.mutate({ itemId: item.id, isBooked: !item.isBooked })}
                                className="mt-0.5 shrink-0"
                                data-testid={`button-toggle-booked-${item.id}`}
                              >
                                {item.isBooked ? (
                                  <CheckSquare className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Square className="w-5 h-5 text-muted-foreground" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={item.user?.imageUrls?.[0]} />
                                    <AvatarFallback className="text-[8px]">{item.user?.displayName?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground truncate">{item.user?.displayName}</span>
                                </div>
                                <p className={cn("text-sm font-medium", item.isBooked && "line-through text-muted-foreground")} data-testid={`text-item-title-${item.id}`}>
                                  {item.title}
                                </p>
                                {item.details && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.date && (
                                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                                      <Calendar className="w-3 h-3" />{item.date}
                                    </span>
                                  )}
                                  {item.time && (
                                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                                      <Clock className="w-3 h-3" />{item.time}
                                    </span>
                                  )}
                                  {item.referenceNumber && (
                                    <span className="text-[10px] text-muted-foreground" data-testid={`text-ref-${item.id}`}>
                                      Ref: {item.referenceNumber}
                                    </span>
                                  )}
                                </div>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground/70 mt-1 italic">{item.notes}</p>
                                )}
                                {item.bookingUrl && (
                                  <a
                                    href={item.bookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary inline-flex items-center gap-1 mt-1"
                                    data-testid={`link-booking-${item.id}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Booking Link
                                  </a>
                                )}
                              </div>
                              {profile?.userId === item.userId && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteItineraryItemMutation.mutate(item.id)}
                                  disabled={deleteItineraryItemMutation.isPending}
                                  data-testid={`button-delete-item-${item.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => openAddItemDialog(cat.id)}
                            data-testid={`button-add-item-${cat.id}`}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add {cat.label}
                          </Button>

                          {bookingLinks.length > 0 && (
                            <div className="rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 p-2.5 space-y-1.5">
                              <p className="text-[10px] text-muted-foreground font-medium">Quick Search</p>
                              <div className="flex flex-wrap gap-1.5">
                                {bookingLinks.map((link) => (
                                  <a
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 text-[11px] font-medium hover-elevate"
                                    data-testid={`link-booking-${cat.id}-${link.name.toLowerCase().replace(/[\s.]/g, "-")}`}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {link.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {(cat.id === "guide" || cat.id === "photographer") && (
                            <div className="space-y-2" data-testid={`ai-finder-${cat.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 border-violet-300/30 dark:border-violet-500/30"
                                onClick={() => findWithAI(cat.id)}
                                disabled={aiLoading[cat.id]}
                                data-testid={`button-ai-find-${cat.id}`}
                              >
                                {aiLoading[cat.id] ? (
                                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4 mr-1.5" />
                                )}
                                {aiLoading[cat.id] ? "Searching..." : `Find ${cat.label}s with AI`}
                              </Button>

                              {aiRecommendations[cat.id] && aiRecommendations[cat.id].length > 0 && (
                                <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 p-2.5 space-y-2">
                                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    AI Recommendations for {trip?.destination}
                                  </p>
                                  {aiRecommendations[cat.id].map((rec: any, idx: number) => (
                                    <div key={idx} className="bg-background/80 rounded-md p-2 space-y-1" data-testid={`ai-rec-${cat.id}-${idx}`}>
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-semibold">{rec.name}</p>
                                        <div className="flex gap-1 flex-shrink-0">
                                          {rec.searchUrl && (
                                            <a href={rec.searchUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground" data-testid={`link-ai-search-${idx}`}>
                                              <Globe className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                          {rec.socialMedia && (
                                            <a href={rec.socialMedia} target="_blank" rel="noopener noreferrer" className="text-muted-foreground" data-testid={`link-ai-social-${idx}`}>
                                              <Camera className="w-3.5 h-3.5" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">{rec.description}</p>
                                      {rec.specialty && (
                                        <Badge variant="secondary" className="text-[10px]">{rec.specialty}</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Waves className="w-5 h-5 text-primary" />
                  What Kind of Waves?
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {WAVE_OPTIONS.map((option) => {
                  const isSelected = (trip.waveType || []).includes(option.id);
                  return (
                    <Badge
                      key={option.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-2 py-1 text-xs",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => togglePreference("waveType", option.id)}
                      data-testid={`badge-wave-${option.id}`}
                    >
                      <option.icon className="w-3 h-3 mr-1" />
                      {option.label}
                    </Badge>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Riding Style
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map((option) => {
                  const isSelected = (trip.rideStyle || []).includes(option.id);
                  return (
                    <Badge
                      key={option.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-2 py-1 text-xs",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => togglePreference("rideStyle", option.id)}
                      data-testid={`badge-style-${option.id}`}
                    >
                      <option.icon className="w-3 h-3 mr-1" />
                      {option.label}
                    </Badge>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location Preference
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {LOCATION_OPTIONS.map((option) => {
                  const isSelected = (trip.locationPreference || []).includes(option.id);
                  return (
                    <Badge
                      key={option.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-2 py-1 text-xs",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => togglePreference("locationPreference", option.id)}
                      data-testid={`badge-location-${option.id}`}
                    >
                      <option.icon className="w-3 h-3 mr-1" />
                      {option.label}
                    </Badge>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PartyPopper className="w-5 h-5 text-primary" />
                  Trip Vibe
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {VIBE_OPTIONS.map((option) => {
                  const isSelected = (trip.vibe || []).includes(option.id);
                  return (
                    <Badge
                      key={option.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-2 py-1 text-xs",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => togglePreference("vibe", option.id)}
                      data-testid={`badge-vibe-${option.id}`}
                    >
                      <option.icon className="w-3 h-3 mr-1" />
                      {option.label}
                    </Badge>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Fish className="w-5 h-5 text-primary" />
                  Extra Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {ACTIVITY_OPTIONS.map((option) => {
                  const isSelected = (trip.extraActivities || []).includes(option.id);
                  return (
                    <Badge
                      key={option.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-2 py-1 text-xs",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => toggleActivity(option.id)}
                      data-testid={`badge-activity-${option.id}`}
                    >
                      <option.icon className="w-3 h-3 mr-1" />
                      {option.label}
                    </Badge>
                  );
                })}
              </CardContent>
            </Card>

            {/* Cost Breakdown Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Trip Cost Breakdown
                  </div>
                  {isOrganizer && (trip.houseRental || trip.taxiRides || trip.boatTrips || trip.cookingMeals || trip.boardRental || trip.photographer) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={openExpenseDialog}
                      data-testid="button-edit-expenses"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(trip.houseRental || trip.taxiRides || trip.boatTrips || trip.cookingMeals || trip.boardRental || trip.photographer) ? (
                  <>
                    <div className="space-y-2">
                      {trip.houseRental && trip.houseRental > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <span>House Rental</span>
                          </div>
                          <span className="font-medium">${trip.houseRental.toLocaleString()}</span>
                        </div>
                      )}
                      {trip.taxiRides && trip.taxiRides > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            <span>Taxi / Transport</span>
                          </div>
                          <span className="font-medium">${trip.taxiRides.toLocaleString()}</span>
                        </div>
                      )}
                      {trip.boatTrips && trip.boatTrips > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Anchor className="w-4 h-4 text-muted-foreground" />
                            <span>Boat Trips</span>
                          </div>
                          <span className="font-medium">${trip.boatTrips.toLocaleString()}</span>
                        </div>
                      )}
                      {trip.cookingMeals && trip.cookingMeals > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                            <span>Food / Chef</span>
                          </div>
                          <span className="font-medium">${trip.cookingMeals.toLocaleString()}</span>
                        </div>
                      )}
                      {trip.boardRental && trip.boardRental > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Sailboat className="w-4 h-4 text-muted-foreground" />
                            <span>Board Rental / Travel</span>
                          </div>
                          <span className="font-medium">${trip.boardRental.toLocaleString()}</span>
                        </div>
                      )}
                      {trip.photographer && trip.photographer > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-muted-foreground" />
                            <span>Photographer</span>
                          </div>
                          <span className="font-medium">${trip.photographer.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 mt-2">
                        <div className="flex items-center justify-between font-semibold">
                          <span>Total Trip Cost</span>
                          <span className="text-primary text-lg">${((trip.houseRental || 0) + (trip.taxiRides || 0) + (trip.boatTrips || 0) + (trip.cookingMeals || 0) + (trip.boardRental || 0) + (trip.photographer || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Travelers</span>
                        </div>
                        <span className="text-lg font-bold text-primary">{travelerCount}</span>
                      </div>
                      <Slider
                        value={[travelerCount]}
                        onValueChange={(value) => setTravelerCount(value[0])}
                        min={1}
                        max={20}
                        step={1}
                        className="mb-4"
                        data-testid="slider-travelers"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mb-4">
                        <span>1</span>
                        <span>5</span>
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                      </div>
                      
                      <div className="bg-card rounded-lg p-3 border border-border">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Cost per person with {travelerCount} travelers</p>
                          <p className="text-2xl font-bold text-primary">
                            ${Math.round(((trip.houseRental || 0) + (trip.taxiRides || 0) + (trip.boatTrips || 0) + (trip.cookingMeals || 0) + (trip.boardRental || 0) + (trip.photographer || 0)) / travelerCount).toLocaleString()}
                          </p>
                        </div>
                        
                        {travelerCount > 1 && (
                          <div className="mt-3 pt-3 border-t border-border/50 space-y-1 text-xs">
                            {trip.houseRental && trip.houseRental > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>House: ${Math.round(trip.houseRental / travelerCount)}/person</span>
                              </div>
                            )}
                            {trip.taxiRides && trip.taxiRides > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Transport: ${Math.round(trip.taxiRides / travelerCount)}/person</span>
                              </div>
                            )}
                            {trip.boatTrips && trip.boatTrips > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Boat: ${Math.round(trip.boatTrips / travelerCount)}/person</span>
                              </div>
                            )}
                            {trip.cookingMeals && trip.cookingMeals > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Food: ${Math.round(trip.cookingMeals / travelerCount)}/person</span>
                              </div>
                            )}
                            {trip.boardRental && trip.boardRental > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Board: ${Math.round(trip.boardRental / travelerCount)}/person</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {trip.airfare && trip.airfare > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Airfare (individual)</span>
                              <span className="font-medium">${trip.airfare.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        {[2, 4, 8, 12].map((count) => {
                          const totalCost = (trip.houseRental || 0) + (trip.taxiRides || 0) + (trip.boatTrips || 0) + (trip.cookingMeals || 0) + (trip.boardRental || 0) + (trip.photographer || 0);
                          return (
                            <button
                              key={count}
                              onClick={() => setTravelerCount(count)}
                              className={cn(
                                "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                travelerCount === count
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary hover-elevate"
                              )}
                              data-testid={`button-travelers-${count}`}
                            >
                              <div className="font-bold">{count}</div>
                              <div className="text-[10px] opacity-75">${Math.round(totalCost / count)}/ea</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No cost breakdown available</p>
                    {isOrganizer && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={openExpenseDialog}
                        data-testid="button-add-expenses"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Add Expenses
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={cn("border-2 border-amber-400/70 dark:border-amber-500/50", !isPremium && "opacity-60")}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  Broadcast Trip
                  {!isPremium && (
                    <Badge variant="secondary" className="ml-2">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="broadcast" className="text-sm font-medium">
                      Show on Home Screen
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Let other surfers see your trip and connect with you
                    </p>
                  </div>
                  <Switch
                    id="broadcast"
                    checked={trip.broadcastEnabled || false}
                    onCheckedChange={toggleBroadcast}
                    disabled={!isPremium}
                    data-testid="switch-broadcast"
                  />
                </div>
                {!isPremium && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 w-full"
                    onClick={() => setLocation("/profile")}
                    data-testid="button-upgrade"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade for $5/mo to Broadcast
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Itinerary Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Add {ITINERARY_CATEGORIES.find(c => c.id === addItemCategory)?.label || "Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                value={newItemData.title}
                onChange={(e) => setNewItemData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Flight to Bali"
                data-testid="input-item-title"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Details</Label>
              <Input
                value={newItemData.details}
                onChange={(e) => setNewItemData(prev => ({ ...prev, details: e.target.value }))}
                placeholder="e.g., United Airlines UA123"
                data-testid="input-item-details"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={newItemData.date}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, date: e.target.value }))}
                  data-testid="input-item-date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Time</Label>
                <Input
                  type="time"
                  value={newItemData.time}
                  onChange={(e) => setNewItemData(prev => ({ ...prev, time: e.target.value }))}
                  data-testid="input-item-time"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Reference Number</Label>
              <Input
                value={newItemData.referenceNumber}
                onChange={(e) => setNewItemData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                placeholder="e.g., CONF-12345"
                data-testid="input-item-reference"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Booking URL</Label>
              <Input
                value={newItemData.bookingUrl}
                onChange={(e) => setNewItemData(prev => ({ ...prev, bookingUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-item-booking-url"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                value={newItemData.notes}
                onChange={(e) => setNewItemData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                className="resize-none"
                rows={2}
                data-testid="input-item-notes"
              />
            </div>
            <Button
              onClick={submitNewItem}
              disabled={!newItemData.title.trim() || addItineraryItemMutation.isPending}
              className="w-full"
              data-testid="button-submit-item"
            >
              {addItineraryItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Expenses Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Edit Trip Expenses
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter total costs - these will be split among travelers
            </p>
            <div key={expenseKey} className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">House Rental</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    ref={houseRentalRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue={trip?.houseRental?.toString() || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors pl-7"
                    data-testid="input-edit-house-rental"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Taxi/Transport</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    ref={taxiRidesRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue={trip?.taxiRides?.toString() || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors pl-7"
                    data-testid="input-edit-taxi-rides"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Boat Trips</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    ref={boatTripsRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue={trip?.boatTrips?.toString() || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors pl-7"
                    data-testid="input-edit-boat-trips"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Food/Chef</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    ref={cookingMealsRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue={trip?.cookingMeals?.toString() || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors pl-7"
                    data-testid="input-edit-cooking-meals"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Board Rental</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    ref={boardRentalRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue={trip?.boardRental?.toString() || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors pl-7"
                    data-testid="input-edit-board-rental"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Airfare</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    ref={airfareRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue={trip?.airfare?.toString() || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors pl-7"
                    data-testid="input-edit-airfare"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  Photographer
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    ref={photographerRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue={trip?.photographer?.toString() || ""}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors pl-7"
                    data-testid="input-edit-photographer"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={saveExpenses}
              disabled={updateExpensesMutation.isPending}
              className="w-full"
              data-testid="button-save-expenses"
            >
              {updateExpensesMutation.isPending ? "Saving..." : "Save Expenses"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
