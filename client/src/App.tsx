import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useMyProfile } from "@/hooks/use-profiles";
import { Loader2 } from "lucide-react";
import BottomNav from "@/components/ui/bottom-nav";
import { lazy, Suspense } from "react";

import Landing from "@/pages/Landing";
import Profile from "@/pages/Profile";

const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Buddies = lazy(() => import("@/pages/Buddies"));
const SurfReports = lazy(() => import("@/pages/SurfReports"));
const Trips = lazy(() => import("@/pages/Trips"));
const ViewProfile = lazy(() => import("@/pages/ViewProfile"));
const Stats = lazy(() => import("@/pages/Stats"));
const Home = lazy(() => import("@/pages/Home"));
const NewPost = lazy(() => import("@/pages/NewPost"));
const Messages = lazy(() => import("@/pages/Messages"));
const TripItinerary = lazy(() => import("@/pages/TripItinerary"));
const NotFound = lazy(() => import("@/pages/not-found"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Protected Route Wrapper
function ProtectedRoute({ component: Component, requiresProfile = true }: { component: React.ComponentType; requiresProfile?: boolean }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile();

  if (authLoading || (user && profileLoading)) {
    return <PageLoader />;
  }

  if (!user) return <Redirect to="/" />;
  
  if (!profile && requiresProfile) {
    return <Redirect to="/onboarding" />;
  }

  return (
    <div className="pb-16 min-h-screen bg-background">
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
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
        if (user) return <Redirect to="/profile" />;
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
        <ProtectedRoute component={Onboarding} requiresProfile={false} />
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
      <Route path="/trips/:id">
        {(params) => <ProtectedRoute component={() => <TripItinerary params={params} />} />}
      </Route>
      <Route path="/messages">
        <ProtectedRoute component={Messages} />
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
