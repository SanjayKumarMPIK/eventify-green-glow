
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventCard } from "./EventCard";
import { Event, Registration, TeamMember } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isViewRegistrationsOpen, setIsViewRegistrationsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventSlots, setEventSlots] = useState("0");
  const [eventImageUrl, setEventImageUrl] = useState("");
  const { user: authUser } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      const processedEvents: Event[] = data.map(event => ({
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
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    }
  };

  const fetchRegistrationsForEvent = async (eventId: string) => {
    try {
      // Get registrations for the event
      const { data: registrationData, error: registrationError } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId);
        
      if (registrationError) {
        throw registrationError;
      }
      
      // Get team members for these registrations
      const registrationIds = registrationData.map(reg => reg.id);
      
      if (registrationIds.length === 0) {
        setRegistrations([]);
        return [];
      }
      
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('*')
        .in('registration_id', registrationIds);
        
      if (teamMembersError) {
        throw teamMembersError;
      }
      
      // Organize team members by registration
      const teamMembersByRegistration = teamMembersData.reduce((acc, member) => {
        if (!acc[member.registration_id]) {
          acc[member.registration_id] = [];
        }
        acc[member.registration_id].push({
          name: member.name,
          email: member.email,
          department: member.department,
          roll_number: member.roll_number
        });
        return acc;
      }, {} as Record<string, TeamMember[]>);
      
      // Create final registration objects
      const processedRegistrations = registrationData.map(reg => ({
        id: reg.id,
        eventId: reg.event_id,
        userId: reg.user_id,
        teamName: reg.team_name,
        registrationDate: new Date(reg.registration_date),
        attended: reg.attended,
        certificate_generated: reg.certificate_generated,
        od_letter_generated: reg.od_letter_generated,
        teamMembers: teamMembersByRegistration[reg.id] || []
      }));
      
      setRegistrations(processedRegistrations);
      return processedRegistrations;
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error("Failed to load registrations");
      return [];
    }
  };

  const handleAddEvent = async () => {
    if (!authUser) {
      toast.error("You must be logged in to create an event");
      return;
    }
    
    try {
      const newEvent = {
        title: eventTitle,
        description: eventDescription,
        date: new Date(eventDate).toISOString(),
        location: eventLocation,
        total_slots: parseInt(eventSlots),
        available_slots: parseInt(eventSlots),
        creator_id: authUser.id,
        image_url: eventImageUrl || null
      };
      
      const { data, error } = await supabase
        .from('events')
        .insert([newEvent])
        .select();
        
      if (error) {
        throw error;
      }
      
      // Add the new event to the state
      const processedEvent: Event = {
        id: data[0].id,
        title: data[0].title,
        description: data[0].description || '',
        date: new Date(data[0].date),
        location: data[0].location,
        totalSlots: data[0].total_slots,
        availableSlots: data[0].available_slots,
        creatorId: data[0].creator_id,
        registrations: [],
        imageUrl: data[0].image_url
      };
      
      setEvents([processedEvent, ...events]);
      resetEventForm();
      setIsAddEventOpen(false);
      toast.success("Event added successfully");
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    }
  };

  const handleEditEvent = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    setEventTitle(event.title);
    setEventDescription(event.description);
    setEventDate(event.date.toISOString().split("T")[0]);
    setEventLocation(event.location);
    setEventSlots(event.totalSlots.toString());
    setEventImageUrl(event.imageUrl || "");
    setSelectedEvent(event);
    setIsAddEventOpen(true);
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent || !authUser) return;

    try {
      const updatedEvent = {
        title: eventTitle,
        description: eventDescription,
        date: new Date(eventDate).toISOString(),
        location: eventLocation,
        total_slots: parseInt(eventSlots),
        available_slots: parseInt(eventSlots) - (selectedEvent.totalSlots - selectedEvent.availableSlots),
        image_url: eventImageUrl || null
      };
      
      const { error } = await supabase
        .from('events')
        .update(updatedEvent)
        .eq('id', selectedEvent.id);
        
      if (error) {
        throw error;
      }
      
      // Update the event in the state
      const updatedEvents = events.map((event) => {
        if (event.id === selectedEvent.id) {
          return {
            ...event,
            title: eventTitle,
            description: eventDescription,
            date: new Date(eventDate),
            location: eventLocation,
            totalSlots: parseInt(eventSlots),
            availableSlots: parseInt(eventSlots) - (selectedEvent.totalSlots - selectedEvent.availableSlots),
            imageUrl: eventImageUrl || undefined,
          };
        }
        return event;
      });

      setEvents(updatedEvents);
      resetEventForm();
      setIsAddEventOpen(false);
      toast.success("Event updated successfully");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
        
      if (error) {
        throw error;
      }
      
      const updatedEvents = events.filter((event) => event.id !== eventId);
      setEvents(updatedEvents);
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleViewRegistrations = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    setSelectedEvent(event);
    await fetchRegistrationsForEvent(eventId);
    setIsViewRegistrationsOpen(true);
  };

  const handleIncrementSlots = async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      
      const newTotalSlots = event.totalSlots + 10;
      
      const { error } = await supabase
        .from('events')
        .update({
          total_slots: newTotalSlots,
          available_slots: event.availableSlots + 10
        })
        .eq('id', eventId);
        
      if (error) {
        throw error;
      }
      
      const updatedEvents = events.map((event) => {
        if (event.id === eventId) {
          return {
            ...event,
            totalSlots: newTotalSlots,
            availableSlots: event.availableSlots + 10,
          };
        }
        return event;
      });

      setEvents(updatedEvents);
      toast.success("Added 10 slots to the event");
    } catch (error) {
      console.error("Error adding slots:", error);
      toast.error("Failed to add slots");
    }
  };

  const resetEventForm = () => {
    setEventTitle("");
    setEventDescription("");
    setEventDate("");
    setEventLocation("");
    setEventSlots("0");
    setEventImageUrl("");
    setSelectedEvent(null);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Manage Events</h2>
        <Button onClick={() => {
          resetEventForm();
          setIsAddEventOpen(true);
        }}>
          Add New Event
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isAdmin={true}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
            onViewRegistrations={handleViewRegistrations}
            onIncrementSlots={handleIncrementSlots}
          />
        ))}
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? "Update the event details below." : "Fill in the details to create a new event."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eventTitle">Event Title</Label>
              <Input
                id="eventTitle"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDescription">Description</Label>
              <Textarea
                id="eventDescription"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Enter event description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventSlots">Total Slots</Label>
                <Input
                  id="eventSlots"
                  type="number"
                  value={eventSlots}
                  onChange={(e) => setEventSlots(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventLocation">Location</Label>
              <Input
                id="eventLocation"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Enter event location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventImageUrl">Image URL (optional)</Label>
              <Input
                id="eventImageUrl"
                value={eventImageUrl}
                onChange={(e) => setEventImageUrl(e.target.value)}
                placeholder="Enter image URL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetEventForm();
              setIsAddEventOpen(false);
            }}>
              Cancel
            </Button>
            <Button onClick={selectedEvent ? handleUpdateEvent : handleAddEvent}>
              {selectedEvent ? "Update Event" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Registrations Dialog */}
      <Dialog open={isViewRegistrationsOpen} onOpenChange={setIsViewRegistrationsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Registrations for {selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              View all participants who have registered for this event.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {registrations.length > 0 ? (
              registrations.map((registration) => (
                <Card key={registration.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Team: {registration.teamName}</CardTitle>
                    <CardDescription>
                      Registered on {formatDate(registration.registrationDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-medium mb-2">Team Members</h4>
                    <div className="space-y-2">
                      {registration.teamMembers.map((member, index) => (
                        <div key={index} className="border p-2 rounded text-sm">
                          <p><strong>Name:</strong> {member.name}</p>
                          <p><strong>Email:</strong> {member.email}</p>
                          <p><strong>Department:</strong> {member.department}</p>
                          {member.roll_number && (
                            <p><strong>Roll Number:</strong> {member.roll_number}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No registrations for this event yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewRegistrationsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
