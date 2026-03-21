import {
  Ban,
  CheckCircle2,
  Crown,
  Edit,
  Shield,
  User,
  VolumeX,
} from "lucide-react";
import type { ReactNode } from "react";

import { ROLE_OPTIONS, type UserStatus } from "./user-management.types";

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((role) => [role.value, role.label])
);

export const rolePriority: Record<string, number> = {
  admin: 0,
  financial_manager: 1,
  community_manager: 2,
  content_moderator: 3,
  author: 4,
  user: 5,
};

export function formatRoleLabel(role: string) {
  return ROLE_LABEL[role] ?? role;
}

export function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function toUiStatus(rawStatus: string): UserStatus {
  switch (rawStatus) {
    case "ban":
      return "Banned";
    case "mute":
      return "Muted";
    case "normal":
    default:
      return "Normal";
  }
}

export function toBackendStatus(status: UserStatus) {
  switch (status) {
    case "Banned":
      return "ban";
    case "Muted":
      return "mute";
    case "Normal":
    default:
      return "normal";
  }
}

export function getRoleColor(role: string) {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800 border-red-200";
    case "author":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "content_moderator":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "financial_manager":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "community_manager":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export function getStatusColor(status: UserStatus) {
  switch (status) {
    case "Normal":
      return "bg-green-100 text-green-800 border-green-200";
    case "Banned":
      return "bg-red-100 text-red-800 border-red-200";
    case "Muted":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export function getStatusRowTone(status: UserStatus) {
  switch (status) {
    case "Banned":
      return "bg-red-50/40";
    case "Muted":
      return "bg-yellow-50/40";
    default:
      return "";
  }
}

export function getRoleAccentHover(role: string) {
  switch (role) {
    case "admin":
      return "hover:border-l-red-500";
    case "author":
      return "hover:border-l-blue-500";
    case "content_moderator":
      return "hover:border-l-purple-500";
    case "financial_manager":
      return "hover:border-l-emerald-500";
    case "community_manager":
      return "hover:border-l-amber-500";
    default:
      return "hover:border-l-slate-400";
  }
}

export function getRoleIcon(role: string): ReactNode {
  switch (role) {
    case "admin":
      return <Crown className="h-3.5 w-3.5" />;
    case "author":
      return <Edit className="h-3.5 w-3.5" />;
    case "content_moderator":
    case "financial_manager":
    case "community_manager":
      return <Shield className="h-3.5 w-3.5" />;
    default:
      return <User className="h-3.5 w-3.5" />;
  }
}

export function getStatusIcon(status: UserStatus): ReactNode {
  switch (status) {
    case "Normal":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "Muted":
      return <VolumeX className="h-3.5 w-3.5" />;
    case "Banned":
      return <Ban className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export function logAxiosError(
  tag: string,
  endpoint: string,
  err: any,
  extra?: unknown
) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message = err?.message;

  console.group(`${tag} ERROR`);
  console.log("url:", endpoint);
  console.log("status:", status);
  console.log("data:", data);
  console.log("message:", message);

  if (!err?.response) {
    console.log("No response object. Possible network/CORS/server issue.");
    console.log("request:", err?.request);
  }

  if (extra) {
    console.log("extra:", extra);
  }

  console.groupEnd();
}