
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ODLetterGenerator } from "./ODLetterGenerator";
import { Event, Registration, User } from "@/types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileIcon, Download } from "lucide-react";
import { Link } from "react-router-dom";

export function StudentDashboard() {
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCertificate, setShowCertificate] = useState<Registration | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Get current user
    const userJson = localStorage.getItem("currentUser");
    if (userJson) {
      const user = JSON.parse(userJson);
      setCurrentUser(user);
      
      // Get registrations for current user
      const allRegistrations = JSON.parse(localStorage.getItem("userRegistrations") || "[]");
      const userRegistrations = allRegistrations.filter((reg: Registration) => 
        reg.userId === user.id
      );
      setMyRegistrations(userRegistrations);
      
      // Get all events
      const allEvents = JSON.parse(localStorage.getItem("events") || "[]");
      setEvents(allEvents);
    }
  }, []);

  const getEventById = (eventId: string): Event | undefined => {
    return events.find((e) => e.id === eventId);
  };

  const generateCertificate = (registration: Registration) => {
    setShowCertificate(registration);
  };

  const downloadCertificate = () => {
    // In a real app, this would create a PDF and download it
    toast.success("Certificate downloaded");
    setShowCertificate(null);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">My Registrations</h2>
        {myRegistrations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myRegistrations.map((registration) => {
              const event = getEventById(registration.eventId);
              if (!event) return null;
              return (
                <Card key={registration.id} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>
                      Team: {registration.teamName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Registered on {new Date(registration.registrationDate).toLocaleDateString()}
                    </p>
                    <div className="flex flex-col space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center"
                        onClick={() => generateCertificate(registration)}
                      >
                        <FileIcon className="mr-2 h-4 w-4" />
                        View Certificate
                      </Button>
                      <ODLetterGenerator registration={registration} event={event} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">You haven't registered for any events yet.</p>
              <div className="flex justify-center mt-4">
                <Button asChild>
                  <Link to="/explore">Explore Events</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Certificate Preview Dialog */}
      <Dialog open={!!showCertificate} onOpenChange={(open) => !open && setShowCertificate(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Participation Certificate</DialogTitle>
          </DialogHeader>
          {showCertificate && (
            <div className="py-4">
              <div className="border-8 border-double border-primary/20 p-8 bg-[#F2FCE2]/30 text-center">
                <h1 className="text-3xl font-bold text-primary mb-6">Certificate of Participation</h1>
                <p className="text-lg mb-6">This is to certify that</p>
                <p className="text-2xl font-semibold mb-2">{currentUser?.name}</p>
                <p className="text-lg mb-6">from {currentUser?.department}</p>
                <p className="text-lg mb-6">
                  has successfully participated in the event
                </p>
                <p className="text-2xl font-semibold mb-6">
                  {getEventById(showCertificate.eventId)?.title}
                </p>
                <p className="text-lg mb-10">
                  held on {getEventById(showCertificate.eventId)?.date.toLocaleDateString()}
                </p>
                <div className="flex justify-between pt-10">
                  <div>
                    <div className="border-t border-black w-40 mx-auto"></div>
                    <p className="text-sm mt-1">Event Coordinator</p>
                  </div>
                  <div>
                    <div className="border-t border-black w-40 mx-auto"></div>
                    <p className="text-sm mt-1">Department Head</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={downloadCertificate} className="flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Download Certificate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
