import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Camera, MapPin, ExternalLink, Loader2, Mail, Calendar, Radio, Waves, Zap, TreePine, PartyPopper, Fish, AlertCircle, X, UserPlus, Plane, Tag, DollarSign, ShoppingBag, ArrowRight } from "lucide-react";
import { ShakaIcon } from "@/components/ShakaIcon";
import { MessageDialog } from "@/components/MessageDialog";
import type { PostWithUser, Profile, Trip, MarketplaceListing } from "@shared/schema";
import { SafeImage } from "@/components/SafeImage";
import { useState, useCallback, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMyProfile } from "@/hooks/use-profiles";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type PostFeedItem = PostWithUser & { location: { name: string } | null };
type ListingFeedItem = MarketplaceListing & { seller: Profile };
type TripFeedItem = Trip & { organizer: Profile };

interface FeedItem {
  type: "post" | "listing" | "trip";
  id: string;
  createdAt: string | Date | null;
  data: PostFeedItem | ListingFeedItem | TripFeedItem;
}

interface PostCardProps {
  post: PostFeedItem;
  onMessageClick: (user: Profile) => void;
}

function PostCard({ post, onMessageClick }: PostCardProps) {
  const [showShaka, setShowShaka] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [myCount, setMyCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  const { data: likeData } = useQuery<{ count: number; myCount: number }>({
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
    onSuccess: (data: { count: number; myCount: number }) => {
      setLikeCount(data.count);
      setMyCount(data.myCount);
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id, "like"] });
    },
  });

  const currentCount = likeData?.count ?? likeCount;
  const currentMyCount = likeData?.myCount ?? myCount;
  const hasLiked = currentMyCount > 0;

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      likeMutation.mutate();
      setShowShaka(true);
      setTimeout(() => setShowShaka(false), 1000);
    }
    setLastTap(now);
  }, [lastTap, likeMutation]);

  const handleLikeClick = () => {
    likeMutation.mutate();
    setShowShaka(true);
    setTimeout(() => setShowShaka(false), 1000);
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
        
        {post.location?.name && (
          <div className="absolute top-4 left-4">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-white text-xs border border-white/20">
              <MapPin className="h-3 w-3" />
              {post.location.name}
            </div>
          </div>
        )}
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
              <ShakaIcon className={`h-5 w-5 ${hasLiked ? 'text-primary' : 'text-muted-foreground'}`} filled={hasLiked} />
              {currentCount > 0 && (
                <span className={`text-sm font-medium ${hasLiked ? 'text-primary' : 'text-muted-foreground'}`}>
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

function GearListingCard({ listing }: { listing: ListingFeedItem }) {
  const firstImage = listing.imageUrls?.[0];
  const priceDisplay = listing.listingType === "free" 
    ? "FREE" 
    : listing.price 
      ? `$${(listing.price / 100).toFixed(0)}` 
      : "Trade";

  const typeLabel = listing.listingType === "free" ? "Free" : listing.listingType === "trade" ? "Trade" : listing.listingType === "both" ? "Sell/Trade" : "For Sale";

  return (
    <Link href="/marketplace">
      <Card className="overflow-hidden hover-elevate cursor-pointer" data-testid={`feed-listing-${listing.id}`}>
        <div className="flex gap-0">
          {firstImage && (
            <div className="w-28 h-28 flex-shrink-0 bg-muted">
              <img 
                src={firstImage} 
                alt={listing.title} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <CardContent className="p-3 flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <ShoppingBag className="w-2.5 h-2.5 mr-1" />
                  Gear
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  {typeLabel}
                </Badge>
              </div>
              <p className="font-semibold text-sm truncate">{listing.title}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{listing.condition} · {listing.category}</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={listing.seller.imageUrls?.[0]} />
                  <AvatarFallback className="text-[8px]">{listing.seller.displayName[0]}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground">{listing.seller.displayName}</span>
              </div>
              <span className="font-bold text-sm text-primary">{priceDisplay}</span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

function TripFeedCard({ trip }: { trip: TripFeedItem }) {
  const preferenceLabels: Record<string, Record<string, string>> = {
    waveType: { steep: "Steep", mellow: "Mellow", point_break: "Point Break", beach_break: "Beach Break", outer_reef: "Reef", beginner_crumbly: "Beginner", long_performance: "Long Perf" },
    rideStyle: { performance: "Perform", chill: "Chill" },
    locationPreference: { remote: "Remote", town: "Town" },
    vibe: { party: "Party", waterTime: "Water" },
  };

  return (
    <Link href={`/trips/${trip.id}`}>
      <Card className="overflow-hidden hover-elevate cursor-pointer" data-testid={`feed-trip-${trip.id}`}>
        {trip.photos?.[0] && (
          <div className="relative h-36 bg-muted">
            <img 
              src={trip.photos[0]} 
              alt={trip.destination} 
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white font-bold text-base">{trip.destination}</p>
              <p className="text-white/80 text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d")}
              </p>
            </div>
          </div>
        )}
        <CardContent className="p-3">
          {!trip.photos?.[0] && (
            <div className="mb-2">
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-sm">{trip.destination}</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d")}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6 border border-primary/20">
              <AvatarImage src={trip.organizer.imageUrls?.[0]} />
              <AvatarFallback className="text-[9px]">{trip.organizer.displayName[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{trip.organizer.displayName}</span>
            {trip.broadcastEnabled && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Radio className="w-2.5 h-2.5 mr-1" />
                Looking for Buddies
              </Badge>
            )}
            {trip.isVisiting && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Plane className="w-2.5 h-2.5 mr-1" />
                Visiting
              </Badge>
            )}
          </div>
          {trip.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{trip.description}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {(trip.waveType || []).slice(0, 3).map((val) => (
              <Badge key={val} variant="outline" className="text-[10px] px-1.5 py-0">
                <Waves className="w-2.5 h-2.5 mr-1" />
                {preferenceLabels.waveType[val] || val}
              </Badge>
            ))}
            {(trip.rideStyle || []).slice(0, 2).map((val) => (
              <Badge key={val} variant="outline" className="text-[10px] px-1.5 py-0">
                <Zap className="w-2.5 h-2.5 mr-1" />
                {preferenceLabels.rideStyle[val] || val}
              </Badge>
            ))}
            {(trip.vibe || []).slice(0, 2).map((val) => (
              <Badge key={val} variant="outline" className="text-[10px] px-1.5 py-0">
                <PartyPopper className="w-2.5 h-2.5 mr-1" />
                {preferenceLabels.vibe[val] || val}
              </Badge>
            ))}
          </div>
          {trip.cost != null && trip.cost > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              <span>~${trip.cost} estimated cost</span>
            </div>
          )}
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
  const { data: feed, isLoading } = useQuery<FeedItem[]>({
    queryKey: ["/api/feed"],
  });
  const { data: myTrips } = useQuery<Trip[]>({
    queryKey: ["/api/trips/user"],
    enabled: !!profile,
  });

  const [messageBuddy, setMessageBuddy] = useState<Profile | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const broadcastTrips = feed
    ?.filter((item): item is FeedItem & { data: TripFeedItem } => item.type === "trip" && (item.data as TripFeedItem).broadcastEnabled === true)
    .map(item => item.data) || [];

  useEffect(() => {
    const newAlerts: AlertItem[] = [];
    
    if (broadcastTrips.length > 0) {
      const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
      broadcastTrips.forEach(trip => {
        const startDate = new Date(trip.startDate).getTime();
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
  }, [broadcastTrips.length, profile, dismissedAlerts]);

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
      <header className="p-2 border-b bg-background/80 backdrop-blur sticky top-0 z-10 flex justify-end items-center">
        <Link href="/post/new">
          <Button size="icon" variant="ghost" data-testid="button-camera">
            <Camera className="h-6 w-6" />
          </Button>
        </Link>
      </header>

      <AnimatePresence>
        {(alerts.length > 0 || (pendingRequests && pendingRequests.length > 0)) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-4 space-y-2"
          >
            {alerts.map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-primary/10 border border-primary/30 rounded-md p-3 flex items-center gap-3"
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
                  onClick={() => dismissAlert(alert.id)}
                  data-testid={`button-dismiss-alert-${alert.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}

            {pendingRequests?.map(req => (
              <motion.div
                key={`join_${req.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 flex items-center gap-3"
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

      <div className="space-y-4 p-4">
        {feed?.map((item) => {
          if (item.type === "post") {
            return (
              <PostCard 
                key={item.id} 
                post={item.data as PostFeedItem} 
                onMessageClick={handleMessageClick} 
              />
            );
          }
          if (item.type === "listing") {
            return (
              <GearListingCard 
                key={item.id} 
                listing={item.data as ListingFeedItem} 
              />
            );
          }
          if (item.type === "trip") {
            return (
              <TripFeedCard 
                key={item.id} 
                trip={item.data as TripFeedItem} 
              />
            );
          }
          return null;
        })}

        {!feed?.length && (
          <div className="text-center py-20 space-y-4">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
            <p className="text-muted-foreground">No activity yet. Be the first to share!</p>
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
