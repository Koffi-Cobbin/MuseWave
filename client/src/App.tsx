import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/contexts/auth-context";
import { PlayerProvider } from "@/contexts/player-context";
import PlayerBar from "@/components/PlayerBar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Upload from "./pages/upload";
import Artist from "./pages/artist";
import Discover from "./pages/discover";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/discover" component={Discover} />
      <Route path="/upload" component={Upload} />
      <Route path="/artist/:slug" component={Artist} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <PlayerBar />
          </TooltipProvider>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;