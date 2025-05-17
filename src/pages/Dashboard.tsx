
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, UserRole } from "@/types";
import { StudentDashboard } from "@/components/StudentDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { UserAchievements } from "@/components/UserAchievements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("student");
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
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
  }, [navigate, authUser]);

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <Layout>
      <div className="container py-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            {userRole === "admin" ? "Admin Dashboard" : "Student Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole === "admin" 
              ? "Manage events and view registrations" 
              : "View your registered events and certificates"}
          </p>
        </motion.div>

        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            {userRole === "admin" ? (
              <AdminDashboard />
            ) : (
              <StudentDashboard />
            )}
          </TabsContent>
          
          <TabsContent value="achievements">
            <UserAchievements />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
