import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MapPin, Calendar, Waves, Zap, TreePine, PartyPopper, Droplets, Fish, Crown, Radio } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMyProfile } from "@/hooks/use-profiles";
import type { Trip, Profile } from "@shared/schema";

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
    </Layout>
  );
}
