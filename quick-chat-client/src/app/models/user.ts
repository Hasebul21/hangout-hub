export interface User {
  id: number;
  userName: string;
  email?: string;
  professionalTitle: string | null;
  location: string | null;
  bio: string | null;
  portfolio: string | null;
  skills: string | null;
  hobbies: string | null;
  instagram: string | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}
