import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useUpdateProfile } from "@/hooks/use-profiles";
import { insertProfileSchema } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Loader2, Camera, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { SafeImage } from "@/components/SafeImage";

const schema = insertProfileSchema.pick({
  displayName: true,
  bio: true,
  gender: true,
  age: true,
  skillLevel: true,
  location: true,
});

type FormData = z.infer<typeof schema>;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { user } = useAuth();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSkipping, setIsSkipping] = useState(false);
  
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setUploadedPhotos(prev => [...prev, response.objectPath]);
    },
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.firstName || "",
      bio: "",
      location: "",
      skillLevel: "intermediate",
    }
  });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      userId: user?.id,
      age: Number(data.age),
      imageUrls: uploadedPhotos.length > 0 ? uploadedPhotos : [],
      isIncompleteProfile: false,
      trialStartedAt: null,
    };

    updateProfile(payload, {
      onSuccess: () => {
        setLocation("/buddies");
      }
    });
  };

  const handleSkip = () => {
    setIsSkipping(true);
    const minimalProfile = {
      userId: user?.id,
      displayName: user?.firstName || "Surfer",
      bio: "",
      location: "",
      skillLevel: "intermediate",
      age: 25,
      gender: "other",
      imageUrls: [],
      isIncompleteProfile: true,
      trialStartedAt: new Date().toISOString(),
    };

    updateProfile(minimalProfile, {
      onSuccess: () => {
        setLocation("/home");
      },
      onSettled: () => {
        setIsSkipping(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full space-y-8 py-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Create Profile</h1>
          <p className="text-muted-foreground mt-2">Tell us about your surf style.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label>Profile Photos</Label>
            <div className="flex gap-3 flex-wrap">
              {uploadedPhotos.map((photo, index) => (
                <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/30 bg-muted">
                  <SafeImage src={photo} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              
              <label className="w-20 h-20 rounded-xl bg-secondary border-2 border-dashed border-primary/50 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  disabled={isUploading}
                  data-testid="input-photo"
                />
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-primary/50" />
                    <span className="text-[10px] text-primary/50 mt-1">Add</span>
                  </>
                )}
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Add photos to show off your surf skills</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" {...form.register("displayName")} className="bg-secondary/50 border-2 border-primary/50 focus:border-primary h-12 rounded-xl" placeholder="Nickname" data-testid="input-displayName" />
            {form.formState.errors.displayName && <p className="text-red-500 text-sm">{form.formState.errors.displayName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="age">Age</Label>
               <Input id="age" type="number" {...form.register("age", { valueAsNumber: true })} className="bg-secondary/50 border-2 border-primary/50 focus:border-primary h-12 rounded-xl" data-testid="input-age" />
             </div>
             <div className="space-y-2">
               <Label htmlFor="gender">Gender</Label>
               <Select onValueChange={(val) => form.setValue("gender", val)}>
                 <SelectTrigger className="bg-secondary/50 border-2 border-primary/50 focus:border-primary h-12 rounded-xl" data-testid="select-gender">
                   <SelectValue placeholder="Select" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="male">Male</SelectItem>
                   <SelectItem value="female">Female</SelectItem>
                   <SelectItem value="other">Other</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Home Break / Location</Label>
            <Input id="location" {...form.register("location")} className="bg-secondary/50 border-2 border-primary/50 focus:border-primary h-12 rounded-xl" placeholder="San Diego, CA" data-testid="input-location" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skillLevel">Skill Level</Label>
            <Select onValueChange={(val) => form.setValue("skillLevel", val)} defaultValue="intermediate">
              <SelectTrigger className="bg-secondary/50 border-0 h-12 rounded-xl">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (Foamie)</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              {...form.register("bio")} 
              className="bg-secondary/50 border-0 min-h-[100px] rounded-xl resize-none" 
              placeholder="What's your favorite break? Goofy or Regular?" 
            />
          </div>

          <Button 
            type="submit" 
            disabled={isPending || isSkipping}
            className="w-full h-14 rounded-2xl text-lg font-semibold shadow-lg shadow-primary/25"
            data-testid="button-submit-profile"
          >
            {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Start Surfing
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button 
            type="button"
            variant="ghost"
            disabled={isPending || isSkipping}
            onClick={handleSkip}
            className="w-full h-12 rounded-2xl text-muted-foreground"
            data-testid="button-skip-onboarding"
          >
            {isSkipping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Skip for now, I'll set this up later
          </Button>
        </form>
      </div>
    </div>
  );
}
