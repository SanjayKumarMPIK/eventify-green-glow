
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
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  teamName: string;
  teamMembers: TeamMember[];
  registrationDate: Date;
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
