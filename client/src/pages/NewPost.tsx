import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Loader2, MapPin, Upload } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Location as LocationType } from "@shared/schema";

export default function NewPost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const pendingPathRef = useRef<string | null>(null);

  const { data: locations = [] } = useQuery<LocationType[]>({
    queryKey: ["/api/locations"],
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; caption: string; locationId: number }) => {
      const res = await apiRequest("POST", "/api/posts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({ title: "Posted!", description: "Your session photo is now live" });
      navigate("/home");
    },
    onError: () => {
      toast({ 
        title: "Failed to post", 
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    },
  });

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
    pendingPathRef.current = objectPath;
    return { url: uploadURL, method: "PUT" as const, headers: { "Content-Type": file.type } };
  };

  const handleUploadComplete = () => {
    if (pendingPathRef.current) {
      setImageUrl(`/objects/${pendingPathRef.current}`);
      pendingPathRef.current = null;
    }
  };

  const handleSubmit = () => {
    if (!imageUrl || !locationId) {
      toast({
        title: "Missing info",
        description: "Please add a photo and select a surf spot",
        variant: "destructive"
      });
      return;
    }
    createPostMutation.mutate({
      imageUrl,
      caption,
      locationId: parseInt(locationId),
    });
  };

  return (
    <Layout showNav={false}>
      <div className="flex flex-col h-full">
        <header className="p-4 border-b bg-background flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/home")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Share Your Session</h1>
          <Button 
            onClick={handleSubmit}
            disabled={!imageUrl || !locationId || createPostMutation.isPending}
            data-testid="button-post"
          >
            {createPostMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Session Photo
            </label>
            {imageUrl ? (
              <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                <img src={imageUrl} alt="Session" className="w-full h-full object-cover" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 right-3"
                  onClick={() => setImageUrl(null)}
                  data-testid="button-change-photo"
                >
                  Change
                </Button>
              </div>
            ) : (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={getUploadParams}
                onComplete={handleUploadComplete}
                buttonClassName="w-full aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-secondary/50 transition-colors p-0"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Upload your best wave</p>
                  <p className="text-xs text-muted-foreground">Tap to select a photo</p>
                </div>
              </ObjectUploader>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              <MapPin className="h-4 w-4 inline mr-1" />
              Surf Spot
            </label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger data-testid="select-location">
                <SelectValue placeholder="Where did you surf?" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Caption (optional)
            </label>
            <Textarea
              placeholder="How was the session? Share the stoke..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px] resize-none"
              data-testid="input-caption"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
