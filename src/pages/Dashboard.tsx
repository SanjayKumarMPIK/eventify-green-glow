
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentDashboard } from "@/components/StudentDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { UserRole } from "@/types";

const Dashboard = () => {
  // In a real app, this would come from authentication context/state
  const [userRole, setUserRole] = useState<UserRole>("student");
  
  const handleLogout = () => {
    // In a real app, this would clear auth state
    window.location.href = "/";
  };

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
              {/* For demo purposes - in a real app this would be handled properly */}
              <Tabs defaultValue={userRole} className="mr-4">
                <TabsList>
                  <TabsTrigger 
                    value="student" 
                    onClick={() => setUserRole("student")}
                  >
                    Student View
                  </TabsTrigger>
                  <TabsTrigger 
                    value="admin" 
                    onClick={() => setUserRole("admin")}
                  >
                    Admin View
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
              : "Register for events and view your registrations"}
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
