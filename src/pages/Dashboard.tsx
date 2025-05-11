
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, UserRole } from "@/types";
import { StudentDashboard } from "@/components/StudentDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("student");
  const { signOut } = useAuth();
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: authUser } = await supabase.auth.getUser();
      
      if (!authUser.user) {
        navigate("/login");
        return;
      }
      
      // Try to fetch user profile from users table
      try {
        const { data: userRecord, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.user.id)
          .single();
        
        if (error) {
          console.error("Error fetching user:", error);
          
          // If no user record found, use the auth user metadata directly
          if (error.code === "PGRST116") {
            const { email, user_metadata } = authUser.user;
            
            // Create a user object from auth data without trying to insert into database
            const newUser: User = {
              id: authUser.user.id,
              email: email || '',
              name: user_metadata?.name || 'New User',
              role: (user_metadata?.role as UserRole) || 'student',
              department: user_metadata?.department || ''
            };
            
            // Set user state with data from auth
            setUser(newUser);
            setUserRole(newUser.role);
            
            // Show a warning but allow the user to proceed
            toast.warning("Using temporary profile. Some features may be limited.");
            return;
          }
          
          // For other errors, show error but continue with default values
          toast.error("Failed to load profile. Using default settings.");
          
          // Create a minimal user object with default values
          const defaultUser: User = {
            id: authUser.user.id,
            email: authUser.user.email || '',
            name: 'User',
            role: 'student',
            department: ''
          };
          
          setUser(defaultUser);
          setUserRole('student');
          return;
        }
        
        // Create a user object compatible with our app
        const appUser: User = {
          id: authUser.user.id,
          email: authUser.user.email || '',
          name: userRecord.name,
          role: userRecord.role as UserRole,
          department: userRecord.department
        };
        
        setUser(appUser);
        setUserRole(userRecord.role as UserRole);
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Something went wrong. Please try again later.");
        
        // Create a minimal user object with default values
        const defaultUser: User = {
          id: authUser.user.id,
          email: authUser.user.email || '',
          name: 'User',
          role: 'student',
          department: ''
        };
        
        setUser(defaultUser);
        setUserRole('student');
      }
    };
    
    fetchUserProfile();
  }, [navigate]);
  
  const handleLogout = async () => {
    await signOut();
  };

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl text-primary">Eventify</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/explore" className="text-sm font-medium">
                Explore Events
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {userRole === "admin" ? "Admin Dashboard" : "Student Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole === "admin" 
              ? "Manage events and view registrations" 
              : "View your registered events and certificates"}
          </p>
        </div>

        {userRole === "admin" ? (
          <AdminDashboard />
        ) : (
          <StudentDashboard />
        )}
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
};

export default Dashboard;
