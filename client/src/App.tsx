import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/contexts/auth-context";
import { PlayerProvider } from "@/contexts/player-context";
import { PlaylistProvider } from "@/contexts/playlist-context";
import { SidebarNav } from "@/components/SidebarNav";
import PlayerBar from "@/components/PlayerBar";
import BottomNav from "@/components/BottomNav";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Upload from "./pages/upload";
import Artist from "./pages/artist";
import Discover from "./pages/discover";
import ResetPassword from "./pages/reset-password";
import VerifyEmail from "./pages/verify-email";
import Playlists from "./pages/playlists";
import PlaylistDetail from "./pages/playlist-detail";
import SharedPlaylist from "./pages/shared-playlist";

// Scrolls to top on every route change
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/discover" component={Discover} />
        <Route path="/upload" component={Upload} />
        <Route path="/artist/:slug" component={Artist} />
        <Route path="/playlists" component={Playlists} />
        <Route path="/playlists/link/:token" component={SharedPlaylist} />
        <Route path="/playlists/:id" component={PlaylistDetail} />
        <Route path="/reset-password/:uid/:token" component={ResetPassword} />
        <Route path="/verify-email/:uidb64/:token" component={VerifyEmail} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProvider>
          <PlaylistProvider>
            <TooltipProvider>
              {/* Persistent sidebar on desktop */}
              <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-white/10 bg-background p-4 lg:flex lg:flex-col">
                <SidebarNav />
              </aside>

              {/* Page content — offset for sidebar on desktop */}
              <div className="min-h-screen lg:pl-64">
                <Toaster />
                <Router />
              </div>

              {/* Global overlays — rendered above all pages */}
              <BottomNav />
              <PlayerBar />
            </TooltipProvider>
          </PlaylistProvider>
        </PlayerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
