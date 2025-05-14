
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, TeamMember, Registration, Event } from "@/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckIcon, SearchIcon, CheckCircle2, Circle } from "lucide-react";

interface RegistrationsViewProps {
  event: Event;
}

export function RegistrationsView({ event }: RegistrationsViewProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    const fetchRegistrations = async () => {
      setLoading(true);
      try {
        // Fetch registrations for this event
        const { data: registrationData, error: registrationError } = await supabase
          .from('registrations')
          .select(`
            id,
            user_id,
            team_name,
            registration_date,
            attended,
            certificate_generated,
            od_letter_generated
          `)
          .eq('event_id', event.id);
          
        if (registrationError) {
          throw registrationError;
        }
        
        // Fetch team members for each registration
        const registrationIds = registrationData.map(reg => reg.id);
        
        const { data: teamMembersData, error: teamMembersError } = await supabase
          .from('team_members')
          .select('*')
          .in('registration_id', registrationIds);
          
        if (teamMembersError) {
          throw teamMembersError;
        }
        
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
        
        // Construct registrations with team member data
        const processedRegistrations = registrationData.map(reg => ({
          id: reg.id,
          eventId: event.id,
          userId: reg.user_id,
          teamName: reg.team_name,
          registrationDate: new Date(reg.registration_date),
          attended: reg.attended,
          certificate_generated: reg.certificate_generated,
          od_letter_generated: reg.od_letter_generated,
          teamMembers: teamMembersByRegistration[reg.id] || []
        }));
        
        setRegistrations(processedRegistrations);
        setFilteredRegistrations(processedRegistrations);
      } catch (error) {
        console.error("Error fetching registrations:", error);
        toast.error("Failed to load registrations");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegistrations();
  }, [event.id]);

  useEffect(() => {
    // Apply search filter
    const filtered = registrations.filter(reg => {
      // Search in team name
      if (reg.teamName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }
      
      // Search in team members
      return reg.teamMembers.some(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.roll_number && member.roll_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    
    setFilteredRegistrations(filtered);
  }, [searchTerm, registrations]);

  const handleAttendanceToggle = async (registration: Registration) => {
    try {
      const newStatus = !registration.attended;
      
      // Update the attendance status in the database
      const { error } = await supabase
        .from('registrations')
        .update({ attended: newStatus })
        .eq('id', registration.id);
        
      if (error) {
        throw error;
      }
      
      // Update local state
      setRegistrations(prevRegistrations => 
        prevRegistrations.map(reg => 
          reg.id === registration.id ? { ...reg, attended: newStatus } : reg
        )
      );
      
      setFilteredRegistrations(prevRegistrations => 
        prevRegistrations.map(reg => 
          reg.id === registration.id ? { ...reg, attended: newStatus } : reg
        )
      );
      
      toast.success(`Attendance ${newStatus ? 'marked' : 'unmarked'} for ${registration.teamName}`);
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Render for larger screens
  const renderDesktopView = () => (
    <div className="border rounded-md hidden md:block">
      <div className="bg-muted py-2 px-4 grid grid-cols-12 gap-2 text-sm font-medium">
        <div className="col-span-3">Team Name</div>
        <div className="col-span-6">Members</div>
        <div className="col-span-2">Registered On</div>
        <div className="col-span-1 text-center">Attended</div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-330px)] min-h-[300px]">
        <div className="divide-y">
          {filteredRegistrations.map((registration) => (
            <div key={registration.id} className="py-3 px-4 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3 font-medium">{registration.teamName}</div>
              <div className="col-span-6">
                <div className="space-y-1">
                  {registration.teamMembers.map((member, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {member.email} • {member.department} {member.roll_number && `• ${member.roll_number}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {formatDate(registration.registrationDate)}
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${registration.attended ? 'bg-green-100 text-green-700' : 'text-muted-foreground'}`}
                  onClick={() => handleAttendanceToggle(registration)}
                >
                  {registration.attended && <CheckIcon className="h-4 w-4" />}
                  {!registration.attended && <Checkbox className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // Render for mobile/smaller screens
  const renderMobileView = () => (
    <div className="md:hidden space-y-4">
      <ScrollArea className="h-[calc(100vh-330px)] min-h-[300px]">
        {filteredRegistrations.map((registration) => (
          <div key={registration.id} className="border rounded-md p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">{registration.teamName}</h3>
              <Button
                variant="ghost"
                size="sm"
                className={`${registration.attended ? 'text-green-700' : 'text-muted-foreground'}`}
                onClick={() => handleAttendanceToggle(registration)}
              >
                {registration.attended ? (
                  <CheckCircle2 className="h-5 w-5 mr-1" />
                ) : (
                  <Circle className="h-5 w-5 mr-1" />
                )}
                {registration.attended ? 'Attended' : 'Mark Attendance'}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              Registered on {formatDate(registration.registrationDate)}
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="text-sm font-medium mb-1">Team Members:</div>
              {registration.teamMembers.map((member, index) => (
                <div key={index} className="text-sm mb-2 pl-2 border-l-2 border-muted">
                  <div className="font-medium">{member.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {member.email}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {member.department} {member.roll_number && `• ${member.roll_number}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or team name..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-muted-foreground text-sm">
          {filteredRegistrations.length} of {registrations.length} registrations
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : registrations.length > 0 ? (
        <>
          {renderDesktopView()}
          {renderMobileView()}
        </>
      ) : (
        <div className="border rounded-md py-8 text-center text-muted-foreground">
          No registrations for this event yet.
        </div>
      )}
    </div>
  );
}
