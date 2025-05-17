import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, FileUp, Home, Settings, AreaChart, User } from "lucide-react";

interface SidebarNavProps {
  onNavClick?: () => void;
}

export default function SidebarNav({ onNavClick }: SidebarNavProps) {
  const [location] = useLocation();
  
  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });
  
  // Fetch datasets
  const { data: datasets } = useQuery({
    queryKey: ['/api/datasets'],
  });
  
  // Navigation items
  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      active: location === "/"
    },
    {
      href: "/upload",
      label: "Upload Data",
      icon: <FileUp className="h-5 w-5" />,
      active: location === "/upload"
    }
  ];
  
  // Add dataset-specific nav items if datasets exist
  const datasetNavItems = datasets && datasets.length > 0
    ? datasets.slice(0, 3).map(dataset => ({
        href: `/analyze/${dataset.id}`,
        label: dataset.name,
        icon: <AreaChart className="h-5 w-5" />,
        active: location === `/analyze/${dataset.id}`
      }))
    : [];
  
  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onNavClick) {
      onNavClick();
    }
  };
  
  return (
    <div className="px-3 py-2">
      <div className="space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant={item.active ? "secondary" : "ghost"}
            className="w-full justify-start"
            asChild
          >
            <Link href={item.href} onClick={handleNavClick}>
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          </Button>
        ))}
      </div>
      
      {datasetNavItems.length > 0 && (
        <>
          <div className="py-2">
            <div className="px-3 py-1.5">
              <p className="text-sm font-medium text-muted-foreground">Your Datasets</p>
            </div>
            <div className="space-y-1">
              {datasetNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant={item.active ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href} onClick={handleNavClick}>
                    {item.icon}
                    <span className="ml-3 truncate">{item.label}</span>
                  </Link>
                </Button>
              ))}
              
              {datasets && datasets.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                  asChild
                >
                  <Link href="/" onClick={handleNavClick}>
                    <span className="ml-9">+ {datasets.length - 3} more</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
      
      <div className="py-2">
        <div className="px-3 py-1.5">
          <p className="text-sm font-medium text-muted-foreground">Account</p>
        </div>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start"
            asChild
          >
            <Link href="#" onClick={handleNavClick}>
              <User className="h-5 w-5" />
              <span className="ml-3">Profile</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            asChild
          >
            <Link href="#" onClick={handleNavClick}>
              <Settings className="h-5 w-5" />
              <span className="ml-3">Settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
