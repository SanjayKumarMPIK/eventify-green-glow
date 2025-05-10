import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { EventCard } from "./EventCard";
import { EVENTS } from "@/lib/data";
import { Event, Registration } from "@/types";
import { toast } from "sonner";

export function AdminDashboard() {
  const [events, setEvents] = useState(EVENTS);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isViewRegistrationsOpen, setIsViewRegistrationsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventSlots, setEventSlots] = useState("0");
  const [eventImageUrl, setEventImageUrl] = useState("");

  const handleAddEvent = () => {
    const newEvent: Event = {
      id: (events.length + 1).toString(),
      title: eventTitle,
      description: eventDescription,
      date: new Date(eventDate),
      location: eventLocation,
      totalSlots: parseInt(eventSlots),
      availableSlots: parseInt(eventSlots),
      creatorId: "1", // Current admin user
      registrations: [],
      imageUrl: eventImageUrl || undefined,
    };

    setEvents([...events, newEvent]);
    resetEventForm();
    setIsAddEventOpen(false);
    toast.success("Event added successfully");
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

  const handleUpdateEvent = () => {
    if (!selectedEvent) return;

    const updatedEvents = events.map((event) => {
      if (event.id === selectedEvent.id) {
        return {
          ...event,
          title: eventTitle,
          description: eventDescription,
          date: new Date(eventDate),
          location: eventLocation,
          totalSlots: parseInt(eventSlots),
          // Keep available slots up to date with the difference
          availableSlots: parseInt(eventSlots) - (event.totalSlots - event.availableSlots),
          imageUrl: eventImageUrl || undefined,
        };
      }
      return event;
    });

    setEvents(updatedEvents);
    resetEventForm();
    setIsAddEventOpen(false);
    toast.success("Event updated successfully");
  };

  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = events.filter((event) => event.id !== eventId);
    setEvents(updatedEvents);
    toast.success("Event deleted successfully");
  };

  const handleViewRegistrations = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    setSelectedEvent(event);
    setIsViewRegistrationsOpen(true);
  };

  const handleIncrementSlots = (eventId: string) => {
    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        const newTotalSlots = event.totalSlots + 10;
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
            {selectedEvent?.registrations.length ? (
              selectedEvent.registrations.map((registration: Registration) => (
                <Card key={registration.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Team: {registration.teamName}</CardTitle>
                    <CardDescription>
                      Registered on {registration.registrationDate.toLocaleDateString()}
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
