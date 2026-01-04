import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Camera, MapPin, ExternalLink, Loader2 } from "lucide-react";
import type { PostWithUser } from "@shared/schema";
import { SafeImage } from "@/components/SafeImage";

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
        <Button size="icon" variant="ghost">
          <Camera className="h-6 w-6" />
        </Button>
      </header>

      <div className="space-y-4 p-4">
        {posts?.map((post) => (
          <Card key={post.id} className="overflow-hidden border-none shadow-lg">
            <div className="relative aspect-square bg-muted">
              <SafeImage 
                src={post.imageUrl} 
                alt="Surf session" 
                className="w-full h-full object-cover"
              />
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
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-8 w-8 border border-primary/20">
                  <AvatarImage src={post.user.imageUrls?.[0]} />
                  <AvatarFallback>{post.user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{post.user.displayName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{post.user.skillLevel} Surfer</p>
                </div>
              </div>
              <p className="text-sm text-card-foreground leading-relaxed">
                {post.caption}
              </p>
            </CardContent>
          </Card>
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
