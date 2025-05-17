
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Achievement } from "@/types/achievement";

interface AchievementBadgeProps {
  achievement: Achievement;
  earned?: boolean;
  showDetails?: boolean;
}

export function AchievementBadge({ achievement, earned = false, showDetails = true }: AchievementBadgeProps) {
  const iconMap: Record<string, string> = {
    "first-event": "🏆",
    "feedback-king": "💬",
    "event-master": "🎯",
    "social-butterfly": "🦋",
    "early-bird": "🐦",
    "organizer": "📋",
    "speaker": "🎤",
    "team-player": "👥",
    "influencer": "⭐"
  };

  const icon = iconMap[achievement.icon] || "🎖️";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${earned ? 'opacity-100' : 'opacity-40'} transition-all hover:scale-105`}>
            <Badge 
              variant={earned ? "default" : "outline"} 
              className={`text-lg py-1 px-3 ${earned ? 'bg-gradient-to-r from-amber-400 to-yellow-600' : ''} shadow-sm`}
            >
              <span className="mr-2 text-xl">{icon}</span>
              {showDetails ? achievement.name : icon}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-bold">{achievement.name} ({achievement.points} points)</p>
            <p>{achievement.description}</p>
            {!earned && <p className="text-sm text-muted-foreground">Not yet earned</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
