export const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "author", label: "Author" },
  { value: "content_moderator", label: "Content Moderator" },
  { value: "community_manager", label: "Community Manager" },
  { value: "financial_manager", label: "Financial Manager" },
  { value: "admin", label: "Admin" },
] as const;

export const STAFF_ROLE_VALUES = [
  "admin",
  "content_moderator",
  "community_manager",
  "financial_manager",
] as const;

export const USER_PRESET_OPTIONS = [
  { value: "all", label: "All" },
  { value: "staff", label: "Staff" },
  { value: "new-7d", label: "New this week" },
] as const;

export type UserStatus = "Normal" | "Muted" | "Banned";
export type UserProvider = "google" | "local" | "unknown";
export type UserListPreset =
  | "all"
  | "staff"
  | "new-7d";

export type UserSortColumn =
  | "name"
  | "email"
  | "role"
  | "status"
  | "joinDate"
  | "lastActivityAt";

export type ModerationHistoryItem = {
  id: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  reason?: string;
  createdAt?: string;
  statusAfter?: string;
};

export type UserManagementSummary = {
  totalUsers: number;
  authors: number;
  staffUsers: number;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  joinDate: string;
  avatar?: string | null;

  provider: UserProvider;
  isEmailVerified: boolean;
  lastLoginAt?: string | null;
  lastActivityAt?: string | null;

  reportCount?: number | null;
  storyCount?: number | null;
  chapterCount?: number | null;

  lastModerationAction?: string;
  lastModerationReason?: string;
  moderationHistory: ModerationHistoryItem[];
};

export type ConfirmActionType =
  | "change-role"
  | "change-staff-status"
  | "reset-user-author"
  | "ban-user-author"
  | "mute-user-author";
