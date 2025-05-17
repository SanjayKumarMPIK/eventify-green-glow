
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AchievementBadge } from "./AchievementBadge";
import { Achievement, UserAchievement, UserPoints } from "@/types/achievement";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Sample achievements data
const availableAchievements: Achievement[] = [
  {
    id: "first-event",
    name: "First Steps",
    description: "Attend your first event",
    icon: "first-event",
    points: 50,
    requiredEvents: 1,
    category: "attendance"
  },
  {
    id: "feedback-king",
    name: "Feedback Champion",
    description: "Submit feedback for 3 events",
    icon: "feedback-king",
    points: 100,
    requiredFeedback: 3,
    category: "feedback"
  },
  {
    id: "event-master",
    name: "Event Master",
    description: "Attend 5 different events",
    icon: "event-master",
    points: 200,
    requiredEvents: 5,
    category: "attendance"
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Register with a team of 3 or more",
    icon: "social-butterfly",
    points: 75,
    category: "participation"
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Register for an event at least 1 week before it happens",
    icon: "early-bird",
    points: 50,
    category: "participation"
  },
  {
    id: "organizer",
    name: "Event Organizer",
    description: "Create and manage an event (admin only)",
    icon: "organizer",
    points: 300,
    category: "organization"
  }
];

export function UserAchievements() {
  const { user } = useAuth();
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserAchievements = async () => {
      setLoading(true);
      try {
        // In a real implementation, this would fetch from the database
        // For now, we'll simulate achievements based on event count

        // Get count of user's registered events
        const { data: registrations, error: regError } = await supabase
          .from('registrations')
          .select('*')
          .eq('user_id', user.id);

        if (regError) throw regError;

        const eventCount = registrations?.length || 0;

        // Get count of user's feedback submissions
        const { data: feedback, error: feedbackError } = await supabase
          .from('event_feedback')
          .select('*')
          .eq('user_id', user.id);

        if (feedbackError) throw feedbackError;

        const feedbackCount = feedback?.length || 0;

        // Check for team registrations with 3+ members
        const { data: teamRegs, error: teamError } = await supabase
          .from('registrations')
          .select('id, team_members(id)')
          .eq('user_id', user.id);

        if (teamError) throw teamError;

        const hasLargeTeam = teamRegs?.some(reg => 
          reg.team_members && reg.team_members.length >= 3
        ) || false;

        // Simulate earned achievements based on user activity
        const earnedAchievements: UserAchievement[] = [];
        let totalPoints = 0;

        // First event achievement
        if (eventCount >= 1) {
          earnedAchievements.push({
            userId: user.id,
            achievementId: "first-event",
            earnedAt: new Date()
          });
          totalPoints += 50;
        }

        // Feedback champion
        if (feedbackCount >= 3) {
          earnedAchievements.push({
            userId: user.id,
            achievementId: "feedback-king",
            earnedAt: new Date()
          });
          totalPoints += 100;
        }

        // Event master
        if (eventCount >= 5) {
          earnedAchievements.push({
            userId: user.id,
            achievementId: "event-master",
            earnedAt: new Date()
          });
          totalPoints += 200;
        }

        // Social butterfly
        if (hasLargeTeam) {
          earnedAchievements.push({
            userId: user.id,
            achievementId: "social-butterfly",
            earnedAt: new Date()
          });
          totalPoints += 75;
        }

        // If user is admin, add organizer achievement
        if (user.role === 'admin') {
          earnedAchievements.push({
            userId: user.id,
            achievementId: "organizer",
            earnedAt: new Date()
          });
          totalPoints += 300;
        }

        setUserAchievements(earnedAchievements);
        
        // Calculate level based on points
        const level = Math.floor(totalPoints / 100) + 1;
        setUserPoints({
          userId: user.id,
          totalPoints,
          level
        });

        // If user earns a new achievement, show a toast
        const prevAchievementCount = localStorage.getItem(`achievement-count-${user.id}`);
        if (prevAchievementCount && parseInt(prevAchievementCount) < earnedAchievements.length) {
          toast.success("You've earned a new achievement! 🎉");
        }
        localStorage.setItem(`achievement-count-${user.id}`, earnedAchievements.length.toString());

      } catch (error) {
        console.error("Error fetching user achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAchievements();
  }, [user]);

  if (loading) {
    return <AchievementsLoading />;
  }

  const nextLevelPoints = userPoints ? (userPoints.level * 100) : 100;
  const previousLevelPoints = userPoints ? ((userPoints.level - 1) * 100) : 0;
  const levelProgress = userPoints ? 
    Math.floor(((userPoints.totalPoints - previousLevelPoints) / (nextLevelPoints - previousLevelPoints)) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Your Achievements</span>
          {userPoints && (
            <Badge variant="secondary" className="ml-2">
              Level {userPoints.level}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Collect badges and earn points by participating in events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {userPoints && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Level {userPoints.level}</span>
              <span>{userPoints.totalPoints} / {nextLevelPoints} points</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableAchievements.map(achievement => (
            <AchievementBadge 
              key={achievement.id}
              achievement={achievement}
              earned={userAchievements.some(ua => ua.achievementId === achievement.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementsLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-10 w-full rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Badge component for backward compatibility
function Badge({ children, variant, className }: { 
  children: React.ReactNode; 
  variant?: "default" | "secondary" | "outline"; 
  className?: string 
}) {
  return (
    <span 
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors
        ${variant === 'secondary' ? 'bg-secondary text-secondary-foreground' : ''}
        ${variant === 'outline' ? 'border border-input bg-background' : ''}
        ${variant === 'default' ? 'bg-primary text-primary-foreground' : ''}
        ${className}`}
    >
      {children}
    </span>
  );
}
