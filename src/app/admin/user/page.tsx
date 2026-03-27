"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  FilterX,
  Loader2,
  RotateCcw,
  RefreshCw,
  Search,
  TriangleAlert,
  Users,
  UserX,
  VolumeX,
} from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import AdminLayout from "../adminLayout/page";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { EditUserDialog } from "@/components/admin/users/edit-user-dialog";
import { UserManagementFilters } from "@/components/admin/users/user-management-filters";
import { UserManagementPagination } from "@/components/admin/users/user-management-pagination";
import { UserManagementStats } from "@/components/admin/users/user-management-stats";
import { UserManagementTable } from "@/components/admin/users/user-management-table";
import {
  type ConfirmActionType,
  type ModerationHistoryItem,
  type UserListPreset,
  type UserManagementSummary,
  type UserProvider,
  type UserRow,
  type UserStatus,
} from "@/components/admin/users/user-management.types";
import {
  formatRoleLabel,
  logAxiosError,
  toBackendStatus,
  toUiStatus,
} from "@/components/admin/users/user-management.utils";

const DEFAULT_PAGE_SIZE = 20;

const PRESET_LABEL: Record<UserListPreset, string> = {
  all: "All",
  staff: "Staff",
  "new-7d": "New this week",
};

const WORKSPACE_COPY: Record<
  string,
  {
    description: string;
    focus: string;
  }
> = {
  admin: {
    description:
      "Cross-team workspace for account access, recent activity, and moderation controls.",
    focus:
      "Admin can change roles, manage staff status, and reset moderated User/Author accounts.",
  },
  content_moderator: {
    description:
      "Content moderation workspace for reviewing account context before banning User/Author accounts.",
    focus:
      "Ban controls are enabled only for User/Author accounts that are currently Normal.",
  },
  community_manager: {
    description:
      "Community moderation workspace for reviewing account context before muting User/Author accounts.",
    focus:
      "Mute controls are enabled only for User/Author accounts that are currently Normal.",
  },
  default: {
    description:
      "Staff workspace for reviewing user accounts, access state, and moderation context.",
    focus: "Only actions allowed for your role are enabled.",
  },
};

const EMPTY_SUMMARY: UserManagementSummary = {
  totalUsers: 0,
  authors: 0,
  staffUsers: 0,
};

type BulkActionType =
  | "bulk-reset-user-author"
  | "bulk-ban-user-author"
  | "bulk-mute-user-author";

const DEFAULT_SORTING: SortingState = [{ id: "role", desc: false }];

function parsePageNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePageSize(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  if (![20, 50, 100].includes(parsed)) return fallback;
  return parsed;
}

function parsePreset(value: string | null): UserListPreset {
  if (value === "staff" || value === "new-7d") return value;
  return "all";
}

function parseStatus(value: string | null): "all" | UserStatus {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "normal":
      return "Normal";
    case "muted":
    case "mute":
      return "Muted";
    case "banned":
    case "ban":
      return "Banned";
    default:
      return "all";
  }
}

function parseRole(value: string | null) {
  const normalized = String(value || "").trim();
  const validRoles = new Set([
    "all",
    "user",
    "author",
    "content_moderator",
    "community_manager",
    "financial_manager",
    "admin",
  ]);

  return validRoles.has(normalized) ? normalized : "all";
}

function parseSorting(
  sortBy: string | null,
  sortDir: string | null
): SortingState {
  const validSorts = new Set([
    "name",
    "email",
    "role",
    "status",
    "joinDate",
    "lastActivityAt",
  ]);

  if (!sortBy || !validSorts.has(sortBy)) {
    return DEFAULT_SORTING;
  }

  return [
    {
      id: sortBy,
      desc: sortDir === "desc",
    },
  ];
}

function isSameSorting(a: SortingState, b: SortingState) {
  const first = a[0];
  const second = b[0];

  return first?.id === second?.id && Boolean(first?.desc) === Boolean(second?.desc);
}

function isTargetUserOrAuthor(user: UserRow) {
  return user.role === "user" || user.role === "author";
}

function canBulkSelectUser(user: UserRow, actorRole: string) {
  if (!isTargetUserOrAuthor(user)) return false;

  switch (actorRole) {
    case "admin":
      return user.status !== "Normal";
    case "content_moderator":
    case "community_manager":
      return user.status === "Normal";
    default:
      return false;
  }
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeMetricValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(value)) return value.length;
  return null;
}

function resolveAvatarUrl(rawUser: any, apiUrl?: string) {
  const rawAvatar = firstNonEmptyString(
    rawUser?.avatar,
    rawUser?.avatarUrl,
    rawUser?.photoURL,
    rawUser?.photoUrl,
    rawUser?.picture,
    rawUser?.image,
    rawUser?.profileImage,
    rawUser?.profile_image
  );

  if (!rawAvatar) return undefined;
  if (isAbsoluteUrl(rawAvatar)) return rawAvatar;

  const normalized = rawAvatar.startsWith("/") ? rawAvatar : `/${rawAvatar}`;

  if (normalized.startsWith("/uploads/")) {
    return apiUrl ? `${apiUrl}${normalized}` : normalized;
  }

  return apiUrl ? `${apiUrl}/uploads${normalized}` : normalized;
}

function resolveProvider(rawUser: any): UserProvider {
  const provider = String(
    rawUser?.provider ??
      rawUser?.authProvider ??
      rawUser?.loginProvider ??
      rawUser?.accountProvider ??
      ""
  )
    .trim()
    .toLowerCase();

  if (provider === "google") return "google";
  if (provider === "local" || provider === "email" || provider === "password") {
    return "local";
  }

  if (rawUser?.googleId || rawUser?.google_id) return "google";

  return "unknown";
}

