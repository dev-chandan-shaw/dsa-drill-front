export interface IUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  token: string; // Optional token for authentication
  profilePictureUrl?: string; // Optional profile picture URL
  lastVisitDate?: string; // Optional last visit date
  streakCount?: number; // Optional daily streak count
  // Add other user properties as needed
}

export interface IRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface IStreakUpdateResponse {
  user: IUser; // The updated user object
  streakUpdated: boolean;
}
