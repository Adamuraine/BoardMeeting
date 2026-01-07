import { useState } from "react";
import { useMyProfile } from "@/hooks/use-profiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Waves, Gauge, TrendingUp, Plus, Check, Watch, Pencil, Save, X, ChevronDown, Trophy, MapPin, Timer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const;

type TrophyData = {
  place: number;
  contestName: string;
  location: string;
  category: "amateur" | "pro";
};

type EnduranceData = {
  condition: string;
  hours: number;
};

const SURF_CONDITIONS = [
  { id: "epic-overhead", label: "Epic 4-6ft+", description: "Overhead barrels", color: "from-emerald-500 to-teal-500" },
  { id: "fun-medium", label: "Fun 3-4ft", description: "Solid waves", color: "from-blue-500 to-cyan-500" },
  { id: "small-mellow", label: "Small 2-3ft", description: "Mellow sessions", color: "from-amber-500 to-orange-500" },
  { id: "tiny-mushy", label: "Tiny 1-2ft", description: "Knee-high slop", color: "from-slate-400 to-slate-500" },
];

const TROPHY_COLORS: Record<number, string> = {
  1: "text-yellow-500",
  2: "text-slate-400",
  3: "text-amber-600",
  4: "text-blue-500",
  5: "text-emerald-500",
  6: "text-purple-500",
};

