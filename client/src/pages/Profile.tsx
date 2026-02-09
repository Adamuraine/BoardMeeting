import { useMyProfile, useUpdateProfile, useManageSubscription } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Camera, TrendingUp, X, Plus, Users, Lock, Globe, GripVertical, Star, MapPin, Calendar, MessageCircle, Settings, Trash2, RefreshCw, UserX, AlertTriangle, Send, MessageSquare, Plane, Sailboat, Footprints, Beer, Umbrella, Anchor, Fish, Leaf, ExternalLink, Pencil, Check, Clock, Briefcase, GraduationCap, Coffee, Laptop, Sparkles, Target, CalendarCheck, Waves, Download } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { PremiumModal } from "@/components/PremiumModal";
import { useState, useRef, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/SafeImage";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import type { Profile as ProfileType, Trip } from "@shared/schema";
import { format } from "date-fns";
import boardMeetingLogo from "@assets/IMG_3950_1769110363136.jpeg";
import cardiffKookImg from "@assets/default-surfer.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InstallAppButton } from "@/components/InstallAppButton";

export default function Profile() {
  const { data: profile, isLoading } = useMyProfile();
  const { logout } = useAuth();
  const [showPremium, setShowPremium] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [confirmAction, setConfirmAction] = useState<"clearChat" | "clearMatches" | "suspend" | "delete" | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripExpectations, setTripExpectations] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [scheduleType, setScheduleType] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsLocation, setDetailsLocation] = useState("");
  const [detailsSkillLevel, setDetailsSkillLevel] = useState("");
  const [editingStats, setEditingStats] = useState(false);
  const [statsFastestSpeed, setStatsFastestSpeed] = useState(0);
  const [statsBiggestWave, setStatsBiggestWave] = useState(0);
  const [statsLongestWave, setStatsLongestWave] = useState(0);
  const [editingTricks, setEditingTricks] = useState(false);
  const [tricksList, setTricksList] = useState<string[]>([]);
  const [customTrick, setCustomTrick] = useState("");
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalsList, setGoalsList] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");
  const [editingTripInterests, setEditingTripInterests] = useState(false);
  const [tripInterestsList, setTripInterestsList] = useState<string[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<Array<{day: string, startTime: string, endTime: string, allDay?: boolean}>>([]);

  // Predefined surf tricks for dropdown
  const PREDEFINED_TRICKS = [
    // Beginner
    "Pop Up", "Turtle Roll", "Duck Dive", "Trimming", "Bottom Turn",
    // Intermediate
    "Cutback", "Floater", "Top Turn", "Roundhouse Cutback", "Off the Lip",
    "Re-entry", "Snap", "Foam Climb", "Carving", "Frontside Turn",
    // Advanced
    "Tube Ride", "Barrel", "Aerial", "360", "Air Reverse",
    "Alley Oop", "Rodeo Flip", "Superman", "Kerrupt Flip", "Full Rotation",
    // Pro
    "Backflip", "Frontflip", "Double Rotation", "Cork", "Inverted Aerial",
    // Longboard
    "Cross Step", "Hang Five", "Hang Ten", "Nose Ride", "Drop Knee Turn",
    "Soul Arch", "Cheater Five", "Walking the Board",
  ];
  const { toast } = useToast();
  const manageSubscription = useManageSubscription();

  const { data: buddies = [] } = useQuery<ProfileType[]>({
    queryKey: ["/api/buddies"],
    enabled: !!profile,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: myTrips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips/user", profile?.userId],
    enabled: !!profile?.userId,
  });

  const { data: calendarBlocks = [] } = useQuery<{ date: string; spotName: string; waveHeight: number; alertId: number }[]>({
    queryKey: ['/api/surf-alerts/calendar-blocks'],
    enabled: !!profile?.isPremium,
  });

  const updatePhotosMutation = useMutation({
    mutationFn: async (imageUrls: string[]) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", { imageUrls });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({ title: "Photos updated", description: "Your photos have been saved!" });
    },
    onError: () => {
      toast({ 
        title: "Upload failed", 
        description: "Failed to save your photos. Please try again.",
        variant: "destructive"
      });
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: async ({ tripId, updates }: { tripId: number, updates: { expectations?: string, activities?: string[] } }) => {
      const res = await apiRequest("PATCH", `/api/trips/${tripId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips/user", profile?.userId] });
      toast({ title: "Trip updated", description: "Your trip has been saved!" });
      setSelectedTrip(null);
    },
    onError: () => {
      toast({ 
        title: "Update failed", 
        description: "Failed to update trip. Please try again.",
        variant: "destructive"
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<ProfileType>) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
    },
  });

  // Auto-save helper with debounce - always marks profile as complete
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSave = useCallback((updates: Partial<ProfileType>) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      updateProfileMutation.mutate({ ...updates, isIncompleteProfile: false });
    }, 1000);
  }, [updateProfileMutation]);

  // Clear auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Check what fields are missing for profile completion
  const missingFields = {
    name: !profile?.displayName || profile.displayName.trim() === "",
    photo: !profile?.imageUrls || profile.imageUrls.length === 0,
    bio: !profile?.bio || profile.bio.trim() === "",
  };
  const isNewUser = profile?.isIncompleteProfile || (missingFields.name && missingFields.photo && missingFields.bio);

  const pendingPathsRef = useRef(new Map<string, string>());

  const getUploadParams = async (file: { id?: string; name: string; size: number | null; type: string }) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size || 0,
        contentType: file.type,
      }),
    });
    const { uploadURL, objectPath } = await res.json();
    const fileId = file.id || file.name;
    pendingPathsRef.current.set(fileId, objectPath);
    return {
      method: "PUT" as const,
      url: uploadURL as string,
      headers: { "Content-Type": file.type },
    };
  };

  const handleProfilePhotoComplete = (result: { successful?: { id?: string; name?: string }[] }) => {
    const files = result.successful || [];
    if (files.length > 0) {
      const file = files[0];
      const fileId = file?.id || file?.name;
      const objectPath = fileId ? pendingPathsRef.current.get(fileId) : undefined;
      if (objectPath) {
        const newImageUrls = [objectPath, ...(profile?.imageUrls?.slice(1) || [])];
        updatePhotosMutation.mutate(newImageUrls);
        pendingPathsRef.current.delete(fileId!);
      }
    }
  };

  const handleGalleryComplete = (result: { successful?: { id?: string; name?: string }[] }) => {
    const files = result.successful || [];
    const newUrls: string[] = [];
    
    for (const file of files) {
      const fileId = file?.id || file?.name;
      if (fileId) {
        const objectPath = pendingPathsRef.current.get(fileId);
        if (objectPath) {
          newUrls.push(objectPath);
          pendingPathsRef.current.delete(fileId);
        }
      }
    }
    
    if (newUrls.length > 0) {
      const currentUrls = profile?.imageUrls || [];
      const updatedUrls = [...currentUrls, ...newUrls];
      updatePhotosMutation.mutate(updatedUrls);
    }
  };

  const removePhoto = (index: number) => {
    if (profile?.imageUrls) {
      const updated = profile.imageUrls.filter((_, i) => i !== index);
      updatePhotosMutation.mutate(updated);
    }
  };

  const toggleBuddiesPublic = () => {
    updateProfileMutation.mutate({ buddiesPublic: !profile?.buddiesPublic });
  };

  const toggleTopBuddy = (buddyUserId: string) => {
    const currentTop = profile?.topBuddyIds || [];
    let newTop: string[];
    
    if (currentTop.includes(buddyUserId)) {
      newTop = currentTop.filter(id => id !== buddyUserId);
    } else {
      if (currentTop.length >= 10) {
        toast({ title: "Top 10 limit", description: "You can only have 10 top buddies. Remove one first." });
        return;
      }
      newTop = [...currentTop, buddyUserId];
    }
    
    updateProfileMutation.mutate({ topBuddyIds: newTop });
  };

  const handleClearChatHistory = async () => {
    try {
      await apiRequest("DELETE", "/api/messages/clear-all");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Chat history cleared", description: "All your messages have been deleted." });
      setConfirmAction(null);
    } catch {
      toast({ title: "Error", description: "Failed to clear chat history.", variant: "destructive" });
    }
  };

  const handleClearMatchHistory = async () => {
    try {
      await apiRequest("DELETE", "/api/matches/clear-all");
      queryClient.invalidateQueries({ queryKey: ["/api/buddies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({ title: "Match history cleared", description: "All your matches have been removed." });
      setConfirmAction(null);
    } catch {
      toast({ title: "Error", description: "Failed to clear match history.", variant: "destructive" });
    }
  };

  const handleRefreshApp = () => {
    window.location.reload();
  };

  const handleSuspendAccount = async () => {
    try {
      await apiRequest("PATCH", "/api/profiles/me", { suspended: true });
      toast({ title: "Account suspended", description: "Your account has been suspended. Contact support to reactivate." });
      setConfirmAction(null);
      logout();
    } catch {
      toast({ title: "Error", description: "Failed to suspend account.", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiRequest("DELETE", "/api/profiles/me");
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      setConfirmAction(null);
      logout();
    } catch {
      toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
    }
  };

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: string) => {
      const res = await apiRequest("POST", "/api/feedback", { feedback });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Feedback sent", description: "Thanks for your feedback! We appreciate your input." });
      setFeedbackText("");
      setShowFeedback(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
    }
  });

  const removeBuddyMutation = useMutation({
    mutationFn: async (buddyId: string) => {
      await apiRequest("DELETE", `/api/buddies/${buddyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buddies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({ title: "Buddy removed", description: "They've been removed from your buddies list." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove buddy.", variant: "destructive" });
    }
  });

  const handleRemoveBuddy = (buddyId: string, buddyName: string) => {
    if (confirm(`Remove ${buddyName} from your buddies? This will also remove any match between you.`)) {
      removeBuddyMutation.mutate(buddyId);
    }
  };

  const handleSubmitFeedback = () => {
    if (feedbackText.trim()) {
      submitFeedbackMutation.mutate(feedbackText);
    }
  };

  const handleEditBio = () => {
    setBioText(profile?.bio || "");
    setEditingBio(true);
  };

  const handleSaveBio = () => {
    updateProfileMutation.mutate({ bio: bioText });
    setEditingBio(false);
  };

  const handleEditAvailability = () => {
    setScheduleType(profile?.scheduleType || "");
    const parsed = (profile?.availability || []).map(slot => {
      try { return JSON.parse(slot); } catch { return null; }
    }).filter(Boolean);
    setAvailabilitySlots(parsed);
    setEditingAvailability(true);
  };

  const handleSaveAvailability = () => {
    const availability = availabilitySlots.map(slot => JSON.stringify(slot));
    updateProfileMutation.mutate({ scheduleType, availability });
    setEditingAvailability(false);
  };

  const addAvailabilitySlot = () => {
    setAvailabilitySlots([...availabilitySlots, { day: "monday", startTime: "06:00", endTime: "09:00" }]);
  };

  const removeAvailabilitySlot = (index: number) => {
    setAvailabilitySlots(availabilitySlots.filter((_, i) => i !== index));
  };

  const updateAvailabilitySlot = (index: number, field: string, value: string) => {
    const updated = [...availabilitySlots];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilitySlots(updated);
  };

  if (isLoading) return <ProfileSkeleton />;
  if (!profile) return null;

  const topBuddyIds = profile.topBuddyIds || [];
  const topBuddies = buddies.filter(b => topBuddyIds.includes(b.userId));
  const otherBuddies = buddies.filter(b => !topBuddyIds.includes(b.userId));
  const sortedBuddies = [...topBuddies, ...otherBuddies];

  return (
    <Layout>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      {isNewUser && (
        <div className="bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground p-4 mb-4 rounded-xl" data-testid="banner-complete-profile">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-base">Welcome to Board Meeting!</p>
              <p className="text-sm opacity-90">Complete your profile to start matching with surf buddies</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {missingFields.photo && (
              <Badge className="bg-white/20 text-white border-0 gap-1.5" data-testid="badge-missing-photo">
                <Camera className="w-3 h-3" /> Add Photo
              </Badge>
            )}
            {missingFields.name && (
              <Badge className="bg-white/20 text-white border-0 gap-1.5" data-testid="badge-missing-name">
                <Pencil className="w-3 h-3" /> Add Name
              </Badge>
            )}
            {missingFields.bio && (
              <Badge className="bg-white/20 text-white border-0 gap-1.5" data-testid="badge-missing-bio">
                <MessageSquare className="w-3 h-3" /> Add About
              </Badge>
            )}
          </div>
        </div>
      )}
      
      <Dialog open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0 border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Edit Trip
              </DialogTitle>
              <DialogDescription className="text-white/80">
                {selectedTrip?.destination} - {selectedTrip && format(new Date(selectedTrip.startDate), "MMM d")} to {selectedTrip && format(new Date(selectedTrip.endDate), "MMM d")}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Trip Expectations</Label>
              <Textarea 
                value={tripExpectations}
                onChange={(e) => setTripExpectations(e.target.value)}
                placeholder="What are you hoping to get out of this trip? What kind of waves do you want? Any specific goals?"
                className="min-h-[120px]"
                data-testid="input-trip-expectations"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Activities</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'surfboard', icon: Sailboat, label: 'Surfing' },
                  { id: 'sandals', icon: Footprints, label: 'Beach' },
                  { id: 'beer', icon: Beer, label: 'Nightlife' },
                  { id: 'umbrella', icon: Umbrella, label: 'Relaxation' },
                  { id: 'boat', icon: Anchor, label: 'Boat' },
                  { id: 'fishing', icon: Fish, label: 'Fishing' },
                  { id: 'leaf', icon: Leaf, label: 'Nature' },
                ].map(({ id, icon: Icon, label }) => {
                  const isActive = selectedTrip?.activities?.includes(id);
                  return (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="gap-1.5"
                      onClick={() => {
                        if (!selectedTrip) return;
                        const current = selectedTrip.activities || [];
                        const newActivities = isActive 
                          ? current.filter(a => a !== id)
                          : [...current, id];
                        setSelectedTrip({ ...selectedTrip, activities: newActivities });
                      }}
                      data-testid={`button-activity-${id}`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            
            <DialogFooter className="gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedTrip(null)} data-testid="button-cancel-trip">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedTrip) {
                    updateTripMutation.mutate({
                      tripId: selectedTrip.id,
                      updates: {
                        expectations: tripExpectations,
                        activities: selectedTrip.activities || [],
                      }
                    });
                  }
                }}
                disabled={updateTripMutation.isPending}
                data-testid="button-save-trip"
              >
                {updateTripMutation.isPending ? "Saving..." : "Save Trip"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Manage your account settings and preferences
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3" 
              onClick={() => { setShowSettings(false); setConfirmAction("clearChat"); }}
              data-testid="button-clear-chat"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
              Clear Chat History
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3" 
              onClick={() => { setShowSettings(false); setConfirmAction("clearMatches"); }}
              data-testid="button-clear-matches"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
              Clear Match History
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3" 
              onClick={() => { setShowSettings(false); handleRefreshApp(); }}
              data-testid="button-refresh-app"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Refresh App & Start Over
            </Button>
            
            <Separator className="my-2" />
            
            {!profile.isPremium && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 border-accent text-accent hover:bg-accent/10" 
                onClick={() => { setShowSettings(false); setShowPremium(true); }}
                data-testid="button-upgrade-settings"
              >
                <Crown className="h-4 w-4" />
                Upgrade to Premium
              </Button>
            )}
            
            {profile.isPremium && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 border-accent text-accent hover:bg-accent/10" 
                onClick={() => { setShowSettings(false); manageSubscription.mutate(); }}
                disabled={manageSubscription.isPending}
                data-testid="button-manage-subscription"
              >
                <Crown className="h-4 w-4" />
                {manageSubscription.isPending ? "Opening..." : "Manage Subscription"}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3" 
              onClick={() => { setShowSettings(false); setConfirmAction("suspend"); }}
              data-testid="button-suspend-account"
            >
              <UserX className="h-4 w-4 text-muted-foreground" />
              Suspend Account
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 border-destructive text-destructive hover:bg-destructive/10" 
              onClick={() => { setShowSettings(false); setConfirmAction("delete"); }}
              data-testid="button-delete-account"
            >
              <AlertTriangle className="h-4 w-4" />
              Delete Account
            </Button>
            
            <Separator className="my-2" />
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3" 
              onClick={() => { setShowSettings(false); setShowFeedback(true); }}
              data-testid="button-send-feedback"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Send Feedback
            </Button>
            
            <Separator className="my-2" />
            
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Admin</p>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3" 
              onClick={() => { setShowSettings(false); setShowAdminUsers(true); }}
              data-testid="button-view-users"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              View Registered Users
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Send Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve Board Meeting! Share your suggestions, report bugs, or tell us what you love.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="feedback">Your Feedback</Label>
              <Textarea 
                id="feedback"
                placeholder="Tell us what you think..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={5}
                className="resize-none"
                data-testid="textarea-feedback"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedback(false)} data-testid="button-cancel-feedback">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitFeedback} 
              disabled={!feedbackText.trim() || submitFeedbackMutation.isPending}
              className="gap-2"
              data-testid="button-submit-feedback"
            >
              <Send className="h-4 w-4" />
              {submitFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "clearChat" && "Clear Chat History?"}
              {confirmAction === "clearMatches" && "Clear Match History?"}
              {confirmAction === "suspend" && "Suspend Your Account?"}
              {confirmAction === "delete" && "Delete Your Account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "clearChat" && "This will permanently delete all your messages. This action cannot be undone."}
              {confirmAction === "clearMatches" && "This will remove all your matches and surf buddies. You'll need to match again to reconnect."}
              {confirmAction === "suspend" && "Your account will be suspended and you'll be logged out. Contact support to reactivate."}
              {confirmAction === "delete" && "This will permanently delete your account and all your data. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-action">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmAction === "clearChat") handleClearChatHistory();
                if (confirmAction === "clearMatches") handleClearMatchHistory();
                if (confirmAction === "suspend") handleSuspendAccount();
                if (confirmAction === "delete") handleDeleteAccount();
              }}
              className={confirmAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              data-testid="button-confirm-action"
            >
              {confirmAction === "clearChat" && "Clear Chat"}
              {confirmAction === "clearMatches" && "Clear Matches"}
              {confirmAction === "suspend" && "Suspend Account"}
              {confirmAction === "delete" && "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminUsersDialog open={showAdminUsers} onOpenChange={setShowAdminUsers} />
      
      <div className="relative pb-20 bg-sky-50/50 dark:bg-sky-950/20">
        <div className="h-72 relative flex items-center justify-center" style={{ backgroundColor: '#4FC6F7' }}>
          <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2">
            <img 
              src={boardMeetingLogo} 
              alt="Board Meeting Logo" 
              className="w-[22rem] h-[22rem] object-contain max-w-none"
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-3 left-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white gap-1.5"
            onClick={() => logout()}
            data-testid="button-logout-header"
          >
            <LogOut className="w-4 h-4" />
            log out
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            onClick={() => setShowSettings(true)}
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5 text-white" />
          </Button>
        </div>
        
        <div className="px-6 -mt-10">
          <div className="flex justify-between items-end mb-6">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full border-4 bg-secondary overflow-hidden shadow-xl ${
                missingFields.photo && isNewUser 
                  ? 'border-primary ring-4 ring-primary/30 animate-pulse' 
                  : 'border-background'
              }`}>
                 {missingFields.photo ? (
                   <div className="w-full h-full relative">
                     <img src={cardiffKookImg} alt="Cardiff Kook - Add your photo" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 flex items-end justify-center pb-2 bg-gradient-to-t from-black/60 to-transparent">
                       <span className="text-white text-[10px] font-bold px-2 py-0.5 bg-primary/80 rounded-full flex items-center gap-1">
                         <Camera className="w-3 h-3" /> Add Photo
                       </span>
                     </div>
                   </div>
                 ) : (
                   <SafeImage 
                     src={profile.imageUrls?.[0]} 
                     alt={profile.displayName} 
                     className="w-full h-full object-cover"
                     showNoPhotoText={false}
                   />
                 )}
              </div>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={52428800}
                onGetUploadParameters={getUploadParams}
                onComplete={handleProfilePhotoComplete}
                buttonClassName={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-background p-0 ${
                  missingFields.photo && isNewUser
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                <Camera className="w-4 h-4" />
              </ObjectUploader>
            </div>

          </div>

          <div className="mb-8">
            {editingName ? (
              <div className="space-y-2 mb-2">
                <input
                  type="text"
                  value={nameText}
                  onChange={(e) => {
                    setNameText(e.target.value);
                    autoSave({ displayName: e.target.value });
                  }}
                  className="text-2xl font-display font-bold text-foreground bg-transparent border-b-2 border-primary focus:outline-none w-full"
                  placeholder="Your display name"
                  data-testid="input-display-name"
                  autoFocus
                  onBlur={() => {
                    if (nameText.trim()) {
                      updateProfileMutation.mutate({ displayName: nameText });
                    }
                    setEditingName(false);
                  }}
                />
                <p className="text-xs text-muted-foreground">Changes save automatically</p>
              </div>
            ) : (
              <div 
                className={`cursor-pointer group ${
                  isNewUser 
                    ? 'p-3 -m-3 rounded-lg border-2 border-dashed border-primary bg-primary/5 animate-pulse' 
                    : ''
                }`}
                onClick={() => { setNameText(profile.displayName || ""); setEditingName(true); }}
                data-testid="display-name"
              >
                <h1 className={`text-3xl font-display font-bold flex items-center gap-2 ${
                  isNewUser ? 'text-primary' : 'text-foreground'
                }`}>
                  {isNewUser ? (
                    <>
                      <Pencil className="w-5 h-5" /> Name:
                    </>
                  ) : (
                    <>
                      {profile.displayName}
                      {profile.isPremium && <Crown className="w-5 h-5 text-accent fill-current" />}
                      <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </>
                  )}
                </h1>
              </div>
            )}
            
            {editingDetails ? (
              <div className="space-y-3 mt-2 p-3 bg-secondary/30 rounded-lg">
                <div>
                  <label className="text-xs text-muted-foreground">Location</label>
                  <input
                    type="text"
                    value={detailsLocation}
                    onChange={(e) => {
                      setDetailsLocation(e.target.value);
                      autoSave({ location: e.target.value });
                    }}
                    className="w-full bg-transparent border-b border-muted-foreground/30 focus:border-primary focus:outline-none py-1"
                    placeholder="e.g. San Diego, CA"
                    list="location-suggestions"
                    data-testid="input-location"
                  />
                  <datalist id="location-suggestions">
                    {["San Diego, CA", "Los Angeles, CA", "Orange County, CA", "Santa Cruz, CA", "San Francisco, CA", "Hawaii", "Florida", "East Coast", "Other"].map(loc => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Skill Level</label>
                  <select
                    value={detailsSkillLevel}
                    onChange={(e) => {
                      setDetailsSkillLevel(e.target.value);
                      autoSave({ skillLevel: e.target.value });
                    }}
                    className="w-full bg-transparent border-b border-muted-foreground/30 focus:border-primary focus:outline-none py-1"
                    data-testid="select-skill-level"
                  >
                    <option value="kook">Kook</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Changes save automatically</p>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      updateProfileMutation.mutate({ 
                        location: detailsLocation, 
                        skillLevel: detailsSkillLevel,
                        isIncompleteProfile: false 
                      });
                      setEditingDetails(false);
                    }}
                    data-testid="button-done-details"
                  >
                    <Check className="h-4 w-4 mr-1" /> Done
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className={`cursor-pointer group ${
                  isNewUser && (!profile.location || !profile.skillLevel)
                    ? 'p-2 -mx-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 animate-pulse mt-2'
                    : ''
                }`}
                onClick={() => { 
                  setDetailsLocation(profile.location || ""); 
                  setDetailsSkillLevel(profile.skillLevel || "intermediate"); 
                  setEditingDetails(true); 
                }}
                data-testid="profile-details"
              >
                <p className={`flex items-center gap-1 ${
                  isNewUser && (!profile.location || !profile.skillLevel)
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}>
                  {isNewUser && !profile.location ? (
                    <>
                      <MapPin className="w-4 h-4" /> Location / Surf Ability
                    </>
                  ) : (
                    <>
                      {profile.location || "Add location"} - {profile.skillLevel || "intermediate"} Surfer
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </>
                  )}
                </p>
              </div>
            )}
            
            {profile.openToGuiding && (
              <Badge 
                className="mt-2 bg-green-500 text-white border-green-600"
                data-testid="badge-open-to-guiding"
              >
                <Users className="w-3 h-3 mr-1" />
                Open to Meeting/Guiding Travelers
              </Badge>
            )}
          </div>

          <div className="space-y-8">
            <div className={`${
              missingFields.bio && isNewUser 
                ? 'p-4 -mx-4 rounded-lg border-2 border-dashed border-primary bg-primary/5 animate-pulse' 
                : ''
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center justify-between ${
                missingFields.bio && isNewUser ? 'text-primary' : 'text-muted-foreground'
              }`}>
                <span className="flex items-center gap-2">
                  {missingFields.bio && isNewUser && <MessageSquare className="h-4 w-4" />}
                  About
                </span>
                {!editingBio && (
                  <Button 
                    size="icon" 
                    variant={missingFields.bio && isNewUser ? "default" : "ghost"}
                    onClick={handleEditBio}
                    data-testid="button-edit-bio"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </h3>
              {editingBio ? (
                <div className="space-y-2">
                  <Textarea
                    value={bioText}
                    onChange={(e) => {
                      setBioText(e.target.value);
                      autoSave({ bio: e.target.value });
                    }}
                    placeholder="Write something about yourself... What kind of waves do you like? How long have you been surfing?"
                    className="min-h-[100px] resize-none"
                    data-testid="input-bio"
                    onBlur={() => {
                      if (bioText.trim()) {
                        updateProfileMutation.mutate({ bio: bioText });
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Changes save automatically</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingBio(false)}
                      data-testid="button-done-bio"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="cursor-pointer" 
                  onClick={handleEditBio}
                >
                  {missingFields.bio ? (
                    <p className="text-primary font-medium flex items-center gap-2">
                      <Pencil className="w-4 h-4" /> Tap to add an introduction
                    </p>
                  ) : (
                    <p className="text-foreground/80 leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Surf Availability
                </span>
                {!editingAvailability && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={handleEditAvailability}
                    data-testid="button-edit-availability"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </h3>
              {editingAvailability ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">What's your schedule like?</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "work", icon: Briefcase, label: "I Work" },
                        { id: "flexible", icon: Laptop, label: "Flexible / Remote" },
                        { id: "school", icon: GraduationCap, label: "I'm in School" },
                        { id: "none", icon: Coffee, label: "I Don't Work" },
                      ].map(({ id, icon: Icon, label }) => (
                        <Button
                          key={id}
                          type="button"
                          size="sm"
                          variant={scheduleType === id ? "default" : "outline"}
                          className="gap-1.5"
                          onClick={() => setScheduleType(id)}
                          data-testid={`button-schedule-${id}`}
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">When can you surf?</p>
                    <div className="space-y-2">
                      {availabilitySlots.map((slot, index) => (
                        <div key={index} className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2">
                            <select
                              value={slot.day}
                              onChange={(e) => updateAvailabilitySlot(index, "day", e.target.value)}
                              className="bg-background border border-border rounded px-2 py-1 text-sm flex-1"
                              data-testid={`select-day-${index}`}
                            >
                              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                                <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant={slot.allDay ? "default" : "outline"}
                              className="gap-1 flex-shrink-0 text-xs"
                              onClick={() => {
                                const updated = [...availabilitySlots];
                                updated[index] = { ...updated[index], allDay: !slot.allDay, startTime: "06:00", endTime: "09:00" };
                                setAvailabilitySlots(updated);
                              }}
                              data-testid={`button-allday-${index}`}
                            >
                              All Day
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeAvailabilitySlot(index)}
                              className="flex-shrink-0 text-muted-foreground"
                              data-testid={`button-remove-slot-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {!slot.allDay && (
                            <div className="flex items-center gap-2 pl-1">
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateAvailabilitySlot(index, "startTime", e.target.value)}
                                className="bg-background border border-border rounded px-2 py-1 text-sm"
                                data-testid={`input-start-time-${index}`}
                              />
                              <span className="text-muted-foreground text-sm">to</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateAvailabilitySlot(index, "endTime", e.target.value)}
                                className="bg-background border border-border rounded px-2 py-1 text-sm"
                                data-testid={`input-end-time-${index}`}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAvailabilitySlot}
                        className="w-full gap-1"
                        data-testid="button-add-time-slot"
                      >
                        <Plus className="h-3 w-3" />
                        Add Time Slot
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingAvailability(false)}
                      data-testid="button-cancel-availability"
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSaveAvailability}
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-availability"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.scheduleType ? (
                    <div className="flex items-center gap-2">
                      {profile.scheduleType === "work" && <Briefcase className="h-4 w-4 text-muted-foreground" />}
                      {profile.scheduleType === "flexible" && <Laptop className="h-4 w-4 text-muted-foreground" />}
                      {profile.scheduleType === "school" && <GraduationCap className="h-4 w-4 text-muted-foreground" />}
                      {profile.scheduleType === "none" && <Coffee className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-foreground/80">
                        {profile.scheduleType === "work" && "I work"}
                        {profile.scheduleType === "flexible" && "Flexible / Remote work"}
                        {profile.scheduleType === "school" && "I'm in school"}
                        {profile.scheduleType === "none" && "I don't work"}
                      </span>
                    </div>
                  ) : null}
                  
                  {profile.availability && profile.availability.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                        <Waves className="h-4 w-4 text-primary" />
                        I'm free to surf:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {profile.availability.map((slotStr, index) => {
                          try {
                            const slot = JSON.parse(slotStr);
                            return (
                              <Badge key={index} variant="secondary" className="gap-1" data-testid={`badge-availability-${index}`}>
                                <Clock className="h-3 w-3" />
                                {slot.day.charAt(0).toUpperCase() + slot.day.slice(1)} {slot.allDay ? "All Day" : `${slot.startTime}-${slot.endTime}`}
                              </Badge>
                            );
                          } catch { return null; }
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {!profile.scheduleType ? "No availability set. Tap the pencil to add when you can surf!" : "No specific times added yet."}
                    </p>
                  )}
                </div>
              )}

              {calendarBlocks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50" data-testid="profile-calendar-blocks">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground">Auto-Blocked Surf Days</span>
                    <Badge variant="secondary" className="text-xs">{calendarBlocks.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    These days are blocked because the surf is firing at your alert spots!
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {calendarBlocks.map(block => (
                      <Badge 
                        key={`${block.date}-${block.spotName}`}
                        variant="outline" 
                        className="text-xs gap-1 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                        data-testid={`badge-profile-block-${block.date}`}
                      >
                        <Waves className="h-3 w-3" />
                        {format(new Date(block.date + 'T12:00:00'), 'EEE M/d')} - {block.spotName} ({block.waveHeight}ft)
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 gap-1.5"
                    onClick={() => {
                      window.open("/api/surf-alerts/calendar.ics", "_blank");
                    }}
                    data-testid="button-profile-add-to-calendar"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Add to Apple / Google Calendar
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Upcoming Trips ({myTrips.length})
              </h3>
              {myTrips.length > 0 ? (
                <div className="space-y-3">
                  {myTrips.map((trip) => (
                    <Link href={`/trips/${trip.id}`} key={trip.id}>
                      <div 
                        className="p-4 rounded-xl border border-border bg-card shadow-sm cursor-pointer hover-elevate active-elevate-2 transition-all"
                        data-testid={`trip-card-${trip.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-foreground truncate">{trip.destination}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                              </span>
                            </div>
                            {trip.description && (
                              <p className="text-sm text-foreground/70 mt-2 line-clamp-2">{trip.description}</p>
                            )}
                          </div>
                          {trip.tripType && (
                            <Badge variant="secondary" className="flex-shrink-0">{trip.tripType}</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-secondary/30 rounded-xl border border-border/50">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming trips planned</p>
                  <Link href="/trips">
                    <Button variant="outline" size="sm" className="mt-3" data-testid="button-plan-trip">
                      Plan a Trip
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                My Photos ({profile.imageUrls?.length || 0})
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Upload as many surf action shots and lifestyle photos as you want</p>
              <div className="grid grid-cols-3 gap-2">
                {profile.imageUrls?.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-secondary relative group">
                    <SafeImage src={url} alt="Gallery" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-remove-photo-${i}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <ObjectUploader
                  maxNumberOfFiles={50}
                  maxFileSize={52428800}
                  onGetUploadParameters={getUploadParams}
                  onComplete={handleGalleryComplete}
                  buttonClassName="aspect-square w-full rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors p-0"
                >
                  <Plus className="w-6 h-6" />
                </ObjectUploader>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Surf Buddies ({buddies.length})
                </h3>
                <div className="flex items-center gap-2">
                  {profile.buddiesPublic ? (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch 
                    checked={profile.buddiesPublic ?? true} 
                    onCheckedChange={toggleBuddiesPublic}
                    data-testid="switch-buddies-public"
                  />
                  <span className="text-xs text-muted-foreground">
                    {profile.buddiesPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mb-4">
                Star up to 10 buddies to feature them at the top. {profile.buddiesPublic ? "Others can see your buddies." : "Only you can see your buddies."}
              </p>

              {sortedBuddies.length > 0 ? (
                <div className="space-y-2">
                  {sortedBuddies.map((buddy) => {
                    const isTop = topBuddyIds.includes(buddy.userId);
                    return (
                      <div 
                        key={buddy.userId} 
                        className={`flex items-center gap-3 p-3 rounded-xl border ${isTop ? 'border-accent bg-accent/10' : 'border-border/50 bg-secondary/30'}`}
                        data-testid={`buddy-row-${buddy.userId}`}
                      >
                        <button 
                          onClick={() => toggleTopBuddy(buddy.userId)}
                          className="flex-shrink-0"
                          data-testid={`button-star-buddy-${buddy.userId}`}
                        >
                          <Star className={`h-5 w-5 ${isTop ? 'text-accent fill-current' : 'text-muted-foreground'}`} />
                        </button>
                        
                        <Link href={`/profile/${buddy.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={buddy.imageUrls?.[0]} />
                            <AvatarFallback>{buddy.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{buddy.displayName}</p>
                            <p className="text-xs text-muted-foreground truncate">{buddy.location} - {buddy.skillLevel}</p>
                          </div>
                        </Link>
                        
                        <Link href={`/messages?buddy=${buddy.userId}`}>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            data-testid={`button-message-buddy-${buddy.userId}`}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveBuddy(buddy.userId, buddy.displayName)}
                          disabled={removeBuddyMutation.isPending}
                          data-testid={`button-remove-buddy-${buddy.userId}`}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        
                        {isTop && (
                          <Badge variant="outline" className="flex-shrink-0 text-accent border-accent">
                            Top 10
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No surf buddies yet!</p>
                  <p className="text-xs mt-1">Match with other surfers to add them here</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Your Trips ({myTrips.length})
              </h3>
              {myTrips.length > 0 ? (
                <div className="space-y-2">
                  {myTrips.map((trip: Trip) => {
                    const activityIcons: Record<string, typeof Sailboat> = {
                      surfboard: Sailboat, sandals: Footprints, beer: Beer, 
                      umbrella: Umbrella, boat: Anchor, fishing: Fish, leaf: Leaf
                    };
                    return (
                      <button 
                        key={trip.id}
                        onClick={() => {
                          setSelectedTrip(trip);
                          setTripExpectations(trip.expectations || "");
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 transition-colors text-left"
                        data-testid={`trip-row-${trip.id}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{trip.destination}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                          </p>
                          {trip.activities && trip.activities.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {trip.activities.map((activity: string) => {
                                const Icon = activityIcons[activity];
                                return Icon ? <Icon key={activity} className="h-3 w-3 text-muted-foreground" /> : null;
                              })}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="flex-shrink-0">
                          <Calendar className="h-3 w-3 mr-1" />
                          Upcoming
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trips planned yet!</p>
                  <p className="text-xs mt-1">Create a trip from the Trips page</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Stats
                </span>
                {!editingStats && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => {
                      setStatsFastestSpeed(profile.fastestSpeed || 0);
                      setStatsBiggestWave(profile.biggestWave || 0);
                      setStatsLongestWave(profile.longestWave || 0);
                      setEditingStats(true);
                    }}
                    data-testid="button-edit-stats"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </h3>
              
              {editingStats ? (
                <div className="space-y-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Top Speed (mph)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={statsFastestSpeed}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setStatsFastestSpeed(val);
                          autoSave({ fastestSpeed: val });
                        }}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xl font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        data-testid="input-fastest-speed"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Biggest Wave (ft)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={statsBiggestWave}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setStatsBiggestWave(val);
                          autoSave({ biggestWave: val });
                        }}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xl font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        data-testid="input-biggest-wave"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Longest Ride (yds)</label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={statsLongestWave}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setStatsLongestWave(val);
                          autoSave({ longestWave: val });
                        }}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xl font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                        data-testid="input-longest-wave"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-xs text-muted-foreground mb-1">Skill Level</div>
                      <div className="text-xl font-bold text-primary capitalize">{profile.skillLevel}</div>
                      <div className="text-xs text-muted-foreground">(Edit above)</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Changes save automatically</p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        updateProfileMutation.mutate({
                          fastestSpeed: statsFastestSpeed,
                          biggestWave: statsBiggestWave,
                          longestWave: statsLongestWave,
                        });
                        setEditingStats(false);
                      }}
                      data-testid="button-done-stats"
                    >
                      <Check className="h-4 w-4 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="grid grid-cols-2 gap-4 cursor-pointer"
                  onClick={() => {
                    setStatsFastestSpeed(profile.fastestSpeed || 0);
                    setStatsBiggestWave(profile.biggestWave || 0);
                    setStatsLongestWave(profile.longestWave || 0);
                    setEditingStats(true);
                  }}
                >
                  <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="text-2xl font-bold font-display text-primary">{profile.fastestSpeed || 0}</div>
                    <div className="text-xs text-muted-foreground">Top Speed (mph)</div>
                  </div>
                  <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="text-2xl font-bold font-display text-primary">{profile.biggestWave || 0}</div>
                    <div className="text-xs text-muted-foreground">Biggest Wave (ft)</div>
                  </div>
                  <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="text-2xl font-bold font-display text-primary">{profile.longestWave || 0}</div>
                    <div className="text-xs text-muted-foreground">Longest Ride (yds)</div>
                  </div>
                  <div className="bg-secondary/30 p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="text-2xl font-bold font-display text-primary capitalize">{profile.skillLevel}</div>
                    <div className="text-xs text-muted-foreground">Skill Level</div>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Tap to edit your personal records</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Trick Goals ({profile.trickGoals?.length || 0})
                </span>
                {!editingGoals && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => {
                      setGoalsList(profile.trickGoals || []);
                      setCustomGoal("");
                      setEditingGoals(true);
                    }}
                    data-testid="button-edit-goals"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </h3>
              
              {editingGoals ? (
                <div className="space-y-4 p-4 bg-white/50 dark:bg-background/50 rounded-xl border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex flex-wrap gap-2">
                    {goalsList.map((goal: string, index: number) => (
                      <div key={`${goal}-${index}`} className="flex items-center gap-1">
                        <Badge 
                          variant="outline"
                          className="bg-amber-100/50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
                          data-testid={`badge-goal-${goal.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {goal}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const newGoals = goalsList.filter((_, i) => i !== index);
                            setGoalsList(newGoals);
                            autoSave({ trickGoals: newGoals });
                          }}
                          data-testid={`button-remove-goal-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {goalsList.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No goals yet. Add tricks you want to learn!</p>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Select a trick to learn</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !goalsList.includes(value)) {
                          const newGoals = [...goalsList, value];
                          setGoalsList(newGoals);
                          autoSave({ trickGoals: newGoals });
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-goal">
                        <SelectValue placeholder="Choose a trick to learn..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_TRICKS.filter(t => !goalsList.includes(t) && !(profile.tricks || []).includes(t)).map(trick => (
                          <SelectItem key={trick} value={trick}>{trick}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Or type a custom trick goal</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={customGoal}
                        onChange={(e) => setCustomGoal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customGoal.trim() && !goalsList.includes(customGoal.trim())) {
                            const newGoals = [...goalsList, customGoal.trim()];
                            setGoalsList(newGoals);
                            autoSave({ trickGoals: newGoals });
                            setCustomGoal("");
                          }
                        }}
                        placeholder="Type a trick you want to learn..."
                        className="flex-1"
                        data-testid="input-custom-goal"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!customGoal.trim() || goalsList.includes(customGoal.trim())}
                        onClick={() => {
                          if (customGoal.trim() && !goalsList.includes(customGoal.trim())) {
                            const newGoals = [...goalsList, customGoal.trim()];
                            setGoalsList(newGoals);
                            autoSave({ trickGoals: newGoals });
                            setCustomGoal("");
                          }
                        }}
                        data-testid="button-add-custom-goal"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 dark:border-amber-800/30">
                    <p className="text-xs text-muted-foreground">Changes save automatically</p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        updateProfileMutation.mutate({ trickGoals: goalsList });
                        setEditingGoals(false);
                      }}
                      data-testid="button-done-goals"
                    >
                      <Check className="h-4 w-4 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.trickGoals?.length ? (
                    profile.trickGoals.map((goal: string) => (
                      <a
                        key={goal}
                        href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(goal)}+surfing+tutorial`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                        data-testid={`goal-link-${goal.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Badge 
                          variant="outline"
                          className="cursor-pointer hover-elevate flex items-center gap-1.5 bg-amber-100/50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
                          data-testid={`profile-badge-goal-${goal.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <SiYoutube className="w-3 h-3 text-red-500 opacity-70 group-hover:opacity-100" />
                          {goal}
                        </Badge>
                      </a>
                    ))
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-dashed border-amber-400/50 dark:border-amber-600/50 text-amber-700 dark:text-amber-400"
                      onClick={() => {
                        setGoalsList([]);
                        setCustomGoal("");
                        setEditingGoals(true);
                      }}
                      data-testid="button-add-first-goal"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add tricks you want to learn
                    </Button>
                  )}
                </div>
              )}
              {!editingGoals && profile.trickGoals?.length ? (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
                  <SiYoutube className="w-3 h-3 text-red-500" />
                  Tap any goal for how-to videos
                </p>
              ) : null}
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tricks Mastered ({profile.tricks?.length || 0})
                </span>
                {!editingTricks && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => {
                      setTricksList(profile.tricks || []);
                      setCustomTrick("");
                      setEditingTricks(true);
                    }}
                    data-testid="button-edit-tricks"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </h3>
              
              {editingTricks ? (
                <div className="space-y-4 p-4 bg-white/50 dark:bg-background/50 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30">
                  <div className="flex flex-wrap gap-2">
                    {tricksList.map((trick: string, index: number) => (
                      <div key={`${trick}-${index}`} className="flex items-center gap-1">
                        <Badge 
                          variant="outline"
                          className="bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                          data-testid={`badge-trick-${trick.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {trick}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const newTricks = tricksList.filter((_, i) => i !== index);
                            setTricksList(newTricks);
                            autoSave({ tricks: newTricks });
                          }}
                          data-testid={`button-remove-trick-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {tricksList.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No tricks yet. Add some below!</p>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Select a trick</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !tricksList.includes(value)) {
                          const newTricks = [...tricksList, value];
                          setTricksList(newTricks);
                          autoSave({ tricks: newTricks });
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-trick">
                        <SelectValue placeholder="Choose a trick to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_TRICKS.filter(t => !tricksList.includes(t)).map(trick => (
                          <SelectItem key={trick} value={trick}>{trick}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Or type a custom trick</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={customTrick}
                        onChange={(e) => setCustomTrick(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customTrick.trim() && !tricksList.includes(customTrick.trim())) {
                            const newTricks = [...tricksList, customTrick.trim()];
                            setTricksList(newTricks);
                            autoSave({ tricks: newTricks });
                            setCustomTrick("");
                          }
                        }}
                        placeholder="Type a trick name..."
                        className="flex-1"
                        data-testid="input-custom-trick"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!customTrick.trim() || tricksList.includes(customTrick.trim())}
                        onClick={() => {
                          if (customTrick.trim() && !tricksList.includes(customTrick.trim())) {
                            const newTricks = [...tricksList, customTrick.trim()];
                            setTricksList(newTricks);
                            autoSave({ tricks: newTricks });
                            setCustomTrick("");
                          }
                        }}
                        data-testid="button-add-custom-trick"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30">
                    <p className="text-xs text-muted-foreground">Changes save automatically</p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        updateProfileMutation.mutate({ tricks: tricksList });
                        setEditingTricks(false);
                      }}
                      data-testid="button-done-tricks"
                    >
                      <Check className="h-4 w-4 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.tricks?.length ? (
                    profile.tricks.map((trick: string) => (
                      <a
                        key={trick}
                        href={`https://www.youtube.com/results?search_query=surfing+${encodeURIComponent(trick)}+tutorial`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <Badge 
                          variant="outline"
                          className="cursor-pointer hover-elevate flex items-center gap-1.5 bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                          data-testid={`profile-badge-trick-${trick.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {trick}
                          <SiYoutube className="w-3 h-3 text-red-500 opacity-70 group-hover:opacity-100" />
                        </Badge>
                      </a>
                    ))
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-dashed border-emerald-400/50 dark:border-emerald-600/50 text-emerald-700 dark:text-emerald-400"
                      onClick={() => {
                        setTricksList([]);
                        setCustomTrick("");
                        setEditingTricks(true);
                      }}
                      data-testid="button-add-first-trick"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      No tricks logged yet. Tap to add some!
                    </Button>
                  )}
                </div>
              )}
              {!editingTricks && profile.tricks?.length ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 flex items-center gap-1">
                  <SiYoutube className="w-3 h-3 text-red-500" />
                  Tap any trick for tutorial videos
                </p>
              ) : null}
            </div>

            <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/30">
              <h3 className="text-sm font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Trip Interests ({profile.tripInterests?.length || 0})
                </span>
                {!editingTripInterests && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => {
                      setTripInterestsList(profile.tripInterests || []);
                      setEditingTripInterests(true);
                    }}
                    data-testid="button-edit-trip-interests"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </h3>
              
              {editingTripInterests ? (
                <div className="space-y-4 p-4 bg-white/50 dark:bg-background/50 rounded-xl border border-sky-200/50 dark:border-sky-800/30">
                  {[
                    { label: "Vibe", items: ["Party", "420 Friendly", "Drinks", "Platonic Only"] },
                    { label: "Status", items: ["Single", "In a Relationship"] },
                    { label: "Activities", items: ["Spearfishing", "Zip Line", "Restaurants", "Coffee"] },
                    { label: "Equipment", items: ["Needs Surf Lessons", "Needs Board", "Needs Dive Gear", "Has Dive Gear", "Has Surfboard", "Needs Surf Guide"] },
                    { label: "Food & Experience", items: ["Wants Local Experience", "Local Food", "Fancy Food", "Pizza", "Chicken Tenders"] },
                    { label: "Language", items: ["Speaks the Language", "Knows a Few Words", "Relies on Hand Gestures & Grunting", "Has Interpreter App"] },
                  ].map(category => (
                    <div key={category.label}>
                      <Label className="text-xs text-muted-foreground mb-2 block">{category.label}</Label>
                      <div className="flex flex-wrap gap-2">
                        {category.items.map(item => {
                          const isSelected = tripInterestsList.includes(item);
                          return (
                            <Badge
                              key={item}
                              variant="outline"
                              className={`cursor-pointer toggle-elevate ${isSelected ? "toggle-elevated bg-sky-200 dark:bg-sky-800 border-sky-400 dark:border-sky-600" : "bg-sky-50/50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800"}`}
                              onClick={() => {
                                const newList = isSelected
                                  ? tripInterestsList.filter(i => i !== item)
                                  : [...tripInterestsList, item];
                                setTripInterestsList(newList);
                                autoSave({ tripInterests: newList });
                              }}
                              data-testid={`badge-trip-interest-${item.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {item}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-sky-200/50 dark:border-sky-800/30">
                    <p className="text-xs text-muted-foreground">Changes save automatically</p>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        updateProfileMutation.mutate({ tripInterests: tripInterestsList });
                        setEditingTripInterests(false);
                      }}
                      data-testid="button-done-trip-interests"
                    >
                      <Check className="h-4 w-4 mr-1" /> Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.tripInterests?.length ? (
                    profile.tripInterests.map((interest: string) => (
                      <Badge 
                        key={interest}
                        variant="outline"
                        className="bg-sky-100/50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700"
                        data-testid={`profile-badge-trip-interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {interest}
                      </Badge>
                    ))
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-dashed border-sky-400/50 dark:border-sky-600/50 text-sky-700 dark:text-sky-400"
                      onClick={() => {
                        setTripInterestsList([]);
                        setEditingTripInterests(true);
                      }}
                      data-testid="button-add-first-trip-interest"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add your trip preferences
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {!profile.isPremium && (
            <div className="mt-12 mb-4">
              <Button 
                onClick={() => setShowPremium(true)}
                variant="outline"
                className="w-full text-muted-foreground"
                data-testid="button-upgrade-premium"
              >
                <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
              </Button>
            </div>
          )}

          <div className="mt-16 pt-8 border-t border-border/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 text-center">
              Get the App
            </h3>
            <InstallAppButton />
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  hasProfile: boolean;
  displayName: string | null;
  isMockUser: boolean;
}

interface VisitorData {
  ip: string;
  visits: number;
  lastVisit: string;
  lastPath: string;
  userAgent: string;
  isAuthenticated: boolean;
  userId: string | null;
}

function AdminUsersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'users' | 'visitors'>('users');
  
  const { data, isLoading } = useQuery<{ realUsers: AdminUser[]; mockUserCount: number; totalCount: number }>({
    queryKey: ['/api/admin/users'],
    enabled: open && activeTab === 'users',
  });

  const { data: visitorsData, isLoading: visitorsLoading } = useQuery<{ 
    visitors: VisitorData[]; 
    totalVisits: number; 
    uniqueCount: number;
    anonymousCount: number;
  }>({
    queryKey: ['/api/admin/visitors'],
    enabled: open && activeTab === 'visitors',
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Dashboard
          </DialogTitle>
          <DialogDescription>
            View registered users and site visitors
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mb-2">
          <Button 
            size="sm" 
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
            data-testid="button-tab-users"
          >
            Users
          </Button>
          <Button 
            size="sm" 
            variant={activeTab === 'visitors' ? 'default' : 'outline'}
            onClick={() => setActiveTab('visitors')}
            data-testid="button-tab-visitors"
          >
            Visitors
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {activeTab === 'users' ? (
            isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : data ? (
              <>
                <div className="text-sm text-muted-foreground mb-4 p-2 bg-secondary/30 rounded">
                  <p><strong>{data.realUsers.length}</strong> real users</p>
                  <p><strong>{data.mockUserCount}</strong> mock/test users</p>
                  <p><strong>{data.totalCount}</strong> total</p>
                </div>
                
                {data.realUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No real users found (only mock users exist)
                  </p>
                ) : (
                  data.realUsers.map((user) => (
                    <div key={user.id} className="p-3 border rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        {user.hasProfile ? (
                          <Link 
                            href={`/profile/${user.id}`}
                            className="font-medium text-primary hover:underline cursor-pointer"
                            onClick={() => onOpenChange(false)}
                            data-testid={`link-user-profile-${user.id}`}
                          >
                            {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'}
                          </Link>
                        ) : (
                          <span className="font-medium">
                            {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'}
                          </span>
                        )}
                        <Badge variant={user.hasProfile ? "default" : "secondary"}>
                          {user.hasProfile ? "Has Profile" : "No Profile"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email || 'No email'}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">ID: {user.id}</p>
                    </div>
                  ))
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">Failed to load users</p>
            )
          ) : (
            visitorsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : visitorsData ? (
              <>
                <div className="text-sm text-muted-foreground mb-4 p-2 bg-secondary/30 rounded">
                  <p><strong>{visitorsData.uniqueCount}</strong> unique visitors</p>
                  <p><strong>{visitorsData.anonymousCount}</strong> anonymous (not logged in)</p>
                  <p><strong>{visitorsData.totalVisits}</strong> total page views</p>
                </div>
                
                {visitorsData.visitors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No visitors tracked yet
                  </p>
                ) : (
                  visitorsData.visitors.map((visitor, idx) => (
                    <div key={`${visitor.ip}-${idx}`} className="p-3 border rounded-lg space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium truncate">{visitor.ip}</span>
                        <Badge variant={visitor.isAuthenticated ? "default" : "secondary"}>
                          {visitor.isAuthenticated ? "Logged In" : "Anonymous"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <strong>{visitor.visits}</strong> visits - Last: {visitor.lastPath}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(visitor.lastVisit).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {visitor.userAgent.substring(0, 60)}...
                      </p>
                    </div>
                  ))
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">Failed to load visitors</p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSkeleton() {
  return (
    <Layout>
      <div className="h-40 bg-muted animate-pulse" />
      <div className="px-6 -mt-16">
        <Skeleton className="w-32 h-32 rounded-full border-4 border-background mb-4" />
        <Skeleton className="w-48 h-8 mb-2" />
        <Skeleton className="w-32 h-4 mb-8" />
        <Skeleton className="w-full h-24 rounded-2xl mb-8" />
        <div className="space-y-4">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      </div>
    </Layout>
  );
}
