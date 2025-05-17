import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, History, Home, LogOut, Menu, Wallet, Gamepad2 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  
  // Get user data
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user');
        return await response.json();
      } catch (error) {
        return null;
      }
    },
  });
  
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5 mr-2" /> },
    { href: "/game", label: "Game", icon: <Gamepad2 className="h-5 w-5 mr-2" /> },
    { href: "/history", label: "History", icon: <History className="h-5 w-5 mr-2" /> },
    { href: "/wallet", label: "Wallet", icon: <Wallet className="h-5 w-5 mr-2" /> },
    ...(isAdmin ? [{ href: "/admin", label: "Admin Panel", icon: <BarChart3 className="h-5 w-5 mr-2" /> }] : []),
  ];

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar (desktop) */}
      {!isMobile && (
        <div className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800">
          <div className="flex items-center justify-center h-14 border-b border-gray-800">
            <span className="text-xl font-bold text-white">Color Trading</span>
          </div>
          
          {/* User info */}
          <div className="flex flex-col items-center p-4 border-b border-gray-800">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarImage src={user?.profileImageUrl} />
              <AvatarFallback className="bg-blue-600">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-white font-medium">{user?.name || user?.username}</div>
            <div className="text-sm text-gray-400 mt-1">₹ {user?.balance?.toLocaleString('en-IN') || 0}</div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <Button 
                      variant={location === item.href ? "default" : "ghost"}
                      className={`w-full justify-start ${
                        location === item.href 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Logout button */}
          <div className="p-4 border-t border-gray-800">
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700"
            >
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        {isMobile && (
          <header className="bg-gray-900 text-white h-14 flex items-center px-4 border-b border-gray-800">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-gray-900 border-r border-gray-800 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center h-14 border-b border-gray-800 px-4">
                    <span className="text-lg font-bold text-white">Color Trading</span>
                  </div>
                  
                  {/* User info (mobile) */}
                  <div className="flex items-center p-4 border-b border-gray-800">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={user?.profileImageUrl} />
                      <AvatarFallback className="bg-blue-600">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-white font-medium">{user?.name || user?.username}</div>
                      <div className="text-sm text-gray-400">₹ {user?.balance?.toLocaleString('en-IN') || 0}</div>
                    </div>
                  </div>
                  
                  {/* Navigation (mobile) */}
                  <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-2">
                      {menuItems.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href}>
                            <Button 
                              variant={location === item.href ? "default" : "ghost"}
                              className={`w-full justify-start ${
                                location === item.href 
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                              }`}
                            >
                              {item.icon}
                              {item.label}
                            </Button>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  
                  {/* Logout button (mobile) */}
                  <div className="p-4 border-t border-gray-800">
                    <Button 
                      variant="outline" 
                      onClick={handleLogout} 
                      className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700"
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="flex-1 text-center font-bold">Color Trading</div>
            
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </header>
        )}
        
        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-950 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}