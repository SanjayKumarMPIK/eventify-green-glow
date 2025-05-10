
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { EVENTS } from "@/lib/data";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, TeamMember, Event } from "@/types";
import { toast } from "sonner";

const ExploreEvents = () => {
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Get the current user from localStorage
  const getCurrentUser = (): User | null => {
    const storedUser = localStorage.getItem("currentUser");
    if (!storedUser) {
      navigate("/login");
      return null;
    }
    
    try {
      return JSON.parse(storedUser);
    } catch (e) {
      localStorage.removeItem("currentUser");
      navigate("/login");
      return null;
    }
  };
  
  const user = getCurrentUser();
  
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  const handleRegister = (eventId: string) => {
    if (!user) return;
    
    // Check if user has already registered for this event
    const registrations = JSON.parse(localStorage.getItem("userRegistrations") || "[]");
    const alreadyRegistered = registrations.some((reg: any) => reg.eventId === eventId && reg.userId === user.id);
    
    if (alreadyRegistered) {
      toast.error("You have already registered for this event");
      return;
    }
    
    setSelectedEventId(eventId);
    
    // Initialize with the current user's details
    setTeamName("");
    setTeamMembers([{
      name: user.name,
      email: user.email,
      department: user.department || ""
    }]);
  };

  const handleAddTeamMember = () => {
    setTeamMembers([...teamMembers, { name: "", email: "", department: "" }]);
  };

  const handleRemoveTeamMember = (index: number) => {
    if (index === 0) return; // Don't allow removing the first member (current user)
    const newTeamMembers = [...teamMembers];
    newTeamMembers.splice(index, 1);
    setTeamMembers(newTeamMembers);
  };

  const handleTeamMemberChange = (index: number, field: string, value: string) => {
    if (index === 0) return; // Don't allow changing the first member's details (current user)
    const newTeamMembers = [...teamMembers];
    newTeamMembers[index] = { ...newTeamMembers[index], [field]: value };
    setTeamMembers(newTeamMembers);
  };

  const handleSubmitRegistration = () => {
    if (!user || !selectedEventId) return;
    
    // Get the event to update available slots
    const allEvents = JSON.parse(localStorage.getItem("events") || JSON.stringify(EVENTS));
    const updatedEvents = allEvents.map((event: Event) => {
      if (event.id === selectedEventId) {
        return {
          ...event,
          availableSlots: Math.max(0, event.availableSlots - 1),
          registrations: [
            ...event.registrations,
            {
              id: Date.now().toString(),
              eventId: selectedEventId,
              userId: user.id,
              teamName: teamName || `${user.name}'s Team`,
              teamMembers,
              registrationDate: new Date()
            }
          ]
        };
      }
      return event;
    });
    
    // Update events in localStorage
    localStorage.setItem("events", JSON.stringify(updatedEvents));
    
    // Update user registrations
    const registrations = JSON.parse(localStorage.getItem("userRegistrations") || "[]");
    registrations.push({
      id: Date.now().toString(),
      eventId: selectedEventId,
      userId: user.id,
      teamName: teamName || `${user.name}'s Team`,
      teamMembers,
      registrationDate: new Date()
    });
    localStorage.setItem("userRegistrations", JSON.stringify(registrations));
    
    setSelectedEventId(null);
    setTeamName("");
    setTeamMembers([]);
    toast.success("Registration successful");
  };

  if (!user) {
    return null; // Loading state or redirect handled by getCurrentUser
  }

  // Get events from localStorage or use the default ones
  const storedEvents = localStorage.getItem("events");
  const rawEvents = storedEvents ? JSON.parse(storedEvents) : EVENTS;
  
  // Convert event dates from strings to Date objects
  const events = rawEvents.map((event: any) => ({
    ...event,
    date: new Date(event.date)
  }));

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
        <h1 className="text-3xl font-bold tracking-tight mb-6">Explore Events</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => (
            <EventCard
              key={event.id}
              event={event}
              onRegister={handleRegister}
            />
          ))}
        </div>

        <Dialog open={!!selectedEventId} onOpenChange={(open) => !open && setSelectedEventId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Register for Event</DialogTitle>
              <DialogDescription>
                Please provide your team details for registration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                />
              </div>

              <div className="space-y-2">
                <Label>Team Members</Label>
                {teamMembers.map((member, index) => (
                  <div key={index} className="grid gap-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={member.name}
                        onChange={(e) => handleTeamMemberChange(index, "name", e.target.value)}
                        placeholder="Name"
                        readOnly={index === 0} // Current user's details are read-only
                        className={index === 0 ? "bg-muted" : ""}
                      />
                      <Input
                        value={member.email}
                        onChange={(e) => handleTeamMemberChange(index, "email", e.target.value)}
                        placeholder="Email"
                        readOnly={index === 0}
                        className={index === 0 ? "bg-muted" : ""}
                      />
                      <Input
                        value={member.department}
                        onChange={(e) => handleTeamMemberChange(index, "department", e.target.value)}
                        placeholder="Department"
                        readOnly={index === 0}
                        className={index === 0 ? "bg-muted" : ""}
                      />
                    </div>
                    {index > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveTeamMember(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddTeamMember}
                  className="mt-2"
                >
                  Add Team Member
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEventId(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRegistration}>
                Register
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

export default ExploreEvents;
