
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Eye } from "lucide-react";
import { Event, Registration } from "@/types";

interface ODLetterGeneratorProps {
  registration: Registration;
  event: Event;
}

export function ODLetterGenerator({ registration, event }: ODLetterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const odLetterContent = `
      Date: ${new Date().toLocaleDateString()}
      
      To Whom It May Concern,
      
      This is to certify that the following students from ${registration.teamMembers[0].department} department are participating in "${event.title}" event on ${new Date(event.date).toLocaleDateString()}.
      
      Team Name: ${registration.teamName}
      Team Members:
      ${registration.teamMembers.map((member, index) => `${index + 1}. ${member.name} (${member.email}, ${member.department})`).join('\n')}
      
      Please grant them On-Duty leave for the duration of the event.
      
      Regards,
      Event Coordinator
      Eventify Platform
    `;

  const handleGenerateOD = () => {
    console.log("Generated OD Letter Content: ", odLetterContent);
    // In a real app, this would generate a PDF
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
