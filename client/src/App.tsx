import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useMyProfile } from "@/hooks/use-profiles";
import { Loader2 } from "lucide-react";

import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Buddies from "@/pages/Buddies";
import SurfReports from "@/pages/SurfReports";
import Trips from "@/pages/Trips";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Redirect to="/" />;
  
  // If user has no profile, redirect to onboarding (unless they are already there)
  // We handle this check inside specific routes or just rely on Onboarding being accessible
  if (!profile && Component !== Onboarding) return <Redirect to="/onboarding" />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      
      {/* Protected Routes */}
      <Route path="/onboarding">
        <ProtectedRoute component={Onboarding} />
      </Route>
      <Route path="/buddies">
        <ProtectedRoute component={Buddies} />
      </Route>
      <Route path="/surf">
        <ProtectedRoute component={SurfReports} />
      </Route>
      <Route path="/trips">
        <ProtectedRoute component={Trips} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
