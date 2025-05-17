
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export function QRCheckIn({ event }: { event: Event }) {
  const [showQRCode, setShowQRCode] = useState(false);
  
  const generateCheckInCode = () => {
    // Create a check-in code using event ID and current timestamp
    const timestamp = new Date().getTime();
    return {
      eventId: event.id,
      timestamp,
      code: `${event.id}-${timestamp}`
    };
  };
  
  const [checkInData] = useState(generateCheckInCode());
  
  const handleCopyLink = () => {
    // Create a check-in URL that could be used with a real scanner app
    const checkInUrl = `${window.location.origin}/event-check-in/${checkInData.code}`;
    navigator.clipboard.writeText(checkInUrl);
    toast.success("Check-in link copied to clipboard!");
  };
  
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowQRCode(true)}
        className="w-full"
      >
        Generate Event Check-in QR Code
      </Button>
      
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Event Check-in QR Code</DialogTitle>
            <DialogDescription>
              Scan this code at the event entrance for quick check-in
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <div className="bg-white p-4 rounded-md shadow-md">
              <QRCodeSVG 
                value={JSON.stringify(checkInData)} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="mt-4 text-center text-sm">
              This QR code is unique to your registration for <strong>{event.title}</strong>.
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Code: {checkInData.code}
            </p>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            <Button onClick={handleCopyLink} variant="outline">
              Copy Link
            </Button>
            <Button onClick={() => setShowQRCode(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
