
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Eye } from "lucide-react";
import { Event, Registration } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { jsPDF } from "jspdf";
import html2pdf from "html2pdf.js";

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
      <div style="font-family: 'Arial', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: right; margin-bottom: 30px;">
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>To Whom It May Concern,</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>This is to certify that the following students from the ${registration.teamMembers[0].department} department are participating in the "${event.title}" event organized on ${formatDate(event.date)} at ${event.location}.</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p><strong>Team Name:</strong> ${registration.teamName}</p>
          <p><strong>Team Members:</strong></p>
          <ul style="list-style-type: none; padding-left: 20px;">
            ${registration.teamMembers.map((member, index) => `
              <li style="margin-bottom: 5px;">
                ${index + 1}. ${member.name} (${member.email}, ${member.department} ${member.roll_number ? `, Roll No: ${member.roll_number}` : ''})
              </li>
            `).join('')}
          </ul>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>Please grant them On-Duty leave for the duration of the event. Their presence and participation is required for this educational activity which complements their academic curriculum.</p>
        </div>
        
        <div style="margin-bottom: 40px;">
          <p>Thank you for your understanding and cooperation.</p>
        </div>
        
        <div style="margin-top: 60px;">
          <p>Regards,</p>
          <p>Event Coordinator</p>
          <p>Eventify Platform</p>
        </div>
      </div>
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
      
      // Create file name
      const fileName = `OD_Letter_${event.title}_${registration.teamName}.pdf`;
      
      // Create a temporary container for the HTML content
      const container = document.createElement('div');
      container.innerHTML = odLetterContent;
      document.body.appendChild(container);
      
      // Use html2pdf to convert HTML to PDF
      const pdfBlob = await html2pdf()
        .from(container)
        .set({
          margin: [15, 15, 15, 15],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .outputPdf('blob');
      
      // Remove the temporary container
      document.body.removeChild(container);
      
      // Create a File object from the blob
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // Upload to Supabase storage with proper authorization
      const filePath = `${user.id}/${registration.id}_od_letter.pdf`;
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
      
      // Create a direct download by creating a blob URL
      const blobUrl = URL.createObjectURL(pdfBlob);
      
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
          <div className="p-4 border rounded-md bg-white text-sm whitespace-pre-line font-mono max-h-[60vh] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: generateODContent() }} />
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
              {isGenerating ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
