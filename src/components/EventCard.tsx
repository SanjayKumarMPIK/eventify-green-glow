
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Event } from "@/types";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";

interface EventCardProps {
  event: Event;
  isAdmin?: boolean;
  onRegister?: (eventId: string) => void;
  onEdit?: (eventId: string) => void;
  onDelete?: (eventId: string) => void;
  onViewRegistrations?: (eventId: string) => void;
  onIncrementSlots?: (eventId: string) => void;
}

export function EventCard({
  event,
  isAdmin = false,
  onRegister,
  onEdit,
  onDelete,
  onViewRegistrations,
  onIncrementSlots,
}: EventCardProps) {
  const formatDate = (date: Date | string) => {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card className="overflow-hidden">
      {event.imageUrl && (
        <div className="h-48 overflow-hidden">
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{event.title}</CardTitle>
        <CardDescription>{event.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPinIcon className="mr-2 h-4 w-4" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <UsersIcon className="mr-2 h-4 w-4" />
          <span>
            {event.availableSlots} slots available of {event.totalSlots}
          </span>
        </div>
      </CardContent>
      <CardFooter className={`${isAdmin ? "grid grid-cols-2 gap-2" : ""}`}>
        {isAdmin ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit && onEdit(event.id)}
            >
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete && onDelete(event.id)}
            >
              Delete
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewRegistrations && onViewRegistrations(event.id)}
            >
              View Registrations
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onIncrementSlots && onIncrementSlots(event.id)}
            >
              Add Slots
            </Button>
          </>
        ) : (
          <Button 
            onClick={() => onRegister && onRegister(event.id)}
            disabled={event.availableSlots <= 0}
            className="w-full"
          >
            {event.availableSlots <= 0 ? "No Slots Available" : "Register Now"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
