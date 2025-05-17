
import { EventCard } from "./EventCard";
import { QRCheckIn } from "./QRCheckIn";
import { EventReactions } from "./EventReactions";
import { Event } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface EnhancedEventCardProps {
  event: Event;
  isAdmin?: boolean;
  isRegistered?: boolean;
  onRegister?: (eventId: string) => void;
  onEdit?: (eventId: string) => void;
  onDelete?: (eventId: string) => void;
  onViewRegistrations?: (eventId: string) => void;
  onIncrementSlots?: (eventId: string) => void;
}

export function EnhancedEventCard({
  event,
  isAdmin = false,
  isRegistered = false,
  onRegister,
  onEdit,
  onDelete,
  onViewRegistrations,
  onIncrementSlots
}: EnhancedEventCardProps) {
  return (
    <div className="space-y-3">
      <EventCard
        event={event}
        isAdmin={isAdmin}
        isRegistered={isRegistered}
        onRegister={onRegister}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewRegistrations={onViewRegistrations}
        onIncrementSlots={onIncrementSlots}
      />
      
      {isRegistered && (
        <div className="space-y-3">
          <QRCheckIn event={event} />
          <EventReactions eventId={event.id} />
        </div>
      )}
    </div>
  );
}
