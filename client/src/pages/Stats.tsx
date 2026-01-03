import { useMyProfile } from "@/hooks/use-profiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Waves, Gauge, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Stats() {
  const { data: profile, isLoading } = useMyProfile();

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
    <div className="p-4 max-w-md mx-auto space-y-6 pt-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">Your Stats</h1>
        <p className="text-muted-foreground">Track your progression</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Fastest Speed */}
        <Card className="hover-elevate bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-500" />
              Top Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{profile?.fastestSpeed || 0} <span className="text-sm font-normal text-muted-foreground">mph</span></div>
          </CardContent>
        </Card>

        {/* Biggest Wave */}
        <Card className="hover-elevate bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Waves className="h-4 w-4 text-indigo-500" />
              Biggest Wave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{profile?.biggestWave || 0} <span className="text-sm font-normal text-muted-foreground">ft</span></div>
          </CardContent>
        </Card>

        {/* Longest Wave */}
        <Card className="col-span-2 hover-elevate bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Longest Ride
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{profile?.longestWave || 0} <span className="text-sm font-normal text-muted-foreground">yards</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Progression / Skill Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Skill Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Current Level</span>
                <span className="font-medium capitalize">{profile?.skillLevel}</span>
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
              <h4 className="text-sm font-medium mb-2">Tricks Mastered</h4>
              <div className="flex flex-wrap gap-2">
                {profile?.tricks?.length ? (
                  profile.tricks.map((trick: string) => (
                    <span key={trick} className="text-xs bg-secondary px-2 py-1 rounded-full">
                      {trick}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">No tricks logged yet</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
