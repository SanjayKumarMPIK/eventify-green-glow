
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Eye } from "lucide-react";
import { Event, Registration } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ODLetterGeneratorProps {
  registration: Registration;
  event: Event;
}

export function ODLetterGenerator({ registration, event }: ODLetterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const formatDate = (date: Date | string) => {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  const odLetterContent = `
      Date: ${new Date().toLocaleDateString()}
      
      To Whom It May Concern,
      
      This is to certify that the following students from ${registration.teamMembers[0].department} department are participating in "${event.title}" event on ${formatDate(event.date)}.
      
      Team Name: ${registration.teamName}
      Team Members:
      ${registration.teamMembers.map((member, index) => `${index + 1}. ${member.name} (${member.email}, ${member.department})`).join('\n')}
      
      Please grant them On-Duty leave for the duration of the event.
      
      Regards,
      Event Coordinator
      Eventify Platform
    `;

  const handleGenerateOD = async () => {
    try {
      // Update od_letter_generated flag
      const { error } = await supabase
        .from('registrations')
        .update({ od_letter_generated: true })
        .eq('id', registration.id);
        
      if (error) {
        throw error;
      }
      
      console.log("Generated OD Letter Content: ", odLetterContent);
      toast.success("OD Letter downloaded");
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating OD letter status:", error);
      toast.error("Failed to update OD letter status");
    }
  };

  return (
    <>
      <Button variant="outline" className="w-full flex items-center" onClick={() => setIsOpen(true)}>
        <Eye className="mr-2 h-4 w-4" />
        Preview OD Letter
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>On-Duty Letter</DialogTitle>
          </DialogHeader>
          <div className="p-4 border rounded-md bg-white text-sm whitespace-pre-line font-mono">
            {odLetterContent}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button onClick={handleGenerateOD} className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
