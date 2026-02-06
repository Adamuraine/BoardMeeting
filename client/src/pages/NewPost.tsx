import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, Loader2, MapPin, ImagePlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NewPost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [locationText, setLocationText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);

      const res = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const { uploadURL, objectPath } = await res.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setImageUrl(objectPath);
    } catch {
      toast({
        title: "Upload failed",
        description: "Something went wrong uploading your photo. Please try again.",
        variant: "destructive",
      });
      setLocalPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleChangePhoto = () => {
    setImageUrl(null);
    setLocalPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const createPostMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; caption: string; location?: string }) => {
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
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!imageUrl) {
      toast({
        title: "Missing photo",
        description: "Please add a photo to share",
        variant: "destructive",
      });
      return;
    }
    createPostMutation.mutate({
      imageUrl,
      caption,
      location: locationText.trim() || undefined,
    });
  };

  const displayImage = imageUrl || localPreview;

  return (
    <Layout showNav={false}>
      <div className="flex flex-col h-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-file"
        />

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
            disabled={!imageUrl || uploading || createPostMutation.isPending}
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
            {displayImage ? (
              <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                <img src={displayImage} alt="Session" className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-3 right-3"
                  onClick={handleChangePhoto}
                  data-testid="button-change-photo"
                >
                  Change
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-secondary/50 transition-colors"
                data-testid="button-pick-photo"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Tap to select a photo</p>
                  <p className="text-xs text-muted-foreground">From your camera roll</p>
                </div>
              </button>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              <MapPin className="h-4 w-4 inline mr-1" />
              Location (optional)
            </label>
            <Input
              placeholder="e.g. Huntington Beach, Pipeline, Trestles..."
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              data-testid="input-location"
            />
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
