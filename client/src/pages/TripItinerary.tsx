import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Calendar, Waves, Zap, TreePine, PartyPopper, Droplets, Fish, Crown, Radio, DollarSign, Home, Car, Anchor, UtensilsCrossed, Sailboat, Users, Pencil } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMyProfile } from "@/hooks/use-profiles";
import type { Trip, Profile } from "@shared/schema";
import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

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

export default function TripItinerary({ params }: TripItineraryProps) {
  const tripId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: profile } = useMyProfile();
  const [travelerCount, setTravelerCount] = useState(4);
  
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [houseRental, setHouseRental] = useState("");
  const [taxiRides, setTaxiRides] = useState("");
  const [boatTrips, setBoatTrips] = useState("");
  const [cookingMeals, setCookingMeals] = useState("");
  const [boardRental, setBoardRental] = useState("");

  const { data: trip, isLoading } = useQuery<Trip & { organizer: Profile }>({
    queryKey: ["/api/trips", tripId],
    queryFn: async () => {
      const res = await fetch(`/api/trips/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch trip");
      return res.json();
    },
    enabled: !!tripId,
  });

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
    mutationFn: async (expenses: { houseRental?: number; taxiRides?: number; boatTrips?: number; cookingMeals?: number; boardRental?: number }) => {
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
    if (trip) {
      setHouseRental(trip.houseRental?.toString() || "");
      setTaxiRides(trip.taxiRides?.toString() || "");
      setBoatTrips(trip.boatTrips?.toString() || "");
      setCookingMeals(trip.cookingMeals?.toString() || "");
      setBoardRental(trip.boardRental?.toString() || "");
    }
    setExpenseDialogOpen(true);
  };

  const saveExpenses = () => {
    updateExpensesMutation.mutate({
      houseRental: houseRental ? parseInt(houseRental) : undefined,
      taxiRides: taxiRides ? parseInt(taxiRides) : undefined,
      boatTrips: boatTrips ? parseInt(boatTrips) : undefined,
      cookingMeals: cookingMeals ? parseInt(cookingMeals) : undefined,
      boardRental: boardRental ? parseInt(boardRental) : undefined,
    });
  };

  const expenseTotal = (parseInt(houseRental || "0") + parseInt(taxiRides || "0") + parseInt(boatTrips || "0") + parseInt(cookingMeals || "0") + parseInt(boardRental || "0"));

  const toggleBroadcast = (enabled: boolean) => {
    updateTripMutation.mutate({ broadcastEnabled: enabled });
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
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              {trip.destination}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
              </span>
            </div>
            {trip.startingLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>From: {trip.startingLocation}</span>
              </div>
            )}
          </div>

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
                  {isOrganizer && (trip.houseRental || trip.taxiRides || trip.boatTrips || trip.cookingMeals || trip.boardRental) && (
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
                {(trip.houseRental || trip.taxiRides || trip.boatTrips || trip.cookingMeals || trip.boardRental) ? (
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
                      <div className="border-t border-border pt-2 mt-2">
                        <div className="flex items-center justify-between font-semibold">
                          <span>Total Trip Cost</span>
                          <span className="text-primary text-lg">${((trip.houseRental || 0) + (trip.taxiRides || 0) + (trip.boatTrips || 0) + (trip.cookingMeals || 0) + (trip.boardRental || 0)).toLocaleString()}</span>
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
                            ${Math.round(((trip.houseRental || 0) + (trip.taxiRides || 0) + (trip.boatTrips || 0) + (trip.cookingMeals || 0) + (trip.boardRental || 0)) / travelerCount).toLocaleString()}
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
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        {[2, 4, 8, 12].map((count) => {
                          const totalCost = (trip.houseRental || 0) + (trip.taxiRides || 0) + (trip.boatTrips || 0) + (trip.cookingMeals || 0) + (trip.boardRental || 0);
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

            <Card className={cn(!isPremium && "opacity-60")}>
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
                    Upgrade to Premium
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
                    data-testid="input-edit-house-rental"
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
                    data-testid="input-edit-taxi-rides"
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
                    data-testid="input-edit-boat-trips"
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
                    data-testid="input-edit-cooking-meals"
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
                    data-testid="input-edit-board-rental"
                  />
                </div>
              </div>
            </div>
            {expenseTotal > 0 && (
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Trip Cost</span>
                  <span className="text-lg font-bold text-primary">
                    ${expenseTotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per person with 4 travelers: ${Math.round(expenseTotal / 4).toLocaleString()}
                </p>
              </div>
            )}
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