function resolveVerification(rawUser: any) {
  const value =
    rawUser?.isEmailVerified ??
    rawUser?.emailVerified ??
    rawUser?.isVerified ??
    rawUser?.verified ??
    rawUser?.email_verified;

  return Boolean(value);
}

function resolveDate(rawUser: any, ...keys: string[]) {
  for (const key of keys) {
    const value = rawUser?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function resolveLastLogin(rawUser: any) {
  return resolveDate(rawUser, "lastLoginAt", "lastLogin", "last_logged_in");
}

function resolveLastActivity(rawUser: any) {
  return resolveDate(rawUser, "lastActivityAt", "lastSeenAt", "updatedAt");
}

function resolveModerationHistory(rawUser: any): ModerationHistoryItem[] {
  const rawHistory =
    rawUser?.moderationHistory ??
    rawUser?.moderation_history ??
    rawUser?.statusHistory ??
    rawUser?.status_history ??
    rawUser?.history ??
    [];

  if (!Array.isArray(rawHistory)) return [];

  return rawHistory.map((item: any, index: number) => ({
    id: String(
      item?._id ??
        item?.id ??
        `${rawUser?._id ?? rawUser?.id ?? "user"}-moderation-${index}`
    ),
    action: String(
      item?.action ??
        item?.type ??
        item?.event ??
        item?.statusAfter ??
        item?.status ??
        "updated"
    ),
    actorName: firstNonEmptyString(
      item?.actorName,
      item?.actor_name,
      item?.actor_id?.username,
      item?.updatedByName,
      item?.moderatedByName
    ),
    actorRole: firstNonEmptyString(
      item?.actorRole,
      item?.actor_role,
      item?.actor_id?.role,
      item?.updatedByRole,
      item?.moderatedByRole
    ),
    reason: firstNonEmptyString(
      item?.reason,
      item?.note,
      item?.adminNote,
      item?.summary,
      item?.description,
      item?.comment
    ),
    createdAt: firstNonEmptyString(
      item?.createdAt,
      item?.updatedAt,
      item?.timestamp,
      item?.date
    ),
    statusAfter: firstNonEmptyString(
      item?.statusAfter,
      item?.status_after,
      item?.after?.status,
      item?.status
    ),
  }));
}

function buildModerationPatch(
  currentUser: UserRow,
  action: string,
  status: UserStatus,
  reason: string,
  actorRole: string
): Partial<UserRow> {
  const historyItem: ModerationHistoryItem = {
    id: `${currentUser.id}-${Date.now()}`,
    action,
    actorRole: actorRole || undefined,
    reason: reason.trim() || undefined,
    createdAt: new Date().toISOString(),
    statusAfter: status,
  };

  return {
    status,
    lastModerationAction: action,
    lastModerationReason: reason.trim() || currentUser.lastModerationReason,
    moderationHistory: [historyItem, ...(currentUser.moderationHistory || [])],
  };
}

function extractUserList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function mapUserRow(rawUser: any, apiUrl?: string): UserRow {
  const moderationHistory = resolveModerationHistory(rawUser);
  const latestModeration = moderationHistory[0];
  const lastLoginAt = resolveLastLogin(rawUser);
  const lastActivityAt = resolveLastActivity(rawUser) || lastLoginAt;

  return {
    id: String(rawUser?._id ?? rawUser?.id ?? crypto.randomUUID()),
    name: firstNonEmptyString(
      rawUser?.username,
      rawUser?.name,
      rawUser?.displayName,
      rawUser?.fullName,
      "Unknown user"
    ),
    email: firstNonEmptyString(rawUser?.email, rawUser?.mail),
    role: firstNonEmptyString(rawUser?.role, "user"),
    status: toUiStatus(
      firstNonEmptyString(
        rawUser?.status,
        rawUser?.accountStatus,
        rawUser?.userStatus,
        "normal"
      )
    ),
    joinDate: resolveDate(
      rawUser,
      "createdAt",
      "joinDate",
      "joinedAt",
      "registeredAt",
      "created_at"
    ),
    avatar: resolveAvatarUrl(rawUser, apiUrl),
    provider: resolveProvider(rawUser),
    isEmailVerified: resolveVerification(rawUser),
    lastLoginAt,
    lastActivityAt,
    reportCount: normalizeMetricValue(rawUser?.reportCount),
    storyCount: normalizeMetricValue(rawUser?.storyCount),
    chapterCount: normalizeMetricValue(rawUser?.chapterCount),
    lastModerationAction: firstNonEmptyString(
      rawUser?.lastModerationAction,
      rawUser?.latestModerationAction,
      latestModeration?.action
    ),
    lastModerationReason: firstNonEmptyString(
      rawUser?.lastModerationReason,
      rawUser?.latestModerationReason,
      latestModeration?.reason
    ),
    moderationHistory,
  };
}

export default function UserManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [summary, setSummary] = useState<UserManagementSummary>(EMPTY_SUMMARY);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actorRole, setActorRole] = useState("");

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("search") ?? "");
  const [filterRole, setFilterRole] = useState(() =>
    parseRole(searchParams.get("role"))
  );
  const [filterStatus, setFilterStatus] = useState<"all" | UserStatus>(() =>
    parseStatus(searchParams.get("status"))
  );
  const [filterPreset, setFilterPreset] = useState<UserListPreset>(() =>
    parsePreset(searchParams.get("preset"))
  );

  const [sorting, setSorting] = useState<SortingState>(() =>
    parseSorting(searchParams.get("sortBy"), searchParams.get("sortDir"))
  );

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [historyLoadingUserId, setHistoryLoadingUserId] = useState<
    string | null
  >(null);

  const [draftRole, setDraftRole] = useState("");
  const [draftStaffStatus, setDraftStaffStatus] =
    useState<UserStatus>("Normal");

  const [resetReason, setResetReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [muteReason, setMuteReason] = useState("");

  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(
    null
  );
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] =
    useState<BulkActionType | null>(null);
  const [bulkReason, setBulkReason] = useState("");
  const [isSubmittingBulkAction, setIsSubmittingBulkAction] = useState(false);

  const [page, setPage] = useState(() =>
    parsePageNumber(searchParams.get("page"), 1)
  );
  const [pageSize, setPageSize] = useState(() =>
    parsePageSize(searchParams.get("limit"), DEFAULT_PAGE_SIZE)
  );
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const searchParamsSnapshot = searchParams.toString();

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const workspaceCopy = WORKSPACE_COPY[actorRole] ?? WORKSPACE_COPY.default;
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterRole("all");
    setFilterStatus("all");
    setFilterPreset("all");
    setSorting(DEFAULT_SORTING);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    clearSelection();
  }, [clearSelection]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsSnapshot);
    const nextSearch = params.get("search") ?? "";
    const nextRole = parseRole(params.get("role"));
    const nextStatus = parseStatus(params.get("status"));
    const nextPreset = parsePreset(params.get("preset"));
    const nextSorting = parseSorting(
      params.get("sortBy"),
      params.get("sortDir")
    );
    const nextPage = parsePageNumber(params.get("page"), 1);
    const nextLimit = parsePageSize(params.get("limit"), DEFAULT_PAGE_SIZE);

    setSearchTerm((current) =>
      current === nextSearch ? current : nextSearch
    );
    setFilterRole((current) => (current === nextRole ? current : nextRole));
    setFilterStatus((current) =>
      current === nextStatus ? current : nextStatus
    );
    setFilterPreset((current) =>
      current === nextPreset ? current : nextPreset
    );
    setSorting((current) =>
      isSameSorting(nextSorting, current) ? current : nextSorting
    );
    setPage((current) => (current === nextPage ? current : nextPage));
    setPageSize((current) => (current === nextLimit ? current : nextLimit));
  }, [searchParamsSnapshot]);

  useEffect(() => {
    const activeSort = sorting[0];
    const params = new URLSearchParams();

    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (filterRole !== "all") params.set("role", filterRole);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPreset !== "all") params.set("preset", filterPreset);

    if (
      activeSort?.id &&
      (activeSort.id !== DEFAULT_SORTING[0]?.id ||
        Boolean(activeSort.desc) !== Boolean(DEFAULT_SORTING[0]?.desc))
    ) {
      params.set("sortBy", String(activeSort.id));
    }
    if (activeSort?.desc) {
      params.set("sortDir", "desc");
    }
    if (page !== 1) params.set("page", String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set("limit", String(pageSize));

    const nextQuery = params.toString();
    const currentQuery = searchParamsSnapshot;

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [
    pathname,
    router,
    searchParamsSnapshot,
    searchTerm,
    filterRole,
    filterStatus,
    filterPreset,
    sorting,
    page,
    pageSize,
  ]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterRole, filterStatus, filterPreset, pageSize, sorting]);

  useEffect(() => {
    clearSelection();
  }, [
    clearSelection,
    searchTerm,
    filterRole,
    filterStatus,
    filterPreset,
    page,
    pageSize,
    sorting,
  ]);

  const isFilterDirty =
    searchTerm.trim().length > 0 ||
    filterRole !== "all" ||
    filterStatus !== "all" ||
    filterPreset !== "all";

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];

    if (searchTerm.trim()) {
      chips.push(`Search: "${searchTerm.trim()}"`);
    }

    if (filterPreset !== "all") {
      chips.push(`Preset: ${PRESET_LABEL[filterPreset]}`);
    }

    if (filterRole !== "all") {
      chips.push(`Role: ${formatRoleLabel(filterRole)}`);
    }

    if (filterStatus !== "all") {
      chips.push(`Status: ${filterStatus}`);
    }

    return chips;
  }, [searchTerm, filterPreset, filterRole, filterStatus]);

  const selectableUsers = useMemo(
    () => users.filter((user) => canBulkSelectUser(user, actorRole)),
    [users, actorRole]
  );

  const selectableIds = useMemo(
    () => new Set(selectableUsers.map((user) => user.id)),
    [selectableUsers]
  );

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedIds.has(user.id)),
    [users, selectedIds]
  );

  const bulkResetCandidates = useMemo(
    () =>
      selectedUsers.filter(
        (user) => isTargetUserOrAuthor(user) && user.status !== "Normal"
      ),
    [selectedUsers]
  );

  const bulkBanCandidates = useMemo(
    () =>
      selectedUsers.filter(
        (user) => isTargetUserOrAuthor(user) && user.status === "Normal"
      ),
    [selectedUsers]
  );

  const bulkMuteCandidates = useMemo(
    () =>
      selectedUsers.filter(
        (user) => isTargetUserOrAuthor(user) && user.status === "Normal"
      ),
    [selectedUsers]
  );

  const allVisibleSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((user) => selectedIds.has(user.id));

  const someVisibleSelected =
    !allVisibleSelected &&
    selectableUsers.some((user) => selectedIds.has(user.id));

  useEffect(() => {
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();

      prev.forEach((id) => {
        if (selectableIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [selectableIds]);

  const toggleSelect = useCallback(
    (userId: string) => {
      if (!selectableIds.has(userId)) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }

        return next;
      });
    },
    [selectableIds]
  );

  const toggleSelectAllVisible = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        selectableUsers.forEach((user) => {
          if (checked) {
            next.add(user.id);
          } else {
            next.delete(user.id);
          }
        });

        return next;
      });
    },
    [selectableUsers]
  );

  const loadActorRole = useCallback(async () => {
    if (!API_URL) {
      return;
    }

    const meEndpoint = `${API_URL}/api/auth/me`;

    try {
      const response = await axios.get(meEndpoint, { withCredentials: true });
      const role = response.data?.role || response.data?.user?.role;
      setActorRole(String(role || ""));
    } catch (error: any) {
      console.warn(
        "[Fetch Me] failed",
        error?.response?.data || error?.message
      );
      setActorRole("");
    }
  }, [API_URL]);

  useEffect(() => {
    void loadActorRole();
  }, [loadActorRole]);

  const loadUsers = useCallback(async () => {
    if (!API_URL) {
      setLoadError("Missing NEXT_PUBLIC_API_URL.");
      setIsLoading(false);
      setUsers([]);
      setSummary(EMPTY_SUMMARY);
      setTotalItems(0);
      setTotalPages(1);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const usersEndpoint = `${API_URL}/api/user/management/list`;
    const activeSort = sorting[0];
    const params = new URLSearchParams();

    if (deferredSearchTerm.trim()) {
      params.set("search", deferredSearchTerm.trim());
    }

    if (filterRole !== "all") {
      params.set("role", filterRole);
    }

    if (filterStatus !== "all") {
      params.set("status", toBackendStatus(filterStatus as UserStatus));
    }

    if (filterPreset !== "all") {
      params.set("preset", filterPreset);
    }

    if (activeSort?.id) {
      params.set("sortBy", String(activeSort.id));
      params.set("sortDir", activeSort.desc ? "desc" : "asc");
    }

    params.set("page", String(page));
    params.set("limit", String(pageSize));

    try {
      const response = await axios.get(`${usersEndpoint}?${params.toString()}`, {
        withCredentials: true,
      });
      const nextTotalPages = Math.max(
        1,
        Number(response.data?.totalPages ?? 1)
      );

      if (page > nextTotalPages) {
        setPage(nextTotalPages);
        return;
      }

      const rawUsers = extractUserList(response.data);
      setUsers(rawUsers.map((user: any) => mapUserRow(user, API_URL)));
      setSummary({
        totalUsers: Number(response.data?.summary?.totalUsers ?? 0),
        authors: Number(response.data?.summary?.authors ?? 0),
        staffUsers: Number(response.data?.summary?.staffUsers ?? 0),
      });
      setTotalItems(Number(response.data?.total ?? 0));
      setTotalPages(nextTotalPages);
    } catch (error: any) {
      logAxiosError("[Fetch Users]", usersEndpoint, error, {
        search: deferredSearchTerm,
        filterRole,
        filterStatus,
        filterPreset,
        page,
        pageSize,
      });
      const message = error?.response?.data?.message ?? error?.message;
      setLoadError(
        Array.isArray(message)
          ? message.join(", ")
          : message ?? "Unable to load users."
      );
      setUsers([]);
      setSummary(EMPTY_SUMMARY);
      setTotalItems(0);
      setTotalPages(1);
      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : message ?? "Unable to load users."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    API_URL,
    deferredSearchTerm,
    filterRole,
    filterStatus,
    filterPreset,
    sorting,
    page,
    pageSize,
  ]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const updateUserState = useCallback(
    (userId: string, patch: Partial<UserRow>) => {
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...patch } : user))
      );

      setSelectedUser((prev) =>
        prev && prev.id === userId ? { ...prev, ...patch } : prev
      );
    },
    []
  );

  const loadModerationHistory = useCallback(
    async (userId: string) => {
      if (!API_URL) return;

      setHistoryLoadingUserId(userId);

      const endpoint = `${API_URL}/api/user/${userId}/moderation-history`;

      try {
        const response = await axios.get(endpoint, { withCredentials: true });
        const rawHistory = extractUserList(response.data);
        const moderationHistory = resolveModerationHistory({
          _id: userId,
          moderationHistory: rawHistory,
        });
        const latestModeration = moderationHistory[0];

        updateUserState(userId, {
          moderationHistory,
          lastModerationAction: latestModeration?.action || undefined,
          lastModerationReason: latestModeration?.reason || undefined,
        });
      } catch (error: any) {
        logAxiosError("[Fetch Moderation History]", endpoint, error, {
          userId,
        });
      } finally {
        setHistoryLoadingUserId((current) =>
          current === userId ? null : current
        );
      }
    },
    [API_URL, updateUserState]
  );

  const resetDialogDrafts = useCallback(() => {
    setResetReason("");
    setBanReason("");
    setMuteReason("");
    setConfirmAction(null);
  }, []);

  const handleOpenEdit = useCallback(
    (user: UserRow) => {
      setSelectedUser(user);
      setDraftRole(user.role);
      setDraftStaffStatus(user.status);
      resetDialogDrafts();
      setIsEditDialogOpen(true);
      void loadModerationHistory(user.id);
    },
    [loadModerationHistory, resetDialogDrafts]
  );

  const handleOpenUser = useCallback(
    (user: UserRow) => {
      handleOpenEdit(user);
    },
    [handleOpenEdit]
  );

  const handleDialogOpenChange = (open: boolean) => {
    if (isSubmittingAction) return;

    setIsEditDialogOpen(open);

    if (!open) {
      setSelectedUser(null);
      setHistoryLoadingUserId(null);
      resetDialogDrafts();
    }
  };

  const handleOpenNotifications = useCallback(
    (user: UserRow) => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      if (!user.email) {
        toast.error("This user does not have an email.");
        return;
      }

      const displayName = user.name || user.email || "User";

      const prefillTitle = `[Account Notice] ${displayName}`;
      const prefillBody = `Hello ${displayName},

This is a notification from the administration team.

[Write your message here]

Best regards,
Manga Platform Team`;

      const params = new URLSearchParams({
        receiverId: user.id,
        receiverEmail: user.email,
        title: prefillTitle,
        body: prefillBody,
      });

      const href = `/admin/notifications/send-general?${params.toString()}`;

      setHighlightId(user.id);

      highlightTimerRef.current = setTimeout(() => {
        router.push(href);
      }, 350);
    },
    [router]
  );

  const requestRoleUpdate = () => {
    if (!selectedUser || draftRole === selectedUser.role) return;

    if (selectedUser.role === "author" && draftRole === "user") {
      toast.error("The current rule does not allow downgrading Author to User.");
      return;
    }

    setConfirmAction("change-role");
  };

  const requestStaffStatusUpdate = () => {
    if (!selectedUser || draftStaffStatus === selectedUser.status) return;
    setConfirmAction("change-staff-status");
  };

  const requestResetToNormal = () => {
    if (!selectedUser || selectedUser.status === "Normal") return;
    setConfirmAction("reset-user-author");
  };

  const requestBanUser = () => {
    if (!selectedUser) return;

    if (!banReason.trim()) {
      toast.error("Please enter a ban reason.");
      return;
    }

    setConfirmAction("ban-user-author");
  };

  const requestMuteUser = () => {
    if (!selectedUser) return;

    if (!muteReason.trim()) {
      toast.error("Please enter a mute reason.");
      return;
    }

    setConfirmAction("mute-user-author");
  };

  const confirmCopy = useMemo(() => {
    if (!selectedUser || !confirmAction) {
      return {
        title: "Confirm action",
        description: "Are you sure you want to continue?",
        actionLabel: "Confirm",
        destructive: false,
      };
    }

    switch (confirmAction) {
      case "change-role":
        return {
          title: "Confirm role change",
          description: `You are about to change ${selectedUser.name} from ${formatRoleLabel(
            selectedUser.role
          )} to ${formatRoleLabel(draftRole)}.`,
          actionLabel: "Change role",
          destructive: true,
        };

      case "change-staff-status":
        return {
          title: "Confirm staff status change",
          description: `You are about to change ${selectedUser.name} from ${selectedUser.status} to ${draftStaffStatus}.`,
          actionLabel: "Update status",
          destructive: true,
        };

      case "reset-user-author":
        return {
          title: "Confirm reset to Normal",
          description: `You are about to restore ${
            selectedUser.name
          } to Normal.${resetReason.trim() ? ` Reason: ${resetReason.trim()}` : ""}`,
          actionLabel: "Reset to Normal",
          destructive: true,
        };

      case "ban-user-author":
        return {
          title: "Confirm ban",
          description: `You are about to ban ${
            selectedUser.name
          }. Reason: ${banReason.trim()}`,
          actionLabel: "Ban user",
          destructive: true,
        };

      case "mute-user-author":
        return {
          title: "Confirm mute",
          description: `You are about to mute ${
            selectedUser.name
          }. Reason: ${muteReason.trim()}`,
          actionLabel: "Mute user",
          destructive: true,
        };

      default:
        return {
          title: "Confirm action",
          description: "Are you sure you want to continue?",
          actionLabel: "Confirm",
          destructive: false,
        };
    }
  }, [
    confirmAction,
    draftRole,
    draftStaffStatus,
    selectedUser,
    resetReason,
    banReason,
    muteReason,
  ]);

  const bulkActionMeta = useMemo(() => {
    switch (actorRole) {
      case "admin":
        return {
          label: "Reset selected",
          helper:
            "Only moderated User/Author accounts on this page can be reset in bulk.",
          actionableCount: bulkResetCandidates.length,
          Icon: RotateCcw,
        };
      case "content_moderator":
        return {
          label: "Ban selected",
          helper:
            "Only Normal User/Author accounts on this page can be banned in bulk.",
          actionableCount: bulkBanCandidates.length,
          Icon: UserX,
        };
      case "community_manager":
        return {
          label: "Mute selected",
          helper:
            "Only Normal User/Author accounts on this page can be muted in bulk.",
          actionableCount: bulkMuteCandidates.length,
          Icon: VolumeX,
        };
      default:
        return null;
    }
  }, [
    actorRole,
    bulkResetCandidates.length,
    bulkBanCandidates.length,
    bulkMuteCandidates.length,
  ]);

  const bulkConfirmCopy = useMemo(() => {
    switch (bulkConfirmAction) {
      case "bulk-reset-user-author":
        return {
          title: "Confirm bulk reset",
          description: `You are about to restore ${bulkResetCandidates.length} selected User/Author account${
            bulkResetCandidates.length === 1 ? "" : "s"
          } to Normal.`,
          actionLabel: "Reset selected",
          reasonLabel: "Reset reason",
          reasonPlaceholder:
            "Optional context for why these accounts are being restored",
          requiresReason: false,
        };
      case "bulk-ban-user-author":
        return {
          title: "Confirm bulk ban",
          description: `You are about to ban ${bulkBanCandidates.length} selected User/Author account${
            bulkBanCandidates.length === 1 ? "" : "s"
          }.`,
          actionLabel: "Ban selected",
          reasonLabel: "Ban reason",
          reasonPlaceholder:
            "Required. This reason will be used in moderation history.",
          requiresReason: true,
        };
      case "bulk-mute-user-author":
        return {
          title: "Confirm bulk mute",
          description: `You are about to mute ${bulkMuteCandidates.length} selected User/Author account${
            bulkMuteCandidates.length === 1 ? "" : "s"
          }.`,
          actionLabel: "Mute selected",
          reasonLabel: "Mute reason",
          reasonPlaceholder:
            "Required. This reason will be used in moderation history.",
          requiresReason: true,
        };
      default:
        return {
          title: "Confirm bulk action",
          description: "Are you sure you want to continue?",
          actionLabel: "Confirm",
          reasonLabel: "Reason",
          reasonPlaceholder: "",
          requiresReason: false,
        };
    }
  }, [
    bulkConfirmAction,
    bulkResetCandidates.length,
    bulkBanCandidates.length,
    bulkMuteCandidates.length,
  ]);

  const requestBulkReset = useCallback(() => {
    if (bulkResetCandidates.length === 0) {
      toast.error("Select at least one moderated User or Author account.");
      return;
    }

    setBulkReason("");
    setBulkConfirmAction("bulk-reset-user-author");
  }, [bulkResetCandidates.length]);

  const requestBulkBan = useCallback(() => {
    if (bulkBanCandidates.length === 0) {
      toast.error("Select at least one Normal User or Author account.");
      return;
    }

    setBulkReason("");
    setBulkConfirmAction("bulk-ban-user-author");
  }, [bulkBanCandidates.length]);

  const requestBulkMute = useCallback(() => {
    if (bulkMuteCandidates.length === 0) {
      toast.error("Select at least one Normal User or Author account.");
      return;
    }

    setBulkReason("");
    setBulkConfirmAction("bulk-mute-user-author");
  }, [bulkMuteCandidates.length]);

  const executeConfirmedAction = async () => {
    if (!selectedUser || !API_URL || !confirmAction) return;

    setIsSubmittingAction(true);
    let shouldRefreshHistory = false;

    try {
      switch (confirmAction) {
        case "change-role": {
          const endpoint = `${API_URL}/api/user/admin/set-role`;
          const payload = { userId: selectedUser.id, role: draftRole };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(selectedUser.id, { role: draftRole });
          shouldRefreshHistory = true;
          toast.success("Role updated successfully.");
          break;
        }

        case "change-staff-status": {
          const endpoint = `${API_URL}/api/user/update-status`;
          const payload = {
            userId: selectedUser.id,
            status: toBackendStatus(draftStaffStatus),
          };

          await axios.post(endpoint, payload, { withCredentials: true });
          updateUserState(selectedUser.id, { status: draftStaffStatus });
          shouldRefreshHistory = true;
          toast.success("Staff status updated successfully.");
          break;
        }

        case "reset-user-author": {
          const endpoint = `${API_URL}/api/user/admin/reset-user-status`;
          const payload = {
            userId: selectedUser.id,
            reason: resetReason.trim() || undefined,
          };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(
            selectedUser.id,
            buildModerationPatch(
              selectedUser,
              "reset_to_normal",
              "Normal",
              resetReason,
              actorRole
            )
          );
          setDraftStaffStatus("Normal");
          setResetReason("");
          shouldRefreshHistory = true;
          toast.success("User restored to Normal.");
          break;
        }

        case "ban-user-author": {
          const endpoint = `${API_URL}/api/user/moderation/ban`;
          const payload = {
            userId: selectedUser.id,
            reason: banReason.trim(),
          };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(
            selectedUser.id,
            buildModerationPatch(
              selectedUser,
              "ban",
              "Banned",
              banReason,
              actorRole
            )
          );
          setDraftStaffStatus("Banned");
          setBanReason("");
          shouldRefreshHistory = true;
          toast.success("User banned successfully.");
          break;
        }

        case "mute-user-author": {
          const endpoint = `${API_URL}/api/user/moderation/mute`;
          const payload = {
            userId: selectedUser.id,
            reason: muteReason.trim(),
          };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(
            selectedUser.id,
            buildModerationPatch(
              selectedUser,
              "mute",
              "Muted",
              muteReason,
              actorRole
            )
          );
          setDraftStaffStatus("Muted");
          setMuteReason("");
          shouldRefreshHistory = true;
          toast.success("User muted successfully.");
          break;
        }

        default:
          break;
      }

      setConfirmAction(null);
      if (shouldRefreshHistory) {
        void loadModerationHistory(selectedUser.id);
        void loadUsers();
      }
    } catch (error: any) {
      let endpoint = "";

      switch (confirmAction) {
        case "change-role":
          endpoint = `${API_URL}/api/user/admin/set-role`;
          break;
        case "change-staff-status":
          endpoint = `${API_URL}/api/user/update-status`;
          break;
        case "reset-user-author":
          endpoint = `${API_URL}/api/user/admin/reset-user-status`;
          break;
        case "ban-user-author":
          endpoint = `${API_URL}/api/user/moderation/ban`;
          break;
        case "mute-user-author":
          endpoint = `${API_URL}/api/user/moderation/mute`;
          break;
      }

      logAxiosError("[User Action]", endpoint, error, { confirmAction });

      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : message ?? "Action failed."
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const executeBulkAction = async () => {
    if (!API_URL || !bulkConfirmAction) return;

    let endpoint = "";
    let candidateUsers: UserRow[] = [];
    let actionLabel = "updated";
    let statusAfter: UserStatus = "Normal";
    let historyAction = "updated";

    switch (bulkConfirmAction) {
      case "bulk-reset-user-author":
        endpoint = `${API_URL}/api/user/admin/reset-user-status/bulk`;
        candidateUsers = bulkResetCandidates;
        actionLabel = "reset";
        statusAfter = "Normal";
        historyAction = "reset_to_normal";
        break;
      case "bulk-ban-user-author":
        endpoint = `${API_URL}/api/user/moderation/ban/bulk`;
        candidateUsers = bulkBanCandidates;
        actionLabel = "banned";
        statusAfter = "Banned";
        historyAction = "ban";
        break;
      case "bulk-mute-user-author":
        endpoint = `${API_URL}/api/user/moderation/mute/bulk`;
        candidateUsers = bulkMuteCandidates;
        actionLabel = "muted";
        statusAfter = "Muted";
        historyAction = "mute";
        break;
    }

    if (candidateUsers.length === 0) {
      toast.error("No eligible accounts are selected for this action.");
      setBulkConfirmAction(null);
      return;
    }

    if (bulkConfirmCopy.requiresReason && !bulkReason.trim()) {
      toast.error(`Please enter a ${bulkConfirmCopy.reasonLabel.toLowerCase()}.`);
      return;
    }

    setIsSubmittingBulkAction(true);

    try {
      const response = await axios.patch(
        endpoint,
        {
          userIds: candidateUsers.map((user) => user.id),
          reason: bulkReason.trim() || undefined,
        },
        { withCredentials: true }
      );

      const succeededIds = Array.isArray(response.data?.succeededIds)
        ? response.data.succeededIds.map((id: unknown) => String(id))
        : [];
      const failures = Array.isArray(response.data?.failures)
        ? response.data.failures
        : [];

      candidateUsers.forEach((user) => {
        if (!succeededIds.includes(user.id)) return;

        updateUserState(
          user.id,
          buildModerationPatch(
            user,
            historyAction,
            statusAfter,
            bulkReason,
            actorRole
          )
        );
      });

      if (selectedUser && succeededIds.includes(selectedUser.id)) {
        setDraftStaffStatus(statusAfter);
      }

      setBulkConfirmAction(null);
      setBulkReason("");
      clearSelection();

      await loadUsers();

      if (selectedUser && succeededIds.includes(selectedUser.id)) {
        await loadModerationHistory(selectedUser.id);
      }

      if (succeededIds.length > 0) {
        toast.success(
          `${succeededIds.length} account${
            succeededIds.length === 1 ? "" : "s"
          } ${actionLabel} successfully.`
        );
      }

      if (failures.length > 0) {
        const firstFailure = String(
          failures[0]?.message || "One or more accounts could not be updated."
        );
        toast.error(
          failures.length === candidateUsers.length
            ? firstFailure
            : `${failures.length} account${
                failures.length === 1 ? "" : "s"
              } could not be updated. ${firstFailure}`
        );
      }
    } catch (error: any) {
      logAxiosError("[Bulk User Action]", endpoint, error, {
        bulkConfirmAction,
        userIds: candidateUsers.map((user) => user.id),
      });

      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : message ?? "Bulk action failed."
      );
    } finally {
      setIsSubmittingBulkAction(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              User Management
            </h1>
            <p className="mt-1 text-slate-600">
              {workspaceCopy.description}
            </p>
            <p className="mt-2 text-sm text-slate-500">{workspaceCopy.focus}</p>
          </div>

          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-600">
            Signed in as:{" "}
            <span className="font-semibold text-slate-900">
              {actorRole ? formatRoleLabel(actorRole) : "Unknown"}
            </span>
          </div>
        </div>

        {loadError && !isLoading ? (
          <Card className="border-red-200 bg-red-50/60">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-2 text-red-700">
                <TriangleAlert className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Unable to load data</h2>
              </div>

              <p className="text-sm text-red-700/90">{loadError}</p>

              <div className="flex flex-wrap gap-3">
                <Button onClick={loadUsers}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setLoadError(null);
                    clearFilters();
                  }}
                >
                  Reset error state
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <UserManagementStats
              summary={summary}
              filterRole={filterRole}
              filterStatus={filterStatus}
              filterPreset={filterPreset}
              isLoading={isLoading}
              onApplyPreset={setFilterPreset}
              onSetRoleFilter={setFilterRole}
              onSetStatusFilter={setFilterStatus}
              onResetFilters={clearFilters}
            />

            <UserManagementFilters
              searchTerm={searchTerm}
              filterRole={filterRole}
              filterStatus={filterStatus}
              filterPreset={filterPreset}
              isLoading={isLoading}
              isDirty={isFilterDirty}
              totalCount={summary.totalUsers}
              filteredCount={totalItems}
              activeFilterChips={activeFilterChips}
              onSearchChange={setSearchTerm}
              onRoleChange={setFilterRole}
              onStatusChange={setFilterStatus}
              onPresetChange={setFilterPreset}
              onClearFilters={clearFilters}
              onReload={loadUsers}
            />

            {!isLoading && summary.totalUsers === 0 ? (
              <Card>
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center text-center">
                  <Users className="mb-4 h-10 w-10 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    No users yet
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    When the system receives user data, the list will appear
                    here.
                  </p>
                </CardContent>
              </Card>
            ) : !isLoading && totalItems === 0 ? (
              <Card>
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed text-center">
                  <Search className="mb-4 h-10 w-10 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    No matching users
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    Try changing your search keyword or clearing the current
                    filters.
                  </p>

                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={clearFilters}
                  >
                    <FilterX className="mr-2 h-4 w-4" />
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {selectedUsers.length > 0 && bulkActionMeta ? (
                  <Card className="border-slate-200 bg-slate-50/80">
                    <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedUsers.length} account
                          {selectedUsers.length === 1 ? "" : "s"} selected on
                          this page
                        </p>
                        <p className="text-sm text-slate-600">
                          Selection applies to the current page only.
                        </p>
                        <p className="text-xs text-slate-500">
                          {bulkActionMeta.helper}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {actorRole === "admin" ? (
                          <Button
                            onClick={requestBulkReset}
                            disabled={
                              isSubmittingBulkAction ||
                              bulkActionMeta.actionableCount === 0
                            }
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {bulkActionMeta.label}
                          </Button>
                        ) : null}

                        {actorRole === "content_moderator" ? (
                          <Button
                            onClick={requestBulkBan}
                            disabled={
                              isSubmittingBulkAction ||
                              bulkActionMeta.actionableCount === 0
                            }
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            {bulkActionMeta.label}
                          </Button>
                        ) : null}

                        {actorRole === "community_manager" ? (
                          <Button
                            onClick={requestBulkMute}
                            disabled={
                              isSubmittingBulkAction ||
                              bulkActionMeta.actionableCount === 0
                            }
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            <VolumeX className="mr-2 h-4 w-4" />
                            {bulkActionMeta.label}
                          </Button>
                        ) : null}

                        <Button
                          variant="outline"
                          onClick={clearSelection}
                          disabled={isSubmittingBulkAction}
                        >
                          Clear selection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <UserManagementTable
                  users={users}
                  isLoading={isLoading}
                  highlightId={highlightId}
                  sorting={sorting}
                  selectedIds={selectedIds}
                  selectableIds={selectableIds}
                  allVisibleSelected={allVisibleSelected}
                  someVisibleSelected={someVisibleSelected}
                  onSortingChange={setSorting}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAllVisible}
                  onOpenUser={handleOpenUser}
                  onEditUser={handleOpenEdit}
                  onOpenNotifications={handleOpenNotifications}
                />

                {!isLoading && totalItems > 0 ? (
                  <UserManagementPagination
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    visibleCount={users.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                ) : null}
              </>
            )}
          </>
        )}

        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={handleDialogOpenChange}
          selectedUser={selectedUser}
          actorRole={actorRole}
          draftRole={draftRole}
          draftStaffStatus={draftStaffStatus}
          resetReason={resetReason}
          banReason={banReason}
          muteReason={muteReason}
          isSubmitting={isSubmittingAction}
          isHistoryLoading={historyLoadingUserId === selectedUser?.id}
          activeConfirmAction={confirmAction}
          onDraftRoleChange={setDraftRole}
          onDraftStaffStatusChange={setDraftStaffStatus}
          onResetReasonChange={setResetReason}
          onBanReasonChange={setBanReason}
          onMuteReasonChange={setMuteReason}
          onRequestRoleUpdate={requestRoleUpdate}
          onRequestStaffStatusUpdate={requestStaffStatusUpdate}
          onRequestResetToNormal={requestResetToNormal}
          onRequestBan={requestBanUser}
          onRequestMute={requestMuteUser}
        />

        <AlertDialog
          open={!!confirmAction}
          onOpenChange={(open) => {
            if (!isSubmittingAction) {
              setConfirmAction(open ? confirmAction : null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmCopy.description}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmittingAction}>
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={isSubmittingAction}
                onClick={(event) => {
                  event.preventDefault();
                  executeConfirmedAction();
                }}
                className={
                  confirmCopy.destructive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : ""
                }
              >
                {isSubmittingAction ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmCopy.actionLabel
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!bulkConfirmAction}
          onOpenChange={(open) => {
            if (isSubmittingBulkAction) return;

            if (!open) {
              setBulkConfirmAction(null);
              setBulkReason("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{bulkConfirmCopy.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {bulkConfirmCopy.description}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <Label htmlFor="bulk-reason">
                {bulkConfirmCopy.reasonLabel}
                {bulkConfirmCopy.requiresReason ? " *" : " (optional)"}
              </Label>

              <Textarea
                id="bulk-reason"
                value={bulkReason}
                onChange={(event) => setBulkReason(event.target.value)}
                placeholder={bulkConfirmCopy.reasonPlaceholder}
                disabled={isSubmittingBulkAction}
                rows={4}
              />

              <p className="text-xs text-slate-500">
                {bulkConfirmCopy.requiresReason
                  ? "This note is required and will be recorded in moderation history."
                  : "This note is optional and will be recorded in moderation history when provided."}
              </p>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmittingBulkAction}>
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={isSubmittingBulkAction}
                onClick={(event) => {
                  event.preventDefault();
                  void executeBulkAction();
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isSubmittingBulkAction ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  bulkConfirmCopy.actionLabel
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
