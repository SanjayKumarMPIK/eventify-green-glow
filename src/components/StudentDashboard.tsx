import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ODLetterGenerator } from "./ODLetterGenerator";
import { Event, Registration, User, UserRole, TeamMember } from "@/types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileIcon, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function StudentDashboard() {
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCertificate, setShowCertificate] = useState<Registration | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user: authUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) return;
      
      try {
        // Fetch current user details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        if (userError) {
          console.error("Error fetching user details:", userError);
          toast.error("Could not fetch user details");
          return;
        }
        
        const user: User = {
          id: userData.id,
          email: authUser.email || '',
          name: userData.name,
          role: userData.role as UserRole,
          department: userData.department
        };
        
        setCurrentUser(user);
        
        // Fetch user registrations
        const { data: registrationData, error: registrationError } = await supabase
          .from('registrations')
          .select(`
            id,
            event_id,
            user_id,
            team_name,
            registration_date,
            attended,
            certificate_generated,
            od_letter_generated
          `)
          .eq('user_id', authUser.id);
          
        if (registrationError) {
          console.error("Error fetching registrations:", registrationError);
          toast.error("Could not fetch your registrations");
          return;
        }
        
        // Fetch event details for each registration
        const eventIds = registrationData.map(reg => reg.event_id);
        
        if (eventIds.length === 0) {
          setMyRegistrations([]);
          return;
        }
        
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);
          
        if (eventError) {
          console.error("Error fetching events:", eventError);
          toast.error("Could not fetch event details");
          return;
        }
        
        // Fetch team members for each registration
        const registrationIds = registrationData.map(reg => reg.id);
        
        const { data: teamMembersData, error: teamMembersError } = await supabase
          .from('team_members')
          .select('*')
          .in('registration_id', registrationIds);
          
        if (teamMembersError) {
          console.error("Error fetching team members:", teamMembersError);
          toast.error("Could not fetch team members");
          return;
        }
        
        // Map events to a dictionary for easier lookup
        const eventsMap = eventData.reduce((acc, event) => {
          acc[event.id] = {
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
          };
          return acc;
        }, {} as Record<string, Event>);
        
        // Map team members to registrations
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
        
        // Construct registrations with event and team member data
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
        
        setMyRegistrations(processedRegistrations);
        setEvents(Object.values(eventsMap));
        
        // Set up real-time listener for event slot updates
        const eventChannel = supabase
          .channel('event-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'events'
            },
            (payload) => {
              console.log('Event update received:', payload);
              const updatedEvent = payload.new;
              setEvents(prevEvents => prevEvents.map(event => 
                event.id === updatedEvent.id ? 
                {
                  ...event,
                  availableSlots: updatedEvent.available_slots,
                  totalSlots: updatedEvent.total_slots
                } : 
                event
              ));
            }
          )
          .subscribe();
        
        // Return cleanup function for the channel
        return () => {
          supabase.removeChannel(eventChannel);
        };
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Something went wrong. Please try again later.");
      }
    };
    
    fetchData();
  }, [authUser]);

  const getEventById = (eventId: string): Event | undefined => {
    return events.find((e) => e.id === eventId);
  };

  const formatDate = (date: Date | string) => {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const generateCertificate = (registration: Registration) => {
    setShowCertificate(registration);
  };

  const downloadCertificate = async () => {
    if (!showCertificate || !authUser || !currentUser) {
      toast.error("Missing required information");
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Get event info
      const event = getEventById(showCertificate.eventId);
      if (!event) {
        throw new Error("Event information not found");
      }
      
      // Create PDF-like content using HTML with proper styling
      const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificate of Participation</title>
        <style>
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            font-family: 'Arial', sans-serif;
            text-align: center;
            color: #333;
            padding: 40px;
            border: 20px double #4f46e5;
            margin: 0;
            background-color: #f9fafb;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 100vh;
          }
          .certificate {
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #4f46e5;
            font-size: 36px;
            margin-bottom: 30px;
          }
          .name {
            font-size: 32px;
            font-weight: bold;
            margin: 25px 0;
            color: #000;
          }
          .event {
            font-size: 28px;
            font-weight: bold;
            margin: 25px 0;
            color: #333;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 100px;
          }
          .signature {
            border-top: 1px solid #000;
            width: 200px;
            padding-top: 10px;
            display: inline-block;
          }
          p {
            font-size: 18px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <h1>Certificate of Participation</h1>
          <p>This is to certify that</p>
          <p class="name">${currentUser.name}</p>
          <p>from ${currentUser.department || 'Department'}</p>
          <p>has successfully participated in the event</p>
          <p class="event">${event.title}</p>
          <p>held on ${formatDate(event.date)}</p>
          
          <div class="signatures">
            <div>
              <div class="signature">Event Coordinator</div>
            </div>
            <div>
              <div class="signature">Department Head</div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;
      
      // Convert HTML to a Blob
      const blob = new Blob([certificateHTML], { type: 'text/html' });
      
      // Create a file object
      const fileName = `Certificate_${event.title}_${currentUser.name}.html`;
      const file = new File([blob], fileName, { type: 'text/html' });
      
      // Upload to Supabase storage
      const filePath = `${authUser.id}/${showCertificate.id}_certificate.html`;
      const { data, error } = await supabase.storage
        .from('certificates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error("Storage upload error:", error);
        throw error;
      }
      
      // Update certificate_generated flag
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ certificate_generated: true })
        .eq('id', showCertificate.id);
        
      if (updateError) {
        console.error("Registration update error:", updateError);
        throw updateError;
      }
      
      // Download using a temporary link element
      const downloadLink = document.createElement('a');
      
      // Generate a downloadable object URL from the blob directly
      const blobUrl = URL.createObjectURL(blob);
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      downloadLink.target = "_blank";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      toast.success("Certificate downloaded successfully");
      setShowCertificate(null);
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
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
                      Registered on {formatDate(registration.registrationDate)}
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
              <div id="certificate-content" className="border-8 border-double border-primary/20 p-8 bg-[#F2FCE2]/30 text-center">
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
                  held on {(() => {
                    const eventDate = getEventById(showCertificate.eventId)?.date;
                    return eventDate ? formatDate(eventDate) : '';
                  })()}
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
                <Button 
                  onClick={downloadCertificate} 
                  className="flex items-center" 
                  disabled={isGenerating}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isGenerating ? "Generating..." : "Download Certificate"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
