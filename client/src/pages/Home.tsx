import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Camera, MapPin, ExternalLink, Loader2, Mail, Calendar, Radio, Waves, Zap, TreePine, PartyPopper, Fish, AlertCircle, X, UserPlus, Plane } from "lucide-react";
import { ShakaIcon } from "@/components/ShakaIcon";
import { MessageDialog } from "@/components/MessageDialog";
import type { PostWithUser, Profile, Trip } from "@shared/schema";
import { SafeImage } from "@/components/SafeImage";
import { useState, useCallback, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Download } from "lucide-react";
import { useMyProfile } from "@/hooks/use-profiles";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface PostCardProps {
  post: PostWithUser & { location: { name: string } };
  onMessageClick: (user: Profile) => void;
}

function PostCard({ post, onMessageClick }: PostCardProps) {
  const [showShaka, setShowShaka] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  const { data: likeData } = useQuery<{ liked: boolean; count: number }>({
    queryKey: ["/api/posts", post.id, "like"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${post.id}/like`);
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/posts/${post.id}/like`);
      return res.json();
    },
    onSuccess: (data: { liked: boolean; count: number }) => {
      setIsLiked(data.liked);
      setLikeCount(data.count);
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "like"] });
    },
  });

  const currentLiked = likeData?.liked ?? isLiked;
  const currentCount = likeData?.count ?? likeCount;

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      if (!currentLiked) {
        likeMutation.mutate();
      }
      setShowShaka(true);
      setTimeout(() => setShowShaka(false), 1000);
    }
    setLastTap(now);
  }, [lastTap, currentLiked, likeMutation]);

  const handleLikeClick = () => {
    likeMutation.mutate();
    if (!currentLiked) {
      setShowShaka(true);
      setTimeout(() => setShowShaka(false), 1000);
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <div 
        className="relative aspect-square bg-muted cursor-pointer select-none"
        onClick={handleDoubleTap}
        data-testid={`post-image-${post.id}`}
      >
        <img 
          src={post.imageUrl} 
          alt="Surf session" 
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
        
        <AnimatePresence>
          {showShaka && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-24 h-24 bg-white/90 rounded-full flex items-center justify-center shadow-xl">
                <ShakaIcon className="w-12 h-12 text-primary" filled />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute top-4 left-4">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-xs border border-white/20">
            <MapPin className="h-3 w-3" />
            {post.location.name}
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Link href={`/profile/${post.user.userId}`}>
            <Button variant="outline" size="sm" className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20">
              <ExternalLink className="mr-2 h-4 w-4" />
              See User Profile
            </Button>
          </Link>
        </div>
      </div>
      <CardContent className="p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={post.user.imageUrls?.[0]} />
              <AvatarFallback>{post.user.displayName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{post.user.displayName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{post.user.skillLevel} Surfer</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onMessageClick(post.user)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-secondary/50 transition-colors"
              data-testid={`button-message-post-${post.id}`}
            >
              <Mail className="h-5 w-5 text-muted-foreground" />
            </button>
            <button 
              onClick={handleLikeClick}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-secondary/50 transition-colors"
              data-testid={`button-like-post-${post.id}`}
            >
              <ShakaIcon className={`h-5 w-5 ${currentLiked ? 'text-primary' : 'text-muted-foreground'}`} filled={currentLiked} />
              {currentCount > 0 && (
                <span className={`text-sm font-medium ${currentLiked ? 'text-primary' : 'text-muted-foreground'}`}>
                  {currentCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <p className="text-sm text-card-foreground leading-relaxed">
          {post.caption}
        </p>
      </CardContent>
    </Card>
  );
}

function BroadcastTripCard({ trip }: { trip: Trip & { organizer: Profile } }) {
  const preferenceLabels: Record<string, Record<string, string>> = {
    waveType: { steep: "Steep", mellow: "Mellow" },
    rideStyle: { performance: "Perform", chill: "Chill" },
    locationPreference: { remote: "Remote", town: "Town" },
    vibe: { party: "Party", waterTime: "Water" },
  };

  return (
    <Link href={`/profile/${trip.organizer.userId}`}>
      <Card className="overflow-hidden hover-elevate cursor-pointer" data-testid={`broadcast-trip-${trip.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarImage src={trip.organizer.imageUrls?.[0]} />
              <AvatarFallback>{trip.organizer.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{trip.organizer.displayName}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <Radio className="w-2.5 h-2.5 mr-1" />
                  Broadcasting
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <MapPin className="w-3 h-3" />
                <span className="font-medium text-foreground">{trip.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="w-3 h-3" />
                <span>
                  {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(trip.waveType || []).map((val) => (
                  <Badge key={val} variant="outline" className="text-[10px] px-1.5 py-0">
                    <Waves className="w-2.5 h-2.5 mr-1" />
                    {preferenceLabels.waveType[val] || val}
                  </Badge>
                ))}
                {(trip.rideStyle || []).map((val) => (
                  <Badge key={val} variant="outline" className="text-[10px] px-1.5 py-0">
                    <Zap className="w-2.5 h-2.5 mr-1" />
                    {preferenceLabels.rideStyle[val] || val}
                  </Badge>
                ))}
                {(trip.locationPreference || []).map((val) => (
                  <Badge key={val} variant="outline" className="text-[10px] px-1.5 py-0">
                    <TreePine className="w-2.5 h-2.5 mr-1" />
                    {preferenceLabels.locationPreference[val] || val}
                  </Badge>
                ))}
                {(trip.vibe || []).map((val) => (
                  <Badge key={val} variant="outline" className="text-[10px] px-1.5 py-0">
                    <PartyPopper className="w-2.5 h-2.5 mr-1" />
                    {preferenceLabels.vibe[val] || val}
                  </Badge>
                ))}
                {trip.extraActivities?.map(activity => (
                  <Badge key={activity} variant="outline" className="text-[10px] px-1.5 py-0">
                    <Fish className="w-2.5 h-2.5 mr-1" />
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface AlertItem {
  id: string;
  type: "new_trip" | "join_request";
  message: string;
  link?: string;
  tripId?: number;
}

export default function Home() {
  const { data: profile } = useMyProfile();
  const { data: posts, isLoading } = useQuery<(PostWithUser & { location: { name: string } })[]>({
    queryKey: ["/api/posts"],
  });
  const { data: broadcastTrips } = useQuery<(Trip & { organizer: Profile })[]>({
    queryKey: ["/api/trips/broadcast"],
  });
  
  // Fetch user's trips to check for pending join requests
  const { data: myTrips } = useQuery<Trip[]>({
    queryKey: ["/api/trips/user"],
    enabled: !!profile,
  });

  const [messageBuddy, setMessageBuddy] = useState<Profile | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Build alerts from data
  useEffect(() => {
    const newAlerts: AlertItem[] = [];
    
    // Check for new broadcast trips (trips starting soon or recently added)
    if (broadcastTrips) {
      const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
      broadcastTrips.forEach(trip => {
        const startDate = new Date(trip.startDate).getTime();
        // Show alerts for trips starting within a week that aren't the user's own
        if (startDate < oneWeekFromNow && startDate > Date.now() && trip.organizerId !== profile?.userId) {
          newAlerts.push({
            id: `new_trip_${trip.id}`,
            type: "new_trip",
            message: `New trip to ${trip.destination} just added!`,
            link: `/trips/${trip.id}`,
            tripId: trip.id,
          });
        }
      });
    }
    
    setAlerts(newAlerts.filter(a => !dismissedAlerts.has(a.id)));
  }, [broadcastTrips, profile, dismissedAlerts]);

  // Fetch pending participants for my trips
  const { data: pendingRequests } = useQuery<any[]>({
    queryKey: ["/api/trips/my-pending-requests"],
    queryFn: async () => {
      if (!myTrips?.length) return [];
      const allPending: any[] = [];
      for (const trip of myTrips) {
        try {
          const res = await fetch(`/api/trips/${trip.id}/participants`);
          if (res.ok) {
            const participants = await res.json();
            const pending = participants.filter((p: any) => p.status === "pending");
            pending.forEach((p: any) => {
              allPending.push({ ...p, trip });
            });
          }
        } catch {}
      }
      return allPending;
    },
    enabled: !!myTrips?.length,
  });

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.add(alertId);
      return newSet;
    });
  };

  const handleMessageClick = (user: Profile) => {
    setMessageBuddy(user);
    setMessageDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-20">
      <header className="p-2 border-b bg-background/80 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
        <div className="w-10" />
        
        <button
          className="flex flex-col items-center gap-0.5"
          onClick={() => setShowQR(true)}
          data-testid="button-show-qr-home"
        >
          <img 
            src="/boardmeeting-qr-code.png" 
            alt="Share App" 
            className="w-8 h-8 rounded shadow border border-border bg-white"
          />
          <span className="text-[8px] font-medium text-muted-foreground">Share</span>
        </button>
        
        <Link href="/post/new">
          <Button size="icon" variant="ghost" data-testid="button-camera">
            <Camera className="h-6 w-6" />
          </Button>
        </Link>
      </header>

      {showQR && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowQR(false)}
        >
          <div 
            className="bg-card rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => setShowQR(false)}
              data-testid="button-close-qr-home"
            >
              <X className="w-5 h-5" />
            </Button>
            <h3 className="font-bold text-lg mb-2">Share Board Meeting</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scan to join the surf community!
            </p>
            <img 
              src="/boardmeeting-qr-code.png" 
              alt="Board Meeting QR Code" 
              className="w-48 h-48 mx-auto rounded-lg"
              data-testid="img-qr-code-modal-home"
            />
            <p className="text-xs text-muted-foreground mt-3 mb-4">boardmeetingsurf.com</p>
            <a
              href="/boardmeeting-qr-code.png"
              download="boardmeeting-qr-code.png"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid="link-download-qr-home"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </a>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <AnimatePresence>
        {(alerts.length > 0 || (pendingRequests && pendingRequests.length > 0)) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-4 space-y-2"
          >
            {/* New Trip Alerts */}
            {alerts.map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Plane className="w-4 h-4 text-primary" />
                </div>
                <Link href={alert.link || "#"} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                </Link>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => dismissAlert(alert.id)}
                  data-testid={`button-dismiss-alert-${alert.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}

            {/* Pending Join Request Alerts */}
            {pendingRequests?.map(req => (
              <motion.div
                key={`join_${req.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                </div>
                <Link href={`/trips/${req.trip.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      New ride request for {req.trip.destination}!
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.profile?.displayName} wants to join your trip
                  </p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 pb-0">
        <Link href="/post/new">
          <div 
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-cyan-400 p-4 cursor-pointer hover-elevate"
            data-testid="button-share-session"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Share Your Session</p>
                <p className="text-white/80 text-xs">Post your best wave of the day</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">+</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {broadcastTrips && broadcastTrips.length > 0 && (
        <div className="px-4 pt-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Surfers Looking for Buddies
          </h2>
          <div className="space-y-3">
            {broadcastTrips.map((trip) => (
              <BroadcastTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 p-4">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} onMessageClick={handleMessageClick} />
        ))}

        {!posts?.length && (
          <div className="text-center py-20 space-y-4">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
            <p className="text-muted-foreground">No surf photos shared yet.</p>
          </div>
        )}
      </div>

      <MessageDialog
        buddy={messageBuddy}
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
      />
    </div>
  );
}
