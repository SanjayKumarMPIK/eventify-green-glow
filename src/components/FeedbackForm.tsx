
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatBubbleIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackFormProps {
  eventId: string;
  userId: string;
}

interface FeedbackData {
  id?: string;
  event_id: string;
  user_id: string;
  overall_rating: number;
  was_informative: boolean;
  organization_rating: string;
  additional_comments?: string;
}

export function FeedbackForm({ eventId, userId }: FeedbackFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({
    event_id: eventId,
    user_id: userId,
    overall_rating: 3,
    was_informative: true,
    organization_rating: 'Good',
    additional_comments: '',
  });

  useEffect(() => {
    const checkExistingFeedback = async () => {
      if (!userId || !eventId) return;
      
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .eq('user_id', userId)
          .eq('event_id', eventId)
          .maybeSingle();
          
        if (error) {
          console.error("Error checking feedback:", error);
          return;
        }
        
        if (data) {
          setHasFeedback(true);
          setFeedback({
            id: data.id,
            event_id: data.event_id,
            user_id: data.user_id,
            overall_rating: data.overall_rating,
            was_informative: data.was_informative,
            organization_rating: data.organization_rating,
            additional_comments: data.additional_comments || '',
          });
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    };
    
    checkExistingFeedback();
  }, [userId, eventId]);

  const handleSubmit = async () => {
    if (!userId || !eventId) {
      toast.error("Missing user or event information");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let result;
      
      if (hasFeedback && feedback.id) {
        // Update existing feedback
        const { data, error } = await supabase
          .from('feedback')
          .update({
            overall_rating: feedback.overall_rating,
            was_informative: feedback.was_informative,
            organization_rating: feedback.organization_rating,
            additional_comments: feedback.additional_comments,
          })
          .eq('id', feedback.id)
          .select();
          
        if (error) throw error;
        result = data;
        toast.success("Feedback updated successfully!");
      } else {
        // Insert new feedback
        const { data, error } = await supabase
          .from('feedback')
          .insert([{
            event_id: eventId,
            user_id: userId,
            overall_rating: feedback.overall_rating,
            was_informative: feedback.was_informative,
            organization_rating: feedback.organization_rating,
            additional_comments: feedback.additional_comments,
          }])
          .select();
          
        if (error) throw error;
        result = data;
        setHasFeedback(true);
        toast.success("Thank you for your feedback!");
      }
      
      if (result && result[0]) {
        setFeedback(prev => ({ ...prev, id: result[0].id }));
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center"
        onClick={() => setIsOpen(true)}
      >
        <ChatBubbleIcon className="mr-2 h-4 w-4" />
        {hasFeedback ? "View/Edit Feedback" : "Submit Feedback"}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Event Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>How would you rate the event overall? (1-5)</Label>
              <RadioGroup 
                value={feedback.overall_rating.toString()} 
                onValueChange={(value) => setFeedback(prev => ({ ...prev, overall_rating: parseInt(value) }))}
                className="flex space-x-2"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex flex-col items-center">
                    <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                    <Label htmlFor={`rating-${rating}`}>{rating}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="informative" 
                  checked={feedback.was_informative}
                  onCheckedChange={(checked) => setFeedback(prev => ({ ...prev, was_informative: checked }))}
                />
                <Label htmlFor="informative">Was the event informative?</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>How was the organization?</Label>
              <RadioGroup 
                value={feedback.organization_rating} 
                onValueChange={(value) => setFeedback(prev => ({ ...prev, organization_rating: value }))}
              >
                {['Excellent', 'Good', 'Average', 'Poor'].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <RadioGroupItem value={rating} id={`org-${rating}`} />
                    <Label htmlFor={`org-${rating}`}>{rating}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments</Label>
              <Textarea 
                id="comments" 
                placeholder="Share your thoughts about the event..."
                value={feedback.additional_comments || ''}
                onChange={(e) => setFeedback(prev => ({ ...prev, additional_comments: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : (hasFeedback ? "Update Feedback" : "Submit Feedback")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
