import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useUpdateProfile } from "@/hooks/use-profiles";
import { insertProfileSchema, type InsertProfile } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Loader2, Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
  
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.firstName || "",
      bio: "",
      location: "",
      skillLevel: "intermediate",
    }
  });

  const onSubmit = (data: FormData) => {
    // Coerce age to number
    const payload = {
      ...data,
      userId: user?.id,
      age: Number(data.age),
      imageUrls: [
        // Random surf portraits for demo
        "https://images.unsplash.com/photo-1531123414780-f74242c2b052?w=800&q=80",
        "https://images.unsplash.com/photo-1588775225218-c5299496732d?w=800&q=80"
      ]
    };

    updateProfile(payload, {
      onSuccess: () => {
        setLocation("/buddies");
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
          <div className="flex justify-center mb-6">
             <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center border-4 border-background shadow-lg relative cursor-pointer hover:bg-secondary/80 transition-colors">
               <Camera className="w-10 h-10 text-primary/50" />
               <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                 <span className="text-white text-lg font-bold">+</span>
               </div>
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" {...form.register("displayName")} className="bg-secondary/50 border-0 h-12 rounded-xl" placeholder="Nickname" />
            {form.formState.errors.displayName && <p className="text-red-500 text-sm">{form.formState.errors.displayName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="age">Age</Label>
               <Input id="age" type="number" {...form.register("age", { valueAsNumber: true })} className="bg-secondary/50 border-0 h-12 rounded-xl" />
             </div>
             <div className="space-y-2">
               <Label htmlFor="gender">Gender</Label>
               <Select onValueChange={(val) => form.setValue("gender", val)}>
                 <SelectTrigger className="bg-secondary/50 border-0 h-12 rounded-xl">
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
            <Input id="location" {...form.register("location")} className="bg-secondary/50 border-0 h-12 rounded-xl" placeholder="San Diego, CA" />
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
            disabled={isPending}
            className="w-full h-14 rounded-2xl text-lg font-semibold shadow-lg shadow-primary/25"
          >
            {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Start Surfing
          </Button>
        </form>
      </div>
    </div>
  );
}
