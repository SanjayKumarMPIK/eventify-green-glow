
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
        const processedRegistrations = registrationData.map(reg => {
          console.log(`Loading registration ${reg.id}, raw attended status:`, reg.attended);
          return {
            id: reg.id,
            eventId: event.id,
            userId: reg.user_id,
            teamName: reg.team_name,
            registrationDate: new Date(reg.registration_date),
            attended: reg.attended === true, // Explicit boolean conversion
            certificate_generated: reg.certificate_generated === true,
            od_letter_generated: reg.od_letter_generated === true,
            teamMembers: teamMembersByRegistration[reg.id] || []
          };
        });
        
        console.log("Processed registrations:", processedRegistrations);
        
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
    
    // Set up real-time listener for attendance updates
    const channel = supabase
      .channel('registration-attendance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'registrations',
          filter: `event_id=eq.${event.id}`
        },
        (payload) => {
          console.log('Registration update received in admin view:', payload);
          const updatedRegistration = payload.new;
          
          // Update local state with the changes from the database
          setRegistrations(prevRegistrations => prevRegistrations.map(reg => 
            reg.id === updatedRegistration.id ? 
            {
              ...reg,
              attended: updatedRegistration.attended === true,
              certificate_generated: updatedRegistration.certificate_generated === true,
              od_letter_generated: updatedRegistration.od_letter_generated === true,
            } : 
            reg
          ));
          
          // Also update filtered registrations
          setFilteredRegistrations(prevFiltered => prevFiltered.map(reg => 
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
    
    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
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
      const currentStatus = registration.attended === true;
      const newStatus = !currentStatus;
      
      console.log(`Toggling attendance for ${registration.id} from ${currentStatus} to ${newStatus}`);
      
      // Update the attendance status in the database
      // Use explicit boolean for the update to avoid any type issues
      const { data, error } = await supabase
        .from('registrations')
        .update({ attended: newStatus })
        .eq('id', registration.id)
        .select();
        
      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }
      
      console.log("Update response from Supabase:", data);
      
      // Update local state (should also happen via real-time subscription)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
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
        <div className="w-full overflow-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Team Name</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="w-[150px]">Registered On</TableHead>
                <TableHead className="w-[100px] text-center">Attended</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations.map((registration) => (
                <TableRow key={registration.id}>
                  <TableCell className="font-medium">{registration.teamName}</TableCell>
                  <TableCell>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {registration.teamMembers.map((member, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{member.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {member.email} • {member.department} {member.roll_number && `• ${member.roll_number}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(registration.registrationDate)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${registration.attended ? 'bg-green-100 text-green-700' : 'text-muted-foreground'}`}
                      onClick={() => handleAttendanceToggle(registration)}
                    >
                      {registration.attended ? <CheckIcon className="h-4 w-4" /> : <Checkbox className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-md py-8 text-center text-muted-foreground">
          No registrations for this event yet.
        </div>
      )}
    </div>
  );
}
