
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, TeamMember, Event } from "@/types";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";

const ExploreEvents = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRegistrations, setUserRegistrations] = useState<string[]>([]);
  
  useEffect(() => {
    if (!authUser) {
      navigate("/login");
      return;
    }
    
    const fetchUserAndEvents = async () => {
      setLoading(true);
      try {
        // Fetch user details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        if (userError) {
          console.error("Error fetching user details:", userError);
          
          // Create a user object from auth user data if we can't get it from the database
          const user: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || 'User',
            role: (authUser.user_metadata?.role as any) || 'student',
            department: authUser.user_metadata?.department || ''
          };
          
          setCurrentUser(user);
        } else {
          const user: User = {
            id: userData.id,
            email: authUser.email || '',
            name: userData.name,
            role: userData.role as any,
            department: userData.department || ''
          };
          
          setCurrentUser(user);
        }
        
        // Fetch user's registrations to prevent double registrations
        const { data: registrationsData, error: registrationsError } = await supabase
          .from('registrations')
          .select('event_id')
          .eq('user_id', authUser.id);
          
        if (registrationsError) {
          console.error("Error fetching registrations:", registrationsError);
        } else {
          setUserRegistrations(registrationsData.map(reg => reg.event_id));
        }
        
        // Fetch events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });
          
        if (eventsError) {
          throw eventsError;
        }
        
        const processedEvents: Event[] = eventsData.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          date: new Date(event.date),
          location: event.location,
          totalSlots: event.total_slots,
          availableSlots: event.available_slots,
          creatorId: event.creator_id,
          registrations: [],
          imageUrl: event.image_url
        }));
        
        setEvents(processedEvents);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndEvents();

    // Set up real-time listener for available slots updates
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events'
        },
        (payload) => {
          console.log('Real-time event update:', payload);
          const updatedEvent = payload.new;
          
          // Update the events array with the new data
          setEvents(prevEvents => prevEvents.map(event =>
            event.id === updatedEvent.id
              ? {
                  ...event,
                  availableSlots: updatedEvent.available_slots,
                  totalSlots: updatedEvent.total_slots,
                }
              : event
          ));
        }
      )
      .subscribe();

    return () => {
      // Clean up the subscription when the component unmounts
      supabase.removeChannel(channel);
    };
  }, [authUser, navigate]);
  
  const handleRegister = async (eventId: string) => {
    if (!authUser) {
      toast.error("You must be logged in to register");
      return;
    }
    
    // Check if user already registered for this event
    if (userRegistrations.includes(eventId)) {
      toast.error("You have already registered for this event");
      return;
    }
    
    // Find the event
    const event = events.find(e => e.id === eventId);
    if (!event) {
      toast.error("Event not found");
      return;
    }
    
    // Perform a fresh check of available slots directly from the database
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('available_slots')
        .eq('id', eventId)
        .single();
        
      if (eventError) {
        throw eventError;
      }
      
      // Check if there are available slots based on fresh data
      if (eventData.available_slots <= 0) {
        toast.error("Sorry, this event is fully booked");
        return;
      }
      
      setSelectedEventId(eventId);
      
      // Initialize with the current user's details
      if (currentUser) {
        setTeamName("");
        setTeamMembers([{
          name: currentUser.name,
          email: currentUser.email,
          department: currentUser.department || ""
        }]);
      }
    } catch (error) {
      console.error("Error checking event availability:", error);
      toast.error("Failed to check event availability");
    }
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

  const handleTeamMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    if (index === 0) return; // Don't allow changing the first member's details (current user)
    const newTeamMembers = [...teamMembers];
    newTeamMembers[index] = { ...newTeamMembers[index], [field]: value };
    setTeamMembers(newTeamMembers);
  };

  const handleSubmitRegistration = async () => {
    if (!authUser || !selectedEventId) return;
    
    try {
      // Final verification that user hasn't registered already
      if (userRegistrations.includes(selectedEventId)) {
        toast.error("You have already registered for this event");
        setSelectedEventId(null);
        return;
      }
      
      // Final check of available slots directly from the database
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('available_slots')
        .eq('id', selectedEventId)
        .single();
        
      if (eventError) {
        throw eventError;
      }
      
      if (eventData.available_slots <= 0) {
        toast.error("Sorry, this event is fully booked");
        setSelectedEventId(null);
        return;
      }
      
      // Insert registration - the database trigger will handle slot decrement
      const finalTeamName = teamName || `${teamMembers[0].name}'s Team`;
      
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .insert([{
          event_id: selectedEventId,
          user_id: authUser.id,
          team_name: finalTeamName
        }])
        .select();
        
      if (regError) {
        // If error contains message about slots or registration, display it
        if (regError.message?.includes("No available slots") || 
            regError.message?.includes("User has already registered")) {
          toast.error(regError.message);
        } else {
          throw regError;
        }
        setSelectedEventId(null);
        return;
      }
      
      const registrationId = regData[0].id;
      
      // Insert team members
      const teamMembersToInsert = teamMembers.map(member => ({
        registration_id: registrationId,
        name: member.name,
        email: member.email,
        department: member.department,
        roll_number: member.roll_number || null
      }));
      
      const { error: teamError } = await supabase
        .from('team_members')
        .insert(teamMembersToInsert);
        
      if (teamError) {
        throw teamError;
      }
      
      // Update local user registrations to prevent double registrations
      setUserRegistrations(prev => [...prev, selectedEventId]);
      
      // Close the dialog and reset form
      setSelectedEventId(null);
      setTeamName("");
      setTeamMembers([]);
      toast.success("Registration successful");
    } catch (error: any) {
      console.error("Error registering:", error);
      
      if (error.message?.includes("No available slots") || 
          error.message?.includes("User has already registered")) {
        toast.error(error.message);
      } else {
        toast.error("Failed to register for the event");
      }
      setSelectedEventId(null);
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Explore Events</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : events.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event: Event) => (
              <EventCard
                key={event.id}
                event={event}
                onRegister={handleRegister}
                isRegistered={userRegistrations.includes(event.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events available at the moment.</p>
          </div>
        )}

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
      </div>
    </Layout>
  );
};

export default ExploreEvents;
