
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ODLetterGenerator } from "./ODLetterGenerator";
import { Event, Registration, User, UserRole, TeamMember } from "@/types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileIcon, Download, LockIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import html2pdf from "html2pdf.js";
import { FeedbackForm } from "./FeedbackForm";

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
        
        console.log("Raw registration data:", registrationData);
        
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
        const processedRegistrations = registrationData.map(reg => {
          console.log(`Processing registration ${reg.id}, attended status: ${reg.attended}`);
          return {
            id: reg.id,
            eventId: reg.event_id,
            userId: reg.user_id,
            teamName: reg.team_name,
            registrationDate: new Date(reg.registration_date),
            attended: reg.attended === true, // Explicitly convert to boolean
            certificate_generated: reg.certificate_generated === true,
            od_letter_generated: reg.od_letter_generated === true,
            teamMembers: teamMembersByRegistration[reg.id] || []
          };
        });
        
        console.log("Processed registrations:", processedRegistrations);
        
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
          
        // Set up real-time listener for registration updates (attendance marking)
        const registrationChannel = supabase
          .channel('registration-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'registrations',
              filter: `user_id=eq.${authUser.id}`
            },
            (payload) => {
              console.log('Registration update received:', payload);
              const updatedRegistration = payload.new;
              
              setMyRegistrations(prevRegistrations => prevRegistrations.map(reg => 
                reg.id === updatedRegistration.id ? 
                {
                  ...reg,
                  attended: updatedRegistration.attended === true,
                  certificate_generated: updatedRegistration.certificate_generated === true,
                  od_letter_generated: updatedRegistration.od_letter_generated === true,
                } : 
                reg
              ));
            }
          )
          .subscribe();
        
        // Return cleanup function for the channels
        return () => {
          supabase.removeChannel(eventChannel);
          supabase.removeChannel(registrationChannel);
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
    // Check if attendance is marked
    if (!registration.attended) {
      toast.error("Certificate is locked until your attendance is marked by an admin");
      return;
    }
    
    setShowCertificate(registration);
  };

  const generateCertificateHTML = (event: Event | undefined, username: string, department: string) => {
    if (!event) return '';
    
    return `
      <div style="font-family: 'Arial', sans-serif; text-align: center; padding: 40px; color: #333; border: 20px double #4f46e5; background-color: #f9fafb; max-width: 800px; margin: 0 auto;">
        <div style="max-width: 800px; margin: 0 auto;">
          <h1 style="color: #4f46e5; font-size: 36px; margin-bottom: 10px;">Certificate of Participation</h1>
          
          <div style="margin: 45px 0;">
            <p style="font-size: 18px; margin-bottom: 5px;">This is to certify that</p>
            <p style="font-size: 28px; font-weight: bold; margin: 12px 0;">${username}</p>
            <p style="font-size: 18px; margin-bottom: 10px;">from ${department}</p>
            <p style="font-size: 18px; margin-bottom: 10px;">has actively participated in</p>
            <p style="font-size: 28px; font-weight: bold; margin: 12px 0;">${event.title}</p>
            <p style="font-size: 18px; margin-bottom: 10px;">organized by Eventify on</p>
            <p style="font-size: 20px; margin: 16px 0;">${formatDate(event.date)}</p>
            <p style="font-size: 18px; line-height: 1.0; margin: 20px 0;">
              We acknowledge their valuable contribution and enthusiasm throughout the event.
              This participation demonstrates their commitment to professional development and
              enhances their academic portfolio with practical experience.
            </p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-top: 50px;">
            <div>
              <div style="border-top: 1px solid #000; width: 200px; padding-top: 5px; display: inline-block;">
                <p style="margin: 0;">Event Coordinator</p>
              </div>
            </div>
            <div>
              <div style="border-top: 1px solid #000; width: 200px; padding-top: 5px; display: inline-block;">
                <p style="margin: 0;">Department Head</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
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
      
      // Generate certificate HTML
      const certificateHTML = generateCertificateHTML(event, currentUser.name, currentUser.department || 'Department');
      
      // Create a temporary container for the HTML content
      const container = document.createElement('div');
      container.innerHTML = certificateHTML;
      document.body.appendChild(container);
      
      // File name for the certificate
      const fileName = `Certificate_${event.title}_${currentUser.name}.pdf`;
      
      // Use html2pdf to convert HTML to PDF
      const pdfBlob = await html2pdf()
        .from(container)
        .set({
          margin: [15, 15, 15, 15],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        })
        .outputPdf('blob');
      
      // Remove the temporary container
      document.body.removeChild(container);
      
      // Create a File object from the blob
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // Upload to Supabase storage
      const filePath = `${authUser.id}/${showCertificate.id}_certificate.pdf`;
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
      
      // Download the PDF
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
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
  
  // Check if event has passed to enable feedback
  const hasEventPassed = (eventDate: Date) => {
    const now = new Date();
    return eventDate < now;
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
              
              const isPastEvent = hasEventPassed(event.date);
              const isAttendanceMarked = registration.attended === true;
              
              console.log(`Rendering registration ${registration.id}, attended: ${registration.attended}, isAttendanceMarked: ${isAttendanceMarked}`);
              
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
                        variant={isAttendanceMarked ? "outline" : "secondary"}
                        className={`w-full flex items-center justify-center ${!isAttendanceMarked ? "opacity-60" : ""}`}
                        onClick={() => generateCertificate(registration)}
                      >
                        {isAttendanceMarked ? (
                          <FileIcon className="mr-2 h-4 w-4" />
                        ) : (
                          <LockIcon className="mr-2 h-4 w-4" />
                        )}
                        {isAttendanceMarked ? "View Certificate" : "Certificate Locked"}
                      </Button>
                      <ODLetterGenerator registration={registration} event={event} />
                      
                      {isPastEvent && (
                        <FeedbackForm eventId={event.id} userId={authUser?.id || ''} />
                      )}
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
              <div 
                id="certificate-content" 
                className="border-8 border-double border-primary/20 p-8 bg-[#F2FCE2]/30 text-center max-h-[60vh] overflow-y-auto"
              >
                <div dangerouslySetInnerHTML={{ 
                  __html: generateCertificateHTML(
                    getEventById(showCertificate.eventId),
                    currentUser?.name || '',
                    currentUser?.department || 'Department'
                  ) 
                }} />
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
