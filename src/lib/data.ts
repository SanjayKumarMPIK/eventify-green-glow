
import { Event, Registration, User } from "@/types";

// Admin code
export const ADMIN_CODE = "ADMIN123";

// Mock Users
export const USERS: User[] = [
  {
    id: "1",
    email: "admin.123456@cse.ritchennai.edu.in",
    name: "Admin User",
    role: "admin",
  },
  {
    id: "2",
    email: "student.123456@cse.ritchennai.edu.in",
    name: "Student User",
    role: "student",
    department: "Computer Science",
  },
];

// Mock Events
export const EVENTS: Event[] = [
  {
    id: "1",
    title: "Hackathon 2025",
    description: "A 24-hour coding competition to build innovative solutions.",
    date: new Date("2025-05-15"),
    location: "Main Auditorium",
    totalSlots: 50,
    availableSlots: 35,
    creatorId: "1",
    registrations: [],
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  },
  {
    id: "2",
    title: "Tech Talk Series",
    description: "Industry experts sharing insights on emerging technologies.",
    date: new Date("2025-06-10"),
    location: "Seminar Hall",
    totalSlots: 100,
    availableSlots: 75,
    creatorId: "1",
    registrations: [],
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  },
  {
    id: "3",
    title: "Design Challenge",
    description: "Show off your UX/UI skills in this design competition.",
    date: new Date("2025-07-05"),
    location: "Design Lab",
    totalSlots: 30,
    availableSlots: 20,
    creatorId: "1",
    registrations: [],
    imageUrl: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80",
  },
];

// Mock Registrations
export const REGISTRATIONS: Registration[] = [
  {
    id: "1",
    eventId: "1",
    userId: "2",
    teamName: "Code Wizards",
    teamMembers: [
      {
        name: "Student User",
        email: "student.123456@cse.ritchennai.edu.in",
        department: "Computer Science",
      },
      {
        name: "Team Member 2",
        email: "member2.123456@ece.ritchennai.edu.in",
        department: "Electronics",
      },
    ],
    registrationDate: new Date("2025-05-01"),
  },
];

// Update events with registrations
EVENTS[0].registrations = [REGISTRATIONS[0]];
EVENTS[0].availableSlots = EVENTS[0].totalSlots - EVENTS[0].registrations.length;

// Helper Functions
export const getUser = (email: string, password: string) => {
  // In a real app, you'd check the password against a hashed version in the database
  return USERS.find((user) => user.email === email);
};

export const validateEmail = (email: string) => {
  const regex = /^[a-zA-Z]+\.[0-9]{6}@[a-zA-Z]+\.ritchennai\.edu\.in$/;
  return regex.test(email);
};
