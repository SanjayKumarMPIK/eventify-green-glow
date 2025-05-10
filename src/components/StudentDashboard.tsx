
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventCard } from "@/components/EventCard";
import { EVENTS, REGISTRATIONS } from "@/lib/data";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ODLetterGenerator } from "./ODLetterGenerator";
import { toast } from "sonner";

export function StudentDashboard() {
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState([{ name: "", email: "", department: "" }]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const myRegistrations = REGISTRATIONS;

  const handleRegister = (eventId: string) => {
    // Check if user has already registered for this event
    const alreadyRegistered = myRegistrations.some(reg => reg.eventId === eventId);
    
    if (alreadyRegistered) {
      toast.error("You have already registered for this event");
      return;
    }
    
    setSelectedEventId(eventId);
  };

  const handleAddTeamMember = () => {
    setTeamMembers([...teamMembers, { name: "", email: "", department: "" }]);
  };

  const handleRemoveTeamMember = (index: number) => {
    const newTeamMembers = [...teamMembers];
    newTeamMembers.splice(index, 1);
    setTeamMembers(newTeamMembers);
  };

  const handleTeamMemberChange = (index: number, field: string, value: string) => {
    const newTeamMembers = [...teamMembers];
    newTeamMembers[index] = { ...newTeamMembers[index], [field]: value };
    setTeamMembers(newTeamMembers);
  };

  const handleSubmitRegistration = () => {
    // In a real app, you would submit this to an API
    toast.success("Registration successful");
    setSelectedEventId(null);
    setTeamName("");
    setTeamMembers([{ name: "", email: "", department: "" }]);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">My Registrations</h2>
        {myRegistrations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myRegistrations.map((registration) => {
              const event = EVENTS.find((e) => e.id === registration.eventId);
              if (!event) return null;
              return (
                <Card key={registration.id} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      Team: {registration.teamName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Registered on {registration.registrationDate.toLocaleDateString()}
                    </p>
                    <ODLetterGenerator registration={registration} event={event} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">You haven't registered for any events yet.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Available Events</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {EVENTS.map((event) => (
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
                      />
                      <Input
                        value={member.email}
                        onChange={(e) => handleTeamMemberChange(index, "email", e.target.value)}
                        placeholder="Email"
                      />
                      <Input
                        value={member.department}
                        onChange={(e) => handleTeamMemberChange(index, "department", e.target.value)}
                        placeholder="Department"
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
      </section>
    </div>
  );
}
