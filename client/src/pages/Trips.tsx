import { useTrips, useCreateTrip } from "@/hooks/use-trips";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin, Car, Anchor, Plane, Users } from "lucide-react";
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

export default function Trips() {
  const { data: trips, isLoading } = useTrips();
  const [open, setOpen] = useState(false);
  const [startFilter, setStartFilter] = useState<string>("");
  const [destFilter, setDestFilter] = useState<string>("");

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter(trip => {
      if (!trip.isVisiting) {
        if (startFilter && trip.startingLocation !== startFilter) return false;
        if (destFilter && trip.destination !== destFilter) return false;
      }
      return !trip.isVisiting;
    });
  }, [trips, startFilter, destFilter]);

  const visitingTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter(trip => trip.isVisiting);
  }, [trips]);

  return (
    <Layout>
      <div className="p-4 pb-20 h-full flex flex-col">
        <header className="flex justify-between items-end mb-4 gap-2">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Surf Trips</h1>
            <p className="text-muted-foreground text-sm">Find a ride or plan a journey</p>
          </div>
          <CreateTripDialog open={open} onOpenChange={setOpen} />
        </header>

        <Tabs defaultValue="trips" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="trips" data-testid="tab-trips">
              <Car className="w-4 h-4 mr-2" />
              Trips
            </TabsTrigger>
            <TabsTrigger value="visiting" data-testid="tab-visiting">
              <Plane className="w-4 h-4 mr-2" />
              Visiting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="flex-1 space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Starting From</Label>
                <Select value={startFilter} onValueChange={setStartFilter}>
                  <SelectTrigger className="h-10" data-testid="select-start-location">
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any location</SelectItem>
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
                    <SelectItem value="">Any destination</SelectItem>
                    {LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
              </div>
            )}
          </TabsContent>

          <TabsContent value="visiting" className="flex-1 space-y-4 mt-0">
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Solo Travelers</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect with surfers visiting your area or find locals when you travel to a new spot
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
    </Layout>
  );
}

function TripCard({ trip }: { trip: any }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm hover-elevate" data-testid={`card-trip-${trip.id}`}>
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center text-xs text-primary font-bold uppercase tracking-wider mb-1">
            {trip.tripType === 'carpool' ? <Car className="w-3 h-3 mr-1" /> : <Anchor className="w-3 h-3 mr-1" />}
            {trip.tripType}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="truncate">{trip.startingLocation || "TBD"}</span>
            <span className="text-primary font-bold shrink-0">→</span>
            <span className="font-semibold text-foreground truncate">{trip.destination}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold font-display text-primary">
            ${trip.cost || 0}
          </div>
          <span className="text-[10px] text-muted-foreground">est. cost</span>
        </div>
      </div>
      
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
          <Calendar className="w-3 h-3 mr-1 opacity-70" />
          {format(new Date(trip.startDate), 'MMM d')}
        </div>
      </div>
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
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="font-medium text-foreground">{trip.destination}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 mr-1" />
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plan a Trip</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
                    <SelectItem value="carpool">Carpool</SelectItem>
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