export default function Stats() {
  const { data: profile, isLoading } = useMyProfile();
  const { toast } = useToast();
  
  const [editingSpeed, setEditingSpeed] = useState(false);
  const [editingLongestWave, setEditingLongestWave] = useState(false);
  const [tempSpeed, setTempSpeed] = useState("");
  const [tempLongestWave, setTempLongestWave] = useState("");
  
  const [trophyDialogOpen, setTrophyDialogOpen] = useState(false);
  const [newTrophy, setNewTrophy] = useState<TrophyData>({
    place: 1,
    contestName: "",
    location: "",
    category: "amateur",
  });

  const skillLevelMutation = useMutation({
    mutationFn: async (skillLevel: string) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", { skillLevel });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "Skill Level Updated",
        description: "Your skill level has been saved!",
      });
    },
  });

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
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save stats");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "Stats Updated",
        description: "Your stats have been saved!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save",
        description: error.message,
        variant: "destructive",
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

  const trophiesMutation = useMutation({
    mutationFn: async (trophies: string[]) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", { trophies });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "Trophy Added",
        description: "Your trophy has been saved to your profile!",
      });
    },
  });

  const parseTrophies = (): TrophyData[] => {
    if (!profile?.trophies) return [];
    return profile.trophies.map((t: string) => {
      try {
        return JSON.parse(t);
      } catch {
        return null;
      }
    }).filter(Boolean);
  };

  const addTrophy = () => {
    if (!newTrophy.contestName || !newTrophy.location) {
      toast({ title: "Missing info", description: "Please fill in contest name and location", variant: "destructive" });
      return;
    }
    const currentTrophies = profile?.trophies || [];
    const newTrophyStr = JSON.stringify(newTrophy);
    trophiesMutation.mutate([...currentTrophies, newTrophyStr]);
    setNewTrophy({ place: 1, contestName: "", location: "", category: "amateur" });
    setTrophyDialogOpen(false);
  };

  const removeTrophy = (index: number) => {
    const currentTrophies = profile?.trophies || [];
    const newTrophies = currentTrophies.filter((_: string, i: number) => i !== index);
    trophiesMutation.mutate(newTrophies);
  };

  const enduranceMutation = useMutation({
    mutationFn: async (endurance: string[]) => {
      const res = await apiRequest("PATCH", "/api/profiles/me", { endurance });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      toast({
        title: "Endurance Updated",
        description: "Your session endurance has been saved!",
      });
    },
  });

  const parseEndurance = (): EnduranceData[] => {
    if (!profile?.endurance) return [];
    return profile.endurance.map((e: string) => {
      try {
        return JSON.parse(e);
      } catch {
        return null;
      }
    }).filter(Boolean);
  };

  const getEnduranceHours = (conditionId: string): number => {
    const enduranceData = parseEndurance();
    const found = enduranceData.find(e => e.condition === conditionId);
    return found?.hours || 0;
  };

  const updateEndurance = (conditionId: string, hours: number) => {
    const currentEndurance = parseEndurance();
    const existing = currentEndurance.find(e => e.condition === conditionId);
    let newEndurance: EnduranceData[];
    
    if (existing) {
      newEndurance = currentEndurance.map(e => 
        e.condition === conditionId ? { ...e, hours } : e
      );
    } else {
      newEndurance = [...currentEndurance, { condition: conditionId, hours }];
    }
    
    enduranceMutation.mutate(newEndurance.map(e => JSON.stringify(e)));
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
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-muted-foreground">Current Level</span>
                <Select
                  value={profile?.skillLevel || "beginner"}
                  onValueChange={(value) => skillLevelMutation.mutate(value)}
                  disabled={skillLevelMutation.isPending}
                >
                  <SelectTrigger className="w-32 h-8" data-testid="select-skill-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map((level) => (
                      <SelectItem key={level} value={level} data-testid={`select-skill-${level}`}>
                        <span className="capitalize">{level}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Trophies ({parseTrophies().length})
                </h4>
                <Dialog open={trophyDialogOpen} onOpenChange={setTrophyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1" data-testid="button-add-trophy">
                      <Plus className="h-4 w-4" />
                      Add Trophy
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Add Competition Trophy
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label className="text-sm mb-2 block">Place Finished</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5, 6].map((place) => (
                            <Button
                              key={place}
                              size="icon"
                              variant={newTrophy.place === place ? "default" : "outline"}
                              onClick={() => setNewTrophy({ ...newTrophy, place })}
                              className="relative"
                              data-testid={`button-place-${place}`}
                            >
                              <Trophy className={`h-5 w-5 ${TROPHY_COLORS[place]}`} />
                              <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-background rounded-full w-4 h-4 flex items-center justify-center border">
                                {place}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="contestName" className="text-sm mb-2 block">Contest Name</Label>
                        <Input
                          id="contestName"
                          placeholder="e.g., US Open of Surfing"
                          value={newTrophy.contestName}
                          onChange={(e) => setNewTrophy({ ...newTrophy, contestName: e.target.value })}
                          data-testid="input-contest-name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="location" className="text-sm mb-2 block">Event Location</Label>
                        <Input
                          id="location"
                          placeholder="e.g., Huntington Beach, CA"
                          value={newTrophy.location}
                          onChange={(e) => setNewTrophy({ ...newTrophy, location: e.target.value })}
                          data-testid="input-trophy-location"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm mb-2 block">Category</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={newTrophy.category === "amateur" ? "default" : "outline"}
                            onClick={() => setNewTrophy({ ...newTrophy, category: "amateur" })}
                            className="flex-1"
                            data-testid="button-category-amateur"
                          >
                            Amateur
                          </Button>
                          <Button
                            variant={newTrophy.category === "pro" ? "default" : "outline"}
                            onClick={() => setNewTrophy({ ...newTrophy, category: "pro" })}
                            className="flex-1"
                            data-testid="button-category-pro"
                          >
                            Pro
                          </Button>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={addTrophy}
                        disabled={trophiesMutation.isPending}
                        data-testid="button-save-trophy"
                      >
                        Add Trophy
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {parseTrophies().length > 0 ? (
                <div className="space-y-2">
                  {parseTrophies().map((trophy, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                      data-testid={`trophy-item-${index}`}
                    >
                      <div className="relative">
                        <Trophy className={`h-8 w-8 ${TROPHY_COLORS[trophy.place] || "text-gray-400"}`} />
                        <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-background rounded-full w-4 h-4 flex items-center justify-center border">
                          {trophy.place}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{trophy.contestName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trophy.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {trophy.category}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeTrophy(index)}
                        data-testid={`button-remove-trophy-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">No trophies yet. Add your competition wins!</span>
              )}
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Timer className="h-4 w-4 text-cyan-500" />
                Session Endurance
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                How long do you typically stay in the water for each condition?
              </p>
              <div className="space-y-4">
                {SURF_CONDITIONS.map((condition) => {
                  const hours = getEnduranceHours(condition.id);
                  const maxHours = 10;
                  const percentage = (hours / maxHours) * 100;
                  
                  return (
                    <div key={condition.id} className="space-y-2" data-testid={`endurance-${condition.id}`}>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{condition.label}</span>
                          <span className="text-muted-foreground text-xs ml-2">{condition.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={hours > 0 ? String(hours) : undefined}
                            onValueChange={(val) => updateEndurance(condition.id, parseInt(val))}
                          >
                            <SelectTrigger className="h-7 w-20 text-sm" data-testid={`select-endurance-${condition.id}`}>
                              <SelectValue placeholder="0 hrs" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => (
                                <SelectItem key={h} value={String(h)} data-testid={`option-hours-${h}`}>
                                  {h} {h === 1 ? 'hr' : 'hrs'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${condition.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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

        <Card className="hover-elevate bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/20">
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
    </div>
  );
}
