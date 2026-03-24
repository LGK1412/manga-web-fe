export const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "author", label: "Author" },
  { value: "content_moderator", label: "Content Moderator" },
  { value: "community_manager", label: "Community Manager" },
  { value: "financial_manager", label: "Financial Manager" },
  { value: "admin", label: "Admin" },
] as const;

export type UserStatus = "Normal" | "Muted" | "Banned";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  joinDate: string;
  avatar: string;
};

export type ConfirmActionType =
  | "change-role"
  | "change-staff-status"
  | "reset-user-author"
  | "ban-user-author"
  | "mute-user-author";