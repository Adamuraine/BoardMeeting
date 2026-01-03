import { useState } from "react";
import { useProfiles, useSwipe } from "@/hooks/use-profiles";
import { Layout } from "@/components/Layout";
import { AnimatePresence, motion, PanInfo, useAnimation } from "framer-motion";
import { X, MapPin, Info, Users, ChevronLeft, ChevronRight } from "lucide-react";
import shakaImg from "@assets/image_1767482724996.png";
import { PremiumModal } from "@/components/PremiumModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function Buddies() {
  const { data: profiles, isLoading } = useProfiles();
  const { mutate: swipe } = useSwipe();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const controls = useAnimation();

  if (isLoading) return <BuddiesSkeleton />;
  if (!profiles || profiles.length === 0) return <NoBuddies />;

  // Filter out profiles already swiped locally (naive approach for MVP)
  // In real app, API shouldn't return them
  const currentProfile = profiles[currentIndex];

  const handleDragEnd = async (_: any, info: PanInfo) => {
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
    
    swipe({ swipedId: currentProfile.userId, direction }, {
      onError: (err) => {
        if (err.message === 'LIMIT_REACHED') {
          setShowPremium(true);
          // Reset card position since swipe failed
          controls.set({ x: 0, opacity: 1, rotate: 0 });
        }
      },
      onSuccess: () => {
        // Wait for animation to finish visually before changing index
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          controls.set({ x: 0, opacity: 1, rotate: 0 });
        }, 200);
      }
    });
  };

  if (!currentProfile) return <NoBuddies />;

  return (
    <Layout>
      <PremiumModal open={showPremium} onOpenChange={setShowPremium} />
      
      <div className="h-full flex flex-col p-4 relative">
        <header className="flex justify-between items-center mb-4 pt-2">
           <h1 className="text-2xl font-display font-bold text-foreground">Discover</h1>
           <div className="bg-secondary/50 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
             San Diego, CA
           </div>
        </header>

        <div className="flex-1 relative flex items-center justify-center">
          <AnimatePresence>
            <motion.div
              key={currentProfile.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              animate={controls}
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.05, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="absolute w-full h-[70vh] rounded-3xl overflow-hidden shadow-2xl bg-white border border-border/50 select-none cursor-grab active:cursor-grabbing flex flex-col"
            >
              {/* Profile Image - Headshot */}
              <div className="relative h-3/5 shrink-0">
                 <img 
                   src={currentProfile.imageUrls?.[0] || "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80"} 
                   alt={currentProfile.displayName} 
                   className="w-full h-full object-cover"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                 
                 {/* Profile Info Overlay on Image */}
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

              {/* Additional Content Below */}
              <div className="flex-1 bg-background p-4 flex flex-col overflow-hidden">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 italic">
                  "{currentProfile.bio || "Just here for the waves!"}"
                </p>

                {/* Additional Photos / Action Shots */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 tracking-tighter">Action Shots</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {(currentProfile.imageUrls?.length || 0) > 1 ? (
                      currentProfile.imageUrls?.slice(1).map((url, i) => (
                        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-border shadow-sm">
                          <img src={url} alt="Surf action" className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      // Fallback placeholders if no action shots
                      [1, 2].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-24 h-24 rounded-lg bg-secondary/30 flex items-center justify-center border border-dashed border-border">
                          <Users className="w-6 h-6 text-muted-foreground/20" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tricks / Tags */}
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

        {/* Action Buttons */}
        <div className="h-24 flex items-center justify-center gap-6 mt-4">
          <button 
            onClick={() => {
              controls.start({ x: -500, opacity: 0, rotate: -20 });
              handleSwipe("left");
            }}
            className="w-16 h-16 rounded-full bg-white shadow-lg shadow-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-50 hover:scale-110 transition-all border border-red-100"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all">
            <Info className="w-5 h-5" />
          </button>

          <button 
            onClick={() => {
              controls.start({ x: 500, opacity: 0, rotate: 20 });
              handleSwipe("right");
            }}
            className="w-16 h-16 rounded-full bg-white shadow-lg shadow-primary/25 flex items-center justify-center p-3 hover:scale-110 transition-all border border-primary/20"
          >
            <img src={shakaImg} alt="Hang Loose" className="w-full h-full object-contain" />
          </button>
        </div>
      </div>
    </Layout>
  );
}

function BuddiesSkeleton() {
  return (
    <Layout>
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="flex-1 w-full rounded-3xl" />
        <div className="h-24 flex justify-center gap-6 mt-4 items-center">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
      </div>
    </Layout>
  );
}

function NoBuddies() {
  return (
    <Layout>
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
          <Users className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold font-display mb-2">All Caught Up!</h2>
        <p className="text-muted-foreground mb-8">
          There are no more surfers in your area right now. Check back later or expand your search.
        </p>
        <button onClick={() => window.location.reload()} className="text-primary font-medium hover:underline">
          Refresh List
        </button>
      </div>
    </Layout>
  );
}
