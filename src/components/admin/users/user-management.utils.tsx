"use client";

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
import type { SortingState } from "@tanstack/react-table";

import {
  ROLE_OPTIONS,
  STAFF_ROLE_VALUES,
  type UserListPreset,
  type UserProvider,
  type UserRow,
  type UserSortColumn,
  type UserStatus,
} from "./user-management.types";

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

const statusPriority: Record<UserStatus, number> = {
  Banned: 0,
  Muted: 1,
  Normal: 2,
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
  switch (String(rawStatus || "").toLowerCase()) {
    case "ban":
    case "banned":
      return "Banned";
    case "mute":
    case "muted":
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

export function isStaffRole(role: string) {
  return STAFF_ROLE_VALUES.includes(role as (typeof STAFF_ROLE_VALUES)[number]);
}

export function matchesUserPreset(user: UserRow, preset: UserListPreset) {
  switch (preset) {
    case "staff":
      return isStaffRole(user.role);
    case "new-7d": {
      if (!user.joinDate) return false;
      const joinedAt = new Date(user.joinDate).getTime();
      if (Number.isNaN(joinedAt)) return false;
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return now - joinedAt <= sevenDays;
    }
    case "all":
    default:
      return true;
  }
}

export function getProviderMeta(provider: UserProvider) {
  switch (provider) {
    case "google":
      return {
        label: "Google",
        className: "border-blue-200 bg-blue-50 text-blue-700",
      };
    case "local":
      return {
        label: "Local",
        className: "border-slate-200 bg-slate-50 text-slate-700",
      };
    default:
      return {
        label: "Unknown provider",
        className: "border-slate-200 bg-slate-50 text-slate-600",
      };
  }
}

export function getVerificationMeta(isVerified: boolean) {
  return isVerified
    ? {
        label: "Email verified",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      }
    : {
        label: "Email not verified",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
}

export function getRiskMeta(reportCount?: number | null) {
  if (reportCount == null) {
    return {
      label: "Risk unavailable",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (reportCount >= 5) {
    return {
      label: "High risk",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (reportCount > 0) {
    return {
      label: "Needs review",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "No risk signals",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export function formatMetricValue(value?: number | null) {
  return value == null ? "No data" : String(value);
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

function compareStrings(a?: string | null, b?: string | null) {
  return String(a || "").localeCompare(String(b || ""));
}

function compareDates(a?: string | null, b?: string | null) {
  const first = a ? new Date(a).getTime() : 0;
  const second = b ? new Date(b).getTime() : 0;
  return first - second;
}

export function sortUsers(users: UserRow[], sorting: SortingState) {
  const activeSort = sorting[0];
  if (!activeSort) return users;

  const sorted = [...users];
  const { id, desc } = activeSort;

  sorted.sort((a, b) => {
    let result = 0;

    switch (id as UserSortColumn) {
      case "name":
        result = compareStrings(a.name, b.name);
        break;
      case "email":
        result = compareStrings(a.email, b.email);
        break;
      case "role":
        result = (rolePriority[a.role] ?? 999) - (rolePriority[b.role] ?? 999);
        break;
      case "status":
        result =
          (statusPriority[a.status] ?? 999) - (statusPriority[b.status] ?? 999);
        break;
      case "joinDate":
        result = compareDates(a.joinDate, b.joinDate);
        break;
      case "lastActivityAt":
        result = compareDates(a.lastActivityAt, b.lastActivityAt);
        break;
      default:
        result = 0;
        break;
    }

    return desc ? -result : result;
  });

  return sorted;
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
