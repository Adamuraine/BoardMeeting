import { useState, useMemo } from "react";
import { useProfiles, useSwipe, useMyProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { AnimatePresence, motion, PanInfo, useAnimation } from "framer-motion";
import { X, MapPin, Users, Search, Eye, LogIn, SlidersHorizontal, Crown } from "lucide-react";
import shakaImg from "@assets/image_1767482724996.png";
import { PremiumModal } from "@/components/PremiumModal";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/SafeImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Buddies() {
  const { user } = useAuth();
  const { data: profiles, isLoading, error } = useProfiles();
  const { data: myProfile } = useMyProfile();
  const { mutate: swipe } = useSwipe();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [, navigate] = useLocation();
  const controls = useAnimation();

  const isPremium = myProfile?.isPremium ?? false;

  const { data: searchResults = [] } = useQuery<Profile[]>({
    queryKey: ['/api/profiles/search', searchQuery],
    enabled: searchQuery.trim().length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    if (!isPremium) return profiles;
    return profiles.filter(p => {
      if (genderFilter !== "all" && p.gender && p.gender !== genderFilter) return false;
      if (ageFilter !== "all" && p.age) {
        const parts = ageFilter.split("-");
        const min = parseInt(parts[0]);
        const max = parts[1] === "+" ? Infinity : parseInt(parts[1]);
        if (p.age < min || p.age > max) return false;
      }
      return true;
    });
  }, [profiles, genderFilter, ageFilter, isPremium]);

  if (isLoading) return <BuddiesSkeleton />;
  if (error) {
    return (
      <Layout>
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <X className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-2">Oops!</h2>
          <p className="text-muted-foreground mb-8">
            Failed to load surfers. Please try again.
          </p>
          <button onClick={() => window.location.reload()} className="text-primary font-medium hover:underline">
            Refresh
          </button>
        </div>
      </Layout>
    );
  }
  if (!filteredProfiles || filteredProfiles.length === 0) return <NoBuddies />;

  const safeIndex = Math.min(currentIndex, filteredProfiles.length - 1);
  const currentProfile = filteredProfiles[safeIndex];

  const handleDragEnd = async (_: any, info: PanInfo) => {
    // Check if user is logged in before allowing swipe
    if (!user) {
      controls.start({ x: 0, opacity: 1, rotate: 0 });
      setShowLoginPrompt(true);
      return;
    }
    
    const threshold = 100;
    if (info.offset.x > threshold) {
      await controls.start({ x: 500, opacity: 0, rotate: 20 });
      handleSwipe("right");
    } else if (info.offset.x < -threshold) {
      await controls.start({ x: -500, opacity: 0, rotate: -20 });
      handleSwipe("left");
    } else {
      controls.start({ x: 0, opacity: 1, rotate: 0 });
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentProfile) return;
    
    // Check if user is logged in
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      controls.set({ x: 0, opacity: 1, rotate: 0 });
    }, 200);
    
    swipe({ swipedId: currentProfile.userId, direction }, {
      onError: (err) => {
        if (err.message === 'LIMIT_REACHED') {
          setShowPremium(true);
          setCurrentIndex(prev => Math.max(0, prev - 1));
          controls.set({ x: 0, opacity: 1, rotate: 0 });
        }
      }
    });
  };

  const viewProfile = () => {
    if (currentProfile && !isDragging) {
      navigate(`/profile/${currentProfile.userId}`);
    }
  };

  if (!currentProfile) return <NoBuddies />;

  return (
    <Layout>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      {/* Login prompt for anonymous users */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Sign in to Connect
            </DialogTitle>
            <DialogDescription>
              Create a free account to swipe and connect with surf buddies. Your profile helps others know who they're paddling out with!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full"
              data-testid="button-login-prompt"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign in with Apple or Google
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowLoginPrompt(false)}
              className="w-full"
              data-testid="button-continue-browsing"
            >
              Continue Browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="h-full flex flex-col relative">
        <header className="px-4 py-3 space-y-3 relative z-20">
          <div className="flex justify-between items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-foreground">Discover</h1>
            <div className="bg-secondary/50 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
              San Diego, CA
            </div>
          </div>
          <div className="relative flex gap-2" style={{ zIndex: 100 }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Search surfers by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 300)}
                className="pl-9 h-10"
                data-testid="input-search-buddies"
              />
            </div>
            <Button 
              size="default"
              onClick={() => setShowResults(true)}
              data-testid="button-search-execute"
            >
              <Search className="w-4 h-4" />
            </Button>
            
            {showResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 9999 }}>
                {searchResults.length > 0 ? (
                  searchResults.map((profile) => (
                    <Link 
                      key={profile.id} 
                      href={`/profile/${profile.userId}`}
                      className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors"
                      data-testid={`search-result-${profile.id}`}
                    >
                      <Avatar className="h-10 w-10 border border-primary/20">
                        <AvatarImage src={profile.imageUrls?.[0]} />
                        <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{profile.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.location || "Location unknown"} • {profile.skillLevel}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No surfers found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showFilters ? "default" : "outline"}
              onClick={() => {
                if (!isPremium) {
                  setShowPremium(true);
                  return;
                }
                setShowFilters(!showFilters);
              }}
              className="gap-1.5"
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {!isPremium && <Crown className="w-3 h-3 text-amber-500" />}
            </Button>
            {isPremium && (genderFilter !== "all" || ageFilter !== "all") && (
              <Badge variant="secondary" className="text-xs">
                {[genderFilter !== "all" ? genderFilter : null, ageFilter !== "all" ? ageFilter : null].filter(Boolean).join(", ")}
              </Badge>
            )}
          </div>
          {showFilters && isPremium && (
            <div className="flex gap-2">
              <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setCurrentIndex(0); }}>
                <SelectTrigger className="h-9 flex-1" data-testid="select-gender-filter">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ageFilter} onValueChange={(v) => { setAgeFilter(v); setCurrentIndex(0); }}>
                <SelectTrigger className="h-9 flex-1" data-testid="select-age-filter">
                  <SelectValue placeholder="Age Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="18-25">18 - 25</SelectItem>
                  <SelectItem value="26-35">26 - 35</SelectItem>
                  <SelectItem value="36-45">36 - 45</SelectItem>
                  <SelectItem value="46-55">46 - 55</SelectItem>
                  <SelectItem value="56-+">56+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </header>

        <div className="flex-1 relative flex items-center justify-center px-4 pb-2">
          <AnimatePresence>
            <motion.div
              key={currentProfile.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={(e, info) => {
                setTimeout(() => setIsDragging(false), 100);
                handleDragEnd(e, info);
              }}
              animate={controls}
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute inset-x-4 top-0 bottom-0 rounded-3xl overflow-hidden shadow-2xl bg-card border border-border/50 select-none cursor-grab active:cursor-grabbing flex flex-col"
              onClick={viewProfile}
            >
              <div className="relative h-3/5 shrink-0 bg-muted">
                 <SafeImage 
                   src={currentProfile.imageUrls?.[0]} 
                   alt={currentProfile.displayName} 
                   className="w-full h-full object-cover"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                 
                 <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-end justify-between mb-1">
                      <div>
                        <h2 className="text-2xl font-display font-bold">
                          {currentProfile.displayName}, {currentProfile.age}
                        </h2>
                        <div className="flex items-center text-white/80 mt-0.5">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="text-xs">{currentProfile.location || "Oceanside, CA"}</span>
                        </div>
                      </div>
                      <div className="bg-primary/90 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {currentProfile.skillLevel}
                      </div>
                    </div>
                 </div>
              </div>

              <div className="flex-1 bg-background p-4 flex flex-col overflow-hidden">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 italic">
                  "{currentProfile.bio || "Just here for the waves!"}"
                </p>

                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 tracking-tighter">Action Shots</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {(currentProfile.imageUrls?.length || 0) > 1 ? (
                      currentProfile.imageUrls?.slice(1).map((url, i) => (
                        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-border shadow-sm bg-muted">
                          <SafeImage src={url} alt="Surf action" className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      [1, 2].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-lg bg-secondary/30 flex items-center justify-center border border-dashed border-border">
                          <Users className="w-6 h-6 text-muted-foreground/20" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentProfile.tricks?.slice(0, 3).map((trick, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-[10px] font-medium">
                      {trick}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="h-20 flex items-center justify-center gap-6 shrink-0">
          <button 
            onClick={() => {
              controls.start({ x: -500, opacity: 0, rotate: -20 });
              handleSwipe("left");
            }}
            className="w-16 h-16 rounded-full bg-white shadow-lg shadow-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all border border-red-100"
            data-testid="button-swipe-left"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button 
            onClick={viewProfile}
            className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-primary transition-all"
            data-testid="button-view-profile"
          >
            <Eye className="w-5 h-5" />
          </button>

          <button 
            onClick={() => {
              controls.start({ x: 500, opacity: 0, rotate: 20 });
              handleSwipe("right");
            }}
            className="w-16 h-16 rounded-full bg-white shadow-lg shadow-primary/25 flex items-center justify-center p-3 hover:scale-110 transition-all border border-primary/20"
            data-testid="button-swipe-right"
          >
            <img src={shakaImg} alt="Hang Loose" className="w-full h-full object-contain" />
          </button>
        </div>
      </div>
    </Layout>
  );
}

function NoBuddies() {
  return (
    <Layout>
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Users className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">You've seen everyone!</h2>
        <p className="text-muted-foreground mb-8">
          Check back later for new surfers in your area.
        </p>
      </div>
    </Layout>
  );
}

function BuddiesSkeleton() {
  return (
    <Layout>
      <div className="h-full flex flex-col">
        <header className="flex justify-between items-center px-4 py-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </header>
        <div className="flex-1 px-4 pb-4">
          <Skeleton className="w-full h-full rounded-3xl" />
        </div>
        <div className="h-20 flex items-center justify-center gap-6">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
      </div>
    </Layout>
  );
}
