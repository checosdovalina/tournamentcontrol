import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Display from "@/pages/display";
import DisplayRotative from "@/pages/display-rotative";
import Login from "@/pages/login";
import Setup from "@/pages/setup";
import GuestScore from "@/pages/guest-score";
import { useWebSocket } from "@/hooks/use-websocket";

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<{ user: { id: string; username: string; name: string; role: string } }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useWebSocket(user?.user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user?.user) {
    return <Login />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <AuthWrapper>
          <Dashboard />
        </AuthWrapper>
      )} />
      <Route path="/dashboard" component={() => (
        <AuthWrapper>
          <Dashboard />
        </AuthWrapper>
      )} />
      <Route path="/display" component={Display} />
      <Route path="/display-rotative" component={DisplayRotative} />
      <Route path="/score/:token" component={GuestScore} />
      <Route path="/login" component={Login} />
      <Route path="/setup" component={Setup} />
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
