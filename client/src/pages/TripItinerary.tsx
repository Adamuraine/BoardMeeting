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
import { ArrowLeft, MapPin, Calendar, Waves, Zap, TreePine, PartyPopper, Droplets, Fish, Crown, Radio, DollarSign, Home, Car, Anchor, UtensilsCrossed, Sailboat, Users, Pencil, Camera, X, ImagePlus, UserPlus, Check, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
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
    mutationFn: async (expenses: { houseRental?: number; taxiRides?: number; boatTrips?: number; cookingMeals?: number; boardRental?: number; airfare?: number }) => {
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
    
    updateExpensesMutation.mutate({
      houseRental: houseRental ? parseInt(houseRental) : undefined,
      taxiRides: taxiRides ? parseInt(taxiRides) : undefined,
      boatTrips: boatTrips ? parseInt(boatTrips) : undefined,
      cookingMeals: cookingMeals ? parseInt(cookingMeals) : undefined,
      boardRental: boardRental ? parseInt(boardRental) : undefined,
      airfare: airfare ? parseInt(airfare) : undefined,
    });
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
            </CardContent>
          </Card>

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
