import { useState } from "react";
import { useMyProfile } from "@/hooks/use-profiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Waves, Gauge, TrendingUp, Plus, Check, Watch, Pencil, Save, X, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TRICK_CATEGORIES = {
  "Basic Maneuvers": [
    "Bottom Turn",
    "Top Turn",
    "Frontside Top Turn",
    "Cutback",
    "Snap",
    "Layback Snap",
    "Floater",
    "Re-entry",
    "Roundhouse Cutback",
    "Carving 360",
    "Lip",
    "Duck Dive",
  ],
  "Airs & Aerials": [
    "Air",
    "Alley Oop Air",
    "Chop Hop",
    "360 Air",
    "Floater 360",
    "Superman",
    "Kerrupt Flip",
    "Blow Tail",
  ],
  "Grabs": [
    "Indy Grab",
    "Mute Grab",
    "Stalefish",
    "Melon Grab",
  ],
  "Tube Riding": [
    "Tube Ride",
    "2 Second Tube Ride",
    "5 Second Tube Ride",
    "10 Second Tube Ride",
  ],
  "Longboard": [
    "Hang Five",
    "Hang Ten",
    "Cross Step",
    "Nose Ride",
  ],
};

const WAVE_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50];

export default function Stats() {
  const { data: profile, isLoading } = useMyProfile();
  const { toast } = useToast();
  
  const [editingSpeed, setEditingSpeed] = useState(false);
  const [editingLongestWave, setEditingLongestWave] = useState(false);
  const [tempSpeed, setTempSpeed] = useState("");
  const [tempLongestWave, setTempLongestWave] = useState("");

  const tricksMutation = useMutation({
    mutationFn: async (tricks: string[]) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", { tricks });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "Trick Updated",
        description: "Your tricks have been saved to your profile!",
      });
    },
  });

  const statsMutation = useMutation({
    mutationFn: async (data: { fastestSpeed?: number; longestWave?: number; biggestWave?: number }) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "Stats Updated",
        description: "Your stats have been saved!",
      });
    },
  });

  const toggleTrick = (trick: string) => {
    const currentTricks = profile?.tricks || [];
    const newTricks = currentTricks.includes(trick)
      ? currentTricks.filter((t: string) => t !== trick)
      : [...currentTricks, trick];
    tricksMutation.mutate(newTricks);
  };

  const saveSpeed = () => {
    const value = parseInt(tempSpeed);
    if (!isNaN(value) && value >= 0) {
      statsMutation.mutate({ fastestSpeed: value });
      setEditingSpeed(false);
    } else {
      toast({ title: "Invalid value", description: "Please enter a valid number", variant: "destructive" });
    }
  };

  const saveLongestWave = () => {
    const value = parseInt(tempLongestWave);
    if (!isNaN(value) && value >= 0) {
      statsMutation.mutate({ longestWave: value });
      setEditingLongestWave(false);
    } else {
      toast({ title: "Invalid value", description: "Please enter a valid number", variant: "destructive" });
    }
  };

  const handleBiggestWaveChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      statsMutation.mutate({ biggestWave: numValue });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32 col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6 pt-8 pb-24">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-stats-title">Your Stats</h1>
        <p className="text-muted-foreground">Track your progression</p>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Watch className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Apple Watch Sync</p>
              <p className="text-xs text-muted-foreground">Connect your watch to auto-track speed and rides</p>
            </div>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="hover-elevate bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                Top Speed
              </span>
              {!editingSpeed && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => {
                    setTempSpeed(String(profile?.fastestSpeed || 0));
                    setEditingSpeed(true);
                  }}
                  data-testid="button-edit-speed"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingSpeed ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={tempSpeed}
                  onChange={(e) => setTempSpeed(e.target.value)}
                  className="h-8 w-16 text-lg font-bold"
                  autoFocus
                  data-testid="input-speed"
                />
                <span className="text-sm text-muted-foreground">mph</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveSpeed} data-testid="button-save-speed">
                  <Save className="h-3 w-3 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingSpeed(false)} data-testid="button-cancel-speed">
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="text-2xl font-bold font-display" data-testid="text-speed-value">
                {profile?.fastestSpeed || 0} <span className="text-sm font-normal text-muted-foreground">mph</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Waves className="h-4 w-4 text-indigo-500" />
              Biggest Wave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={profile?.biggestWave ? String(profile.biggestWave) : undefined} 
              onValueChange={handleBiggestWaveChange}
            >
              <SelectTrigger className="w-full h-10 text-xl font-bold font-display" data-testid="select-biggest-wave">
                <SelectValue placeholder="Select size" />
                <span className="text-sm font-normal text-muted-foreground ml-1">ft</span>
              </SelectTrigger>
              <SelectContent className="bg-background border">
                {WAVE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)} data-testid={`option-wave-${size}`}>
                    {size} ft
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="col-span-2 hover-elevate bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Longest Ride
              </span>
              {!editingLongestWave && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => {
                    setTempLongestWave(String(profile?.longestWave || 0));
                    setEditingLongestWave(true);
                  }}
                  data-testid="button-edit-longest-wave"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingLongestWave ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={tempLongestWave}
                  onChange={(e) => setTempLongestWave(e.target.value)}
                  className="h-8 w-20 text-lg font-bold"
                  autoFocus
                  data-testid="input-longest-wave"
                />
                <span className="text-sm text-muted-foreground">yards</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveLongestWave} data-testid="button-save-longest-wave">
                  <Save className="h-3 w-3 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingLongestWave(false)} data-testid="button-cancel-longest-wave">
                  <X className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="text-2xl font-bold font-display" data-testid="text-longest-wave-value">
                {profile?.longestWave || 0} <span className="text-sm font-normal text-muted-foreground">yards</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Skill Progression
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1" data-testid="button-add-tricks">
                <Plus className="h-4 w-4" />
                Add Tricks
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto bg-background border shadow-lg">
              {Object.entries(TRICK_CATEGORIES).map(([category, tricks], catIndex) => (
                <div key={category}>
                  <DropdownMenuLabel className="text-xs text-muted-foreground bg-muted/50 py-2">{category}</DropdownMenuLabel>
                  {tricks.map((trick) => (
                    <DropdownMenuItem
                      key={trick}
                      onClick={() => toggleTrick(trick)}
                      className="flex items-center justify-between cursor-pointer bg-background hover:bg-accent"
                      data-testid={`menuitem-trick-${trick.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <span>{trick}</span>
                      {profile?.tricks?.includes(trick) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  {catIndex < Object.keys(TRICK_CATEGORIES).length - 1 && <DropdownMenuSeparator />}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Current Level</span>
                <span className="font-medium capitalize" data-testid="text-skill-level">{profile?.skillLevel}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ 
                    width: profile?.skillLevel === 'pro' ? '100%' : 
                           profile?.skillLevel === 'advanced' ? '75%' : 
                           profile?.skillLevel === 'intermediate' ? '50%' : '25%' 
                  }}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Tricks Mastered ({profile?.tricks?.length || 0})</h4>
              <div className="flex flex-wrap gap-2">
                {profile?.tricks?.length ? (
                  profile.tricks.map((trick: string) => (
                    <Badge 
                      key={trick} 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => toggleTrick(trick)}
                      data-testid={`badge-trick-${trick.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {trick}
                      <X className="h-3 w-3 ml-1 opacity-50" />
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground italic">Tap "Add Tricks" to log your first trick!</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
