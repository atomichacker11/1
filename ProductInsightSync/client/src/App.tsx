import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminDashboard from "@/pages/admin-dashboard";
import MainLayout from "@/layouts/main-layout";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

// Import our new pages
import DashboardPage from "./pages/dashboard-page";
import GamePage from "./pages/game-page";
import WalletPage from "./pages/wallet-page";
import SidebarLayout from "./layouts/sidebar-layout";

// Placeholder component for history page
const HistoryPage = () => (
  <SidebarLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Betting History</h1>
      <p className="text-gray-400">View your previous bets and results</p>
      
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="space-y-6">
          {/* We'll implement this page later */}
          <p className="text-white">Your betting history will be displayed here.</p>
        </div>
      </div>
    </div>
  </SidebarLayout>
);

function Router() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/user'],
    retry: false,
    throwOnError: false
  });
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  useEffect(() => {
    if (!isLoading) {
      setIsInitialLoading(false);
    }
  }, [isLoading]);
  
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // If user is not authenticated, only show auth routes
  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/">
          <Login />
        </Route>
        <Route component={Login} />
      </Switch>
    );
  }
  
  // User is authenticated, show main app with sidebar layout for each page
  return (
    <Switch>
      <Route path="/" component={GamePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/game" component={GamePage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/wallet" component={WalletPage} />
      
      {/* Admin routes - only visible to users with admin role */}
      {user.role === "admin" && (
        <Route path="/admin">
          <SidebarLayout>
            <AdminDashboard />
          </SidebarLayout>
        </Route>
      )}
      
      <Route>
        <SidebarLayout>
          <NotFound />
        </SidebarLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
