import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import SidebarNav from "@/components/sidebar-nav";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, BellIcon, LineChart, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto border-r">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <LineChart className="h-6 w-6 text-primary mr-2" />
            <span className="text-xl font-bold">DataInsight Pro</span>
          </div>
          <SidebarNav />
        </div>
      </div>
      
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} 
          />
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-background border-r">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white" 
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="flex items-center flex-shrink-0 px-4 h-16">
              <LineChart className="h-6 w-6 text-primary mr-2" />
              <span className="text-xl font-bold">DataInsight Pro</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pt-5 pb-4">
              <SidebarNav onNavClick={() => setSidebarOpen(false)} />
            </div>
          </div>
          
          <div className="flex-shrink-0 w-14"></div>
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b sm:px-6 md:px-8">
          <div className="flex items-center md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <Button variant="ghost" size="icon">
              <BellIcon className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user?.name ? user.name.charAt(0).toUpperCase() : user?.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
