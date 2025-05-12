
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { User, UserRole } from "@/types";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user: authUser, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (error) {
          console.error("Error fetching user profile:", error);
          // Use auth user data if profile fetch fails
          setUserProfile({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || 'User',
            role: (authUser.user_metadata?.role as UserRole) || 'student',
            department: authUser.user_metadata?.department || ''
          });
          return;
        }
        
        setUserProfile({
          id: data.id,
          email: authUser.email || '',
          name: data.name,
          role: data.role as UserRole,
          department: data.department || ''
        });
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    };
    
    fetchUserProfile();
  }, [authUser]);
  
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl text-primary">Eventify</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-4">
              {authUser ? (
                <>
                  <Link to="/dashboard" className="text-sm font-medium">
                    Dashboard
                  </Link>
                  <Link to="/explore" className="text-sm font-medium">
                    Explore Events
                  </Link>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium hidden sm:inline">
                      {userProfile?.name || 'User'}
                    </span>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userProfile ? getInitials(userProfile.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium">
                    <Button variant="outline" size="sm">Login</Button>
                  </Link>
                  <Link to="/register" className="text-sm font-medium">
                    <Button size="sm">Register</Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-background border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Eventify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
