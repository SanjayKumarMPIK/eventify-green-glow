
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  requiredEvents?: number;
  requiredFeedback?: number;
  category: 'attendance' | 'feedback' | 'organization' | 'participation';
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  earnedAt: Date;
}

export interface UserPoints {
  userId: string;
  totalPoints: number;
  level: number;
}
