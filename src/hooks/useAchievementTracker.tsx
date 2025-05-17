
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function useAchievementTracker(action: 'event_view' | 'event_register' | 'feedback_submit' | 'certificate_generate') {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Track user activity
    const trackActivity = () => {
      // Get existing activity or initialize
      const userActivity = JSON.parse(localStorage.getItem(`user-activity-${user.id}`) || '{}');
      
      // Update counts
      if (!userActivity[action]) {
        userActivity[action] = 0;
      }
      userActivity[action]++;
      
      // Store updated activity
      localStorage.setItem(`user-activity-${user.id}`, JSON.stringify(userActivity));
      
      // Check for achievement triggers
      checkForAchievements(userActivity);
    };

    const checkForAchievements = (activity: Record<string, number>) => {
      // Get existing user achievements
      const achievementRecord = JSON.parse(localStorage.getItem(`user-achievements-${user.id}`) || '[]');
      const existingAchievements = new Set(achievementRecord.map((a: any) => a.id));
      const newAchievements = [];
      
      // Check event view milestones
      if (action === 'event_view' && activity['event_view'] >= 10 && !existingAchievements.has('explorer')) {
        newAchievements.push({
          id: 'explorer',
          name: 'Event Explorer',
          earnedAt: new Date().toISOString()
        });
      }
      
      // Check event registration milestones
      if (action === 'event_register') {
        if (activity['event_register'] >= 1 && !existingAchievements.has('first_registration')) {
          newAchievements.push({
            id: 'first_registration',
            name: 'First Steps',
            earnedAt: new Date().toISOString()
          });
        }
        
        if (activity['event_register'] >= 5 && !existingAchievements.has('regular_attendee')) {
          newAchievements.push({
            id: 'regular_attendee',
            name: 'Regular Attendee',
            earnedAt: new Date().toISOString()
          });
        }
      }
      
      // Check feedback submission milestones
      if (action === 'feedback_submit' && activity['feedback_submit'] >= 3 && !existingAchievements.has('feedback_champion')) {
        newAchievements.push({
          id: 'feedback_champion',
          name: 'Feedback Champion',
          earnedAt: new Date().toISOString()
        });
      }
      
      // If new achievements were earned, update storage and notify
      if (newAchievements.length > 0) {
        const updatedAchievements = [...achievementRecord, ...newAchievements];
        localStorage.setItem(`user-achievements-${user.id}`, JSON.stringify(updatedAchievements));
        
        // Notify about new achievements
        newAchievements.forEach(achievement => {
          toast.success(`Achievement Unlocked: ${achievement.name} 🏆`, {
            duration: 4000,
            id: `achievement-${achievement.id}`
          });
        });
      }
    };

    trackActivity();
  }, [user, action]);
}
