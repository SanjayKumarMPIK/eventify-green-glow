
export type UserRole = "student" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
}

export interface TeamMember {
  name: string;
  email: string;
  department: string;
  roll_number?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  teamName: string;
  teamMembers: TeamMember[];
  registrationDate: Date;
  attended?: boolean;
  certificate_generated?: boolean;
  od_letter_generated?: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  totalSlots: number;
  availableSlots: number;
  creatorId: string;
  registrations: Registration[];
  imageUrl?: string;
}

export interface Feedback {
  id: string;
  eventId: string;
  userId: string;
  overallRating: number;
  wasInformative: boolean;
  organizationRating: string;
  additionalComments?: string;
}

// Achievement types
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

// Reaction types
export type ReactionType = "👍" | "👏" | "❤️" | "🔥" | "🎉" | "🤔";

export interface Reaction {
  type: ReactionType;
  count: number;
  users: string[];
}
