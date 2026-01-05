import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Camera, MapPin, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { ShakaIcon } from "@/components/ShakaIcon";
import type { PostWithUser } from "@shared/schema";
import { SafeImage } from "@/components/SafeImage";
import { useState, useCallback } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

interface PostCardProps {
  post: PostWithUser & { location: { name: string } };
}

function PostCard({ post }: PostCardProps) {
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
            <Link href={`/messages?buddy=${post.user.userId}`}>
              <button 
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-secondary/50 transition-colors"
                data-testid={`button-message-post-${post.id}`}
              >
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </button>
            </Link>
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

export default function Home() {
  const { data: posts, isLoading } = useQuery<(PostWithUser & { location: { name: string } })[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-20">
      <header className="p-4 border-b bg-background/80 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold text-primary italic">SurfTribe</h1>
        <Button size="icon" variant="ghost" data-testid="button-camera">
          <Camera className="h-6 w-6" />
        </Button>
      </header>

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
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {!posts?.length && (
          <div className="text-center py-20 space-y-4">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
            <p className="text-muted-foreground">No surf photos shared yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
