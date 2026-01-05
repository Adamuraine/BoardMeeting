import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useMyProfile } from "@/hooks/use-profiles";
import { Loader2 } from "lucide-react";
import BottomNav from "@/components/ui/bottom-nav";

import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Buddies from "@/pages/Buddies";
import SurfReports from "@/pages/SurfReports";
import Trips from "@/pages/Trips";
import Profile from "@/pages/Profile";
import ViewProfile from "@/pages/ViewProfile";
import Stats from "@/pages/Stats";
import Home from "@/pages/Home";
import NewPost from "@/pages/NewPost";
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
  
  if (!profile && Component !== Onboarding) return <Redirect to="/onboarding" />;

  return (
    <div className="pb-16 min-h-screen bg-background">
      <Component />
      <BottomNav />
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  return (
    <Switch>
      <Route path="/" component={() => {
        const { user } = useAuth();
        if (user) return <Redirect to="/home" />;
        return <Landing />;
      }} />
      
      {/* Protected Routes */}
      <Route path="/home">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/stats">
        <ProtectedRoute component={Stats} />
      </Route>
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
      <Route path="/profile/:id">
        {(params) => <ProtectedRoute component={() => <ViewProfile params={params} />} />}
      </Route>
      <Route path="/post/new">
        <ProtectedRoute component={NewPost} />
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
