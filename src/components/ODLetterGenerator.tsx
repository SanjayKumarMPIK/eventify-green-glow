
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Eye } from "lucide-react";
import { Event, Registration } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface ODLetterGeneratorProps {
  registration: Registration;
  event: Event;
}

export function ODLetterGenerator({ registration, event }: ODLetterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  
  const formatDate = (date: Date | string) => {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  const generateODContent = () => {
    return `
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
  };

  const handleGenerateOD = async () => {
    if (!user) {
      toast.error("You must be logged in to download OD Letter");
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Generate the OD letter content
      const odLetterContent = generateODContent();
      
      // Create a Blob from the text content
      const blob = new Blob([odLetterContent], { type: 'text/plain' });
      
      // Create a file object
      const fileName = `OD_Letter_${event.title}_${registration.teamName}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });
      
      // Upload to Supabase storage with proper authorization
      const filePath = `${user.id}/${registration.id}_od_letter.txt`;
      const { data, error } = await supabase.storage
        .from('od_letters')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error("Storage upload error:", error);
        throw error;
      }
      
      // Update od_letter_generated flag
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ od_letter_generated: true })
        .eq('id', registration.id);
        
      if (updateError) {
        console.error("Registration update error:", updateError);
        throw updateError;
      }
      
      // Create a direct download instead of getting a public URL
      const odLetterBlob = new Blob([odLetterContent], { type: 'text/plain' });
      const blobUrl = URL.createObjectURL(odLetterBlob);
      
      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      toast.success("OD Letter downloaded successfully");
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating OD letter:", error);
      toast.error("Failed to generate OD letter. Please try again later.");
    } finally {
      setIsGenerating(false);
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
            {generateODContent()}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleGenerateOD} 
              className="flex items-center"
              disabled={isGenerating}
            >
              <FileText className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Download"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
