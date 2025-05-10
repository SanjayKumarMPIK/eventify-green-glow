
import { Button } from "@/components/ui/button";
import { Event, Registration } from "@/types";
import { FileTextIcon } from "lucide-react";
import { toast } from "sonner";

interface ODLetterGeneratorProps {
  registration: Registration;
  event: Event;
}

export function ODLetterGenerator({ registration, event }: ODLetterGeneratorProps) {
  const generateODLetter = () => {
    // In a real application, this would generate a PDF or downloadable file
    // For this demo, we'll just show a success message
    toast.success("On-Duty letter generated successfully. Check your downloads folder.");
    
    // Simulate generating PDF content
    const letterContent = `
      Date: ${new Date().toLocaleDateString()}
      
      To Whom It May Concern,
      
      This is to certify that the following students from ${registration.teamMembers[0].department} department are participating in "${event.title}" event on ${event.date.toLocaleDateString()}.
      
      Team Name: ${registration.teamName}
      Team Members:
      ${registration.teamMembers.map((member, i) => `${i+1}. ${member.name} (${member.email}, ${member.department})`).join('\n')}
      
      Please grant them On-Duty leave for the duration of the event.
      
      Regards,
      Event Coordinator
      Eventify Platform
    `;
    
    console.log("Generated OD Letter Content:", letterContent);
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateODLetter}
      className="w-full"
    >
      <FileTextIcon className="mr-2 h-4 w-4" />
      Generate OD Letter
    </Button>
  );
}
